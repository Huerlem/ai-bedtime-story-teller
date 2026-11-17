# Dream Tales V2 — Definitive Asset Inventory (17 Nov 2026)

Every file in Project Knowledge was opened and checked (dimensions, alpha channel, perceptual comparison with the
source icon), and every page of Figma file `5FHQFx1mZwTLyOjc4slh4d` was scanned for raster fills. Nothing was
regenerated, redrawn or approximated.

**Sources searched**
- Project Knowledge: 41 entries (37 images/blobs + 4 text docs). **No ZIP archives and no prompt files exist**
  in the Project today; past Project conversations contain no prompts or assets either.
- Figma: all 13 pages. Raster fills exist only on pages 03 (`50:11`), 06 (`50:2`–`50:9`) and 07 (`50:14`, `65:3`).
  The 27-screen prototype page (`75:2`) contains **no raster images** — its artwork slots are vector placeholders.
- No files were attached to the 17 Nov message that said assets were being attached.

Status keys: **COMMITTED** = in the repo in this series · **COMPOSITE-ONLY** = authentic and visible, but only
inside a flattened board below production resolution · **NOT FOUND** = not in Project, Figma or repo.

## A. Authentic, production-quality — committed

| Asset | Project source | Repo path | Intended use | Status |
|---|---|---|---|---|
| App icon master — sleeping fox, lavender cloud, crescent moon (1254², RGB) | `DreamTales_App_Assets/SOURCE_Original_Approved_Icon.png` | `public/brand/dreamtales-app-icon-source.png` | Brand source for every icon | COMMITTED |
| **Fox mascot, transparent cutout** (1024², RGBA) — same art as the icon without its background | `expo/assets/images/splash-icon.png` (`splash-icon-dark.png` is byte-identical) | `public/brand/dreamtales-fox-mascot.png`, `resources/splash-icon-1024.png` | Native launch screen; mascot placements | COMMITTED |
| Favicon .ico (48) | `web/favicon.ico` | `src/app/favicon.ico`, `public/icons/favicon.ico` | Browser tab | COMMITTED |
| Web icons 16–512, apple-touch-icon, android-chrome 192/512, maskable 512 | `web/*` | `public/icons/*`, `src/app/icon.png`, `src/app/apple-icon.png` | PWA / web clip | COMMITTED |
| Web manifest (name, `#16164A`) | `web/site.webmanifest` | `public/site.webmanifest` (maskable purpose split) | PWA | COMMITTED |
| iOS AppIcon 20–180 + App Store 1024 (opaque) | `ios/*` | `resources/ios/*` | Capacitor iOS | COMMITTED (wired at native stage) |
| Android adaptive foreground, monochrome, Play 512 | `android/*`, `expo/.../adaptive-icon.png` | `resources/android/*` | Android | COMMITTED |

Duplicates verified by checksum: `icon-512` = `maskable-512`; `android-chrome-512` = `web/favicon.png` =
`play-store-icon-512`; `AppStore-1024` = `expo icon.png`; `adaptive-icon` = `adaptive-foreground-1024`.
The README's note applies: the monochrome icon is an automated silhouette and needs a hand-traced version before
Android launch.

## B. Authentic, but only inside flattened composite boards (not production resolution)

Boards: **FV** = Final Vision `50:14` (1660×934, Figma cannot render it larger); **FLOW** = `Fluxo Mágico de
Histórias Infantis 1.png` in the Project = Figma `65:3` (1536×1024); **CARDS** = DS board `50:7` (780×585);
**MAP** = App Map `50:11` (1448×1086). Pixel sizes are the largest available rendition of each item.

| Asset | Where it appears (largest) | Max pixels | Intended screens | Production need (@3x) | Status |
|---|---|---|---|---|---|
| **DreamTales wordmark + "Stories for Brighter Tomorrows"** (gold/lavender) | FV header ≈ 410×120; MAP ≈ 430×120; FLOW ≈ 370×100; FV splash ≈ 190×60 | ≈ 430×120, opaque, over illustrated sky | Splash, onboarding, headers, App Store | transparent vector or ≥ 1200 px PNG | COMPOSITE-ONLY — **no standalone file** |
| Girl + fox asleep on the crescent moon (hero) | FV header (fused with the wordmark), FV splash ≈ 170×120 | ≈ 230×150 | Splash, brand header | ≥ 1170 px wide | COMPOSITE-ONLY |
| Onboarding — child reaching for a star | FV screen 2 | ≈ 200×190 | Onboarding 1/3 | ≥ 1170 px wide | COMPOSITE-ONLY; onboarding 2/3 and 3/3 art **NOT FOUND** |
| Child avatars Emma, Lucas | FV ≈ 50 px; FLOW ≈ 70 px; CARDS Emma ≈ 110 px | ≈ 110 px | Dashboard, Create, child cards | 192–240 px | COMPOSITE-ONLY (Lucas ≤ 70 px) |
| Story cover — *The Fox and the Starlight Forest* | CARDS ≈ 335×160; FV ≈ 72×55 | ≈ 335×160 | Recent stories, library | 4:5 cover ≥ 600 px | COMPOSITE-ONLY |
| Story covers — *Luna and the Rainbow Bridge*, *Theo's Underwater…* | FV ≈ 72×55 (Theo cropped by the frame) | ≈ 72×55 | Recent stories | ≥ 600 px | COMPOSITE-ONLY |
| Story-style thumbnails — Animated, Watercolour, 3D, Illustration | FLOW ≈ 60 px; FV ≈ 42 px | ≈ 60 px | Create Story | 180–240 px | COMPOSITE-ONLY |
| Player hero — girl + fox under glowing star | FLOW tablet ≈ 400×560, with title, controls and buttons painted over it | ≈ 400×560 | Child Story Player | full-bleed ≥ 1290 px | COMPOSITE-ONLY (UI baked in) |
| Player hero — fox in the starlit forest (phone) | FV screen 5 ≈ 185×300, UI baked in | ≈ 185×300 | Child Story Player | ≥ 1170 px | COMPOSITE-ONLY |
| Approval scene — Scene 1 (girl + fox, star) | FLOW ≈ 395×255 | ≈ 395×255 | Parent Preview & Approval | 16:9 ≥ 1280 px | COMPOSITE-ONLY |
| Cover + Scenes 1–5 thumbnails; 4-image scene strip | FLOW ≈ 80×58 each | ≈ 85×58 | Parent Preview & Approval | ≥ 400 px | COMPOSITE-ONLY |
| Video Studio — Scene 1 still | FV screen 6 ≈ 165×72 | ≈ 165×72 | Video Studio | 16:9 ≥ 1280 px | COMPOSITE-ONLY |
| Night-forest / starry-sky background | All boards (behind phones/text) | partial, occluded | Splash, child surfaces | full-bleed | COMPOSITE-ONLY (never visible unobstructed) |
| Five-step pipeline icons (Create, Illustrate, Narrate, Animate, Approve) | FLOW header ≈ 40 px | ≈ 40 px | Marketing / onboarding | vector | COMPOSITE-ONLY |

These crops are authentic pixels but would be visibly blurred at their intended iOS sizes, and several carry
UI that was painted onto the art. They have **not** been used. Using them as interim art would need your
explicit approval.

## C. Not found anywhere

1. **The four premium storybook scenes** referenced in handoff `142:3` ("generated and packaged separately …
   raster assets are not in Figma"). They are not in Project Knowledge, Figma or the repo.
2. **Wordmark source file** (SVG/PDF/transparent PNG) and the original prompt or artwork brief behind it.
3. **Original image-generation prompts** for any illustration (you said these are in Project Knowledge, but
   they are not there now).
4. Onboarding illustrations for steps 2 and 3 (FV shows three pagination dots).
5. Story-cover art at cover resolution for any story; avatar originals; story-style thumbnail originals.

**UI icons are not artwork:** DS board `50:8` specifies rounded line icons (house, open book, plus, user, heart,
star, gear, play-circle, download). These match `lucide-react`, which is already a dependency. I will treat
Lucide as implementing the icon specification unless you object.

## D. What this means for implementation

- **Can proceed now:** design tokens, typography, components, layouts and every screen region that has no
  illustration (Parental Verification keypad, Create Story form controls, Video Studio stepper, dashboards,
  states). Approved icon and fox mascot are in place.
- **Blocked on files B/C:** Splash and onboarding (wordmark + hero art), story covers, avatars (real profiles can
  use parent-uploaded photos; the sample Emma/Lucas art is needed only for marketing or empty states), style
  thumbnails, player and approval imagery. Real stories will use generated images; the approved art defines how
  they look and is needed for the designed empty, sample and onboarding states.

**To unblock:** upload to Project Knowledge (or attach) the original wordmark file and the illustration files,
ideally the 4-scene package and the source images used to build the Final Vision board.
