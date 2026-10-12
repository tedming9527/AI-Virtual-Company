# base 预设

中央统一下发的默认配置（`presets/base/`）。`init` / `upgrade` 时同步到个人项目
`preset/base/`（只读，附 `.preset-manifest.json` 与 sha256）。

- `config.json`：平台默认配置——更新通道、runtime TTL/日志保留窗口（对齐
  `governance/cleanup.js` 默认值）、全景图本地视图开关。
- 个人自有配置放项目 `custom/`，同名键覆盖 preset；`pack-manager config`
  输出合并结果并逐项标注来源。
- preset 文件被本地改动后，下次同步保留 `.local` 副本并提示，不静默覆盖。
