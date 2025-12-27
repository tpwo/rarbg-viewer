import { categoryIcons, categorySets, sortIcons } from './consts.js';

document.addEventListener('DOMContentLoaded', () => {
  // Timestamp in footer
  const ts = document.getElementById('timestamp');
  if (ts) ts.innerHTML = Date().toLocaleString();

  // Search button and enter key
  const searchBtn = document.getElementById('btn-search');
  const searchBox = document.getElementById('search-box');
  if (searchBtn)
    searchBtn.addEventListener('click', () =>
      doSearch(searchBox, resultsContainer, paginationContainer),
    );
  if (searchBox) {
    searchBox.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        doSearch(searchBox, resultsContainer, paginationContainer);
      }
    });
  }

  // Extract query, page, and sort from URL
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const query = decodeURIComponent(pathParts[1] || '');
  const page = parseInt(pathParts[2] || '1', 10);
  const resultsContainer = document.getElementById('results');
  const paginationContainer = document.getElementById('pagination');
  // Per-page dropdown state
  const perPageOptions = [20, 40, 100];
  const urlParams = new URLSearchParams(window.location.search);
  let perPage = 20;
  if (urlParams.get('per_page')) {
    const val = parseInt(urlParams.get('per_page'), 10);
    if (perPageOptions.includes(val)) perPage = val;
  }
  const sortCol = urlParams.get('sort_col') || 'title';
  const sortDir = urlParams.get('sort_dir') || 'asc';

  setTimeout(() => {
    if (searchBox) searchBox.value = query;
    const category = getCategoryFromUrl();
    const catSelect = document.getElementById('category-select');
    if (catSelect && category) catSelect.value = category;
  }, 0);

  setTimeout(() => {
    const catSelect = document.getElementById('category-select');
    if (catSelect) {
      catSelect.addEventListener('change', () => {
        const queryVal = searchBox ? searchBox.value : '';
        if (!queryVal) return;
        let url = `/search/${encodeURIComponent(queryVal)}/1/`;
        if (catSelect.value) url += `?category=${encodeURIComponent(catSelect.value)}`;
        window.location.href = url;
      });
    }
  }, 0);

  if (query) {
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.remove('hidden');

    if (!query) return;

    // Show spinner
    resultsContainer.innerHTML = '<div class="spinner"></div>';
    if (resultsContainer) resultsContainer.classList.remove('hidden');

    const category = getCategoryFromUrl();
    let url = `/results?search_query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    if (category) url += `&category=${encodeURIComponent(category)}`;
    if (sortCol) url += `&sort_col=${encodeURIComponent(sortCol)}`;
    if (sortDir) url += `&sort_dir=${encodeURIComponent(sortDir)}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        _renderResults(
          data.result || [],
          data.total_count || 0,
          resultsContainer,
          page,
          perPage,
          perPageOptions,
          paginationContainer,
          sortCol,
          sortDir,
        );
        if ((data.result || []).length > 0) {
          _renderPagination(
            data.total_count || 0,
            paginationContainer,
            perPage,
            sortCol,
            sortDir,
            page,
            query,
          );
        } else {
          if (paginationContainer) paginationContainer.classList.add('hidden');
        }
      });
  }

  // Intercept magnet link clicks to stay in the same tab
  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('a.magnet-link');
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

function doSearch(searchBox, resultsContainer, paginationContainer) {
  var queryVal = searchBox ? searchBox.value : '';
  if (queryVal.length < 3) {
    resultsContainer.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
    if (resultsContainer) resultsContainer.classList.remove('hidden');
    if (paginationContainer) paginationContainer.classList.add('hidden');
    if (searchBox) searchBox.focus();
    return;
  }
  var category = document.getElementById('category-select')
    ? document.getElementById('category-select').value
    : '';
  let url = `/search/${encodeURIComponent(queryVal)}/1/`;
  if (category) {
    url += `?category=${encodeURIComponent(category)}`;
  }
  window.location.href = url;
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
  if (resultsContainer) resultsContainer.classList.remove('hidden');
  // Per-page dropdown UI
  // Calculate current range
  const startIdx = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, totalCount);
  const rangeText = totalCount === 0 ? '' : `${startIdx}-${endIdx}`;
  const perPageHtml = `<div class="per-page-bar">
        <div class="results-count">${rangeText ? `<span class='results-range'>Showing results ${rangeText}<br></span> ` : ''}${totalCount} total found</div>
        <div class="per-page-controls"><label for="per-page-select">Per page:</label><select id="per-page-select" class="per-page-select">${perPageOptions.map((opt) => `<option value="${opt}"${opt === perPage ? ' selected' : ''}>${opt}</option>`).join('')}</select></div>
      </div>`;
  document.getElementById('per-page-container').innerHTML = perPageHtml;
  const _ppc = document.getElementById('per-page-container');
  if (_ppc) _ppc.classList.remove('hidden');
  setTimeout(() => {
    const select = document.getElementById('per-page-select');
    if (select) {
      select.onchange = () => {
        const params = new URLSearchParams(window.location.search);
        params.set('per_page', select.value);
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
    const _ppc2 = document.getElementById('per-page-container');
    if (_ppc2) {
      _ppc2.innerHTML = '';
      _ppc2.classList.add('hidden');
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
                        <th class="sortable" data-col="title">Name ${sortState.col === 'title' ? sortIcons[sortState.dir] : ''}</th>
                        <th class="sortable" data-col="date">Date ${sortState.col === 'date' ? sortIcons[sortState.dir] : ''}</th>
                        <th class="sortable" data-col="size">Size ${sortState.col === 'size' ? sortIcons[sortState.dir] : ''}</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${results
                      .map((r) => {
                        const topCat = getTopLevelCategory(r.cat);
                        const icon = categoryIcons[topCat] || categoryIcons.Other;
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
        // Update URL path to page 1 and preserve sort/category params
        const params = new URLSearchParams(window.location.search);
        params.set('sort_col', sortState.col);
        params.set('sort_dir', sortState.dir);
        // Remove page param from query string (will be in path)
        params.delete('page');
        const _category = params.get('category');
        let url = `/search/${encodeURIComponent(query)}/1/`;
        const paramStr = params.toString();
        if (paramStr) url += `?${paramStr}`;
        window.location.href = url;
      };
    });
  }, 0);
}

function getTopLevelCategory(cat) {
  for (const [top, subs] of Object.entries(categorySets)) {
    if (subs.has(cat)) return top;
  }
  return 'Other';
}

function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('category') || '';
}

function humanReadableSize(size) {
  if (typeof size !== 'number' || Number.isNaN(size) || size === 0) return 'N/A';
  if (size < 1000) return `${size} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let unit = -1;
  do {
    size = size / 1000;
    unit++;
  } while (size >= 1000 && unit < units.length - 1);
  return `${size.toFixed(2)} ${units[unit]}`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
