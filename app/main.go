package main

import (
	"fmt"
	"net/http"
)

func main() {
	fmt.Println("Hello world!")
	http.HandleFunc("/hello", hello)
	http.ListenAndServe(":8000", nil)
}

func hello(w http.ResponseWriter, req *http.Request) {
	fmt.Fprintf(w, "hello\n")
}
