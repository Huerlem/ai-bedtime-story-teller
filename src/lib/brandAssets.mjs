// Dream Tales V2 — registry of authentic, approved brand and illustration assets.
// Screens must reference artwork through this registry so that only supplied originals are
// used (never emojis, CSS placeholders or regenerated approximations).
// Source and status of every entry: docs/ASSET_INVENTORY.md.

export const BRAND = Object.freeze({
  appIcon: { src: '/brand/dreamtales-app-icon-source.png', width: 1254, height: 1254, alt: 'Dream Tales' },
  foxMascot: { src: '/brand/dreamtales-fox-mascot.png', width: 1024, height: 1024, alt: '' }, // decorative
  // The DreamTales wordmark has not been supplied as a standalone file. Do not typeset it.
  wordmark: null,
});

/**
 * Four premium storybook scenes (handoff 142:3), supplied 17 Nov 2026 as
 * Dream_Tales_V2_Premium_Illustrations_1.zip. Status per their README: candidate story art
 * pending visual review/acceptance. Native size ≈ 3:4 portrait, ~530×724 px: sharp up to
 * ~175×240 pt on @3x iPhones; NOT suitable for full-bleed hero use without larger originals.
 * `use` lists the screens suggested by the asset package README.
 */
export const STORY_SCENES = Object.freeze({
  foxDiscoversStar: {
    src: '/illustrations/story-scenes/01_Fox_Discovers_Star.jpg', width: 535, height: 724,
    alt: 'A little fox smiles at a glowing star in a moonlit forest',
    use: ['parent-dashboard.story-cover', 'story-discovery'],
  },
  enchantedForestPath: {
    src: '/illustrations/story-scenes/02_Enchanted_Forest_Path.jpg', width: 527, height: 724,
    alt: 'A fox skips along a glowing forest path following sparkling stars',
    use: ['child-dashboard.featured-story'],
  },
  moonlitValley: {
    src: '/illustrations/story-scenes/03_Moonlit_Valley.jpg', width: 527, height: 724,
    alt: 'A fox sits on a rock looking at a crescent moon over a valley and waterfall',
    use: ['create-story.inspiration', 'story-scene'],
  },
  starlightCelebration: {
    src: '/illustrations/story-scenes/04_Starlight_Celebration.jpg', width: 535, height: 724,
    alt: 'A joyful fox celebrates beneath a shower of golden stars',
    use: ['parent-review.story-finale'],
  },
});

export const ASSET_STATUS = Object.freeze({
  storyScenes: 'candidate — awaiting product-owner visual acceptance',
});

/** Largest on-screen size (in points) at which an image stays sharp at a device scale factor. */
export function maxCrispSize({ width, height }, scale = 3) {
  return { width: Math.floor(width / scale), height: Math.floor(height / scale) };
}
