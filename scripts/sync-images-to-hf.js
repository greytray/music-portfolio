#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { uploadFiles, commit } from '@huggingface/hub';

// Load .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      process.env[key] = val;
    }
  }
}

const HF_REPO = 'greyhugging/RawStorage';
const HF_TOKEN = process.env.HF_ACCESS_TOKEN;

async function run() {
  console.log('[HF Upload] Using @huggingface/hub SDK');
  console.log('[HF Upload] Target repo:', HF_REPO);

  let imagesDir = path.resolve(process.cwd(), 'assets', 'images');
  if (!fs.existsSync(imagesDir)) {
    imagesDir = path.resolve(process.cwd(), 'scripts', 'images_backup');
  }

  const files = fs.readdirSync(imagesDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(ext);
  });

  console.log(`[HF Upload] Preparing ${files.length} files...`);

  const fileObjects = [];
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const buffer = fs.readFileSync(filePath);
    const blob = new Blob([buffer]);
    fileObjects.push({
      path: `Images/${file}`,
      content: blob
    });
    console.log(`  + Queued: Images/${file} (${buffer.length} bytes)`);
  }

  console.log('[HF Upload] Committing files to Hugging Face dataset...');

  const result = await commit({
    repo: { type: 'dataset', name: HF_REPO },
    credentials: { accessToken: HF_TOKEN },
    title: 'Upload all catalog images to Images/ folder',
    operations: fileObjects.map(f => ({
      operation: 'addOrUpdate',
      path: f.path,
      content: f.content
    }))
  });

  console.log('✓ Successfully committed all images to Hugging Face!');
  console.log('Result:', result);
}

run().catch(err => {
  console.error('✗ Upload error:', err);
  process.exit(1);
});
