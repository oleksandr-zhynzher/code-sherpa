.PHONY: dev build test quality clean logs stop

dev:
	docker compose up

build:
	docker compose up --build

test:
	npm run quality

quality:
	npm run quality

logs:
	docker compose logs -f

stop:
	docker compose down

clean:
	docker compose down --volumes --remove-orphans
	rm -rf dist apps/web/.next
