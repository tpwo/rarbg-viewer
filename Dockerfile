FROM golang:1.25

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY --parents app static /app/

RUN go build -v -ldflags=-w --tags fts5 -o rarbg-view ./app/main.go

CMD ["./rarbg-view"]
