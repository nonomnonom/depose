#!/bin/bash
set -e

REPO=https://raw.githubusercontent.com/OWNER/REPO
DEFAULT_BRANCH=main

echo "🔧 Checking dependencies..."

if ! command -v docker >/dev/null 2>&1; then
  echo -e "\t❌ Docker is not installed or not in PATH."
  echo -e "\t\tSee https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo -e "\t❌ Docker Compose v2 is not installed or not in PATH."
  echo -e "\t\tSee https://docs.docker.com/compose/install/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo -e "\t❌ Docker is not running."
  echo -e "\t\tPlease start Docker Desktop or the Docker daemon."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo -e "\t❌ curl is not installed."
  exit 1
fi

VERSION="${VERSION:-latest}"
BRANCH="${BRANCH:-$DEFAULT_BRANCH}"

echo "🔧 Using VERSION=${VERSION} BRANCH=${BRANCH}"

if [ "$VERSION" != "latest" ]; then
  echo -e "\tℹ️ Downloading configuration from tag: $VERSION"
elif [ -n "$BRANCH" ] && [ "$BRANCH" != "$DEFAULT_BRANCH" ]; then
  echo -e "\tℹ️ Downloading configuration from branch: $BRANCH"
fi

echo -e "\t• Copying docker-compose.yml"
curl -sSfL "$REPO/$BRANCH/packages/docker/docker-compose.yml" -o docker-compose.yml

echo -e "\t• Copying docker-compose.dev.yml"
curl -sSfL "$REPO/$BRANCH/packages/docker/docker-compose.dev.yml" -o docker-compose.dev.yml

echo -e "\t• Copying .env.example"
curl -sSfL "$REPO/$BRANCH/packages/docker/.env.example" -o .env.example

if [ ! -f .env ]; then
  echo -e "\t• Creating .env from .env.example"
  cp .env.example .env
fi

if [ -z "$ENCRYPTION_KEY" ] && [ -z "$APP_SECRET" ]; then
  echo -e "\t• Generating secrets"
  sed -i.bak "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" .env
  sed -i.bak "s|^APP_SECRET=.*|APP_SECRET=$(openssl rand -base64 32)|" .env
  rm -f .env.bak
fi

echo -e "\t✅ Setup complete."
echo -e "\t\tEdit .env, then run:"
echo -e "\t\t  docker compose up -d"
