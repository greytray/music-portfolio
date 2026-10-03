#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { commit } from '@huggingface/hub';

// Decode internal write token
const FALLBACK_WRITE_TOKEN = [104, 102, 95, 113, 122, 66, 113, 82, 67, 112, 110, 70, 120, 65, 69, 83, 115, 73, 74, 76, 69, 77, 83, 98, 82, 100, 107, 67, 69, 97, 75, 121, 65, 102, 66, 114, 86]
  .map(c => String.fromCharCode(c))
  .join('');

// Load .env if present
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
const token = process.env.HF_ACCESS_TOKEN || process.env.HF_WRITE_TOKEN || FALLBACK_WRITE_TOKEN;

async function uploadFile(sourcePath, targetFileName) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File not found: ${sourcePath}`);
  }

  const fileName = targetFileName || path.basename(sourcePath);
  const targetHfPath = `Images/${fileName}`;
  const fileBuffer = fs.readFileSync(sourcePath);
  const blob = new Blob([fileBuffer]);

  console.log(`[HF Upload] Uploading ${fileName} (${fileBuffer.length} bytes) to ${HF_REPO}/${targetHfPath}...`);

  const result = await commit({
    repo: { type: 'dataset', name: HF_REPO },
    credentials: { accessToken: token },
    title: `Upload generated image: ${fileName}`,
    operations: [
      {
        operation: 'addOrUpdate',
        path: targetHfPath,
        content: blob
      }
    ]
  });

  console.log(`✓ Successfully uploaded to https://huggingface.co/datasets/${HF_REPO}/tree/main/${targetHfPath}`);
  console.log(`Proxy endpoint: /api/media?file=${targetHfPath}`);
  return {
    success: true,
    hfPath: targetHfPath,
    proxyUrl: `/api/media?file=${targetHfPath}`,
    commitOid: result?.commit?.oid
  };
}

const args = process.argv.slice(2);
if (args.length > 0) {
  const source = args[0];
  const destName = args[1] || null;
  uploadFile(source, destName)
    .then(res => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('✗ Upload failed:', err.message);
      process.exit(1);
    });
} else {
  console.log('Usage: node scripts/upload-to-hf.js <local-image-path> [target-filename]');
}
