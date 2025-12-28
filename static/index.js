import { CATEGORY_ICONS, PER_PAGE_OPTIONS, SORT_ICONS } from './consts.js';
import { escapeHtml, getTopLevelCategory, hide, humanReadableSize, show } from './helpers.js';

const Columns = {
  TITLE: 'title',
  DATE: 'date',
  SIZE: 'size',
};

const SortDir = {
  ASC: 'asc',
  DESC: 'desc',
};

const Category = {
  ALL: 'All',
  MOVIES: 'Movies',
  TV: 'TV',
  GAMES: 'Games',
  MUSIC: 'Music',
  BOOKS: 'Books',
  SOFTWARE: 'Software',
  ADULT: 'Adult',
};

class State {
  constructor(
    query = '',
    page = 1,
    perPage = PER_PAGE_OPTIONS[0],
    sortCol = Columns.TITLE,
    sortDir = SortDir.ASC,
    category = Category.ALL,
  ) {
    this.query = query;
    this.page = page;
    this.perPage = perPage;
    this.sortCol = sortCol;
    this.sortDir = sortDir;
    this.category = category;
  }
}

const _STATE = new State();

hide(perPageSelect);

document.addEventListener('DOMContentLoaded', () => {
  const initialState = readStateFromUrl();
  if (initialState.query) fetchAndRender(initialState, { replace: true });

  btnSearch.addEventListener('click', () => {
    _STATE.query = searchbox.value;
    _STATE.category = categories.value;
    fetchAndRender(_STATE, { push: true });
  });

  searchbox.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      btnSearch.click();
    }
  });

  perPageSelect.addEventListener('change', () => {
    _STATE.perPage = perPageSelect.value;
    _STATE.page = 1;
    fetchAndRender(_STATE);
  });

  if (categories) {
    categories.addEventListener('change', () => {
      const q = searchbox ? searchbox.value : '';
      if (!q) return; // nothing to search
      const state = readStateFromUrl();
      state.query = q;
      state.page = 1;
      state.category = categories.value || '';
      fetchAndRender(state, { push: true });
    });
  }

  document.addEventListener('click', (ev) => {
    if (ev.target.nodeName === 'TH') {
      const col = ev.target.getAttribute('data-col');

      if (_STATE.sortCol === col) {
        _STATE.sortDir = _STATE.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        _STATE.sortCol = col;
        _STATE.sortDir = 'asc';
      }
      _STATE.page = 1;
      fetchAndRender(_STATE, { push: true });
    }
  });

  // Handle popstate to support back/forward navigation
  window.addEventListener('popstate', () => {
    const s = readStateFromUrl();
    if (s.query) fetchAndRender(s, { replace: true });
  });

  // Intercept magnet link clicks to stay in the same tab
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest?.('a.magnet-link');
    if (target) {
      e.preventDefault();
      window.location.href = target.href;
    }
  });
});

function readStateFromUrl() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const q = decodeURIComponent(parts[1] || '');
  const p = parseInt(parts[2] || '1', 10) || 1;
  const params = new URLSearchParams(window.location.search);
  return {
    query: q,
    page: p,
    perPage: parseInt(params.get('per_page') || String(PER_PAGE_OPTIONS[0]), 10),
    sortCol: params.get('sort_col') || 'title',
    sortDir: params.get('sort_dir') || 'asc',
    category: params.get('category') || '',
  };
}

function buildResultsApiUrl(state) {
  const params = new URLSearchParams();
  params.set('search_query', state.query);
  params.set('page', String(state.page));
  params.set('per_page', String(state.perPage));
  params.set('category', state.category);
  params.set('sort_col', state.sortCol);
  params.set('sort_dir', state.sortDir);
  return `/results?${params.toString()}`;
}

function fetchAndRender(state, opts = { push: false, replace: false }) {
  if (!state.query) return;

  const params = new URLSearchParams();
  if (state.perPage) params.set('per_page', String(state.perPage));
  if (state.sortCol) params.set('sort_col', state.sortCol);
  if (state.sortDir) params.set('sort_dir', state.sortDir);
  if (state.category) params.set('category', state.category);
  const path = `/search/${encodeURIComponent(state.query)}/${state.page}/${params.toString()}`;

  try {
    if (opts.replace) window.history.replaceState({}, '', path);
    else if (opts.push) window.history.pushState({}, '', path);
  } catch (_e) {}

  if (results) {
    results.innerHTML = '<div class="spinner"></div>';
    show(results);
  }
  if (pagination) show(pagination);

  fetch(buildResultsApiUrl(state))
    .then((res) => res.json())
    .then((data) => {
      if (searchbox.value.length < 3) {
        results.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
        hide(perPageContainer);
        hide(pagination);
        return;
      }

      const startIdx = data.total_count === 0 ? 0 : (state.page - 1) * state.perPage + 1;
      const endIdx = Math.min(state.page * state.perPage, data.total_count);
      const rangeText = data.total_count === 0 ? '' : `${startIdx}-${endIdx}`;

      resultsCount.innerHTML = `${rangeText ? `<span class='results-range'>Showing results ${rangeText}<br></span> ` : ''} ${data.total_count} total found`;

      if (data.result.length === 0) {
        results.innerHTML = '<p>No results found.</p>';
        hide(perPageContainer);
        hide(pagination);
        return;
      }

      show(results);
      show(perPageSelect);
      show(pagination);

      results.innerHTML = `
<table class="results-table compact-table">
    <thead>
        <tr>
            <th class="sortable" data-col="title">Name ${state.sortCol === 'title' ? SORT_ICONS[state.sortDir] : ''}</th>
            <th class="sortable" data-col="date">Date ${state.sortCol === 'date' ? SORT_ICONS[state.sortDir] : ''}</th>
            <th class="sortable" data-col="size">Size ${state.sortCol === 'size' ? SORT_ICONS[state.sortDir] : ''}</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        ${data.result
          .map((r) => {
            const topCat = getTopLevelCategory(r.cat);
            const icon = CATEGORY_ICONS[topCat] || CATEGORY_ICONS.Other;
            return `
            <tr class="result-card-row">
              <td class="result-title">
                <span class="cat-icon" title="${escapeHtml(topCat)}">${icon}</span>
                <span class="result-title-text">${escapeHtml(r.title)}</span>
              </td>
                <td>${escapeHtml(r.date)}</td>
                <td>${humanReadableSize(Number(r.size))}</td>
                <td>
                    <a href="${r.magnet}" class="magnet-link" title="Download via Magnet">
                      <i class="bi bi-link magnet-icon"></i>
                    </a>
                </td>
            </tr>
            `;
          })
          .join('')}
    </tbody>
</table>
        `;

      pagination.style.display = '';
      let totalPages = Math.ceil(data.total_count / state.perPage);
      if (totalPages === 0) totalPages = 1;
      let html = '';
      // Preserve sort params in pagination links
      const params = new URLSearchParams(window.location.search);
      if (params.has('page')) params.delete('page');
      params.set('sort_col', state.sortCol);
      params.set('sort_dir', state.sortDir);
      const paramStr = params.toString() ? `?${params.toString()}` : '';

      // Helper to build page link
      function pageLink(label, p, extraClass = '') {
        if (p < 1 || p > totalPages) return '';
        if (p === state.page) {
          return `<span class="current-page${extraClass ? ` ${extraClass}` : ''}">${p}</span>`;
        }
        return `<a href="/search/${encodeURIComponent(state.query)}/${p}/${paramStr}" class="${extraClass}">${label}</a>`;
      }

      // How many page numbers to show at once
      const windowSize = 7;
      let start = Math.max(1, state.page - Math.floor(windowSize / 2));
      let end = start + windowSize - 1;
      if (end > totalPages) {
        end = totalPages;
        start = Math.max(1, end - windowSize + 1);
      }

      // First/<<
      if (state.page > 1) {
        html += `${pageLink('First', 1, 'first-page')} `;
        html += `${pageLink('&lt;&lt;', state.page - 1, 'prev-page')} `;
      }

      // Page numbers
      for (let i = start; i <= end; i++) {
        html += `${pageLink(i, i)} `;
      }

      // >>/Last
      if (state.page < totalPages) {
        html += `${pageLink('&gt;&gt;', state.page + 1, 'next-page')} `;
        html += pageLink('Last', totalPages, 'last-page');
      }

      pagination.innerHTML = `<div class="pagination-bar">${html.trim()}</div>`;

      // pagination links -> SPA
      if (pagination) {
        pagination.querySelectorAll('a').forEach((a) => {
          a.onclick = (ev) => {
            ev.preventDefault();
            const href = a.getAttribute('href') || '';
            const parts = href.split('/').filter(Boolean);
            const newPage = parseInt(parts[2] || '1', 10) || 1;
            const newState = Object.assign({}, state, { page: newPage });
            fetchAndRender(newState, { push: true });
          };
        });
      }
    })
    .catch((err) => {
      console.error('Failed to fetch results', err);
      if (data.result) data.result.innerHTML = '<p>Error loading results.</p>';
    });
}
