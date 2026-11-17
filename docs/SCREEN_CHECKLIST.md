# Dream Tales V2 — Screen implementation checklist

Columns follow the project's Definition of Done. **Visual** = compared against the approved Final Vision at
device sizes; **Functional** = interaction tested; **A11y** = labels, focus, 44 pt targets and live regions checked.
Visual QA harness: SSR with React 19 + Tailwind (project `dt` tokens) + Chromium screenshots. **Limitation:**
Nunito is not available offline in the sandbox, so the renders use a fallback font. Typography must be re-checked in
the CI/TestFlight build before sign-off.

| # | Screen (Final Vision / prototype) | Route | Implemented | Visually verified | Functionally tested | A11y | Blocked by |
|---|---|---|---|---|---|---|---|
| 1 | Splash (FV 1) | — | ✗ | ✗ | ✗ | ✗ | Wordmark file, splash hero art |
| 2 | Onboarding ×3 (FV 2) | — | ✗ | ✗ | ✗ | ✗ | Onboarding art (1 composite-only, 2 missing) |
| 3 | Parent Dashboard (FV 3 / 75:3) | `/dashboard` | legacy UI | ✗ | partial (legacy) | ✗ | Avatars, story covers |
| 4 | Create Story (FV 4 / 75:16, tablet 65:3) | `/create-story` | legacy UI | ✗ | Groq generation ✓ (legacy) | ✗ | Story-style thumbnails, avatars |
| 4a | Generating / Error (75:29, 82:2) | inline | legacy spinner | ✗ | ✗ | ✗ | — |
| 4b | Parent Preview & Approval (65:3 / 75:42) | `/edit-story/[id]` | **approval logic ✓**, legacy layout | ✗ | server unit tests ✓ | panel ✓ | Scene imagery |
| 5 | Story Player — Child (FV 5 / 75:94) | `/kid/story/[id]` | legacy UI; approved-only + signed audio ✓ | ✗ | unit/wiring ✓ | ✗ | Player hero art |
| 5a | Child Library (105:2, 82:12, 95:20) | `/kid/dashboard` | legacy UI; Child Mode session ✓ | ✗ | wiring ✓, rules tests (CI) | ✗ | Covers |
| 5b | Select child / Enter Child Mode (25:25 flow) | `/kid-mode` | **✓ V2 tokens** | n/a (no FV screen) | wiring ✓ | ✓ | — |
| 6 | Video Studio (FV 6 / 80:2–80:102) | — | ✗ | ✗ | ✗ | ✗ | Backend not built; scene still art |
| 7 | **Parental Verification (FV 7 / 105:18–105:267)** | `/kid/parent-gate` | **✓** | **Geometry ✓** (50/50 overlay at 390 pt; 375×667, 430×932); **typography pending Nunito build check**; 320×568 scrolls | server policy + atomic throttling ✓ (unit/wiring); emulator/E2E pending | ✓ labels, live error, keyboard digits | Not yet approved by product owner |
| — | Settings · Privacy & safety | `/settings` | **✓ V2 tokens** | n/a (no FV screen) | wiring ✓ | ✓ | — |

### Parental Verification — measurements and recorded differences vs Final Vision
Measured from the Final Vision screen interior (208 px → 390 pt; an earlier comparison used a 12% too-narrow crop
and has been replaced):
keys 110×68 pt, gap 7 pt, side margins 23 pt; code boxes 64×68 pt, gap 10 pt, top at 363 pt; lock disc 110 pt
centred at 165 pt; title centre 250 pt; subtitle lines 292 and 325 pt; keypad 460–750 pt. The implementation uses
these values; the 50/50 overlay (`docs/visual-qa/parent-gate_vs_final-vision.png`) shows each block aligned to
within about 2–3 pt, footer included (bottom home-indicator inset of 34 pt reserved).
- "." key removed per product decision; position left empty.
- The FV letters under the digits are illegible in the render; standard phone-keypad letters (ABC… WXYZ) are used.
- The FV shows the iOS status bar (device chrome, not app UI).
- The harness used a solid lock glyph; the app uses Lucide `LockKeyhole` (outline with keyhole, as in the FV).
