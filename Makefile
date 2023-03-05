REGISTRY=
FRONTEND_IMAGE=ablaki/frontend

ifeq ($(D_TAG),)
  D_TAG=develop
endif

REGISTRY_FRONTEND=$(REGISTRY)/$(FRONTEND_IMAGE):$(D_TAG)

up: docker-up
down: docker-down
stop: docker-stop
start: docker-start
restart: docker-restart
build: docker-build
pull: docker-pull
init: docker-down-clear docker-pull docker-build docker-up

build-nginx:
	docker-compose build nginx

docker-up:
	docker-compose up --detach --remove-orphans

docker-down:
	docker-compose down --remove-orphans

docker-down-clear:
	docker-compose down --volumes --remove-orphans

docker-stop:
	docker-compose stop

docker-start:
	docker-compose start

docker-restart:
	docker-compose restart

docker-pull:
	docker-compose pull

docker-build:
	docker-compose build

npm-serve:
	docker-compose run --rm -p "8080:8080" -v "$(PWD)/code:/app" vuejs npm run serve

npm-build:
	docker-compose run --rm -v "$(PWD)/code:/app" vuejs npm run build

npm-build-dev:
	docker-compose run --rm -v "$(PWD)/code:/app" vuejs npm run build-dev

npm-install:
	docker-compose run --rm -v "$(PWD)/code:/app" vuejs npm install

npm-prune:
	docker-compose run --rm -v "$(PWD)/code:/app" vuejs npm prune


up-nginx:
	docker-compose up --detach nginx

shell-nginx:
	docker-compose exec nginx bash

log-nginx:
	docker-compose logs --follow nginx

up-vuejs:
	docker-compose up --detach vuejs

shell-vuejs:
	docker-compose exec vuejs sh

log-vuejs:
	docker-compose logs --follow vuejs

logs:
	docker-compose logs --follow

build-frontend:
	tar czf f.context.tar.gz ./code/dist ./docker/production ./docker/development
	docker build -t $(REGISTRY_FRONTEND) -f docker/production/nginx.docker - < f.context.tar.gz
	docker push $(REGISTRY_FRONTEND)
	rm -rf f.context.tar.gz
