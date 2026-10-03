import { onRequest as mediaHandler } from '../media.js';

export async function onRequest(context) {
  return mediaHandler(context);
}
