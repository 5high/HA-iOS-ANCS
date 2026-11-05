import json
import re
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CANONICAL_REPO_URL = "https://github.com/5high/HA-iOS-ANCS"
CANONICAL_PAGES_URL = "https://5high.github.io/HA-iOS-ANCS/"
HACS_MY_LINK = (
    "https://my.home-assistant.io/redirect/hacs_repository/"
    "?owner=5high&repository=HA-iOS-ANCS&category=integration"
)
HACS_BADGE_MARKDOWN = (
    "https://my.home-assistant.io/badges/hacs_repository.svg"
)
OLD_REPO_URL_RE = re.compile(r"https://github\.com/1bobby-git/ios-ancs(?:/|\b|[?#])")
OLD_PAGES_URL_RE = re.compile(r"https://1bobby-git\.github\.io/ios-ancs(?:/|\b|[?#])")

PUBLIC_GUIDANCE_SURFACES = (
    "README.md",
    "README.en.md",
    "docs/index.html",
    "docs/app.js",
    "docs/IOS_PAIRING.md",
    "docs/TROUBLESHOOTING.md",
    "homeassistant/automation_ios_ancs_c6_relay.yaml",
    "homeassistant/automation_ios_ancs_parking_arrival_tts.yaml",
)
APP_ID_REFERENCE_SURFACES = (
    "README.md",
    "README.en.md",
    "docs/index.html",
)
INSTALLER_SECTION_MARKERS = (
    "flash",
    "setup-ap",
    "provision",
    "home-assistant",
    "pair",
    "verify",
)
INSTALLER_FACTS = (
    "iOSMSG-XXXXXX",
    "iosmsg-xxxxxx",
    "http://192.168.4.1",
    "iPhone 注册开始",
    "654321",
)
LEGACY_INSTALLER_COPY = (
    "ANCS Flash Station",
    "选择型号并",
    "在现场完成安装",
    "FIELD PROCEDURE",
    "现场准备",
)
PRIVATE_EXAMPLE_GUIDANCE = (
    "COM_PRIVATE",
    "DEVICE-SUFFIX-PRIVATE",
    "PRIVATE_LOCATION_NAME",
    "PRIVATE_NETWORK_NAME",
    "notify.mobile_app_private_owner",
    "sensor.private_owner_ios_ancs_last_notification",
)


def read_text(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


def read_json(relative_path: str) -> dict:
    return json.loads(read_text(relative_path))


def find_section_marker_position(text: str, marker: str) -> int:
    marker_re = re.escape(marker)
    pattern = rf'<section\b(?=[^>]*\bid="{marker_re}")[^>]*>'
    match = re.search(pattern, text, re.IGNORECASE)
    if match is not None:
        return match.start()
    return -1


def assert_uses_only_canonical_urls(surface: str, text: str) -> None:
    assert CANONICAL_REPO_URL in text, surface
    assert CANONICAL_PAGES_URL in text, surface


def test_readme_korean_overview_contract():
    readme = read_text("README.md")

    required_phrases = (
        "Apple Notification Center Service (ANCS)",
        "通过蓝牙 (BLE) 将 iPhone 等 iOS 设备的通知",
        "iPhone → BLE ANCS → ESP32 → Wi-Fi/MQTT → Home Assistant",
    )
    for phrase in required_phrases:
        assert phrase in readme


def test_readme_korean_guide_headings_are_structured_and_ordered():
    readme = read_text("README.md")
    heading_patterns = (
        r"^## 快速安装\s*$",
        r"^## Wi-Fi 与 MQTT 设置\s*$",
        r"^## iPhone 注册\s*$",
        r"^## Home Assistant 与 HACS\s*$",
        r"^## 问题排查\s*$",
    )

    positions = []
    for pattern in heading_patterns:
        match = re.search(pattern, readme, re.MULTILINE)
        assert match is not None, pattern
        positions.append(match.start())

    assert positions == sorted(positions)


def test_readmes_expose_canonical_repository_and_pages_urls():
    for surface in ("README.md", "README.en.md"):
        assert_uses_only_canonical_urls(surface, read_text(surface))


def test_installer_page_exposes_canonical_urls_and_rejects_old_urls():
    surface = "docs/index.html"
    index = read_text(surface)

    assert_uses_only_canonical_urls(surface, index)


def test_public_surfaces_reject_legacy_repository_and_pages_urls():
    for surface in ("README.md", "README.en.md", "docs/index.html"):
        text = read_text(surface)
        assert OLD_REPO_URL_RE.search(text) is None, surface
        assert OLD_PAGES_URL_RE.search(text) is None, surface


def test_installer_distinguishes_firmware_flashing_from_hacs_integration():
    index = read_text("docs/index.html")

    assert "Apple Notification Center Service (ANCS)" in index
    assert "通过蓝牙 (BLE) 将 iPhone 等 iOS 设备的通知" in index
    assert "本页面用于安装 ESP32 固件。" in index
    assert (
        "HACS 只安装 Home Assistant 伴侣集成，"
        "不会安装或更新 ESP32 固件。"
    ) in index


def test_installer_title_uses_public_home_assistant_copy_and_rejects_old_copy():
    index = read_text("docs/index.html")

    assert "<title>Home Assistant iOS ANCS Installer</title>" in index
    for phrase in LEGACY_INSTALLER_COPY:
        assert phrase not in index, phrase


def test_installer_has_ordered_six_step_public_guidance_markers():
    index = read_text("docs/index.html")

    positions = []
    for marker in INSTALLER_SECTION_MARKERS:
        position = find_section_marker_position(index, marker)
        assert position >= 0, marker
        positions.append(position)

    assert positions == sorted(positions)


def test_installer_exposes_generic_setup_pairing_and_home_assistant_facts():
    index = read_text("docs/index.html")

    for fact in INSTALLER_FACTS:
        assert fact in index, fact
    assert "654321" in index


def test_readmes_and_installer_link_app_id_reference():
    for surface in APP_ID_REFERENCE_SURFACES:
        text = read_text(surface)
        assert "APP_ID_REFERENCE.md" in text, surface


def test_public_guidance_surfaces_reject_machine_and_owner_specific_examples():
    for surface in PUBLIC_GUIDANCE_SURFACES:
        text = read_text(surface)
        for token in PRIVATE_EXAMPLE_GUIDANCE:
            assert token not in text, f"{surface}: {token}"


def test_hacs_metadata_matches_custom_integration_contract():
    metadata = read_json("hacs.json")

    assert metadata == {
        "name": "iOS ANCS",
        "homeassistant": "2026.7.0",
    }

    manifest = read_json("custom_components/ha_ios_ancs/manifest.json")
    assert manifest["domain"] == "ha_ios_ancs"
    assert manifest["name"] == "iOS ANCS"
    assert manifest["documentation"] == CANONICAL_REPO_URL
    assert manifest["issue_tracker"] == f"{CANONICAL_REPO_URL}/issues"
    assert manifest["iot_class"] == "local_push"
    assert manifest["integration_type"] == "device"
    assert manifest["version"] == "0.6.15"


def test_integration_brand_icon_is_square_png_with_recommended_size():
    data = (
        ROOT / "custom_components/ha_ios_ancs/brand/icon.png"
    ).read_bytes()

    assert data.startswith(b"\x89PNG\r\n\x1a\n")
    assert data[12:16] == b"IHDR"
    width, height = struct.unpack(">II", data[16:24])
    assert width == height
    assert width >= 256


def test_hacs_package_contains_the_brand_asset_and_an_osi_license():
    integration_icon = (
        ROOT / "custom_components/ha_ios_ancs/brand/icon.png"
    ).read_bytes()
    license_text = read_text("LICENSE")

    assert integration_icon.startswith(b"\x89PNG\r\n\x1a\n")
    assert not (ROOT / "brand").exists()
    assert license_text.startswith("MIT License\n")
    assert "Copyright (c) 2026 1bobby-git" in license_text
    assert "Permission is hereby granted, free of charge" in license_text


def test_readmes_include_hacs_my_link_and_firmware_boundary():
    for surface in ("README.md", "README.en.md"):
        content = read_text(surface)
        assert HACS_MY_LINK in content, surface
        assert HACS_BADGE_MARKDOWN in content, surface
        assert "ESP32" in content, surface
        assert "firmware" in content.lower() or "固件" in content, surface
        assert "HACS" in content, surface

    korean = read_text("README.md")
    english = read_text("README.en.md")
    assert "HACS 只安装 Home Assistant 伴侣集成" in korean
    assert "不会安装或更新 ESP32 固件" in korean
    assert "HACS installs only the Home Assistant companion integration" in english
    assert "never flashes or updates ESP32 firmware" in english
    assert "repository name and URL remain `HA-iOS-ANCS`" in english


def test_readmes_document_manual_hacs_custom_repository_installation():
    korean = read_text("README.md")
    english = read_text("README.en.md")

    korean_phrases = (
        "### HACS 安装",
        "按下下方按钮将打开 Home Assistant 的 HACS 自定义仓库添加页面。",
        "[![在 Home Assistant 中打开 HACS 仓库](https://my.home-assistant.io/badges/hacs_repository.svg)]",
        "`HACS` → `Integrations`",
        "`Custom repositories`",
        f"`{CANONICAL_REPO_URL}`",
        "在 `Category` 中选择 `Integration`，然后点击 `Add`。",
        "安装 `iOS ANCS` 后重启 Home Assistant。",
    )
    english_phrases = (
        "### HACS Installation",
        "Use the button below to open the HACS custom repository flow in Home Assistant.",
        "[![Open your Home Assistant instance and show the HACS repository.](https://my.home-assistant.io/badges/hacs_repository.svg)]",
        "`HACS` → `Integrations`",
        "`Custom repositories`",
        f"`{CANONICAL_REPO_URL}`",
        "Select `Integration` for `Category` and click `Add`.",
        "Install `iOS ANCS`, then restart Home Assistant.",
    )

    for phrase in korean_phrases:
        assert phrase in korean
    for phrase in english_phrases:
        assert phrase in english


def test_readmes_document_registry_backed_hacs_device_setup():
    korean = read_text("README.md")
    english = read_text("README.en.md")

    korean_phrases = (
        "添加 HACS 集成时不会要求输入 MQTT 基础主题。",
        "只有一台兼容源设备时会自动选择，多台时按设备名称显示选择列表。",
        "`通知` 事件实体和详情实体会注册到与 MQTT 设备分离的独立 `iOS ANCS (...)` 设备上。",
        "不会通过 `via_device` 关联 MQTT 设备，",
        "即使 MQTT 通知不是 retained，重启 Home Assistant 后详情传感器也会恢复。",
        "不会把已保存的详情重放为新事件。",
        "在保留实体 ID 和历史记录的前提下迁移到独立的 iOS ANCS 设备。",
    )
    english_phrases = (
        "Adding the HACS integration does not ask for an MQTT base topic.",
        "One compatible source device is selected automatically; multiple source devices are shown by name.",
        "The `Notification` event entity and detail entities are registered on a separate `iOS ANCS (...)` device",
        "not through a `via_device` relationship",
        "detail sensors survive a Home Assistant restart even when the source MQTT notification is not retained",
        "never replays the saved details as a new event",
        "preserves its entity IDs and history while moving its companion entities",
    )

    for phrase in korean_phrases:
        assert phrase in korean
    for phrase in english_phrases:
        assert phrase in english


def test_readmes_document_companion_details_mqtt_coexistence_and_privacy():
    korean = read_text("README.md")
    english = read_text("README.en.md")

    korean_phrases = (
        "不会修改或禁用 MQTT Discovery 实体。",
        "独立 iOS ANCS 设备上的通知事件",
        "23 个专用传感器和 12 个严格二进制传感器",
        "优先使用 iPhone 通过 ANCS 提供的本地化 Display Name",
        "按现有静态映射、原始 App ID 的顺序回退",
        "诊断用 `原始通知` 传感器",
        "诊断用 BLE 连接二进制传感器",
        "经由 Home Assistant 中已注册的 MQTT Discovery 设备状态实体派生",
        "MQTT 设备与实体保持分离、启用且不被修改",
        "无需重新刷写 ESP32 固件",
        "传感器状态最长 255 字符",
        "完整原始 JSON 保留在属性中。",
        "已从 Recorder 排除",
    )
    english_phrases = (
        "keeps MQTT Discovery entities unchanged and enabled",
        "On the separate iOS ANCS device",
        "23 purpose-specific sensors and 12 strict binary sensors",
        "diagnostic BLE connection binary sensor",
        "derived through the existing MQTT Discovery device-status entity in Home Assistant",
        "MQTT devices and entities remain separate, enabled, and unmodified",
        "does not require an ESP32 firmware reflash",
        "prefers the localized Display Name supplied by the iPhone over ANCS",
        "falls back to the existing static mapping and then the original app ID",
        "diagnostic `Raw notification` sensor",
        "sensor state is limited to 255 characters",
        "complete raw JSON remains in attributes",
        "excluded from Recorder",
    )

    for phrase in korean_phrases:
        assert phrase in korean
    for phrase in english_phrases:
        assert phrase in english


def test_validation_workflow_runs_hacs_and_hassfest_without_ignored_checks():
    workflow = (ROOT / ".github/workflows/validate.yml").read_text(encoding="utf-8")

    try:
        import yaml
    except ImportError:
        parsed = None
    else:
        parsed = yaml.safe_load(workflow)

    if parsed is not None:
        triggers = parsed.get("on", {})
        assert "push" in triggers
        assert "pull_request" in triggers
        assert "schedule" in triggers
        assert "workflow_dispatch" in triggers
        assert parsed.get("permissions") == {}
        jobs = parsed["jobs"]
        assert len(jobs) == 3

    assert "uses: hacs/action@main" in workflow
    assert "category: integration" in workflow
    assert "uses: home-assistant/actions/hassfest@master" in workflow
    assert "Floating action refs are intentional" in workflow
    assert "scheduled runs detect upstream validation-rule drift" in workflow
    assert "job-level contents: read permissions limit exposure" in workflow
    assert re.search(r"\bignore", workflow, re.IGNORECASE) is None
