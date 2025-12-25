FROM python:3.14.2-slim-trixie
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY requirements requirements
RUN uv venv && uv pip install -r requirements/requirements.txt
ENV PATH="/app/.venv/bin/:$PATH"

COPY --parents app schema static templates /app/

CMD ["uvicorn", "app.main:app"]
