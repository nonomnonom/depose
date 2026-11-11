# Podman setup

Podman Compose uses the same compose format as Docker Compose. This directory contains a Podman-friendly compose file that uses explicit `docker.io/` image prefixes where helpful.

## Prerequisites

- Podman
- podman-compose

## Usage

```sh
cd packages/docker/podman

podman compose up -d
podman compose down
```
