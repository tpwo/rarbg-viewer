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
CREATE INDEX IF NOT EXISTS "ix__cat" ON "items" (
	"cat"	ASC
);
CREATE INDEX IF NOT EXISTS "ix__imdb" ON "items" (
	"imdb"	ASC
);
CREATE INDEX IF NOT EXISTS "ix__ext_id" ON "items" (
	"ext_id"	ASC
);
