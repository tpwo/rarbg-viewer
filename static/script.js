'use strict';

((document) => {
    document.addEventListener('DOMContentLoaded', () => {
        registerSearchBtn();
        document.getElementById('timestamp').innerHTML = Date().toLocaleString();
    });

    function registerSearchBtn() {
        let button = document.querySelector('#btn-search');
        button.addEventListener('click', search);
    }

    async function search() {
        var query = document.getElementById('search-box').value;
        window.location.href = `results?search_query=${query}`;
        // await visitUrl(`results?search_query=${query}`);
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
