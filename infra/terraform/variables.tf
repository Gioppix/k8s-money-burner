variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  sensitive   = true
}

variable "domain" {
  description = "Domain"
  sensitive   = true
  default     = "giovannifeltrin.com"
}
