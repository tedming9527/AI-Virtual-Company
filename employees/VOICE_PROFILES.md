# Ted 公司员工语音档案

核验日期：2026-09-22

配置入口：[VOICE_PROFILES.json](VOICE_PROFILES.json)

## 能力边界

- ChatGPT Voice 支持在 Chat、Work 和 Codex 中进行语音对话。官方流程说明首次开始语音聊天时可以选择一个声音，但目前没有公开的“按员工身份自动绑定或切换声音”配置机制。
- OpenAI Speech API 支持在每次请求中指定 `voice`，并由 `gpt-4o-mini-tts` 的 `instructions` 控制语气、情感、语调和语速，因此员工级语音映射采用 API 配置实现。
- 本次只建立机器可读语音档案，没有调用 API、生成音频或修改 ChatGPT 客户端。真正播放时，调用层应按当前员工的 `role_id` 读取对应的 `voice`、`speed` 和 `instructions`。
- 内置声音目前主要针对英语优化。中文受支持，但每位员工正式启用前仍需要用同一段中文文本做试听验收。
- 所有播放界面都应明确披露声音由 AI 生成、并非真人录音。本配置不使用真人声音克隆，也不要求上传声音样本或同意录音。

## 调用契约

调用层从档案中读取：

```text
model           <- defaults.model
voice           <- profiles[role_id].voice
instructions    <- defaults.safety_instruction + profiles[role_id].instructions
speed           <- profiles[role_id].speed
response_format <- defaults.response_format
input           <- 本次要朗读的文本
```

当前状态为 `configured_not_activated`。只有实际 API 请求成功并完成中文试听后，才能把单个员工标记为已启用；配置文件存在本身不等于 ChatGPT 已自动切换声音。

## 选择原则

- 一人一套基础声音，八名员工不重复，便于听觉辨识。
- 性格描述只依据岗位使命和工作方式做语音交互设计，不描述或推断任何真人的人格与天然声线。
- `cedar` 与 `marin` 分配给需要高频统筹和资讯播报的岗位；其余岗位通过不同基础声音和可控语气形成区分。
- 语速只做轻微调整，避免以夸张口音、戏剧化表演或身份模仿来制造差异。

## 官方依据

- [ChatGPT Voice](https://learn.chatgpt.com/docs/features/voice)
- [OpenAI Text to speech](https://developers.openai.com/api/docs/guides/text-to-speech)

运行覆盖性检查：

```bash
node scripts/check-employee-voice-profiles.mjs
```
