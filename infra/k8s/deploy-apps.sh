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

kubectl apply -f "$DIR/apps/burner-backend.yaml"
