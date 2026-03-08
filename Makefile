.PHONY: help configure install setup dev stripe-listen db-migrate setup-storage build lint docs

# Default target
help:
	@echo "Oasis - Makefile targets"
	@echo ""
	@echo "  configure       Interactive .env.local setup (prompts for each variable)"
	@echo "  install        yarn install"
	@echo "  setup          Full setup: install, configure, db-migrate, setup-storage"
	@echo ""
	@echo "  dev            Start Next.js dev server (localhost:3000)"
	@echo "  stripe-listen  Forward Stripe webhooks to localhost:3000/api/payments/webhook"
	@echo ""
	@echo "  db-migrate     Apply Supabase migrations"
	@echo "  setup-storage  Create storage buckets (rider-reports, government-ids, face-photos)"
	@echo ""
	@echo "  build          Production build"
	@echo "  lint           ESLint"
	@echo ""
	@echo "  docs           Start docs site (Docs/)"
	@echo ""
	@echo "Usage: Run 'make stripe-listen' in one terminal, 'make dev' in another for full local dev."

configure:
	tsx scripts/configure-env.ts

install:
	yarn install

setup: install configure db-migrate setup-storage
	@echo "Setup complete. Run 'make dev' and 'make stripe-listen' (separate terminals)."

dev:
	yarn dev

stripe-listen:
	stripe listen --forward-to localhost:3000/api/payments/webhook

db-migrate:
	yarn db:migrate

setup-storage:
	yarn setup-storage

build:
	yarn build

lint:
	yarn lint

docs:
	cd Docs && npm install && npm run dev
