# Second learning cycle — 2026-09-09

Purpose: deepen the first cycle without repeating it. Method: bounded web research followed by one specialist synthesis; no Astra escalation.

## Product Manager — production AI evaluation
- A production AI feature needs evaluation as a product loop: curate representative tasks, define pass/fail criteria, record user correction or escalation, and revise the evaluation set when real failures appear.
- Product decision: each AI-feature brief must name one quality metric and one human-control metric before build work begins.

Source: [Google Cloud: GenAI evaluation](https://cloud.google.com/blog/topics/developers-practitioners/master-generative-ai-evaluation-from-single-prompts-to-complex-agents?hl=en).

## Frontend Expert — observable performance, not cargo-cult optimisation
- React 19.2 provides Performance Tracks in Chrome DevTools plus Activity and partial pre-rendering capabilities. Use them only after a trace identifies the user-visible bottleneck.
- Engineering decision: profile a representative interaction before choosing memoisation, Activity, streaming or pre-rendering; maintain an LCP/interaction baseline and rollback criterion.

Source: [React 19.2](https://react.dev/blog/2025/10/01/react-19-2).

## Backend Expert — useful observability without leaking user data
- Spring AI exposes metrics/tracing for ChatClient, models, advisors, tools and vector stores. Prompt/completion and tool content are intentionally not exported by default because they can contain sensitive data.
- Backend decision: enable operational metrics first; make content capture an explicitly approved, narrowly scoped diagnostic option. Add factual/relevancy evaluation to RAG paths.

Sources: [Spring AI observability](https://docs.spring.io/spring-ai/reference/observability/index.html); [Spring AI evaluation testing](https://docs.spring.io/spring-ai/reference/api/testing.html).

## Design Master — design the correction loop
- AI-generated outputs should support variation, selection and refinement rather than pretending there is one perfect answer. Research-backed guidance also supports offering useful links/provenance where users need to validate results.
- Design decision: every generative workflow needs a visible “edit / regenerate / verify” path and a clear way to abandon or escalate.

Source: [Google Cloud: UX for GenAI applications](https://cloud.google.com/blog/products/ai-machine-learning/how-to-build-a-genai-application).

## Budget ledger — cumulative week
| Employee | Web rounds | Deep synthesis | This cycle | Cumulative | Remaining |
|---|---:|---:|---:|---:|---:|
| Product Manager | 2/4 | 2/2 | ~8 min | ~16 min | ~14 min |
| Frontend Expert | 2/4 | 2/2 | ~8 min | ~16 min | ~14 min |
| Backend Expert | 2/4 | 2/2 | ~8 min | ~16 min | ~14 min |
| Design Master | 2/4 | 2/2 | ~8 min | ~16 min | ~14 min |

This ledger is a company governance estimate. It is deliberately separate from Codex account-meter usage, which varies by task, model, context, reasoning and tools.
