import fs from 'node:fs';
import path from 'node:path';
import { getGitHubConfig } from '../functions/_github.js';

async function restore() {
  const cfg = getGitHubConfig(process.env);
  console.log('[Restore] Connecting to GitHub repo:', cfg.repo);

  const commitSha = '2c74c86dda9b433e525c5c99b29e6abc66110973';
  const treeRes = await fetch(`https://api.github.com/repos/${cfg.repo}/git/trees/${commitSha}?recursive=1`, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json'
    }
  });

  if (!treeRes.ok) {
    throw new Error(`Failed to fetch tree: ${treeRes.status} ${await treeRes.text()}`);
  }

  const data = await treeRes.json();
  const imageEntries = (data.tree || []).filter(item => item.path.startsWith('assets/images/') && item.type === 'blob');

  console.log(`[Restore] Found ${imageEntries.length} image files to restore.`);

  const destDir = path.resolve(process.cwd(), 'assets', 'images');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const entry of imageEntries) {
    const filename = path.basename(entry.path);
    console.log(`[Restore] Downloading ${filename} (sha: ${entry.sha})...`);

    const blobRes = await fetch(`https://api.github.com/repos/${cfg.repo}/git/blobs/${entry.sha}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github.raw'
      }
    });

    if (!blobRes.ok) {
      console.error(`  ✗ Failed to download ${filename}: ${blobRes.status}`);
      continue;
    }

    const arrayBuf = await blobRes.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    fs.writeFileSync(path.join(destDir, filename), buf);
    console.log(`  ✓ Restored ${filename} (${buf.length} bytes)`);
  }

  console.log('[Restore] All images restored successfully to assets/images/');
}

restore().catch(err => {
  console.error('[Restore Fatal]:', err);
  process.exit(1);
});
