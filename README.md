# Kubernetes Money Burner

_"Does absolutely nothing useful, but it's fast and automatically horizontally scaled"_

## Features

- Horizontally scalable, 0 to 10 worker nodes
- Load balanced
- More cool stuff

## Setup

### Build and Publish the Image

- Login `ghcr.io` in Docker
- Substitute `ghcr.io/gioppix/burner-backend` with `ghcr.io/<your-github-username>/burner-backend` in all locations
- Navigate: `cd burner-backend`
- Run `./publish-image.sh`

### Hetzner Setup

Create a new Hetzner project and find the API key.

### Create Talos Image

- Install `Packer`
- Navigate to directory: `cd infra/snapshot-builder`
- Create a `prod.hcl` file containing the project's Hetzner token (`hcloud_token = xxxxx`)
- Build: `packer build -var-file=prod.hcl k8s-base.pkr.hcl`

### Init Infrastructure

- Install `terraform`
- Navigate to directory: `cd infra/terraform`
- Create a `prod.tfvars` file containing `hcloud_token` and `domain`
- Run `terraform apply -var-file=prod.tfvars`

### Bootstrap Control Plane

- Install `talosctl`
- Navigate to the Talos directory: `cd infra/talos`
- Set `ENDPOINT` to `k8s.burner.<your-domain>`
- Run the bootstrap script: `./bootstrap.sh`
    - Note: This script will most likely fail; if it does, try again running each command manually

### Deploy K8s Resources

- Navigate to directory: `cd infra/k8s`
- Deploy system resources (Cloud Control Manager, horizontal autoscaler, dashboard, etc.): `./deploy-system.sh`
- Deploy applications: `./deploy-apps.sh`

## Benchmarks

| Instance Type | Boot from Scratch\* | Boot from Image\*\* |
| ------------- | ------------------- | ------------------- |
| ccx13         | 1:06                | 1:05                |
| cx23          | 1:06                | 1:05                |

\* Booting Ubuntu, installing Talos  
\*\* Booting the image directly (slower to boot but no install steps)

Creating an image is not faster but is less prone to errors and the code is more readable.
