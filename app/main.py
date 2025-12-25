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


# Unified search page for both / and /search/{query}/{page}/


@app.get('/')
def main_search(request: Request) -> object:
    return templates.TemplateResponse('search.html', {'request': request})


@app.get('/search/')
def search_root() -> RedirectResponse:
    return RedirectResponse(url='/')


@app.get('/search/{query}/')
def search_query_redirect(query: str) -> RedirectResponse:
    return RedirectResponse(url=f'/search/{query}/1/')


# Serve the search results page
@app.get('/search/{query}/{page}/')
def search_page(request: Request, query: str, page: int) -> object:
    return templates.TemplateResponse(
        'search.html', {'request': request, 'query': query, 'page': page}
    )


@app.get('/results')
def get_results(
    search_query: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: str | None = Query(None),
) -> object:
    offset = (page - 1) * per_page
    cats = CATEGORY_MAP.get(category) if category else None
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

        # Get paginated results (now including size)
        query_str = (
            'SELECT title, cat, dt, size FROM items '
            f'WHERE title LIKE ?{cat_filter} LIMIT ? OFFSET ?'
        )
        params_page = params + [per_page, offset]
        cursor.execute(query_str, params_page)
        results = cursor.fetchall()
        # Return raw size in bytes, None if missing
        results = [(title, cat, dt, size) for (title, cat, dt, size) in results]
        return {'result': results, 'total_count': total_count}


def like_str(text: str) -> str:
    return '%' + text + '%'
