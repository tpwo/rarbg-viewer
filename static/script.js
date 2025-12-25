
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

    // Extract query and page from URL
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const query = decodeURIComponent(pathParts[1] || '');
    const page = parseInt(pathParts[2] || '1', 10);
    const resultsContainer = document.getElementById('results');
    const paginationContainer = document.getElementById('pagination');
    const perPage = 20;

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
        fetch(url)
            .then(res => res.json())
            .then(data => {
                renderResults(data.result || []);
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

    function renderResults(results) {
        resultsContainer.style.display = '';
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p>No results found.</p>';
            paginationContainer.style.display = 'none';
            return;
        }
        paginationContainer.style.display = '';
        resultsContainer.innerHTML = `
            <table class="results-table compact-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Date</th>
                        <th>Size</th>
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
        if (!document.getElementById('magnet-icon-style')) {
            const style = document.createElement('style');
            style.id = 'magnet-icon-style';
            style.textContent = `
                .magnet-link { margin-left: 4px; vertical-align: middle; }
                .magnet-icon { vertical-align: middle; color: #e74c3c; transition: color 0.2s; }
                .magnet-link:hover .magnet-icon { color: #c0392b; }
                .results-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
                .results-table th, .results-table td { padding: 0.35rem 0.6rem; text-align: left; vertical-align: middle; }
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
        if (page > 1) {
            html += `<a href="/search/${encodeURIComponent(query)}/${page-1}/">Previous</a> `;
        }
        html += `Page ${page} of ${totalPages}`;
        if (page < totalPages) {
            html += ` <a href="/search/${encodeURIComponent(query)}/${page+1}/">Next</a>`;
        }
        paginationContainer.innerHTML = html;
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
        var category = document.getElementById('category-select') ? document.getElementById('category-select').value : '';
        let url = `/search/${encodeURIComponent(queryVal)}/1/`;
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        if (queryVal) {
            window.location.href = url;
        }
    }
});
