from __future__ import annotations

import os
import sqlite3
from sqlite3 import Connection

from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

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


@app.get('/')
def index(request: Request) -> FileResponse:
    params = {item[0]: item[1] for item in request.query_params.multi_items()}
    query = ''
    for key, value in params.items():
        if query == '':
            query += '?'
        query += f'{key}={value}&'
    # return RedirectResponse(url=f'/www/index.html{query}', status_code=302)
    # return {'status': 200}
    return FileResponse('www/index.html')


@app.get('/results')
def get_count(search_query: str) -> object:
    with CONN as conn:
        cursor = conn.cursor()
        query_str = 'SELECT title, cat, dt FROM items WHERE title LIKE ? LIMIT 100'
        cursor.execute(query_str, (like_str(search_query),))
        return {'result': cursor.fetchall()}


def like_str(text: str) -> str:
    return '%' + text + '%'
