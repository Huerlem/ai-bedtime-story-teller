# Dream Tales V2 — Design tokens and recorded design conflicts

Authority (confirmed by the product owner on 17 Nov 2026): **Final Vision `50:14` is the visual authority**; the
interactive prototype `75:3` defines flow and navigation; the engineering handoff `139:2` defines implementation
specifications. Where they conflict, the Final Vision is preserved and the conflict is listed here.

## Tokens in `tailwind.config.js` (`dt-*`)

Values were measured as medians over flat regions of the Final Vision render (spread ≤ 4 on buttons).

| Token | Value | Final Vision evidence | Conflicting spec |
|---|---|---|---|
| Primary action gradient `bg-dt-primary` | `#9A79F8 → #7364F6` (left→right) | Get Started, Next, Generate Story, Next Scene | Handoff `#7665C2`; DS V2 `#7464B0`; DS colour board `#6C58D0` |
| `dt-violet` | `#7364F6` | button solid end | as above |
| `dt-canvas` (parent surface) | `#F7F6FD` | Dashboard / Create backgrounds | Handoff `#FFFCF7`; DS canvas `#FFF8EC` |
| `dt-tile-violet` / `dt-periwinkle` | `#EDDEFD` / `#DEE3FD` | Create Story / Create Video tiles | — |
| `bg-dt-night` (child, gate surfaces) | `#1D2345 → #0C1027` | Parental Verification, Splash | Handoff `#15183B` |
| `dt-night-raised` | `#202649` | PIN keys | — |
| `dt-night-control` | `#323373` | Player Listen/Watch buttons | — |
| `dt-gold` | `#FCE5B8` | Player "Read" selected | Handoff moon gold `#FFE1A3` (kept as `dt-moon-gold`) |
| `dt-ink` | `#252447` | DS Midnight (text) | UI kit `#181A42`; handoff text `#29264C` |
| Status colours | success `#43AF83`, warning `#FFBF64`, error `#EF7078`, info `#56A4FA` | DS UI kit `33:7` | DS ref board uses `#4CA7FA`/`#FF6866`/`#40A3FF` |
| Radii | 12 / 16 / 20 / 24 px | DS spec `28:10` | handoff 15–24 px |
| Font | Nunito 400/600/700/800 (`next/font`, self-hosted) | all boards | — |

Exact colours can only be confirmed against a Figma source with editable fills. **The Final Vision is a raster
image, so these values are measured, not specified.**

## Content and flow conflicts awaiting a decision

1. **App Map V2 board (`50:11`)** lists child-side "Create (Simple)" and "Sleep Mode". The handoff, IA (`2:50`)
   and Decision Gate state that children never create content. Not implemented until you decide.
2. **Prototype `75:3`** uses emoji avatars, a typeset "✦ DreamTales" wordmark and a vector fox placeholder. These
   are superseded by the Final Vision and will not be implemented.
3. **Parental Verification**: the Final Vision shows a 4-digit keypad; the handoff forbids client-side PINs.
   Implemented as a server-verified PIN (hashed, throttled, locked out after repeated failures) with
   password re-authentication as the fallback ("Forgot code?").
4. **Sample names**: the Final Vision and flow board use Emma (6) and Lucas (4); older boards use Luna and Theo.
   Real screens show the family's own profile data.
5. **Tablet layout**: the flow board (`65:3`) shows iPad layouts with a left navigation rail. The phone Final
   Vision uses a bottom tab bar. Both will be followed at their respective breakpoints.
