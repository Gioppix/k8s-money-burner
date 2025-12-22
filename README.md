# Kubernetes Money Burner

_"Does absolutely nothing useful, but it's fast and automatically horizontally scaled"_

## Features

- Horizontally scalable, 0 to 10 worker nodes
- Load balanced
- More cool stuff

## Setup

### Build and Publish the Image

- Login `ghcr.io` in Docker
- Navigate: `cd burner-backend`
- Substitute your username in `IMAGE_NAME` inside the script
- Run `./publish-image.sh`
- Make the image public in GitHub (just the first time)

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

### Benchmarks

## Image creation

| Instance Type | Boot from Scratch\* | Boot from Image\*\* |
| ------------- | ------------------- | ------------------- |
| ccx13         | 1:06                | 1:05                |
| cx23          | 1:06                | 1:05                |

\* Booting Ubuntu, installing Talos  
\*\* Booting the image directly (slower to boot but no install steps)

Creating an image is not faster but is less prone to errors and the code is more readable.

## Horizontal Autoscaling

### Conditions:

- Server type: `cpx42` (8 vCPU, 16gb)
- Task: Fibonacci of 40
- Duration: ~1h
- Pull-based load: instead of req/s, the load is set with concurrent req/s.

![Horizontal Autoscaling](stress/plot.png)

### Considerations:

We can see workers (pods) automatically scaling up and down following load. They reach ~45 pods, or around 9 servers.

In the beginning the addition of new nodes is very clear: you can see jumps of tasks/s at 400s and 600s (addition of second and third worker). This is because when new pods are scheduled they stay pending until there's enough capacity (new nodes joining the cluster).
As the workload increases the load is more evenly spread out and new nodes are less visible.

Latency stays pretty consistent overall, with the exception of periods with a sudden increase in requests.
