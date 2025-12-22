resource "hcloud_network" "k8s" {
  name     = "k8s-network"
  ip_range = "192.168.0.0/16"
}

resource "hcloud_network_subnet" "k8s" {
  network_id   = hcloud_network.k8s.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "192.168.1.0/24"
}

resource "hcloud_server_network" "k8s_control_plane" {
  for_each   = hcloud_server.k8s_control_plane
  server_id  = each.value.id
  network_id = hcloud_network.k8s.id
}
