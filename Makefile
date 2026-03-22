.PHONY: help configure install setup dev webhook-tunnel-help db-migrate setup-storage build lint docs

# Default target
help:
	@echo "Oasis - Makefile targets"
	@echo ""
	@echo "  configure       Interactive .env.local setup (prompts for each variable)"
	@echo "  install        yarn install"
	@echo "  setup          Full setup: install, configure, db-migrate, setup-storage"
	@echo ""
	@echo "  dev            Start Next.js dev server (localhost:3000)"
	@echo "  webhook-tunnel-help  How to expose localhost for Razorpay webhooks (Pinggy, etc.)"
	@echo ""
	@echo "  db-migrate     Apply Supabase migrations"
	@echo "  setup-storage  Create storage buckets (rider-reports, government-ids, face-photos)"
	@echo ""
	@echo "  build          Production build"
	@echo "  lint           ESLint"
	@echo ""
	@echo "  docs           Start docs site (Docs/)"
	@echo ""
	@echo "  Payments: use Test mode keys. Client verify works on localhost; webhooks need a public HTTPS URL — run: make webhook-tunnel-help"

configure:
	tsx scripts/configure-env.ts

install:
	yarn install

setup: install configure db-migrate setup-storage
	@echo "Setup complete. Run 'make dev'. For Razorpay webhook testing see 'make webhook-tunnel-help'."

dev:
	yarn dev

webhook-tunnel-help:
	@echo "Razorpay cannot POST to http://localhost. Use a public HTTPS URL for /api/payments/webhook."
	@echo "Example (Pinggy):  ssh -p 443 -R0:localhost:3000 a.pinggy.io"
	@echo "Then in Razorpay Dashboard (Test mode) set webhook URL to:  https://<tunnel-host>/api/payments/webhook"

db-migrate:
	yarn db:migrate

setup-storage:
	yarn setup-storage

build:
	yarn build

lint:
	yarn lint

docs:
	cd Docs && npm run dev
