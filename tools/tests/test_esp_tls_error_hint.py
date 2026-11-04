"""The portal must translate bare ESP-TLS handshake codes into plain words."""

from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PORTAL_JS = (REPO_ROOT / "components" / "portal_http" / "portal.js").read_text(
    encoding="utf-8"
)


def test_tls_handshake_failures_get_a_plain_language_hint():
    assert "function espTlsErrorHint(system)" in PORTAL_JS
    # certificate verify failure and hostname mismatch are the two real ones.
    assert "-0x2700" in PORTAL_JS
    assert "-0x6E00" in PORTAL_JS
    assert "mqtt_last_esp_tls_err" in PORTAL_JS
