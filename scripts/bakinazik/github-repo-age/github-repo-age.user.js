// ==UserScript==
// @name         GitHub Repo Age
// @namespace    https://github.com/bakinazik/scripts
// @version      1.0.0
// @updateURL    https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/github-repo-age/github-repo-age.user.js
// @downloadURL  https://raw.githubusercontent.com/bakinazik/scripts/main/scripts/bakinazik/github-repo-age/github-repo-age.user.js
// @description  Displays the creation date of GitHub repositories using the GitHub API.
// @author       bakinazik
// @icon         https://github.githubassets.com/favicons/favicon-dark.svg
// @match        https://github.com/*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    const log = (...a) => console.log('[Gitdate]', ...a);
    log('script started', window.location.href);
    const match = window.location.href.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/|$)/);
    if (!match) {
        log('url did not match repo pattern, exiting');
        return;
    }
    log('url matched', match[1], match[2]);

    const owner = match[1];
    const repo = match[2];
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

    const cacheKey = `gitdate:${owner}/${repo}`.toLowerCase();

    function show(createdAt) {
        const creationDate = new Date(createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
        log('creation date', creationDate);
        waitForTarget(0, target => insert(creationDate, target));
    }

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        log('cache hit', cacheKey, cached);
        show(cached);
        return;
    }

    log('cache miss, fetching', apiUrl);
    fetch(apiUrl)
        .then(res => {
            log('response status', res.status);
            return res.json();
        })
        .then(data => {
            log('api data', data);
            if (!data.created_at) {
                log('no created_at in response (private repo, rate limit or not a repo)');
                return;
            }
            localStorage.setItem(cacheKey, data.created_at);
            log('cached', cacheKey);
            show(data.created_at);
        })
        .catch(err => log('error', err));

    function findTarget() {
        const link = document.querySelector('a[href="#readme-ov-file"]');
        return link ? (link.closest('.mt-2') || link) : null;
    }

    function waitForTarget(tries, cb) {
        const target = findTarget();
        log('readme target attempt', tries, target);
        if (target) return cb(target);
        if (tries >= 40) {
            log('readme not found, nothing inserted');
            return;
        }
        setTimeout(() => waitForTarget(tries + 1, cb), 250);
    }

    function insert(creationDate, target) {
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.gap = '6px';
            container.style.marginTop = '15px';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '16');
            svg.setAttribute('height', '16');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'var(--fgColor-muted)');
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.style.flexShrink = '0';

            const paths = [
                'M8 2v4',
                'M16 2v4',
                'M3 10h18',
                'M8 14h.01',
                'M12 14h.01',
                'M16 14h.01',
                'M8 18h.01',
                'M12 18h.01',
                'M16 18h.01'
            ];

            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('width', '18');
            rect.setAttribute('height', '18');
            rect.setAttribute('x', '3');
            rect.setAttribute('y', '4');
            rect.setAttribute('rx', '2');
            svg.appendChild(rect);

            for (const d of paths) {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', d);
                svg.appendChild(path);
            }

            const text = document.createElement('span');
            text.textContent = creationDate;
            text.style.fontSize = '14px';
            text.style.color = 'var(--fgColor-muted)';

            container.appendChild(svg);
            container.appendChild(text);

            target.before(container);
            log('date inserted above', target);
    }
})();