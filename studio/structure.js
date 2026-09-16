/**
 * Sanity Studio v3 Categorized Interface Structure
 * 
 * Splits the CMS dashboard into the exact 3 required categories:
 * 1. Beats Showcase (Manage audio tracks, titles, genres, prices)
 * 2. Global Desktop Settings (Desktop page content, design controls, social links)
 * 3. Global Mobile Settings (Separate interface for mobile layout variables & compact content)
 */

export const structure = (S) =>
  S.list()
    .title('Studio CMS Dashboard')
    .items([
      // 1. BEATS SHOWCASE
      S.listItem()
        .title('Beats Showcase')
        .id('beatsShowcase')
        .child(
          S.documentTypeList('beat')
            .title('Beats Showcase & Catalog')
            .defaultOrdering([{ field: 'trackNumber', direction: 'asc' }])
        ),

      S.divider(),

      // 2. GLOBAL DESKTOP SETTINGS (Dedicated Interface)
      S.listItem()
        .title('Global Desktop Settings')
        .id('desktopSettingsItem')
        .child(
          S.document()
            .title('Global Desktop Settings')
            .schemaType('desktopSettings')
            .documentId('desktopSettings')
        ),

      // 3. GLOBAL MOBILE SETTINGS (SEPARATE INTERFACE)
      S.listItem()
        .title('Global Mobile Settings')
        .id('mobileSettingsItem')
        .child(
          S.document()
            .title('Global Mobile Settings')
            .schemaType('mobileSettings')
            .documentId('mobileSettings')
        ),
    ]);
