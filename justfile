# show this help message and exit
help:
	just --list

# start server
run: build
	./rarbg-view

# compile the app (debug symbols removed with `-ldflags=-w`)
build:
	go build -v -ldflags="-s -w" --tags fts5 -o rarbg-view ./app

# start server in debug mode (more logging)
debug:
	DEBUG=true go run -v --tags fts5 ./app

# (docker) start server
up:
	docker compose up --detach

# (docker) pull newest image and start server
update:
	docker compose up --detach --pull always

# (docker) stop server
stop:
	docker compose stop
