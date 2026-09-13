v1

## User Profile

The user uses Codex for Java/Spring learning, Vanke frontend/release work, and macOS tooling. They want concrete, evidence-bounded work with narrow changes and durable, cross-computer recovery. Their Java learning is enterprise-delivery oriented: use `spring-test-web` for implementation/acceptance and Mephisto only as a production-code/risk reference. They learn best from real interfaces, cache keys, SQL/Redis state, concurrency observations, and architecture framing: goal, invariants, benefit, cost, failure boundary, fallback, and observability. [ad-hoc note]

## User preferences

- For Java learning: “还是要以完成企业真实开发作为背景”; use a spiraling business-delivery route, not isolated demos or prolonged Redis-only work.
- “教学任务修改后应当自动提交，但是不要推送”: after reviewing the full diff, auto-commit teaching/progress changes locally; never push, merge, or deploy without an explicit request.
- Keep learning evidence durable: record progress, tests/scripts, code, and commits; do not treat terminal-only observations as cross-computer proof.
- For Java/Redis teaching, use real evidence and no more than 2–3 theory questions / about 15 minutes; oral correctness is not mastery. [ad-hoc note]
- Before merge/deploy or another side-effecting release action, show project, source/target branch, environment, and intended action, then wait for explicit “确认”.
- On long autonomous tasks, “不要一直等待，要时不时活跃下输出点内容”: make progress independently and report meaningful phases.
- Keep requested UI/code changes narrow: reuse established contracts, implement explicit parameter/layout scope exactly, and avoid moving unaffected elements.

## General Tips

- Recheck checkout/machine/time-sensitive state before action: branch refs, Actions runs, ports, packages, TCC, processes, and resolved dependencies.
- Distinguish a started script, merge, dispatch, static check, and final runtime/deployment result; report the actual verified level.
- For Maven dependency questions, inspect a focused resolved `dependency:tree`, not only direct `pom.xml` declarations.
- For Redis, close the current lock/Lua/concurrency proof before capacity experiments; this must not block the broader enterprise curriculum. Advanced governance tools follow observed underlying failures. [ad-hoc note]

## What's in Memory

### /Users/dongdeming/Documents/vanke/daojia/nephalem

#### 2026-08-27

- `test` branch recent requirement changes: git log --since, --no-merges, CommonOpenMini, ad0b6f6, splash-image
  - desc: Non-merge analysis of the prior 15 days in Nephalem `test`; use for change-impact questions, then rerun the commands for current state.
  - learnings: Six effective commits covered the CommonOpenMini contract and a separate homepage splash URL/background update (`#FFB151` → `#70A7FF`).

### /Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web

#### 2026-08-26

- Enterprise backend teaching and progress persistence: PROGRESS.md, enterprise-delivery, spiral-learning, XXL-JOB, RabbitMQ, auto-commit, no-push
  - desc: Real-business curriculum route, Mephisto reference boundaries, test-debt cleanup, and local-only auto-commit rule.
  - learnings: Use 商品分类变更及下游同步; Redis production-complete closure is not a prerequisite for new components.
- Maven HikariCP dependency source: ./mvnw dependency:tree, HikariCP, mybatis-plus-spring-boot4-starter, spring-boot-starter-jdbc, resolver-status.properties
  - desc: Verified transitive HikariCP chain and Maven-cache permission recovery for this checkout.
  - learnings: HikariCP `7.0.2` came through the Boot 4 starter chain; do not add a direct pin without need.

### /Users/dongdeming/Documents/ted-projects/github-issue-monitor

#### 2026-08-25

- GitHub Issue Monitor UI redesign and Docker page: build-html.mjs, monitor.mjs, issue-drawer, CSS Grid, localhost:7777, commentsList
  - desc: Issue-first one-screen layout, preview, real-data generation, and TCC/launchd recovery.
  - learnings: Run `node monitor.mjs` for the actual result; inspect `window.__ISSUES__` before claiming live comment history.

### /Users/dongdeming

#### 2026-08-25

- headroom pipx uninstall residue: headroom-ai, pipx uninstall, com.headroom.proxy, ~/.headroom, Claude hooks
  - desc: Machine-specific, unfinished removal inventory and complete cleanup/verification sequence.
  - learnings: Do not remove only the executable symlink; no uninstall is verified.

### Older Memory Topics

#### /Users/dongdeming/Documents/vanke/meiju/flexible

- Merge feat/2026_08_20_ddm to test: origin source branch, workflow_dispatch, gh run rerun, ECONNRESET
  - desc: Confirmed side-effect workflow, remote-branch preflight, Actions diagnosis, and rerun-only recovery; cwd=/Users/dongdeming/Documents/vanke/meiju/flexible.

#### /Users/dongdeming/Documents/ted-projects/ai-playground/server

- TypeScript `process` typings triage: Cannot find name 'process', @types/node, tsconfig.json, compilerOptions.types
  - desc: Gateway-blocked, unverified diagnostic; inspect actual config and run TypeScript validation before fixing; cwd=/Users/dongdeming/Documents/ted-projects/ai-playground/server.

#### /Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web

- Redis correctness and capacity teaching evidence: Cache-Aside, UUID, Lua atomic unlock, 10–20 concurrent requests, connection pool, PROGRESS.md
  - desc: Evidence-first lock/concurrency gates and deferred capacity/governance tools within the newer enterprise route; cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web. [ad-hoc note]

#### /Users/dongdeming/Documents/vanke/daojia/nephalem

- CommonOpenMini page iterations: HandleOpenMini, subPackages, decodeURIComponent, com-loading, CSS Modules, SWC Bindings not found
  - desc: Narrow Taro page addition, once-only URL decoding, and loading-only centering; cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem. The 2026-08-27 history topic records the later `test`-branch change context.
