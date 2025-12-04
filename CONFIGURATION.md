# Configuration Guide

This document explains how to configure games and scores persistence for Google Cloud Run deployment.

## Overview

- **scores.json**: Stored in Google Cloud Storage, persists across redeployments
- **games.json**: Stored in GitHub Secrets, activated states controlled via Cloud Run environment variables

## Setup Instructions

### 1. Create Cloud Storage Bucket for Scores

Scores are persisted in Google Cloud Storage to survive redeployments.

```bash
# Create the bucket (if it doesn't exist)
gsutil mb -p YOUR_PROJECT_ID -l europe-west1 gs://adventgames-scores

# Or using gcloud
gcloud storage buckets create gs://adventgames-scores \
  --project=YOUR_PROJECT_ID \
  --location=europe-west1
```

A dedicated service account is used to access Cloud Storage. The service account key is stored in GitHub Secrets and passed as an environment variable to Cloud Run.

**Setup Steps:**

1. **Grant service account access to the bucket:**
```bash
gsutil iam ch serviceAccount:storageaccess@adventgames.iam.gserviceaccount.com:roles/storage.objectAdmin gs://adventgames-scores
```

**How it works:**
- The JSON key is stored in GitHub Secrets as `GCP_STORAGE_ADMIN_KEY`
- During deployment, it's passed as an environment variable to Cloud Run
- When the server starts, it writes the JSON key to `/app/gcloud-storage-admin-key.json`
- The Google Cloud Storage client reads the key file for authentication

### 2. Configure GitHub Secrets

#### GAMES_CONFIG Secret

1. Go to your GitHub repository: Settings > Secrets and variables > Actions
2. Create a new secret named `GAMES_CONFIG`
3. Use the template file `games.template.json` as a reference, or copy the contents of your `games.json` file but **remove the `activated` field** from each game

**Example format for GAMES_CONFIG (see `games.template.json` for the template):**

```json
{
  "games": [
    {
      "code": "SNOWFLAKE2024",
      "name": "snowflake",
      "title": "❄️ Snowflake Tapper",
      "description": "Tap snowflakes before they hit the ground!",
      "path": "/snowflake"
    },
    {
      "code": "FLAPPYBIRD2024",
      "name": "flappybird",
      "title": "🐦 Family Flappy Bird",
      "description": "Choose your character and fly through obstacles!",
      "path": "/flappybird"
    }
  ]
}
```

**Note:** Do NOT include the `activated` field in the secret. Activation is controlled via Cloud Run environment variables.

#### GCP_STORAGE_ADMIN_KEY Secret

1. Go to your GitHub repository: Settings > Secrets and variables > Actions
2. Create a new secret named `GCP_STORAGE_ADMIN_KEY`
3. Paste the entire JSON key file contents for the service account `storageaccess@adventgames.iam.gserviceaccount.com`
   - This is the service account that has access to the Cloud Storage bucket
   - The JSON key should include all fields: `type`, `project_id`, `private_key_id`, `private_key`, `client_email`, `client_id`, etc.
   - Copy the entire contents of the JSON key file (including all braces, quotes, and newlines)

**How it works:**
- During GitHub Actions build, the JSON key is written to `gcloud-storage-admin-key.json` from the secret
- The Dockerfile copies this file into the Docker image at `/app/gcloud-storage-admin-key.json`
- When the server starts, it reads the key file (no writing needed)
- The Google Cloud Storage client uses the key file for authentication
- The file is in `.gitignore` and never committed to the repository

#### Optional: SCORES_BUCKET_NAME Secret

If you want to use a different bucket name than the default `adventgames-scores`, create a secret named `SCORES_BUCKET_NAME` with your bucket name.

### 3. Configure Cloud Run Environment Variables for Game Activation

Game activation is controlled via environment variables in Cloud Run. The format is:

```
GAME_<CODE>_ACTIVATED=true
```

For example:
- `GAME_FLAPPYBIRD2024_ACTIVATED=true` - activates the Flappy Bird game
- `GAME_SNOWFLAKE2024_ACTIVATED=false` - deactivates the Snowflake game

#### Option A: Set via Cloud Console

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your service (`adventgames`)
3. Click **Edit & Deploy New Revision**
4. Go to **Variables & Secrets** tab
5. Add environment variables:
   - Click **Add Variable**
   - Name: `GAME_FLAPPYBIRD2024_ACTIVATED`
   - Value: `true`
   - Repeat for each game you want to activate
6. Click **Deploy**

#### Option B: Set via gcloud CLI

```bash
gcloud run services update adventgames \
  --region europe-west1 \
  --update-env-vars GAME_FLAPPYBIRD2024_ACTIVATED=true,GAME_SNOWFLAKE2024_ACTIVATED=false
```

#### Option C: Update GitHub Actions Workflow

You can also add activation variables directly in the deployment workflow:

```yaml
--set-env-vars NODE_ENV=production,GAMES_CONFIG="${{ secrets.GAMES_CONFIG }}" \
--set-env-vars GAME_FLAPPYBIRD2024_ACTIVATED=true \
--set-env-vars GAME_SNOWFLAKE2024_ACTIVATED=false
```

## Adding New Games

To add a new game:

1. **Update GitHub Secret `GAMES_CONFIG`**:
   - Go to GitHub repository > Settings > Secrets and variables > Actions
   - Edit the `GAMES_CONFIG` secret
   - Add your new game (without `activated` field)
   - Save

2. **Activate the game** (if needed):
   - Set the environment variable in Cloud Run: `GAME_<CODE>_ACTIVATED=true`
   - Or update the GitHub Actions workflow to include it

3. **Redeploy**:
   - Push to main branch (triggers auto-deploy)
   - Or manually trigger the workflow

## Development Mode

In development mode (local), the system will:
- Use local `games.json` file (if it exists)
- Use local `scores.json` file
- Fall back to environment variables if `games.json` is not found

You can still use `games.json` locally for development, but remember:
- The `activated` field in local `games.json` will be overridden by environment variables if they exist
- For production, always use GitHub Secrets + Cloud Run env vars

## API Key Security

The backend API is protected with an API key to prevent unauthorized access. The same key must be embedded in the frontend build and configured on the backend.

### Setup

1. **Generate an API key** (use a strong random string):
   ```bash
   # Example: Generate a random 32-character key
   openssl rand -hex 16
   ```

2. **Set the API key for the backend**:
   - **Development**: Set `API_KEY` environment variable (or use default `dev-api-key-12345`)
   - **Production (Cloud Run)**: Add as environment variable `API_KEY` in Cloud Run settings

3. **Set the API key for the frontend build**:
   - **Development**: No key needed (uses empty string, backend allows it in dev mode)
   - **Production**: Set `VITE_API_KEY` environment variable during build:
     ```bash
     VITE_API_KEY=your-api-key-here npm run build
     ```
   - **GitHub Actions**: Add `VITE_API_KEY` as a GitHub Secret and use it in the build step:
     ```yaml
     - name: Build
       env:
         VITE_API_KEY: ${{ secrets.API_KEY }}
       run: npm run build
     ```

### How it works

- The API key is embedded in the frontend JavaScript bundle at build time
- All API requests include the key in the `X-API-Key` header
- The backend validates the key on all `/api/*` routes
- In development mode, validation is skipped if no key is set (for easier local development)

### Security Notes

⚠️ **Important**: Embedding the API key in frontend code is not 100% secure since anyone can view the source code. However, it provides:
- Protection against casual abuse and scraping
- A barrier for automated bots
- Can be combined with rate limiting and other security measures

For stronger security, consider:
- Rate limiting on the backend
- CORS restrictions
- IP whitelisting (if applicable)
- Additional authentication layers

## Troubleshooting

### Scores not persisting

- Verify the Cloud Storage bucket exists
- Check that the Cloud Run service account has `storage.objectAdmin` role on the bucket
- Check Cloud Run logs for errors

### Games not showing up

- Verify `GAMES_CONFIG` secret is set correctly in GitHub
- Check that the JSON format is valid (no `activated` fields)
- Verify environment variables are set in Cloud Run
- Check server logs for parsing errors

### Game activation not working

- Verify the environment variable format: `GAME_<CODE>_ACTIVATED=true`
- Check that the code matches exactly (case-sensitive)
- Restart the Cloud Run service after changing env vars

### API requests failing with 401/403

- Verify `API_KEY` is set in backend environment
- Verify `VITE_API_KEY` was set during frontend build
- Check that the same key is used in both frontend and backend
- In development, ensure backend allows requests without key (or set `API_KEY=dev-api-key-12345`)

