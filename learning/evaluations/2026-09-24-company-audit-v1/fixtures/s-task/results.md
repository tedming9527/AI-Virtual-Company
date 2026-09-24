# S 级本地执行任务结果 — token_budget 缺陷修复

- 快照根目录 SNAP: `/tmp/ted-audit-2026-09-24-wvepg37p`
- 任务目录: `SNAP/fixtures/s-task/`
- 执行时间: 2026-09-24 (Asia/Shanghai, UTC+8)

## 1. 通道判定（cost gate）

- bootstrap 实跑命令:
  `AI_VIRTUAL_COMPANY_ROOT=$SNAP zsh "$SNAP/scripts/check-company-bootstrap.sh"`
  结果: `Company bootstrap check passed`（exit 0；Active Skill sources=4，Platform/mode registry=4 rows）。
- 实际读取路径:
  - `SNAP/scripts/check-company-bootstrap.sh`（执行）
  - `SNAP/ROUTER.md`（任务判定通道，第 49–60 行 Task Router 决策序）
  - `SNAP/fixtures/s-task/token_budget.py`、`test_token_budget.py`（夹具本体）
- 按 ROUTER.md 执行层决策序逐条判定：
  1. decision/triage/gate？ — 本任务是"改代码→跑已有测试→验收通过"，非判断型 CLI 场景，不触发 `jev-use`。
  2. 需要专业角色？ — 不涉及 UI/架构/培训/产品判断；单人即可完成，不指派员工。
  3. **仅明确、低复杂度执行？** — YES：缺陷已由夹具注释与测试用例精确给定（中文 1 字=1 token、ASCII 每 4 字符=1 token 向上取整），改动范围是单行折算逻辑，属"跑已有测试/修明确缺陷"。
  4. C2C 触发？ — 否：单文件、单函数、无跨模块、无架构设计、无疑难 debug、无大范围重构、无 PLAN→EXECUTE→REVIEW 需求。
- **结论：通道 = 直接执行（执行者本人），主责=执行者，consult=none，不启动 C2C。**
- **为何不启动 C2C（成本门禁理由）**：ROUTER.md 成本门禁为硬约束——"能直接完成就不启动 C2C；C2C 增加时间与 token，仅复杂度足够时使用"。本任务缺陷已被测试用例与注释完全锁定（期望值 4 / 5 / 5 均已写明），修复是确定性的算术折算 `(len(other)+3)//4`，一次改对即可，无需 PLAN→EXECUTE→REVIEW 编排。启动 C2C 只会徒增 token 与时间，无任何边际复杂度收益。
- 任务分级：S 级本地执行（按 ROUTER.md 第 6 行，S 级用简短工作简报，不新建 inbox 持久事件）。
- 模型身份 / 可观测 token：**unknown**（隔离快照内不可观测，按要求记 unknown）。

## 2. 修复前失败输出（先保存后改动）

复现命令: `cd SNAP/fixtures/s-task && python3 -m unittest -v`（exit 1，3 errors）。
完整存档见 `pre_fix_test_output.txt`。关键内容：

```
test_mixed_cjk_ascii ... ERROR
test_pure_ascii ... ERROR
test_pure_cjk ... ERROR

ERROR: test_mixed_cjk_ascii
  File ".../token_budget.py", line 11, in estimate_tokens
    return cjk + other
TypeError: unsupported operand type(s) for +: 'int' and 'str'

ERROR: test_pure_ascii
  File ".../token_budget.py", line 11, in estimate_tokens
    return cjk + other
TypeError: unsupported operand type(s) for +: 'int' and 'str'

ERROR: test_pure_cjk
  File ".../token_budget.py", line 11, in estimate_tokens
    return cjk + other
TypeError: unsupported operand type(s) for +: 'int' and 'str'

----------------------------------------------------------------------
Ran 3 tests in 0.002s
FAILED (errors=3)
```

缺陷定位：`return cjk + other` 中 `other` 是去中文后的字符串（`re.sub` 返回 str），`int + str` 直接抛 TypeError；且即使类型修正也未按"ASCII 每 4 字符 1 token、向上取整"折算。

## 3. diff（修复前 → 修复后，unified）

完整存档见 `fix.diff`。修复前内容经重建后 sha256 与实测 pre-fix 完全一致（见下节校验），故 diff 可信：

```diff
--- a/token_budget.py (pre-fix)
+++ b/token_budget.py (post-fix)
@@ -7,5 +7,5 @@
     """
     cjk = len(re.findall(r'[\u4e00-\u9fff]', text))
     other = re.sub(r'[\u4e00-\u9fff]', '', text)
-    # 缺陷：ASCII 未按每 4 字符折算，直接每个字符计 1
-    return cjk + other
+    ascii_tokens = (len(other) + 3) // 4  # ASCII 每 4 字符计 1 token，向上取整
+    return cjk + ascii_tokens
```

修复口径说明：`(len(other)+3)//4` 即 `ceil(len(other)/4)`，满足向上取整；`other` 仅由剔除 CJK 后的剩余字符组成（夹具口径下即 ASCII），与注释"非中文每 4 字符 1 token（向上取整）"一致。未改动函数签名、docstring 与 CJK 统计行。

## 4. 前后 sha256（shasum -a 256）

| 文件 | 时点 | sha256 |
|---|---|---|
| token_budget.py | 修复前 | `8f2530cb8025168cc84c11248ebe4ef32ffa1882e4034c6435c889fd120f30c2` |
| token_budget.py | 修复后（=最终） | `c1b0bab4b40b6b45767e1f731f7af888fe73443db72db7b9826cbf7b7daaba3e` |
| test_token_budget.py | 修复前 & 修复后（未改动） | `f3a4b5f81e06985e47e586cf7761b513057b70d53fec4615cec57c03206d3729` |

校验链：
- 重建的修复前文件 `/tmp/tb_pre.py` 实测 sha256 = `8f2530cb…f30c2`，与上表 pre-fix 一致 → diff 所对比的"修复前"就是真实起始态。
- 最终 `token_budget.py` 实测 = `c1b0bab4…ba3e`，与 post-fix 记录一致。
- `test_token_budget.py` 前后 hash 均为 `f3a4b5f8…3729`，证明测试文件未被改动（仅修复实现）。

## 5. 修复后通过输出

复跑命令: `python3 -m unittest -v`（exit 0，3 ok）。完整存档见 `post_fix_test_output.txt`：

```
test_mixed_cjk_ascii (test_token_budget.TestEstimateTokens.test_mixed_cjk_ascii) ... ok
test_pure_ascii (test_token_budget.TestEstimateTokens.test_pure_ascii) ... ok
test_pure_cjk (test_token_budget.TestEstimateTokens.test_pure_cjk) ... ok

----------------------------------------------------------------------
Ran 3 tests in 0.001s

OK
```

测试通过数：**3 / 3**（`OK`，0 失败 0 错误）。

## 6. 自检（不以自填卡代替验收）

- [x] bootstrap 先跑并通过，再进入执行；治理文件为只读快照，未修改/删除。
- [x] 先复现失败并落盘 `pre_fix_test_output.txt`（FAILED errors=3），**然后**才改代码。
- [x] 唯一被修改的真实文件是 `SNAP/fixtures/s-task/token_budget.py`；测试文件 hash 未变。
- [x] 修复前后 sha256 均由 `shasum -a 256` 实测记录，非手填；重建 pre-fix 与实测 pre-fix 哈希一致，diff 来源可信。
- [x] 重跑测试真实通过（`OK`，3 tests），输出落盘 `post_fix_test_output.txt`。
- [x] 最终文件 hash = post-fix 记录，与 diff 落点一致；核对为实跑结果而非自填卡。
- 未验项 / 边界：
  - 未访问真实公司根目录 `…/AI-Virtual-Company`（按硬约束禁止）；无网络/外部服务/凭据访问。
  - 治理/员工/知识文件全程只读，未写入。
  - 模型身份、计费 token 不可观测 → 记 **unknown**。
  - 本任务为 S 级直接执行，consult=none；未派发 C2C，故无 Review Cycle 计数（不适用）。
