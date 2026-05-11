# Copyright (c) 2024 Hemang Parmar
# Convenience wrapper around the most common dev tasks.

.PHONY: up down logs build test lint migrate deploy lambda-build

up:
	docker compose -f docker/docker-compose.yml --env-file .env up --build

down:
	docker compose -f docker/docker-compose.yml down

logs:
	docker compose -f docker/docker-compose.yml logs -f --tail=200

build:
	cd backend && npm install && npm run build
	cd frontend && npm install && npm run build

test:
	cd backend && npm test

lint:
	cd backend && npm run lint
	cd frontend && npm run lint

migrate:
	cd backend && npm run migrate

deploy:
	@echo "Use the CI/CD pipeline (push to main) or run infrastructure/deploy.sh on the EC2 host."

lambda-build:
	cd infrastructure/lambda && ./build.sh
