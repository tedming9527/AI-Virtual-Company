# Ted 公司员工语音自我介绍

状态：用户已选择无需 API 的 macOS 本地语音方案；本目录同时保留原 OpenAI API 方案，二者互不冒充。

## 目标产物

当前交付包含 8 个 M4A，每位在册员工一段中文自我介绍。本地生成器从 `local-voice-plan.json` 读取本机实际安装的普通话声音与语速，并在每段开头加入“本语音由 macOS 系统语音合成，并非真人录音”的披露。

## 生成

无需 API 密钥，在公司根目录运行：

```bash
node scripts/generate-local-employee-voice-introductions.mjs
```

只检查本机音色、角色映射和输出计划：

```bash
node scripts/generate-local-employee-voice-introductions.mjs --dry-run
```

生成成功后，脚本会写入 8 个 AAC 编码的 M4A 和 `local-audio-manifest.json`；清单包含声音、语速、时长、格式、字节数和 SHA-256。若要重新生成已有文件，显式增加 `--force`。

原 OpenAI API 方案仍由 `scripts/generate-employee-voice-introductions.mjs` 描述，但本次未创建密钥、未调用该接口，也未产生 API 用量。

## 边界

- macOS 系统声音是零 API 成本的独立替代方案，不代表 `employees/VOICE_PROFILES.json` 中的 OpenAI 声音已激活。
- 不克隆或模仿真人声音。
- 自动检查只能证明文件齐全、格式可解析且非零时长；自然度、中文可懂性、中英混排读音和岗位辨识度仍需人工试听。
