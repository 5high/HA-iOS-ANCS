"""Execute the firmware reconnect escalation ladder on the host, without sleeps."""
from pathlib import Path
import shutil
import subprocess
import pytest

ROOT = Path(__file__).resolve().parents[2]


def test_reconnect_policy_executes_with_virtual_time(tmp_path):
    compiler = shutil.which("cc") or shutil.which("gcc")
    if compiler is None:
        pytest.skip("host C compiler is unavailable; CI requires GCC")
    source = tmp_path / "policy.c"
    source.write_text(r'''
#include <assert.h>
#include <stdint.h>
#include "ancs_reconnect_policy.h"

int main(void) {
    ancs_reconnect_policy_t p;
    ancs_reconnect_init(&p);

    /* Exponential advertising backoff with deterministic jitter. */
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 500U);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 1000U);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 2000U);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 4000U);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 8000U);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 8000U); /* cap */
    /* Jitter stays inside [+0, +25%] of the base delay. */
    assert(ancs_reconnect_advertise_delay_ms(&p, 999999U) <= 10000U);
    ancs_reconnect_advertise_ok(&p);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 500U);

    /* Transient failures (phone out of range) NEVER trigger bond repair:
     * a good bond must survive unlimited RF-loss streaks. */
    ancs_reconnect_init(&p);
    for (int i = 0; i < 5; ++i) {
        unsigned a = ancs_reconnect_note_session_failure(
            &p, ANCS_RECONNECT_FAIL_TRANSIENT, (uint64_t)i * 1000U);
        assert((a & ANCS_RECONNECT_ESCALATE_BOND_REPAIR) == 0U);
    }
    assert(p.session_failures == 5U && p.hard_failures == 0U);
    /* ...but six sessions of any class still reach the stack-reset rung. */
    unsigned a = ancs_reconnect_note_session_failure(
        &p, ANCS_RECONNECT_FAIL_TRANSIENT, 6000U);
    assert(a == ANCS_RECONNECT_ESCALATE_STACK_RESET);

    /* Auth/encryption streak fires bond repair exactly once per streak. */
    ancs_reconnect_init(&p);
    assert(ancs_reconnect_note_session_failure(
               &p, ANCS_RECONNECT_FAIL_AUTH, 1U) == 0U);
    assert(ancs_reconnect_note_session_failure(
               &p, ANCS_RECONNECT_FAIL_ENCRYPTION, 2U) == 0U);
    a = ancs_reconnect_note_session_failure(&p, ANCS_RECONNECT_FAIL_AUTH, 3U);
    assert(a == ANCS_RECONNECT_ESCALATE_BOND_REPAIR);
    a = ancs_reconnect_note_session_failure(&p, ANCS_RECONNECT_FAIL_AUTH, 4U);
    assert(a == 0U); /* no pairing storm: rung fired once */
    /* Sixth consecutive failure escalates to the one-shot stack reset. */
    a = ancs_reconnect_note_session_failure(&p, ANCS_RECONNECT_FAIL_AUTH, 5U);
    assert(a == 0U);
    a = ancs_reconnect_note_session_failure(&p, ANCS_RECONNECT_FAIL_AUTH, 6U);
    assert(a == ANCS_RECONNECT_ESCALATE_STACK_RESET);
    a = ancs_reconnect_note_session_failure(&p, ANCS_RECONNECT_FAIL_AUTH, 7U);
    assert(a == 0U); /* reset rung also fires at most once per streak */

    /* A healthy session clears the whole ladder. */
    ancs_reconnect_note_session_ready(&p);
    assert(p.session_failures == 0U && p.hard_failures == 0U);
    assert(!p.bond_repair_offered && !p.stack_reset_offered);
    assert(ancs_reconnect_advertise_delay_ms(&p, 0) == 500U);
    assert(ancs_reconnect_note_session_failure(
               &p, ANCS_RECONNECT_FAIL_AUTH, 1U) == 0U);

    /* Counters saturate instead of wrapping into a silent reset. */
    ancs_reconnect_init(&p);
    for (int i = 0; i < 300; ++i) {
        ancs_reconnect_note_session_failure(
            &p, ANCS_RECONNECT_FAIL_TRANSIENT, (uint64_t)i);
    }
    assert(p.session_failures == UINT8_MAX);
    return 0;
}
''', encoding="utf-8")
    exe = tmp_path / "policy"
    subprocess.run([compiler, "-std=c11", "-Wall", "-Wextra", "-Werror",
                    "-I", str(ROOT / "components/ancs_client/include"),
                    str(ROOT / "components/ancs_client/ancs_reconnect_policy.c"),
                    str(source), "-o", str(exe)],
                   check=True, capture_output=True, text=True)
    subprocess.run([str(exe)], check=True, capture_output=True, text=True)
