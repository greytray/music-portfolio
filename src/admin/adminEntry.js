import { AdminApp } from './adminApp.js';
import { initPublishedDesignSchema } from '../utils/schemaApplier.js';

// Apply published visual modifications
initPublishedDesignSchema();

// Mount AdminApp into the document body
function mountEditor() {
  new AdminApp(document.body);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountEditor);
} else {
  mountEditor();
}
