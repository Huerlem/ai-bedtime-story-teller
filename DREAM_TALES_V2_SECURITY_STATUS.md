# Security status — Dream Tales V2

## Changes implemented
- Story, title, suggestion, illustration-placeholder and TTS routes now verify a Firebase ID token server-side and check an associated Firestore parent profile.
- Their React hooks send the signed token.
- Story-generation and TTS routes no longer log the user's prompts, narration content or upstream provider payloads.
- AI story generation returns `reviewRequired: true`; this is **metadata only** and does not yet enforce approval before a child can read it.
- Legacy `/api/upload_audio` remains disabled; the direct Firebase Storage path still requires an ownership/rules audit.
- Story input validation and basic wiring unit tests are running on GitHub Actions.

## Critical tasks before public testing
- **Firestore rules:** a role stored in a client-writable document cannot be trusted. Confirm immutable `role` and `familyId` fields for user self-updates and validate all family ownership paths.
- **Real parent approval:** enforce draft→reviewed→approved in trusted Firestore rules and all child queries; video must also require parental consent.
- **Authentication UX:** old middleware still interprets an unsigned `user` cookie for routing; this must not be regarded as a security boundary. Adopt secure session cookies or use client-only routing and server-validated APIs.
- **Metering:** implement server-enforced quotas and durable per-account budgets before turning on AI and TTS endpoints publicly.
- **Build:** original repo lacks lockfile, test production build and dependency audit after generating lockfile.
- **Image generation:** current endpoint produces a placeholder SVG, not real AI illustrations. Prevent injection and replace with a consented, safe image service.
- **Apps:** next build and Capacitor/iOS pipeline not yet validated.

## Brand and UI
The previously approved premium Figma remains the single visual source of truth. CP03's broken landing page is rejected and has not been merged. Do not merge its CSS or page markup.
