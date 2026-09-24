# Shared knowledge — AI delivery principles

Promoted 2026-09-09 · owner: Chief of Staff · confidence: high

> ⚠️ 历史资料（2026-09-09，stale）：不作为当前执行依据；现行交付规则以 DELIVERY_POLICY.md 为准。正文保留作审计轨迹。（2026-09-24 审计修复加注）

1. Design AI work as a controllable workflow: propose, let the user inspect/edit, then verify or act.
2. Preserve provenance and uncertainty in UI; never present generated output as an unqualified fact.
3. Keep AI integrations behind explicit UI/API contracts; observe model and tool activity.
4. Maintain concise product and design context alongside code so human and AI contributors use the same constraints.
5. Adopt platform performance features incrementally, with measurement and rollback paths.
6. Every AI feature brief names a quality metric and a human-control metric; evaluation cases evolve from real failure modes.
7. Capture AI telemetry metadata by default, not sensitive prompt, completion or tool content.
