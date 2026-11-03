"""Strict, content-free connection diagnostics shared by both runtime modes."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.config_entries import ConfigEntry

STATUS_TTL_SECONDS = 180
_BOOL_FIELDS = frozenset({
    "wifi_connected", "mqtt_connected", "ble_connected", "ble_bonded",
    "automatic_recovery_ap", "wifi_retry_paused", "bond_store_known",
    "session_authenticated", "link_encrypted", "ancs_service_found",
    "data_source_subscribed", "notification_source_subscribed", "ancs_ready",
    "notification_ready", "enrollment_active", "authentication_protection",
})
_INT_FIELDS = frozenset({
    "diagnostics_version", "uptime_seconds", "wifi_retry_attempts", "wifi_retry_in_ms",
    "wifi_generation", "wifi_disconnect_reason", "wifi_connect_error", "stored_peer_count",
    "bond_store_error", "boot_peer_count", "enrollment_remaining_seconds",
    "auth_failure_count", "auth_error", "ble_stage_error", "ble_disconnect_reason",
    "ble_generation", "mqtt_error_type", "mqtt_esp_error", "mqtt_tls_error",
    "mqtt_socket_errno", "mqtt_connect_return_code", "mqtt_retry_in_ms", "reset_reason",
    "last_notification_uptime_ms", "accepted", "published_ack", "dropped_offline",
    "dropped_enqueue", "dropped_policy", "last_mqtt_error_type", "last_mqtt_esp_error",
    "last_mqtt_error_at_ms", "last_mqtt_tls_error", "last_mqtt_socket_errno",
    "last_mqtt_connect_return_code", "last_auth_error", "last_auth_error_at_ms",
})
_REQUIRED_READY = (
    "wifi_connected", "mqtt_connected", "ancs_ready",
    "ble_connected", "session_authenticated", "link_encrypted", "ancs_service_found",
    "data_source_subscribed", "notification_source_subscribed",
)


def parse_diagnostics(data: Any) -> dict[str, Any]:
    """Allow only known scalar fields; never retain credentials or notification text."""
    if not isinstance(data, dict):
        return {}
    result: dict[str, Any] = {}
    for key in _BOOL_FIELDS:
        if type(value := data.get(key)) is bool:
            result[key] = value
    for key in _INT_FIELDS:
        if type(value := data.get(key)) is int and -(2**63) <= value < 2**64:
            result[key] = value
    digest = data.get("firmware_elf_sha256")
    if isinstance(digest, str) and len(digest) == 64 and all(c in "0123456789abcdefABCDEF" for c in digest):
        result["firmware_elf_sha256"] = digest.lower()
    if result.get("bond_store_known") is not True or result.get("stored_peer_count", -1) < 0:
        result["stored_peer_count"] = None
    if "boot_peer_count" in result and result["boot_peer_count"] < 0:
        result["boot_peer_count"] = None
    return result


def notification_ready(data: dict[str, Any], fresh: bool) -> bool | None:
    """Missing old-firmware fields remain unknown; a BLE link alone is not ready."""
    if not fresh or data.get("diagnostics_version") != 1:
        return None
    values = [data.get(key) for key in _REQUIRED_READY]
    if any(value is False for value in values):
        return False
    if all(value is True for value in values):
        return True
    return None


def connection_state(data: dict[str, Any], fresh: bool, available: bool | None) -> str | None:
    """Return a diagnosis without inferring erased NVS from runtime authentication."""
    if available is False:
        return "offline"
    if not data or data.get("diagnostics_version") != 1:
        return None
    if not fresh:
        return "stale"
    if data.get("wifi_retry_paused") is True:
        return "configuration"
    if data.get("wifi_connected") is False:
        return "wifi_retry"
    if data.get("mqtt_connected") is False:
        return "mqtt_error"
    if data.get("bond_store_known") is False:
        return "bond_store_error"
    if data.get("authentication_protection") is True:
        return "authentication_protection"
    if data.get("enrollment_active") is True:
        return "enrollment_open"
    if data.get("auth_error", 0) != 0:
        return "pairing_check" if data.get("stored_peer_count", 0) else "authentication_failed"
    if data.get("stored_peer_count") == 0 and data.get("ble_connected") is not True:
        return "enrollment_required"
    if data.get("ble_connected") is False:
        return "reconnecting"
    if notification_ready(data, fresh):
        return "ready"
    if data.get("ble_stage_error", 0) != 0:
        return "ancs_retry" if data.get("session_authenticated") is True else "authentication_timeout"
    if data.get("session_authenticated") is False:
        return "authenticating"
    if data.get("ancs_service_found") is False:
        return "discovering"
    if data.get("session_authenticated") is True and data.get("ancs_service_found") is True:
        return "subscribing"
    return None


USER_ACTIONS = {
    "offline": "Check device power and the Wi-Fi/MQTT connection. The last notification is a historical record.",
    "stale": "Wait for a live status update. Do not treat the last reported value as the current state.",
    "configuration": "Save the Wi-Fi settings or exit setup mode.",
    "wifi_retry": "Automatic reconnection in progress. If authentication keeps failing, check the Wi-Fi password.",
    "mqtt_error": "Check the MQTT server, DNS, and authentication settings along with the error code.",
    "bond_store_error": "Storage lookup error. Do not erase or delete the pairing; check the error code first.",
    "authentication_protection": "Explicitly request a new enrollment, then authenticate with the device PIN. A restart or Replace is not needed first.",
    "enrollment_open": "Enroll with the device PIN while the enrollment window is open, then confirm notification sharing is enabled.",
    "authentication_failed": "Check the PIN and authentication error, then request enrollment again. Use erase-device only if a leftover iPhone registration blocks the new enrollment.",
    "pairing_check": "Check the enrollment state on both sides and any authentication error. Re-pair explicitly only when stored information mismatch is confirmed.",
    "enrollment_required": "Request a new enrollment. Use erase-device only if an existing entry on the iPhone blocks enrollment.",
    "reconnecting": "The existing pairing is preserved. Check Bluetooth and distance on the iPhone.",
    "authentication_timeout": "Authentication timed out. Check the iPhone connection state and PIN entry.",
    "ancs_retry": "Confirm that notification sharing is turned on. Automatic recovery does not delete the existing pairing.",
}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Provide HA's diagnostic download without saved credentials or personal alerts."""
    runtime = getattr(entry, "runtime_data", None)
    return {
        "connection": parse_diagnostics(getattr(runtime, "diagnostics", {})),
        "status_fresh": bool(getattr(runtime, "diagnostics_fresh", False)),
        "available": getattr(runtime, "available", None),
    }
