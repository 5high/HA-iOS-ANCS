"""Replay-induced link-collapse contract (v0.4.6).

v0.4.5 suppressed replayed notifications at the LED/MQTT layer only. The
attribute-fetch pipeline still queued every replayed uid, so a burst of
hundreds of Notification Center replays overflowed the request/work queues.
One timed-out Control Point request then called recover_data_stream(), which
closed the BLE link — and the reconnect replayed everything again. The device
never rebooted but flapped roughly every 14 seconds (ble_generation +305/hour).

These tests pin the three-part fix:
  1. Replays already proven stale are dropped before queueing (uid memo).
  2. Queue saturation sheds new Added events instead of failing them later.
  3. A timed-out request no longer tears down the link; only a broken Data
     Source stream does.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLIENT_SOURCE = ROOT / "components" / "ancs_client" / "ancs_client.c"
KCONFIG = ROOT / "components" / "ancs_client" / "Kconfig"
DEFAULTS = ROOT / "sdkconfig.defaults"


def _src(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_stale_uids_are_memoised_when_a_replay_is_suppressed():
    source = _src(CLIENT_SOURCE)
    finalize = source.split(
        "static void finalize_active_notification(void)\n{", 1
    )[1].split("\n}\n", 1)[0]
    # the uid must be remembered inside the pre-existing branch, before publish
    assert "replay_uid_remember(" in finalize
    assert finalize.index("replay_uid_remember(") < finalize.index(
        "notification_sink_publish"
    )


def test_process_notification_event_filters_replays_before_queueing():
    source = _src(CLIENT_SOURCE)
    process = source.split(
        "static void process_notification_event(", 1
    )[1].split("\n}\n", 1)[0]
    # both guards must run before the request queue push
    assert "replay_uid_known(" in process
    assert "CONFIG_ANCS_REQUEST_QUEUE_CAPACITY" in process
    assert process.index("replay_uid_known(") < process.index(
        "ancs_request_queue_push"
    )
    assert process.index("CONFIG_ANCS_REQUEST_QUEUE_CAPACITY") < process.index(
        "ancs_request_queue_push"
    )
    # Added events only: a Removed event must still reach publish_removed()
    added_guard = process.split("replay_uid_known(", 1)[0]
    assert "event->event_id <= 1U" in added_guard


def test_timeout_alone_does_not_drop_the_link():
    source = _src(CLIENT_SOURCE)
    retry = source.split(
        "static void retry_or_finish_active(", 1
    )[1].split("\n}\n", 1)[0]
    # the unconditional recover_data_stream() call is gone from this path
    assert "if (recover_stream && error_code != ANCS_PROTOCOL_ERR_TIMEOUT)" in retry
    # and it is the last statement of the notification-attributes failure path
    assert retry.rstrip().endswith("}")
    assert "ANCS_PROTOCOL_ERR_TIMEOUT" in retry


def test_replay_memo_survives_a_reconnect_but_the_cutoff_does_not():
    source = _src(CLIENT_SOURCE)
    reset = source.split(
        "static void reset_worker_session(uint32_t generation)\n{", 1
    )[1].split("\n}\n", 1)[0]
    # a fresh connection means a fresh replay window ...
    assert "s_worker.replay_cutoff_ms = 0;" in reset
    # ... but uids already proven stale stay remembered (iOS replays them again)
    assert "replay_uid_forget_all()" not in reset


def test_queue_capacities_are_enlarged_and_memo_is_configurable():
    defaults = _src(DEFAULTS)
    assert "CONFIG_ANCS_REQUEST_QUEUE_CAPACITY=64" in defaults
    assert "CONFIG_ANCS_WORK_QUEUE_LENGTH=64" in defaults
    assert "CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY=64" in defaults
    kconfig = _src(KCONFIG)
    assert "config ANCS_REPLAY_UID_CACHE_CAPACITY" in kconfig


def test_replay_uid_memo_compiles_and_behaves(tmp_path):
    """Exercise the memo as a pure LRU-ish uid set on the host."""
    import shutil
    import subprocess

    compiler = shutil.which("cc") or shutil.which("gcc")
    if compiler is None:
        import pytest

        pytest.skip("host C compiler is unavailable; CI requires GCC")

    harness = tmp_path / "harness.c"
    harness.write_text(r'''
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY 4

static uint32_t replay_uids[CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY];
static uint32_t replay_uid_age[CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY];
static uint32_t replay_uid_next;
static uint32_t replay_uid_clock;

static void replay_uid_remember(uint32_t uid)
{
#if CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY > 0
    for (size_t index = 0;
         index < CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY; ++index) {
        if (replay_uids[index] == uid && replay_uid_age[index] != 0U) {
            replay_uid_age[index] = ++replay_uid_clock;
            return;
        }
    }
    const size_t slot = replay_uid_next % CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY;
    replay_uid_next = (uint32_t)(slot + 1U);
    replay_uids[slot] = uid;
    replay_uid_age[slot] = ++replay_uid_clock;
#else
    (void)uid;
#endif
}

static bool replay_uid_known(uint32_t uid)
{
#if CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY > 0
    for (size_t index = 0;
         index < CONFIG_ANCS_REPLAY_UID_CACHE_CAPACITY; ++index) {
        if (replay_uid_age[index] != 0U && replay_uids[index] == uid) {
            return true;
        }
    }
#else
    (void)uid;
#endif
    return false;
}

int main(void)
{
    /* unknown uid is never filtered: a real notification must get through */
    if (replay_uid_known(42)) return 1;
    replay_uid_remember(42);
    if (!replay_uid_known(42)) return 2;
    /* remembering twice does not duplicate or lose it */
    replay_uid_remember(42);
    if (!replay_uid_known(42)) return 3;
    /* other uids are unaffected */
    if (replay_uid_known(43)) return 4;
    /* fill past capacity: oldest evicted, newest retained */
    replay_uid_remember(1);
    replay_uid_remember(2);
    replay_uid_remember(3);
    replay_uid_remember(4);
    if (!replay_uid_known(4)) return 5;
    if (replay_uid_known(99)) return 6;
    /* touching a remembered uid refreshes it and it survives one eviction */
    replay_uid_remember(42);
    replay_uid_remember(5);
    if (!replay_uid_known(42)) return 7;
    return 0;
}
''')
    exe = tmp_path / "harness"
    subprocess.run(
        [compiler, "-std=c17", "-Wall", "-Wextra", "-Werror",
         "-o", str(exe), str(harness)],
        check=True, capture_output=True, text=True,
    )
    result = subprocess.run([str(exe)], capture_output=True, text=True)
    assert result.returncode == 0, (
        f"replay uid memo misbehaved: rc={result.returncode}"
    )
