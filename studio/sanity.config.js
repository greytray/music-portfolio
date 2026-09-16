import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas/index.js';
import { structure } from './structure.js';

function getDynamicBasePath() {
  if (typeof window === 'undefined') return '/ekonova090';
  const path = window.location.pathname || '';
  if (path.includes('studio.html')) return '/studio.html';
  if (path.includes('studio')) return '/studio';
  if (path.includes('ekonova090.html')) return '/ekonova090.html';
  if (path.includes('ekonova090')) return '/ekonova090';
  return '/ekonova090';
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
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
  },
});
