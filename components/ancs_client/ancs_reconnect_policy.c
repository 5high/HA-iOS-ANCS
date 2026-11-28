#include "ancs_reconnect_policy.h"

#include <stddef.h>

void ancs_reconnect_init(ancs_reconnect_policy_t *policy)
{
    if (policy == NULL) {
        return;
    }
    policy->advertise_attempt = 0U;
    policy->session_failures = 0U;
    policy->hard_failures = 0U;
    policy->bond_repair_offered = false;
    policy->stack_reset_offered = false;
    policy->last_failure_ms = 0U;
    policy->escalations = 0U;
}

uint32_t ancs_reconnect_advertise_delay_ms(ancs_reconnect_policy_t *policy,
                                           uint32_t random_value)
{
    if (policy == NULL) {
        return ANCS_RECONNECT_ADVERTISE_BASE_MS;
    }
    const uint8_t shift =
        policy->advertise_attempt < 4U ? policy->advertise_attempt : 4U;
    uint32_t delay_ms = ANCS_RECONNECT_ADVERTISE_BASE_MS << shift;
    if (delay_ms > ANCS_RECONNECT_ADVERTISE_MAX_MS) {
        delay_ms = ANCS_RECONNECT_ADVERTISE_MAX_MS;
    }
    /* Deterministic jitter band: tests pass fixed random values. */
    const uint32_t jitter_span = delay_ms * ANCS_RECONNECT_JITTER_MAX_PCT / 100U;
    if (jitter_span != 0U) {
        delay_ms += random_value % jitter_span;
    }
    if (policy->advertise_attempt < UINT8_MAX) {
        policy->advertise_attempt++;
    }
    return delay_ms;
}

void ancs_reconnect_advertise_ok(ancs_reconnect_policy_t *policy)
{
    if (policy != NULL) {
        policy->advertise_attempt = 0U;
    }
}

unsigned ancs_reconnect_note_session_failure(ancs_reconnect_policy_t *policy,
                                             ancs_reconnect_failure_t failure,
                                             uint64_t now_ms)
{
    if (policy == NULL) {
        return 0U;
    }
    if (policy->session_failures < UINT8_MAX) {
        policy->session_failures++;
    }
    if (failure != ANCS_RECONNECT_FAIL_TRANSIENT &&
        policy->hard_failures < UINT8_MAX) {
        policy->hard_failures++;
    }
    policy->last_failure_ms = now_ms;

    unsigned actions = 0U;
    /* Bond repair first: an asymmetric bond never heals by itself and iOS
     * will not re-pair on its own, but deleting our side pops a fresh
     * pairing sheet on the next security request. Once per streak. */
    if (!policy->bond_repair_offered &&
        policy->hard_failures >= ANCS_RECONNECT_BOND_REPAIR_AFTER_HARD) {
        policy->bond_repair_offered = true;
        policy->escalations++;
        actions |= ANCS_RECONNECT_ESCALATE_BOND_REPAIR;
    }
    /* Stack reset last: covers wedged controller patterns (no disconnect
     * event ever arrives, advertising silently dead under a stuck BTC).
     * One-shot per streak so a hardware fault cannot reboot-loop forever. */
    if (!policy->stack_reset_offered &&
        policy->session_failures >= ANCS_RECONNECT_STACK_RESET_AFTER_ANY) {
        policy->stack_reset_offered = true;
        policy->escalations++;
        actions |= ANCS_RECONNECT_ESCALATE_STACK_RESET;
    }
    return actions;
}

void ancs_reconnect_note_session_ready(ancs_reconnect_policy_t *policy)
{
    if (policy == NULL) {
        return;
    }
    policy->advertise_attempt = 0U;
    policy->session_failures = 0U;
    policy->hard_failures = 0U;
    policy->bond_repair_offered = false;
    policy->stack_reset_offered = false;
}
