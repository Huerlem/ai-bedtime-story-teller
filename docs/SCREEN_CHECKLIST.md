# Dream Tales V2 — Screen implementation checklist

Columns follow the project's Definition of Done. **Visual** = compared against the approved Final Vision at
device sizes; **Functional** = interaction tested; **A11y** = labels, focus, 44 pt targets and live regions checked.

**Visual QA method.**
- **Authority:** production-build screenshots from CI (`next build` + `next start`, Chromium, device scale 2) at
  375×667, 390×844, 393×852 and 430×932, with Nunito loaded and verified by `document.fonts`.
- **Font source:** Nunito is bundled with the app (variable font from the official google/fonts repository, SIL
  OFL 1.1), so the build no longer fetches from Google Fonts.
- **Local harness:** used only for fast geometry overlays. It compiles with Tailwind v4 and without
  `@tailwindcss/forms`, so it cannot catch plugin styling; the production screenshots can, and caught the
  duplicate select chevron.
- **Comparison sheets:** `docs/visual-qa/`.

| # | Screen (Final Vision / prototype) | Route | Implemented | Visually verified | Functionally tested | A11y | Blocked by |
|---|---|---|---|---|---|---|---|
| 1 | Splash (FV 1) | — | ✗ | ✗ | ✗ | ✗ | Wordmark file, splash hero art |
| 2 | Onboarding ×3 (FV 2) | — | ✗ | ✗ | ✗ | ✗ | Onboarding art (1 composite-only, 2 missing) |
| 3 | **Parent Dashboard (FV 3 / 75:3)** | `/dashboard` | **✓ V2** | **✓ production build** at 4 sizes; layout within ~2–3 pt of FV; deviations listed below | E2E ✓ (family data, emulator) | ✓ labels, tab bar | Child avatar art, per-story covers, Video Studio |
| 4 | **Create Story (FV 4 / 75:16)** | `/create-story` | **✓ V2** (Story style section omitted) | **✓ production build** at 4 sizes | E2E ✓ (render; provider failure keeps the idea); creates `review_required` draft | ✓ labelled fields, tabs | Story-style thumbnails, Video Studio |
| 4a | Generating / Error (75:29, 82:2) | inline | V2 button busy state + inline error | ✗ (no FV hi-fi) | E2E ✓ (safe failure) | ✓ live error | Hi-fi design |
| 4b | Parent Preview & Approval (65:3 / 75:42) | `/edit-story/[id]` | **approval logic ✓**, legacy layout | ✗ | server + E2E ✓ (only the server route approves) | panel ✓ | Scene model, illustration generation, per-scene narration; no phone hi-fi design |
| 5 | Story Player — Child (FV 5 / 75:94) | `/kid/story/[id]` | legacy UI; approved-only + signed audio ✓ | ✗ | E2E ✓ (drafts unreachable; signed narration only when authorised) | ✗ | Player hero art |
| 5a | Child Library (105:2, 82:12, 95:20) | `/kid/dashboard` | legacy UI; Child Mode session ✓ | ✗ | E2E ✓ (approved only, never drafts) | ✗ | **No hi-fi design** (prototype uses emojis); covers |
| 5b | Select child / Enter Child Mode (25:25 flow) | `/kid-mode` | **✓ V2 tokens** | n/a (no FV screen) | E2E ✓ | ✓ | Entry point on Dashboard not in FV (decision needed) |
| 6 | Video Studio (FV 6 / 80:2–80:102) | — | ✗ | ✗ | ✗ | ✗ | Backend not built; scene still art |
| 7 | **Parental Verification (FV 7 / 105:18–105:267)** | `/kid/parent-gate` | **✓** | **✓ geometry and production-build typography** at 4 sizes | E2E ✓ (wrong code, lockout, parallel guesses, correct code, "Forgot code?") | ✓ labels, live error, keyboard digits | Awaiting product-owner visual approval |
| — | Sleep Mode | — | logic only (`src/lib/sleepMode.mjs`) | n/a | unit ✓ | n/a | Figma design (per decision, no UI yet) |
| — | Settings · Privacy & safety | `/settings` | **✓ V2 tokens** | n/a (no FV screen) | wiring ✓; account deletion E2E ✓ | ✓ | — |

### Parent Dashboard — recorded deviations from Final Vision (awaiting decision)
- **Child avatars:** FV shows illustrated portraits of Emma and Lucas. No avatar artwork or upload pipeline exists,
  so a lavender disc with the child's initial is shown. A child photo is used when the profile has one.
- **Story covers:** FV shows a unique cover per story. Stories have no generated illustrations yet, so the README-
  approved scene 01 ("fox discovers star") is the fallback cover, centre-cropped (`object-cover`) into the 135×95 pt
  landscape slot. The image is not modified.
- **Create Video tile:** rendered at reduced emphasis and disabled because Video Studio does not exist. FV shows it
  fully active.
- **Tile glyphs:** Lucide `Feather` and `Clapperboard` in the FV gradient squares; FV glyph artwork is not available
  as separate assets.
- **Long names:** the greeting wraps to two lines (FV shows a short name on one line).
- **Child profile order:** now stable (date added, then name). Previously random between loads.

### Create Story — recorded deviations
- **Story style section** (Animated / Watercolour / 3D / Illustration thumbnails) is omitted until the approved
  thumbnails are supplied. Illustration generation does not exist yet either.
- **Video segment:** disabled ("Video Studio is not available yet").
- **Age ranges** 3-5 / 6-8 / 9-12 years: FV shows only "3-5 years"; the other two are an assumption to confirm.

### Parental Verification — measurements and recorded differences vs Final Vision
Measured from the Final Vision screen interior (208 px → 390 pt):
- keys 110×68 pt, gap 7 pt, side margins 23 pt;
- code boxes 64×68 pt, gap 10 pt, top at 363 pt;
- lock disc 110 pt, centred at 165 pt;
- title centre 250 pt; subtitle lines 292 and 325 pt;
- keypad 460–750 pt.

The production build matches these to within about 2–3 pt, with a 34 pt bottom home-indicator inset reserved.

Recorded differences:
- "." key removed per product decision; position left empty.
- The FV letters under the digits are illegible in the render; standard phone-keypad letters are used.
- The FV shows the iOS status bar (device chrome, not app UI).
