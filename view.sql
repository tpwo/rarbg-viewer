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
        dt DESC;
