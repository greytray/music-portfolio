# Eko Music Studio CMS (Sanity v3)

This folder contains the complete Sanity Studio configuration with the 3 categorized interfaces:
1. **Beats Showcase**: Dynamic management of beat titles, audio uploads/URLs, BPM, key, genres, sound tags, and 4-tier pricing (MP3, WAV, Stems, Exclusive).
2. **Global Desktop Settings**: Page content text blocks for all sections, slider/number design controls (gutter, padding, font scales), and social links.
3. **Global Mobile Settings**: Dedicated interface for mobile spacing, padding, typography scales, and compact content overrides.

## Quick Start (Run Studio Locally)

```bash
cd sanity
npm install
npm run dev
# or: npx sanity dev
```

The Studio will start at `http://localhost:3333`.

## Deploy Studio to Free Sanity Hosting

To make your CMS accessible from anywhere in the world at `https://<your-name>.sanity.studio`:

```bash
cd sanity
npm run deploy
# or: npx sanity deploy
```

Choose a studio hostname (e.g. `eko-music-studio`) and hit Enter. You can now log into your Studio from your phone or desktop and update the entire site live with zero code!
