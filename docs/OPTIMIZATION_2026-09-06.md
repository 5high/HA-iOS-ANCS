# HA-iOS-ANCS 0.6.10 — 优化记录

2026-09-06 / Home Assistant 集成补丁

## 变更内容

- 初始化、首条通知存储、平台注册失败及取消时清理运行时订阅
- 不改动通知事件、去重逻辑、MQTT topic 与实体标识符

## 兼容性与范围

保留域名、既有配置、实体/设备标识符和公开服务名称。不包含依赖批量升级与服务器端会话过期绕过。未改动 SmartThings 桥接 App 与 ANCS 固件。

## 验证范围

核对原始完整文件哈希后，在变更前后运行现有仓库测试。仅在通过 HACS/Hassfest 与仓库 CI 验证后发布 Release。此前候选批次的 103 个离线测试与实际仓库测试结果相互独立。未验证生产 HA 的真实登录、Cookie 生命周期、回放、实机控制与长时间运行；测试通过不代表对所有环境无影响或有性能提升。

## 更新与回滚

在备份 HA 后，从 HACS 下载 0.6.10 并重启 Home Assistant。如出现问题，可在 HACS 重新下载中选择旧版 0.6.9，或恢复备份。本次 GitHub 发布操作不会直接安装或重启用户的 HA。

基准提交：`0dd19a15d83bd6fb146ec2715afc0372262b3f13`

发布验证运行：https://github.com/1bobby-git/HA-iOS-ANCS/actions/runs/33998792042

## 实际 CI 结果

原有代码：{'tests': 308, 'failures': 0, 'errors': 0, 'skipped': 0}

补丁代码：{'tests': 308, 'failures': 0, 'errors': 0, 'skipped': 0}

通过 HACS 与 Hassfest 验证后发布。
