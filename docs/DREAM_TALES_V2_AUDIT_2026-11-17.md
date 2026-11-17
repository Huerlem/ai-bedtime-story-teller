# Dream Tales V2 — Independent Engineering Audit (17 Nov 2026)

Scope: branch `feature/dream-tales-v2` @ `0b7bd96` (11 commits), approved Figma file `5FHQFx1mZwTLyOjc4slh4d`
(Final Vision `50:14`, Prototype `75:3`, Engineering Handoff `139:2`), and the Project asset pack
(`DreamTales_App_Assets/`). CP03 was not used as a reference.

Status keys: **FIXED** = changed in this patch series and covered by tests · **OPEN** = confirmed, not yet fixed.

---

## 1. Verdict

The previous work is a reasonable start (Admin-SDK token checks on AI routes, input bounds, upload endpoint
disabled, CI build), but the app was **not safe for any public or TestFlight exposure**: the repository had
no Firestore/Storage rules, anyone could join another family at registration, children could be shown stories
that no parent approved server-side, there were no cost controls, and one AI route still logged children's
story text. The UI is still the university project ("AI Bedtime Story", indigo/Inter); **0 of the approved
Figma screens are implemented**.

---

## 2. Severity-ranked findings

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| 1 | P0 | **No `firestore.rules` / `storage.rules` in the repo.** Isolation depended on unknown console config; nothing was testable. | FIXED — deny-by-default rules, `firebase.json`, emulator tests |
| 2 | P0 | **Family takeover at registration.** `/register` offered "Child" + free-text *Family ID* (= parent uid); `registerUser` wrote client-chosen `role`/`familyId`, joining any family and its stories. | FIXED — parent-only registration; rules reject other roles/families |
| 3 | P0 | **Parental approval not enforced.** "Publish" set `isPublished: true` client-side; `reviewRequired` was metadata only; child library trusted the flag. | FIXED — server-only approval API with fresh re-auth; rules forbid client approval; Child Mode lists `approved` only |
| 4 | P0 | **Role cookie trusted for routing.** Unsigned JSON `user` cookie with `role`; middleware made decisions from it. | FIXED — cookie no longer written/read; middleware clears it |
| 5 | P0 | **No quotas / cost controls** on Groq and Google TTS. | FIXED — per-parent daily quotas (Admin transaction, fails closed, 429) |
| 6 | P0 | **Child data in logs.** `generate-image` logged full body + story text; AuthContext logged profile/email; TTS logged tokenised URLs. Contradicts the earlier "logs removed" claim. | FIXED + regression test |
| 7 | P0 | **Previously public audio.** Retired `/api/upload_audio` called `makePublic()` on `audio/{uid}/{story}.mp3`; those ACLs survive rule changes. | OPEN — `scripts/audit-public-audio.sh` provided; must be run by a project owner (playback no longer uses those URLs) |
| 8 | P0 | **Download URLs are bearer tokens.** `audioUrl`/photo URLs bypass Storage rules for anyone holding the link. | FIXED for narration — private `audioPath` + 10-min signed URLs via `/api/media/narration`; profile photos still use download URLs (OPEN) |
| 9 | P0 | **Child Mode runs on the parent's session.** A child can navigate to parent screens and create stories; only approval is password-gated. No Parent Gate on exit. | FIXED — separate Child Mode identity (custom token + rules), server-verified throttled Parent Gate code; privileged actions need password |
| 10 | P0 | **Account deletion, data export, consent records** not implemented (UK GDPR / Children's Code, App Store 5.1.1(v)). | FIXED deletion + export; consent records and privacy policy OPEN |
| 11 | P1 | Dead/unsafe duplicates: `utils/middleware.js` (cookie trust), `utils/auth.js` (unauthenticated copy of image route), `RegisterForm.js`. | FIXED — removed |
| 12 | P1 | `fetchSignInMethodsForEmail` used at sign-up (email enumeration). | FIXED |
| 13 | P1 | Illustration endpoint returns a coloured SVG with an emoji — **placeholder**, not AI art. | OPEN |
| 14 | P1 | Story-to-Video: **no backend, no UI** (Figma screens 80:2–80:102). | OPEN |
| 15 | P1 | Regeneration/versioning per handoff (approved version stays live until replacement approved) not implemented — editing withdraws approval instead. | OPEN (documented trade-off) |
| 16 | P1 | No lockfile; dependency versions float; `next-auth` and `openai` are unused dependencies. | OPEN |
| 17 | P2 | Firebase Analytics hook present — incompatible with Kids Category and needs consent for UK users. | OPEN |
| 18 | P2 | ESLint rules downgraded to warnings (unused vars, `any`, unescaped entities). | OPEN (tracked) |

### Data-model note (breaking)
Stories created before this series have no `status`; they are now **hidden from Child Mode until a parent
approves them again**. Parent profiles must have `familyId == uid` (true for all accounts created by
`registerUser`; accounts created by the deleted `RegisterForm` need a one-off migration).

---

## 3. What is working (code-verified, not production-verified)

- Firebase client init; email/password sign-in, password reset, profile updates.
- Server-verified parent gate on all AI/TTS routes (now with quotas).
- Story generation via Groq with bounded input; TTS via Google with voice allowlist.
- Parent: dashboard, create (write/generate), my-stories, edit, child profiles, settings, profile.
- Child: kid dashboard and story reader/player (now approved-only).
- CI: unit tests + `next build` (last green run 43950511070 — before this series).

Not verifiable in this session: `npm install` and `next build` (package registry unreachable from this
sandbox) and the Firebase emulator tests (no Java/firebase-tools). They run in CI via the updated workflow.

---

## 4. Figma → implementation comparison

**Important structural finding about the design source.**
- `50:14` *Final Vision* is a **single flattened raster** (1660×934) of seven phone mock-ups. It is the visual
  authority, but its imagery cannot be extracted at production resolution.
- `33:158` page frame is titled *"Final Vision — Reference Image Not Yet Imported"*.
- `75:3` *Prototype* is editable but uses **emoji avatars (👧🏻 👦🏽), a text wordmark "✦ DreamTales" and
  placeholder vector art** in the illustration slots — all forbidden as final assets by the project rules.
- `139:2` handoff states (142:3) that the four premium storybook scenes were **packaged separately and never
  imported into Figma**; visual sign-off is conditional on importing them.
- Handoff tokens: Nunito Bold/Regular; parent surface `#FFFCF7`, text `#29264C`, purple `#7665C2`; child surface
  `#15183B`, cream `#FFF8EC`, moon gold `#FFE1A3`; radii 15–24 px; targets ≥ 44 px; reference width 390 px.

| Figma screen | Repo route | Functional | Visual fidelity |
|---|---|---|---|
| 1 Splash | — | Missing | Missing (splash icon available in pack) |
| 2 Onboarding (3 steps) | — | Missing | Missing; illustration not available |
| 3 Parent Dashboard (75:3) | `/dashboard` | Partial (no Create Video, no avatars) | Not implemented — legacy indigo UI |
| 4 Create Story (75:16) | `/create-story` | Working (Groq) | Not implemented — no Story/Video toggle, child picker, style thumbnails, mood/length chips |
| Generating / Error (75:29, 82:2) | inline spinner | Partial | Not implemented |
| Parent Preview & Approval (75:42, flow board) | `/edit-story/[id]` | **Approval now server-enforced** | Not implemented — no Story/Illustrations/Narration/Video tabs, no scenes |
| Publish success (75:68) | redirect | Partial | Not implemented |
| Child Dashboard / Library (105:2, 82:12, 95:20) | `/kid/dashboard` | Working (approved-only) | Not implemented |
| Story detail / Player / Listen (95:2, 75:94, 95:13) | `/kid/story/[id]` | Read + Listen | Not implemented; no Watch |
| 6 Video Studio + 5 states (80:2–80:102) | — | Missing | Missing |
| 7 Parental Verification / PIN (105:18–105:267) | — | Server equivalent only (password re-auth for approval) | Missing |
| Marketing home | `/` | Working | Legacy "AI Bedtime Story" brand — must be replaced |

Fidelity score today: **0 / 27 prototype screens visually verified**.

---

## 5. Asset inventory

**Accessible and authentic (usable now)**
- App icon — sleeping orange fox on lavender cloud under crescent moon: `SOURCE_Original_Approved_Icon.png`
  (1254²) plus iOS (20–1024), Android adaptive/monochrome/Play, web favicons/manifest, Expo icon and splash icons.

**Visible only inside flattened composites (not usable as production assets)**
- DreamTales gold/lavender **wordmark + "Stories for Brighter Tomorrows" tagline** (no transparent PNG/SVG anywhere).
- Splash hero (girl and fox asleep on the moon), onboarding illustration (child reaching for a star).
- Child avatars (Emma, Lucas); story covers (*The Fox and the Starlight Forest*, *Luna and the Rainbow Bridge*,
  *Theo's Underwater…*); four story-style thumbnails (Animated, Watercolour, 3D, Illustration).
- Story-player hero art, Video Studio scene image, five approval-board scene thumbnails, night-forest background.

**Missing entirely**
- The four premium storybook scenes referenced in handoff 142:3.
- Wordmark source (vector or ≥ 2× transparent raster) and the script typeface used for it.
- Figma raw image fills of `50:14` could be listed but not downloaded from this environment (figma.com egress blocked).

No replacement art has been created or substituted.

---

## 6. Changes in this patch series

| Commit | Summary |
|---|---|
| `security(firebase)` | Deny-by-default Firestore & Storage rules, `firebase.json`, indexes, emulator tests, public-audio audit script |
| `security(auth)` | Parent-only registration; no role cookie; middleware makes no auth decisions; dead unsafe files removed |
| `feat(safety)` | Server-enforced approval (`/api/stories/[id]/approve`, fresh re-auth, audit log), Child Mode approved-only, per-parent quotas |
| `security(api)` | Image route log leak fixed; CI job for emulator rules tests |
| `privacy` | AuthContext no longer logs profile/email |
| `fix(tts)` | Explicit `audio/mpeg`; no logging of tokenised URLs |

Test evidence in this sandbox: `node --test tests/*.test.mjs` → **36/36 pass**; all changed JS/JSX files pass a
TypeScript-parser syntax check and every `@/` / relative import resolves. Not run here: `next build`,
emulator rules tests (both wired into CI).

---

## 7. Priorities (next)

1. Run the rules tests + build in CI; deploy rules to a **staging** Firebase project; run `audit-public-audio.sh`.
2. Child Mode hardening: server-minted custom token (`childMode`, `familyId`, `childId`) whose rules allow only
   approved reads; exit requires parent re-auth (Figma Parent Gate, PIN with server-side throttling).
3. Private media: signed short-lived URLs; stop persisting `getDownloadURL` tokens.
4. Account deletion + data export + consent record; privacy policy.
5. **Obtain the missing approved assets** (wordmark, illustrations, avatars, covers) → then P2 UI migration screen
   by screen against Figma, starting with Parent Dashboard, Create Story, Review & Approve, Child Library, Player.
6. Story-to-Video and real illustration generation (with moderation and separate video approval).
7. iOS: Capacitor shell loading a static client export with API routes on a server host; StoreKit subscriptions;
   App Store privacy labels; decide Kids Category vs parent-targeted listing (affects analytics and IAP rules).

---

## 7b. Update — second session (17 Nov 2026)

- Definitive asset inventory: `docs/ASSET_INVENTORY.md`; token conflicts: `docs/DESIGN_TOKENS.md`;
  screen checklist and visual QA: `docs/SCREEN_CHECKLIST.md`, `docs/visual-qa/`.
- Approved icon pack and transparent fox mascot integrated; Nunito and `dt` tokens in place.
- Deployment notes: the server needs `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, and its service account needs
  `iam.serviceAccounts.signBlob` (V4 signed URLs) and `firebase.auth` custom-token creation. The Storage rules use
  cross-service `firestore.get`; grant this when Firebase asks on the first deploy.

## 8. App Store readiness checklist (status)

- [x] App icon set (1024 master, opaque)
- [ ] Wordmark/brand assets in repo
- [ ] Native shell (Capacitor) builds on macOS CI
- [ ] Launch screen
- [x] Account deletion in-app (5.1.1(v)) — implemented, emulator/E2E test pending
- [ ] Privacy policy URL, privacy nutrition labels, UK Children's Code DPIA
- [~] Parental gate — Child Mode exit implemented; still needed before purchases/external links
- [ ] StoreKit subscriptions + restore purchases
- [ ] Content moderation for AI text/images/video (guidelines 1.1 and 1.2)
- [ ] Accessibility: Dynamic Type, VoiceOver labels, 44 pt targets, reduced motion
- [ ] Emulator isolation tests green; staging pen-test of rules
- [ ] TestFlight QA on iPhone (320/390/430 widths) and iPad
