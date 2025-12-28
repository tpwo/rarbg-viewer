package main

import (
	"log"
	"net/http"
	"strconv"
)

func main() {
	fs := http.FileServer(http.Dir("static"))
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.Handle("/", fs)

	var port = 8000
	log.Printf("Listening on http://127.0.0.1:%d\n", port)
	log.Fatal(
		http.ListenAndServe(":"+strconv.Itoa(8000), nil),
	)

}
