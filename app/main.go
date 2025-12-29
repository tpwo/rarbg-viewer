package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	_ "github.com/mattn/go-sqlite3"
)

type Result struct {
	Title  string `json:"title"`
	Cat    string `json:"cat"`
	Date   string `json:"date"`
	Size   int    `json:"size"`
	Magnet string `json:"magnet"`
}

type Response struct {
	Result     []Result `json:"result"`
	TotalCount int      `json:"total_count"`
}

func main() {
	db, err := sql.Open("sqlite3", "./db/rarbg_db.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query(`
SELECT COUNT(*) FROM items_fts
`)
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	for rows.Next() {
		var count int
		err := rows.Scan(&count)
		if err != nil {
			log.Fatal(err)
		}
		log.Print(count)
	}

	if err = rows.Err(); err != nil {
		log.Fatal(err)
	}

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/results/", getResults)

	var port = 8000
	log.Printf("Listening on http://127.0.0.1:%d\n", port)
	log.Fatal(
		http.ListenAndServe(":"+strconv.Itoa(8000), nil),
	)

}

func getResults(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()

	searchQuery := query.Get("search_query")

	page, err := strconv.Atoi(query.Get("page"))
	if err != nil || page < 1 {
		page = 1
	}

	perPage, err := strconv.Atoi(query.Get("per_page"))
	if err != nil || perPage < 1 || perPage > 100 {
		perPage = 20
	}

	category := query.Get("category")

	sortCol := query.Get("sort_col")
	if sortCol == "" {
		sortCol = "title"
	}

	sortDir := query.Get("sort_dir")
	if sortDir == "" {
		sortDir = "asc"
	}

	results := []Result{
		{Title: "Test item 1", Cat: "xxx", Date: "2025-01-01", Size: 100, Magnet: "some-magnet-link"},
		{Title: "Test item 2", Cat: "ebooks", Date: "2020-01-01", Size: 50, Magnet: "some-magnet-link"},
	}

	response := Response{
		Result:     results,
		TotalCount: 2,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)

	log.Printf("Query parameters:\nsearch_query=%s\npage=%d\nper_page=%d\ncat=%s\nsort_col=%s\nsort_dir=%s\n",
		searchQuery, page, perPage, category, sortCol, sortDir)

}
