/**
 * Sanity Studio Game-Like Categorized Interface Structure
 * 
 * 1. Beats & Central Audio Arsenal Pool
 * 2. Unified Settings (Master Brand, Real-Time Pricing Matrix, Global Typography)
 * 3. Desktop Tuning (Real-Time Sliders, Spacing Morphing, Typography & Text Blocks)
 * 4. Mobile Tuning (Mobile Sliders, Typography & Compact Content Overrides)
 */

export const structure = (S) =>
  S.list()
    .title('Studio CMS Dashboard')
    .items([
      // 1. BEATS & SHOWCASE
      S.listItem()
        .title('Beats Showcase & Catalog')
        .id('beatsShowcase')
        .icon(() => '🎵')
        .child(
          S.documentTypeList('beat')
            .title('Beats Catalog & Slots')
            .defaultOrdering([{ field: 'trackNumber', direction: 'asc' }])
        ),

      S.divider(),

      // 2. UNIFIED SETTINGS (Master Brand, Real-Time Pricing Matrix)
      S.listItem()
        .title('Unified Settings')
        .id('unifiedSettingsItem')
        .icon(() => '⚙️')
        .child(
          S.document()
            .title('Unified Settings & Real-Time Pricing')
            .schemaType('unifiedSettings')
            .documentId('unifiedSettings')
        ),

      // 3. DESKTOP TUNING (Sliders, Spacing & Typography)
      S.listItem()
        .title('Desktop Tuning')
        .id('desktopSettingsItem')
        .icon(() => '🖥️')
        .child(
          S.document()
            .title('Desktop Tuning & Layout Controls')
            .schemaType('desktopSettings')
            .documentId('desktopSettings')
        ),

      // 4. MOBILE TUNING (Mobile Spacing & Compact Overrides)
      S.listItem()
        .title('Mobile Tuning')
        .id('mobileSettingsItem')
        .icon(() => '📱')
        .child(
          S.document()
            .title('Mobile Tuning & Compact Layout')
            .schemaType('mobileSettings')
            .documentId('mobileSettings')
        ),
    ]);
