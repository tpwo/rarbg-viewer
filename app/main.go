package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

// Make sure that this file is present
const dbFile = "./db/rarbg_db.sqlite"

// Runtime parameters
var Debug bool
var Port int

// Init DEBUG flag and operating Port from os.Getenv
func init() {
	debugEnv := os.Getenv("DEBUG")
	Debug = strings.ToLower(debugEnv) == "true"

	port, err := strconv.Atoi(os.Getenv("PORT"))
	if err != nil {
		defaultPort := 1337
		Port = defaultPort
	} else {
		Port = port
	}
}

// Open DB connection and start HTTP server
func main() {
	db, err := sql.Open("sqlite3", dbFile)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	prepareFTS5(db)

	fs := http.FileServer(http.Dir("static"))
	http.Handle("/", fs)
	http.Handle("/static/", http.StripPrefix("/static/", fs))
	http.HandleFunc("/results/", getResults(db))

	log.Printf("Listening on http://127.0.0.1:%d\n", Port)
	log.Fatal(
		http.ListenAndServe(":"+strconv.Itoa(Port), nil),
	)
}

// Make sure FTS5 tables are prepared to be used.
//
// Note that after initial creation FTS5 tables are useless
// -- they have no actual data but at the same time
// they are non-empty, i.e. pure COUNT(*) returns non-zero rows.
//
// To overcome this problem, we JOIN with items and search for a pattern
// which exists in items.
//
// Here we query for `abc`, as it's present in a small number in the DB.
// And the DB's state is static in this project, so this is good enough.
//
// If FTS5 was already properly populated before, this function does
// nothing and quickly exits.
func prepareFTS5(db *sql.DB) {
	log.Println("Ensuring FTS5 table 'items_fts' exists...")
	_, err := db.Exec(`
		CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
			title,
			content='items',
			content_rowid='rowid')`,
	)
	if err != nil {
		log.Fatal(err)
	}
	var count int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM items_fts
		JOIN items i on i.rowid = items_fts.rowid
		WHERE items_fts MATCH "abc"`,
	).Scan(&count)
	if err != nil {
		log.Fatal(err)
	}

	if count == 0 {
		log.Println("FTS5 table 'items_fts' is empty. Populating from 'items' table...")
		_, err = db.Exec(`
			INSERT INTO items_fts(rowid, title)
			SELECT rowid, title FROM items`,
		)
		if err != nil {
			log.Fatal(err)
		}
		log.Println("FTS5 table 'items_fts' population complete.")

	} else {
		log.Println("FTS5 table 'items_fts' already populated.")
	}
}

type result struct {
	Title  string `json:"title"`
	Cat    string `json:"cat"`
	Date   string `json:"date"`
	Size   int    `json:"size"`
	Magnet string `json:"magnet"`
}

type response struct {
	Result     []result `json:"result"`
	TotalCount int      `json:"total_count"`
}

// Provides HTTP endpoint for `/results/`
//
// Accepts query parameters defined in `params` struct.
// Returns JSON codified in `response` struct.
func getResults(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		LogRequest(r)
		p := getUrlParams(r.URL.Query())
		catFilter := getCatFilter(p.categories)

		queryStrCount := fmt.Sprintf(`
			SELECT COUNT(*) FROM items_fts
			JOIN items i ON i.rowid = items_fts.rowid
			WHERE items_fts MATCH "%s"%s`,
			p.searchQuery, catFilter,
		)
		LogDebug("COUNT(*) query: %s", queryStrCount)
		var count int
		err := db.QueryRow(queryStrCount).Scan(&count)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Printf("ERROR: %s", err)
			return
		}
		LogDebug("Total count: %d", count)

		offset := (p.page - 1) * p.perPage

		queryStr := fmt.Sprintf(`
			SELECT i.title, i.cat, i.dt, i.size, i.hash
			FROM items_fts
			JOIN items i ON i.rowid = items_fts.rowid
			WHERE items_fts MATCH "%s"%s
			ORDER BY i."%s" %s
			LIMIT %d OFFSET %d`,
			p.searchQuery, catFilter, p.sortCol, p.sortDir, p.perPage, offset,
		)
		LogDebug("SELECT query: %s", queryStr)

		rows, err := db.Query(queryStr)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Printf("ERROR: %s", err)
			return
		}
		defer rows.Close()

		// Initialize it as empty list to avoid returning nil if query returns nothing
		results := make([]result, 0)

		for rows.Next() {
			var title string
			var cat string
			var dt string
			var size sql.NullInt64
			var hash string
			err := rows.Scan(&title, &cat, &dt, &size, &hash)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				log.Printf("ERROR: %s", err)
				return
			}

			var intSize int
			if size.Valid {
				intSize = int(size.Int64)
			} else {
				intSize = 0
			}

			magnet := fmt.Sprintf("magnet:?xt=urn:btih:%s&dn=%s", hash, title)

			res := result{title, cat, dt, intSize, magnet}
			results = append(results, res)
		}

		response := response{
			Result:     results,
			TotalCount: count,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	}
}

type params struct {
	searchQuery string
	page        int
	perPage     int
	categories  []string
	sortCol     string
	sortDir     string
}

func getUrlParams(q url.Values) params {
	searchQuery := q.Get("search_query")

	page, err := strconv.Atoi(q.Get("page"))
	if err != nil || page < 1 {
		page = 1
	}

	perPage, err := strconv.Atoi(q.Get("per_page"))
	if err != nil || perPage < 1 || perPage > 100 {
		perPage = 20
	}

	categories, ok := CATEGORY_MAP[q.Get("category")]
	if !ok {
		categories = nil
	}

	sortCol := q.Get("sort_col")
	if sortCol == "" {
		sortCol = "title"
	}

	sortDir := q.Get("sort_dir")
	if sortDir == "" {
		sortDir = "asc"
	}

	LogDebug(`
Query parameters:
	search_query=%s
	page=%d
	per_page=%d
	cat=%s
	sort_col=%s
	sort_dir=%s`,
		searchQuery, page, perPage, categories, sortCol, sortDir)

	return params{
		searchQuery: searchQuery,
		page:        page,
		perPage:     perPage,
		categories:  categories,
		sortCol:     sortCol,
		sortDir:     sortDir,
	}
}

// Get SQL WHERE condition for filtering by category
//
// The filtering is based on list of subcategories mapped in CATEGORY_MAP
//
// We have to double quote each value in `cats`.
// So we have a first and last quote, and then we
// also join each element with quotes.
//
// Resulting string is something like:
//
//	AND i.cat IN ("val1","val2","val3")
func getCatFilter(c []string) string {
	var catFilter string
	if c != nil {
		catFilter = fmt.Sprintf(" AND i.cat IN (\"%s\")", strings.Join(c, "\",\""))
	} else {
		catFilter = ""
	}
	LogDebug(catFilter)
	return catFilter
}

func LogRequest(r *http.Request) {
	log.Printf(`%s - "%s %s %s"`, r.RemoteAddr, r.Method, r.URL, r.Proto)
}

// Logs a message only if Debug is true
func LogDebug(s string, args ...any) {
	if Debug {
		log.Printf(s, args...)
	}
}
