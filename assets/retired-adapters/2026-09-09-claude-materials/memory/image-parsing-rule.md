---
name: image-parsing-rule
description: 全局规则：收到截图时根据模型视觉能力选择最优解析方式，不支持视觉时回退 macOS OCR
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 4174d7df-6642-4518-b01c-e821d8704c7d
---

# 图片解析全局规则

当用户发送图片截图时，按以下优先级处理：

## 1. 优先：模型视觉能力直接读取
如果当前模型支持视觉功能（Claude 系列：Sonnet、Opus、Haiku、Fable 等），直接使用 Read 工具读取图片。

## 2. 回退：macOS Vision OCR
如果 Read 工具返回 "Unsupported Image"（当前模型不支持视觉，如 deepseek），自动使用 macOS Vision 框架进行本地 OCR 识别。

OCR 命令模板：
```bash
swift -e '
import Cocoa
import Vision
let imagePath = "<图片路径>"
guard let image = NSImage(contentsOfFile: imagePath) else { print("Failed to load image"); exit(1) }
guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { print("Failed to get CGImage"); exit(1) }
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en"]
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
do {
    try handler.perform([request])
    if let results = request.results {
        for observation in results {
            if let topCandidate = observation.topCandidates(1).first {
                print(topCandidate.string)
            }
        }
    } else { print("No text found") }
} catch { print("Error: \(error)") }
'
```

## 3. 附带确认提示
OCR 识别结果必须附带以下提醒：

> ⚠️ 以上内容由本地 OCR 识别，可能不完整或存在误差，请确认。

**Why:** 用户希望图片解析能自动选择最佳方式，避免手动切换。OCR 是本地识别，不消耗 token，但精度可能不如视觉模型，因此需要提醒用户确认。

**How to apply:** 每次收到用户发送的图片时，先尝试 Read 工具。如果返回 "Unsupported Image"，立即执行上述 Swift OCR 命令，输出结果时附上确认提示。
