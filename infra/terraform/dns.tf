resource "hcloud_zone" "main" {
  name = var.domain
  mode = "primary"
  ttl  = 3600
}

resource "hcloud_zone_rrset" "k8s_domain" {
  zone = hcloud_zone.main.name
  name = "k8s.burner"
  type = "A"
  ttl  = 300
  records = [
    for server in hcloud_server.k8s_control_plane : { value = server.ipv4_address }
  ]
}
