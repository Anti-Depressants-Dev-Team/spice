/**
 * VK Music Layout for Spice (YouTube Music)
 * Creates a VK Music-style UI shell with custom player controls.
 * Appends elements to document.documentElement to bypass body transforms.
 */
(function () {
    'use strict';

    console.log('[VK Layout] Starting...');
    if (window.__vkLayoutInjected) {
        console.log('[VK Layout] Already injected, skipping.');
        return;
    }
    window.__vkLayoutInjected = true;

    // ============= CONSTANTS =============
    const SW = 200; // sidebar width
    const TH = 48;  // topbar height
    const PH = 50;  // player height
    const TAH = 40; // tabs height
    const SH = 44;  // search height
    const TOTAL_TOP = TH + PH + TAH + SH; // 182px

    // ============= INJECT CRITICAL CSS =============
    // This is the MOST important part - override YouTube Music's layout
    const criticalCSS = document.createElement('style');
    criticalCSS.id = 'vk-critical-css';
    criticalCSS.textContent = `
        /* Reset transforms that break fixed positioning */
        html, body {
            transform: none !important;
            will-change: auto !important;
            contain: none !important;
            overflow: visible !important;
        }

        /* VK Root Container */
        #vk-root {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            font-family: 'Roboto', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif !important;
        }

        #vk-root > * {
            pointer-events: auto !important;
        }

        /* Push YT Music content */
        ytmusic-app-layout,
        ytmusic-app,
        #layout {
            margin-left: ${SW}px !important;
            padding-top: ${TOTAL_TOP}px !important;
            width: calc(100% - ${SW}px) !important;
            box-sizing: border-box !important;
        }

        /* Hide YT Music native nav */
        ytmusic-nav-bar,
        ytmusic-pivot-bar-renderer,
        #nav-bar,
        ytmusic-guide-renderer,
        tp-yt-app-drawer,
        #guide-wrapper,
        #guide-inner-content,
        ytmusic-app-layout > [slot="guide"],
        .guide-wrapper,
        .nav-bar-background {
            display: none !important;
            width: 0 !important;
            min-width: 0 !important;
            visibility: hidden !important;
        }

        /* Hide native header/search */
        ytmusic-header-renderer,
        .header.ytmusic-app,
        #header-bar,
        ytmusic-search-box,
        .search-box.ytmusic-search-box,
        .center-content.ytmusic-nav-bar,
        .right-content.ytmusic-nav-bar {
            display: none !important;
        }

        /* Hide native player bar (we have a custom one) */
        ytmusic-player-bar {
            position: fixed !important;
            bottom: -999px !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
            overflow: hidden !important;
        }

        /* Remove guide margin from browse response */
        ytmusic-browse-response,
        ytmusic-search-page {
            padding-top: 0 !important;
        }

        /* Content area remove double spacing */
        #content.ytmusic-app-layout,
        #contents {
            padding-top: 0 !important;
        }
    `;
    document.documentElement.appendChild(criticalCSS);
    console.log('[VK Layout] Critical CSS injected');

    // ============= COLORS =============
    const C = {
        blue: '#0077FF',
        bgSidebar: '#0e0e0e',
        bgTopbar: '#1a1a1a',
        bgPlayer: '#1e1e1e',
        bgContent: '#191919',
        bgInput: '#252525',
        border: '#2a2a2a',
        text1: '#e1e3e6',
        text2: '#939699',
        textM: '#656565',
        hover: 'rgba(255,255,255,0.05)',
    };

    // ============= ROOT CONTAINER =============
    // All VK elements go inside this container which sits on <html>
    const root = document.createElement('div');
    root.id = 'vk-root';
    document.documentElement.appendChild(root);
    console.log('[VK Layout] Root container created');

    // ============= HELPER =============
    function mk(tag, css, html) {
        const e = document.createElement(tag);
        if (css) e.style.cssText = css;
        if (html) e.innerHTML = html;
        return e;
    }

    function getVideo() { return document.querySelector('video'); }

    function ytClick(sels) {
        for (const s of sels) {
            const b = document.querySelector(s);
            if (b) { b.click(); return true; }
        }
        return false;
    }

    // ============= BUILD SIDEBAR =============
    const sidebar = mk('div', `
        position: fixed; top: 0; left: 0;
        width: ${SW}px; height: 100vh;
        background: ${C.bgSidebar};
        border-right: 1px solid ${C.border};
        z-index: 2147483646;
        overflow-y: auto; overflow-x: hidden;
        display: flex; flex-direction: column;
        font-family: 'Roboto', -apple-system, 'Segoe UI', sans-serif;
        color: ${C.text2};
    `);

    // VK Logo
    sidebar.appendChild(mk('div', `
        padding: 14px; cursor: pointer; flex-shrink: 0;
    `, '<svg viewBox="0 0 48 48" width="36" height="36" fill="none"><rect width="48" height="48" rx="12" fill="#0077FF"/><path d="M25.54 34.58c-10.94 0-17.18-7.5-17.44-19.98h5.48c.18 9.24 4.26 13.16 7.48 13.96V14.6h5.16v7.98c3.18-.34 6.52-3.94 7.64-7.98h5.16c-.86 4.96-4.46 8.56-7.02 10.06 2.56 1.22 6.64 4.36 8.2 9.92h-5.68c-1.22-3.82-4.26-6.78-8.3-7.18v7.18h-.68z" fill="#fff"/></svg>'));
    sidebar.querySelector('div').addEventListener('click', () => location.href = 'https://music.youtube.com/');

    // Nav items
    const navItems = [
        ['🎵', 'Music', '/', true],
        null,
        ['👤', 'Profile', '/library'],
        ['📰', 'News', '/explore'],
        null,
        ['👥', 'Friends', '/charts'],
        ['🏘️', 'Communities', '/moods_and_genres'],
        ['📷', 'Photos', '/library/albums'],
        ['🎬', 'Videos', '/library/playlists'],
        ['🎮', 'Games', '/new_releases'],
        null,
        ['🔖', 'Bookmarks', '/playlist?list=LM'],
        ['📁', 'Files', '/library/songs'],
    ];

    navItems.forEach(item => {
        if (!item) {
            sidebar.appendChild(mk('div', `height:1px;background:${C.border};margin:6px 14px;`));
            return;
        }
        const [icon, label, path, active] = item;
        const nav = mk('div', `
            display: flex; align-items: center; gap: 10px;
            padding: 8px 14px; cursor: pointer;
            color: ${active ? C.blue : C.text2};
            font-size: 13px; font-weight: ${active ? '500' : '400'};
            transition: background 0.12s;
        `, `<span style="font-size:16px;width:22px;text-align:center;">${icon}</span><span>${label}</span>`);
        nav.onmouseenter = () => nav.style.background = C.hover;
        nav.onmouseleave = () => nav.style.background = 'transparent';
        nav.onclick = () => location.href = 'https://music.youtube.com' + path;
        sidebar.appendChild(nav);
    });

    // Footer
    sidebar.appendChild(mk('div', `
        margin-top: auto; padding: 12px 14px;
        font-size: 11px; color: ${C.textM}; line-height: 1.6;
    `, 'Blog · Developers<br>About VK · More'));

    root.appendChild(sidebar);
    console.log('[VK Layout] Sidebar built');

    // ============= BUILD TOPBAR =============
    const topbar = mk('div', `
        position: fixed; top: 0; left: ${SW}px; right: 0;
        height: ${TH}px;
        background: ${C.bgTopbar};
        border-bottom: 1px solid ${C.border};
        z-index: 2147483646;
        display: flex; align-items: center;
        padding: 0 16px; gap: 12px;
        font-family: 'Roboto', -apple-system, 'Segoe UI', sans-serif;
    `);

    // Search in topbar
    const searchWrap = mk('div', 'flex: 0 1 320px; position: relative;');
    searchWrap.appendChild(mk('span', `
        position: absolute; left: 10px; top: 50%;
        transform: translateY(-50%); color: ${C.textM};
        font-size: 14px; pointer-events: none;
    `, '🔍'));
    const searchIn = mk('input', `
        width: 100%; padding: 7px 12px 7px 32px;
        background: ${C.bgInput}; border: 1px solid ${C.border};
        border-radius: 8px; color: ${C.text1}; font-size: 13px;
        outline: none; box-sizing: border-box; font-family: inherit;
    `);
    searchIn.type = 'text';
    searchIn.placeholder = 'Search';
    searchIn.onfocus = () => searchIn.style.borderColor = C.blue;
    searchIn.onblur = () => searchIn.style.borderColor = C.border;
    searchIn.onkeydown = (e) => {
        if (e.key === 'Enter' && searchIn.value.trim()) {
            e.preventDefault();
            location.href = 'https://music.youtube.com/search?q=' + encodeURIComponent(searchIn.value.trim());
        }
    };
    searchWrap.appendChild(searchIn);
    topbar.appendChild(searchWrap);
    topbar.appendChild(mk('div', 'flex:1;'));

    // Music note button
    const musicBtn = mk('div', `
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; color: ${C.text2}; font-size: 18px;
    `, '♪');
    musicBtn.onmouseenter = () => musicBtn.style.background = C.hover;
    musicBtn.onmouseleave = () => musicBtn.style.background = 'transparent';
    musicBtn.onclick = () => location.href = 'https://music.youtube.com/';
    topbar.appendChild(musicBtn);

    root.appendChild(topbar);
    console.log('[VK Layout] Topbar built');

    // ============= BUILD CUSTOM PLAYER =============
    const player = mk('div', `
        position: fixed; top: ${TH}px; left: ${SW}px; right: 0;
        height: ${PH}px;
        background: ${C.bgPlayer};
        border-bottom: 1px solid ${C.border};
        z-index: 2147483646;
        display: flex; align-items: center;
        padding: 0 12px; gap: 6px;
        font-family: 'Roboto', -apple-system, 'Segoe UI', sans-serif;
    `);

    function ctrlBtn(txt, fn, extra) {
        const b = mk('div', `
            width: 30px; height: 30px; display: flex;
            align-items: center; justify-content: center;
            cursor: pointer; color: ${C.text2}; border-radius: 4px;
            font-size: 16px; flex-shrink: 0; user-select: none;
            ${extra || ''}
        `, txt);
        b.onmouseenter = () => { if (!b.dataset.noHover) b.style.background = C.hover; };
        b.onmouseleave = () => { if (!b.dataset.noHover) b.style.background = 'transparent'; };
        b.onclick = fn;
        return b;
    }

    // Prev
    player.appendChild(ctrlBtn('⏮', () => ytClick(['.previous-button', '[aria-label="Previous"]', 'tp-yt-paper-icon-button.previous-button'])));

    // Play/Pause (circular blue button)
    const playBtn = ctrlBtn('▶', () => {
        const v = getVideo();
        if (v) v.paused ? v.play() : v.pause();
        else ytClick(['#play-pause-button', '[aria-label="Play"]', '[aria-label="Pause"]']);
    }, `width:36px;height:36px;font-size:18px;background:${C.blue};border-radius:50%;color:#fff;`);
    playBtn.id = 'vk-play-btn';
    playBtn.dataset.noHover = '1';
    player.appendChild(playBtn);

    // Next
    player.appendChild(ctrlBtn('⏭', () => ytClick(['.next-button', '[aria-label="Next"]', 'tp-yt-paper-icon-button.next-button'])));

    // Shuffle
    player.appendChild(ctrlBtn('🔀', () => ytClick(['[aria-label*="shuffle" i]', '.shuffle']), 'font-size:14px;'));

    // Repeat
    player.appendChild(ctrlBtn('🔁', () => ytClick(['[aria-label*="repeat" i]', '.repeat']), 'font-size:14px;'));

    // Track info
    const trackInfo = mk('div', `
        display: flex; align-items: center; gap: 10px;
        flex: 0 1 240px; overflow: hidden; margin-left: 8px;
    `);
    const trackArt = mk('img', `
        width: 36px; height: 36px; border-radius: 4px;
        object-fit: cover; background: #333; flex-shrink: 0; display: none;
    `);
    trackArt.id = 'vk-track-art';
    const trackTextWrap = mk('div', 'overflow:hidden;min-width:0;');
    const trackTitle = mk('div', `
        font-size: 13px; color: ${C.text1}; font-weight: 400;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    `, 'No track playing');
    trackTitle.id = 'vk-track-title';
    const trackArtist = mk('div', `
        font-size: 12px; color: ${C.text2};
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    `);
    trackArtist.id = 'vk-track-artist';
    trackTextWrap.appendChild(trackTitle);
    trackTextWrap.appendChild(trackArtist);
    trackInfo.appendChild(trackArt);
    trackInfo.appendChild(trackTextWrap);
    player.appendChild(trackInfo);

    // + (like) button
    player.appendChild(ctrlBtn('+', () => ytClick(['.like.ytmusic-like-button-renderer', '[aria-label="Like"]']), 'font-size:18px;font-weight:300;'));

    // Progress bar
    const progressWrap = mk('div', 'display:flex;align-items:center;gap:6px;flex:1;margin:0 8px;');
    const timeCur = mk('span', `font-size:11px;color:${C.textM};min-width:32px;text-align:right;`, '0:00');
    timeCur.id = 'vk-time-cur';
    const progBg = mk('div', `flex:1;height:4px;background:#333;border-radius:2px;cursor:pointer;position:relative;`);
    const progFill = mk('div', `height:100%;background:${C.blue};border-radius:2px;width:0%;pointer-events:none;transition:width 0.3s linear;`);
    progFill.id = 'vk-prog-fill';
    progBg.appendChild(progFill);
    progBg.onclick = (e) => {
        const v = getVideo();
        if (!v || !v.duration) return;
        const r = progBg.getBoundingClientRect();
        v.currentTime = ((e.clientX - r.left) / r.width) * v.duration;
    };
    const timeDur = mk('span', `font-size:11px;color:${C.textM};min-width:32px;`, '0:00');
    timeDur.id = 'vk-time-dur';
    progressWrap.appendChild(timeCur);
    progressWrap.appendChild(progBg);
    progressWrap.appendChild(timeDur);
    player.appendChild(progressWrap);

    // Volume
    const volWrap = mk('div', 'display:flex;align-items:center;gap:4px;');
    volWrap.appendChild(ctrlBtn('🔊', () => { const v = getVideo(); if (v) v.muted = !v.muted; }, 'font-size:14px;'));
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0';
    volSlider.max = '100';
    volSlider.value = '100';
    volSlider.id = 'vk-vol-slider';
    volSlider.style.cssText = 'width:80px;height:4px;cursor:pointer;accent-color:#0077FF;';
    volSlider.oninput = (e) => { const v = getVideo(); if (v) v.volume = e.target.value / 100; };
    volWrap.appendChild(volSlider);
    player.appendChild(volWrap);

    root.appendChild(player);
    console.log('[VK Layout] Player built');

    // ============= BUILD TABS =============
    const tabsBar = mk('div', `
        position: fixed; top: ${TH + PH}px; left: ${SW}px; right: 0;
        height: ${TAH}px;
        background: ${C.bgContent};
        border-bottom: 1px solid ${C.border};
        z-index: 2147483646;
        display: flex; align-items: center;
        padding: 0 16px; gap: 4px;
        font-family: 'Roboto', -apple-system, 'Segoe UI', sans-serif;
    `);

    const tabsDef = [
        ['General', '/'],
        ['My music', '/library'],
        ['Explore', '/explore'],
        ['Radio', '/moods_and_genres'],
        ['New additions', '/new_releases'],
    ];

    tabsDef.forEach(([label, path], i) => {
        const tab = mk('div', `
            padding: 8px 14px; font-size: 13px; font-weight: 500;
            color: ${i === 0 ? C.blue : C.text2};
            cursor: pointer; border-radius: 8px; white-space: nowrap;
            background: ${i === 0 ? 'rgba(0,119,255,0.12)' : 'transparent'};
            transition: all 0.15s;
        `, label);
        tab.dataset.path = path;
        tab.className = 'vk-tab-el';
        tab.onmouseenter = () => { if (!tab.dataset.active) { tab.style.background = C.hover; tab.style.color = C.text1; } };
        tab.onmouseleave = () => { if (!tab.dataset.active) { tab.style.background = 'transparent'; tab.style.color = C.text2; } };
        tab.onclick = () => location.href = 'https://music.youtube.com' + path;
        tabsBar.appendChild(tab);
    });

    root.appendChild(tabsBar);
    console.log('[VK Layout] Tabs built');

    // ============= BUILD MUSIC SEARCH =============
    const mSearch = mk('div', `
        position: fixed; top: ${TH + PH + TAH}px; left: ${SW}px; right: 0;
        height: ${SH}px;
        background: ${C.bgContent};
        z-index: 2147483645;
        display: flex; align-items: center; padding: 0 16px;
        font-family: 'Roboto', -apple-system, 'Segoe UI', sans-serif;
    `);
    const mInput = mk('input', `
        width: 100%; max-width: 480px;
        padding: 8px 14px; background: ${C.bgInput};
        border: 1px solid ${C.border}; border-radius: 8px;
        color: ${C.text1}; font-size: 13px; outline: none;
        box-sizing: border-box; font-family: inherit;
    `);
    mInput.type = 'text';
    mInput.placeholder = 'Search music';
    mInput.onfocus = () => mInput.style.borderColor = C.blue;
    mInput.onblur = () => mInput.style.borderColor = C.border;
    mInput.onkeydown = (e) => {
        if (e.key === 'Enter' && mInput.value.trim()) {
            e.preventDefault();
            location.href = 'https://music.youtube.com/search?q=' + encodeURIComponent(mInput.value.trim());
        }
    };
    mSearch.appendChild(mInput);
    root.appendChild(mSearch);
    console.log('[VK Layout] Music search built');

    // ============= PLAYER STATE UPDATER =============
    function fmt(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    setInterval(() => {
        const v = getVideo();

        // Play/Pause icon
        const pb = document.getElementById('vk-play-btn');
        if (pb && v) pb.innerHTML = v.paused ? '▶' : '⏸';

        // Progress
        if (v && v.duration && !isNaN(v.duration)) {
            const pct = (v.currentTime / v.duration) * 100;
            const pf = document.getElementById('vk-prog-fill');
            if (pf) pf.style.width = pct + '%';
            const tc = document.getElementById('vk-time-cur');
            if (tc) tc.textContent = fmt(v.currentTime);
            const td = document.getElementById('vk-time-dur');
            if (td) td.textContent = fmt(v.duration);
        }

        // Track info from YT Music DOM
        const yt = document.querySelector('ytmusic-player-bar');
        if (yt) {
            const tEl = yt.querySelector('.title');
            const aEl = yt.querySelector('.byline a') || yt.querySelector('.byline');
            const iEl = yt.querySelector('.image img') || yt.querySelector('.thumbnail img');

            const tt = document.getElementById('vk-track-title');
            if (tt && tEl) {
                const t = tEl.textContent?.trim();
                if (t) tt.textContent = t;
            }
            const ta = document.getElementById('vk-track-artist');
            if (ta && aEl) {
                let a = aEl.textContent?.trim();
                if (a && a.includes('•')) a = a.split('•')[0].trim();
                if (a) ta.textContent = a;
            }
            const ai = document.getElementById('vk-track-art');
            if (ai && iEl && iEl.src) {
                ai.src = iEl.src;
                ai.style.display = 'block';
            }
        }
    }, 500);

    // ============= TAB STATE UPDATER =============
    function updateTabs() {
        const p = location.pathname;
        const tabs = document.querySelectorAll('.vk-tab-el');
        let any = false;
        tabs.forEach(t => {
            const tp = t.dataset.path;
            let active = false;
            if (tp === '/' && p === '/') active = true;
            else if (tp !== '/' && p.startsWith(tp)) active = true;

            if (active) {
                t.style.color = C.blue;
                t.style.background = 'rgba(0,119,255,0.12)';
                t.dataset.active = '1';
                any = true;
            } else {
                t.style.color = C.text2;
                t.style.background = 'transparent';
                delete t.dataset.active;
            }
        });
        if (!any && tabs[0]) {
            tabs[0].style.color = C.blue;
            tabs[0].style.background = 'rgba(0,119,255,0.12)';
            tabs[0].dataset.active = '1';
        }
    }

    updateTabs();

    // Watch URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            updateTabs();
        }
    }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('popstate', updateTabs);

    console.log('[VK Layout] FULLY INITIALIZED ✓');
})();
