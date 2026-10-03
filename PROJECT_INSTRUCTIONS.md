# Google AI Studio — Custom Project Instructions

## Project Identity & Architecture
- **Repository**: `greytray/music-portfolio` (branch: `main`)
- **Production Host**: Cloudflare Pages (`https://ekomusic.pages.dev`)
- **Remote Asset Storage**: Hugging Face Dataset `greyhugging/RawStorage`
  - Images Directory: `https://huggingface.co/datasets/greyhugging/RawStorage/tree/main/Images`
  - Audio Directory: `https://huggingface.co/datasets/greyhugging/RawStorage/tree/main/showcase`
- **Media Delivery**: `/api/media?file=Images/<filename>` (Authenticated proxy with immutable caching, range support, and AWS S3 redirect handling)

---

## CRITICAL RULE 1: Never Break the Cloudflare Pages Build

1. **Lockfile Management**:
   - Cloudflare Pages runs `npm run build` using standard `package-lock.json`.
   - **NEVER** commit or introduce `bun.lock` (especially version 2+), as older Bun/Cloudflare build runners fail with `Unknown lockfile version`.
   - Always ensure `package-lock.json` is clean and committed.

2. **Build Verification**:
   - Always run `npm run build` before pushing any code to GitHub.
   - Ensure `dist/` builds without errors or missing imports.

3. **Cloudflare Functions Compatibility (`functions/`)**:
   - Any code under `functions/` runs on the Cloudflare Pages V8 runtime.
   - Do not import native Node.js modules (`node:fs`, `node:child_process`) inside request handlers unless guarded for edge execution.
   - In `functions/api/media.js`, always prioritize `context.env.HF_ACCESS_TOKEN` so user token changes in the Cloudflare dashboard take effect instantly without code changes.
   - Handle Hugging Face `302 Found` CDN redirects manually by stripping the `Authorization: Bearer` header on the redirected AWS S3 URL (AWS S3 rejects requests with both query-string HMAC signatures and Bearer headers).

---

## CRITICAL RULE 2: All Image Generations MUST Save to Hugging Face

Whenever generating or adding a new image:

1. **Generate the Image Asset**:
   - When using `generate_image` or generating an image file, save it to a local path (e.g., `dist/` or a temporary file).

2. **Upload Directly to Hugging Face**:
   - Run the dedicated upload tool:
     ```bash
     node scripts/upload-to-hf.js <path-to-image> [optional-target-filename]
     ```
   - Target destination: `https://huggingface.co/datasets/greyhugging/RawStorage/tree/main/Images/<filename>`.

3. **Use the Proxy Route in Frontend Code**:
   - In `index.html`, components, stores, or CSS, always reference the image through the authenticated proxy:
     ```html
     <img src="/api/media?file=Images/<filename>" alt="Description" />
     ```
   - Do **NOT** store large static image files in `public/assets/images/` inside the git repository.

4. **Sync Code with GitHub**:
   - After updating frontend code, push the changes to GitHub `greytray/music-portfolio` (`main`) to automatically trigger a zero-downtime Cloudflare Pages deployment.
