# Dream Tales V2 — engineering checkpoint 01 (2026-11-16)

## Source of truth
- Approved high-fidelity final vision: https://www.figma.com/design/5FHQFx1mZwTLyOjc4slh4d?node-id=50-14
- Parent–Child interactive prototype: https://www.figma.com/design/5FHQFx1mZwTLyOjc4slh4d?node-id=75-3
- Engineering handoff: https://www.figma.com/design/5FHQFx1mZwTLyOjc4slh4d?node-id=139-2
- Approved DreamTales gold/lavender wordmark and sleeping fox assets are in the separately prepared assets pack. Do not use CP03's faulty hero as design authority.

## What is committed
- Restored the original project's manifest under the Dream Tales brand, updated the nonfunctional lint script and added a Node built-in test runner.
- Fixed the Firebase client app initialisation (missing getApp import).
- Extracted bounded, testable server-side input parsing for story prompts. This does **not** mean the API is authenticated yet.
- Added a four-case unit test suite.
- Added safe .gitignore and placeholder environment variable names; secrets must never be committed.

## Critical open blockers (do not deploy to public production)
1. Current middleware trusts a mutable user JSON cookie, not a verified Firebase session. Replace with server-verified authentication and server-side parent/child authorisation.
2. `/api/upload_audio` trusts userId in the body and calls `makePublic()` without verification. Disable endpoint until fixed; audit already-published files for sensitive child audio.
3. Add auth, rate limits and budgets to every AI/TTS route. This commit only adds validation utilities, **not authentication**.
4. Validate Firebase Firestore/Storage rules against horizontal privilege escalation.
5. The original GitHub repository has no lockfile. Generate and commit it in a clean, reproducible environment; do not use .env.local from the original ZIP.
6. The premium UI has NOT been merged. Previous CP01–CP03 were local artefacts, CP03 rejected. Rebuild from approved Figma, test on real devices, then review and publish.
7. iOS commercial release needs native wrapper evaluation, Apple IAP for digital subscriptions where applicable, age-appropriate consent/privacy and complete QA.

## Run the current baseline
```bash
npm install
npm test
npm run dev
```
`npm install` requires network access. No successful production build is claimed.
