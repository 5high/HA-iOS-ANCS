#pragma once

#include <stdbool.h>
#include <stdint.h>

/* Clock-only reconnect supervisor: pure decisions on virtual time, all BLE
 * I/O stays in ancs_client.c (same convention as provisioning_retry.h).
 *
 * Escalation ladder (per ANCS robustness research, PebbleOS/Polar model):
 *   retryConnection  -> exponential advertising backoff with jitter
 *   retryPairing     -> after repeated AUTH/ENCRYPTION-class failures,
 *                       delete local bonds and open the enrollment window
 *                       (iOS pops its pairing sheet again)
 *   last resort      -> after many consecutive failed sessions regardless of
 *                       class, ask for a one-shot stack reset (esp_restart),
 *                       never a per-disconnect reboot. */

#define ANCS_RECONNECT_ADVERTISE_BASE_MS UINT32_C(500)
#define ANCS_RECONNECT_ADVERTISE_MAX_MS UINT32_C(8000)
/* Jitter keeps two flapping peripherals from synchronising their retries;
 * callers pass esp_random() so host tests stay deterministic. */
#define ANCS_RECONNECT_JITTER_MAX_PCT UINT32_C(25)
/* Consecutive hard (auth/encryption) session failures before the bond
 * repair rung fires once per streak. Transient failures (phone out of
 * range, stage timeouts) must NEVER wipe a good bond. */
#define ANCS_RECONNECT_BOND_REPAIR_AFTER_HARD UINT32_C(3)
/* Consecutive failed sessions of any class before the one-shot stack
 * reset rung fires. Covers wedged-controller patterns that no amount of
 * advertising retries can heal. */
#define ANCS_RECONNECT_STACK_RESET_AFTER_ANY UINT32_C(6)

typedef enum {
    /* RF loss / stage timeout with no security error: keep the bond. */
    ANCS_RECONNECT_FAIL_TRANSIENT = 0,
    /* Link-level encryption setup failure (disconnect 0x08/0x3d). */
    ANCS_RECONNECT_FAIL_ENCRYPTION,
    /* SMP rejected (auth fail 0x66 etc.): asymmetric bond suspected. */
    ANCS_RECONNECT_FAIL_AUTH,
} ancs_reconnect_failure_t;

#define ANCS_RECONNECT_ESCALATE_BOND_REPAIR (1U << 0)
#define ANCS_RECONNECT_ESCALATE_STACK_RESET (1U << 1)

typedef struct {
    uint8_t advertise_attempt;
    uint8_t session_failures;   /* consecutive sessions that never reached ready */
    uint8_t hard_failures;      /* subset of the above with auth/encryption cause */
    bool bond_repair_offered;   /* once per streak; cleared by a ready session */
    bool stack_reset_offered;   /* once per streak; cleared by a ready session */
    uint64_t last_failure_ms;
    uint32_t escalations;       /* monotonic counter for diagnostics */
} ancs_reconnect_policy_t;

void ancs_reconnect_init(ancs_reconnect_policy_t *policy);

/* Next advertising retry delay in ms: base * 2^attempt capped at MAX, plus
 * jitter in [0, pct% of delay] derived from random_value. Advances the
 * attempt counter. */
uint32_t ancs_reconnect_advertise_delay_ms(ancs_reconnect_policy_t *policy,
                                           uint32_t random_value);

/* Advertising actually started: backoff resets. */
void ancs_reconnect_advertise_ok(ancs_reconnect_policy_t *policy);

/* A connection session ended without ever reaching ready. Returns the
 * escalation bitmask to execute now (may be 0). Each rung fires at most
 * once per failure streak so we never storm pairing or reboot loops. */
unsigned ancs_reconnect_note_session_failure(ancs_reconnect_policy_t *policy,
                                             ancs_reconnect_failure_t failure,
                                             uint64_t now_ms);

/* A session reached ready: the whole ladder resets. */
void ancs_reconnect_note_session_ready(ancs_reconnect_policy_t *policy);
