id: 2026-09-16-project-picker-page
created_at: 2026-09-16T10:21:00+08:00
source: codex
request: Convert the community picker from a modal to an independent page according to Figma node 488:157, and refresh project information after a selection.
scope: /Users/dongdeming/Documents/vanke/daojia/summoner
sensitivity: internal
requested_outcome: implementation
level: M
owner: 周启明 · 体验工程官（Frontend Engineer）
actual_executor: not_started
consult: 苏映雪 · 信任设计官（Design Master）
status: verified
acceptance: Match the supplied Figma node, navigate as a standalone page, and refresh the selected project state after return.
outcome: Added an independent /puli-heat/project-picker route. The picker fetches its own project list; selecting a project replaces navigation back to /puli-heat with the new projectCode and projectName, causing the main page to reload project, user, brand, and entry data for that selection. Search-bar spacing was then aligned to Figma node 488:160: 52px outer height, 8px vertical padding, 20px horizontal padding, and no duplicate page-content inset.
evidence:
  - Existing search-spacing change committed as 99fc0f56 before starting this task.
  - Local Figma MCP supplied design context and screenshot for node 488:157 at 2026-09-16T10:25:00+08:00.
  - Targeted picker and non-participating-page Jest checks passed; node route test passed.
  - Figma node 488:160 context and screenshot were read; targeted picker Jest check passed after spacing adjustment.
  - git diff --check passed.
remaining: Full TypeScript check remains blocked by pre-existing compiler incompatibilities in node_modules declarations.
next_action: Await user review or the next authorized task.
