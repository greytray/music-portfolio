# Eko Music Portfolio

## Asset & Image Storage Architecture

All project images are hosted and fetched from Hugging Face RawStorage dataset:
- **Repository:** `greyhugging/RawStorage`
- **Path:** `Images/<filename>`
- **Direct CDN URL:** `https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main/Images/<filename>`
- **Proxy Route:** `/api/media?file=Images/<filename>`

### Environment Variables
- `HF_ACCESS_TOKEN`: Your Hugging Face write access token (required for uploading and committing new images).
- `HF_DATASET_URL`: `https://huggingface.co/datasets/greyhugging/RawStorage/resolve/main`

### Image Generations & Uploads
All future image uploads and generations from Google AI Studio or the Admin Panel are saved to the Hugging Face dataset at `Images/` instead of the local GitHub repository. The `assets/images/` path in the Git repository is deprecated and excluded via `.gitignore`.
