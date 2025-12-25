from __future__ import annotations

import os
import sqlite3
from sqlite3 import Connection

from fastapi import FastAPI
from fastapi import Query
from fastapi import Request
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.category_map import CATEGORY_MAP

DB_DIR = 'db'
DB_FILE = f'{DB_DIR}/database.db'


def get_connection(db_file: str) -> Connection:
    assert os.path.exists(db_file)
    try:
        # NOTE: `check_same_thread` is False, as DB is READ ONLY
        conn = sqlite3.connect(db_file, check_same_thread=False)
    except sqlite3.OperationalError:
        return initialize_db(db_file)
    else:
        return conn


def initialize_db(db_file: str) -> Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    open(db_file, 'w+').close()

    # NOTE: `check_same_thread` is False, as DB is READ ONLY
    conn = sqlite3.connect(db_file, check_same_thread=False)

    with open('schema/schema.sql') as file:
        conn.executescript(file.read())
    return conn


app = FastAPI()
CONN = get_connection(DB_FILE)
app.mount('/static', StaticFiles(directory='static', html=True), 'static')
templates = Jinja2Templates(directory='templates')


@app.get('/')
def main_search(request: Request) -> object:
    return templates.TemplateResponse('search.html', {'request': request})


@app.get('/search/')
def search_root() -> RedirectResponse:
    return RedirectResponse(url='/')


@app.get('/search/{query}/')
def search_query_redirect(query: str) -> RedirectResponse:
    return RedirectResponse(url=f'/search/{query}/1/')


@app.get('/search/{query}/{page}/')
def search_query_page(request: Request, query: str, page: int) -> object:
    return templates.TemplateResponse('search.html', {'request': request})


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
        params = [like_str(search_query)]
        cat_filter = ''
        if cats:
            cat_filter = f' AND cat IN ({",".join(["?"] * len(cats))})'
            params.extend(cats)
        # Get total count for pagination
        count_query = f'SELECT COUNT(*) FROM items WHERE title LIKE ?{cat_filter}'
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]

        # Get paginated, sorted results
        query_str = (
            f'SELECT title, cat, dt, size, hash FROM items '
            f'WHERE title LIKE ?{cat_filter} '
            f'ORDER BY {sort_col_sql} {sort_dir_sql} '
            f'LIMIT ? OFFSET ?'
        )
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


def like_str(text: str) -> str:
    return '%' + text + '%'
