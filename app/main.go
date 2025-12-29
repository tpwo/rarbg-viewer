package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

const (
	// Movies
	MOVIES             = "movies"
	MOVIES_BD_FULL     = "movies_bd_full"
	MOVIES_BD_REMUX    = "movies_bd_remux"
	MOVIES_X264        = "movies_x264"
	MOVIES_X264_3D     = "movies_x264_3d"
	MOVIES_X264_4K     = "movies_x264_4k"
	MOVIES_X264_720    = "movies_x264_720"
	MOVIES_X265        = "movies_x265"
	MOVIES_X265_4K     = "movies_x265_4k"
	MOVIES_X265_4K_HDR = "movies_x265_4k_hdr"
	MOVIES_XVID        = "movies_xvid"
	MOVIES_XVID_720    = "movies_xvid_720"

	// TV
	TV     = "tv"
	TV_SD  = "tv_sd"
	TV_UHD = "tv_uhd"

	// Games
	GAMES_PC_ISO  = "games_pc_iso"
	GAMES_PC_RIP  = "games_pc_rip"
	GAMES_PS3     = "games_ps3"
	GAMES_PS4     = "games_ps4"
	GAMES_XBOX360 = "games_xbox360"

	// Music
	MUSIC_FLAC = "music_flac"
	MUSIC_MP3  = "music_mp3"

	// Books
	EBOOKS = "ebooks"

	// Software
	SOFTWARE_PC_ISO = "software_pc_iso"

	// Adult
	XXX = "xxx"
)

var CATEGORY_MAP = map[string][]string{
	"Movies": {
		MOVIES, MOVIES_BD_FULL, MOVIES_BD_REMUX, MOVIES_X264, MOVIES_X264_3D,
		MOVIES_X264_4K, MOVIES_X264_720, MOVIES_X265, MOVIES_X265_4K,
		MOVIES_X265_4K_HDR, MOVIES_XVID, MOVIES_XVID_720,
	},
	"TV":       {TV, TV_SD, TV_UHD},
	"Games":    {GAMES_PC_ISO, GAMES_PC_RIP, GAMES_PS3, GAMES_PS4, GAMES_XBOX360},
	"Music":    {MUSIC_FLAC, MUSIC_MP3},
	"Books":    {EBOOKS},
	"Software": {SOFTWARE_PC_ISO},
	"Adult":    {XXX},
}

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
		cats, ok := CATEGORY_MAP[category]
		if !ok {
			cats = nil
		}

		var catFilter string
		if cats != nil {
			// We have to double quote each value in `cats`.
			// So we have a first and last quote, and then we
			// also join each element with quotes.
			catFilter = fmt.Sprintf(" AND i.cat IN (\"%s\")", strings.Join(cats, "\",\""))
		} else {
			catFilter = ""
		}
		fmt.Println(catFilter)

		sortCol := query.Get("sort_col")
		if sortCol == "" {
			sortCol = "title"
		}

		sortDir := query.Get("sort_dir")
		if sortDir == "" {
			sortDir = "asc"
		}

		log.Printf(`
			Query parameters:
				search_query=%s
				page=%d
				per_page=%d
				cat=%s
				sort_col=%s
				sort_dir=%s`,
			searchQuery, page, perPage, category, sortCol, sortDir)

		queryStrCount := fmt.Sprintf(`
			SELECT COUNT(*) FROM items_fts
			JOIN items i ON i.rowid = items_fts.rowid
			WHERE items_fts MATCH "%s"%s`,
			searchQuery, catFilter,
		)
		log.Printf("COUNT(*) query: %s", queryStrCount)
		var count int
		err = db.QueryRow(queryStrCount).Scan(&count)
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("Total count: %d", count)

		offset := (page - 1) * perPage

		queryStr := fmt.Sprintf(`
			SELECT i.title, i.cat, i.dt, i.size, i.hash
			FROM items_fts
			JOIN items i ON i.rowid = items_fts.rowid
			WHERE items_fts MATCH "%s"%s
			ORDER BY i."%s" %s
			LIMIT %d OFFSET %d
			`,
			searchQuery, catFilter, sortCol, sortDir, perPage, offset,
		)
		log.Printf("SELECT query: %s", queryStr)

		rows, err := db.Query(queryStr)
		if err != nil {
			log.Fatal(err)
		}
		defer rows.Close()

		// Initialize it as empty list to avoid returning nil if query returns nothing
		results := make([]Result, 0)

		for rows.Next() {
			var title string
			var cat string
			var dt string
			var size sql.NullInt64
			var hash string
			err := rows.Scan(&title, &cat, &dt, &size, &hash)
			if err != nil {
				log.Fatal(err)
			}

			var intSize int
			if size.Valid {
				intSize = int(size.Int64)
			} else {
				intSize = 0
			}

			magnet := fmt.Sprintf("magnet:?xt=urn:btih:%s&dn=%s", hash, title)

			res := Result{title, cat, dt, intSize, magnet}
			results = append(results, res)
		}

		response := Response{
			Result:     results,
			TotalCount: count,
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

	}
}
