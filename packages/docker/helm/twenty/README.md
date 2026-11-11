# Helm chart: Depose

This is a starter Helm chart for deploying Depose to Kubernetes. It follows the same shape as Twenty's chart: server + worker + db + redis + ingress.

> Status: starter. Adapt values to your cluster, ingress controller, storage class, and secrets strategy.

## Prerequisites

- Kubernetes cluster
- Helm 3
- Ingress controller, if you want external HTTP access
- Storage class, if you want persistent Postgres/Redis data

## Quick install

```sh
export DOMAIN=depose.example.com
helm install depose packages/docker/helm/twenty \
  --namespace depose --create-namespace --wait \
  --set server.ingress.hosts[0].host=$DOMAIN \
  --set server.ingress.hosts[0].paths[0].path=/ \
  --set server.ingress.hosts[0].paths[0].pathType=Prefix \
  --set server.ingress.tls[0].hosts[0]=$DOMAIN
```

## Useful values

- `server.image.repository`
- `server.image.tag`
- `server.env`
- `worker.enabled`
- `db.enabled`
- `redis.enabled`
- `server.ingress.enabled`
- `server.ingress.hosts`
- `server.ingress.tls`

## Secrets

Do not pass sensitive values with `--set`. Use a values file:

```sh
helm install depose packages/docker/helm/twenty \
  -f values.yaml \
  -f values-secrets.yaml \
  --namespace depose
```

Or reference existing Kubernetes secrets via `server.extraEnvFrom`.
