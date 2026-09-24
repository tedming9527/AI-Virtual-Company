# 平台 × 模式登记

状态：公司事实源 · 2026-09-24 · Owner：陈知行 · 路由官
用途：路由与初始化按 `(平台, 模式)` 查本表，决定接管范围、事件持久化、能力交接通道与监督可用性。
原则：只登记已核实的能力；未验证一律 `unknown`，不猜测、不补推为已验证。新增平台/模式在此加行，不改规则正文。平台副本不替代本表。

取值说明：
- binding_scope：`mandatory`（绑定项目强制接管）/ `active`（当前会话已加载绑定）/ `optional` / `none` / `unknown`
- 能力列：`yes` / `no` / `partial` / `unknown` / `unverified`
- execution_channels：该模式下可用的执行通道（`direct` 直接执行 / `c2c` 编排协作 / `jev-use` 判断门）
- node_status：该模式下执行节点（C2C 规划/执行角色、jev-use 判断后端）可用性——`healthy` / `missing` / `unknown`。**只写经确认的状态**：滞后式确认（连续失败 ≥ 3 次或滚动 30 分钟窗口内集中 ≥ 3 次）才翻 `missing`；单次/瞬时失败不写；本地存在性检查一次判定；任何成功即回 `healthy`。
- last_checked：最近一次确认状态的时间戳（`YYYY-MM-DD`）；未确认保持 `unknown`，不补推。

| platform | mode | binding_scope | persist_events | read_global_history | write_company_files | native_notify | hook_verifiable | execution_channels | node_status | last_checked | 依据/备注 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chatgpt | work | mandatory | unknown | no | unknown | unknown | unknown | unknown | unknown | unknown | 依据 ROUTER 集成边界：ChatGPT Work 对绑定项目默认强制接管；全局历史无已批准读取接口；执行节点未验证 |
| chatgpt | chat | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 公司规则未建模，保持 unknown |
| doubao | work | active | yes | unknown | yes | unknown | unverified | direct + c2c + jev-use | healthy | 2026-09-24 | 本会话为 Doubao work 模式实测：绑定项目会话加载公司指令、可写公司文件、可持久化事件；jev-use CLI 已安装可用；platform_hook_verified 未验证 |
| doubao | chat | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | unknown | 公司规则未建模，保持 unknown |

## 使用规则
- 初始化/路由先查本表对应 `(platform, mode)`；缺失或值为 `unknown` 的能力，不得当作已验证使用。
- 同一平台不同模式的保证不同：`platform_hook_verified`、事件持久化、能力交接通道均按模式判定。
- 节点可用性（`node_status` / `last_checked`）由"失败计数 + 退避 + 确认阈值"写入，非单次失败写入；TTL 到期强制重探；本地存在性检查豁免退避与阈值。
- 未来平台/模式：在本表加行并登记能力；未登记一律 `unknown`。
