# show this help message and exit
help:
	just --list

# start golang server
go:
	go run --tags fts5 app/main.go

# start server
run:
	tox run -e run

# start server in auto-reload mode
listen:
	tox run -e run -- --reload

# start server in docker
up:
	docker compose up --build --remove-orphans
