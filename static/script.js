
// Unified script for search, pagination, and timestamp
document.addEventListener('DOMContentLoaded', function() {
    // Timestamp in footer
    const ts = document.getElementById('timestamp');
    if (ts) ts.innerHTML = Date().toLocaleString();

    // Search button and enter key
    const searchBtn = document.getElementById('btn-search');
    const searchBox = document.getElementById('search-box');
    if (searchBtn) searchBtn.addEventListener('click', doSearch);
    if (searchBox) {
        searchBox.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                doSearch();
            }
        });
    }

    // Extract query, page, and sort from URL
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const query = decodeURIComponent(pathParts[1] || '');
    const page = parseInt(pathParts[2] || '1', 10);
    const resultsContainer = document.getElementById('results');
    const paginationContainer = document.getElementById('pagination');
    const perPage = 20;
    const urlParams = new URLSearchParams(window.location.search);
    const sortCol = urlParams.get('sort_col') || 'title';
    const sortDir = urlParams.get('sort_dir') || 'asc';

    function getCategoryFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('category') || '';
    }

    function showSpinner() {
        resultsContainer.innerHTML = '<div class="spinner"></div>';
        resultsContainer.style.display = '';
    }

    function fetchResults() {
        if (!query) return;
        showSpinner();
        const category = getCategoryFromUrl();
        let url = `/results?search_query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (sortCol) url += `&sort_col=${encodeURIComponent(sortCol)}`;
        if (sortDir) url += `&sort_dir=${encodeURIComponent(sortDir)}`;
        fetch(url)
            .then(res => res.json())
            .then(data => {
                renderResults(data.result || [], data.total_count || 0);
                if ((data.result || []).length > 0) {
                    renderPagination(data.total_count || 0);
                } else {
                    paginationContainer.style.display = 'none';
                }
            });
    }

    function humanReadableSize(size) {
        if (typeof size !== 'number' || isNaN(size) || size === 0) return 'N/A';
        if (size < 1000) return size + ' B';
        const units = ['KB', 'MB', 'GB', 'TB'];
        let unit = -1;
        do {
            size = size / 1000;
            unit++;
        } while (size >= 1000 && unit < units.length - 1);
        return size.toFixed(2) + ' ' + units[unit];
    }

    function renderResults(results, totalCount) {
        resultsContainer.style.display = '';
        if (results.length === 0) {
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
            none: ''
        };
        resultsContainer.innerHTML = `
            <div class="results-count" style="margin-bottom: 0.5em; font-size: 1.08em; color: #444;">${totalCount} result${totalCount === 1 ? '' : 's'} found</div>
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
                    ${results.map(r => `
                        <tr class="result-card-row">
                            <td class="result-title">
                                <span class="badge">${escapeHtml(r.cat)}</span>
                                ${escapeHtml(r.title)}
                            </td>
                            <td>${escapeHtml(r.date)}</td>
                            <td>${humanReadableSize(Number(r.size))}</td>
                            <td>
                                <a href="${r.magnet}" class="magnet-link" title="Download via Magnet">
                                    <svg class="magnet-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" stroke-width="2"/>
                                        <path d="M7 12v2a3 3 0 0 0 6 0v-2" stroke="currentColor" stroke-width="2"/>
                                        <circle cx="10" cy="17" r="1" fill="currentColor"/>
                                    </svg>
                                </a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        // Add sorting event listeners
        setTimeout(() => {
            document.querySelectorAll('.results-table th.sortable').forEach(th => {
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
                    const category = params.get('category');
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

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function renderPagination(totalCount) {
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
                return `<span class="current-page${extraClass ? ' ' + extraClass : ''}">${p}</span>`;
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
            html += pageLink('First', 1, 'first-page') + ' ';
            html += pageLink('&lt;&lt;', page - 1, 'prev-page') + ' ';
        }

        // Page numbers
        for (let i = start; i <= end; i++) {
            html += pageLink(i, i) + ' ';
        }

        // >>/Last
        if (page < totalPages) {
            html += pageLink('&gt;&gt;', page + 1, 'next-page') + ' ';
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

    setTimeout(function() {
        if (searchBox) searchBox.value = query;
        const category = getCategoryFromUrl();
        const catSelect = document.getElementById('category-select');
        if (catSelect && category) catSelect.value = category;
    }, 0);

    setTimeout(function() {
        const catSelect = document.getElementById('category-select');
        if (catSelect) {
            catSelect.addEventListener('change', function() {
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
        fetchResults();
    }

    // Intercept magnet link clicks to stay in the same tab
    document.body.addEventListener('click', function(e) {
        const target = e.target.closest('a.magnet-link');
        if (target) {
            e.preventDefault();
            window.location.href = target.href;
        }
    });

    function doSearch() {
        var queryVal = searchBox ? searchBox.value : '';
        if (queryVal.length < 3) {
            resultsContainer.innerHTML = '<p>Please enter at least 3 characters to search.</p>';
            resultsContainer.style.display = '';
            paginationContainer.style.display = 'none';
            if (searchBox) searchBox.focus();
            return;
        }
        var category = document.getElementById('category-select') ? document.getElementById('category-select').value : '';
        let url = `/search/${encodeURIComponent(queryVal)}/1/`;
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        window.location.href = url;
    }
});
