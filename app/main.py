from __future__ import annotations

import logging
import os
import sqlite3
from sqlite3 import Connection

from fastapi import FastAPI
from fastapi import Query
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.category_map import CATEGORY_MAP

DB_DIR = 'db'
DB_FILE = f'{DB_DIR}/rarbg_db.sqlite'

QUERY_FTS5 = """\
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    title,
    content='items',
    content_rowid='rowid'
)
"""

# Check if FTS5 table is empty
#
# This is a bit stupid, but this table is non-empty after the query
# above creates items_fts. But we still have to fill it with data.
#
# So we check for sample match `abc` which should return something.
# DB state is quite static in this project, so this is good enough for now.
QUERY_FTS5_CHECK = """\
SELECT COUNT(*) FROM items_fts
JOIN items i on i.rowid = items_fts.rowid
WHERE items_fts MATCH "abc"
"""

QUERY_FTS5_INSERT = """\
INSERT INTO items_fts(rowid, title)
SELECT rowid, title FROM items
"""


def ensure_fts5_table() -> None:
    """Ensures FTS5 table exists and is populated if empty."""
    with CONN as conn:
        cursor = conn.cursor()
        logging.info("Ensuring FTS5 table 'items_fts' exists...")
        cursor.execute(QUERY_FTS5)
        logging.info("FTS5 table 'items_fts' checked/created.")
        cursor.execute(QUERY_FTS5_CHECK)
        count = cursor.fetchone()[0]
        if count == 0:
            logging.info("FTS5 table 'items_fts' is empty. Populating from 'items' table...")
            cursor.execute(QUERY_FTS5_INSERT)
            logging.info("FTS5 table 'items_fts' population complete.")
        else:
            logging.info("FTS5 table 'items_fts' already populated.")
        conn.commit()


logging.basicConfig(level=logging.INFO)


def get_connection(db_file: str) -> Connection:
    if os.path.exists(db_file):
        # NOTE: `check_same_thread` is False, as DB is READ ONLY
        return sqlite3.connect(db_file, check_same_thread=False)
    else:
        raise SystemExit(
            f'ERROR: database file `{db_file}` not found. Please provide it and rerun the app.'
        )


app = FastAPI()
CONN = get_connection(DB_FILE)
ensure_fts5_table()
app.mount('/static', StaticFiles(directory='static', html=True), 'static')


@app.get('/')
def main_search() -> object:
    return FileResponse('static/index.html')


@app.get('/favicon.ico')
async def favicon() -> FileResponse:
    return FileResponse('static/logo.svg')


@app.get('/search/')
def search_root() -> RedirectResponse:
    return RedirectResponse(url='/')


@app.get('/search/{query}/')
def search_query_redirect(query: str) -> RedirectResponse:
    return RedirectResponse(url=f'/search/{query}/1/')


@app.get('/search/{query}/{page}/')
def search_query_page() -> object:
    return FileResponse('static/index.html')


@app.get('/results')
def get_results(
    search_query: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
    sort_col: str = Query('title'),
    sort_dir: str = Query('asc'),
) -> object:
    if len(search_query) < 3:
        return {
            'result': [],
            'total_count': 0,
            'error': 'Search query must be at least 3 characters.',
        }
    offset = (page - 1) * per_page
    cats = CATEGORY_MAP.get(category) if category else None
    # Validate sort_col and sort_dir
    allowed_cols = {'title', 'date', 'size'}
    allowed_dirs = {'asc', 'desc'}
    col_map = {'title': 'title', 'date': 'dt', 'size': 'size'}
    sort_col_sql = col_map.get(sort_col, 'title')
    sort_dir_sql = 'ASC' if sort_dir.lower() == 'asc' else 'DESC'

    if sort_col not in allowed_cols:
        sort_col_sql = 'title'
    if sort_dir.lower() not in allowed_dirs:
        sort_dir_sql = 'ASC'

    with CONN as conn:
        cursor = conn.cursor()

        if cats:
            cat_filter = f' AND i.cat IN ({",".join(["?"] * len(cats))})'
            count_query = f"""\
SELECT COUNT(*) FROM items_fts
JOIN items i ON i.rowid = items_fts.rowid
WHERE items_fts MATCH ?{cat_filter}
"""
            params = [search_query, *cats]
        else:
            cat_filter = ''
            count_query = """\
SELECT COUNT(*) FROM items_fts WHERE items_fts MATCH ?
"""
            params = [search_query]

        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]

        if total_count == 0:
            return {'result': [], 'total_count': 0}

        # Get paginated, sorted results
        query_str = f"""\
SELECT i.title, i.cat, i.dt, i.size, i.hash
FROM items_fts
JOIN items i ON i.rowid = items_fts.rowid
WHERE items_fts MATCH ?{cat_filter}
ORDER BY i.{sort_col_sql} {sort_dir_sql}
LIMIT ? OFFSET ?
"""
        params_page = params + [per_page, offset]
        cursor.execute(query_str, params_page)
        results = cursor.fetchall()
        # Return raw size in bytes, None if missing, date as YYYY-MM-DD, and magnet link
        results = [
            (title, cat, just_date(dt), size, f'magnet:?xt=urn:btih:{hash_}&dn={title}')
            for (title, cat, dt, size, hash_) in results
        ]
        # Use dicts for clarity and to name the fields
        results = [
            {'title': title, 'cat': cat, 'date': date, 'size': size, 'magnet': magnet}
            for (title, cat, date, size, magnet) in results
        ]
        return {'result': results, 'total_count': total_count}


def just_date(dt: str) -> str:
    """Extract YYYY-MM-DD from an ISO 8601 datetime string.

    This is done by trimming after the 10th character, as ISO 8601 date strings always have the date
    in the first 10 characters (e.g., '2023-12-25T14:23:00' -> '2023-12-25').
    """
    if not dt:
        return ''
    return str(dt)[:10]
