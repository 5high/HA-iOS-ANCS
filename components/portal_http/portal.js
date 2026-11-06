const $ = (id) => document.getElementById(id);
const STATUS_POLL_MS = 2000;
let formHydrated = false;
let ledSwitchPending = false;

// Bilingual setup portal: Chinese is the base copy; English strings below are
// applied when the browser language is not Chinese. Placeholders use {} markers.
const PORTAL_LANG = (typeof navigator === 'undefined' ||
  String(navigator.language || '').toLowerCase().startsWith('zh')) ? 'zh' : 'en';

const PORTAL_EN = {
  "已开启：收到通知时设备会亮灯。": 'Enabled: the device lights up on notifications.',
  "已关闭：收到通知时设备不再亮灯。": 'Disabled: the device stays dark on notifications.',
  "保存亮灯设置失败。": 'Could not save the notification light setting.',
  " · {} 秒后重试": ' · retry in ${retrySeconds}s',
  "Base topic 格式不正确：用 / 分隔的多段路径，每段不能为空，不能以 / 开头或结尾，不能使用 + 或 #。例如 u/marcozy@163.com/ancs。": 'Invalid base topic: a slash-separated path where no segment is empty, it does not start or end with /, and + or # are not allowed. Example: u/marcozy@163.com/ancs.',
  "Broker 无密码请留空。": 'Leave empty if the broker has no password.',
  "Client ID 只能包含字母、数字、下划线 _ 和连字符 -（Home Assistant Discovery 要求）。": 'The client ID may only contain letters, digits, underscores _ and hyphens - (required by Home Assistant Discovery).',
  "MQTT Broker 连接与 Home Assistant Discovery 发布已完成。": 'MQTT broker connected and Home Assistant Discovery published.',
  "MQTT 未连接 {} 条": '${offline} while MQTT offline',
  "MQTT 连接就绪后将自动发布 Discovery": 'Discovery publishes automatically once MQTT is connected',
  "TLS 主机名与证书不符：请使用证书签发的域名（如 mqtt.5high.top），不要用 IP 地址。": 'TLS hostname mismatch: use the domain in the certificate (e.g. mqtt.5high.top), not an IP address.',
  "TLS 证书校验失败：请确认 CA 栏留空（使用固件内置根证书）或粘贴与证书链匹配的 CA。": 'TLS certificate validation failed: leave the CA field empty (built-in root bundle) or paste a CA matching the certificate chain.',
  "TLS 错误码": 'TLS error code',
  "iPhone 已连接": 'Enroll iPhone',
  "iPhone 注册已开始。请在 iPhone 蓝牙注册窗口输入本页显示的正确固定 PIN {}。": 'iPhone enrollment started. Enter fixed PIN {}, shown on this page, in the iPhone Bluetooth pairing dialog.',
  "{} · Broker 不可用{}": '${endpoint} · broker unavailable${retry}',
  "{} · Broker 拒绝连接，代码 {}{}": '${endpoint} · broker refused, code ${returnCode}${retry}',
  "{} · Client ID 被拒绝{}": '${endpoint} · client ID rejected${retry}',
  "{} · ESP32 到服务器无路由{}": '${endpoint} · no route from the ESP32 network to the server${retry}',
  "{} · TCP 连接超时{}": '${endpoint} · TCP connection timed out${retry}',
  "{} · 传输错误 ESP {}, socket {}{}": '${endpoint} · transport error ESP ${espError}, socket ${socketError}${retry}',
  "{} · 固定 PIN {}": '${bluetoothName} · fixed PIN ${blePasskey}',
  "{} · 用户名或密码被拒绝{}": '${endpoint} · username or password rejected${retry}',
  "{} · 端口拒绝连接{}": '${endpoint} · port refused the connection${retry}',
  "{} 秒后重试 · 断开原因 {}": 'Retry in ${seconds}s · disconnect reason ${Number(runtime.last_wifi_disconnect_reason || 0)}',
  "仅建立连接不代表已就绪，请确认 iPhone 的系统通知共享已开启。": 'A connection alone is not readiness. Check that notification sharing is allowed on the iPhone.',
  "保存中": 'Checking',
  "保存失败：配置校验未通过，请检查上方各字段格式（Broker 地址、端口、Client ID、Base topic 等）。": 'Save failed: the settings did not pass validation. Check the field formats above (broker address, port, client ID, base topic, etc.).',
  "其他 {} 条": '${unclassified} unclassified',
  "内部处理失败 {} 条": '${enqueue} internal enqueue failures',
  "初始化中": 'Checking',
  "只有已注册的 iPhone 会自动重新连接。你可以用本页按钮重新发送重连信号。": 'Only the enrolled iPhone reconnects automatically. Use the button on this page to resend the reconnect signal.',
  "因反复认证失败已暂停新注册。请确认 PIN 后点击“重试注册”。仅当已有 iPhone 条目阻止新注册时才删除该条目。替换注册是独立操作。": 'New enrollment is paused after repeated authentication failures. Confirm the PIN and tap Retry enrollment. Remove the existing iPhone entry only if it blocks new enrollment; replacing enrollment is a separate action.',
  "已保存 CA 证书。仅在需要更换时重新输入；清空并保存将改用固件内置公共根证书。": 'A CA certificate is stored. Enter a new one only to replace it; clear and save to switch to the firmware built-in public root bundle.',
  "已保存密码。仅在需要修改时重新输入。": 'A password is stored. Enter a new one only when you want to change it.',
  "已保存密码。仅在需要修改时重新输入。更改曾成功连接过的服务器地址或端口时必须重新输入。": 'A password is stored. Enter a new one only to change it. Changing the address or port of a previously connected server requires re-entry.',
  "已删除原有 iPhone 注册并开始新注册。": 'Removed the existing iPhone enrollment and started a new one.',
  "已发送 iPhone 注册信号。请留在本页直到状态卡片刷新。": 'iPhone enrollment signal sent. Stay on this page until the status card refreshes.',
  "已发送 {} 条": '${published} sent',
  "已可接收通知": 'Checking',
  "已注册 · 等待连接": 'Enrolled · waiting to connect',
  "已获取 IP 地址": 'Got an IP address',
  "已请求设备重启。": 'Device restart requested.',
  "已连接": 'Checking',
  "已连接 · 准备中": 'Connected · preparing',
  "已重新确认当前连接状态。": 'Refreshed the current connection state.',
  "已重置 Wi-Fi 与 MQTT 设置。": 'Wi-Fi and MQTT settings were reset.',
  "开始注册前不会发送蓝牙配对信号": 'Checking',
  "开放网络请留空。": 'Leave empty for an open network.',
  "找到 {} 个 Wi-Fi。": 'Found {} Wi-Fi networks.',
  "搜索中": 'Checking',
  "无法加载设备状态。": 'Could not load the device status.',
  "更改曾成功连接过的 MQTT 服务器地址或端口时，必须重新输入 MQTT 密码。": 'When you change the address or port of an MQTT server that connected before, re-enter the MQTT password.',
  "替换中": 'Checking',
  "未搜索到网络": 'Checking',
  "未收到 Broker 响应。": 'No broker response.',
  "未收到 Broker 响应。{}, latest.config || {})}": 'No broker response. ',
  "未注册 · 广播已关闭": 'Not enrolled · Advertising off',
  "未设置 Broker 地址": 'Broker address not set',
  "未连接 Wi-Fi": 'Waiting for the Wi-Fi response',
  "正在发送注册信号。请在 iPhone 蓝牙设置中选择 {} 并输入固定 PIN 654321。": 'Sending the enrollment signal. Select {} in iPhone Bluetooth settings and enter fixed PIN 654321.',
  "正在发送注册信号。请在 iPhone 蓝牙设置中选择 {} 并输入固定 PIN {}。": 'Sending the enrollment signal. Select {} in iPhone Bluetooth settings and enter fixed PIN {}.',
  "正在寻找已注册的 iPhone": 'Enroll iPhone',
  "正在检查连接": 'Checking',
  "正在确认 MQTT 连接结果。": 'Checking the MQTT connection result.',
  "正在确认发送": 'Checking',
  "正在确认认证、服务发现与通知订阅状态": 'Checking authentication, service discovery, and notification subscriptions',
  "正在等待测试通知或 iPhone 通知": 'Enroll iPhone',
  "此操作只能在设备热点内进行：请连接 Wi-Fi「iOSMSG-XXXX」热点后打开 192.168.4.1 再试。当前是通过局域网地址访问的，出于安全考虑（防止办公室内其他人远程抢绑 iPhone），设备只接受来自自身热点的请求。": 'This action only works over the device hotspot. Connect to the "iOSMSG-XXXX" Wi-Fi, open 192.168.4.1 in your browser, and try again. You are reaching the device via its LAN address, and for security (so nobody else in the office can remotely claim the iPhone pairing) it only accepts requests from its own hotspot.',
  "没有找到 Wi-Fi，你可以直接输入 SSID。": 'No Wi-Fi found. You can type the SSID manually.',
  "注册 iPhone 设备": 'Enroll iPhone',
  "注册启动中": 'Checking',
  "测试通知已入队，但未确认 MQTT 发送成功。": 'The test notification was queued but its MQTT delivery was not confirmed.',
  "测试通知已通过 MQTT 发送，请查看 Home Assistant 的最近通知传感器。": 'Test notification sent over MQTT. Check the recent-notification sensor in Home Assistant.',
  "点击本页的“注册 iPhone 设备”按钮即可发送蓝牙注册信号。": 'Press Enroll iPhone on this page to send the Bluetooth enrollment signal.',
  "确认 PIN 后重试注册": 'Retry enrollment after PIN check',
  "确认中": 'Checking',
  "等待 Wi-Fi 响应": 'Waiting for the Wi-Fi response',
  "等待注册": 'Checking',
  "等待自动恢复": 'Checking',
  "等待连接": 'Checking',
  "策略过滤 {} 条": '${policy} filtered by policy',
  "自启动后排除 {} 条 · 旧固件无法区分排除原因": '${total} excluded since boot · older firmware did not classify exclusion reasons',
  "认证与两个 ANCS 订阅已完成": 'Authenticated and both ANCS subscriptions active',
  "认证错误 {} · 请确认 PIN 后重新发起注册": 'Auth error ${Number(system.ble_auth_error || 0)} · confirm the PIN and request enrollment again',
  "设置已保存并开始连接。设置门户将保持开启 10 分钟以便测试。连接失败时设置 AP 会自动重新出现，具体原因会显示在本页。": 'Settings saved and connecting. The setup portal stays open for 10 minutes for testing. On failure the setup AP reappears automatically and the reason shows on this page.',
  "请准确输入 REPLACE ENROLLMENT。": 'Type REPLACE ENROLLMENT exactly.',
  "请准确输入 RESET PROVISIONING。": 'Type RESET PROVISIONING exactly.',
  "请发送一条新通知验证送达。最近一条通知与当前连接状态是两回事。": 'Send a new notification to verify delivery. The last notification is separate from the current connection state.',
  "请在 iPhone 蓝牙设置中选择 {}": 'Select ${bluetoothName} in iPhone Bluetooth settings',
  "请在下方选择 Wi-Fi": 'Waiting for the Wi-Fi response',
  "请搜索要连接的 Wi-Fi，或直接输入 SSID。": 'Scan for a Wi-Fi network or type the SSID directly.',
  "请求处理失败。": 'The request could not be processed.',
  "连上 Wi-Fi 后将连接 Broker": 'Connects to the broker after Wi-Fi is up',
  "连接中": 'Connecting',
  "连接失败": 'Checking',
  "重启请求中": 'Checking',
  "重新发送注册信号": 'Checking',
  "重连已注册的 iPhone": 'Enroll iPhone',
  "需要 Wi-Fi": 'Waiting for the Wi-Fi response',
  "需要恢复注册": 'Checking',
  "需要设置": 'Checking',
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
    t('保存失败：配置校验未通过，请检查上方各字段格式（Broker 地址、端口、Client ID、Base topic 等）。'),
  invalid_mqtt_base_topic:
    t('Base topic 格式不正确：用 / 分隔的多段路径，每段不能为空，不能以 / 开头或结尾，不能使用 + 或 #。例如 u/marcozy@163.com/ancs。'),
  invalid_mqtt_client_id:
    t('Client ID 只能包含字母、数字、下划线 _ 和连字符 -（Home Assistant Discovery 要求）。'),
  tls_ca_required:
    t('CA 证书校验未通过。公共 CA（Let\'s Encrypt/ZeroSSL）签发的证书可把「CA 证书 PEM」留空，固件会用内置公共根证书；自签名证书请粘贴对应 CA。'),
  'AP interface required':
    t('此操作只能在设备热点内进行：请连接 Wi-Fi「iOSMSG-XXXX」热点后打开 192.168.4.1 再试。当前是通过局域网地址访问的，出于安全考虑（防止办公室内其他人远程抢绑 iPhone），设备只接受来自自身热点的请求。'),
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
  return `iOSMSG-${deviceSuffix(apSsid).toUpperCase()}`;
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

// A TLS handshake failure only reports a bare ESP-IDF error number, which is
// meaningless to users. Spell out the two common ones and keep the raw code.
function espTlsErrorHint(system) {
  const tlsErr = Number(system.mqtt_last_esp_tls_err || 0);
  if (tlsErr === -0x2700) {
    return ' · ' + t('TLS 证书校验失败：请确认 CA 栏留空（使用固件内置根证书）或粘贴与证书链匹配的 CA。');
  }
  if (tlsErr === -0x6E00) {
    return ' · ' + t('TLS 主机名与证书不符：请使用证书签发的域名（如 mqtt.5high.top），不要用 IP 地址。');
  }
  return tlsErr ? ` · ${t('TLS 错误码')} ${tlsErr >>> 0}` : '';
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
    ? t('已保存 CA 证书。留空并保存 = 保留；清空此栏将改用固件内置公共根证书（适合 Let\'s Encrypt/ZeroSSL 等公共证书），贴入新证书则替换。')
    : '-----BEGIN CERTIFICATE-----';
  formHydrated = true;
}

function applyStatus(status) {
  const runtime = status.runtime || {};
  const system = status.system || {};
  const config = status.config || {};
  const target = String(status.target || 'esp32c6').toLowerCase();
  const deviceFamily = String(status.device_family || 'C6').toUpperCase();
  const apName = runtime.ap_ssid || 'iOSMSG';
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

  /* The LED switch is live state, not part of the settings form: reflect
   * the device's stored preference unless the user is mid-edit. */
  if (!ledSwitchPending) {
    $('notification-led').checked =
      system.notification_led_enabled !== false;
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
    updateTile('status-mqtt', 'error', t('连接失败'), mqttErrorDetail(system, config) + espTlsErrorHint(system));
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
      : t(`正在发送注册信号。请在 iPhone 蓝牙设置中选择 ${bluetoothName} 并输入固定 PIN 654321。`);
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
    ? t('已保存 CA 证书。仅在需要更换时重新输入；清空并保存将改用固件内置公共根证书。')
    : t('可留空：TLS 默认使用固件内置的公共根证书（Let\'s Encrypt/ZeroSSL 等）。仅自签名证书需要粘贴 CA。');
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

$('notification-led').addEventListener('change', async (event) => {
  const enabled = event.target.checked;
  ledSwitchPending = true;
  try {
    await api('/api/led', { method: 'POST', body: JSON.stringify({ enabled }) });
    setMessage(
      enabled
        ? t('已开启：收到通知时设备会亮灯。')
        : t('已关闭：收到通知时设备不再亮灯。'),
      'success');
  } catch (error) {
    event.target.checked = !enabled;
    setMessage(error.message || t('保存亮灯设置失败。'), 'error');
  } finally {
    ledSwitchPending = false;
  }
});

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
