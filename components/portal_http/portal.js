const $ = (id) => document.getElementById(id);
const STATUS_POLL_MS = 2000;
let formHydrated = false;

// Bilingual setup portal: Chinese is the base copy; English strings below are
// applied when the browser language is not Chinese. Placeholders use {} markers.
const PORTAL_LANG = (typeof navigator === 'undefined' ||
  String(navigator.language || '').toLowerCase().startsWith('zh')) ? 'zh' : 'en';

const PORTAL_EN = {
  "연결된 적이 있는 MQTT 서버의 주소나 포트를 바꾸면 저장된 비밀번호를 새 서버로 보내지 않습니다. MQTT 비밀번호를 다시 입력하세요.": 'When you change the address or port of an MQTT server that connected before, re-enter the MQTT password.',
  "확인 중": 'Checking',
  "iPhone 기기 등록": 'Enroll iPhone',
  "iPhone 연결됨": 'iPhone connected',
  "PIN 확인 후 등록 재시도": 'Retry enrollment after PIN check',
  "등록 신호 다시 보내기": 'Resend enrollment signal',
  "등록된 iPhone 다시 연결": 'Reconnect enrolled iPhone',
  "브로커 주소 미설정": 'Broker address not set',
  " · {}초 후 재시도": ' · retry in ${retrySeconds}s',
  "{} · 사용자 이름 또는 비밀번호가 거부됨{}": '${endpoint} · username or password rejected${retry}',
  "{} · Client ID가 거부됨{}": '${endpoint} · client ID rejected${retry}',
  "{} · 브로커 사용 불가{}": '${endpoint} · broker unavailable${retry}',
  "{} · 브로커 연결 거부 코드 {}{}": '${endpoint} · broker refused, code ${returnCode}${retry}',
  "{} · TCP 연결 시간 초과{}": '${endpoint} · TCP connection timed out${retry}',
  "{} · 포트 연결 거부{}": '${endpoint} · port refused the connection${retry}',
  "{} · ESP32 네트워크에서 서버까지 경로 없음{}": '${endpoint} · no route from the ESP32 network to the server${retry}',
  "{} · 전송 오류 ESP {}, socket {}{}": '${endpoint} · transport error ESP ${espError}, socket ${socketError}${retry}',
  "부팅 후 제외 {}건 · 이전 펌웨어는 제외 원인을 구분하지 않습니다": '${total} excluded since boot · older firmware did not classify exclusion reasons',
  "MQTT 미연결 {}건": '${offline} while MQTT offline',
  "정책 필터 {}건": '${policy} filtered by policy',
  "내부 처리 실패 {}건": '${enqueue} internal enqueue failures',
  "기타 {}건": '${unclassified} unclassified',
  "부팅 후 제외 {}건{}` : ''}": '${total} excluded since boot${reasons.length ? ` · ${reasons.join(\' · \')}` : \'\'}',
  "연결됨": 'Connected',
  "IP 주소를 받았습니다": 'Got an IP address',
  "연결 중": 'Connecting',
  "Wi-Fi 응답을 기다리는 중": 'Waiting for the Wi-Fi response',
  "자동 복구 대기": 'Waiting for auto recovery',
  "{}초 후 재시도 · 단절 원인 {}": 'Retry in ${seconds}s · disconnect reason ${Number(runtime.last_wifi_disconnect_reason || 0)}',
  "설정 필요": 'Setup needed',
  "아래에서 Wi-Fi를 선택하세요": 'Select a Wi-Fi network below',
  "Wi-Fi 연결 없음": 'No Wi-Fi connection',
  "연결 실패": 'Connection failed',
  "연결 대기": 'Waiting to connect',
  "Wi-Fi 필요": 'Wi-Fi required',
  "Wi-Fi 연결 후 브로커에 접속합니다": 'Connects to the broker after Wi-Fi is up',
  "알림 수신 준비 완료": 'Ready for notifications',
  "연결됨 · 준비 중": 'Connected · preparing',
  "인증과 두 ANCS 구독 완료": 'Authenticated and both ANCS subscriptions active',
  "인증·서비스 발견·알림 구독 상태를 확인 중": 'Checking authentication, service discovery, and notification subscriptions',
  "새 알림을 보내 전달을 확인하세요. 마지막 알림과 현재 연결 상태는 별개입니다.": 'Send a new notification to verify delivery. The last notification is separate from the current connection state.',
  "연결만으로 알림 준비가 완료되지는 않습니다. iPhone의 시스템 알림 공유를 확인하세요.": 'A connection alone is not readiness. Check that notification sharing is allowed on the iPhone.',
  "등록 복구 필요": 'Enrollment repair required',
  "인증 오류 {} · PIN 확인 후 등록을 다시 요청하세요": 'Auth error ${Number(system.ble_auth_error || 0)} · confirm the PIN and request enrollment again',
  "반복 인증 실패로 신규 등록을 일시 중지했습니다. PIN을 확인하고 등록 재시도를 누르세요. 기존 iPhone 항목이 새 등록을 막는 경우에만 해당 항목을 지우세요. 등록 교체는 별도 동작입니다.": 'New enrollment is paused after repeated authentication failures. Confirm the PIN and press retry enrollment. Remove the existing iPhone entry only if it blocks a new enrollment. Replacing an enrollment is a separate action.',
  "등록 대기": 'Waiting for enrollment',
  "{} · 고정 PIN {}": '${bluetoothName} · fixed PIN ${blePasskey}',
  "{}을 iPhone Bluetooth 설정에서 선택하세요": 'Select ${bluetoothName} in iPhone Bluetooth settings',
  "등록 신호를 보내고 있습니다. iPhone Bluetooth 설정에서 {}을 선택하고 고정 PIN {}를 입력하세요.": 'Sending the enrollment signal. Select ${bluetoothName} in iPhone Bluetooth settings and enter fixed PIN ${blePasskey}.',
  "등록 신호를 보내고 있습니다. iPhone Bluetooth 설정에서 {}을 선택하고 고정 PIN 123456을 입력하세요.": 'Sending the enrollment signal. Select ${bluetoothName} in iPhone Bluetooth settings and enter fixed PIN 123456.',
  "등록됨 · 연결 대기": 'Enrolled · waiting to connect',
  "등록된 iPhone을 찾고 있습니다": 'Looking for the enrolled iPhone',
  "등록된 iPhone만 자동으로 다시 연결됩니다. 이 페이지의 버튼으로 재연결 신호를 다시 보낼 수 있습니다.": 'Only the enrolled iPhone reconnects automatically. Use the button on this page to resend the reconnect signal.',
  "미등록 · 광고 꺼짐": 'Not enrolled · Advertising off',
  "등록 시작 전에는 Bluetooth 등록 신호를 보내지 않습니다": 'No Bluetooth enrollment signal is sent before you start enrollment',
  "이 페이지의 iPhone 기기 등록 버튼을 누르면 Bluetooth 등록 신호를 보냅니다.": 'Press Enroll iPhone on this page to send the Bluetooth enrollment signal.',
  "{}건 전송": '${published} sent',
  "테스트 알림 또는 iPhone 알림을 기다리고 있습니다": 'Waiting for a test notification or an iPhone notification',
  "MQTT 연결이 준비되면 Discovery가 자동 발행됩니다": 'Discovery publishes automatically once MQTT is connected',
  "저장된 비밀번호가 있습니다. 변경할 때만 새로 입력하세요.": 'A password is stored. Enter a new one only when you want to change it.',
  "암호가 없는 네트워크는 비워 두세요.": 'Leave empty for an open network.',
  "저장된 비밀번호가 있습니다. 변경할 때만 새로 입력하세요. 연결된 적이 있는 서버의 주소나 포트를 바꾸면 다시 입력해야 합니다.": 'A password is stored. Enter a new one only when you want to change it. Changing the host or port of a server that connected before requires re-entering it.',
  "브로커에 비밀번호가 없으면 비워 두세요.": 'Leave empty if the broker has no password.',
  "저장된 CA 인증서가 있습니다. 변경할 때만 새로 입력하세요.": 'A CA certificate is stored. Enter a new one only when you want to replace it.',
  "TLS를 켜면 CA 인증서가 필요합니다.": 'TLS requires a CA certificate.',
  "요청을 처리하지 못했습니다.": 'The request could not be processed.',
  "브로커 응답을 받지 못했습니다. {}, latest.config || {})}": 'No broker response. ${mqttErrorDetail(latest.system || {}, latest.config || {})}',
  "브로커 응답을 받지 못했습니다.": 'No broker response.',
  "현재 연결 상태를 새로 확인했습니다.": 'Refreshed the current connection state.',
  "검색 중": 'Scanning',
  "검색된 네트워크가 없습니다": 'No networks found',
  "Wi-Fi를 찾지 못했습니다. SSID를 직접 입력할 수 있습니다.": 'No Wi-Fi found. You can type the SSID manually.',
  "{}개의 Wi-Fi를 찾았습니다.": 'Found ${aps.length} Wi-Fi networks.',
  "연결할 Wi-Fi를 검색하거나 SSID를 직접 입력하세요.": 'Scan for a Wi-Fi network or type the SSID directly.',
  "저장 중": 'Saving',
  "설정을 저장하고 연결을 시작했습니다. 설정 포털은 테스트를 위해 10분간 유지됩니다. 연결에 실패하면 설정 AP가 자동으로 다시 나타납니다. 구체적인 원인이 이 페이지에 표시됩니다.": 'Settings saved and connecting. The setup portal stays open for 10 minutes for testing. If the connection fails, the setup AP reappears automatically and the reason is shown on this page.',
  "연결 확인 중": 'Checking connection',
  "MQTT 연결 결과를 확인하고 있습니다.": 'Checking the MQTT connection result.',
  "MQTT 브로커 연결과 Home Assistant Discovery 발행이 완료되었습니다.": 'MQTT broker connected and Home Assistant Discovery published.',
  "전송 확인 중": 'Checking delivery',
  "테스트 알림을 MQTT로 전송했습니다. Home Assistant의 최근 알림 센서를 확인하세요.": 'Test notification sent over MQTT. Check the recent-notification sensor in Home Assistant.',
  "테스트 알림을 큐에 넣었지만 MQTT 전송 확인을 받지 못했습니다.": 'The test notification was queued but its MQTT delivery was not confirmed.',
  "등록 시작 중": 'Starting enrollment',
  "iPhone 등록을 시작했습니다. 이 페이지에 표시된 고정 PIN {}를 iPhone Bluetooth 등록 창에 입력하세요.": 'iPhone enrollment started. Enter fixed PIN ${code}, shown on this page, in the iPhone Bluetooth pairing dialog.',
  "iPhone 등록 신호를 시작했습니다. 상태 카드가 갱신될 때까지 현재 페이지를 유지하세요.": 'iPhone enrollment signal sent. Stay on this page until the status card refreshes.',
  "REPLACE ENROLLMENT를 정확히 입력하세요.": 'Type REPLACE ENROLLMENT exactly.',
  "교체 중": 'Replacing',
  "기존 iPhone 등록을 지우고 새 등록을 시작했습니다.": 'Removed the existing iPhone enrollment and started a new one.',
  "재시작 요청 중": 'Requesting restart',
  "기기 재시작을 요청했습니다.": 'Device restart requested.',
  "RESET PROVISIONING을 정확히 입력하세요.": 'Type RESET PROVISIONING exactly.',
  "초기화 중": 'Resetting',
  "Wi-Fi와 MQTT 설정을 초기화했습니다.": 'Wi-Fi and MQTT settings were reset.',
  "기기 상태를 불러오지 못했습니다.": 'Could not load the device status.',
};

function translate(template) {
  if (PORTAL_LANG === 'zh') return template;
  const parts = String(template).split(/\$\{[^}]*\}/);
  const english = PORTAL_EN[parts.join('{}')];
  if (english === undefined) return template;
  let index = 0;
  return english.replace(/\{\}/g, () => String(parts[++index] ?? ''));
}

const t = translate;

function setMessage(text, tone = 'info') {
  const message = $('message');
  message.textContent = text;
  message.dataset.tone = tone;
}

function setBusy(id, busy, busyLabel) {
  const button = $(id);
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.dataset.busy = busy ? 'true' : 'false';
  const requiresMqtt = button.dataset.requiresMqtt === 'true';
  const mqttConnected = document.body?.dataset?.mqttConnected === 'true';
  button.disabled = busy || (requiresMqtt && !mqttConnected);
  button.textContent = busy ? busyLabel : button.dataset.label;
}

// Server error keys that need a friendly explanation instead of the raw key.
const API_ERROR_MESSAGES = {
  mqtt_password_required:
    t('更改曾成功连接过的 MQTT 服务器地址或端口时，必须重新输入 MQTT 密码。'),
  save_failed:
    t('保存失败：配置校验未通过。开启 TLS 时必须提供 CA 证书；想清除旧证书请清空 CA 栏并关闭 TLS。'),
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(API_ERROR_MESSAGES[body.error] || body.error || response.statusText);
  }
  return body;
}

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function deviceSuffix(apSsid) {
  const match = String(apSsid || '').match(/([0-9a-f]{4})$/i);
  return match ? match[1].toLowerCase() : 'c6';
}

function iphoneBluetoothName(apSsid, deviceFamily) {
  return `IOS-ANCS-${deviceFamily}-${deviceSuffix(apSsid).toUpperCase()}`;
}

function recommendedClientId(apSsid, deviceFamily) {
  return `ios_ancs_${deviceFamily.toLowerCase()}_${deviceSuffix(apSsid)}`;
}

function recommendedBaseTopic(apSsid, deviceFamily) {
  return `ios-ancs/${deviceFamily.toLowerCase()}-${deviceSuffix(apSsid)}`;
}

function updateTile(id, state, value, detail) {
  $(id).dataset.state = state;
  $(`${id}-value`).textContent = value;
  $(`${id}-detail`).textContent = detail;
}

function updateEnrollmentControls(system, blePasskey) {
  const button = $('start-enrollment');
  const code = $('ble-enroll-code');
  const codeValue = $('ble-enroll-code-value');
  const busy = button.dataset.busy === 'true';
  const windowOpen = Boolean(system.enroll_window_open);
  code.hidden = !windowOpen;
  codeValue.textContent = blePasskey || t('确认中');

  let label = t('注册 iPhone 设备');
  let unavailable = false;
  if (system.ble_connected) {
    label = t('iPhone 已连接');
    unavailable = true;
  } else if (system.ble_pairing_repair_required) {
    label = t('确认 PIN 后重试注册');
  } else if (windowOpen) {
    label = t('重新发送注册信号');
  } else if (system.ble_bonded) {
    label = t('重连已注册的 iPhone');
  }
  if (!busy) {
    button.textContent = label;
    button.dataset.label = label;
  }
  button.disabled = busy || unavailable;
}

function mqttEndpoint(config) {
  const host = config.mqtt_host || t('未设置 Broker 地址');
  const port = Number(config.mqtt_port || 1883);
  return `${host}:${port} · ${config.mqtt_tls ? 'TLS' : 'TCP'}`;
}

function mqttErrorDetail(system, config) {
  const endpoint = mqttEndpoint(config);
  const type = Number(system.mqtt_error_type || 0);
  const espError = Number(system.mqtt_last_esp_error || 0);
  const socketError = Number(system.mqtt_last_socket_errno || 0);
  const returnCode = Number(system.mqtt_connect_return_code || 0);
  const retrySeconds = Math.max(
    0,
    Math.round(Number(system.mqtt_retry_delay_ms || 0) / 1000),
  );
  const retry = retrySeconds > 0 ? t(` · ${retrySeconds} 秒后重试`) : '';

  if (type === 2) {
    if (returnCode === 4 || returnCode === 5) {
      return t(`${endpoint} · 用户名或密码被拒绝${retry}`);
    }
    if (returnCode === 2) {
      return t(`${endpoint} · Client ID 被拒绝${retry}`);
    }
    if (returnCode === 3) {
      return t(`${endpoint} · Broker 不可用${retry}`);
    }
    return t(`${endpoint} · Broker 拒绝连接，代码 ${returnCode}${retry}`);
  }

  if (type === 1 || espError || socketError) {
    if (espError === 32774 || socketError === 110) {
      return t(`${endpoint} · TCP 连接超时${retry}`);
    }
    if (socketError === 111 || socketError === 61) {
      return t(`${endpoint} · 端口拒绝连接${retry}`);
    }
    if (socketError === 101 || socketError === 113) {
      return t(`${endpoint} · ESP32 到服务器无路由${retry}`);
    }
    return t(`${endpoint} · 传输错误 ESP ${espError}, socket ${socketError}${retry}`);
  }

  return `${endpoint}${retry}`;
}

function relayDropBreakdown(system = {}) {
  const detailKeys = [
    'notifications_dropped_offline',
    'notifications_dropped_enqueue',
    'notifications_dropped_policy',
  ];
  const hasDetailedCounters = detailKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(system, key),
  );
  const offline = Number(system.notifications_dropped_offline || 0);
  const enqueue = Number(system.notifications_dropped_enqueue || 0);
  const policy = Number(system.notifications_dropped_policy || 0);
  const calculatedTotal = offline + enqueue + policy;
  const total = Number(system.notifications_dropped ?? calculatedTotal);
  if (total <= 0) {
    return { total: 0, offline, enqueue, policy, detail: null };
  }
  if (!hasDetailedCounters) {
    return {
      total,
      offline,
      enqueue,
      policy,
      detail: t(`自启动后排除 ${total} 条 · 旧固件无法区分排除原因`),
    };
  }
  const reasons = [];
  if (offline > 0) reasons.push(t(`MQTT 未连接 ${offline} 条`));
  if (policy > 0) reasons.push(t(`策略过滤 ${policy} 条`));
  if (enqueue > 0) reasons.push(t(`内部处理失败 ${enqueue} 条`));
  const unclassified = Math.max(0, total - calculatedTotal);
  if (unclassified > 0) reasons.push(t(`其他 ${unclassified} 条`));
  return {
    total,
    offline,
    enqueue,
    policy,
    detail: t(`自启动后排除 ${total} 条${reasons.length ? ` · ${reasons.join(' · ')}` : ''}`),
  };
}

function hydrateForm(status, apName, deviceFamily) {
  if (formHydrated) return;
  const config = status.config || {};
  $('wifi-ssid-manual').value = config.wifi_ssid || '';
  $('mqtt-host').value = config.mqtt_host || '';
  $('mqtt-port').value = config.mqtt_port || 1883;
  $('mqtt-username').value = config.mqtt_username || '';
  $('mqtt-tls').checked = Boolean(config.mqtt_tls);
  $('mqtt-client-id').value =
    config.mqtt_client_id || recommendedClientId(apName, deviceFamily);
  $('mqtt-base-topic').value =
    config.mqtt_base_topic || recommendedBaseTopic(apName, deviceFamily);
  $('mqtt-ca').placeholder = config.mqtt_ca_configured
    ? t('已保存 CA 证书。留空并保存 = 保留；想清除就清空此栏并关闭 TLS，或贴入新证书替换。')
    : '-----BEGIN CERTIFICATE-----';
  formHydrated = true;
}

function applyStatus(status) {
  const runtime = status.runtime || {};
  const system = status.system || {};
  const config = status.config || {};
  const target = String(status.target || 'esp32c6').toLowerCase();
  const deviceFamily = String(status.device_family || 'C6').toUpperCase();
  const apName = runtime.ap_ssid || 'IOS-ANCS-SETUP';
  const bluetoothName = iphoneBluetoothName(apName, deviceFamily);
  const passkeyValue = Number(system.ble_passkey || 0);
  const blePasskey = Number.isInteger(passkeyValue) &&
    passkeyValue >= 100000 && passkeyValue <= 999999
    ? String(passkeyValue).padStart(6, '0')
    : null;

  if (document.body?.dataset) {
    document.body.dataset.target = target;
    document.body.dataset.mqttConnected =
      system.mqtt_connected ? 'true' : 'false';
  }

  $('device-name').textContent = apName;

  if (runtime.sta_has_ip) {
    updateTile('status-wifi', 'ready', t('已连接'), config.wifi_ssid || t('已获取 IP 地址'));
  } else if (runtime.sta_connecting) {
    updateTile('status-wifi', 'pending', t('连接中'), config.wifi_ssid || t('等待 Wi-Fi 响应'));
  } else if (runtime.sta_started && !runtime.retry_paused) {
    const seconds = Math.ceil(Number(runtime.retry_in_ms || 0) / 1000);
    updateTile('status-wifi', 'pending', t('等待自动恢复'),
      t(`${seconds} 秒后重试 · 断开原因 ${Number(runtime.last_wifi_disconnect_reason || 0)}`));
  } else {
    updateTile('status-wifi', 'pending', t('需要设置'), runtime.ap_started ? t('请在下方选择 Wi-Fi') : t('未连接 Wi-Fi'));
  }

  if (system.mqtt_connected) {
    updateTile('status-mqtt', 'ready', t('已连接'), mqttEndpoint(config));
  } else if (system.mqtt_connecting) {
    updateTile('status-mqtt', 'pending', t('连接中'), mqttEndpoint(config));
  } else if (runtime.sta_has_ip && Number(system.mqtt_last_error_at_ms || 0) > 0) {
    updateTile('status-mqtt', 'error', t('连接失败'), mqttErrorDetail(system, config));
  } else if (runtime.sta_has_ip) {
    updateTile('status-mqtt', 'pending', t('等待连接'), mqttErrorDetail(system, config));
  } else {
    updateTile('status-mqtt', 'neutral', t('需要 Wi-Fi'), t('连上 Wi-Fi 后将连接 Broker'));
  }

  if (system.ble_connected) {
    const ready = system.ancs_ready === true;
    updateTile('status-ble', ready ? 'ready' : 'pending',
      ready ? t('已可接收通知') : t('已连接 · 准备中'),
      ready ? t('认证与两个 ANCS 订阅已完成') : t('正在确认认证、服务发现与通知订阅状态'));
    $('ble-guidance').textContent = ready
      ? t('请发送一条新通知验证送达。最近一条通知与当前连接状态是两回事。')
      : t('仅建立连接不代表已就绪，请确认 iPhone 的系统通知共享已开启。');
  } else if (system.ble_pairing_repair_required) {
    updateTile(
      'status-ble',
      'error',
      t('需要恢复注册'),
      t(`认证错误 ${Number(system.ble_auth_error || 0)} · 请确认 PIN 后重新发起注册`),
    );
    $('ble-guidance').textContent =
      t('因反复认证失败已暂停新注册。请确认 PIN 后点击“重试注册”。仅当已有 iPhone 条目阻止新注册时才删除该条目。替换注册是独立操作。');
  } else if (system.enroll_window_open) {
    updateTile(
      'status-ble',
      'pending',
      t('等待注册'),
      blePasskey
        ? t(`${bluetoothName} · 固定 PIN ${blePasskey}`)
        : t(`请在 iPhone 蓝牙设置中选择 ${bluetoothName}`),
    );
    $('ble-guidance').textContent = blePasskey
      ? t(`正在发送注册信号。请在 iPhone 蓝牙设置中选择 ${bluetoothName} 并输入固定 PIN ${blePasskey}。`)
      : t(`正在发送注册信号。请在 iPhone 蓝牙设置中选择 ${bluetoothName} 并输入固定 PIN 123456。`);
  } else if (system.ble_bonded) {
    updateTile('status-ble', 'pending', t('已注册 · 等待连接'), t('正在寻找已注册的 iPhone'));
    $('ble-guidance').textContent = t('只有已注册的 iPhone 会自动重新连接。你可以用本页按钮重新发送重连信号。');
  } else {
    updateTile('status-ble', 'neutral', t('未注册 · 广播已关闭'), t('开始注册前不会发送蓝牙配对信号'));
    $('ble-guidance').textContent = t('点击本页的“注册 iPhone 设备”按钮即可发送蓝牙注册信号。');
  }

  updateEnrollmentControls(system, blePasskey);

  const published = Number(system.notifications_published || 0);
  const dropStats = relayDropBreakdown(system);
  const relayReady = runtime.sta_has_ip && system.mqtt_connected && system.ancs_ready === true;
  const relayState = relayReady
    ? 'ready'
    : system.mqtt_connected || system.mqtt_connecting
      ? 'pending'
      : runtime.sta_has_ip
        ? 'error'
        : 'neutral';
  updateTile(
    'status-relay',
    relayState,
    t(`已发送 ${published} 条`),
    dropStats.detail
      || (system.mqtt_connected
        ? t('正在等待测试通知或 iPhone 通知')
        : t('MQTT 连接就绪后将自动发布 Discovery')),
  );

  const testButton = $('test-notification');
  testButton.dataset.requiresMqtt = 'true';
  if (testButton.dataset.busy !== 'true') {
    testButton.disabled = !system.mqtt_connected;
  }

  hydrateForm(status, apName, deviceFamily);

  $('wifi-password-help').textContent = config.wifi_password_configured
    ? t('已保存密码。仅在需要修改时重新输入。')
    : t('开放网络请留空。');
  $('mqtt-password-help').textContent = config.mqtt_password_configured
    ? t('已保存密码。仅在需要修改时重新输入。更改曾成功连接过的服务器地址或端口时必须重新输入。')
    : t('Broker 无密码请留空。');
  $('mqtt-ca-help').textContent = config.mqtt_ca_configured
    ? t('已保存 CA 证书。仅在需要更换时重新输入。')
    : t('开启 TLS 需要提供 CA 证书。');
  toggleTlsField();
}

async function loadStatus() {
  const status = await fetch('/api/status', { cache: 'no-store' }).then((response) => {
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  });
  applyStatus(status);
  return status;
}

function toggleTlsField() {
  $('mqtt-ca-field').hidden = !$('mqtt-tls').checked;
}

async function runButton(id, busyLabel, action) {
  setBusy(id, true, busyLabel);
  try {
    await action();
  } catch (error) {
    setMessage(error.message || t('请求处理失败。'), 'error');
  } finally {
    setBusy(id, false, busyLabel);
    loadStatus().catch(() => {});
  }
}

async function waitForMqttResult(maxAttempts = 16) {
  let latest = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await delay(1000);
    latest = await loadStatus();
    if (latest.system?.mqtt_connected) return latest;
    if (
      Number(latest.system?.mqtt_last_error_at_ms || 0) > 0 &&
      !latest.system?.mqtt_connecting
    ) {
      throw new Error(mqttErrorDetail(latest.system, latest.config || {}));
    }
  }
  throw new Error(
    latest
      ? t(`未收到 Broker 响应。${mqttErrorDetail(latest.system || {}, latest.config || {})}`)
      : t('未收到 Broker 响应。'),
  );
}

$('refresh-status').addEventListener('click', () => runButton('refresh-status', t('确认中'), async () => {
  await loadStatus();
  setMessage(t('已重新确认当前连接状态。'), 'success');
}));

$('scan-wifi').addEventListener('click', () => runButton('scan-wifi', t('搜索中'), async () => {
  const result = await fetch('/api/wifi/scan').then((response) => {
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  });
  const select = $('wifi-ssid');
  select.innerHTML = '';
  const aps = result.aps || [];
  if (aps.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('未搜索到网络');
    select.appendChild(option);
    setMessage(t('没有找到 Wi-Fi，你可以直接输入 SSID。'), 'error');
    return;
  }
  for (const ap of aps) {
    const option = document.createElement('option');
    option.value = ap.ssid;
    option.textContent = `${ap.ssid} · ${ap.rssi} dBm`;
    select.appendChild(option);
  }
  $('wifi-ssid-manual').value = '';
  setMessage(t(`找到 ${aps.length} 个 Wi-Fi。`), 'success');
}));

$('wifi-ssid').addEventListener('change', () => {
  if ($('wifi-ssid').value) $('wifi-ssid-manual').value = '';
});

$('wifi-ssid-manual').addEventListener('input', () => {
  if ($('wifi-ssid-manual').value.trim()) $('wifi-ssid').value = '';
});

$('mqtt-tls').addEventListener('change', toggleTlsField);

$('mqtt-config').addEventListener('submit', async (event) => {
  event.preventDefault();
  const ssid = $('wifi-ssid-manual').value.trim() || $('wifi-ssid').value;
  if (!ssid) {
    setMessage(t('请搜索要连接的 Wi-Fi，或直接输入 SSID。'), 'error');
    $('wifi-ssid').focus();
    return;
  }

  const payload = {
    wifi_ssid: ssid,
    wifi_password: $('wifi-password').value,
    mqtt_host: $('mqtt-host').value.trim(),
    mqtt_port: Number($('mqtt-port').value),
    mqtt_username: $('mqtt-username').value.trim(),
    mqtt_password: $('mqtt-password').value,
    mqtt_tls: $('mqtt-tls').checked,
    mqtt_ca: $('mqtt-ca').value.trim(),
    mqtt_client_id: $('mqtt-client-id').value.trim(),
    mqtt_base_topic: $('mqtt-base-topic').value.trim(),
  };

  await runButton('save-connect', t('保存中'), async () => {
    await api('/api/config', { method: 'POST', body: JSON.stringify(payload) });
    formHydrated = false;
    setMessage(t('设置已保存并开始连接。设置门户将保持开启 10 分钟以便测试。连接失败时设置 AP 会自动重新出现，具体原因会显示在本页。'), 'success');
    setTimeout(() => loadStatus().catch(() => {}), 1200);
  });
});

$('mqtt-test').addEventListener('click', () => runButton('mqtt-test', t('正在检查连接'), async () => {
  await api('/api/mqtt/test', { method: 'POST', body: '{}' });
  setMessage(t('正在确认 MQTT 连接结果。'), 'info');
  await waitForMqttResult();
  setMessage(t('MQTT Broker 连接与 Home Assistant Discovery 发布已完成。'), 'success');
}));

$('test-notification').addEventListener('click', () => runButton('test-notification', t('正在确认发送'), async () => {
  const before = await loadStatus();
  const publishedBefore = Number(before.system?.notifications_published || 0);
  await api('/api/notification/test', { method: 'POST', body: '{}' });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(500);
    const current = await loadStatus();
    if (Number(current.system?.notifications_published || 0) > publishedBefore) {
      setMessage(t('测试通知已通过 MQTT 发送，请查看 Home Assistant 的最近通知传感器。'), 'success');
      return;
    }
  }
  throw new Error(t('测试通知已入队，但未确认 MQTT 发送成功。'));
}));

$('start-enrollment').addEventListener('click', () => runButton('start-enrollment', t('注册启动中'), async () => {
  await api('/api/ble/enroll', { method: 'POST', body: '{}' });
  const status = await loadStatus();
  const passkey = Number(status.system?.ble_passkey || 0);
  const code = Number.isInteger(passkey) && passkey >= 100000 && passkey <= 999999
    ? String(passkey).padStart(6, '0')
    : null;
  setMessage(
    code
      ? t(`iPhone 注册已开始。请在 iPhone 蓝牙注册窗口输入本页显示的正确固定 PIN ${code}。`)
      : t('已发送 iPhone 注册信号。请留在本页直到状态卡片刷新。'),
    'success',
  );
}));

$('replace-enrollment').addEventListener('click', () => {
  const confirmation = $('replace-confirmation').value;
  if (confirmation !== 'REPLACE ENROLLMENT') {
    setMessage(t('请准确输入 REPLACE ENROLLMENT。'), 'error');
    return;
  }
  runButton('replace-enrollment', t('替换中'), async () => {
    await api('/api/ble/replace', {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
    });
    $('replace-confirmation').value = '';
    setMessage(t('已删除原有 iPhone 注册并开始新注册。'), 'success');
  });
});

$('restart').addEventListener('click', () => runButton('restart', t('重启请求中'), async () => {
  await api('/api/restart', { method: 'POST', body: '{}' });
  setMessage(t('已请求设备重启。'), 'success');
}));

$('reset-provisioning').addEventListener('click', () => {
  const confirmation = $('reset-confirmation').value;
  if (confirmation !== 'RESET PROVISIONING') {
    setMessage(t('请准确输入 RESET PROVISIONING。'), 'error');
    return;
  }
  runButton('reset-provisioning', t('初始化中'), async () => {
    await api('/api/reset', {
      method: 'POST',
      body: JSON.stringify({ confirmation }),
    });
    $('reset-confirmation').value = '';
    formHydrated = false;
    setMessage(t('已重置 Wi-Fi 与 MQTT 设置。'), 'success');
  });
});

loadStatus().catch((error) => setMessage(error.message || t('无法加载设备状态。'), 'error'));

if (typeof window !== 'undefined') {
  window.setInterval(() => {
    if (!document.hidden) loadStatus().catch(() => {});
  }, STATUS_POLL_MS);
}
