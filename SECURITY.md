# Security Policy

## 支持版本

安全修复只提供最新的 GitHub Release。每个 Release 标题中包含 Home Assistant 集成版本和随附的 ESP32 固件版本（例如 `iOS ANCS 0.6.15 / Firmware 0.4.0`）。

| 组件 | 支持情况 |
| --- | --- |
| 最新 Release 的 Home Assistant 集成 | 支持 |
| 最新 Release 附带的固件 | 支持 |
| 更早版本 | 不支持 |

HACS 只更新集成。固件请在[安装页面](https://5high.github.io/HA-iOS-ANCS/)单独安装。

## 漏洞报告

如果本仓库的 **Security** 标签页里有 **Report a vulnerability**（私密报告），请优先使用它。若没有，请不要在公开 issue 里写复现步骤或攻击方式，只注明受影响的组件（集成或固件）并请求私下联系。维护者会创建 GitHub draft security advisory 并邀请报告者，细节在 advisory 内沟通。

报告中有帮助的内容：

- 集成版本、固件版本、板子型号（ESP32 系列芯片）
- Home Assistant 版本
- 去除敏感值后的最小复现步骤
- 期望行为与实际行为

报告中不要包含的值：

- Wi-Fi 密码、MQTT 账号/密码、TLS CA、证书、私钥
- 从设备读取的 flash 或 NVS 备份（其中含 Wi-Fi/MQTT 密码和蓝牙配对密钥）
- 真实 iPhone 通知标题/正文、Home Assistant token

## 当前保护范围

- 为了便于安装，设置 AP 使用固定规则：名称为 `iOSMSG-XXXXXX`，密码是同一末 6 位的小写形式 `iosmsg-xxxxxx`。
- 以下情况会打开设置 AP。开启期间，任何知道该名称的附近人员都可能接入并修改设置：
  - 首次安装时
  - Wi-Fi 断连超过 45 秒时
  - 使用从未连接成功的 MQTT 设置（首装、拼写错误）且连接失败时
  - 曾连接成功的 MQTT 设置被 broker 连续 10 分钟每次拒绝时；期间一旦有连不上 broker 的尝试，10 分钟重新计时
  - 长按 BOOT 按钮 3 秒时（保持 10 分钟）
- 从固件 0.4.0 起，对曾连接成功的 MQTT 设置，在 broker 停机或重启期间（例如 Mosquitto 插件更新）不再打开设置 AP，只做重试；0.3.9 及更早版本此时会打开设置 AP。从 0.3.9 升级的设备在 0.4.0 上首次 MQTT 连接成功后开始适用该规则。
- TLS 证书错误（broker 证书与已存 CA 不匹配）同样视为未连上 broker，只做重试。更换 broker 地址、端口或证书后，请长按 BOOT 3 秒，在设置门户中修改设备设置。
- 更改曾连接成功的 MQTT 设置的服务器地址或端口时，不会把已保存的 MQTT 密码发往新地址；必须重新输入密码才会保存。对从未连接成功的设置，为了降低首装门槛，密码留空仍会沿用已保存的值。
- 该检查只看 MQTT 地址与端口。使用未启用 TLS 的 MQTT 时，能进入设置门户的人可以把 Wi-Fi 切到自己的网络并用同一 broker 地址应答，从而截获已保存的密码。启用 TLS 和 CA 证书后，设备会校验证书与主机名，不会连接这类假 broker。
- iPhone 注册使用固定 PIN `123456`，且只在注册窗口开启期间接受新设备。
- 通知标题、正文、App 信息会传送到 MQTT broker 和 Home Assistant，请把 broker 账号权限限制在本设备的 topic 内。
- 如果设备意外显示为离线，请在设置门户确认 Wi-Fi 与 MQTT 服务器地址没有被改动。
