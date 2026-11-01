---
version: alpha
name: Yorimichi — Notion design system
description: A listening workspace using the supplied Notion design system, with a centered navy hero, a real playable episode card, purple primary actions, and pastel channel illustrations.
colors:
  primary: "#5645d4"
  primary-pressed: "#4534b3"
  primary-deep: "#3a2a99"
  on-primary: "#ffffff"
  brand-navy: "#0a1530"
  brand-navy-deep: "#070f24"
  brand-navy-mid: "#1a2a52"
  link-blue: "#0075de"
  link-blue-pressed: "#005bab"
  brand-orange: "#dd5b00"
  brand-orange-deep: "#793400"
  brand-pink: "#ff64c8"
  brand-pink-deep: "#a02e6d"
  brand-purple: "#7b3ff2"
  brand-purple-300: "#d6b6f6"
  brand-purple-800: "#391c57"
  brand-teal: "#2a9d99"
  brand-green: "#1aae39"
  brand-yellow: "#f5d75e"
  card-tint-peach: "#ffe8d4"
  card-tint-rose: "#fde0ec"
  card-tint-mint: "#d9f3e1"
  card-tint-lavender: "#e6e0f5"
  card-tint-sky: "#dcecfa"
  card-tint-yellow: "#fef7d6"
  card-tint-yellow-bold: "#f9e79f"
  card-tint-cream: "#f8f5e8"
  canvas: "#ffffff"
  surface: "#f6f5f4"
  hairline: "#e5e3df"
  hairline-strong: "#c8c4be"
  ink: "#1a1a1a"
  charcoal: "#37352f"
  slate: "#5d5b54"
  steel: "#787671"
  semantic-success: "#1aae39"
  semantic-error: "#e03131"
typography:
  hero-display:
    fontFamily: Notion Sans
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.13
    letterSpacing: -2px
  heading-1:
    fontFamily: Notion Sans
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: -0.5px
  heading-2:
    fontFamily: Notion Sans
    fontSize: 36px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: -0.5px
  heading-3:
    fontFamily: Notion Sans
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.25
  subtitle:
    fontFamily: Notion Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  body-md:
    fontFamily: Notion Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Notion Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
  caption:
    fontFamily: Notion Sans
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.40
  button-md:
    fontFamily: Notion Sans
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.30
rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  xl: 24px
  xxl: 32px
  section-sm: 48px
  section: 64px
  section-lg: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-md}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card-base:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xl}"
  card-feature-yellow-bold:
    backgroundColor: "{colors.card-tint-yellow-bold}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.lg}"
    padding: "{spacing.xxl}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    height: 44px
---

# ながら放送

Use the user-supplied Notion design system for every UI surface. Keep the listening product's real episode, channel, search, upload, queue, and storage content.

The signature is a centered navy hero with small colorful note shapes and wire mesh illustrations, followed by an elevated playable episode card. Use purple for primary actions, black for secondary playback actions on white, blue for text links, and pastel cards for channels. Use 8px button corners and 12px card corners. Reserve fully rounded geometry for filter tabs, switches, and illustration shapes.

Use Notion Sans first, followed by the supplied Inter and system fallbacks. The proprietary Notion Sans font file was not supplied and is not bundled. Increase Japanese display leading slightly to keep characters comfortable at large sizes.

Keep the content container at 1280px with 32px desktop gutters. Use hero sizes of 80px, 72px, 56px, 48px, and 36px as the screen narrows. Collapse navigation below 1024px. Channel cards change from four to two columns; the episode card stacks on small screens. Interactive controls on mobile have at least 44px targets. Preserve visible keyboard focus, modal focus containment, reduced-motion preferences, and a persistent audio player.

Dark mode is a local extension because the supplied system specifies only the dark hero. Keep the primary purple and pastel illustration colors while adapting content surfaces and text contrast.

Edit `src/styles.css`, `public/index.html`, and `public/app.js`, then run `npm run build` to generate the shipped CSS. Do not hand-edit `public/styles.css`.
