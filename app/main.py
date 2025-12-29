from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi import Query
from fastapi import Request
from fastapi.responses import FileResponse
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.category_map import CATEGORY_MAP
from app.sql import ensure_fts5_table
from app.sql import get_connection

# Make sure that this file is present
DB_FILE = 'db/rarbg_db.sqlite'


logging.basicConfig(level=logging.INFO)
CONN = get_connection(DB_FILE)
ensure_fts5_table(CONN)
app = FastAPI()
app.mount('/static', StaticFiles(directory='static', html=True), 'static')


@app.get('/')
def main_search() -> FileResponse:
    return FileResponse('static/index.html')


@app.exception_handler(404)
def redirect_to_root(request: Request, exc: Exception) -> RedirectResponse:
    return RedirectResponse(url='/')


@app.get('/favicon.ico')
async def favicon() -> FileResponse:
    return FileResponse('static/logo.svg')


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
    allowed_cols = {'title', 'dt', 'size'}
    allowed_dirs = {'asc', 'desc'}
    col_map = {'title': 'title', 'dt': 'dt', 'size': 'size'}
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
