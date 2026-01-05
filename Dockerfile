ARG BUILDPLATFORM=linux/amd64
FROM golang:1.25 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY ./app    /app/app
COPY ./static /app/static/

ENV GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH}

RUN go build -v -ldflags="-s -w" --tags fts5 -o rarbg-view ./app

FROM ubuntu:24.04
COPY --from=builder /app/rarbg-view /app/rarbg-view
COPY --from=builder /app/static /app/static
WORKDIR /app
CMD ["./rarbg-view"]
