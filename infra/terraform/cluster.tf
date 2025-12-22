data "hcloud_image" "k8s_base" {
  with_selector = "os=talos,version=v1.11.6,arch=amd64"
  most_recent   = true
}

variable "control_plane_nodes" {
  type = list(object({
    id          = string
    region      = string
    server_type = string
  }))
  default = [
    { id = "1", region = "nbg1", server_type = "cpx22" },
    # { id = "2", region = "hel1", server_type = "cpx22" },
    { id = "3", region = "nbg1", server_type = "cpx22" }
  ]
}

resource "hcloud_server" "k8s_control_plane" {
  for_each    = { for node in var.control_plane_nodes : node.id => node }
  name        = "k8s-control-plane-${each.value.id}"
  image       = data.hcloud_image.k8s_base.id
  server_type = each.value.server_type
  location    = each.value.region
  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }
}

output "control_plane_nodes" {
  description = "Control plane nodes with their IDs and IPv4 addresses"
  value = {
    for id, server in hcloud_server.k8s_control_plane : id => {
      id   = id
      ipv4 = server.ipv4_address
    }
  }
}

output "used_image" {
  description = "The image used for k8s control plane nodes"
  value = {
    id          = data.hcloud_image.k8s_base.id
    name        = data.hcloud_image.k8s_base.name
    description = data.hcloud_image.k8s_base.description
  }
}

# resource "hcloud_ssh_key" "temp_key" {
#   name       = "temp-k8s-node-2-${formatdate("YYYYMMDDhhmmss", timestamp())}"
#   public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
# }

# resource "hcloud_server" "k8s_node_with_setup" {
#   name        = "k8s-node-2"
#   image       = "ubuntu-22.04"
#   server_type = "cx23"
#   location    = "nbg1"
#   ssh_keys    = [hcloud_ssh_key.temp_key.id]

#   user_data = templatefile("${path.module}/setup.sh", {
#     k8s_version = var.k8s_version
#   })
# }

# resource "null_resource" "wait_for_setup" {
#   depends_on = [hcloud_server.k8s_node_with_setup]

#   provisioner "remote-exec" {
#     inline = [
#       "cloud-init status --wait",
#       "exit $(cat /tmp/setup_exit_code 2>/dev/null || echo 0)"
#     ]

#     connection {
#       type        = "ssh"
#       host        = hcloud_server.k8s_node_with_setup.ipv4_address
#       user        = "root"
#       private_key = file(pathexpand("~/.ssh/id_rsa"))
#     }
#   }
# }

# output "snapshot_info" {
#   description = "Information about the K8s base snapshot"
#   value = {
#     id          = data.hcloud_image.k8s_base.id
#     name        = data.hcloud_image.k8s_base.name
#     description = data.hcloud_image.k8s_base.description
#   }
# }
