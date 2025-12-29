package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
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

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/results/", getResults(db))

	var port = 8000
	log.Printf("Listening on http://127.0.0.1:%d\n", port)
	log.Fatal(
		http.ListenAndServe(":"+strconv.Itoa(8000), nil),
	)

}

func getResults(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		var count int
		err = db.QueryRow(`
			SELECT COUNT(*) FROM items_fts
			WHERE items_fts MATCH (?)`,
			searchQuery,
		).Scan(&count)
		if err != nil {
			log.Fatal(err)
		}
		log.Print(count)

		offset := (page - 1) * perPage

		// TODO: cat_filter needs to be implemented
		queryStr := fmt.Sprintf(`
			SELECT i.title, i.cat, i.dt, i.size, i.hash
			FROM items_fts
			JOIN items i ON i.rowid = items_fts.rowid
			WHERE items_fts MATCH "%s"
			ORDER BY i."%s" %s
			LIMIT %d OFFSET %d
			`,
			searchQuery, sortCol, sortDir, perPage, offset,
		)

		rows, err := db.Query(queryStr)
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()

		var results []Result

		for rows.Next() {
			var title string
			var cat string
			var dt string
			var size int
			var hash string
			err := rows.Scan(&title, &cat, &dt, &size, &hash)
			if err != nil {
				log.Fatal(err)
			}
			magnet := fmt.Sprintf("magnet:?xt=urn:btih:%s&dn=%s", hash, title)
			res := Result{title, cat, dt, size, magnet}
			results = append(results, res)
		}

		response := Response{
			Result:     results,
			TotalCount: count,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		log.Printf("Query parameters:\nsearch_query=%s\npage=%d\nper_page=%d\ncat=%s\nsort_col=%s\nsort_dir=%s\n",
			searchQuery, page, perPage, category, sortCol, sortDir)
	}
}
