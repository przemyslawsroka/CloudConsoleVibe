# Cloud Run Deployment Guide

This guide will help you deploy the Cloud Console Vibe application to Google Cloud Run.

## 📋 Prerequisites

1. **Google Cloud Project**: You need a GCP project with billing enabled
2. **gcloud CLI**: Install and configure the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install [Docker](https://docs.docker.com/get-docker/) for local builds
4. **Permissions**: You need Project Editor or Owner role on the GCP project

## 🚀 Quick Start

### 1. Authentication and Setup

```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your project ID (replace with your actual project ID)
export PROJECT_ID="your-gcp-project-id"
gcloud config set project $PROJECT_ID
```

### 2. Set Up IAM (Run Once)

```bash
# Make scripts executable
chmod +x setup-iam.sh deploy.sh

# Set up service account and permissions
PROJECT_ID="your-project-id" ./setup-iam.sh
```

### 3. Deploy to Cloud Run

```bash
# Deploy the application
PROJECT_ID="your-project-id" ./deploy.sh
```

That's it! Your application will be available at the Cloud Run service URL.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for optimized production image |
| `nginx.conf` | Nginx configuration with security headers and SPA routing |
| `docker-entrypoint.sh` | Container startup script |
| `env-config.sh` | Runtime environment variable injection |
| `env-config.js` | Default environment configuration |
| `cloudbuild.yaml` | CI/CD pipeline configuration |
| `cloud-run-service.yaml` | Declarative Cloud Run service definition |
| `deploy.sh` | Automated deployment script |
| `setup-iam.sh` | IAM and service account setup |

## 🔧 Configuration

### Environment Variables

You can configure the application using environment variables:

```bash
# Deploy with custom environment variables
gcloud run deploy cloud-console-vibe \
    --image gcr.io/$PROJECT_ID/cloud-console-vibe:latest \
    --set-env-vars \
    API_BASE_URL="https://your-backend-api.com",\
    CLIENT_ID="your-oauth-client-id",\
    LOG_LEVEL="info",\
    ENABLE_ANALYTICS="true"
```

### Available Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `https://compute.googleapis.com/compute/v1` | Backend API endpoint |
| `AUTH_DOMAIN` | `accounts.google.com` | OAuth authentication domain |
| `CLIENT_ID` | (empty) | Google OAuth client ID |
| `ENVIRONMENT` | `production` | Application environment |
| `LOG_LEVEL` | `error` | Logging level (error, warn, info, debug) |
| `ENABLE_ANALYTICS` | `true` | Enable/disable analytics |

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Browser  │────│   Cloud Run      │────│  GCP APIs       │
│                 │    │                  │    │                 │
│  Angular SPA    │    │  Nginx + Static  │    │  Compute, DNS,  │
│  (Static Files) │    │  Files           │    │  Monitoring etc │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

- **Frontend**: Angular SPA served as static files
- **Web Server**: Nginx for serving static content and SPA routing
- **Container**: Docker container running on Cloud Run
- **APIs**: Direct calls to Google Cloud APIs (requires proper authentication)

## 🔒 Security Features

- **Security Headers**: CSP, XSS protection, HTTPS enforcement
- **Service Account**: Minimal IAM permissions
- **HTTPS Only**: Automatic HTTPS termination via Cloud Run
- **Private Container Registry**: Images stored in Google Container Registry

## 📊 Monitoring and Health Checks

### Health Check Endpoint

```bash
curl https://your-service-url/health
# Response: "healthy"
```

### Logs

```bash
# View application logs
gcloud run logs tail cloud-console-vibe --region=us-central1

# View logs in Cloud Console
gcloud run logs read cloud-console-vibe --region=us-central1
```

### Metrics

- Cloud Run automatically provides CPU, memory, and request metrics
- Custom application metrics can be sent to Cloud Monitoring
- Set up alerting policies in Cloud Monitoring

## 🚀 CI/CD with Cloud Build

### Setup Cloud Build

```bash
# Enable Cloud Build API
gcloud services enable cloudbuild.googleapis.com

# Grant Cloud Build permissions to deploy to Cloud Run
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@cloudbuild.gserviceaccount.com" \
    --role="roles/run.developer"
```

### Trigger Build

```bash
# Manual build
gcloud builds submit --config cloudbuild.yaml

# Set up automated builds from Git repository
gcloud builds triggers create github \
    --repo-name="your-repo" \
    --repo-owner="your-github-username" \
    --branch-pattern="^main$" \
    --build-config="cloudbuild.yaml"
```

## 🔧 Customization

### Custom Domain

```bash
# Map custom domain
gcloud run domain-mappings create \
    --service cloud-console-vibe \
    --domain your-domain.com \
    --region us-central1
```

### Scaling Configuration

```bash
# Update scaling settings
gcloud run services update cloud-console-vibe \
    --min-instances 1 \
    --max-instances 20 \
    --concurrency 50 \
    --region us-central1
```

### Resource Limits

```bash
# Update resource limits
gcloud run services update cloud-console-vibe \
    --memory 2Gi \
    --cpu 2 \
    --region us-central1
```

## 🐛 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build logs
   gcloud builds log [BUILD_ID]
   ```

2. **Deployment Errors**
   ```bash
   # Check service logs
   gcloud run logs read cloud-console-vibe --region=us-central1
   ```

3. **Permission Issues**
   ```bash
   # Verify service account permissions
   gcloud projects get-iam-policy $PROJECT_ID
   ```

### Debug Commands

```bash
# Get service details
gcloud run services describe cloud-console-vibe --region=us-central1

# List revisions
gcloud run revisions list --service=cloud-console-vibe --region=us-central1

# Check container logs
gcloud run logs tail cloud-console-vibe --region=us-central1
```

## 💰 Cost Optimization

- **Cold Starts**: Set `--min-instances 0` to scale to zero when not in use
- **Resource Limits**: Use appropriate CPU and memory limits
- **Request Timeout**: Set reasonable timeout values
- **Concurrency**: Optimize concurrency settings based on your workload

## 🔄 Updates and Rollbacks

### Deploy New Version

```bash
# Deploy new version
PROJECT_ID="your-project-id" IMAGE_TAG="v2.0.0" ./deploy.sh
```

### Rollback

```bash
# List revisions
gcloud run revisions list --service=cloud-console-vibe --region=us-central1

# Rollback to previous revision
gcloud run services update-traffic cloud-console-vibe \
    --to-revisions=cloud-console-vibe-00001-xyz=100 \
    --region=us-central1
```

## 📚 Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Container Image Best Practices](https://cloud.google.com/solutions/best-practices-for-building-containers)
- [Cloud Run Security](https://cloud.google.com/run/docs/securing/ingress)
- [Monitoring Cloud Run](https://cloud.google.com/run/docs/monitoring)

## 🆘 Support

If you encounter issues:

1. Check the [Cloud Run troubleshooting guide](https://cloud.google.com/run/docs/troubleshooting)
2. Review application logs in Cloud Console
3. Verify IAM permissions and service account configuration
4. Test locally with Docker to isolate container issues 