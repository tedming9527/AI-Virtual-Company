# 请求所有权最小迁移题

目标：证明搜索控制器能在可控乱序下，只允许最新请求修改 `rows/loading/error`，并让 `retry()` 重试当前关键词。

## 文件

- `search-controller.js`：无框架、无外部依赖的最小实现；用递增 request ID 表达状态写入所有权。
- `search-controller.test.js`：使用 Node 内置 `node:test` 和可控 deferred Promise，主动安排“新成功、旧失败、重试成功”的顺序。

## 运行

```bash
node --test search-controller.test.js
```

## 验收结果

2026-09-13 在本目录执行 `node --test search-controller.test.js`：

```text
tests 1
suites 0
pass 1
fail 0
cancelled 0
skipped 0
todo 0
exit code 0
```

验收行为：新请求先返回后得到 `keyword="新"`、`rows=["N"]`、`loading=false`、`error=null`；旧请求随后失败未覆盖任何状态；`retry()` 请求的关键词仍为“新”，最终得到 `rows=["N2"]`。两个并发搜索 Promise 和 retry Promise 均被 await，未产生未处理 rejection。

通过只证明这个最小案例成立，不证明真实网络取消、框架生命周期或生产复杂联动可靠。
