.PHONY: help configure install setup dev webhook-tunnel-help db-migrate setup-storage build lint docs test test-e2e

help:
	@echo "Oasis - Makefile targets"
	@echo ""
	@echo "  setup          Full setup: install, configure, db-migrate, setup-storage"
	@echo "  install        bun install"
	@echo "  configure      Interactive .env.local setup (prompts for each variable)"
	@echo ""
	@echo "  dev            Start Next.js dev server (localhost:3000)"
	@echo "  build          Production build"
	@echo "  lint           ESLint"
	@echo ""
	@echo "  test           Run unit tests (Vitest)"
	@echo "  test-e2e       Run end-to-end tests (Playwright)"
	@echo ""
	@echo "  db-migrate     Apply Supabase migrations"
	@echo "  setup-storage  Create storage buckets"
	@echo "  docs           Start docs site (localhost:4321)"
	@echo ""
	@echo "  webhook-tunnel-help  How to expose localhost for Razorpay webhooks"

configure:
	npx tsx scripts/configure-env.ts

install:
	bun install

setup: install configure db-migrate setup-storage
	@echo ""
	@echo "Setup complete. Run 'make dev' to start the app."
	@echo "For Razorpay webhook testing run 'make webhook-tunnel-help'."

dev:
	bun dev

build:
	bun run build

lint:
	bun run lint

test:
	bun run test

test-e2e:
	bun run test:e2e

db-migrate:
	bun run db:migrate

setup-storage:
	bun run setup-storage

docs:
	cd docs && bun install && bun dev

webhook-tunnel-help:
	@echo "Razorpay cannot POST to http://localhost."
	@echo "Use a tunnel to get a public HTTPS URL for /api/payments/webhook."
	@echo ""
	@echo "  Example (Pinggy):  ssh -p 443 -R0:localhost:3000 a.pinggy.io"
	@echo ""
	@echo "Then set the webhook URL in Razorpay Dashboard (Test mode) to:"
	@echo "  https://<tunnel-host>/api/payments/webhook"
