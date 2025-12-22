#!/bin/bash

# TODO
# - create controlplane, worker
# - create talosconfig, kubeconfig

set -e

export ENDPOINT="k8s.burner.giovannifeltrin.com"
export CLUSTER_NAME="burner-cluster"

talosctl gen secrets -o secrets.yaml

talosctl gen config --with-secrets secrets.yaml $CLUSTER_NAME https://$ENDPOINT:6443
mv ./talosconfig ./talosconfig.yaml

# Apply patches
talosctl machineconfig patch controlplane.yaml --patch @nodes-patch.yaml --output controlplane.yaml
talosctl machineconfig patch worker.yaml --patch @nodes-patch.yaml --output worker.yaml

control_plane_ips=($(cd ../main && terraform output -json control_plane_nodes | jq -r '.[] | .ipv4'))

for ip in $control_plane_ips; do
  echo "Applying configuration to node $ip"
  talosctl apply-config --insecure \
    --nodes $ip \
    --file controlplane.yaml
  echo "  Configuration applied to $ip"
  sleep 1
done

sleep 1

export TALOSCONFIG=./talosconfig.yaml

talosctl config endpoint $control_plane_ips

# MUST be run in one node only
talosctl bootstrap --nodes ${control_plane_ips[1]}

sleep 1

talosctl kubeconfig ../k8s/kubeconfig.yaml --nodes ${control_plane_ips[1]}
