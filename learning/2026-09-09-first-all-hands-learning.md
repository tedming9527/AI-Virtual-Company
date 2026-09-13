# First learning cycle — 2026-09-09

Budget policy: each specialist has **30 minutes equivalent/week**, maximum **4 web-research rounds** and **2 deep-reasoning calls**. This cycle used one shared low-cost research pass per domain and one concise synthesis; no Astra escalation.

## Product Manager
- AI product work should make uncertainty inspectable: show sources/grounding, let users choose or edit outputs, and make next actions clear.
- Treat the AI feature as a measured workflow, not a magic answer: define task success, correction rate, abandonment and escalation-to-human before launch.
- Adopt a `user goal → AI proposal → user control → verification` product brief for AI features.

Sources: [People + AI Guidebook](https://pair.withgoogle.com/guidebook-v2/); [Google Cloud’s GenAI UX research](https://cloud.google.com/blog/products/ai-machine-learning/how-to-build-a-genai-application).

## Frontend Expert
- React Compiler 1.0 is stable; it offers automatic memoization, but existing products should adopt incrementally and validate compatibility rather than remove every manual memo by rote.
- Create React App is deprecated for new apps; choose a maintained framework or build tool (such as Vite) deliberately.
- Frontend standard: begin with React’s rules/linting, measure the real interaction, then trial compiler adoption behind a safe rollout.

Sources: [React Compiler 1.0](https://react.dev/blog/2025/10/07/react-compiler-1); [React blog](https://react.dev/blog).

## Backend Expert
- Spring AI provides portable model APIs plus tool calling, ChatClient, advisors, vector-store and MCP integration; keep provider-specific concerns behind application boundaries.
- For AI endpoints, make retrieval/tool access observable and testable; do not let model text become an implicit data contract.
- Backend standard: define request/response schemas, audit tool calls, bound retries/timeouts, and add evaluation cases before production.

Source: [Spring AI reference](https://docs.spring.io/spring-ai/reference/api/).

## Design Master
- AI interfaces need user control, legible inputs and reliable ways to verify outputs; explanations should support a correct mental model, not imitate hidden reasoning.
- A curated plain-text product/design context is now a useful design-system deliverable for AI-assisted work.
- Design standard: add source/provenance, edit-or-regenerate paths and clear uncertainty states to AI flows; maintain `DESIGN.md`/context as a first-class artifact.

Sources: [NN/g: Explainable AI in chat](https://www.nngroup.com/articles/explainable-ai/); [NN/g: UX-context design](https://www.nngroup.com/articles/ux-context-design/).

## Budget ledger (approximate)
| Employee | Web rounds | Deep synthesis | Equivalent used | Remaining |
|---|---:|---:|---:|---:|
| Product Manager | 1/4 | 1/2 | ~8 min | ~22 min |
| Frontend Expert | 1/4 | 1/2 | ~8 min | ~22 min |
| Backend Expert | 1/4 | 1/2 | ~8 min | ~22 min |
| Design Master | 1/4 | 1/2 | ~8 min | ~22 min |

Equivalent time is a governance estimate, not a billing-meter reading. Luna performed collection/organisation; Sol-level judgement was used for synthesis; Astra use: 0.
