# Project-binding policy

Effective: 2026-09-09 · authorised by company owner

## Intent
Every **project-associated development conversation**, including a ChatGPT Work-mode conversation for a bound project, is authorised by default to be managed through the AI Virtual Company. Company takeover is mandatory: Chief of Staff identifies the work, selects one primary employee and at most one consulting employee, then records the resulting work brief. The company coordinates the work; the user retains approval for external or destructive actions.

Company initialization is governed by `INITIALIZATION_POLICY.md` and must pass before this binding is treated as active on any device.

Project binding loads routing and governance only. Company skills remain optional assets selected by the assigned employee for the specific task.

## What “bound” means
The owner’s standing authorisation covers all current and future project-associated development conversations; do not request separate company-takeover approval per project. Technical activation still requires the platform to load company instructions. A project is technically bound after its project configuration contains the company binding instruction (use `skills/project-company-binding.template.md`). Codex project instructions can make this automatic for new Codex sessions in that project. The instruction is not retroactive to an already-running session; begin a new session after binding.

## Routing contract
1. Chief of Staff creates an explicit inbox event or a short work brief.
2. One primary owner performs the task; one consult is added only when it materially improves the result.
3. When more than one employee participates, they must exchange evidence, assumptions and disagreements at defined handoff points. The primary owner reconciles the contributions into one conclusion; isolated outputs must not be pasted together as a final result. A material unresolved contradiction may be escalated to Chief of Staff with the competing claims, evidence, impact and decision options.
4. Cross-domain, high-impact or ambiguous work is escalated to Chief of Staff.
5. The final outcome records the owner(s), decision, collaboration synthesis and durable memory candidate.

## Binding and intake are separate signals
- A conversation shown inside a project and started with that project's binding instruction is **project-bound**. It is not an escaped or global conversation merely because an inbox event cannot yet be found.
- An inbox event or brief proves the routing audit trail, not the platform's project association. Its absence is an `intake_record_missing` governance gap: request or create the minimal record before treating the task as fully auditable.
- Reserve `unbound_session` (and user-facing “逃逸会话”) for a conversation whose project association or binding-instruction activation is absent or cannot be verified. Do not use that label for a bound conversation with a missing routing record.

## Platform boundary
- **Codex bound projects:** supported through project instructions, subject to the project carrying the binding file.
- **Codex global default:** a company-routing guard may be installed in the current user's `~/.codex/AGENTS.md`. It is a platform adapter, not a company source of truth. Its activation in a fresh project session must be verified before universal coverage is claimed; project-level binding remains authoritative.
- **ChatGPT Work:** its account-level Custom Instructions must require company takeover for every Work-mode conversation associated with a bound project. A Work project’s own instructions override the account-level instructions, so they must preserve this requirement. There is no approved universal session-reading/interception integration: ChatGPT must not claim a project is bound unless the Work conversation supplies the binding context or an inbox event records it.
- **Claude:** no universal, approved global session-reading/interception integration is installed. Bind a project only through an explicit project-level integration or write an inbox event.
- No platform is scraped and no unbound/global conversation is ingested.
