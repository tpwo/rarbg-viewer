'use strict';

((document) => {
    document.addEventListener('DOMContentLoaded', () => {
        registerSearchBtn();
        registerSearchBoxEnter();
        document.getElementById('timestamp').innerHTML = Date().toLocaleString();
    });

    function registerSearchBtn() {
        let button = document.querySelector('#btn-search');
        button.addEventListener('click', search);
    }

    function registerSearchBoxEnter() {
        let searchBox = document.getElementById('search-box');
        if (searchBox) {
            searchBox.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    search();
                }
            });
        }
    }

    async function search() {
        var query = document.getElementById('search-box').value;
        var category = document.getElementById('category-select') ? document.getElementById('category-select').value : '';
        let url = `/search/${encodeURIComponent(query)}/1/`;
        if (category) {
            url += `?category=${encodeURIComponent(category)}`;
        }
        if (query) {
            window.location.href = url;
        }
    }

    async function visitUrl(url) {
        await fetch(url)
            .catch((err) => console.error(err));
    }

    function updateHtml({url, key, id}) {
        fetchUrl(url, key)
            .then((data) => document.getElementById(id).innerHTML = data);
    }

    async function fetchUrl(url, key) {
        const response = await fetch(url)
            .catch((err) => console.error(err));
        const data = await response.json();
        console.log(`Got ${key} = ${data[key]} from ${url}`);
        return data[key];
    }
})(document);
