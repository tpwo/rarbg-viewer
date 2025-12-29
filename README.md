# RARBG View

Simple web viewer for SQLite databases with schema compatible with [RARBG](https://en.wikipedia.org/wiki/RARBG) dump.

Under the hood this project uses [FTS5](https://sqlite.org/fts5.html) which makes it *fast*.

<img alt="RARBG View UI" src="https://github.com/user-attachments/assets/d9c22e17-bea1-410c-9a3a-3f46b89b550e" />

## Running

Requirements:

* database
* docker
* just command runner

To list all available running options run `just --list`.

### TLDR

1. Clone this repo.
1. Download [this DB dump](https://tinyurl.com/rarbg-db-zip) and put it inside [db](db) folder in the cloned repo.
1. Run `just up` or `docker compose up --build` if you don't have `just`.
1. Open http://127.0.0.1:8000 and use the app!

### Database

You need a copy of sqlite DB to run this app yourself. Happily, it's available under [this magnet link](https://tinyurl.com/rarbg-db-zip). Raw magnet link: `magnet:?xt=urn:btih:a2ca83e177df5cb1966dfc1d262bc751e4987405&dn=rarbg_db.zip`.

The dump was created by a person who originally shared it [on reddit](https://www.reddit.com/r/PiratedGames/comments/13wjasv/comment/jmd5sbf/?utm_source=share&utm_medium=web3x&utm_name=web3xcss&utm_term=1&utm_content=share_button).

### Schema

Note that you can run the app with any SQLite database compatible with this schema:

```sql
$ sqlite3 rarbg_db.sqliten
SQLite version 3.43.2 2023-10-10 13:08:14
sqlite> .tables
items
sqlite> .schema items
CREATE TABLE IF NOT EXISTS "items" (
	`id`	INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,
	`hash`	TEXT NOT NULL UNIQUE,
	`title`	TEXT NOT NULL,
	`dt`	TEXT NOT NULL,
	`cat`	TEXT NOT NULL,
	`size`	INTEGER,
	`ext_id`	TEXT,
	`imdb`	TEXT
);
CREATE INDEX "ix__cat" ON "items" (
	"cat"	ASC
);
CREATE INDEX "ix__imdb" ON "items" (
	"imdb"	ASC
);
CREATE INDEX "ix__ext_id" ON "items" (
	"ext_id"	ASC
);
```

### Categories

Your DB should use the following categories for the app to work correctly:

```sql
sqlite> SELECT DISTINCT cat FROM items;
ebooks
games_pc_iso
games_pc_rip
games_ps3
games_ps4
games_xbox360
movies
movies_bd_full
movies_bd_remux
movies_x264
movies_x264_3d
movies_x264_4k
movies_x264_720
movies_x265
movies_x265_4k
movies_x265_4k_hdr
movies_xvid
movies_xvid_720
music_flac
music_mp3
software_pc_iso
tv
tv_sd
tv_uhd
xxx
```

### Run with/without docker

App is dockerized with compose, and can be started with `just`:

    just up

To run without docker:

    just run

Compile the app without running it:

    just build

Run without docker in DEBUG mode (more logging):

    just debug
