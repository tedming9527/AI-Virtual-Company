# flexible income history

Updated: 2026-09-09 · Expires: 2026-09-23 · Owner: Frontend Expert

Goal:
- Implement Issue #51's mock-only worker income-history flow after the Figma node is readable; UI must be high fidelity to Figma.

Current verified state:
- Repository: `onewotown/flexible`; branch at last check: `feat/2026_09_10_ddm` (recheck before continuing).
- The original Figma node `1:2976` was inaccessible. The replacement file `FP2WYFAwsUcF41LRBUq3jf`, node `0:1`, was successfully read through local Figma MCP on 2026-09-09: it contains the mobile My -> History Income -> Detail flow and returned both design context and a PNG screenshot. Work remains paused until the user explicitly resumes it.

Decisions / constraints:
- Keep backend API work as TODO with isolated mock adapters.
- Use the established take-page shell and CSS Modules for new styles.
- Required routes: My Income -> history income -> monthly performance detail -> existing work-order detail when a task identifier is present.
- The user requested a future branch from main named `feat/2026_09_17_ddm`; do not create it until the user asks to resume/branch.

Completed:
- Product scope review and Luna acceptance review completed.
- Uncommitted draft implementation exists for routes, My Income entry, history-income mock page, and performance-detail mock page.

Next safe step:
- Restore Figma access, read both design context and screenshot, then compare/revise the uncommitted implementation before any further validation.

Verification / remaining risk:
- `git diff --check` passed before pause. TypeScript validation was blocked by an existing dependency/type-version incompatibility and must be rechecked after continuation.
- Draft history card fields need PRD completeness review before accepting the UI.
