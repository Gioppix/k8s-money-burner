#!/bin/bash

set -e

# Configuration
IMAGE_NAME="ghcr.io/gioppix/burner-backend"
VERSION="0.2"
K8S_DEPLOYMENT="../infra/k8s/apps/burner-backend.yaml"

# Build and push images
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "${IMAGE_NAME}:latest" \
  -t "${IMAGE_NAME}:${VERSION}" \
  . \
  --push

# Update the Kubernetes deployment with the new version
if [ ! -f "$K8S_DEPLOYMENT" ]; then
  echo "Error: ${K8S_DEPLOYMENT} not found"
  exit 1
fi
sed -i '' "s|image:.*|image: ${IMAGE_NAME}:${VERSION}|" "$K8S_DEPLOYMENT"

echo "(probably) updated image to ${IMAGE_NAME}:${VERSION} in ${K8S_DEPLOYMENT}"
