# Dream Tales V2 — Phase 2 checkpoint (17 Nov 2026)

Scope (approved 17 Nov from checkpoint `6fef9a7`):
- lockfile + `npm ci`;
- production Nunito visual validation;
- Parent–Child E2E against Firebase Emulators, including bypass attempts;
- fixing all confirmed failures;
- continuing the V2 screens.

**Head:** `f2eba90e16c6f7dd39f6ba40fd179a3825a4fec6` on `feature/dream-tales-v2`. `main` untouched; PR #1 remains Draft.
**Not production-ready and not App Store-ready.**

## Head CI evidence
| Workflow | Run | Result |
|---|---|---|
| compile validation (build + E2E/visual) | [44099536281](https://github.com/Huerlem/ai-bedtime-story-teller/actions/runs/44099536281) | ✓ |
| baseline checks (push) | [44099536306](https://github.com/Huerlem/ai-bedtime-story-teller/actions/runs/44099536306) | ✓ |
| baseline checks (PR) | [44099552538](https://github.com/Huerlem/ai-bedtime-story-teller/actions/runs/44099552538) | ✓ |

From the job logs:
- **Dependencies:** `npm ci` from the committed lockfile. `npm audit --omit=dev --audit-level=high` reports
  **0 vulnerabilities**, and `npm audit signatures` verifies 1114 packages.
- **Unit and wiring tests:** 71/71.
- **Firestore and Storage rules (emulator):** 26/26.
- **Production build:** Next.js 15.5.29, 33/33 static pages.
- **E2E against the Auth, Firestore and Storage emulators, on the production build (`next start`):** 23/23.
  - **Browser (Chromium):**
    - real login;
    - Dashboard with family data;
    - Create Story, including safe failure without a provider key;
    - entering Child Mode;
    - library shows approved stories only;
    - direct navigation to parent areas from Child Mode is redirected and leaks no data;
    - Parent Gate wrong and correct code;
    - "Forgot code?" ends Child Mode and requires the parent password.
  - **API:**
    - unauthenticated requests rejected on every protected route;
    - clients cannot approve or publish directly;
    - Child Mode requires a Parental Verification code;
    - weak codes rejected;
    - server-only approval;
    - Child Mode sees approved stories only;
    - Child Mode tokens refused by every parent API;
    - narration links issued only for authorised stories;
    - **cross-family access denied** for data, approvals, Child Mode and media;
    - gate throttling and lockout, including parallel guesses;
    - correct code restores the parent session;
    - daily quota fails closed (429);
    - account deletion erases the family and its Auth user.
- **Visual capture:** Parent Gate, Dashboard and Create Story at 375×667, 390×844, 393×852 and 430×932 (scale 2).
  Nunito is confirmed loaded via `document.fonts`, with no horizontal overflow. Comparison sheets are in
  `docs/visual-qa/`.

## Failures found in this phase and fixed
1. **Hard-coded demo credentials on the login page** (security): a "Quick Test Logins" panel displayed and
   auto-filled the accounts `john@gmail.com` and `bertie-kid@gmail.com` with the password `password123`.
   - **Fix:** removed (`d20fc32`), with a regression test.
   - **Owner action:** if these accounts exist in any real Firebase project, delete them or reset their passwords.
2. **Auth-transition race:** after entering Child Mode, the library could mount with the previous parent identity,
   and legacy logic redirected to `/login`.
   - **Fix:** `AuthProvider` holds rendering while the identity changes (`d20fc32`).
3. **Build depended on Google Fonts at build time:** a malformed response failed the build in run 44097483015.
   - **Fix:** Nunito is bundled from the official google/fonts repository via `next/font/local` (`01d7623`).
     It is the variable font (wght 200–1000) under the SIL OFL 1.1 licence, which is included.
     sha256 `bb55a5ca…5207`.
4. **Duplicate chevron on the Create Story select:** `@tailwindcss/forms` paints its own arrow.
   - **Fix:** suppressed so only the Figma-specified Lucide chevron shows (`01d7623`).
5. **Child profiles changed order between loads:** Firestore returns document-ID order.
   - **Fix:** profiles are now ordered by date added, then name (`f2eba90`).
6. **Earlier in the phase:**
   - **Child Mode direct navigation reached `/login`.** Fix: the `PARENT_AREA` gate (`03e3734`).
   - **Parent Gate title rendered violet in the production build.** Fix: explicit white title (`03e3734`).
   - **Build broken by `react/no-children-prop`.** Fix: `f45caf5`.

## Screens
| Screen | Status |
|---|---|
| Parent Dashboard (FV 3) | Implemented; verified on the production build. Deviations awaiting decision: initial avatars, shared fallback cover, disabled Create Video, Lucide tile glyphs. |
| Create Story (FV 4) | Implemented; verified on the production build. Story style omitted (thumbnails missing); Video disabled. |
| Parental Verification (FV 7) | Geometry and production typography verified; awaiting product-owner visual approval. |
| Review & Approve | **Blocked:** approval security is complete, but the approved design depends on scenes, generated illustrations and per-scene narration, none of which exist, and there is no phone hi-fi design. |
| Child Library | **Blocked:** no hi-fi design (prototype only, with emojis). Security behaviour verified by E2E. |
| Sleep Mode | Read-only logic only (no UI, per decision). |

## Still not covered
- iOS packaging (Capacitor), on-device testing, TestFlight.
- Real Groq and TTS calls in CI; E2E uses missing keys to prove safe failure.
- Deploying the rules to a staging project; `scripts/audit-public-audio.sh` (owner credentials required).
- Accessibility audit with VoiceOver and Dynamic Type; automated axe checks are not yet in CI.
- Branding: the wordmark file is still missing.
