# CloudConsoleVibe Scripts

This directory contains all the utility and deployment scripts for the CloudConsoleVibe project.

## 🚀 Deployment Scripts

### `deploy-full-stack.sh`
**Purpose:** Complete full-stack deployment including frontend and backend services.
```bash
./scripts/deploy-full-stack.sh
```
- Builds and deploys both frontend and backend
- Sets up Cloud Run services
- Configures environment variables
- Runs post-deployment verification

### `deploy.sh`
**Purpose:** Frontend-only deployment to Cloud Run.
```bash
./scripts/deploy.sh
```
- Builds Angular application
- Creates Docker image
- Deploys to Cloud Run
- Updates service configuration

### `deploy-cloudbuild.sh`
**Purpose:** Deployment using Google Cloud Build.
```bash
./scripts/deploy-cloudbuild.sh
```
- Triggers Cloud Build pipeline
- Uses cloudbuild.yaml configuration
- Automated build and deployment process

## ⚙️ Setup Scripts

### `setup-dev-environment.sh`
**Purpose:** Sets up local development environment.
```bash
./scripts/setup-dev-environment.sh
```
- Installs dependencies
- Configures environment files
- Sets up local development server
- Verifies setup completion

### `setup-iam.sh`
**Purpose:** Configures Google Cloud IAM permissions.
```bash
./scripts/setup-iam.sh
```
- Creates service accounts
- Assigns necessary roles
- Sets up IAM policies
- Configures Cloud Run permissions

## 🔍 Verification Scripts

### `verify-setup.sh`
**Purpose:** Verifies development environment setup.
```bash
./scripts/verify-setup.sh
```
- Checks environment configuration
- Validates API key setup
- Tests local development server
- Verifies dependencies

### `verify-production-deployment.sh`
**Purpose:** Verifies production deployment status.
```bash
./scripts/verify-production-deployment.sh
```
- Checks Cloud Run service status
- Validates environment variables
- Tests production endpoints
- Verifies SSL certificates

## 📋 Prerequisites

Before running any scripts, ensure you have:

1. **Google Cloud CLI** installed and authenticated
2. **Node.js** and **npm** installed
3. **Docker** installed (for deployment scripts)
4. **Proper permissions** in your Google Cloud project

## 🔧 Usage Guidelines

### Making Scripts Executable
```bash
chmod +x scripts/*.sh
```

### Running from Project Root
All scripts should be run from the project root directory:
```bash
# Good
./scripts/deploy.sh

# Avoid
cd scripts && ./deploy.sh
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

## 🔄 Script Dependencies

```
setup-dev-environment.sh → verify-setup.sh
setup-iam.sh → deploy.sh → verify-production-deployment.sh
```

## 📝 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/script-name.sh
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