"""Reconnect-hardening contract (v0.4.18).

Pins the audit fixes that cannot be exercised on the host without radio
hardware (the pure ladder itself is covered by test_reconnect_policy.py):

  1. ESP_GATTC_CONNECT_EVT keeps taskENTER/taskEXIT balanced and holds the
     lock across the whole session setup (v0.4.11 leaked an extra EXIT and
     mutated s_client unlocked; every connect corrupted the BTC task's
     critical-nesting counter).
  2. A second incoming link while a healthy session lives is explicitly
     disconnected, never silently ignored (audit S1).
  3. A late-but-valid Data Source response (UID_MISMATCH) is dropped and the
     parser re-armed; it must never reach recover_data_stream() (audit B2 —
     this was the self-feeding replay storm).
  4. A canceled request timing out ends the request only; no teardown
     (audit S5).
  5. Console JSON goes through the async writer task; protocol tasks never
     fflush(stdout) (audit B3), and the worker subscribes to TWDT.
  6. Forced session resets close the stale GATT virtual channel (audit B4:
     leaked conn_id/tcb slots after lost DISCONNECT events).
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CLIENT_SOURCE = ROOT / "components" / "ancs_client" / "ancs_client.c"
SINK_SOURCE = ROOT / "components" / "notification_sink" / "notification_sink_serial.c"


def _src(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def _function(source: str, signature: str) -> str:
    # Prefer the occurrence that opens its body right after the signature;
    # this skips forward declarations such as check_connection_deadline().
    chunks = source.split(signature)[1:]
    for chunk in chunks:
        if chunk.startswith("\n{"):
            return chunk.split("\n}\n", 1)[0]
    return chunks[0].split("\n}\n", 1)[0]


def test_connect_event_critical_sections_are_balanced():
    source = _src(CLIENT_SOURCE)
    block = source.split("case ESP_GATTC_CONNECT_EVT:", 1)[1]
    block = block.split("case ESP_GATTC_OPEN_EVT:", 1)[0]
    # The whole session setup (generation bump .. connected=true) must run
    # under exactly one lock with a single EXIT before transition(): v0.4.11
    # exited early on two paths and then mutated s_client unlocked, leaving
    # an unbalanced taskEXIT_CRITICAL on every connection.
    setup = block.split("++s_client.generation;", 1)[1]
    setup = setup.split("transition(ANCS_SIGNAL_CONNECTED);", 1)[0]
    assert "taskENTER_CRITICAL" not in setup
    assert setup.count("taskEXIT_CRITICAL") == 1
    assert "reclaiming stale session stage=%s" in block
    assert "rejecting second connection while session alive" in block
    assert "esp_ble_gap_disconnect(parameter->connect.remote_bda)" in block


def test_canceled_request_timeout_does_not_tear_down_link():
    worker = _function(_src(CLIENT_SOURCE), "static void worker_task(void *argument)")
    deadline_branch = worker.split("now_ms() >= s_worker.deadline_ms", 1)[1]
    canceled_branch = deadline_branch.split("} else {", 1)[0]
    assert "finish_canceled_request();" in canceled_branch
    assert "recover_data_stream()" not in canceled_branch


def test_orphan_data_source_response_keeps_the_link():
    source = _src(CLIENT_SOURCE)
    process = _function(source, "static void process_data_fragment(data_fragment_t *fragment)")
    mismatch_branch = process.split("ANCS_PROTOCOL_ERR_UID_MISMATCH", 1)[1]
    mismatch_branch = mismatch_branch.split("retry_or_finish_active", 1)[0]
    assert "ancs_data_parser_init(" in mismatch_branch
    assert "recover_data_stream()" not in mismatch_branch
    assert "return;" in mismatch_branch


def test_console_io_is_offloaded_from_protocol_tasks():
    sink = _src(SINK_SOURCE)
    publish = _function(sink, "int notification_sink_publish(")
    publish_state = _function(sink, "int notification_sink_publish_state(")
    assert "fflush(stdout)" not in publish
    assert "fflush(stdout)" not in publish_state
    assert "console_write_async(" in publish
    assert "console_write_async(" in publish_state
    # The writer task exists and is the only place that flushes.
    assert "console_writer_task" in sink
    assert sink.count("fflush(stdout)") == 2  # async writer + early-boot fallback


def test_worker_subscribes_to_task_watchdog():
    source = _src(CLIENT_SOURCE)
    worker = _function(source, "static void worker_task(void *argument)")
    assert "esp_task_wdt_add(NULL)" in worker
    assert "esp_task_wdt_reset()" in worker


def test_forced_resets_close_the_stale_gatt_channel():
    source = _src(CLIENT_SOURCE)
    deadline = _function(source, "static void check_connection_deadline(void)")
    assert "esp_ble_gattc_close(stale_gattc_if, stale_conn_id)" in deadline
    connect_block = source.split("case ESP_GATTC_CONNECT_EVT:", 1)[1]
    connect_block = connect_block.split("case ESP_GATTC_OPEN_EVT:", 1)[0]
    assert "esp_ble_gattc_close(old_gattc_if, old_conn_id)" in connect_block


def test_reconnect_ladder_is_wired_into_session_lifecycle():
    source = _src(CLIENT_SOURCE)
    for marker in (
        "note_session_failure(ANCS_RECONNECT_FAIL_AUTH)",
        "note_session_failure(ANCS_RECONNECT_FAIL_ENCRYPTION)",
        "note_session_failure(ANCS_RECONNECT_FAIL_TRANSIENT)",
        "ancs_reconnect_note_session_ready(&s_client.reconnect)",
        "ANCS_RECONNECT_ESCALATE_BOND_REPAIR",
        "ANCS_RECONNECT_ESCALATE_STACK_RESET",
        "ancs_reconnect_advertise_delay_ms(",
        "ancs_reconnect_advertise_ok(&s_client.reconnect)",
    ):
        assert marker in source, f"missing ladder wiring: {marker}"
    # Bond repair must run on the worker task, never inside a BLE callback.
    escalations = _function(source, "static void execute_reconnect_escalations(void)")
    assert "ancs_client_replace_enrollment(true)" in escalations
    worker = _function(source, "static void worker_task(void *argument)")
    assert "execute_reconnect_escalations();" in worker


def test_replay_cutoff_backdates_after_late_sntp():
    source = _src(CLIENT_SOURCE)
    cutoff = _function(source, "static int64_t replay_cutoff_ms(void)")
    assert "source_subscribed_monotonic_ms" in cutoff
    assert "provisioning_runtime_time_synced()" in cutoff
    finalize = _function(source, "static void finalize_active_notification(void)")
    assert "replay_cutoff_ms()" in finalize
