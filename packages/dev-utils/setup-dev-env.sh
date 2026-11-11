#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCKER_COMPOSE_DEV="$PROJECT_ROOT/packages/docker/docker-compose.dev.yml"
DOCKER_COMPOSE_FULL="$PROJECT_ROOT/packages/docker/docker-compose.yml"
DOCKER_COMPOSE_OVERRIDE="$PROJECT_ROOT/packages/docker/docker-compose.override.yml"
DOCKER_COMPOSE_PROD="$PROJECT_ROOT/packages/docker/docker-compose.yml"

cd "$PROJECT_ROOT"

usage() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Sets up the Depose dev environment: Postgres + Redis, databases, and .env files."
  echo ""
  echo "Options:"
  echo "  --docker          Force Docker mode (uses packages/docker/docker-compose.dev.yml)"
  echo "  --down            Stop services"
  echo "  --reset           Wipe data and restart fresh"
  echo "  --help            Show this help"
  exit 0
}

FORCE_DOCKER=false
ACTION=

while [ $# -gt 0 ]; do
  case "$1" in
    --docker)
      FORCE_DOCKER=true
      shift
      ;;
    --down)
      ACTION=down
      shift
      ;;
    --reset)
      ACTION=reset
      shift
      ;;
    --help)
      usage
      ;;
    *)
      echo "Unknown option: $1"
      usage
      ;;
  esac
done

if [ "$ACTION" = "down" ]; then
  if [ "$FORCE_DOCKER" = true ]; then
    echo "🔽 Stopping dev infrastructure (Docker)..."
    docker compose -f "$DOCKER_COMPOSE_DEV" down -v
  else
    echo "ℹ️  --down only supported with --docker in this starter script."
    exit 1
  fi
  exit 0
fi

if [ "$ACTION" = "reset" ]; then
  echo "🔽 Wiping dev data..."
  if [ "$FORCE_DOCKER" = true ]; then
    docker compose -f "$DOCKER_COMPOSE_DEV" down -v
  else
    echo "ℹ️  --reset only supported with --docker in this starter script."
    exit 1
  fi
  echo "🔽 Re-creating dev infrastructure..."
fi

if [ "$FORCE_DOCKER" = true ]; then
  echo "🔧 Using Docker for dev infrastructure..."
  if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker is not installed or not running."
    exit 1
  fi
  if ! docker compose version >/dev/null 2>&1; then
    echo "❌ Docker Compose v2 is not available."
    exit 1
  fi
  if [ "$ACTION" != "reset" ]; then
    if ! docker compose -f "$DOCKER_COMPOSE_DEV" ps --quiet >/dev/null 2>&1; then
      echo "🐳 Starting dev infrastructure (Postgres + Redis)..."
      docker compose -f "$DOCKER_COMPOSE_DEV" up -d
    else
      echo "✅ Dev infrastructure already running."
    fi
    echo "⏳ Waiting for Postgres to be ready..."
    for i in $(seq 1 30); do
      if docker compose -f "$DOCKER_COMPOSE_DEV" exec -T db pg_isready -U "${POSTGRES_USER:-depose}" >/dev/null 2>&1; then
        break
      fi
      sleep 1
    done
    echo "✅ Postgres is ready."
  fi
else
  echo "ℹ️  Local Postgres/Redis mode is not wired up in this starter script."
  echo "ℹ️  Use --docker to run dev infrastructure via Docker."
  exit 1
fi

if [ "$ACTION" = "reset" ]; then
  echo "🐳 Recreating dev infrastructure..."
  docker compose -f "$DOCKER_COMPOSE_DEV" up -d
  echo "⏳ Waiting for Postgres to be ready..."
  for i in $(seq 1 30); do
    if docker compose -f "$DOCKER_COMPOSE_DEV" exec -T db pg_isready -U "${POSTGRES_USER:-depose}" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  echo "✅ Postgres is ready."
fi

echo "✅ Dev environment ready."
echo ""
echo "Next steps:"
echo "  pnpm --filter server dev"
echo "  pnpm --filter @depose/frontend dev"
