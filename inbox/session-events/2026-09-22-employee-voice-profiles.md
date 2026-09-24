# 员工语音档案配置

- id: `2026-09-22-employee-voice-profiles`
- created_at: `2026-09-22T16:38:09+08:00`
- source: `codex`
- request: 核实 ChatGPT 是否具备语音包能力，为每位在册员工配置符合岗位性格的语音档案，并在用户后续授权后生成八段中文语音自我介绍。
- project: Ted AI智能科技有限公司公司资产；员工语音配置。
- scope: OpenAI 官方能力边界、八名在册员工的 API 语音与中文表达指令、机器可读配置、覆盖性校验，以及八段中文语音自我介绍的文案、生成与音频验收。
- out_of_scope: 修改 ChatGPT 客户端未公开的内部配置、创建或克隆真人声音、公开发布、超出八段短音频所需的 API 消费。
- sensitivity: internal
- authority: 用户先授权配置与八段语音自我介绍；在澄清 ChatGPT 套餐与 API 独立计费后，用户明确选择“不想额外使用 API，可以改用 Mac 自带语音”。当前授权仅覆盖本机 `say` 生成八段短音频，不授权创建 API key、调用 OpenAI Speech API 或产生 API 费用。
- requested_outcome: implementation, audio generation and verification
- level: M；新增跨全员共享的机器可读语音契约，并需区分 ChatGPT 客户端能力与 OpenAI API 能力。
- reason: 配置可逆且不接触生产数据，但会成为后续语音调用层的共享接口。
- classifier: 陈知行 · 路由官（Chief of Staff）
- owner_confirmed: 辛澈 · AI工程师
- owner: 辛澈 · AI工程师
- executor: 当前 Codex 主任务 `/root`；只读顾问任务 `/root/voice_scope_review`；能力交接任务 `/root/voice_capability_handoff`。主任务模型与推理强度 `unknown`（平台未暴露可核验运行标识）。
- consult: 陈知行 · 路由官（Chief of Staff）
- consult_status: contributed
- consult_question: 复核客户端/API 能力边界、配置范围、全员覆盖和不夸大“已生效”的交付表述。
- consult_evidence: 原生协作回执 `/root/voice_scope_review`；复核了客户端/API 边界、八岗映射、状态拆分、验收风险，并同意 M 级 central manifest + validator 方案。
- consult_disposition: 已采纳客户端不自动按员工切换、配置/生成/试听/启用分态、全员覆盖校验，以及 `marin` 用于 AI 资讯播报等建议；基础声音个性仅标为岗位推断。
- status: cancelled

## 任务登记

- 负责人：辛澈 · AI工程师
- 任务与成功标准：建立八名员工完整且可验证的语音映射；配置只使用官方当前支持的声音与模型；明确 ChatGPT 桌面端不能据现有官方文档自动按员工切换声音。
- 能力层级：balanced
- 模型 / 推理强度：当前主会话 `unknown / unknown`
- 速度或质量取向：先核实官方能力，再做最小可执行配置并校验全员覆盖。
- 最低模型限制：用户未指定；不得以未知模型冒充满足特定下限。
- 上下文与所有权：主责独占新增配置与校验脚本写入；顾问只读复核，不修改文件。
- 证据与停止条件：官方 OpenAI 文档、员工花名册与岗位档案、校验脚本通过；如需要 API 密钥、真人声音样本或客户端内部写入则停止并报告。
- 复核人：陈知行 · 路由官（Chief of Staff）

## 验收条件

1. 八名在册员工各有唯一配置，姓名、岗位 ID、声音、中文语气指令和选择理由齐全。
2. 模型与声音均在 OpenAI 官方文档当前支持范围内；中文可用但注明内置声音主要针对英语优化。
3. 配置包含 AI 生成语音披露要求，不包含真人克隆或身份模仿指令。
4. 自动校验花名册覆盖、重复项、枚举值和必填字段。
5. 实现、验证和实际音频生成状态分开记录；未调用 API 不得称音频已生成或 ChatGPT 已自动切换。

## 运行状态

- implementation: verified；新增一份中央语音档案、一份能力边界与调用说明、一项覆盖性校验脚本。
- verification: verified；`node --check scripts/check-employee-voice-profiles.mjs` 与 `node scripts/check-employee-voice-profiles.mjs` 均退出 0；结果为 roster 8、profile 8、unique voice 8、errors 0、warnings 0。
- final_review: verified；`/root/voice_scope_review` 最终只读验收为 PASS，复核了四个目标文件、官方文档、校验结果与三项 SHA-256，未发现阻断问题。
- verified_at: `2026-09-22T16:41:00+08:00`
- activation: not_started；未调用 OpenAI API、未生成或试听音频、未修改 ChatGPT 客户端设置。
- artifacts: `employees/VOICE_PROFILES.json`、`employees/VOICE_PROFILES.md`、`scripts/check-employee-voice-profiles.mjs`。
- evidence: OpenAI 官方 ChatGPT Voice 与 Text-to-Speech 文档（2026-09-22 核验）；配置 SHA-256 `e3af7636ac2e0313673c7d72bfd7cf1a1fc2682c43faa5e5c3e859ff49e4bd0b`；说明 SHA-256 `1ea9561876730c4eaa56e2f803bd2795211e956db598825183b97ffdb4cef772`；校验脚本 SHA-256 `917dba37c6ee9a5d4de73370fecd480d85de7e4e019e61792b856567c0896a43`。
- remaining: 中文声音质量与岗位辨识度仍需在用户授权 API 调用和费用后逐一试听；ChatGPT 客户端暂无官方员工级自动绑定入口。
- next_action: 用户如需实际试听，再单独授权 API 调用与费用，并安全提供平台凭据；当前配置无需凭据即可供调用层接入。
- knowledge: none；本次正式配置留在员工资产与原事件，不另建知识条目。
- metrics: wall time、人工介入时间与费用均 unknown；API 用量为 0（未调用）。
- capability_handoff_status: no_evidence；原生协作回执 `/root/voice_capability_handoff`：用户仅提出目标，研究、配置、实现和验证均由 AI/员工完成，没有可归因于用户本人的专业能力证据。

## 语音自我介绍激活 · 2026-09-22

- 负责人：辛澈 · AI工程师
- 任务与成功标准：按已核验的八岗语音配置生成八段可播放的中文 MP3 自我介绍；每段包含 AI 语音披露，角色、声音和文案一一对应，文件可读且非空。
- 能力层级：balanced
- 模型 / 推理强度：当前主会话 `unknown / unknown`；语音模型固定为官方文档支持的 `gpt-4o-mini-tts`。
- 速度或质量取向：中文可懂性与岗位辨识度优先；API 请求逐条执行，避免失败时混淆产物归属。
- 最低模型限制：用户未指定主会话模型下限；语音生成不得静默替换为系统 `say` 或其他供应商声音。
- 上下文与所有权：主责独占 `output/2026-09-22-employee-voice-introductions/` 与生成脚本写入；consult: none。
- 证据与停止条件：OpenAI Docs 请求契约、每段 HTTP 成功、MP3 类型/大小/时长和八岗覆盖；凭据不可用时停在 blocked，不伪造语音已生成。
- 复核人：辛澈 · AI工程师（无独立顾问；当前为既有配置的直接激活）。
- activation_status: blocked
- blocker: 当前进程未提供 `OPENAI_API_KEY`，且当前工具集中没有语音生成工具；已发现但尚未安装或连接的官方 OpenAI Developers 能力，可用于安全创建和保存 API key。
- next_action: 用户安装并连接已建议的 OpenAI Developers 能力，或在本机安全环境中设置 `OPENAI_API_KEY` 后回复“继续生成”。

## Mac 本地语音替代执行 · 2026-09-22

- started_at: `2026-09-22T16:54:05+08:00`
- 负责人：辛澈 · AI工程师
- 任务与成功标准：仅用 macOS 内置 `say`，按八岗性格选择本机可用音色并生成八段可播放的中文音频；不得创建 API key、调用 OpenAI API 或产生 API 用量。
- 能力层级：balanced
- 模型 / 推理强度：当前主会话 `unknown / unknown`；本地语音合成不使用模型 API。
- 速度或质量取向：零额外 API 成本优先，在本机可用中文音色范围内尽量区分岗位性格。
- 最低模型限制：用户未指定；不得将 macOS 系统音色描述为 OpenAI 官方 voice 配置已激活。
- 上下文与所有权：主责独占 `output/2026-09-22-employee-voice-introductions/`、本地生成脚本与本事件写入；顾问只读核验最终音频文件和清单，不修改文件。
- 证据与停止条件：本机音色清单、八岗唯一映射、八个非空可解析音频文件、时长与文件哈希；若 `say` 或音频转换能力不可用则停止并报告。
- 复核人：顾清妍 · 质量测试工程师
- consult: 顾清妍 · 质量测试工程师
- consult_status: contributed
- consult_question: 独立核验八段本地音频是否齐全、非空、可解析，角色映射和披露是否一致，并报告任何阻断问题。
- consult_evidence: 原生协作回执 `/root/voice_scope_review` 提供了本机 `zh_CN` 音色枚举、八岗唯一映射建议和格式验收风险；用户取消后，最终音频 QA 未继续。
- consult_disposition: 结构性映射与格式风险曾用于本地试生成；用户随后明确不要该方案，因此不再推进或作为目标完成证据。
- status: cancelled；用户明确表示“那算了，不要这种”，本地朗读层及后续验收立即停止。

## 用户目标澄清 · 2026-09-22T16:59:28+08:00

- clarified_goal: 用户的真实目标是：在 ChatGPT 原生语音对话中点名某位员工后，ChatGPT 设置中的实际声线自动切换为该员工的声音；预生成独立音频不是目标本身。
- owner: 辛澈 · AI工程师
- consult: none；本项为官方产品能力边界核对，沿用本轮已打开的当前官方文档证据。
- capability_conclusion: 当前 ChatGPT 原生语音不支持按对话中点名的员工身份自动切换所选声线。员工名称、项目指令或角色提示可以影响回答内容、语气和节奏，但不能修改客户端 Voice 设置中的实际声音。
- evidence: OpenAI 官方 `ChatGPT Voice` 文档（2026-09-22 打开核验）说明声音通过 `Settings → Voice` 手动选择；对话中改变所选声音会启动新的 voice call。官方文档未提供按角色名、项目指令或记忆自动绑定/切换声音的入口。
- local_audio_disposition: 已根据用户上一条授权生成八段 macOS 本地 M4A，但这些文件仅是独立本地音频，不能控制 ChatGPT 客户端声音，因此不计为 clarified_goal 完成。
- api_boundary: 用户明确不希望额外使用 API；在此约束下，无法通过自建 TTS/Realtime 调用实现 ChatGPT 内部的员工级动态声线路由。
- status: blocked；目标受当前 ChatGPT 原生能力边界限制，不是继续修改本地配置即可实现的问题。
- next_action: 若用户接受原生范围，只能手动在 ChatGPT Voice 设置中换声；若接受 ChatGPT 外部本地方案，可另行设计“ChatGPT 文本输出 → Mac `say` 按员工路由并播放”的本地壳层，但它不会改变 ChatGPT 自身的声音。

## 取消记录 · 2026-09-22T17:06:19+08:00

- user_decision: 用户明确取消 Mac 本地朗读层方案。
- action: 已停止后续开发、映射调优和最终音频 QA，并中止只读顾问任务 `/root/voice_scope_review`。
- retained_files: 先前生成的本地试听音频、映射和脚本保持原位，未自动运行，也不会改变 ChatGPT；因用户未明确授权删除，本轮未进行破坏性清理。
- api_usage: 0；未创建 API key，未调用 OpenAI Speech API。
- outcome: cancelled；不将本地音频描述为用户目标的实现。
- next_action: none；除非用户日后明确要求恢复或删除相关本地产物。

### 顾问复核任务登记

- 负责人：顾清妍 · 质量测试工程师
- 任务与成功标准：只读审查最终八段音频及清单，确认八岗覆盖、格式可解析、文件非空、角色对应和本地系统语音披露正确；输出 PASS 或逐项问题。
- 能力层级：balanced
- 模型 / 推理强度：实际继承模型与强度 `unknown / unknown`（平台未暴露可核验运行标识）。
- 速度或质量取向：质量证据优先，避免仅以文件存在代替可播放验收。
- 最低模型限制：用户未指定；不得虚构已试听主观音质。
- 上下文与所有权：只读 `output/2026-09-22-employee-voice-introductions/`、最终映射与本事件；不得修改文件，且不得回退他人改动。
- 证据与停止条件：读取最终产物后给出可定位结论；产物尚未生成时等待主责通知，不抢先验收。
- 复核人：辛澈 · AI工程师

## 顾问子任务登记

- 负责人：陈知行 · 路由官（Chief of Staff）
- 任务与成功标准：只读复核能力边界、八岗语音映射、全员覆盖和不夸大“已生效”的交付表述。
- 能力层级：balanced
- 模型 / 推理强度：`gpt-5.6-sol / medium`
- 速度或质量取向：边界与质量优先。
- 最低模型限制：用户未指定。
- 上下文与所有权：只读花名册、公司岗位说明、员工档案和本事件；配置与脚本由主责独占写入。
- 证据与停止条件：原生协作回执 `/root/voice_scope_review`；完成结论、八岗建议和风险清单即停止。
- 复核人：辛澈 · AI工程师

## 能力证据交接任务登记

- 负责人：沈砚舟 · 后端培训导师（资深后端架构师）
- 任务与成功标准：只读判断本次会话是否包含可归因于用户本人的专业能力证据，并返回 `no_evidence`、`incorporated` 或 `discarded` 之一及简短依据。
- 能力层级：fast
- 模型 / 推理强度：`gpt-5.6-luna / low`
- 速度或质量取向：机械核对与最小回执，优先速度。
- 最低模型限制：用户未指定。
- 上下文与所有权：只读本事件；不得修改能力档案或其他文件。
- 证据与停止条件：区分用户的目标授权与 AI/员工完成的研究、配置和验证；形成结论即停止。
- 复核人：辛澈 · AI工程师
