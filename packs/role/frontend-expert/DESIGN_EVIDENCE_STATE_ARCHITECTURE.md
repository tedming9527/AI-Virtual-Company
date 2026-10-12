# 设计证据驱动的页面架构与全状态正确性

- ID：`frontend-design-evidence-state-architecture`
- Owner：`frontend-expert`
- 内容类型：`method_template`
- 状态：`candidate`
- 证据：本模板无实测、独立评审或生产收益证据；以下示例为假设，不是历史运行记录。

## 触发

设计驱动浮层迁为独立路由；包含异步搜索、选择返回刷新、直达入口或多状态组合；多层证据容易混写。

## 稳定行动规则

1. 对关键尺寸、状态、行为分别记录设计节点/截图推断、代码、浏览器、接口与 unknown。设计协作须有可定位交接；不替代设计岗位的变量/节点核验职责。
2. 路由页拥有壳、导航、直达/返回、loading/empty/error/content；内容组件处理业务区。定向核对入口、layout、组件、请求层与样式，独立变化原因明确才新增抽象。
3. requestStamp 或等价所有权保护 data/loading/error/retry；旧响应不能覆盖新视图。Abort 处理传输，不证明服务端取消、幂等或副作用终止。
4. Debug fixture 探索视觉，纯逻辑测试锁定映射/权限/请求归属，路由/端到端守关键旅程；真实视口与真实接口单列，按风险裁剪。

## 假设示例与反例

应采用：新请求成功后构造旧请求失败，检查 rows/loading/error 不被污染、retry 使用当前参数，再分别核对浏览器与接口。

不应采用：把取消转换为空列表成功，旧请求仍可写 loading/error；用 AbortController 或按钮禁用代替请求归属。actual_executor: not_started 与 status: verified 冲突时回查原始运行，不把记录升级为交付。

## 边界与复核

不为简单文案/颜色强加全流程；截图推断、构建、测试与浏览器/接口分开。路由、容器、状态模型、接口或 fixture 变化，真实反例推翻假设时停止套用。

记录因未满足约定布局/状态/行为退回的 rework_rounds、首次状态覆盖率，新增需求另记 scope_changes；样本用于校准，不能提前承诺因果改善。目标节点、代码、回执、失败态、可访问性与设计交接缺证时保持 unknown。

相关方法：[页面架构](PAGE_ARCHITECTURE.md)、[状态验证](PAGE_STATE_VALIDATION.md)。

本方法不扩大当前用户授权；结论仅限本次实际取得的证据层。
