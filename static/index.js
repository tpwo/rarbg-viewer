import { CATEGORY_ICNOS, SORT_ICONS } from './consts.js';
import { escapeHtml, getTopLevelCategory, humanReadableSize } from './helpers.js';

// Config
const PER_PAGE_OPTIONS = [20, 40, 100];

// Utilities
function show(el) {
  if (!el) return;
  try {
    el.classList.remove('hidden');
  } catch (_e) {}
  try {
    el.style.display = '';
  } catch (_e) {}
}

function hide(el) {
  if (!el) return;
  try {
    el.classList.add('hidden');
  } catch (_e) {}
  try {
    el.style.display = 'none';
  } catch (_e) {}
}

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

function buildPathForState(state) {
  if (!state || !state.query) return '/';
  const params = new URLSearchParams();
  if (state.perPage) params.set('per_page', String(state.perPage));
  if (state.sortCol) params.set('sort_col', state.sortCol);
  if (state.sortDir) params.set('sort_dir', state.sortDir);
  if (state.category) params.set('category', state.category);
  const paramStr = params.toString();
  return `/search/${encodeURIComponent(state.query)}/${state.page || 1}/${paramStr ? `?${paramStr}` : ''}`;
}

function buildResultsApiUrl(state) {
  const params = new URLSearchParams();
  params.set('search_query', state.query || '');
  params.set('page', String(state.page || 1));
  params.set('per_page', String(state.perPage || 20));
  if (state.category) params.set('category', state.category);
  if (state.sortCol) params.set('sort_col', state.sortCol);
  if (state.sortDir) params.set('sort_dir', state.sortDir);
  return `/results?${params.toString()}`;
}

function fetchAndRender(state, opts = { push: false, replace: false }) {
  if (!state || !state.query) return;
  const path = buildPathForState(state);
  try {
    if (opts.replace) window.history.replaceState({}, '', path);
    else if (opts.push) window.history.pushState({}, '', path);
  } catch (_e) {}
  if (results) results.innerHTML = '<div class="spinner"></div>';
  if (results) show(results);
  if (pagination) show(pagination);
  const apiUrl = buildResultsApiUrl(state);
  fetch(apiUrl)
    .then((res) => res.json())
    .then((data) => {
      _renderResults(
        data.result || [],
        data.total_count || 0,
        results,
        state.page || 1,
        state.perPage || 20,
        PER_PAGE_OPTIONS,
        pagination,
        state.sortCol || 'title',
        state.sortDir || 'asc',
      );
      if ((data.result || []).length > 0) {
        _renderPagination(
          data.total_count || 0,
          pagination,
          state.perPage || 20,
          state.sortCol || 'title',
          state.sortDir || 'asc',
          state.page || 1,
          state.query || '',
        );
      } else {
        if (pagination) hide(pagination);
      }

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
      if (results) results.innerHTML = '<p>Error loading results.</p>';
    });
}

// Wire initial page load and UI events
document.addEventListener('DOMContentLoaded', () => {
  const initialState = readStateFromUrl();
  if (initialState.query) fetchAndRender(initialState, { replace: true });

  // Search form -> SPA search
  document.getElementById('btn-search').addEventListener('click', () => {
    const state = {
      query: searchbox.value,
      page: 1,
      perPage: PER_PAGE_OPTIONS[0],
      sortCol: 'title',
      sortDir: 'asc',
      category: categories.value,
    };
    fetchAndRender(state, { push: true });
  });
  searchbox.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      document.getElementById('btn-search').click();
    }
  });

  // Category select
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

function _renderPagination(
  totalCount,
  paginationContainer,
  perPage,
  sortCol,
  sortDir,
  page,
  query,
) {
  paginationContainer.style.display = '';
  let totalPages = Math.ceil(totalCount / perPage);
  if (totalPages === 0) totalPages = 1;
  let html = '';
  // Preserve sort params in pagination links
  const params = new URLSearchParams(window.location.search);
  if (params.has('page')) params.delete('page');
  params.set('sort_col', sortCol);
  params.set('sort_dir', sortDir);
  const paramStr = params.toString() ? `?${params.toString()}` : '';

  // Helper to build page link
  function pageLink(label, p, extraClass = '') {
    if (p < 1 || p > totalPages) return '';
    if (p === page) {
      return `<span class="current-page${extraClass ? ` ${extraClass}` : ''}">${p}</span>`;
    }
    return `<a href="/search/${encodeURIComponent(query)}/${p}/${paramStr}" class="${extraClass}">${label}</a>`;
  }

  // How many page numbers to show at once
  const windowSize = 7;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }

  // First/<<
  if (page > 1) {
    html += `${pageLink('First', 1, 'first-page')} `;
    html += `${pageLink('&lt;&lt;', page - 1, 'prev-page')} `;
  }

  // Page numbers
  for (let i = start; i <= end; i++) {
    html += `${pageLink(i, i)} `;
  }

  // >>/Last
  if (page < totalPages) {
    html += `${pageLink('&gt;&gt;', page + 1, 'next-page')} `;
    html += pageLink('Last', totalPages, 'last-page');
  }

  paginationContainer.innerHTML = `<div class="pagination-bar">${html.trim()}</div>`;
}

function _renderResults(
  results,
  totalCount,
  resultsContainer,
  page,
  perPage,
  perPageOptions,
  paginationContainer,
  sortCol,
  sortDir,
) {
  if (_checkMinQueryLength()) return;
  show(results);
  if (resultsContainer) resultsContainer.classList.remove('hidden');
  // Per-page dropdown UI
  // Calculate current range
  const startIdx = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, totalCount);
  const rangeText = totalCount === 0 ? '' : `${startIdx}-${endIdx}`;
  const perPageHtml = `
<div class="per-page-bar">
  <div class="results-count">
    ${rangeText ? `<span class='results-range'>Showing results ${rangeText}<br></span> ` : ''}${totalCount} total found
  </div>
  <div class="per-page-controls">
    <label for="perPageSelect">Per page:</label>
    <select id="perPageSelect" class="per-page-select">
      ${perPageOptions.map((opt) => `<option value="${opt}"${opt === perPage ? ' selected' : ''}>${opt}</option>`).join('')}
    </select>
  </div>
</div>`;
  perPageContainer.innerHTML = perPageHtml;
  if (perPageContainer) perPageContainer.classList.remove('hidden');
  setTimeout(() => {
    if (perPageSelect) {
      perPageSelect.onchange = () => {
        const params = new URLSearchParams(window.location.search);
        params.set('per_page', perPageSelect.value);
        // Always go to page 1 when per-page changes
        params.set('page', '1');
        // If using /search/{query}/{page}/ path, update location accordingly
        const pathParts = window.location.pathname.split('/').filter(Boolean);
        if (pathParts[0] === 'search' && pathParts.length >= 2) {
          let url = `/search/${decodeURIComponent(pathParts[1])}/1/`;
          const paramStr = params.toString();
          if (paramStr) url += `?${paramStr}`;
          window.location.href = url;
        } else {
          window.location.search = params.toString();
        }
      };
    }
  }, 0);
  if (results.length === 0) {
    if (perPageContainer) {
      perPageContainer.innerHTML = '';
      perPageContainer.classList.add('hidden');
    }
    if (resultsContainer) {
      resultsContainer.innerHTML = '<p>No results found.</p>';
      resultsContainer.classList.remove('hidden');
    }
    if (paginationContainer) paginationContainer.classList.add('hidden');
    return;
  }
  if (paginationContainer) paginationContainer.classList.remove('hidden');
  // Sorting state
  if (!window._rtSortState) {
    window._rtSortState = { col: sortCol, dir: sortDir };
  }
  const sortState = window._rtSortState;
  resultsContainer.innerHTML = `
<table class="results-table compact-table">
    <thead>
        <tr>
            <th class="sortable" data-col="title">Name ${sortState.col === 'title' ? SORT_ICONS[sortState.dir] : ''}</th>
            <th class="sortable" data-col="date">Date ${sortState.col === 'date' ? SORT_ICONS[sortState.dir] : ''}</th>
            <th class="sortable" data-col="size">Size ${sortState.col === 'size' ? SORT_ICONS[sortState.dir] : ''}</th>
            <th></th>
        </tr>
    </thead>
    <tbody>
        ${results
          .map((r) => {
            const topCat = getTopLevelCategory(r.cat);
            const icon = CATEGORY_ICNOS[topCat] || CATEGORY_ICNOS.Other;
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
  // Add sorting event listeners
  setTimeout(() => {
    document.querySelectorAll('.results-table th.sortable').forEach((th) => {
      th.onclick = () => {
        const col = th.getAttribute('data-col');
        if (sortState.col === col) {
          sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
        } else {
          sortState.col = col;
          sortState.dir = 'asc';
        }
        // Use SPA fetch: update state and fetch page 1 with new sort
        const s = readStateFromUrl();
        s.page = 1;
        s.sortCol = sortState.col;
        s.sortDir = sortState.dir;
        fetchAndRender(s, { push: true });
      };
    });
  }, 0);
}

function _checkMinQueryLength() {
  if (searchbox.value.length < 3) {
    results.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
    if (perPageContainer) hide(perPageContainer);
    return true;
  }
  if (perPageContainer) show(perPageContainer);
  return false;
}
