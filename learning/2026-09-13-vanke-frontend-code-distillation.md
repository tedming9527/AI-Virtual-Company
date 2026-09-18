# `/vanke` 前端项目代码蒸馏（选择性学习版）

日期：2026-09-13  
负责人：周启明 · 体验工程官（Frontend Engineer）  
实际执行者：Codex 子任务代理  
模型：inherited（具体模型不可精确获知）  
推理强度：inherited/unknown  
范围：只读检查 `$VANKE_WORKSPACE_ROOT`；未拉远端、未安装依赖、未修改仓库、未运行依赖型构建或测试。
结论状态：交叉复核后修订；静态代码蒸馏通过，运行时质量未验收。

## 1. 结论先行

这批代码不能被当成权威教材。它们最有价值的是**真实业务复杂度样本**，不是整体工程质量标杆。本报告按“高于样本的目标标准”审查；“我们更高”不是已经实证的团队排名，而是必须落实为补强验收门槛。

选择性研读入口：

1. **工程边界与测试设计：`daojia/azeroth/karazhan`。** 它是本轮检出的最完整样本：多端边界、显式接口契约、权限模型、可注入请求层和行为测试代码能形成一条阅读路径。这个结论不代表其真实业务建模、线上成熟度或总体生产质量第一。
2. **真实维修业务与请求所有权：`meiju/flexible`。** 请求中间件、列表抽象、收入字段映射和竞态防护值得拆解；框架老、类型逃逸和大服务类明显，只能学局部。
3. **Vue 3 H5 的路由/角色组织：`meiju/amumu`。** 路由模块化、Pinia 角色状态、多容器适配和局部分层有参考价值；按当前命名模式未检出测试，请求/登录副作用耦合严重。
4. **复杂后台反向评审：`meiju/katarina`。** 动态菜单/权限、表格筛选、跨后端适配值得研究；大规模源码下按当前命名模式未检出测试，通用请求层已演化成大量 URL 特判。
5. **存量小程序分包/迁移：`meiju/pretty-home`。** 只适合作为分包与旧流程隔离案例，不适合作为现代 React/Taro 架构范本；请求层存在明确错误传播缺陷。

## 2. 选择方法与四档优先级

分档不是按依赖新旧或文件数量决定，而是综合四个问题：

- 架构代表性：边界、职责分层、契约可见性、端形态代表性。
- 工程成熟度：真实测试、类型/格式/检查闭环、CI 是否实际执行；“装了依赖”不计通过。
- 业务复杂度：状态、角色、跨系统、支付/履约/结算等真实复杂度。
- 可迁移性：模式能否脱离当前框架/业务安全复用，是否有清楚适用边界。

静态盘点发现 27 个 Git 仓库，其中 23 个存在根 `package.json`，4 个是本轮非前端仓库或服务端仓库（`daojia/mephisto`、`daojia/yanxuan-blacksam`、`meiju/camille`、`meiju/sisyphus`）。计数排除了 `node_modules*`、`dist`、`build`、`.next` 和 `.git`。

| 档位 | 进入条件 | 仓库 | 本轮用途 |
|---|---|---|---|
| 优先深读 | 已有具体学习问题，且本轮读到可追溯的实现与反例 | `daojia/azeroth`、`meiju/flexible`、`meiju/amumu` | 分别学习工程边界/测试、真实维修链路/请求所有权、Vue H5 路由/角色组织 |
| 定向参考 | 只在指定问题命中时读取，不做总体背书 | `meiju/katarina`、`meiju/pretty-home`、`daojia/baal`、`meiju/Exia`、`meiju/archangel`、`wuye/kayoumini` | 复杂后台、多协议、存量分包或同栈交叉验证 |
| 反例样本 | 当前更适合用来识别旧栈、低测试密度或边界侵蚀 | `daojia/andariel`、`daojia/summoner`、`galaxy`、`feige/flexiblemanage`、`meiju/hasaki`、`midas-h5`、`youlin/nova`、`meiju/barrett`、`newone` | 做迁移风险与反模式检查，不复制架构 |
| 暂不投入 | 规模/证据/代表性不足，或与高档样本高度重复 | `galaxy-mobile`、`onewo-ai-wechat`、`daojia/azmodan`、`daojia/nephalem`、`onewo-treasury-wechat` | 有新问题或新证据时再进入 |

数量口径统一为：源码扩展名取 `.js/.jsx/.ts/.tsx/.mjs/.cjs`，测试名取同集合中的 `*.test.*`/`*.spec.*`，并应用上述目录排除。按此口径，`azeroth` 是 232 个源码文件、77 个测试命名匹配；其中至少 18 个文件名带 contract/migration/style/deployment/build/route 等静态契约特征，29 个是 `*.test.tsx`。命名匹配不能等同于用户行为覆盖，更不代表测试已运行通过。`katarina` 的 4,505 个 JS/TS/Vue 文件及 0 个同模式测试文件，只表示当前快照按该规则未检出。

## 3. 深读一：`daojia/azeroth`

### 代码事实

- 根 `package.json` 用 npm workspaces 管理 `dalaran`、`orgrimmar`、`karazhan`；三端分别是 C 端 H5、员工 H5、PC 管理后台。`README.md` 明确 `/interfaces/**`、`/merchant/**`、`/admin/**` 的调用边界。
- 三个子项目的 `package.json` 都声明了 `format:check -> lint -> typecheck -> vitest --run -> build` 的 `check` 链路；`karazhan/src/services/request.test.ts` 的测试代码覆盖动态读取 token、匿名请求、结构化错误和 malformed JSON。本轮没有运行这些测试。
- `karazhan/src/services/request.ts` 把 fetcher、token getter 和错误构造器作为依赖注入；调用级 `auth/json` 选项与统一 `ApiEnvelope<T>` 分开，错误保留 `status/code/traceId`。
- `karazhan/src/navigation/permissions.ts` 先定义业务权限，再从 role 映射权限；`config/routes.ts` 只引用 `access` 名称。角色身份、权限判定和路由声明没有揉成一个巨型守卫。
- `karazhan/src/runtime/pageRuntime.ts` 汇总页面所需 API，`src/wrappers/pageAreas.tsx` 做身份/API 可用性边界，具体页面如 `src/pages/orders/index.tsx` 只负责装配。
- `karazhan/src/components/orders/OrderListPage.tsx` 将筛选写入 URL、翻页保留筛选、详情链接携带返回上下文；effect cleanup 用 `active` 阻止旧请求完成后继续写状态。对应 `OrderListPage.test.tsx` 的测试代码检查角色专属筛选、URL 保留、错误重试、失败时保留旧数据。
- 当前唯一检出的根 `.github/workflows/cicd.yml` 在前端步骤执行 `npm ci` 和 `npm run build:<module>`；三个前端 Dockerfile 也只执行安装与 build，未检出 `check/test/lint/typecheck` 调用。这只是入库配置事实，不证明分支保护、历史流水线或其他外部门禁如何运行。
- 根 `README.md` 自述当前阶段重文档/规格，`dalaran/README.md` 明确部分页面使用本地示例数据。当前口径下 docs/specs 文件约 375 个、其中 specs 约 260 个，三个前端 `src` 文件约 246 个；`karazhan` 33 个带 component 的路由中 9 个仍指向 placeholder。这支持“规格投入较重且部分路由未实现”，不用于判断文档投入是否有价值。

### 优点

- 请求层是可替换、可测试的边界，不依赖全局 axios 单例。
- 身份、权限、路由和页面装配分层，减少了直接依赖并提供测试替身接缝；是否提升多人协作效率未测量。
- 测试代码覆盖错误分支、角色差异、查询状态和响应格式，而不只是快照；本轮未执行。
- 业务词汇能落到 API 前缀、类型与路由上，订单和工单也保持独立。

### 缺点 / 技术债

- 当前已检出的入库 CI/Docker 配置没有调用前端 `check`；不能据此推断 CI 历史或外部保护规则。
- 规格投入较重且部分路由仍是 placeholder；交付价值和线上完成度未验证。
- `OrderListPage.tsx` 同时承载 URL 序列化、查询状态、列定义、请求状态和页面渲染，后续扩展仍会变重。
- `active` 标志避免陈旧响应写状态，但不取消网络消耗，也没有显式请求 ID；适用于单 effect，复杂联动仍需更强的请求所有权模型。

### 可学习项

- 以可注入 transport + 结构化错误建立请求边界。
- 权限矩阵、路由声明、页面装配分离。
- 用用户行为测试覆盖 URL 状态、错误恢复、角色差异和竞态。

### 不应学习项

- 不把“Spec 很多”当成功能成熟，也不把每个小改动都扩成重量级规格流程。
- 我们的入库门禁必须显式运行 format、lint、typecheck、相关测试和 build；不能只因样本声明了脚本就视为已执行。
- 不复制项目版本号；React 19/TS 6 只是当前技术选择，不是工程质量本身。

## 4. 深读二：`meiju/flexible`

### 代码事实

- `package.json` 是 React 16 + Umi 3 + TypeScript 3.8 的旧栈，同时保留 antd-mobile v2/v5；脚本依赖 `--openssl-legacy-provider`，说明构建链已有兼容负担。
- `routes/routes.ts` 将 take/inspect/board/appoint/convention 等业务路由拆成模块；`src/utils/request/request.ts` 把 host、token、abort、错误适配拆成 Umi 中间件。
- `src/utils/request/middleware/host.ts` 根据 mock、proxy、完整 URL 和业务 host 选择目标；`addToken.ts` 同时处理住这儿 token、白名单页面、登录与多 token 类型，业务容器复杂性真实但耦合偏重。
- `src/modules/take/task.service.ts` 对任务列表使用 `AbortController`，新请求会 abort 旧请求；`src/utils/request/middleware/abort.ts` 把取消转成静默错误。这个方向正确，但取消被转换成空列表结果，可能让上层误把“取消”当“成功返回空数据”。
- `src/modules/list/list.presenter.ts` 抽象分页、累计列表、参数和 count，但 `loadMore().finally()` 无论列表成功或失败都会再发 count 请求；类型中存在大量 `any/@ts-ignore`，抽象边界并未保持强类型。
- `src/pages/take/income/incomeRequest.ts` 对当前工人请求做 in-flight Promise 去重，并在成功/失败后释放；`incomeHistory/api.ts` 验证 worker mobile，明确 `baseCommission + adjustAmount`，并保留 `null` 而不是无证据补零。
- `src/pages/take/incomeHistory/index.tsx` 有 loading/error/empty/retry 状态和 effect cleanup；但本轮未发现收入历史对应测试。该字段映射来自当前分支业务修正，不能泛化为其他账务口径。

### 优点

- 真实处理多宿主、多 token、白名单、取消请求、无限列表和复杂任务状态。
- 请求中间件至少让 host/token/error/abort 各有落点，比散落页面更可治理。
- 收入转换保留 unknown/null，核对维修工身份，并让最新 effect 拥有 UI 写权限。

### 缺点 / 技术债

- 老版本框架、双版本 UI 库、legacy OpenSSL 参数增加版本兼容与升级维护负担；本轮未做漏洞或依赖来源审计。
- `task.service.ts` 是超大业务服务，数据结构、环境选择、列表、抢单、完工、转单等职责聚合。
- `addToken.ts` 将路由白名单、登录跳转和 header 注入混在请求中间件中。
- 按当前命名模式只检出少量工具测试，且未运行其他可能存在的自定义测试入口；收入、任务状态和权限等高风险路径缺少相称的已检出测试代码。

### 可学习项

- 多环境/多凭据请求拆成可组合中间件。
- 明确“当前请求拥有状态”的 cleanup/abort 设计。
- 财务展示保留空值、验证身份、在边界层写清字段公式。

### 不应学习项

- 不把取消请求降格为“空数据成功”。
- 不复制超大 Service、`any/@ts-ignore` 或组件库双版本共存。
- 不跨业务复制收入公式；必须重新核对后端契约和产品定义。

## 5. 深读三：`meiju/amumu`

### 代码事实

- `package.json` 是 Vue 3/Vite 4/Pinia/Vue Router/Vant；有 lint、stylelint、vue-tsc、Husky/lint-staged 配置，但没有 test 脚本，按当前命名模式未检出测试文件，也未运行其他可能存在的自定义测试入口。
- `src/router/index.ts` 用 `import.meta.glob` 合并业务路由模块，守卫负责 query token、用户初始化、角色要求、keep-alive 时间戳和微信小程序回退。
- `src/store/user/index.ts` 将用户、活动角色、岗位和实名状态放在 Pinia store，并限制全局 store 只承载跨模块状态（`src/store/README.md`）。
- `src/utils/request.ts` 同时注入三种 token header、组织/角色/业务线，并处理登录重定向和 toast。网络错误的 401 分支直接 `return`，会令调用者收到 resolved `undefined` 而不是 rejection。
- `src/components/OrgTreeSelector/{model,service,presenter}.ts(x)` 将状态、组织树转换和交互分开；但 `service.getOrgTree()` 没有 `try/finally`，失败时 loading 可能卡住。
- `OrgTreeSelector/index.vue` 在模板中一轮渲染多次调用 `getFilteredTreeNodes()`；presenter 内又反复 `find` 父节点并递归检查子树，树大时会重复计算。
- `vite.config.ts` 每次构建生成随机 5 位资源 hash，这能粗暴规避缓存，却破坏可复现构建和稳定内容哈希。

### 优点

- 路由按业务模块组织，跨模块状态和模块内状态有明确边界意识。
- 组织树组件把数据、服务、交互拆开，形成可分别审查的代码边界；维护效率未测量。
- 对微信/住这儿/浏览器等容器差异有真实兼容经验。

### 缺点 / 技术债

- 按当前命名模式未检出测试文件，且未运行其他可能存在的自定义测试入口；存在质量工具不等于质量门禁。
- 路由守卫与请求拦截器承担过多登录和页面跳转副作用。
- 错误分支可能吞 rejection，loading 缺 `finally`。
- 随机构建 hash 与树筛选重复计算不应成为默认设计。

### 可学习项

- 业务路由模块化、跨模块 store 准入原则。
- 将复杂组件拆成 model/service/presenter 的思路，但应简化并配测试。
- 多容器行为先显式建模再适配。

### 不应学习项

- 不让请求层直接决定复杂页面跳转；认证事件应交给上层会话控制器。
- 不吞 401/网络错误，不用随机数代替内容哈希。
- 不把每个组件机械拆成四个文件；只在状态/规则确实复杂时使用。

## 6. 深读四：`meiju/katarina`

### 代码事实

- `package.json` 是 Vue 3.1/Vite 2/Ant Design Vue 2/Vuex 4，约 4,505 个 JS/TS/Vue 文件；有 lint/tsc/build/Husky/commitlint，但按当前命名模式未检出测试文件，也未运行其他可能存在的自定义测试入口。
- `src/router/index.ts` 动态装载模块路由，登录后从 store 获取角色和菜单，用 `checkLink()` 对静态路由做动态授权；刷新恢复、动态参数路由和 keep-alive tab 都有处理。
- `src/store/index.ts` 将 user/route/quotation/message 等模块组合，并只持久化部分模块，方向上避免全量持久化。
- `src/utils/request.ts` 维护全局 loading 计数、动态角色/组织 header、GET 参数过滤、blob、Themis/Zeus/AI/埋点等多种响应协议。但这是通过 URL 字符串特判实现的，通用 transport 已被业务系统污染。
- 同一请求函数每次执行 `instance.defaults.timeout = options.timeout`；当调用方未传 timeout 时会覆盖实例原本 60 秒默认值。请求拦截器错误回调也没有 `return Promise.reject(err)`。
- catch 分支无论本次是否 `loading=true` 都调用 `endLoading()`；一个普通请求失败可能减少另一个 loading 请求的计数，提前关闭全局 loading。
- `src/views/laborCostMgt/laborCostRuleMgt/List/{model,service,presenter}.ts(x)` 将筛选状态、API 编排、UI 事件分开；`service.getTableList()` 用 `try/finally` 关闭 loading，分页变化和筛选重置清楚。
- 同一 Service 的 `getOrg()` 通过对全量数组反复 `filter` 递归建树，最坏会接近 O(n²)；test/prod 根组织编码硬编码在业务代码。

### 优点

- 展示了复杂后台在动态菜单、数据权限、筛选表格、多个后端协议上的真实问题。
- 部分业务模块的 model/service/presenter 分责清晰，loading 使用 `try/finally`。
- 路由能结合后端菜单权限，并处理刷新恢复与参数化路径。

### 缺点 / 技术债

- 大规模源码下按当前命名模式未检出测试文件；这不等于仓库绝对没有其他测试方式，但当前可见自动化证据不足。
- 请求层已成为 URL 特判中心，并存在 timeout、interceptor rejection、loading 计数缺陷。
- 前端路由权限只能改善体验，不能替代后端授权；当前代码未提供后端授权证明。
- 递归建树、环境组织编码、console 日志等问题显示局部治理不足。

### 可学习项

- 复杂后台应显式建模菜单、按钮、数据范围三层权限。
- 筛选表格模块可拆分为 model/service/presenter，并用 `try/finally` 保证状态收口。
- 多协议后端需要适配层，但应按后端/协议拆 client，而不是 URL 特判。

### 不应学习项

- 不复制单例 axios + 巨型响应分支。
- 不持久化未经审计的完整业务模块状态。
- 不把前端隐藏按钮或路由校验称为安全授权。

## 7. 深读五：`meiju/pretty-home`

### 代码事实

- `package.json` 同时出现 Taro 1.3、Nerv、React 18、React 16 类型和 TypeScript 3.9，属于长期演进后的混合旧栈；没有 test 脚本，按当前命名模式未检出测试文件，也未运行其他可能存在的自定义测试入口。
- `src/app.js` 有大量主包页面和 `subpackages`，并显式保留 `old-pages`，说明它解决的是多年业务迁移与微信包体约束，不是干净的新架构。
- `src/tool/request.js` 统一登录 header、客户端观测字段、慢请求分级日志、业务错误和 401 收集。这些问题值得学，但实现有明确缺陷：Promise 链末尾 `.catch()` 调用了不在作用域内的 `reject`，会把原始错误变成 `ReferenceError`。
- 同一请求层在多个业务 code 下仍 `resolve(res.data)`，调用方必须再次判断；错误语义不统一。
- `src/store/index.js` 在所有构建路径都加入 `redux-logger`；因此生产构建路径也会包含 logger，存在状态暴露和开销风险。本轮未打包运行，不能声称已实际泄漏。
- `src/components/Subscribe/{model,service,presenter}.tsx` 把预约表单状态、payload 组装、容器生命周期拆开，但 presenter 同时处理登录、定位、城市/小区全局缓存和 UI，文件职责仍过重。
- `config/index.js` 使用小程序分包、CSS Modules、按环境合并配置；这是存量小程序工程的实用经验。

### 优点

- 分包、旧页面隔离、微信权限、登录、定位和多业务流程是有价值的真实案例。
- 请求观测字段和慢请求分级意识值得保留。
- 复杂表单尝试分离 model/service/presenter。

### 缺点 / 技术债

- 栈版本不一致、无测试、全环境 redux logger、请求错误传播错误。
- 巨型 app 页面清单和 presenter 反映业务不断叠加，模块边界已经变弱。
- `old-pages` 与新页长期共存但缺迁移台账，难判断哪些代码仍有效。

### 可学习项

- 小程序按业务能力分包，旧流程明确隔离。
- 统一加入 client/path/user 等可观测上下文，但必须脱敏并有环境控制。
- 将表单 payload 构造从视图抽离。

### 不应学习项

- 不复制 Taro 1/Nerv/React 18 的版本混搭。
- 不在生产默认开启 Redux logger。
- 不吞错误、不统一 resolve 失败业务码、不依赖页面自行猜测成功。

## 8. 三类代码必须分开看

### 业务复杂带来的代码

- `flexible` 的多 token、多宿主、维修任务/协同/收入口径。
- `amumu` 的多容器登录、角色/组织/岗位切换。
- `katarina` 的菜单、按钮、数据范围权限和多后端协议。
- `pretty-home` 的微信主包/分包、旧订单/新订单迁移。

这些代码“复杂”不代表“优秀”，但能提供真实约束和失败模式。

### 可迁移的优秀工程经验

- `azeroth` 可注入请求 client、结构化错误、角色权限矩阵与行为测试。
- `flexible` 请求归属/取消意识、空值保护、身份核验和字段映射集中。
- `katarina` 业务模块内的 `try/finally` loading 收口和筛选/分页职责拆分。
- 小程序项目按能力分包、把旧流程隔离而不是与新流程混写。

### 历史包袱 / 反模式

- 质量依赖存在但当前已检出的入库配置未调用；大型仓库按当前命名模式未检出测试文件。
- URL 特判的巨型请求层、吞错、成功/失败统一 resolve、全局 loading 计数串扰。
- 机械 Model–Presenter–Service、超大 presenter/service、`any/@ts-ignore` 扩散。
- 随机构建 hash、生产 Redux logger、环境/组织编码硬编码。
- Taro/Nerv/React/类型版本混搭和长期保留无台账的 old-pages。

## 9. 面向我们目标基线的补强验收门槛

“高于样本”只有同时给出原样本事实、我们的补强、失败反例和最小迁移验收才成立。四条规则仍是候选；只有第 3 条已在本轮完成最小迁移题，且这不代表生产可靠性。

| 候选规则 | 原样本事实 | 我们必须补强 | 失败反例 | 升级为岗位知识前的最小验收 |
|---|---|---|---|---|
| 请求边界可替换、错误结构化 | `azeroth` 注入 fetcher/token/error，并保留 status/code/traceId | 再支持 AbortSignal、请求 ID、schema 校验、敏感信息边界和 traceId 贯穿 | malformed JSON、401、业务失败被吞成 `undefined`，或按 URL 字符串特判协议 | 无真实网络测试成功、HTTP 错、业务错、非法结构、取消；每种错误可区分且无未处理 rejection |
| 权限分层 | `azeroth` 分开 role/permission/route；`katarina` 有菜单与数据范围概念 | 菜单、路由、操作、数据范围四层显式建模，后端逐接口授权 | 隐藏按钮但可直接调用接口；动态路由允许越权 URL | 至少两角色跑正反例：UI 不展示、前端拒绝导航、后端对越权请求返回拒绝；前端结果不能代替后端证据 |
| 异步状态按请求所有权验证 | `azeroth/flexible` 有 cleanup/abort 意识 | 用递增请求 ID 或等价所有权令牌统一保护 rows/loading/error，retry 锁定当前关键词 | 新请求先成功、旧请求后失败，旧失败覆盖新数据或错误状态 | 用可控 deferred Promise 构造乱序：新成功后旧失败不得覆盖，retry 必须重试新关键词，所有 Promise 正常收口；见 `learning/exercises/vanke-request-ownership/` |
| 按变化原因拆复杂组件 | 多库出现 model/service/presenter 与 payload 抽离 | 只在独立变化原因存在时拆分；transport、业务规则、payload、视图可单测 | 机械四文件模板、Presenter 继续包含登录/定位/路由/渲染所有副作用 | 给一个复杂表单做无框架规则测试和视图适配测试；变更 API 映射时不需改视图，变更展示时不需改 transport |

建议明确拒绝：复制旧版本号、照搬框架、把依赖清单当成熟度、前端权限代替后端授权、跨系统复制财务公式、为“文档先行”制造超过实现价值的流程重量。

## 10. 最小学习路径

1. 先读 `daojia/azeroth/karazhan/src/services/request.ts` 和 `request.test.ts`，再运行本报告配套的 `learning/exercises/vanke-request-ownership/`，理解结构化错误与乱序响应是两个独立问题。
2. 再读 `karazhan/src/navigation/permissions.ts`、`config/routes.ts`、`src/wrappers/pageAreas.tsx`，画出身份 → 权限 → 路由 → 页面 API 的映射。
3. 用 `meiju/flexible/src/modules/take/task.service.ts` 与 `src/modules/list/list.presenter.ts` 做反向评审：哪些取消/分页状态会被误判。
4. 用 `amumu/src/components/OrgTreeSelector/` 或 `katarina/.../laborCostRuleMgt/List/` 做一次“保留优点、去掉机械分层”的重构设计稿，不直接改原仓库。
5. 最后读 `pretty-home/src/tool/request.js`，写出失败语义表，练习识别 Promise 吞错与业务 code 混乱。

## 11. 未验证项

- 未运行任何项目测试、类型检查、lint 或 build；依赖和本机运行环境均未改变。
- 未拉取远端，结论只对应当前本地分支/提交快照。
- 未验证 CI 历史结果、线上错误率、包体、性能、可访问性或真实用户体验。
- 未逐一深读 23 个前端仓库；非优先仓库分档基于统一静态指标与定向抽样，只用于学习投入决策，不适合逐库质量认证。
- “高于样本”是目标验收标准，不是已经实证的团队排名；公司目录没有一个可与 23 个仓库运行对标的当前前端产品。
- 财务、结算、权限和跨系统字段语义仅记录代码事实，不宣称业务正确。

## 12. 停止条件与知识边界

停止条件已满足：完成全量仓库静态盘点、形成四档学习优先级、深读 5 个代表仓库、每库给出优缺点/学与不学、提炼少量迁移规则，并对“请求所有权”完成最小迁移题；继续扩展只会重复同类技术栈，且原项目运行验证需要安装依赖或更改外部状态，超出本轮授权。

本文件是学习产物，不直接更新 `employees/frontend-expert/KNOWLEDGE.md` 或 `MEMORY.md`。第 3 条只完成最小案例验收，尚未证明框架生命周期、真实网络取消或生产复杂联动可靠；其余 3 条仍未完成各自的最小迁移验收。需由 root 复核，并按上表门槛验证后，才可进入岗位知识。
