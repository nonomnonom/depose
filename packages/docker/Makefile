.PHONY: dev infra dev:down build up down logs clean help

SHELL := /bin/bash
COMPOSE := docker compose
PROJECT_DIR := $(shell pwd)

help:
	@echo "Depose Docker helpers"
	@echo ""
	@echo "  make infra            - start db + redis (dev infrastructure only)"
	@echo "  make infra:down       - stop infra + wipe data"
	@echo "  make dev              - start full stack in dev mode (override compose)"
	@echo "  make build            - build docker images (dev overrides)"
	@echo "  make up               - start full stack (dev overrides)"
	@echo "  make up:prod          - start full stack (production compose)"
	@echo "  make down             - stop full stack (dev overrides)"
	@echo "  make down:prod        - stop production compose"
	@echo "  make logs             - follow all logs"
	@echo "  make logs:server      - follow server logs"
	@echo "  make logs:worker      - follow worker logs"
	@echo "  make clean            - remove local .env artifacts if desired"

infra:
	$(COMPOSE) -f docker-compose.dev.yml up -d

infra:down:
	$(COMPOSE) -f docker-compose.dev.yml down -v

dev:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml up --build

build:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml build

up:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml up -d

up:prod:
	$(COMPOSE) -f docker-compose.yml up -d

down:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml down

down:prod:
	$(COMPOSE) -f docker-compose.yml down

logs:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml logs -f

logs:server:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml logs -f server

logs:worker:
	$(COMPOSE) -f docker-compose.yml -f docker-compose.override.yml logs -f worker

clean:
	rm -f .env.example.bak
