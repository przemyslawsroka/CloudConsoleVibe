# CloudConsoleVibe Scripts

This directory contains all the utility and deployment scripts for the CloudConsoleVibe project.

## 🚀 Deployment Scripts

### `deploy-all.sh`
**Purpose:** Complete full-stack deployment including frontend and backend services.
```bash
./deploy/deploy-all.sh
```
- Deploys the backend service.
- Deploys the frontend service.
- Configures CORS on the backend to allow requests from the frontend.
- Generates a configuration file for the monitoring agent.

### `deploy-backend.sh`
**Purpose:** Backend-only deployment to Cloud Run.
```bash
./deploy/deploy-backend.sh
```
- Builds and deploys the backend service.
- Sets up the Cloud Run service for the backend.

### `deploy-frontend.sh`
**Purpose:** Frontend-only deployment to Cloud Run.
```bash
./deploy/deploy-frontend.sh
```
- Fetches the backend URL.
- Updates frontend configuration to point to the backend.
- Builds and deploys the frontend service.
- Sets up the Cloud Run service for the frontend.

## ⚙️ Setup Scripts

### `setup-dev-environment.sh`
**Purpose:** Sets up local development environment.
```bash
./deploy/setup-dev-environment.sh
```
- Installs dependencies
- Configures environment files
- Sets up local development server
- Verifies setup completion

### `setup-iam.sh`
**Purpose:** Configures Google Cloud IAM permissions.
```bash
./deploy/setup-iam.sh
```
- Creates service accounts
- Assigns necessary roles
- Sets up IAM policies
- Configures Cloud Run permissions

## 📋 Prerequisites

Before running any scripts, ensure you have:

1. **Google Cloud CLI** installed and authenticated
2. **Node.js** and **npm** installed
3. **Docker** installed (for deployment scripts)
4. **Proper permissions** in your Google Cloud project

## 🔧 Usage Guidelines

### Making Scripts Executable
```bash
chmod +x deploy/*.sh
```

### Running from Project Root
All scripts should be run from the project root directory:
```bash
# Good
./deploy/deploy-all.sh

# Avoid
cd deploy && ./deploy-all.sh
```

### Environment Variables
Some scripts require environment variables to be set:
```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
export REGION="us-central1"
```

## 🚨 Important Notes

- **Always test in development** before running production scripts
- **Review script contents** before execution
- **Backup important data** before running deployment scripts
- **Check permissions** if scripts fail with access errors

## 📝 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x deploy/script-name.sh
   ```

2. **Google Cloud Authentication**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Missing Dependencies**
   ```bash
   npm install
   ```

4. **Docker Issues**
   ```bash
   docker --version
   gcloud auth configure-docker
   ```

## 🔗 Related Documentation

- [Deployment Guide](../docs/deployment/DEPLOYMENT_GUIDE.md)
- [Security Setup](../docs/security/SECURITY_SETUP.md)
- [Setup Complete](../docs/setup/SETUP_COMPLETE.md) 