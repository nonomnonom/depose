# Terraform (Kubernetes)

This directory contains Terraform files for deploying Depose to Kubernetes. They are intentionally minimal and just a reference starting point.

## What's included

- Provider configuration for Kubernetes
- Optional Helm release for the server chart
- Example variable structure for cluster name, namespace, image tag, ingress domain

## Notes

- These files require customization for your cluster, cloud provider, and ingress setup.
- Secrets should be managed with Kubernetes Secrets, external secret managers, or Terraform secret variables, not committed values.

## Quick start

```sh
cd packages/docker/k8s/terraform

terraform init
terraform plan
terraform apply
```
