terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
}

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "depose"
}

variable "image_tag" {
  description = "Server image tag"
  type        = string
  default     = "latest"
}

variable "domain" {
  description = "Ingress host domain"
  type        = string
}

provider "kubernetes" {
  # Configure via kubeconfig or in-cluster auth.
}

provider "helm" {
  kubernetes {
    # Reuse the kubernetes provider config.
  }
}

resource "kubernetes_namespace" "depose" {
  metadata {
    name = var.namespace
  }
}

resource "helm_release" "depose" {
  name       = "depose"
  repository = "file://../../helm/twenty"
  chart      = "."
  namespace  = kubernetes_namespace.depose.metadata[0].name
  version    = "0.1.0"

  values = [
    yamlencode({
      server = {
        image = {
          repository = "depose/server"
          tag        = var.image_tag
        }
        env = {
          DATABASE_URL = "postgresql://depose:changethis@db-service:5432/depose"
          REDIS_HOST   = "redis-service"
          REDIS_PORT   = "6379"
        }
        ingress = {
          enabled  = true
          hosts    = [{ host = var.domain, paths = [{ path = "/", pathType = "Prefix" }] }]
          tls      = []
        }
      }
      worker = {
        enabled = true
        image = {
          repository = "depose/server"
          tag        = var.image_tag
        }
      }
      db = {
        enabled = true
        auth = {
          username = "depose"
          password = "changethis"
          database = "depose"
        }
      }
      redis = {
        enabled = true
      }
    })
  ]
}
