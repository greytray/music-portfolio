import { renderStudio } from 'sanity';
import config from './sanity.config.js';

const target = document.getElementById('sanity-studio-root');
if (target) {
  renderStudio(target, config);
} else {
  console.error('Sanity Studio mounting container (#sanity-studio-root) was not found.');
}
