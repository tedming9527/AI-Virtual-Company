# Test quality gate

Use only when the routed task changes behaviour or needs release evidence.

1. Define user-visible acceptance examples and risk.
2. Choose the smallest useful evidence set: unit, API/integration, end-to-end, manual exploratory, or AI evaluation.
3. Isolate state and test data; avoid implementation-detail selectors.
4. Report what ran, its result, the environment, remaining risks and the verified level.
5. Do not merge, deploy or alter external systems without explicit user approval.
