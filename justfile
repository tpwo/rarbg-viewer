# show this help message and exit
help:
	just --list

# start golang server
go: build
	./rarbg-view

# compile the app (debug symbols removed with `-ldflags=-w`)
build:
	go build -v -ldflags=-w --tags fts5 -o rarbg-view ./app/main.go

# start server
run:
	tox run -e run

# start server in auto-reload mode
listen:
	tox run -e run -- --reload

# start server in docker
up:
	docker compose up --build --remove-orphans
