# Google Cloud Run Deployment Guide

This guide walks you through deploying Advent Games to Google Cloud Run using GitHub Actions.

## Prerequisites

- Google Cloud account with billing enabled
- GitHub account
- `gcloud` CLI installed locally (optional, for testing)

## Step 1: Set Up Google Cloud Project

### 1.1 Create a New Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `adventgames` (or your preferred name)
5. Note the **Project ID** (you'll need this later)
6. Click "Create"

### 1.2 Enable Required APIs

1. In the Cloud Console, go to **APIs & Services** > **Library**
2. Enable the following APIs:
   - **Cloud Run API**
   - **Container Registry API** (or **Artifact Registry API**)
   - **Cloud Build API** (if using Cloud Build)

You can also enable them via command line:

```bash
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 1.3 Create a Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name: `github-actions-deployer`
4. Description: `Service account for GitHub Actions to deploy to Cloud Run`
5. Click **Create and Continue**

### 1.4 Grant Permissions

Add the following roles to the service account:

1. **Cloud Run Admin** (`roles/run.admin`) - To deploy services
2. **Service Account User** (`roles/iam.serviceAccountUser`) - To use service accounts
3. **Artifact Registry Writer** (`roles/artifactregistry.writer`) - To push Docker images to Artifact Registry

You can add roles via the UI or command line:

```bash
# Replace PROJECT_ID and SERVICE_ACCOUNT_EMAIL with your values
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/artifactregistry.writer"
```

**Note:** The workflow will automatically create the Artifact Registry repository if it doesn't exist, but you can also create it manually:

```bash
gcloud artifacts repositories create adventgames \
  --repository-format=docker \
  --location=europe-west1 \
  --description="Docker repository for Advent Games"
```

### 1.5 Create and Download Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Click **Create** - the JSON file will download automatically
6. **Save this file securely** - you'll need it for GitHub Secrets

## Step 2: Configure GitHub Secrets

1. Go to your GitHub repository: `https://github.com/zappingseb/adventgames`
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**

Add the following secrets:

### `GCP_PROJECT_ID`
- **Name**: `GCP_PROJECT_ID`
- **Value**: Your Google Cloud Project ID (e.g., `adventgames-123456`)

### `GCP_SA_KEY`
- **Name**: `GCP_SA_KEY`
- **Value**: The entire contents of the JSON key file you downloaded
  - Open the JSON file in a text editor
  - Copy the entire contents (including `{` and `}`)
  - Paste into the secret value

## Step 3: Configure GitHub Actions Workflow

The workflow file is already created at `.github/workflows/deploy-cloud-run.yml`.

### Optional: Customize Deployment Settings

Edit `.github/workflows/deploy-cloud-run.yml` to customize:

- **REGION**: Change `us-central1` to your preferred region
- **SERVICE_NAME**: Change `adventgames` to your preferred service name
- **Memory/CPU**: Adjust `--memory 512Mi` and `--cpu 1` as needed
- **Min/Max Instances**: Adjust `--min-instances 0` and `--max-instances 10`

## Step 4: Deploy

### Automatic Deployment

1. Push to the `main` or `master` branch:
   ```bash
   git push origin main
   ```

2. GitHub Actions will automatically:
   - Build the Docker image
   - Push to Google Container Registry
   - Deploy to Cloud Run

3. Check the deployment status:
   - Go to **Actions** tab in your GitHub repository
   - Click on the latest workflow run
   - Watch the logs for progress

### Manual Deployment

You can also trigger deployment manually:

1. Go to **Actions** tab in your GitHub repository
2. Select **Deploy to Google Cloud Run** workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow**

## Step 5: Access Your Application

After deployment:

1. Go to [Cloud Run Console](https://console.cloud.google.com/run)
2. Click on your service name
3. Find the **URL** at the top (e.g., `https://adventgames-xxxxx.run.app`)
4. Your app is now live!

## Step 6: Set Up Custom Domain (Optional)

1. In Cloud Run console, click on your service
2. Go to **Custom Domains** tab
3. Click **Add Mapping**
4. Follow the instructions to verify domain ownership
5. Update your DNS records as instructed

## Important Notes

### Data Persistence

⚠️ **Cloud Run has an ephemeral filesystem** - data written to the container is lost when the instance stops.

The current implementation uses `/tmp` for data storage in Cloud Run, which means:
- Data persists only while the instance is running
- Data is lost when the instance scales to zero or restarts

**For production use, consider:**
- Using Cloud Firestore or Cloud SQL for persistent storage
- Using Cloud Storage for file-based storage
- Implementing a database-backed solution

### Environment Variables

You can add environment variables in the Cloud Run console:
1. Go to your Cloud Run service
2. Click **Edit & Deploy New Revision**
3. Go to **Variables & Secrets** tab
4. Add environment variables as needed

Or update the workflow file to include them in the deploy command.

### Monitoring and Logs

- **Logs**: View in Cloud Console under **Cloud Run** > **Logs**
- **Metrics**: Available in Cloud Run service details
- **Alerts**: Set up in Cloud Monitoring

## Troubleshooting

### Build Fails

- Check GitHub Actions logs for specific errors
- Verify all secrets are set correctly
- Ensure APIs are enabled in Google Cloud

### Deployment Fails

- Verify service account has correct permissions
- Check that the Docker image was pushed successfully
- Review Cloud Run logs for runtime errors

### Service Not Accessible

- Check that `--allow-unauthenticated` flag is set (or configure authentication)
- Verify the service is deployed and running
- Check Cloud Run service logs

### Image Size Issues

The Dockerfile is optimized for size:
- Uses Alpine Linux (minimal base image)
- Multi-stage build (removes build dependencies)
- Cleans npm cache after installation
- Uses `--no-audit --no-fund` flags

If you need to reduce size further:
- Use `.dockerignore` to exclude unnecessary files
- Consider using distroless images
- Optimize dependencies in `package.json`

## Cost Optimization

Cloud Run pricing is based on:
- **CPU and memory** allocated
- **Request count**
- **Request duration**
- **Instance hours** (when min-instances > 0)

To reduce costs:
- Set `--min-instances 0` (scales to zero when not in use)
- Use appropriate memory/CPU settings
- Enable request concurrency (default is 80)

## Security Best Practices

1. **Service Account**: Use least-privilege principle
2. **Secrets**: Never commit service account keys to git
3. **HTTPS**: Cloud Run provides HTTPS by default
4. **Authentication**: Consider adding authentication for admin endpoints
5. **CORS**: Configure CORS properly in your application

## Next Steps

- Set up monitoring and alerting
- Configure custom domain
- Implement persistent storage (Firestore/Cloud SQL)
- Set up CI/CD for multiple environments (staging/production)
- Add automated testing to the pipeline

