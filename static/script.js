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
    resultsContainer.style.display = '';
    paginationContainer.style.display = '';

    if (!query) return;

    // Show spinner
    resultsContainer.innerHTML = '<div class="spinner"></div>';
    resultsContainer.style.display = '';

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
          paginationContainer.style.display = 'none';
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
  // Optional: add some minimal CSS for clarity
  if (!document.getElementById('pagination-style')) {
    const style = document.createElement('style');
    style.id = 'pagination-style';
    style.textContent = `
                .pagination-bar { margin: 1em 0; font-size: 1.1em; text-align: center; }
                .pagination-bar a { margin: 0 0.2em; text-decoration: none; color: #2d7dd2; font-weight: 500; }
                .pagination-bar a:hover { text-decoration: underline; }
                .pagination-bar .current-page { margin: 0 0.2em; font-weight: bold; color: #222; }
            `;
    document.head.appendChild(style);
  }
}

function doSearch(searchBox, resultsContainer, paginationContainer) {
  var queryVal = searchBox ? searchBox.value : '';
  if (queryVal.length < 3) {
    resultsContainer.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
    resultsContainer.style.display = '';
    paginationContainer.style.display = 'none';
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
  // Category icon SVGs (simple, recognizable)
  const categoryIcons = {
    Movies: '<i class="bi bi-film" title="Movies" style="font-size: 1.25em;"></i>',
    TV: '<i class="bi bi-tv" title="TV" style="font-size: 1.25em;"></i>',
    Games: '<i class="bi bi-controller" title="Games" style="font-size: 1.25em;"></i>',
    Music: '<i class="bi bi-music-note-beamed" title="Music" style="font-size: 1.25em;"></i>',
    Books: '<i class="bi bi-book" title="Books" style="font-size: 1.25em;"></i>',
    Software: '<i class="bi bi-cpu" title="Software" style="font-size: 1.25em;"></i>',
    Adult: '<i class="bi bi-person-video" title="Adult" style="font-size: 1.25em;"></i>',
    Other: '<i class="bi bi-folder" title="Other" style="font-size: 1.25em;"></i>',
  };

  resultsContainer.style.display = '';
  // Per-page dropdown UI
  // Calculate current range
  const startIdx = totalCount === 0 ? 0 : (page - 1) * perPage + 1;
  const endIdx = Math.min(page * perPage, totalCount);
  const rangeText = totalCount === 0 ? '' : `${startIdx}-${endIdx}`;
  const perPageHtml = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1em; margin-top: 0.5em; padding-top: 0.5em;">
            <div class="results-count" style="font-size: 1.08em; color: #444;">
                ${rangeText ? `<span class='results-range'>Showing results ${rangeText}<br></span> ` : ''}${totalCount} total found
            </div>
            <div style="font-size: 1.08em; color: #444;">
                <label for="per-page-select" style="margin-right: 0.4em;">Per page:</label>
                <select id="per-page-select" style="font-size: 1em; padding: 0.1em 0.5em;">
                    ${perPageOptions.map((opt) => `<option value="${opt}"${opt === perPage ? ' selected' : ''}>${opt}</option>`).join('')}
                </select>
            </div>
        </div>`;
  document.getElementById('per-page-container').innerHTML = perPageHtml;
  document.getElementById('per-page-container').style.display = '';
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
    document.getElementById('per-page-container').innerHTML = '';
    document.getElementById('per-page-container').style.display = 'none';
    resultsContainer.innerHTML = '<p>No results found.</p>';
    paginationContainer.style.display = 'none';
    return;
  }
  paginationContainer.style.display = '';
  // Sorting state
  if (!window._rtSortState) {
    window._rtSortState = { col: sortCol, dir: sortDir };
  }
  const sortState = window._rtSortState;
  const sortIcons = {
    asc: '▲',
    desc: '▼',
    none: '',
  };
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
                            <td class="result-title" style="display: flex; align-items: center; gap: 0.5em;">
                                <span class="cat-icon" title="${escapeHtml(topCat)}">${icon}</span>
                                <span style="vertical-align: middle;">${escapeHtml(r.title)}</span>
                            </td>
                            <td>${escapeHtml(r.date)}</td>
                            <td>${humanReadableSize(Number(r.size))}</td>
                            <td>
                                <a href="${r.magnet}" class="magnet-link" title="Download via Magnet">
                                    <i class="bi bi-link" style="font-size: 1.25em;"></i>
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
      th.style.cursor = 'pointer';
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
  if (!document.getElementById('magnet-icon-style')) {
    const style = document.createElement('style');
    style.id = 'magnet-icon-style';
    style.textContent = `
                .magnet-link { margin-left: 4px; vertical-align: middle; }
                .magnet-icon { vertical-align: middle; color: #e74c3c; transition: color 0.2s; }
                .magnet-link:hover .magnet-icon { color: #c0392b; }
                .results-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                .results-table th, .results-table td { padding: 0.35rem 0.6rem; text-align: left; vertical-align: middle; user-select: none; }
                .results-table th.sortable { color: #2d7dd2; }
                .results-table th.sortable:hover { text-decoration: underline; }
                .results-table th { background: #f4faff; font-weight: 600; border-bottom: 1px solid #e0e0e0; }
                .result-card-row { background: #fff; border-radius: 4px; transition: box-shadow 0.2s; }
                .result-card-row:hover { box-shadow: 0 2px 8px 0 #e0e8f0; }
                .result-title { font-size: 1rem; font-weight: 500; }
                .badge { display: inline-block; background: #2d7dd2; color: #fff; border-radius: 4px; padding: 0.1em 0.6em; font-size: 0.85em; margin-right: 0.5em; }
            `;
    document.head.appendChild(style);
  }
}

function getTopLevelCategory(cat) {
  for (const [top, subs] of Object.entries({
    Movies: new Set([
      'movies',
      'movies_bd_full',
      'movies_bd_remux',
      'movies_x264',
      'movies_x264_3d',
      'movies_x264_4k',
      'movies_x264_720',
      'movies_x265',
      'movies_x265_4k',
      'movies_x265_4k_hdr',
      'movies_xvid',
      'movies_xvid_720',
    ]),
    TV: new Set(['tv', 'tv_sd', 'tv_uhd']),
    Games: new Set(['games_pc_iso', 'games_pc_rip', 'games_ps3', 'games_ps4', 'games_xbox360']),
    Music: new Set(['music_flac', 'music_mp3']),
    Books: new Set(['ebooks']),
    Software: new Set(['software_pc_iso']),
    Adult: new Set(['xxx']),
  })) {
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
