/* imgsrc.cloud GitHub directory listing.
   Home: fills #nav with domain cards. Directory: fills #list with image rows (thumb, name, URL, copy, open)
   and drives the #imgsrc / #imgsrc-dk preview. #filter narrows either list. */
(function () {
    'use strict';

    var site   = { baseUrl: 'https://imgsrc.cloud' };
    var api    = {
        baseUrl: 'https://api.github.com',
        zapUrl:  'https://zzzap.io/Utilities/formatting/zcd-read/text/zCd-88003555d757a02a3a3766a1da08c37f',
        token:   null
    };
    var config = { acct: 'Saran-pariyar', repo: 'imgsrc', branch: 'main' };

    var NAV_EXCLUDE  = ['.idea', '.vscode', '_template', '_layout'];
    var FILE_EXCLUDE = ['git', '.cpt', '.md', '.htm', '.xml', '.iml', '.webmanifest', '.js', '.css'];

    var ICON = {
        copy:  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
        eye:   '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
        open:  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
    };

    var currentDir = decodeURIComponent(location.pathname.split('/').filter(Boolean)[0] || '');
    var canHover   = window.matchMedia && window.matchMedia('(hover: hover)').matches;

    // kept on window for debugging, like the old global `response`
    var response = window.imgsrc = { config: config, response: [], count: 0 };

    var nav       = document.getElementById('nav');
    var list      = document.getElementById('list');
    var filter    = document.getElementById('filter');
    var countEl   = document.getElementById('count');
    var toast     = document.getElementById('toast');
    var preview   = document.querySelector('.preview');
    var imgLt     = document.getElementById('imgsrc');
    var imgDk     = document.getElementById('imgsrc-dk');
    var prevName  = document.getElementById('preview-name');
    var prevCopy  = document.getElementById('preview-copy');
    var prevClose = document.getElementById('preview-close');
    var container = list || nav;
    var pinned    = null;
    var shownUrl  = null;

    /* ---------- helpers ---------- */
    var el = function (tag, attrs, text) {
        var node = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'class') node.className = attrs[k];
            else node.setAttribute(k, attrs[k]);
        });
        if (text != null) node.textContent = text;
        return node;
    };

    var iconButton = function (tag, attrs, icon) {
        var b = el(tag, attrs);
        b.classList.add('icon-btn');
        b.innerHTML = ICON[icon];
        return b;
    };

    var toastTimer;
    var showToast = function (text) {
        if (!toast) return;
        toast.textContent = text;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1600);
    };

    var copyText = function (text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise(function (resolve, reject) {
            var ta = el('textarea', { readonly: '', style: 'position:fixed;opacity:0' });
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
            ta.remove();
            if (ok) resolve(); else reject(new Error('copy failed'));
        });
    };

    var copyUrl = function (url, btn) {
        copyText(url).then(function () {
            showToast('Copied ' + url);
            if (!btn) return;
            btn.innerHTML = ICON.check;
            btn.classList.add('copied');
            setTimeout(function () { btn.innerHTML = ICON.copy; btn.classList.remove('copied'); }, 1500);
        }, function () { showToast('Copy failed. Select the URL and copy it manually.'); });
    };

    var updateCount = function () {
        if (!countEl || !container) return;
        var items = container.querySelectorAll('[data-name]');
        var visible = container.querySelectorAll('[data-name]:not([hidden])').length;
        var noun = list ? 'image' : 'domain';
        countEl.textContent = items.length === visible
            ? items.length + ' ' + noun + (items.length === 1 ? '' : 's')
            : visible + ' of ' + items.length + ' ' + noun + 's';
    };

    var showMessage = function (text) {
        if (container) container.appendChild(el(list ? 'li' : 'p', { class: 'msg' }, text));
        if (countEl && container && !container.querySelector('[data-name]')) countEl.textContent = '';
    };

    /* ---------- preview ---------- */
    var setPreview = function (src) {
        if (!imgLt || !imgDk) return;
        shownUrl = src || null;
        if (src) { imgLt.src = src; imgDk.src = src; }
        else { imgLt.removeAttribute('src'); imgDk.removeAttribute('src'); }
        if (preview) preview.classList.toggle('has-image', !!src);
        if (prevName) prevName.textContent = src ? src.split('/').pop() : 'Hover a row or press the eye to preview';
        if (prevCopy) prevCopy.hidden = !src;
    };
    var restorePreview = function () { setPreview(pinned ? pinned.url : null); };

    // Small screens: the preview opens inline under the selected row so it never covers the list.
    // Wide screens: it lives in its sticky side column (its original spot in .dir-body).
    var dirBody = preview && preview.parentNode;
    var narrow  = window.matchMedia('(max-width: 767.98px)');
    var placePreview = function () {
        if (!preview || !dirBody) return;
        if (narrow.matches && pinned) {
            if (preview.parentNode !== pinned.li) pinned.li.appendChild(preview);
            pinned.li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (preview.parentNode !== dirBody) {
            dirBody.appendChild(preview);
        }
    };
    if (narrow.addEventListener) narrow.addEventListener('change', placePreview);
    else if (narrow.addListener) narrow.addListener(placePreview);

    var markActive = function (li, on) {
        li.classList.toggle('active', on);
        var btn = li.querySelector('.preview-btn');
        if (btn) {
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.title = on ? 'Hide preview' : 'Preview';
        }
    };
    var unpin = function () {
        if (pinned) markActive(pinned.li, false);
        pinned = null;
        setPreview(null);
        placePreview();
    };
    var pin = function (url, li) {
        if (pinned && pinned.url === url) { unpin(); return; }
        if (pinned) markActive(pinned.li, false);
        pinned = { url: url, li: li };
        markActive(li, true);
        setPreview(url);
        placePreview();
    };

    if (prevCopy) {
        prevCopy.innerHTML = ICON.copy;
        prevCopy.addEventListener('click', function () { if (shownUrl) copyUrl(shownUrl, prevCopy); });
    }
    if (prevClose) prevClose.addEventListener('click', unpin);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') unpin(); });

    /* ---------- filter ---------- */
    if (filter) {
        filter.addEventListener('input', function () {
            var q = filter.value.trim().toLowerCase();
            if (!container) return;
            container.querySelectorAll('[data-name]').forEach(function (item) {
                item.hidden = q !== '' && item.getAttribute('data-name').indexOf(q) === -1;
            });
            updateCount();
        });
    }

    /* ---------- rendering ---------- */
    var addNavItem = function (path) {
        var card = el('div', { class: 'domain-card', 'data-name': path.toLowerCase() });
        card.appendChild(el('a', { class: 'domain-name', href: site.baseUrl + '/' + path }, path));
        var visit = iconButton('a', { href: 'https://' + path, title: 'Visit ' + path, 'aria-label': 'Visit ' + path, target: '_blank', rel: 'noopener' }, 'open');
        card.appendChild(visit);
        nav.appendChild(card);
        updateCount();
    };

    var addFile = function (name, url) {
        var li = el('li', { class: 'file', 'data-name': name.toLowerCase() });

        // row and thumbnail are inert; only the action buttons respond to clicks
        var thumb = el('div', { class: 'thumb' });
        thumb.appendChild(el('img', { src: url, alt: '', loading: 'lazy', decoding: 'async' }));

        var info = el('div', { class: 'file-info' });
        info.appendChild(el('a', { class: 'file-name', href: url, target: '_blank', rel: 'noopener' }, name));
        info.appendChild(el('code', { class: 'file-url' }, url));

        var actions = el('div', { class: 'file-actions' });
        var view = iconButton('button', { type: 'button', class: 'preview-btn', title: 'Preview', 'aria-label': 'Preview ' + name, 'aria-pressed': 'false' }, 'eye');
        view.addEventListener('click', function () { pin(url, li); });
        var copy = iconButton('button', { type: 'button', title: 'Copy URL', 'aria-label': 'Copy URL for ' + name }, 'copy');
        copy.addEventListener('click', function () { copyUrl(url, copy); });
        actions.appendChild(view);
        actions.appendChild(copy);
        actions.appendChild(iconButton('a', { href: url, target: '_blank', rel: 'noopener', title: 'Open image', 'aria-label': 'Open ' + name }, 'open'));

        // hover still gives a quick look on wide screens with a mouse
        if (canHover) {
            li.addEventListener('mouseenter', function () { if (!narrow.matches) setPreview(url); });
            li.addEventListener('mouseleave', function () { if (!narrow.matches) restorePreview(); });
        }

        li.appendChild(thumb);
        li.appendChild(info);
        li.appendChild(actions);
        list.appendChild(li);
        response.response.push(url);
        updateCount();
    };

    var isListable = function (path) {
        return !FILE_EXCLUDE.some(function (x) { return path.indexOf(x) !== -1; });
    };

    /* ---------- GitHub API ---------- */
    var fetchJson = function (url, dir) {
        var headers = new Headers();
        if (api.token) headers.append('Authorization', 'Bearer ' + api.token);
        return fetch(url, { method: 'GET', headers: headers, redirect: 'follow' })
            .then(function (r) { return r.json(); })
            .then(function (result) { displayData(result, dir); })
            .catch(function (error) { console.error(error); showMessage('Could not load the file list.'); });
    };

    var displayData = function (obj, dir) {
        if (obj && obj.message) { showMessage(obj.message); return; }
        if (obj && obj.git_url) obj = [obj];
        var items = (obj && (obj.tree || obj)) || [];
        if (!Array.isArray(items)) return;
        var isRootTree = !!(obj && obj.tree) && !dir;
        var found = false;

        items.forEach(function (data) {
            if (data.git_url && data.name === config.repo) {
                fetchJson(api.baseUrl + '/repos/' + config.acct + '/' + data.name + '/branches');
            } else if (data.commit && data.name === config.branch) {
                fetchJson(api.baseUrl + '/repos/' + config.acct + '/' + config.repo + '/git/trees/' + data.commit.sha);
            } else if (data.type === 'tree') {
                if (dir) return; // domain folders only live at the top level
                if (nav && !NAV_EXCLUDE.some(function (x) { return data.path.indexOf(x) !== -1; })) addNavItem(data.path);
                if (list && data.path === currentDir) {
                    found = true;
                    fetchJson(data.url, data.path);
                    response.count++;
                }
            } else if (data.type === 'blob' && dir && list && isListable(data.path)) {
                addFile(data.path, site.baseUrl + '/' + dir + '/' + data.path);
            }
        });

        if (list && isRootTree && !found) showMessage('No folder named "' + currentDir + '" in the repo.');
        if (list && dir && !list.querySelector('[data-name]')) showMessage('No images in this folder yet.');
    };

    setPreview(null);
    if (countEl) countEl.textContent = 'Loading…';

    fetch(api.zapUrl)
        .then(function (r) { return r.json(); })
        .then(function (result) { api.token = (result && result.response) || null; })
        .catch(function (error) { console.error(error); })
        .then(function () { fetchJson(api.baseUrl + '/repos/' + config.acct + '/' + config.repo); });
})();
