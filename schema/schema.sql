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

CREATE VIEW magnet_links
    AS SELECT
        id,
        title,
        cat,
        'magnet:?xt=urn:btih:' || hash || '&dn=' || title as magnetLink,
        imdb,
        dt,
    CASE
        WHEN size < 1048576 THEN ROUND(size / 1024.0, 2) || ' KB'
        WHEN size < 1073741824 THEN ROUND(size / 1048576.0, 2) || ' MB'
        ELSE ROUND(size / 1073741824.0, 2) || ' GB'
    END AS [Size]
    FROM
        items
    ORDER BY
        dt DESC
/* magnet_links(id,title,cat,magnetLink,imdb,dt,Size) */;
