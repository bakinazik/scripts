const fs = require("fs");
const path = require("path");
const { syncDates, listScripts } = require("./dates");

const root = path.resolve(__dirname, "..");
const scriptsDir = path.join(root, "scripts");
const outDir = path.join(root, "public");
const config = require(path.join(root, "package.json")).userscripts;
const { repo, branch } = config;
const site = (config.site || process.env.SITE_URL || "").replace(/\/+$/, "");
const base = site ? new URL(site).pathname.replace(/\/+$/, "") : "";

function writeHtml(file, html) {
    fs.writeFileSync(file, base ? html.replace(/\b(href|src|action|data-src)=(\\?")\/(?!\/)/g, (match, attribute, quote) => `${attribute}=${quote}${base}/`) : html);
}
const owner = repo.split("/")[0];

const languagesDir = path.join(root, "language");
const languageCodes = fs.readdirSync(languagesDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
const readGeneral = code => {
    const file = path.join(languagesDir, code, "general.json");
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
};
const languages = Object.fromEntries(languageCodes.map(code => [code, readGeneral(code)]));
if (!languages.en || !Object.keys(languages.en).length) throw new Error("language/en/general.json is required");
const en = languages.en;
for (const [code, dictionary] of Object.entries(languages)) {
    const missing = Object.keys(en).filter(key => !(key in dictionary));
    const unknown = Object.keys(dictionary).filter(key => !(key in en));
    if (missing.length) console.warn(`language/${code}/general.json is missing ${missing.length} key(s): ${missing.join(", ")}`);
    if (unknown.length) console.warn(`language/${code}/general.json has ${unknown.length} unknown key(s): ${unknown.join(", ")}`);
}
const globals = { repo_url: `https://github.com/${repo}`, owner, owner_url: `https://github.com/${owner}`, home_url: `${base}/` };
const staticGlobals = { ...globals, home_url: "/" };

const word = key => {
    if (!(key in en)) throw new Error(`Missing language key: ${key}`);
    return en[key];
};
const fill = (text, vars, escape = value => value) => String(text).replace(/\{(\w+)\}/g, (match, name) => {
    const source = vars && name in vars ? vars : staticGlobals;
    return name in source ? escape(source[name]) : match;
});
const varsAttr = vars => vars ? ` data-i18n-vars="${esc(JSON.stringify(vars))}"` : "";
const itext = (key, vars) => esc(fill(word(key), vars));
const inode = (tag, key, vars, extra = "") => `<${tag}${extra ? ` ${extra}` : ""} data-i18n="${key}"${varsAttr(vars)}>${itext(key, vars)}</${tag}>`;
const irich = (tag, key, extra = "") => `<${tag}${extra ? ` ${extra}` : ""} data-i18n-html="${key}">${fill(word(key), null, esc)}</${tag}>`;
const iattr = (name, key, vars) => `${name}="${itext(key, vars)}" data-i18n-${name}="${key}"${varsAttr(vars)}`;

const FLAGS_LINK = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/css/flag-icons.min.css">';

const FORBIDDEN_MARKUP = /<script\b|<iframe\b|\son[a-z]+\s*=|javascript:/i;

function readPage(file, label) {
    const source = fs.readFileSync(file, "utf8");
    const forbidden = source.match(FORBIDDEN_MARKUP);
    if (forbidden) throw new Error(`${label} contains disallowed markup: ${forbidden[0].trim()}`);
    const heading = source.match(/^\s*<title>([\s\S]*?)<\/title>\s*/i);
    return {
        title: heading ? heading[1].trim() : "",
        html: fill(heading ? source.slice(heading[0].length) : source, null).trim()
    };
}

const pages = Object.fromEntries(languageCodes.map(code => {
    const dir = path.join(languagesDir, code);
    const found = fs.readdirSync(dir).filter(name => name.endsWith(".html")).sort();
    return [code, Object.fromEntries(found.map(name => [name.replace(/\.html$/, ""), readPage(path.join(dir, name), `language/${code}/${name}`)]))];
}));
const pageNames = Object.keys(pages.en);
for (const name of pageNames) {
    if (!/^[a-z0-9-]+$/i.test(name)) throw new Error(`language/en/${name}.html: page names may only use letters, numbers and dashes`);
}
for (const code of languageCodes) {
    const missing = pageNames.filter(name => !pages[code][name]);
    if (missing.length && code !== "en") console.warn(`language/${code}/ is missing page(s): ${missing.map(name => name + ".html").join(", ")}`);
}
const pageRoutes = pageNames.filter(name => name !== "404").map(name => `/${name}`);

const MULTI = ["match", "include", "exclude", "grant"];

const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function parseStyleMetadata(source) {
    const meta = Object.fromEntries(MULTI.map(key => [key, []]));
    const block = source.match(/\/\*\s*==UserStyle==([\s\S]*?)==\/UserStyle==\s*\*\//);
    if (block) {
        for (const line of block[1].split(/\r?\n/)) {
            const found = line.match(/^\s*@([\w:-]+)\s+(.*?)\s*$/);
            if (found && !(found[1] in meta)) meta[found[1]] = found[2];
        }
    }
    const rule = /@-moz-document\s+([^{]+)\{/g;
    for (let rules; (rules = rule.exec(source));) {
        const item = /(domain|url-prefix|url|regexp)\(\s*(?:"([^"]*)"|'([^']*)'|([^)\s]*))\s*\)/g;
        for (let found; (found = item.exec(rules[1]));) {
            const kind = found[1];
            const value = found[2] ?? found[3] ?? found[4] ?? "";
            if (!value) continue;
            meta.match.push(kind === "domain" ? `*://*.${value}/*` : kind === "url-prefix" ? `${value}*` : kind === "regexp" ? `/${value}/` : value);
        }
    }
    if (!meta.match.length) meta.match.push("*://*/*");
    return meta;
}

function parseMetadata(source) {
    const meta = Object.fromEntries(MULTI.map(key => [key, []]));
    const block = source.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
    if (!block) return meta;
    for (const line of block[1].split(/\r?\n/)) {
        const found = line.match(/^\s*\/\/\s*@([\w:-]+)\s*(.*?)\s*$/);
        if (!found) continue;
        const [, key, value] = found;
        if (MULTI.includes(key)) meta[key].push(value);
        else if (!(key in meta)) meta[key] = value;
    }
    return meta;
}

function hostOf(meta) {
    for (const pattern of meta.match) {
        const found = pattern.match(/^(?:\*|https?\*?):\/\/([^\/]+)/);
        const host = found ? found[1].replace(/^(\*\.|www\.)/, "").replace(/:\d+$/, "") : "";
        if (host && !host.includes("*")) return host;
    }
    return "";
}

function iconOf(meta) {
    const value = meta.icon || meta.iconURL || meta.defaulticon || meta.icon64 || meta.icon64URL || "";
    return /^(https?:\/\/|data:image\/)/i.test(value) ? value : "";
}

function slugify(value) {
    const map = { "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g", "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c" };
    const slug = String(value)
        .replace(/[ıİşŞğĞüÜöÖçÇ]/g, char => map[char])
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug || "unknown";
}

function loadScripts() {
    const stamps = syncDates();
    for (const file of fs.readdirSync(scriptsDir).filter(name => /\.user\.(js|css)$/.test(name))) {
        console.warn(`Skipped scripts/${file}: move it into scripts/<username>/<name>/${file}`);
    }
    const seen = new Set();
    return listScripts()
        .map(({ user, name: folder, file, key, absolute, images }) => {
            const source = fs.readFileSync(absolute, "utf8");
            const meta = file.endsWith(".user.css") ? parseStyleMetadata(source) : parseMetadata(source);
            const type = file.endsWith(".user.css") ? "style" : "script";
            const slug = folder;
            const authorSlug = slugify(user);
            if (seen.has(`${authorSlug}/${slug}`)) throw new Error(`Duplicate script: ${key}`);
            seen.add(`${authorSlug}/${slug}`);
            const stamp = stamps[key];
            return {
                type,
                filename: file,
                shots: images.map(image => `/scripts/${encodeURI(image)}`),
                key,
                slug,
                authorSlug,
                path: `/u/${authorSlug}/${slug}`,
                name: meta.name || slug,
                namespace: meta.namespace || "",
                version: meta.version || "",
                description: meta.description || "",
                author: user,
                match: meta.match,
                include: meta.include,
                exclude: meta.exclude,
                grant: meta.grant,
                icon: iconOf(meta),
                domain: hostOf(meta),
                host: hostOf(meta) || file,
                sourceUrl: `https://github.com/${repo}/blob/${branch}/scripts/${encodeURI(key)}`,
                installUrl: `https://raw.githubusercontent.com/${repo}/${branch}/scripts/${encodeURI(key)}`,
                added: stamp.added,
                updated: stamp.updated
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

const globeIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18"></path><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"></path></svg>';

function icon(script) {
    const favicon = script.domain
        ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(script.domain)}&sz=64`
        : "";
    const src = script.icon || favicon;
    return src
        ? `<img src="${esc(src)}" alt="" width="17" height="17" loading="lazy">`
        : globeIcon;
}

function actions(script) {
    const stroke = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    const copyIcons = `<svg class="script-copy-icon" ${stroke}>
            <path d="M8 4v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2v-12.5a1.5 1.5 0 0 0 -1.5 -1.5h-9a1.5 1.5 0 0 0 -1.5 1.5z"></path>
            <path d="M16 18v2a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h2"></path>
        </svg>
        <svg class="script-copy-done" ${stroke}>
            <path d="M20 6 9 17l-5-5"></path>
        </svg>`;
    const install = `<a class="script-action install" href="${esc(script.installUrl)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3v12"></path>
            <path d="m7 10 5 5 5-5"></path>
            <path d="M5 21h14"></path>
        </svg>
        ${inode("span", "install")}
    </a>`;
    const source = `<a class="script-action" href="${esc(script.sourceUrl)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 3h7v7"></path>
            <path d="M10 14 21 3"></path>
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"></path>
        </svg>
        ${inode("span", "source")}
    </a>`;
    return `<div class="script-actions">
    ${install}
    <button class="script-action script-copy" id="copy" type="button">
        ${copyIcons}
        ${inode("span", "copy")}
        ${inode("span", "copied", undefined, 'class="script-copied"')}
    </button>
    ${source}
    <button class="script-action script-copy" id="share" type="button">
        <svg class="script-copy-icon" ${stroke}>
            <path d="M6 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
            <path d="M18 6m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
            <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"></path>
            <path d="M8.7 10.7l6.6 -3.4"></path>
            <path d="M8.7 13.3l6.6 3.4"></path>
        </svg>
        <svg class="script-copy-done" ${stroke}>
            <path d="M20 6 9 17l-5-5"></path>
        </svg>
        ${inode("span", "share")}
        ${inode("span", "copied", undefined, 'class="script-copied"')}
    </button>
    <a class="script-action script-report" id="report" href="https://github.com/${repo}/issues/new" target="_blank" rel="noopener">
        <svg ${stroke}>
            <path d="M5 5a5 5 0 0 1 7 0a5 5 0 0 0 7 0v9a5 5 0 0 1 -7 0a5 5 0 0 0 -7 0z"></path>
            <path d="M5 21v-16"></path>
        </svg>
        ${inode("span", "report")}
    </a>
</div>`;
}

const shortDate = value => new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });

const calendarIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M3 10h18"></path><path d="M8 3v4"></path><path d="M16 3v4"></path></svg>';
const refreshIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4"></path><path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"></path></svg>';

function renderDates(script) {
    return `<div class="script-dates">
        <span ${iattr("title", "created")} ${iattr("aria-label", "created")}>
            ${calendarIcon}
            <time datetime="${esc(day(script.added))}" data-i18n-date="${esc(script.added)}">${shortDate(script.added)}</time>
        </span>
        <span ${iattr("title", "updated")} ${iattr("aria-label", "updated")}>
            ${refreshIcon}
            <time datetime="${esc(day(script.updated))}" data-i18n-date="${esc(script.updated)}">${shortDate(script.updated)}</time>
        </span>
    </div>`;
}

function renderChips(script) {
    return `<div class="chips">
            <a class="chip chip-author" href="/u/${esc(script.authorSlug)}"><i>${esc(script.author.charAt(0).toUpperCase())}</i>${esc(script.author)}</a>
            ${script.type === "style" ? '<span class="chip">CSS</span>' : ""}
            <span class="chip">v${esc(script.version)}</span>
            <span class="chip">${globeIcon}${esc(script.host)}</span>
            <span class="chip" ${iattr("title", "created")}>${calendarIcon}<time datetime="${esc(day(script.added))}" data-i18n-date="${esc(script.added)}">${shortDate(script.added)}</time></span>
            <span class="chip" ${iattr("title", "updated")}>${refreshIcon}<time datetime="${esc(day(script.updated))}" data-i18n-date="${esc(script.updated)}">${shortDate(script.updated)}</time></span>
        </div>`;
}

function renderCard(script) {
    const search = [
        script.name, script.filename, script.host, script.description, script.author, script.version,
        ...script.match, ...script.include, script.type === "style" ? "style css stylus" : "script userscript"
    ].join(" ").toLowerCase();

    return `
        <article class="script" data-type="${script.type}" data-search="${esc(search)}">
            <div class="script-header">
                <div class="script-info">
                    <div class="script-icon">${icon(script)}</div>

                    <div class="script-meta">
                        <a class="script-title" href="${esc(script.path)}">${esc(script.name)}</a>
                        <small>${script.type === "style" ? '<b class="kind">CSS</b>' : ""}${esc(script.host)}</small>
                    </div>
                </div>

                <button class="script-save" type="button" data-key="${esc(script.key)}" aria-pressed="false" ${iattr("aria-label", "save_aria")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"></path>
                    </svg>
                </button>
            </div>

            <p class="script-description">${esc(script.description)}</p>
${script.shots.length ? `
            <a class="script-shots" href="${esc(script.path)}" tabindex="-1" aria-hidden="true">${script.shots.slice(0, 2).map(src => `<img src="${esc(src)}" alt="" loading="lazy" decoding="async">`).join("")}</a>
` : ""}
            <div class="script-footer">
                ${renderDates(script)}
                <a class="script-author" href="/u/${esc(script.authorSlug)}" title="${esc(script.author)}">
                    <i>${esc(script.author.charAt(0).toUpperCase())}</i>
                    <span>${esc(script.author)}</span>
                </a>
            </div>
        </article>`;
}

const ICON_LINKS = `
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16">
<link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/android-chrome-192x192.png" type="image/png" sizes="192x192">
<link rel="icon" href="/android-chrome-512x512.png" type="image/png" sizes="512x512">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">`;

function seoMeta({ title, description, route }) {
    const url = site ? `${site}${route}` : "";
    const image = site ? `${site}/android-chrome-512x512.png` : "/android-chrome-512x512.png";
    return `<meta name="author" content="${esc(owner)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Scripts">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">${url ? `
<link rel="canonical" href="${esc(url)}">
<meta property="og:url" content="${esc(url)}">` : ""}`;
}

const DESCRIPTION = "A collection of userscripts for customizing and improving the web.";

const MENU = [
    { key: "nav_saved", href: "/saved", icon: "heart" },
    { key: "nav_about", href: "/about", icon: "info" }
];

const THEME_INIT = '<script>(()=>{const r=document.documentElement,t=localStorage.getItem("theme");r.dataset.theme=t==="dark"||t==="light"?t:matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"})()</script>';

const NAV_JS = '(()=>{const bar=document.getElementById("bar");const edge=()=>bar.classList.toggle("scrolled",scrollY>4);addEventListener("scroll",edge,{passive:true});edge();const field=document.getElementById("search");const clear=document.getElementById("clear");const sync=()=>clear.hidden=!field.value;const wipe=()=>{field.value="";sync();field.dispatchEvent(new Event("input"));field.focus()};field.addEventListener("input",sync);clear.addEventListener("click",wipe);addEventListener("keydown",event=>{if(event.key==="Escape"&&document.activeElement===field&&field.value)return wipe();const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);if(event.key!=="/"||typing||event.metaKey||event.ctrlKey||event.altKey)return;event.preventDefault();field.focus()});})();';

const SAVED_JS = '(()=>{const read=()=>{try{const v=JSON.parse(localStorage.getItem("saved"));return Array.isArray(v)?v:[]}catch{return[]}};const mark=(button,on)=>{button.classList.toggle("on",on);button.setAttribute("aria-pressed",on)};const saved={has:key=>read().includes(key),apply(root){const list=read();root.querySelectorAll(".script-save").forEach(button=>mark(button,list.includes(button.dataset.key)))},toggle(key){const list=read();const next=list.includes(key)?list.filter(item=>item!==key):[...list,key];try{localStorage.setItem("saved",JSON.stringify(next))}catch{}return next.includes(key)}};window.saved=saved;document.addEventListener("click",event=>{const button=event.target.closest(".script-save");if(!button)return;mark(button,saved.toggle(button.dataset.key));document.dispatchEvent(new CustomEvent("saved-change"))});document.addEventListener("DOMContentLoaded",()=>saved.apply(document))})();';

const ICONS = {
    heart: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>',
    info: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/><path d="M12 9h.01"/><path d="M11 12h1v4h1"/>',
    dots: '<path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
    back: '<path d="M5 12l14 0"/><path d="M5 12l6 6"/><path d="M5 12l6 -6"/>',
    chevron: '<path d="M9 6l6 6l-6 6"/>',
    palette: '<path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25z"/><path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/><path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
    language: '<path d="M4 5h7"/><path d="M9 3v2c0 4.418 -2.239 8 -5 8"/><path d="M5 9c0 2.144 2.952 3.908 6.7 4"/><path d="M12 20l4 -9l4 9"/><path d="M19.1 18h-6.2"/>'
};

const svg = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const settingsItem = (section, icon, key) => `<button class="settings-item" type="button" data-section="${section}" aria-expanded="false">
                        <span class="settings-item-label">${svg(icon)}${inode("span", key)}</span>
                        ${svg("chevron", 16)}
                    </button>`;

const settingsSection = (id, key, options) => `<div class="settings-section" id="${id}">
                    <div class="settings-head" data-back>
                        <button class="settings-back" type="button" ${iattr("aria-label", "settings_back_aria")}>${svg("back")}</button>
                        ${inode("div", key, null, 'class="settings-title"')}
                    </div>
                    <div class="settings-options" id="${options.id}">${options.html}</div>
                </div>`;

const choice = (key, value) => inode("button", key, null, `type="button" data-value="${value}"`);

const panelLink = (item, current) => `<a class="settings-item panel-link" href="${esc(item.href)}"${item.href === current ? ' aria-current="page"' : ""}${item.external ? ' target="_blank" rel="noopener"' : ""}>
                        <span class="settings-item-label">${svg(item.icon)}${inode("span", item.key)}</span>
                    </a>`;

const settingsMenu = current => `<div class="settings" id="settings">
            <button class="bar-icon" id="settings-trigger" type="button" ${iattr("aria-label", "settings_menu_aria")} aria-haspopup="true" aria-expanded="false">${svg("dots", 17)}</button>
            <div class="panel" id="panel">
                <div class="settings-list">
                    ${MENU.map(item => panelLink(item, current)).join("\n                    ")}
                    ${settingsItem("theme-section", "palette", "theme_label")}
                    ${settingsItem("lang-section", "language", "language_label")}
                </div>
                ${settingsSection("theme-section", "theme_label", { id: "theme-options", html: [choice("theme_system", "system"), choice("theme_dark", "dark"), choice("theme_light", "light")].join("") })}
                ${settingsSection("lang-section", "language_label", { id: "lang-options", html: "" })}
            </div>
        </div>`;

const I18N_RUNTIME = fs.readFileSync(path.join(__dirname, "i18n.js"), "utf8");
const I18N_SCRIPT = `<script>window.__I18N=${JSON.stringify({ fallback: "en", vars: globals, langs: languages }).replace(/</g, "\\u003c")};${I18N_RUNTIME}</script>`;

const SEARCH_FIELD = `<form class="bar-field" action="/search" method="get" role="search">
            <span class="bar-field-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7"></circle>
                    <path d="m20 20-4-4"></path>
                </svg>
            </span>
            <input id="search" name="q" type="search" ${iattr("placeholder", "search_placeholder")} ${iattr("aria-label", "search_aria")} autocomplete="off">
            <kbd>/</kbd>
            <button class="search-clear" id="clear" type="button" ${iattr("aria-label", "search_clear_aria")} hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 6 6 18M6 6l12 12"></path>
                </svg>
            </button>
        </form>`;

function renderNav(current = "") {
    const links = MENU
        .map(item => inode("a", item.key, null, `class="bar-link" href="${esc(item.href)}"${item.href === current ? ' aria-current="page"' : ""}${item.external ? ' target="_blank" rel="noopener"' : ""}`))
        .join("\n        ");
    return `<header class="bar" id="bar">
    <nav class="bar-inner" ${iattr("aria-label", "nav_main_aria")}>
        <div class="bar-row">
            <a class="logo" id="logo" href="/" style="--logo:url(${base}/logo.svg)" aria-label="Scripts"></a>
            ${links}
        </div>
        <div class="bar-row">
            ${SEARCH_FIELD}
            ${settingsMenu(current)}
        </div>
    </nav>
</header>
<script>${NAV_JS}${SAVED_JS}</script>
${I18N_SCRIPT}`;
}

function head({ title, titleKey, description, css, route }) {
    return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title${titleKey ? ` data-i18n="${titleKey}"` : ""}>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${seoMeta({ title, description, route })}
${ICON_LINKS}
${FLAGS_LINK}
${THEME_INIT}
<style>${css}</style>`;
}

function renderFooter() {
    return `<footer class="footer">
        ${inode("span", "footer_license")}
        ${inode("a", "footer_source", null, `href="https://github.com/${esc(repo)}" target="_blank" rel="noopener"`)}
    </footer>`;
}

const day = value => String(value).slice(0, 10);

const grantNote = grant => {
    const key = `grant_${grant.toLowerCase().replace(/[.-]/g, "_")}`;
    return inode("span", key in en ? key : "grant_unknown", null, 'class="rows-note"');
};

function rows(items, emptyKey, note) {
    return items.length
        ? `<ul class="rows">${items.map(item => `<li><code>${esc(item)}</code>${note ? note(item) : ""}</li>`).join("")}</ul>`
        : inode("p", emptyKey, null, 'class="rows-empty"');
}

function renderDetails(script, scripts) {
    const grants = script.grant.filter(item => item !== "none");
    const similar = script.domain
        ? scripts.filter(other => other.domain === script.domain && other.slug !== script.slug)
        : [];
    const block = (key, content, vars) => `<section class="block">
            ${inode("h2", key, vars)}
            ${content}
        </section>`;
    return [
        block("detail_runs_on", rows([...script.match, ...script.include], "detail_no_match")),
        script.exclude.length ? block("detail_excluded", rows(script.exclude)) : "",
        script.type === "style" ? "" : block("detail_permissions", rows(grants, "detail_no_permissions", grantNote)),
        block("detail_info", `<dl class="facts">
                ${inode("dt", "detail_version")}<dd>${esc(script.version || "-")}</dd>
                ${inode("dt", "detail_updated")}<dd>${esc(day(script.updated))}</dd>
                ${inode("dt", "detail_added")}<dd>${esc(day(script.added))}</dd>
                ${inode("dt", "detail_author")}<dd><a href="/u/${esc(script.authorSlug)}">${esc(script.author)}</a></dd>
            </dl>`),
        similar.length ? block("detail_more_for", `<ul class="rows">${similar.map(other => `<li><a href="${esc(other.path)}">${esc(other.name)}</a></li>`).join("")}</ul>`, { domain: script.domain }) : ""
    ].filter(Boolean).join("\n        ");
}

function renderContentPage(name, { css, route, current = "", noindex = false }) {
    const langs = Object.fromEntries(languageCodes.filter(code => pages[code][name]).map(code => [code, pages[code][name]]));
    const data = JSON.stringify(langs).replace(/</g, "\\u003c");
    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title: pages.en[name].title || name, description: DESCRIPTION, css, route })}${noindex ? '\n<meta name="robots" content="noindex">' : ""}
</head>
<body>
${renderNav(current)}
<main>

    <section class="about" data-page="${esc(name)}">
${pages.en[name].html}
    </section>
    <script type="application/json" id="page-data">${data}</script>

    ${renderFooter()}
</main>
</body>
</html>`;
}

function renderProfile(author, authorSlug, list, css, tabs) {
    const countKey = list.length === 1 ? "count_one" : "count_other";
    const count = fill(word(countKey), { n: list.length });
    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title: `${author} - Userscripts`, description: `${count} by ${author}.`, css, route: `/u/${authorSlug}` })}
</head>
<body>
${renderNav()}
<main>

    <section class="profile-head">
        <span class="profile-avatar" aria-hidden="true">${esc([...author][0].toUpperCase())}</span>
        <div class="profile-info">
            <h1>${esc(author)}</h1>
            <a class="chip" href="https://github.com/${esc(encodeURIComponent(author))}" target="_blank" rel="noopener">
                <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg>
                @${esc(author)}
            </a>
        </div>
    </section>

    <div class="count"><span id="count" data-i18n="${countKey}"${varsAttr({ n: list.length })}>${count}</span>${tabs}</div>

    <section class="scripts masonry" id="scripts">${list.map(script => renderCard(script)).join("")}</section>

    <script type="application/json" id="data">${JSON.stringify(list.map(script => ({ name: script.name, added: Date.parse(script.added) }))).replace(/</g, "\\u003c")}</script>

    ${renderFooter()}
</main>
<script>
const list = document.getElementById("scripts");
const gap = () => parseFloat(getComputedStyle(list).columnGap) || 0;
const span = card => card.style.gridRowEnd = "span " + Math.ceil(card.getBoundingClientRect().height + gap());
const observer = new ResizeObserver(entries => entries.forEach(entry => span(entry.target)));
[...list.children].forEach(card => {
    span(card);
    observer.observe(card);
});

const items = JSON.parse(document.getElementById("data").textContent);
const cards = [...list.children].map((node, index) => ({ node, ...items[index] }));
const sort = document.getElementById("sort");
const sortButtons = [...sort.querySelectorAll("button")];

const sorters = {
    new: (a, b) => b.added - a.added || a.name.localeCompare(b.name, "tr"),
    old: (a, b) => a.added - b.added || a.name.localeCompare(b.name, "tr")
};
const stored = (() => { try { return localStorage.getItem("sort"); } catch { return null; } })();
let sortKey = [stored].find(value => value in sorters) || "new";

function setSort(key) {
    sortKey = key;
    try { localStorage.setItem("sort", key); } catch {}
    sortButtons.forEach(button => {
        const on = button.dataset.sort === key;
        button.classList.toggle("active", on);
        button.setAttribute("aria-selected", on);
    });
}

function render() {
    cards.sort(sorters[sortKey]);
    list.append(...cards.map(card => card.node));
}

sort.addEventListener("click", event => {
    const button = event.target.closest("button");
    if (!button || button.dataset.sort === sortKey) return;
    setSort(button.dataset.sort);
    render();
});

setSort(sortKey);
render();
</script>
</body>
</html>`;
}

function renderPage(script, code, css, scripts) {
    return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
${head({ title: `${script.name} - Userscripts`, description: script.description, css, route: script.path })}
</head>
<body class="page">
${renderNav()}
<main>

    <article class="detail">
        <div class="script-header">
            <div class="script-info">
                <div class="script-icon">${icon(script)}</div>
                <div class="script-meta">
                    <h1 class="script-title">${esc(script.name)}</h1>
                </div>
            </div>
        </div>

        ${renderChips(script)}

        <p class="detail-description">${esc(script.description)}</p>

        ${actions(script)}
${script.shots.length ? `
        <div class="shots">${script.shots.map((src, index) => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="${esc(script.name)} ${index + 1}" loading="lazy" decoding="async"></a>`).join("")}</div>
` : ""}
        <div class="tabs" role="tablist">
            <button class="tab active" type="button" role="tab" aria-selected="true" data-tab="code" data-i18n="tab_code">${itext("tab_code")}</button>
            <button class="tab" type="button" role="tab" aria-selected="false" data-tab="details" data-i18n="tab_details">${itext("tab_details")}</button>
            <button class="right" id="wrap" type="button" aria-pressed="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 6h16"></path>
                    <path d="M4 18h5"></path>
                    <path d="M4 12h13a3 3 0 0 1 0 6h-4"></path>
                    <path d="m16 15-2 3 2 3"></path>
                </svg>
                ${inode("span", "wrap_lines")}
            </button>
        </div>

        <div class="panel code" id="panel-code">${code}</div>
        <div class="panel details" id="panel-details" hidden>
        ${renderDetails(script, scripts)}
        </div>
    </article>

    ${renderFooter()}
</main>
<script>
const report = document.getElementById("report");
const body = [
    "**Script:** ${esc(script.name)} v${esc(script.version)}",
    "**Page:** " + location.href,
    "**Browser:** " + navigator.userAgent,
    "",
    "**What went wrong?**",
    ""
].join("\\n");
report.href += "?title=" + encodeURIComponent("[${esc(script.name)}] ") + "&body=" + encodeURIComponent(body);
const flash = button => {
    button.classList.add("copied");
    setTimeout(() => button.classList.remove("copied"), 1500);
};
document.getElementById("copy").addEventListener("click", async event => {
    const button = event.currentTarget;
    try {
        await navigator.clipboard.writeText(document.querySelector(".code code").textContent);
    } catch {
        return;
    }
    flash(button);
});
document.getElementById("share").addEventListener("click", async event => {
    const button = event.currentTarget;
    const data = { title: document.title, url: location.href };
    try {
        if (navigator.share) await navigator.share(data);
        else {
            await navigator.clipboard.writeText(location.href);
            flash(button);
        }
    } catch {}
});
const codeBox = document.querySelector(".code");
const wrap = document.getElementById("wrap");
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".detail .panel");
wrap.addEventListener("click", () => {
    wrap.setAttribute("aria-pressed", codeBox.classList.toggle("wrap"));
});
function show(name) {
    tabs.forEach(tab => {
        const on = tab.dataset.tab === name;
        tab.classList.toggle("active", on);
        tab.setAttribute("aria-selected", on);
    });
    panels.forEach(panel => panel.hidden = panel.id !== "panel-" + name);
    wrap.hidden = name !== "code";
}
tabs.forEach(tab => tab.addEventListener("click", () => show(tab.dataset.tab)));
codeBox.querySelectorAll(".line").forEach((line, index) => line.id = "L" + (index + 1));
function mark() {
    codeBox.querySelectorAll(".hl").forEach(line => line.classList.remove("hl"));
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (!target || !target.classList.contains("line")) return;
    show("code");
    target.classList.add("hl");
    target.scrollIntoView({ block: "center" });
}
codeBox.addEventListener("click", event => {
    const line = event.target.closest(".line");
    if (!line) return;
    const gutter = parseFloat(getComputedStyle(document.documentElement).fontSize) * 3.8;
    if (event.clientX - line.getBoundingClientRect().left > gutter) return;
    history.replaceState(null, "", "#" + line.id);
    mark();
});
window.addEventListener("hashchange", mark);
mark();
</script>
</body>
</html>`;
}

async function main() {
    const { codeToHtml } = await import("shiki");
    const scripts = loadScripts();
    const template = fs.readFileSync(path.join(root, "index.html"), "utf8");
    const items = scripts.map(script => ({
        key: script.key,
        type: script.type,
        name: script.name,
        added: Date.parse(script.added),
        search: [
            script.name, script.filename, script.host, script.description, script.author, script.version,
            ...script.match, ...script.include, script.type === "style" ? "style css stylus" : "script userscript"
        ].join(" ").toLowerCase(),
        html: renderCard(script)
    }));
    const data = JSON.stringify(items).replace(/</g, "\\u003c");
    const fromTemplate = view => template.replace("{{ICONS}}", () => `${seoMeta({ title: "Scripts", description: DESCRIPTION, route: "/" })}\n${ICON_LINKS}`).replace("{{FLAGS}}", () => FLAGS_LINK).replace("{{THEME_INIT}}", () => THEME_INIT).replace("{{NAV}}", () => renderNav(view === "saved" ? "/saved" : "")).replace("{{FOOTER}}", () => renderFooter()).replace("{{DATA}}", () => data).replace("{{VIEW}}", view);
    const html = fromTemplate("home");
    const searchHtml = fromTemplate("search").replace("<title>Scripts</title>", () => `<title data-i18n="search_title">${itext("search_title")}</title>\n<meta name="robots" content="noindex">`);

    const savedHtml = fromTemplate("saved").replace("<title>Scripts</title>", () => `<title data-i18n="saved_title">${itext("saved_title")}</title>\n<meta name="robots" content="noindex">`);

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    writeHtml(path.join(outDir, "index.html"), html);
    fs.mkdirSync(path.join(outDir, "search"));
    writeHtml(path.join(outDir, "search", "index.html"), searchHtml);
    fs.mkdirSync(path.join(outDir, "saved"));
    writeHtml(path.join(outDir, "saved", "index.html"), savedHtml);
    fs.writeFileSync(path.join(outDir, "scripts.json"), JSON.stringify(scripts, null, 2));
    fs.mkdirSync(path.join(outDir, "scripts"));
    const css = template.match(/<style>([\s\S]*?)<\/style>/)[1] + fs.readFileSync(path.join(__dirname, "page.css"), "utf8");
    for (const name of pageNames) {
        if (name === "404") {
            writeHtml(path.join(outDir, "404.html"), renderContentPage(name, { css, route: "/404", noindex: true }));
            continue;
        }
        fs.mkdirSync(path.join(outDir, name));
        writeHtml(path.join(outDir, name, "index.html"), renderContentPage(name, { css, route: `/${name}`, current: `/${name}` }));
    }
    for (const file of fs.readdirSync(path.join(__dirname, "assets"))) fs.copyFileSync(path.join(__dirname, "assets", file), path.join(outDir, file));
    fs.writeFileSync(path.join(outDir, "site.webmanifest"), JSON.stringify({
        name: "Scripts",
        short_name: "Scripts",
        description: DESCRIPTION,
        start_url: `${base}/`,
        scope: `${base}/`,
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: [
            { src: `${base}/android-chrome-192x192.png`, sizes: "192x192", type: "image/png" },
            { src: `${base}/android-chrome-512x512.png`, sizes: "512x512", type: "image/png" }
        ]
    }, null, 2));

    const robots = ["User-agent: *", "Allow: /"];
    if (site) {
        const urls = ["/", ...pageRoutes, ...new Set(scripts.map(script => `/u/${script.authorSlug}`)), ...scripts.map(script => script.path)];
        fs.writeFileSync(path.join(outDir, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `<url><loc>${esc(site + url)}</loc></url>`).join("\n")}\n</urlset>\n`);
        robots.push(`Sitemap: ${site}/sitemap.xml`);
    }
    fs.writeFileSync(path.join(outDir, "robots.txt"), robots.join("\n") + "\n");
    for (const script of scripts) {
        fs.mkdirSync(path.join(outDir, "scripts", path.dirname(script.key)), { recursive: true });
        fs.copyFileSync(path.join(scriptsDir, script.key), path.join(outDir, "scripts", script.key));
        for (const shot of script.shots) {
            const relative = decodeURI(shot).replace(/^\/scripts\//, "");
            fs.copyFileSync(path.join(scriptsDir, relative), path.join(outDir, "scripts", relative));
        }
        const source = fs.readFileSync(path.join(scriptsDir, script.key), "utf8");
        const code = await codeToHtml(source, {
            lang: script.type === "style" ? "css" : "javascript",
            themes: { light: "github-light", dark: "github-dark" },
            defaultColor: false
        });
        const pageDir = path.join(outDir, "u", script.authorSlug, script.slug);
        fs.mkdirSync(pageDir, { recursive: true });
        writeHtml(path.join(pageDir, "index.html"), renderPage(script, code, css, scripts));
    }

    const tabs = template.match(/<div class="tabs" id="sort"[\s\S]*?<\/div>/)[0];
    const authors = new Map();
    for (const script of scripts) {
        if (!authors.has(script.authorSlug)) authors.set(script.authorSlug, { name: script.author, list: [] });
        authors.get(script.authorSlug).list.push(script);
    }
    for (const [authorSlug, { name, list }] of authors) {
        const profileDir = path.join(outDir, "u", authorSlug);
        fs.mkdirSync(profileDir, { recursive: true });
        writeHtml(path.join(profileDir, "index.html"), renderProfile(name, authorSlug, list, css, tabs));
    }

    console.log(`Generated ${scripts.length} script(s) -> public/`);
}

main();
