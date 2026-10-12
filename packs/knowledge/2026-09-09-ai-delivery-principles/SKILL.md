# Shared knowledge — AI delivery principles

> 通用方法模板（candidate）：部署采用前核验适用性；不作为某组织的现行授权或历史验收证明。

1. Design AI work as a controllable workflow: propose, let the user inspect/edit, then verify or act.
2. Preserve provenance and uncertainty in UI; never present generated output as an unqualified fact.
3. Keep AI integrations behind explicit UI/API contracts; observe model and tool activity.
4. Maintain concise product and design context alongside code so human and AI contributors use the same constraints.
5. Adopt platform performance features incrementally, with measurement and rollback paths.
6. Every AI feature brief names a quality metric and a human-control metric; evaluation cases evolve from real failure modes.
7. Capture AI telemetry metadata by default, not sensitive prompt, completion or tool content.
