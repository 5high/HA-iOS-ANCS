"""Reconnect replay-storm contract (v0.4.5).

iOS replays the entire Notification Center queue as fresh "Added" events
every time the ESP32 subscribes to the ANCS Notification Source after a
reconnect. Without suppression this caused an LED/MQTT storm every time the
phone came back into Bluetooth range. These tests pin the fix in place.
"""
from pathlib import Path

import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[2]
CLIENT_SOURCE = (
    ROOT / "components" / "ancs_client" / "ancs_client.c"
)
APP_MAIN = ROOT / "main" / "app_main.c"


def _src(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_preexisting_flag_is_set_on_stale_replays():
    source = _src(CLIENT_SOURCE)
    # finalize must mark stale notifications before publishing
    assert "ANCS_EVENT_FLAG_PRE_EXISTING" in source
    assert "date_predates_subscription(" in source
    finalize = source.split(
        "static void finalize_active_notification(void)\n{", 1
    )[1].split("\n}\n", 1)[0]
    assert "date_predates_subscription" in finalize
    assert "ANCS_EVENT_FLAG_PRE_EXISTING" in finalize
    # the flag must be applied BEFORE the sink publish so observers see it
    assert finalize.index("ANCS_EVENT_FLAG_PRE_EXISTING") < finalize.index(
        "notification_sink_publish"
    )


def test_subscription_cutoff_set_and_cleared():
    source = _src(CLIENT_SOURCE)
    # cutoff is stamped from the wall clock when Notification Source becomes ready
    assert "s_client.source_subscribed_at_ms =" in source
    assert "provisioning_runtime_time_synced()" in source
    # and cleared whenever handles/subscriptions are invalidated (both sites)
    assert source.count("s_client.source_subscribed_at_ms = 0;") >= 2


def test_led_observer_skips_preexisting():
    source = _src(APP_MAIN)
    observer = source.split(
        "static void app_led_observe_notification(", 1
    )[1].split("\n}\n", 1)[0]
    assert "ANCS_EVENT_FLAG_PRE_EXISTING" in observer
    # skip must happen before the LED trigger and before the relay hand-off
    assert observer.index("ANCS_EVENT_FLAG_PRE_EXISTING") < observer.index(
        "rgb_led_notify_arrived"
    )


def test_advertising_backoff_is_bounded_to_thirty_seconds():
    source = _src(CLIENT_SOURCE)
    assert "#define ADVERTISING_BACKOFF_MAX_MS 30000U" in source


def test_date_predates_subscription_compiles_and_behaves(tmp_path):
    compiler = shutil.which("cc") or shutil.which("gcc")
    if compiler is None:
        pytest.skip("host C compiler is unavailable; CI requires GCC")
    # Extract the pure helper and exercise it on the host.
    source = _src(CLIENT_SOURCE)
    body = source.split(
        "static bool date_predates_subscription(", 1
    )[1]
    body = "bool date_predates_subscription(" + body.split(
        "static void finalize_active_notification", 1
    )[0]
    harness = tmp_path / "harness.c"
    harness.write_text(
        "#include <stdbool.h>\n#include <stdint.h>\n#include <stdio.h>\n"
        "#include <string.h>\n" + body + r'''
int main(void) {
    /* cutoff: 2026-11-07 12:00:00 UTC == 2026-11-07 04:00 UTC
     * (verified via `date -u -j -f ... +%s` = 1794024000) */
    const int64_t cutoff = 1794024000000LL;
    /* same-day notification 11:59 UTC -> NOT pre-existing (within skew) */
    if (date_predates_subscription("20261107T035900", cutoff)) return 1;
    /* yesterday 20:00 UTC -> pre-existing (>1h before cutoff) */
    if (!date_predates_subscription("20261106T200000", cutoff)) return 2;
    /* garbage date -> treated as new */
    if (date_predates_subscription("not-a-date", cutoff)) return 3;
    /* empty date -> treated as new */
    if (date_predates_subscription("", cutoff)) return 4;
    /* old spaced format must NOT parse (regression guard) */
    if (date_predates_subscription("20:00:00 11.06.2026", cutoff)) return 7;
    /* far future year -> not pre-existing */
    if (date_predates_subscription("20300101T000000", cutoff)) return 5;
    /* leap-day sanity: 2028-02-29 is a real date and must compute to an
     * epoch in 2028 (not crash, not clamp). Cutoff one hour later the same
     * day -> pre-existing. */
    const int64_t cutoff_2028 = 1835441100000LL; /* 2028-02-29T09:25 UTC */
    if (!date_predates_subscription("20280229T080000", cutoff_2028)) return 6;
    /* near-cutoff boundary: exactly at cutoff minus 30s -> NOT pre-existing */
    if (date_predates_subscription("20261107T040030", cutoff)) return 8;
    /* two minutes before cutoff -> pre-existing */
    if (!date_predates_subscription("20261107T035759", cutoff)) return 9;
    return 0;
}
'''
    )
    exe = tmp_path / "harness"
    subprocess.run(
        [compiler, "-std=c17", "-Wall", "-Wextra", "-Werror",
         "-o", str(exe), str(harness)],
        check=True, capture_output=True, text=True,
    )
    result = subprocess.run([str(exe)], capture_output=True, text=True)
    assert result.returncode == 0, f"date_predates_subscription misbehaved: rc={result.returncode}"
