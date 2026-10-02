#!/usr/bin/env node
/**
 * Sync script to upload all images to Hugging Face RawStorage dataset:
 * Repository: greyhugging/RawStorage
 * Target Folder: Images/
 */

import fs from 'node:fs';
import path from 'node:path';

const HF_REPO = process.env.HF_REPO || 'greyhugging/RawStorage';
const HF_TOKEN = process.env.HF_ACCESS_TOKEN || process.env.HUGGINGFACE_TOKEN || process.env.HF_TOKEN;

async function syncImages() {
  console.log(`[HF Sync] Target Repository: ${HF_REPO}`);
  console.log(`[HF Sync] Target Folder: Images/`);

  if (!HF_TOKEN) {
    console.error(`[HF Sync Error] Missing HF_ACCESS_TOKEN.`);
    console.error(`Please provide your Hugging Face write token:`);
    console.error(`  export HF_ACCESS_TOKEN=hf_...`);
    console.error(`  node scripts/sync-images-to-hf.js`);
    process.exit(1);
  }

  let imagesDir = path.resolve(process.cwd(), 'assets', 'images');
  if (!fs.existsSync(imagesDir) || fs.readdirSync(imagesDir).length === 0) {
    const backupDir = path.resolve(process.cwd(), 'scripts', 'images_backup');
    if (fs.existsSync(backupDir) && fs.readdirSync(backupDir).length > 0) {
      imagesDir = backupDir;
    }
  }

  const files = fs.readdirSync(imagesDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);
  });

  console.log(`[HF Sync] Found ${files.length} images to upload.`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(imagesDir, file);
    const buffer = fs.readFileSync(fullPath);
    const remotePath = `Images/${file}`;

    console.log(`[HF Sync] (${i + 1}/${files.length}) Uploading ${file} -> ${remotePath}...`);

    const commitPayload = {
      summary: `Upload ${file} to Images/ in ${HF_REPO}`,
      operations: [
        {
          key: 'file',
          value: buffer.toString('base64'),
          encoding: 'base64',
          path: remotePath
        }
      ]
    };

    try {
      const res = await fetch(`https://huggingface.co/api/datasets/${HF_REPO}/commit/main`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(commitPayload)
      });

      if (res.ok) {
        console.log(`  ✓ Successfully uploaded ${file}`);
      } else {
        const txt = await res.text();
        console.error(`  ✗ Failed to upload ${file} (${res.status}): ${txt}`);
      }
    } catch (err) {
      console.error(`  ✗ Error uploading ${file}:`, err.message);
    }
  }

  console.log(`[HF Sync] Complete! Images are accessible at:`);
  console.log(`https://huggingface.co/datasets/${HF_REPO}/resolve/main/Images/<filename>`);
}

syncImages().catch(err => {
  console.error('[HF Sync Fatal]:', err);
  process.exit(1);
});
