#!/bin/bash
set -e

# Path to the directory where this script resides
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$DIR/../.."

KUBECONFIG="$DIR/kubeconfig.yaml"

if [ ! -f "$KUBECONFIG" ]; then
    echo "Error: kubeconfig not found at $KUBECONFIG"
    exit 1
fi

export KUBECONFIG

if [ -z "$HCLOUD_TOKEN" ]; then
    echo "Error: HCLOUD_TOKEN environment variable is not set."
    echo "Please export your Hetzner Cloud API Token:"
    echo "  export HCLOUD_TOKEN=your-token-here"
    exit 1
fi

echo "--> Updating HCloud Secret..."
# Create the secret manifest dynamically to avoid storing the token in a file
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: hcloud
  namespace: kube-system
stringData:
  token: "$HCLOUD_TOKEN"
  network: "k8s-network"
EOF

echo "--> Applying Hetzner Cloud Controller Manager..."
kubectl apply -f "$DIR/system/hccm.yaml"

echo "--> Preparing Worker User Data..."
WORKER_CONFIG="$PROJECT_ROOT/infra/talos/worker.yaml"
if [ ! -f "$WORKER_CONFIG" ]; then
    echo "Error: Worker config not found at $WORKER_CONFIG"
    exit 1
fi

# Base64 encode the worker config
export WORKER_USER_DATA=$(base64 < "$WORKER_CONFIG" | tr -d '\n')

echo "--> Fetching Image ID from Terraform..."
export HCLOUD_IMAGE=$(cd "$PROJECT_ROOT/infra/main" && terraform output -json used_image | jq -r '.id')

if [ -z "$HCLOUD_IMAGE" ] || [ "$HCLOUD_IMAGE" == "null" ]; then
    echo "Error: Could not fetch HCLOUD_IMAGE from terraform output."
    exit 1
fi
echo "Using Image ID: $HCLOUD_IMAGE"

echo "--> Deploying Cluster Autoscaler..."

# Note: envsubst < file substitutes all environment variables.
envsubst < "$DIR/system/autoscaler-template.yaml" | kubectl apply -f -

echo "--> Deploying Kubernetes Dashboard..."
helm repo add kubernetes-dashboard https://kubernetes.github.io/dashboard/
helm repo update
helm upgrade --install kubernetes-dashboard kubernetes-dashboard/kubernetes-dashboard --create-namespace --namespace kubernetes-dashboard

echo "--> Configuring Dashboard Access..."
kubectl apply -f "$DIR/system/dashboard-user.yaml"

# Wait a moment for the secret to be populated
sleep 2

# Retrieve token
kubectl -n kubernetes-dashboard create token admin-user | pbcopy

echo ""
echo "========================================================================"
echo "KUBERNETES DASHBOARD ACCESS"
echo "========================================================================"
echo "1. TOKEN already copied to clipboard"
echo ""
echo "2. START TUNNEL (Run this command):"
echo "   kubectl -n kubernetes-dashboard port-forward svc/kubernetes-dashboard-kong-proxy 8443:443"
echo ""
echo "3. OPEN BROWSER:"
echo "   https://localhost:8443"
echo "========================================================================"

echo "--> Done! System components are deployed."
