import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { media } from 'sanity-plugin-media';
import { schemaTypes } from './schemas/index.js';
import { structure } from './structure.js';
import { visualTunerPlugin } from './plugins/customTools.jsx';

function getDynamicBasePath() {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname || '';
  if (path.includes('studio.html')) return '/studio.html';
  if (path.includes('/studio')) return '/studio';
  if (path.includes('ekonova090.html')) return '/ekonova090.html';
  if (path.includes('/ekonova090')) return '/ekonova090';
  return '/';
}

export default defineConfig({
  name: 'default',
  title: 'Eko Music Studio CMS',

  projectId: 'm5gxdv12',
  dataset: 'production',
  basePath: getDynamicBasePath(),

  plugins: [
    structureTool({
      structure,
    }),
    visualTunerPlugin(),
    media(),
  ],

  schema: {
    types: schemaTypes,
  },
});
