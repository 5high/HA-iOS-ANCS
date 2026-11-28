# Reconnect hardening — v0.4.18

Firmware-side robustness pass driven by the v0.4.10 audit (4 blockers /
6 should-fix) and the ANCS robustness research report. Scope: BLE
connection manager recovery paths only; pairing semantics, MQTT and the
provisioning portal are unchanged.

## What changed

| Audit id | Fix | Where |
|---|---|---|
| B2 | Late-but-valid Data Source responses (`UID_MISMATCH`) are dropped and the parser re-armed for the current request instead of disconnecting (this was the self-feeding replay storm) | `ancs_client.c process_data_fragment()` |
| B3 | Console JSON (`ANCS_STATE_JSON` / `ANCS_NOTIFICATION_JSON`) moved to a dedicated low-priority writer task; Bluedroid callback and worker tasks never `fflush(stdout)` anymore. Worker task subscribes to TWDT (5 s) so a wedged recovery loop is visible in the log | `notification_sink_serial.c`, `ancs_client.c worker_task()` |
| B4 | Forced session resets (no DISCONNECT event ever arrived) now also `esp_ble_gattc_close()` the stale GATT virtual channel — conn_id/tcb slots can no longer leak across incidents | `check_connection_deadline()` |
| S1 | A second incoming link while a healthy session lives is explicitly disconnected (was silently ignored → multi-minute reconnect stalls). Zombie sessions are still reclaimed, and reclaim now closes the dead link's GATT channel too | `ESP_GATTC_CONNECT_EVT` |
| S3 | Replay cutoff is backdated from the monotonic subscribe anchor when SNTP lands after subscribing (was: suppression lost for the whole session) | `replay_cutoff_ms()` |
| S5 | A canceled attribute request timing out (user swiped the notification away mid-fetch) ends the request only — no more full-link teardown + replay over a routine dismissal | `worker_task()` deadline branch |
| S6 | New escalation ladder (`ancs_reconnect_policy.h/.c`, pure clock-only module with host unit tests): exponential advertising backoff 0.5→8 s with jitter; after 3 consecutive AUTH/ENCRYPTION-class session failures it deletes local bonds once and opens the enrollment window (retryPairing); after 6 consecutive failed sessions of any class it performs a one-shot `esp_restart()` (wedge recovery, never per-disconnect). A single healthy session resets the whole ladder. Transient RF losses can never wipe a good bond | new module + `note_session_failure()` wiring |
| — | **v0.4.11 regression**: `ESP_GATTC_CONNECT_EVT` exited the shared-state critical section twice on every connection (double `taskEXIT_CRITICAL`) and mutated `s_client` unlocked between the exits. Session setup now runs under exactly one lock; pinned by a contract test | `ESP_GATTC_CONNECT_EVT` |

## Automated coverage

- `tools/tests/test_reconnect_policy.py` — compiles the policy module on the
  host and drives it with virtual time (backoff curve, jitter bounds, rung
  firing exactly once per streak, transient-vs-hard classification, ready
  reset, counter saturation).
- `tools/tests/test_reconnect_hardening_contract.py` — source contracts for
  the parts that need radio hardware (critical-section balance, orphan
  response handling, async console, TWDT, gattc_close, ladder wiring).
- `tools/tests/test_reconnect_replay_contract.py` — backoff bound test
  updated to the new 8 s policy cap.

## Manual test cases (hardware QA)

Log stream: USB console. Grep markers are given per case.

1. **Out-of-range long absence, bond intact.** Phone connected → walk out
   of range until supervision timeout (~6 s) → wait 30 min → return.
   Expect: `disconnected reason=0x08` then within seconds of the phone
   reconnecting: `CONNECT` → `authentication failed|encryption and bonding
   complete` → `ready`. Recovery < 5 s after the phone initiates. No
   `reconnect ladder` lines.
2. **Bond deleted on the phone.** iPhone Settings → Bluetooth → This device
   → Forget. Device still advertising. Re-pair from the phone: pairing sheet
   appears without touching the ESP32 (device keeps advertising; if auth
   fails 3× in a row expect `reconnect ladder: repeated auth/encryption
   failures; deleting local bonds...` and the enrollment window opens with
   PIN). After successful pairing expect `healthy session established;
   reconnect ladder reset`.
3. **Flap ×10.** iPhone Settings → Bluetooth toggle off/on ten times with
   ~5 s gaps. Expect: no pairing toasts beyond one, advertising verified
   re-armed every cycle (`advertising retry scheduled in ... ms`, never
   growing past ~8 s), no `forcing stale session closed`, no restarts.
4. **Replay burst dedupe.** Put ~50 notifications on the phone, lock phone
   for ≥1 min, reconnect. Expect: `replay suppressed uid=...` /
   `replay pre-filtered` for old items, each genuinely new notification
   published exactly once to MQTT.
5. **Swipe-during-fetch (S5).** Reconnect while several unread notifications
   exist and swipe them away in the first seconds. Expect:
   `active request canceled; draining response` and possibly
   `dropped orphan data-source response uid=... keeping link`; the link
   stays up (no `disconnected reason=` right after).
6. **Console host stop-draining (B3).** Unplug the USB data cable (power via
   external supply) or stop reading it. Phone keeps working over BLE; when
   the host returns, logs resume. No `task watchdog` panic on
   `ancs_worker` during normal operation with the host attached.
7. **Lost DISCONNECT event self-heal (B4/S6).** Harder to force manually —
   verify indirectly: after any `forcing stale session closed` log line,
   advertising must be re-armed within one backoff step and a subsequent
   phone connect must succeed (no reboot needed).
8. **ESP32 reboot while connected.** Power-cycle the ESP32 while the phone
   is connected. Phone auto-reconnects from its bond within ~1–2 s of the
   device booting (advertising starts at boot; solicited ANCS UUID present).

## Not changed here (known follow-ups)

- S2 (bond wipe timing / static PIN DoS), S4 (ANCS Date timezone — needs
  UTC+8 real-device verification), alive-probe (invalid-UID CP ping), NS
  silence CCCD refresh, notifications arriving while disconnected never
  being delivered. These are tracked as separate work items.
