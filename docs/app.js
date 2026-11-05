const boards = {
  esp32: {
    chip: "32",
    name: "ESP32 / WROOM-32",
    boot: "GPIO 0",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32/WROOM-32 family.",
    hash: "SHA256 432F32F718A6",
  },
  esp32c2: {
    chip: "C2",
    name: "ESP32-C2",
    boot: "GPIO 9",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32-C2 family.",
    hash: "SHA256 F5002A46E611",
  },
  esp32c3: {
    chip: "C3",
    name: "ESP32-C3",
    boot: "GPIO 9",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32-C3 family.",
    hash: "SHA256 C8E52B4A6EDF",
  },
  esp32c5: {
    chip: "C5",
    name: "ESP32-C5",
    boot: "GPIO 28",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32-C5 family.",
    hash: "SHA256 79A4AA8EBAF1",
  },
  esp32c6: {
    chip: "C6",
    name: "ESP32-C6",
    boot: "GPIO 9",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32-C6 family.",
    hash: "SHA256 21A84F8BB923",
  },
  esp32c61: {
    chip: "C61",
    name: "ESP32-C61",
    boot: "GPIO 9",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description:
      "The ESP32-C61 is a separate newer chip, not a revision of the ESP32-C6. Select it only when the board is actually marked C61.",
    hash: "SHA256 C5E65DBF8CE6",
  },
  esp32s3: {
    chip: "S3",
    name: "ESP32-S3",
    boot: "GPIO 0",
    validation: "v0.4.2 build verified",
    status: "BUILD VERIFIED",
    description: "v0.4.2 ANCS-to-MQTT factory build for the ESP32-S3 family.",
    hash: "SHA256 46588C203C36",
  },
};

// Bilingual (zh/en) installer copy. English is the base; Chinese overrides apply
// when the browser language is Chinese. Static HTML carries its own data-i18n-zh
// spans toggled by docs/i18n.js loaded from index.html.
const INSTALLER_LANG = (typeof navigator !== "undefined" &&
  String(navigator.language || "").toLowerCase().startsWith("zh")) ? "zh" : "en";

const BOARD_DESCRIPTIONS_ZH = {
  esp32: "适用于 ESP32/WROOM-32 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
  esp32c2: "适用于 ESP32-C2 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
  esp32c3: "适用于 ESP32-C3 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
  esp32c5: "适用于 ESP32-C5 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
  esp32c6: "适用于 ESP32-C6 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
  esp32c61: "ESP32-C61 不是 ESP32-C6 的改版，而是一颗独立的新芯片。仅在板子实际丝印为 C61 时选择。",
  esp32s3: "适用于 ESP32-S3 系列的 v0.4.2 ANCS-to-MQTT 出厂镜像。",
};

function t(label) {
  return INSTALLER_LANG === "zh" && RUNTIME_LABELS_ZH[label]
    ? RUNTIME_LABELS_ZH[label]
    : label;
}

const RUNTIME_LABELS_ZH = {
  "Secure context": "连接安全",
  "HTTPS required": "需要 HTTPS",
  "Install ready": "可安装",
  "Chrome or Edge required": "需要 Chrome 或 Edge",
};

function setRuntimeStatus(elementId, lampId, supported, goodText, badText) {
  const status = document.getElementById(elementId);
  const lamp = document.getElementById(lampId);

  if (!status || !lamp) return;

  status.textContent = supported ? goodText : badText;
  lamp.classList.toggle("ready", supported);
  lamp.classList.toggle("blocked", !supported);
}

function updateClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;

  clock.textContent = `${new Intl.DateTimeFormat(navigator.language || "en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date())}`;
}

function applyBoard(target) {
  const board = boards[target];
  if (!board) return;

  document.getElementById("signal-chip").textContent = board.chip;
  document.getElementById("target-family").textContent = board.name;
  document.getElementById("target-boot").textContent = board.boot;
  document.getElementById("target-validation").textContent = board.validation;
  document.getElementById("selected-name").textContent = board.name;
  document.getElementById("selected-status").textContent = board.status;
  document.getElementById("selected-description").textContent =
    INSTALLER_LANG === "zh" && BOARD_DESCRIPTIONS_ZH[target]
      ? BOARD_DESCRIPTIONS_ZH[target]
      : board.description;
  document.getElementById("build-hash").textContent = board.hash;
}

const boardSelect = document.getElementById("board-select");

if (boardSelect) {
  boardSelect.addEventListener("change", (event) => applyBoard(event.target.value));
  applyBoard(boardSelect.value);
}

setRuntimeStatus(
  "secure-status",
  "secure-lamp",
  window.isSecureContext,
  t("Secure context"),
  t("HTTPS required"),
);

setRuntimeStatus(
  "serial-status",
  "serial-lamp",
  "serial" in navigator,
  t("Install ready"),
  t("Chrome or Edge required"),
);

updateClock();
window.setInterval(updateClock, 1000);
