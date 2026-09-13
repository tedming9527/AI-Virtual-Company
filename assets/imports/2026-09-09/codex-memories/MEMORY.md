# Task Group: Nephalem `test` branch requirement-change history

scope: Summarize recent, non-merge requirement changes in the Nephalem `test` branch; use this to route change-impact questions, not as proof of the current checkout state.
applies_to: cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem; reuse_rule=commit list and 15-day window are time-specific; rerun the non-merge `git log` commands against the target branch before reporting current changes.

## Task 1: Summarize the prior 15 days of `test`-branch requirements (success)

### rollout_summary_files

- rollout_summaries/2026-08-27T07-45-04-yKHC-summarize_last_15_days_requirement_changes.md (cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-27T15-45-04-01a0422d-fb21-7590-bc6d-ead81058d358.jsonl, updated_at=2026-08-27T02:18:19+00:00, thread_id=01a0422d-fb21-7590-bc6d-ead81058d358, six non-merge commits analyzed)

### keywords

- git log --since, test-branch, --no-merges, CommonOpenMini, navigateToMiniProgram, decodeURIComponent, com-loading, splash-image, ad0b6f6

## Reusable knowledge

- For a recent-requirement summary, use `git log --since="15 days ago" --date=short --pretty=format:"%h %ad %an %s"`, then inspect `git log --since="15 days ago" --no-merges --date=short --pretty=format:"---%n%h %ad %s" --stat` and the full diffs. Excluding merge commits kept the analysis to six effective changes. [Task 1]
- In this 2026-08-27 window, the effective requirements were `CommonOpenMini` and the homepage splash visual update. `5d3fd2d` introduced the registered subpackage page; `9b11dfe` and `3173481` added safe once-only decoding for `miniName` and `path`; `f3cb716` finalized “确认要跳转到“${miniName}”小程序？”; and `8149db6` centered the `com-loading` text. [Task 1]
- `ad0b6f6` changed the splash URL in `src/pages/index/index.tsx` and changed its related `src/pages/index/index.less` background from `#FFB151` to `#70A7FF`. This is separate from the CommonOpenMini page contract. [Task 1]

## Failures and how to do differently

- Symptom: no shell/git tool is available -> do not infer repository history; state the verification boundary and request the complete `git log`/diff output, then analyze that supplied evidence. [Task 1]

# Task Group: spring-test-web enterprise backend teaching and progress persistence

scope: Continue the user's Java/Spring learning as a real-business delivery sequence, keep progress recoverable across machines, and keep Redis follow-up bounded rather than a blocker.
applies_to: cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web; reuse_rule=use for this learning checkout and its `docs/learning/PROGRESS.md`; inspect current progress/code before scheduling or committing.

## Task 1: Reframe the curriculum around enterprise delivery (success)

### rollout_summary_files

- rollout_summaries/2026-08-26T07-19-26-9Qwh-enterprise_backend_teaching_plan_and_auto_commit_rule.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-26T15-19-26-01a03cf0-2612-7442-b689-de1fe7c627c9.jsonl, updated_at=2026-08-26T08:24:41+00:00, thread_id=01a03cf0-2612-7442-b689-de1fe7c627c9, teaching route written and committed)

### keywords

- PROGRESS.md, enterprise-delivery, spiral-learning, 商品分类变更及下游同步, XXL-JOB, RabbitMQ, @Async, Nacos, Sentinel, Outbox, CategoryTransactionalServiceTest

## Task 2: Auto-commit teaching/progress changes without push (success)

### rollout_summary_files

- rollout_summaries/2026-08-26T07-19-26-9Qwh-enterprise_backend_teaching_plan_and_auto_commit_rule.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-26T15-19-26-01a03cf0-2612-7442-b689-de1fe7c627c9.jsonl, updated_at=2026-08-26T08:24:41+00:00, thread_id=01a03cf0-2612-7442-b689-de1fe7c627c9, local commit rule established)

### keywords

- auto-commit, no-push, git diff --check, 31e7461, .git/index.lock, docs/learning/PROGRESS.md, master, origin/master

## User preferences

- when designing Java learning, the user said “还是要以完成企业真实开发作为背景” -> organize lessons around deliverable business slices with interfaces, jobs, messages, failure recovery, and observability, not isolated component demos. [Task 1]
- when the user said “卡在redis很久了” and “xxx-job等也要” -> after the Redis core model, move through XXL-JOB, RabbitMQ, `@Async`, Nacos, Sentinel, and observability; revisit consistency, idempotency, capacity, and recovery spirally instead of demanding one component's production-complete closure first. [Task 1]
- when teaching tasks or learning progress change, the user explicitly said “教学任务修改后应当自动提交，但是不要推送” -> inspect the full diff, automatically create the local commit without asking, and do not push, merge, or deploy unless explicitly requested. [Task 2]
- the user wants cross-computer recovery -> keep progress documents, tests/scripts, code, and local commits as durable evidence; terminal-only observations are not sufficient. [Task 2]

## Reusable knowledge

- Use “商品分类变更及下游同步” as the cross-component business slice: MySQL transaction commit → Redis invalidation → event record → RabbitMQ publish → idempotent consumer → XXL-JOB compensation → Nacos config → Sentinel protection → logs/metrics. Practice and acceptance occur only in `spring-test-web`; `/Users/dongdeming/Documents/vanke/daojia/mephisto/` is a code-shape/risk reference, not completion evidence. [Task 1]
- The current route in `docs/learning/PROGRESS.md` is: at most two lessons to clean up tests/experiment configuration, then XXL-JOB, RabbitMQ, async, configuration, traffic governance, and observability. The route was committed as `e436c1a`. [Task 1]
- For reference reading, `GoodsSupplierCategoryConsumeConfig.java` is a consumer-startup/observability risk sample, `MilkExportJob.java` shows job-to-service layering but catches without reporting failure to the scheduler, and `MilkDataExportRecordServiceImpl` is not a Rabbit producer despite its name. [Task 1]
- `CategoryServiceImpl.updateName()` coordinates outside the transaction and calls `CategoryTransactionalService.updateName()`; cache deletion is in `afterCommit()`. Preserve or add automated cross-component evidence because earlier runtime logs were not durable. [Task 1]
- `PROGRESS.md` is the learning source of truth: record 已学习/已实现/已验收, evidence boundary, code links, and next step. Run `git diff --check` and review the full diff before the automatic local commit. [Task 2]

## Failures and how to do differently

- Do not repeat Redis transaction-boundary experiments that the user already accepted. Do not make a single component's “production级闭环” a gate for advancing; finish a bounded enterprise deliverable, then deepen the principles in later components. [Task 1]
- Before using `CategoryTransactionalServiceTest` as evidence, fix its cache-key contract from `"category:children" + CATEGORY_ID` to `category:children:{parentId}` and ensure test-created cache/lock state is cleaned up. Keep `TX_ROLLBACK_TEST`, `TX_POOL_TEST`, 2-second pauses, and tiny Hikari settings in test fixtures/profiles, not the default business path. [Task 1]
- Symptom: `fatal: Unable to create .../.git/index.lock: Operation not permitted` -> sandbox cannot write Git lock; retry only with the needed authorized Git write access. [Task 2]

# Task Group: spring-test-web Maven dependency analysis

scope: Confirm resolved Maven/Spring Boot dependency sources rather than inferring from direct `pom.xml` declarations.
applies_to: cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web; reuse_rule=versions and resolved tree are checkout/time-specific; rerun the focused tree command after dependency changes.

## Task 1: Verify HikariCP dependency source (success)

### rollout_summary_files

- rollout_summaries/2026-08-26T06-35-29-LxKJ-confirm_hikaricp_transitive_dependency.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-26T14-35-29-01a03cc7-ea1d-7bb0-b5ae-6c98e224f65d.jsonl, updated_at=2026-08-26T07:11:41+00:00, thread_id=01a03cc7-ea1d-7bb0-b5ae-6c98e224f65d, resolved dependency tree verified)

### keywords

- Maven, ./mvnw dependency:tree, HikariCP, mybatis-plus-spring-boot4-starter, spring-boot-starter-jdbc, resolver-status.properties, spring.datasource.hikari

## User preferences

- when the user said “hikari 在项目中貌似没引入” -> answer actual dependency-presence questions from the resolved Maven tree, not only direct `pom.xml` declarations. [Task 1]

## Reusable knowledge

- The verified chain was `com.baomidou:mybatis-plus-spring-boot4-starter:3.5.17` → `org.springframework.boot:spring-boot-starter-jdbc:4.1.0` → `com.zaxxer:HikariCP:7.0.2`; do not add or version-pin HikariCP directly without a demonstrated need because Spring Boot manages it transitively. [Task 1]
- Use `./mvnw dependency:tree -Dincludes=com.zaxxer:HikariCP,org.springframework.boot:spring-boot-starter-jdbc,org.springframework:spring-jdbc,com.baomidou:mybatis-plus-spring-boot4-starter`. Spring Boot can auto-configure Hikari when JDBC, HikariCP, and the driver exist with no competing DataSource; pool settings are under `spring.datasource.hikari.*`. [Task 1]

## Failures and how to do differently

- Symptom: `resolver-status.properties: Operation not permitted` while resolving the tree -> this is Maven-cache access failure, not evidence that HikariCP is absent; obtain authorized cache access and retry the same focused command. [Task 1]

# Task Group: GitHub Issue Monitor one-screen UI, issue drawer, and Docker-served refresh

scope: Continue the Issue-first dashboard redesign, generate its real-data page, or diagnose its local refresh/deployment path.
applies_to: cwd=/Users/dongdeming/Documents/ted-projects/github-issue-monitor; reuse_rule=use for this checkout's Node/Docker dashboard; ports, counts, and TCC behavior are machine/time-specific.

## Task 1: Restore context and deliver a previewable Issue-first layout (success)

### rollout_summary_files

- rollout_summaries/2026-08-25T14-11-41-fhXK-github_issue_monitor_ui_redesign_deployment.md (cwd=/Users/dongdeming/Documents/ted-projects/github-issue-monitor, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-25T22-11-41-01a03943-37e1-7922-9149-c04e6d6dc204.jsonl, updated_at=2026-08-25T08:40:28+00:00, thread_id=01a03943-37e1-7922-9149-c04e6d6dc204, preview and fake-data validation passed)

### keywords

- github-issue-monitor, build-html.mjs, monitor.mjs, issue-drawer, CSS Grid, preview.html, localhost:7777, jsonForScript, U+2028, U+2029

## Task 2: Generate and serve the redesigned page from real GitHub data (success; live comments remain unverified)

### rollout_summary_files

- rollout_summaries/2026-08-25T14-11-41-fhXK-github_issue_monitor_ui_redesign_deployment.md (cwd=/Users/dongdeming/Documents/ted-projects/github-issue-monitor, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-25T22-11-41-01a03943-37e1-7922-9149-c04e6d6dc204.jsonl, updated_at=2026-08-25T08:40:28+00:00, thread_id=01a03943-37e1-7922-9149-c04e6d6dc204, manual monitor generation succeeded)

### keywords

- dist/index.html, Docker, docker-compose.yml, config.json, paths.json, refresh-server, launchd, EX_CONFIG, commentsList, Finder AppleScript, TCC

## User preferences

- when continuing an open-ended task, the user said “自己安排工作”“继续” and “不要一直等待，要时不时活跃下输出点内容” -> make autonomous progress and report meaningful phases rather than silently waiting on background work. [Task 1]
- for this dashboard, the user asked “issue是主要突出项目”“点击issue，侧面弹窗展示issue内容与聊天记录”“尽量平铺内容，在一屏幕展示完” -> prioritize Issue density, side-drawer detail, and one-screen layout. [Task 1]
- when a usable intermediate is possible, the user asked “先在docker部署一版”“直接部署更新” -> make a previewable deployment promptly, then continue refinement. [Task 1]

## Reusable knowledge

- `monitor.mjs` fetches assigned open issues every 30 minutes and `build-html.mjs` generates the page. Docker nginx mounts `dist/`; after regeneration no image rebuild is needed. Page port is `7777`; refresh service binds `127.0.0.1:7788`. [Task 1][Task 2]
- The delivered layout uses CSS Grid (Issue list left, personal/team projects right, compact task/bug bar below), degrades vertically on narrow screens, and uses `textContent` for comments. Validate source with `node --check`, fake-data render, then inspect `dist/index.html`; `http://localhost:7777/preview.html` is the preview route. [Task 1]
- The validated real-data command is `cd /Users/dongdeming/Documents/ted-projects/github-issue-monitor && node monitor.mjs`; it exited 0 and generated `dist/index.html`. Treat issue/project counts as a snapshot, not durable state. [Task 2]

## Failures and how to do differently

- Symptom: `Invalid regular expression: missing /` -> direct U+2028/U+2029 in source broke the regex; keep `jsonForScript` ASCII-only or explicitly escape those characters. [Task 1]
- Symptom: background Monitor output seems absent/delayed -> split work and read task output files directly before concluding it failed. [Task 1]
- Symptom: replacing an existing Documents file gives `Operation not permitted` -> macOS TCC/macl can block shell replacement even when new-file writes work; use Finder replacement or grant the relevant app Full Disk Access, then run `node monitor.mjs` for the actual verdict. Do not treat earlier `refresh-server`/launchd `78: EX_CONFIG` as permanent failure when direct generation succeeds. [Task 2]
- Real `commentsList` coverage was not verified; before claiming comment history works, inspect real `window.__ISSUES__` for `commentsList`. [Task 2]

# Task Group: macOS headroom pipx uninstall and residue cleanup

scope: Finish a requested removal of headroom-ai from this Mac, including its managed package, proxy, data, and Claude integration residue.
applies_to: cwd=/Users/dongdeming; reuse_rule=machine-specific inventory from 2026-08-25; re-inspect paths and running jobs before any destructive cleanup.

## Task 1: Locate headroom installation and plan complete removal (partial; uninstall not executed)

### rollout_summary_files

- rollout_summaries/2026-08-25T02-11-41-RDVj-headroom_pipx_uninstall_residue.md (cwd=/Users/dongdeming, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-25T10-11-41-01a036b0-087d-7250-96f0-11c71eb506f5.jsonl, updated_at=2026-08-25T01:47:41+00:00, thread_id=01a036b0-087d-7250-96f0-11c71eb506f5, inventory only)

### keywords

- headroom, headroom-ai, pipx uninstall, ~/.local/bin/headroom, ~/.local/pipx/venvs/headroom-ai, ~/.headroom, com.headroom.proxy, LaunchAgent, Claude hooks, marketplace

## User preferences

- when asking “检查headroom的安装位置，卸载它” and then “继续卸载headroom残留”, the user expects the removal to cover program, background service, data, configuration, and integrations—not stop at diagnosis. [Task 1]

## Reusable knowledge

- On this machine, the observed executable was a pipx-managed `headroom-ai 0.30.0`: `/Users/dongdeming/.local/bin/headroom` linked into `/Users/dongdeming/.local/pipx/venvs/headroom-ai/`. The observed related data directory was `/Users/dongdeming/.headroom`; re-check these before acting. [Task 1]
- Complete removal sequence: use `pipx uninstall headroom-ai`; stop/unload `com.headroom.proxy`; remove the LaunchAgent and data directory only after targets are confirmed; remove headroom hooks/permissions/init commands/marketplace references from Claude config; then search command, process, LaunchAgent, and config references for residue. [Task 1]

## Failures and how to do differently

- The previous session could only inspect, so no uninstall is verified. Do not report deletion based on the inventory; execute the requested cleanup when tools and confirmation for destructive targets are available. [Task 1]
- Do not delete only the symlink: pipx, the proxy LaunchAgent, `~/.headroom`, and Claude configuration can remain. [Task 1]

# Task Group: Nephalem Taro CommonOpenMini page development

scope: Add or adjust the `CommonOpenMini` mini-program jump page while preserving the existing HandleOpenMini-style contract and scoped styles.
applies_to: cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem; reuse_rule=checkout-specific paths and existing project type errors; re-check worktree after resets.

## Task 1: Add the CommonOpenMini route and minimal jump behavior (partial; diff check passed)

### rollout_summary_files

- rollout_summaries/2026-08-24T01-38-18-aF2w-common_open_mini_page_iterations.md (cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-24T09-38-18-01a0316b-1e33-7c83-a34e-d5bbc732c410.jsonl, updated_at=2026-08-24T06:25:32+00:00, thread_id=01a0316b-1e33-7c83-a34e-d5bbc732c410, build blocked by existing environment issues)

### keywords

- CommonOpenMini, HandleOpenMini, src/app.config.ts, subPackages, useRouter().params, navigateToMiniProgram, index.module.less, CSS Modules, SWC Bindings not found

## Task 2: Decode miniName and path exactly once (success)

### rollout_summary_files

- rollout_summaries/2026-08-24T01-38-18-aF2w-common_open_mini_page_iterations.md (cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-24T09-38-18-01a0316b-1e33-7c83-a34e-d5bbc732c410.jsonl, updated_at=2026-08-24T06:25:32+00:00, thread_id=01a0316b-1e33-7c83-a34e-d5bbc732c410, parameter contract implemented)

### keywords

- decodeMiniName, decodePath, decodeURIComponent, CommonOpenMini miniName 解码失败:, CommonOpenMini path 解码失败:, appId, path, miniName

## Task 3: Center only the loading text (success)

### rollout_summary_files

- rollout_summaries/2026-08-24T01-38-18-aF2w-common_open_mini_page_iterations.md (cwd=/Users/dongdeming/Documents/vanke/daojia/nephalem, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-24T09-38-18-01a0316b-1e33-7c83-a34e-d5bbc732c410.jsonl, updated_at=2026-08-24T06:25:32+00:00, thread_id=01a0316b-1e33-7c83-a34e-d5bbc732c410, targeted layout change verified by diff check)

### keywords

- com-loading, com-image, flex: 1, align-items: center, justify-content: center, loading..., index.module.less, git diff --check

## User preferences

- when asking “参考HandleOpenMini新增一个页面”“其他逻辑不需要”, the user wants the existing behavior reused with only necessary additions. [Task 1]
- when specifying “miniName需要解码” and “对path也解码一次”, follow the explicit URL contract: decode each once, not twice or zero times. [Task 2]
- when requesting “仅希望文字居中，不要影响图片”, make the local layout fix in an independent loading container. [Task 3]

## Reusable knowledge

- Add `src/pages/CommonOpenMini/index.tsx`, `index.config.ts`, and `index.module.less`, then register `{ root: 'pages/CommonOpenMini', pages: ['index'] }` in `src/app.config.ts` `subPackages`. Read `appId`, `path`, `miniName`, `topicBgUrl`, and `bgColor` through `useRouter().params`; confirm calls `Taro.navigateToMiniProgram({ appId, path })`, cancel calls `Taro.navigateBack()`. [Task 1]
- Use `.module.less` imported as `styles`; the root class owns container styles and child classes live under its `:global` block. For safe parameters, catch `decodeURIComponent` errors, `console.warn`, and return the original value. [Task 1][Task 2]
- Use `<View className="com-loading">loading...</View>` with its own flex-growing container. Keep the background image on `.com-image { width: 100%; }`, rather than changing root `justify-content`. [Task 3]

## Failures and how to do differently

- `npm run build:dev` failed with `Error: Bindings not found` from `@swc/core` under Node 23 and Taro plugin loading; `tsc --noEmit` was already blocked by missing React Native/Taro/Vue types and unrelated source errors. Do not attribute either failure to CommonOpenMini unless the new page appears in diagnostics. Use `git diff --check` for the verified local check. [Task 1]
- After a user reset, prior page files may be gone. Before editing, check `pwd`, `git status --short`, `rg --files src/pages`, and the route declaration. [Task 1][Task 2]

# Task Group: flexible merge to test and GitHub Actions deployment

scope: Safely merge a flexible feature branch into `test`, dispatch the CI/CD workflow, and distinguish merge, trigger, and deployed outcomes.
applies_to: cwd=/Users/dongdeming/Documents/vanke/meiju/flexible; reuse_rule=workflow/run IDs and branch state are historical; revalidate remote refs, worktree, workflow inputs, and run status each time.

## Task 1: Stop before merge when the source branch is absent from origin (partial)

### rollout_summary_files

- rollout_summaries/2026-08-20T13-30-29-wZwf-merge_test_deploy_source_branch_not_on_origin.md (cwd=/Users/dongdeming/Documents/vanke/meiju/flexible, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-20T21-30-29-01a01f5d-b20a-78f3-9270-f1dc615991a3.jsonl, updated_at=2026-08-14T03:08:04+00:00, thread_id=01a01f5d-b20a-78f3-9270-f1dc615991a3, preflight blocked before merge)

### keywords

- vanke-merge-to-test-and-deploy, source branch is not on origin, git push -u origin, origin/feat/2026_08_20_ddm, workflow_dispatch, action_type, deploy_env

## Task 2: Merge, dispatch, and diagnose npm ECONNRESET build failure (partial)

### rollout_summary_files

- rollout_summaries/2026-08-20T13-30-29-RQXg-merge_flexible_to_test_build_network_failure.md (cwd=/Users/dongdeming/Documents/vanke/meiju/flexible, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-20T21-30-29-01a01f5d-b1ca-7b01-9fa7-5bd367cfb7d2.jsonl, updated_at=2026-08-20T08:42:06+00:00, thread_id=01a01f5d-b1ca-7b01-9fa7-5bd367cfb7d2, merge/dispatch succeeded; build failed)

### keywords

- onewotown/flexible, gh run view, gh run rerun, 32227665280, npm ERR! code ECONNRESET, npm ERR! network read ECONNRESET, Node 环境构建

## User preferences

- before side-effecting merge/deploy actions, the user explicitly replied “确认执行” / “确认” after preflight -> present project, source branch, target branch, environment, and intended action, then wait for explicit confirmation. [Task 1][Task 2]
- after the merge was already complete and the build failed, the user chose “重新运行该构建” -> retry only the workflow; do not repeat the merge. [Task 2]

## Reusable knowledge

- The test workflow is `.github/workflows/cicd.yml` on `origin/test`, with `workflow_dispatch` inputs `action_type` and `deploy_env`. The deployment script requires the source branch to exist on `origin`; verify with `git log --oneline origin/<branch> -1` before invoking it. [Task 1]
- If the remote source ref is absent, push it with `git push -u origin <branch>`, verify it is visible, then rerun the deployment script. If a command becomes backgrounded, read its output and wait for a terminal workflow conclusion. [Task 1]
- Inspect failing Actions logs with `gh run view <run-id> --repo onewotown/flexible --log-failed`; rerun an already-merged build with `gh run rerun <run-id> --repo onewotown/flexible`, then poll to final `success` or `failure`. [Task 2]

## Failures and how to do differently

- A script start or workflow dispatch is not deployment success. Keep separate statuses for remote-branch preflight, merge, trigger, and final Actions outcome. [Task 1][Task 2]
- `npm ERR! code ECONNRESET` / `npm ERR! network read ECONNRESET` supports a runner npm-download connection reset, but does not prove the code or dependency graph is uninvolved. Preserve that uncertainty and verify the rerun result. [Task 2]

# Task Group: ai-playground server TypeScript process typings triage

scope: Resume the unresolved `process` compiler report with minimal project inspection and a verified Node typings fix.
applies_to: cwd=/Users/dongdeming/Documents/ted-projects/ai-playground/server; reuse_rule=this is an unverified diagnostic lead, not proof of the checkout's current configuration.

## Task 1: Investigate `Cannot find name 'process'` after gateway-blocked attempt (uncertain)

### rollout_summary_files

- rollout_summaries/2026-08-20T13-30-29-UlSv-typescript_process_node_types_unresolved.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-playground/server, rollout_path=/Users/dongdeming/.codex/archived_sessions/rollout-2026-08-20T21-30-29-01a01f5d-b207-7743-ae06-38558f7ae8e7.jsonl, updated_at=2026-08-14T08:53:58+00:00, thread_id=01a01f5d-b207-7743-ae06-38558f7ae8e7, no inspection or fix completed)

### keywords

- Cannot find name 'process', @types/node, tsconfig.json, compilerOptions.types, package.json, TypeScript, Node.js typings, 502, 503

## User preferences

- the user repeatedly supplied the exact `Cannot find name 'process'` message -> address that priority directly with a concrete, verified project fix rather than deferring it. [Task 1]

## Reusable knowledge

- Start with `package.json` and `tsconfig.json`; install `@types/node` only if absent and set the relevant `types` configuration only if inspection shows it is needed. Finish by running this project's TypeScript validation. The common diagnosis is not project-specific evidence. [Task 1]

## Failures and how to do differently

- No diagnostic, edit, dependency installation, or validation occurred because the service returned 502/503. Do not inherit an assumed fix from this rollout; inspect the actual checkout first. [Task 1]

# Task Group: spring-test-web Redis correctness and capacity teaching evidence

scope: Preserve the evidence-based Redis/locking gates and capacity experiments within the newer enterprise-delivery teaching route.
applies_to: cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web; reuse_rule=extension-only evidence from 2026-08-19 plus a newer teaching-route update; inspect current code and `PROGRESS.md` before treating any exercise as complete.

## Task 1: Reassess Redis learning gates and next lock experiment

### rollout_summary_files

- extensions/ad_hoc/notes/20260819-redis-capacity-training-progress.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web, rollout_path=not available, updated_at=2026-08-19, thread_id=not available, extension-only evidence) [ad-hoc note]
- extensions/ad_hoc/notes/20260819-teaching-plan-reassessment.md (cwd=/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web, rollout_path=not available, updated_at=2026-08-19, thread_id=not available, extension-only evidence) [ad-hoc note]

### keywords

- PROGRESS.md, Cache-Aside, UUID, Lua, atomic unlock, category:children, parentId, SQL, Redis, 10–20 concurrent requests, connection pool, Redisson Watchdog, Resilience4j, Sentinel, Actuator, Micrometer

## User preferences

- for Java/Redis teaching, use real interfaces, cache Keys, SQL logs, Redis state, and concurrency observations; explain goal, invariants, benefit, cost, failure boundary, fallback, and observability. [Task 1] [ad-hoc note]
- keep teaching to 20% concept/prediction, 60% `spring-test-web` practice, and 20% Mephisto comparison; do not run long theory sequences (at most 2–3 questions / about 15 minutes). [Task 1] [ad-hoc note]

## Reusable knowledge

- Do not treat a verbal answer as mastery. Advance only after repeatable running evidence; grade recognition, explanation, guided implementation, and independent implementation/migration separately. [Task 1] [ad-hoc note]
- The evidence sequence is cache correctness → lock ownership/Lua atomic unlock → concurrent rebuild → consistency failure window → capacity experiments → third-party governance tools. The 2026-08-26 route supersedes using every advanced Redis item as a gate for starting XXL-JOB/RabbitMQ: close the current lock practice in a bounded way, then revisit advanced Redis issues spirally. Keep Watchdog, full circuit breaking, global rate limiting, and similar expansions parked until raw problems are observed. [Task 1] [ad-hoc note]
- Each unit follows goal/invariant → prediction → implementation → run → fault injection → acceptance → architecture review, with expected result, observation point, acceptance criterion, and recovery method. [Task 1] [ad-hoc note]
- Immediate next exercise: first close the lock practice—fix final lock-key boundary and last-wait cache recheck, implement Lua UUID compare-delete, then send 10–20 same-`parentId` concurrent requests. Require all success, consistent result, exactly one SQL query, correct cache TTL, and no remaining lock; then test wrong UUID, old lease/new lease, DB exception, and query exceeding TTL. [Task 1] [ad-hoc note]

## Failures and how to do differently

- Do not move to connection-pool experiments before the lock exercise is closed. This is a local sequencing rule, not a reason to block the broader XXL-JOB/RabbitMQ curriculum. The note identifies unverified mutex rebuild/UUID lease/Lua unlock/TTL/interruption paths and potential repeated lock-key responsibility / final-wait cache-check gaps. [Task 1] [ad-hoc note]
- Introduce Redisson Watchdog, Resilience4j/Sentinel, Actuator/Micrometer, or load tools one at a time only after observing the underlying connection-pool saturation, wait timeout, queueing, query-timeout, concurrency-limit, backoff, or circuit-breaker problem. [Task 1] [ad-hoc note]
