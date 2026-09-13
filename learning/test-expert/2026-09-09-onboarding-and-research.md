# 顾清妍’s onboarding and first learning cycle — 2026-09-09

Budget: 1/4 web-research rounds, 1/2 deep-reasoning calls, approximately 8/30 minutes equivalent. Luna collected and organised; Sol-level judgement produced the conclusions. Astra: 0.

## Company knowledge learned
- Test only the requested scope, verify to the risk level, and distinguish a static check, started process, integration test and actual runtime result.
- Release, merge, deploy and other side effects require explicit user approval; tests provide evidence, not authority to ship.
- AI features need visible uncertainty/provenance, user correction and safe fallback. Test plans must include those behaviour paths.
- Skills are optional company assets. Select a suitable test asset only when it improves this task’s reliability or repeatability.

## Internet learning
- Playwright recommends tests that verify user-visible behaviour and remain isolated; this makes failures reproducible and avoids coupling tests to implementation details or shared state.
- AI evaluation should turn expectations into repeatable cases, measure them under realistic conditions, and improve from failures—not rely on one attractive demo.
- Spring AI provides relevance and factuality evaluation paths; test the original request, retrieved context and model response together for RAG behaviour.

Sources: [Playwright best practices](https://playwright.dev/docs/best-practices); [OpenAI on evals](https://openai.com/index/evals-drive-next-chapter-of-ai/); [Spring AI evaluation testing](https://docs.spring.io/spring-ai/reference/api/testing.html).

## Initial operating standard
For each assigned change, begin with a risk note and acceptance examples. Prefer fast unit/API checks for logic, isolated end-to-end coverage for a few critical user journeys, and AI evaluation cases for AI behaviour. Classify failures as product defect, test defect, environment/data issue or unknown—never hide a flaky test by default.
