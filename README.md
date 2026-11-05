<!-- project-branding:start -->
<p align="center">
  <img src="custom_components/ha_ios_ancs/brand/logo@2x.png" alt="iOS ANCS 标志" width="520">
</p>
<p align="center">
  <a href="https://github.com/5high/HA-iOS-ANCS/stargazers"><img src="https://img.shields.io/github/stars/5high/HA-iOS-ANCS?style=flat-square&logo=github&label=Stars" alt="GitHub Stars"></a>
  <a href="https://github.com/5high/HA-iOS-ANCS/releases"><img src="https://img.shields.io/github/v/release/5high/HA-iOS-ANCS?style=flat-square&label=Release" alt="Latest Release"></a>
  <a href="https://github.com/5high/HA-iOS-ANCS/blob/main/docs/manifests/ios-ancs.json"><img src="https://img.shields.io/badge/Architecture-ESP32%20family-0ea5e9?style=flat-square" alt="ESP32, ESP32-C2, ESP32-C3, ESP32-C5, ESP32-C6, ESP32-C61, ESP32-S3"></a>
  <a href="https://github.com/5high/HA-iOS-ANCS/blob/main/LICENSE"><img src="https://img.shields.io/github/license/5high/HA-iOS-ANCS?style=flat-square&label=License" alt="License"></a>
  <a href="https://github.com/5high/HA-iOS-ANCS/commits/main"><img src="https://img.shields.io/github/last-commit/5high/HA-iOS-ANCS?style=flat-square&label=Updated" alt="Last Commit"></a>
</p>
<!-- project-branding:end -->

# Home Assistant iOS ANCS

[English](README.en.md) | [GitHub](https://github.com/5high/HA-iOS-ANCS) | [浏览器安装页面](https://5high.github.io/HA-iOS-ANCS/)

Home Assistant iOS ANCS 是一套 ESP32 固件加可选的 Home Assistant 伴侣集成：ESP32 通过蓝牙 (BLE) 将 iPhone 等 iOS 设备的通知，经 MQTT 转发到本地 Home Assistant。仅靠 MQTT Discovery 即可生成基础实体和按钮；HACS 只负责安装 Home Assistant 一侧的集成。ESP32 固件的安装请使用浏览器安装页面或源码构建工具。

**Apple Notification Center Service (ANCS)**：苹果的标准蓝牙低功耗服务，允许 iPhone 等 iOS 设备在配对并允许通知共享后，把通知元数据分享给附近的配件。

```text
iPhone → BLE ANCS → ESP32 → Wi-Fi/MQTT → Home Assistant
```


### 设置门户自检

从固件 0.3.7 起，MQTT 连接成功后会先发布 Home Assistant Discovery，因此没有真实 iPhone 通知设备也会完成注册。设置门户的 **发送测试通知** 可验证 ESP32 → MQTT → Home Assistant 的完整链路；连接失败时会显示 TCP 超时、端口拒绝、认证被拒以及重试间隔。保存设置后，设置门户会保持开启 10 分钟以便完成测试。

## 开发背景

本项目是一个 ESP32+MQTT 桥接：无需 iOS App 或 Apple 开发者账号，即可在本地网络内把 iOS 通知接入 Home Assistant 自动化。ESP32 与 iPhone 直接 BLE 配对，并把新的通知事件发布到用户填写的 Wi-Fi 与 MQTT broker。

## 要求

- 支持的 Wi-Fi + BLE ESP32 开发板
- 桌面版 Chrome 或 Edge 以及 USB 数据线
- 2.4 GHz Wi-Fi 与 MQTT broker
- Home Assistant MQTT integration 并开启 MQTT Discovery
- iPhone 蓝牙设置中允许通知共享
- 源码构建：ESP-IDF v6.0.2 with Bluedroid、Python 3.11 及以上

## 快速安装

1. 在桌面版 Chrome 或 Edge 打开 [浏览器安装页面](https://5high.github.io/HA-iOS-ANCS/)，用 USB 数据线连接 ESP32 开发板。
2. 选择板子型号，用 ESP Web Tools 刷入 factory 镜像。
3. 连接开发板发出的 `iOSMSG-XXXXXX` Wi-Fi，密码 `iosmsg-xxxxxx`。
4. 在 `http://192.168.4.1` 门户中只保存 Wi-Fi 与 MQTT 设置。该门户不保存 Home Assistant 或 iPhone 通知设置。
5. 不离开 `http://192.168.4.1` 设置门户，点击 **注册 iPhone 设备** 打开 120 秒注册窗口。Home Assistant 的 **开始 iPhone 注册** 按钮和长按 BOOT 3 秒也能打开同一个注册窗口。
6. 查看设置门户显示的正确固定 PIN `654321`，在 iOS 蓝牙设置中选择设备并输入该码，允许通知共享；确认 Home Assistant 中 `最近通知` 和 `App 名称` 传感器已更新。

`XXXXXX` 是开发板基础 Wi-Fi MAC 地址的最后 6 位十六进制：SSID 使用大写，密码使用同一后缀的小写。通用形式为 `ancs-<lowercase_suffix>`，示例不是型号编号。基础设施 Wi-Fi 密码按原样保存，区分大小写（case-sensitive）。

长按 BOOT 按钮 3 秒可打开设置 AP 或 iPhone 注册窗口。若已存在保存的 iPhone 配对信息（bond），注册动作只会请求重连已知 iPhone，不允许新手机配对。

## Wi-Fi 与 MQTT 设置

设置 AP 和 `http://192.168.4.1` 门户只保存 Wi-Fi 与 MQTT 设置。`iOSMSG-XXXXXX` 的 `XXXXXX` 是基础 Wi-Fi MAC 地址最后 6 位：SSID 用大写，`iosmsg-xxxxxx`（通用形式 `ancs-<lowercase_suffix>`）密码用小写。Home Assistant 设备由 MQTT Discovery 创建。

从固件 0.4.0 起，MQTT 服务器一旦连接成功，设置就会被记住。

- 之后 broker 停机、重启或网络中断时不会打开设置 AP，而是按 5 秒、15 秒、30 秒、此后每 60 秒持续重连。
- 只有当 broker 有响应且连续 10 分钟拒绝已保存的设置（账号、密码、权限、Client ID）时，才会打开设置 AP 供你修改；期间 broker 一旦无响应，10 分钟重新计时。
- 从未连接成功的设置（首次安装、拼写错误）仍按原逻辑：连接失败即打开设置 AP；修改时清空密码框会沿用已保存的密码。
- 需要更换正常使用的 MQTT 服务器地址、端口或 CA 证书时，长按 BOOT 3 秒打开设置门户。因证书不匹配而失败的连接同样只做重试。
- 更改曾成功连接过的 MQTT 服务器地址或端口时，必须重新输入 MQTT 密码。
- 从 0.3.9 升级的设备在 0.4.0 上首次 MQTT 连接成功后开始适用上述规则。

## iPhone 注册

通过设置门户的 **注册 iPhone 设备** 按钮、Home Assistant 的 **开始 iPhone 注册** 按钮或长按 BOOT 3 秒打开 120 秒注册窗口。在 iOS 蓝牙设置中输入设置门户显示的正确固定 PIN `654321`，并允许通知共享。若已有保存的 iPhone 配对信息，同样的动作只会请求重连已注册的 iPhone。

## 支持板型与 v0.4.1 构建事实

通用固件使用最小 4 MB 闪存布局。ESP32-S2 无 BLE、ESP32-H2 无 Wi-Fi、ESP32-P4 无内置 Wi-Fi/BLE 射频，因此不在支持之列。

| Target | 常见模块/板型 | Factory 镜像 | v0.4.1 状态 |
| --- | --- | ---: | --- |
| `esp32` | ESP32-WROOM-32 / WROOM-D32 | 1,496,480 bytes | 构建已验证 · 本版本未实机验证 |
| `esp32c2` | ESP32-C2 | 1,499,888 bytes | 构建已验证 · 本版本未实机验证（本版本起无板载 RGB，RMT 缺失自动禁用） |
| `esp32c3` | ESP32-C3 | 1,710,672 bytes | 构建已验证 · 本版本未实机验证 |
| `esp32c5` | ESP32-C5 | 1,854,704 bytes | 构建已验证 · 本版本未实机验证 |
| `esp32c6` | ESP32-C6 | 1,856,000 bytes | 构建已验证 · 本版本未实机验证 |
| `esp32c61` | ESP32-C61 | 1,777,184 bytes | 构建已验证 · 本版本未实机验证（本版本起无板载 RGB，RMT 缺失自动禁用） |
| `esp32s3` | ESP32-S3 | 1,485,984 bytes | 构建已验证 · 本版本已实机刷写（DevKitC-1 v1.0：单颗 WS2812 通知灯效、配置保存修复） |

表中状态基于本地 v0.4.1 构建（CI 矩阵同配置）。构建验证、实机刷写、BLE 注册、iPhone 通知接收是不同层级的验证；没有实机结果的板型只标注构建已验证。

## Home Assistant 与 HACS

MQTT Discovery 无需 HACS 即可工作。设备连上 MQTT broker 后会发布 retained Discovery 配置，Home Assistant 随即创建设备、`最近通知`、`App 名称`、状态传感器和 `开始 iPhone 注册` 按钮。

HACS 只安装 Home Assistant 伴侣集成，不会安装或更新 ESP32 固件。HACS custom repository 安装：打开 [iOS ANCS HACS My Link](https://my.home-assistant.io/redirect/hacs_repository/?owner=5high&repository=HA-iOS-ANCS&category=integration)，在 Home Assistant 中确认添加仓库。集成显示名为 `iOS ANCS`；为兼容既有 HACS 安装，仓库名称和 URL 保持 `HA-iOS-ANCS` 不变。本文只描述 custom repository 路径，不声称已注册进 HACS 官方商店。

### HACS 安装

按下下方按钮将打开 Home Assistant 的 HACS 自定义仓库添加页面。

[![在 Home Assistant 中打开 HACS 仓库](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=5high&repository=HA-iOS-ANCS&category=integration)

无法使用按钮时按以下步骤安装。

1. 在 Home Assistant 打开 `HACS` → `Integrations`。
2. 在右上角 `⋮` 菜单选择 `Custom repositories`。
3. 在 `Repository` 填入 `https://github.com/5high/HA-iOS-ANCS`。
4. 在 `Category` 中选择 `Integration`，然后点击 `Add`。
5. 安装 `iOS ANCS` 后重启 Home Assistant。

添加 HACS 集成时不会要求输入 MQTT 基础主题。集成把 MQTT Discovery 已注册的 `最近通知` 传感器作为只读通知来源。只有一台兼容源设备时会自动选择，多台时按设备名称显示选择列表。

`通知` 事件实体和详情实体会注册到与 MQTT 设备分离的独立 `iOS ANCS (...)` 设备上。不会通过 `via_device` 关联 MQTT 设备，即使指向同一物理设备，两个集成的设备与实体也保持独立。集成会把最后一条完整通知存入专用存储，因此即使 MQTT 通知不是 retained，重启 Home Assistant 后详情传感器也会恢复。事件实体只显示新通知，不会把已保存的详情重放为新事件。既有的手动主题条目可在集成的 **重新配置** 中选择 MQTT 源设备，在保留实体 ID 和历史记录的前提下迁移到独立的 iOS ANCS 设备。

伴侣集成不会修改或禁用 MQTT Discovery 实体。独立 iOS ANCS 设备上的通知事件、23 个专用传感器和 12 个严格二进制传感器，以及诊断用 `原始通知` 传感器。独立 `iOS ANCS (...)` 设备上还有诊断用 BLE 连接二进制传感器，经由 Home Assistant 中已注册的 MQTT Discovery 设备状态实体派生；MQTT 设备与实体保持分离、启用且不被修改。本次 HACS 更新无需重新刷写 ESP32 固件。文本传感器状态最长 255 字符，超长值保留在 `full_value` 属性，完整原始 JSON 保留在属性中。通知标题和内容等隐私数据可能被 Home Assistant Recorder 记录，不需要记录时请把对应实体从 Recorder 排除（已从 Recorder 排除的实体不受影响）。诊断实体 `连接恢复状态` 和 `通知就绪` 不会把每分钟变化的运行时长、通知计数、重试等待等属性写入 Recorder；当前值照常显示，同值的记录保留在 MQTT 设备状态实体上。状态记录每分钟仍会新增一行短记录，如也不需要，请把这两个实体一并从 Recorder 排除。

MQTT Discovery 的 compact model 围绕 `最近通知`（Recent notification）、`通知标题`（Notification title）、`通知内容`（Notification message）、`App 名称`（App name）、`设备状态`（Device status）和 `设备重启`（Device restart）实体组织。状态属性包含 `ready`、`uptime_seconds`、`ble_connected`、`wifi_ssid` 等诊断值。

示例自动化：

```text
homeassistant/automation_ios_ancs_c6_relay.yaml
homeassistant/automation_ios_ancs_parking_arrival_tts.yaml
homeassistant/automation_ios_ancs_baemin_delivery_tts.yaml
```

使用前请把 `sensor.replace_with_your_last_notification_entity` 换成你 Home Assistant 里的 last-notification sensor，把 `notify.replace_with_your_mobile_app_service` 换成你的 mobile app notify 服务。示例只转发新的 `relay_id` 状态变化，不转发 `complete=false`、`pre_existing=true`、`unknown`、`unavailable` 以及 availability 恢复跳变。

通知 JSON 会保留原始 `app_id` 并补充展示用 `app_name`。固件优先使用 iPhone 通过 ANCS 提供的本地化 Display Name；某个 App 的首条通知可能因名称查询多一次 ANCS 请求，同一连接会话的后续通知使用有限的会话缓存。即使查询失败也不丢弃通知详情，按现有静态映射、原始 App ID 的顺序回退。代表性回退映射见 [App ID Reference](docs/APP_ID_REFERENCE.md)。

## 问题排查

- 安装按钮不显示或失败：检查桌面版 Chrome/Edge、USB 数据线、操作系统串口权限。iPhone/iPad 浏览器无法进行 USB 刷写。
- 看不到 `iOSMSG-XXXXXX`：确认供电与刷写是否成功，长按 BOOT 3 秒打开恢复窗口。
- 打不开 `http://192.168.4.1`：确认确实连在 setup AP 上，并暂时关闭 VPN/蜂窝数据路由。
- MQTT 连不上：检查 host、port、TLS CA、用户名/密码、ACL、重复的 Client ID。
- iPhone 搜不到设备：用 `开始 iPhone 注册` 或 BOOT 3 秒重新打开 120 秒注册窗口。
- 要求输入 PIN：输入 `设置门户在注册期间显示的固定 PIN 654321`，并允许 iOS 的通知共享请求。
- Home Assistant 没有实体：检查 MQTT integration、Discovery 是否启用、retained config、`<base>/state`。

更详细的流程见 [iOS Pairing Guide](docs/IOS_PAIRING.md) 和 [Troubleshooting](docs/TROUBLESHOOTING.md)。

## 隐私与安全

- 不使用 iOS App、Apple 账号或 iCloud credential。
- Wi-Fi password、MQTT password、TLS CA 正文不会以明文出现在状态 API、Discovery、retained state 和诊断报告中。
- 留空 secret 输入框会保留已保存的值。但更改曾成功连接过的 MQTT 服务器地址或端口时，已保存的 MQTT 密码不会发往新服务器，必须重新输入。该保护只看地址与端口：在使用明文 MQTT（未开 TLS）时，能进入设置门户的人可以把 Wi-Fi 切到自己的网络并用同一 broker 地址应答来截取密码；要保护密码请使用 TLS 和 CA 证书。
- iOS 通知的标题、正文、App 名称、App ID 会发布到 MQTT broker 和 Home Assistant，请限制 broker 访问权限。
- 在 Home Assistant 中删除 iOS ANCS 集成条目时，集成保存的最后一条通知也会一并删除。0.6.13 及更早版本删除条目后，只要还有启用的集成条目，其文件会在下次启动或添加/启用条目时清除；若没有启用中的条目，请手动删除 `.storage/ha_ios_ancs.*.last_notification` 文件。
- 固定 PIN `654321` 仅用于本地注册窗口；转赠设备前请先整机 erase 并重新注册。

## 开发者参考

```powershell
python -m pip install -r tools/requirements.txt
python -m pytest tools/tests -q
# Home Assistant 测试（requirements_test.txt）需要 Python 3.14.2 及以上。
python -m pip install -r requirements_test.txt
python -m pytest tests -q
.\tools\build.ps1 -Target esp32c6
.\tools\flash.ps1 -Port COMx
.\tools\build_matrix.ps1
```

```bash
./tools/build.sh
./tools/flash.sh /dev/ttyACM0
```

`COMx` 和 `/dev/ttyACM0` 是通用示例，请按实际板子、target、串口替换。MQTT relay 验证用 `python tools/verify_mqtt_relay.py ...`，串口 ANCS 抓取用 `python tools/verify_capture.py --port COMx ...`。


### 车辆入场 TTS 自动化条件

`automation_ios_ancs_parking_arrival_tts.yaml` 要求 `app_id` 和 `app_name` 与用户指定的公寓 App **全部精确匹配**，且新通知正文包含韩国车牌号和 `차량이 입차`（车辆入场）字样才会执行。请把示例中的 `target_app_id`、`target_app_name`、事件实体、TTS 实体和扬声器实体替换为实际值。

### 外卖平台（Baedal Minjok）送达 TTS 条件

`automation_ios_ancs_baemin_delivery_tts.yaml` 只处理 iOS App ID `com.jawebs.baedal` 与 App 名称 `배달의민족` 均精确匹配的完整新通知：标题为 `곧 도착합니다!` 时播报骑手即将到达，标题为 `문앞으로 배달이 완료되었습니다.` 时播报门口放置与尽快取件，忽略优惠券和广告通知。请把事件实体、TTS 实体和扬声器实体替换为你的 Home Assistant 实际值。

## 变更记录

各版本的变更内容、验证范围以及是否包含固件，见 [CHANGELOG.md](CHANGELOG.md) 和 [GitHub Releases](https://github.com/5high/HA-iOS-ANCS/releases)。
