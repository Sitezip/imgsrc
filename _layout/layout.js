/* imgsrc.cloud layout loader: shared <head> tags, header + page fragments, then the GitHub listing. No libraries. */
(function () {
    'use strict';

    var BASE = '/_layout/';
    var dir = decodeURIComponent(location.pathname.split('/').filter(Boolean)[0] || '');
    if (/\.html?$/i.test(dir)) dir = '';

    // 1. shared head tags
    var headTags = [
        ['link', { rel: 'stylesheet', href: BASE + 'site.css' }],
        ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/imgsrc.cloud/apple-touch-icon.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/imgsrc.cloud/favicon-32x32.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/imgsrc.cloud/favicon-16x16.png' }],
        ['link', { rel: 'manifest', href: '/site.webmanifest' }],
        ['link', { rel: 'mask-icon', href: '/imgsrc.cloud/safari-pinned-tab.svg', color: '#5bbad5' }],
        ['meta', { name: 'description', content: dir ? 'Images for ' + dir + ' on imgsrc.cloud' : 'img src on the cloud' }],
        ['meta', { name: 'msapplication-TileColor', content: '#da532c' }],
        ['meta', { name: 'theme-color', content: '#ffffff' }]
    ];
    headTags.forEach(function (t) {
        var node = document.createElement(t[0]);
        Object.keys(t[1]).forEach(function (k) { node.setAttribute(k, t[1][k]); });
        document.head.appendChild(node);
    });

    // 2. pick the layout
    var layout = document.body.dataset.layout || (dir ? 'directory' : 'home');
    document.title = layout === 'home'
        ? 'imgsrc.cloud - Image Source on the Cloud'
        : dir + ' - imgsrc.cloud directory file list';

    var ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    var esc = function (s) {
        return String(s).replace(/[&<>"']/g, function (c) { return ENTITIES[c]; });
    };

    var vars = {
        dir: esc(dir),
        title: esc(document.title),
        filterLabel: layout === 'home' ? 'Filter domains' : 'Filter files',
        crumbs: layout === 'home'
            ? '<span class="crumb-current">All domains</span>'
            : '<a href="/">All domains</a><span class="crumb-sep">/</span>' +
              '<span class="crumb-current">' + esc(dir) + '</span>' +
              '<a class="crumb-visit" href="https://' + esc(dir) + '" title="Visit ' + esc(dir) + '">&#x21B1;</a>'
    };
    var render = function (html) {
        return html.replace(/\{\{(\w+)\}\}/g, function (m, key) {
            return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : m;
        });
    };
    var load = function (name) {
        return fetch(BASE + name + '.html').then(function (r) {
            if (!r.ok) throw new Error('Layout "' + name + '" failed: ' + r.status);
            return r.text();
        });
    };

    // 3. load header + page fragment, then 4. the listing script
    Promise.all([load('header'), load(layout)])
        .then(function (parts) {
            document.body.innerHTML = render(parts.join('\n'));
            var s = document.createElement('script');
            s.src = BASE + 'github.js';
            document.body.appendChild(s);
        })
        .catch(function (err) {
            console.error(err);
            document.body.textContent = 'Unable to load layout.';
        });
})();
