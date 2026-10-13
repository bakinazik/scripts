(() => {
    const data = window.__I18N;
    const root = document.documentElement;
    const codes = Object.keys(data.langs);
    const RTL = ["ar", "fa", "he", "ur"];
    const THEMES = ["system", "dark", "light"];
    const SELECTOR = "[data-i18n],[data-i18n-html],[data-i18n-date],[data-i18n-title],[data-i18n-aria-label],[data-i18n-placeholder]";
    const light = matchMedia("(prefers-color-scheme:light)");

    const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
    const escapeHtml = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const pick = () => {
        const saved = read("lang");
        if (codes.includes(saved)) return saved;
        for (const tag of navigator.languages || [navigator.language]) {
            const full = String(tag).toLowerCase();
            const hit = codes.find(code => code.toLowerCase() === full) || codes.find(code => code.toLowerCase() === full.split("-")[0]);
            if (hit) return hit;
        }
        return data.fallback;
    };

    let lang = pick();

    const lookup = key => (data.langs[lang] || {})[key] ?? data.langs[data.fallback][key] ?? key;

    const fill = (text, vars, escape) => text.replace(/\{(\w+)\}/g, (match, name) => {
        const value = vars && name in vars ? vars[name] : data.vars[name];
        return value === undefined ? match : escape ? escapeHtml(value) : value;
    });

    const t = (key, vars) => fill(lookup(key), vars, false);

    const formatDate = iso => {
        const date = new Date(iso);
        if (isNaN(date)) return null;
        try {
            return new Intl.DateTimeFormat(lang === "en" ? "en-US" : lang, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
        } catch {
            return null;
        }
    };

    const varsOf = el => {
        try { return JSON.parse(el.getAttribute("data-i18n-vars") || "null"); } catch { return null; }
    };

    const apply = (scope = document) => {
        scope.querySelectorAll(SELECTOR).forEach(el => {
            const vars = varsOf(el);
            const key = el.getAttribute("data-i18n");
            if (key) el.textContent = t(key, vars);
            const rich = el.getAttribute("data-i18n-html");
            if (rich) el.innerHTML = fill(lookup(rich), vars, true);
            const when = el.getAttribute("data-i18n-date");
            const formatted = when && formatDate(when);
            if (formatted) el.textContent = formatted;
            for (const name of ["title", "aria-label", "placeholder"]) {
                const attrKey = el.getAttribute("data-i18n-" + name);
                if (attrKey) el.setAttribute(name, t(attrKey, vars));
            }
        });
    };

    let pageCache = null;

    const pageData = () => {
        if (pageCache) return pageCache;
        const element = document.getElementById("page-data");
        if (element) {
            try { pageCache = JSON.parse(element.textContent); } catch {}
        }
        return pageCache;
    };

    const renderPage = () => {
        const target = document.querySelector("[data-page]");
        const pages = target && pageData();
        const entry = pages && (pages[lang] || pages[data.fallback]);
        if (!entry) return;
        target.innerHTML = entry.html;
        if (entry.title) document.title = entry.title;
    };

    const mark = (id, value) => {
        document.querySelectorAll(`#${id} button`).forEach(button => button.classList.toggle("is-active", button.dataset.value === value));
    };

    const render = () => {
        root.lang = lang;
        root.dir = RTL.includes(lang.split("-")[0]) ? "rtl" : "ltr";
        apply();
        renderPage();
        mark("lang-options", lang);
    };

    const setLang = code => {
        lang = code;
        render();
        document.dispatchEvent(new CustomEvent("i18n:changed"));
    };

    const resolve = preference => preference === "system" ? (light.matches ? "light" : "dark") : preference;
    const themePreference = () => THEMES.includes(read("theme")) ? read("theme") : "system";

    const setTheme = preference => {
        write("theme", preference);
        root.dataset.theme = resolve(preference);
        mark("theme-options", preference);
    };

    const menu = document.getElementById("settings");
    const trigger = document.getElementById("settings-trigger");
    const panel = document.getElementById("panel");
    const langOptions = document.getElementById("lang-options");

    const showRoot = () => {
        panel.classList.remove("has-section");
        panel.querySelectorAll(".settings-section.is-active").forEach(section => section.classList.remove("is-active"));
        panel.querySelectorAll("[data-section]").forEach(button => button.setAttribute("aria-expanded", "false"));
    };

    const close = () => {
        menu.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
        showRoot();
    };

    trigger.addEventListener("click", event => {
        event.stopPropagation();
        const open = !menu.classList.contains("is-open");
        menu.classList.toggle("is-open", open);
        trigger.setAttribute("aria-expanded", String(open));
        if (!open) showRoot();
    });

    panel.querySelectorAll("[data-section]").forEach(button => button.addEventListener("click", () => {
        panel.classList.add("has-section");
        document.getElementById(button.dataset.section).classList.add("is-active");
        button.setAttribute("aria-expanded", "true");
    }));

    panel.querySelectorAll("[data-back]").forEach(head => head.addEventListener("click", showRoot));

    document.addEventListener("click", event => {
        if (!menu.contains(event.target)) close();
    });

    addEventListener("keydown", event => {
        if (event.key === "Escape") close();
    });

    codes.forEach(code => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.value = code;
        const flag = data.langs[code].language_flag;
        if (flag) {
            const icon = document.createElement("span");
            icon.className = "fi fi-" + flag.toLowerCase().replace(/[^a-z-]/g, "");
            button.append(icon);
        }
        const name = document.createElement("span");
        name.textContent = data.langs[code].language_name || code;
        button.append(name);
        langOptions.append(button);
    });

    const choose = (id, handler) => document.getElementById(id).addEventListener("click", event => {
        const button = event.target.closest("button");
        if (button) handler(button.dataset.value);
    });

    choose("theme-options", setTheme);
    choose("lang-options", code => {
        write("lang", code);
        setLang(code);
    });

    light.addEventListener("change", () => {
        if (themePreference() === "system") root.dataset.theme = resolve("system");
    });

    mark("theme-options", themePreference());
    render();

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { apply(); renderPage(); });

    window.i18n = { t, apply };
})();
