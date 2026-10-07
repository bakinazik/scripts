const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createHash } = require("crypto");

const root = path.resolve(__dirname, "..");
const scriptsDir = path.join(root, "scripts");
const datesFile = path.join(__dirname, "dates.json");

const IMAGE = /\.(webp|png|jpe?g|gif|avif)$/i;

function gitDate(file, first) {
    try {
        const dates = execFileSync("git", ["log", "--follow", "--format=%cI", "--", file], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
            .trim().split("\n").filter(Boolean);
        if (dates.length) return first ? dates[dates.length - 1] : dates[0];
    } catch {}
    return fs.statSync(file).mtime.toISOString();
}

function listScripts() {
    const entries = [];
    for (const folder of fs.readdirSync(scriptsDir, { withFileTypes: true })) {
        if (!folder.isDirectory() || folder.name.startsWith(".")) continue;
        const userDir = path.join(scriptsDir, folder.name);
        for (const item of fs.readdirSync(userDir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            if (item.isFile() && /\.user\.(js|css)$/.test(item.name)) {
                console.warn(`Skipped scripts/${folder.name}/${item.name}: move it into scripts/${folder.name}/<name>/<name>${item.name.slice(item.name.indexOf(".user."))}`);
                continue;
            }
            if (!item.isDirectory() || item.name.startsWith(".")) continue;
            const dir = path.join(userDir, item.name);
            const names = fs.readdirSync(dir);
            const files = names.filter(name => name === `${item.name}.user.js` || name === `${item.name}.user.css`);
            const images = names.filter(name => IMAGE.test(name)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
            for (const stray of names.filter(name => /\.user\.(js|css)$/.test(name) && !files.includes(name))) {
                console.warn(`Skipped scripts/${folder.name}/${item.name}/${stray}: the file must be named ${item.name}.user.js or ${item.name}.user.css`);
            }
            for (const file of files) {
                entries.push({ user: folder.name, name: item.name, file, key: `${folder.name}/${item.name}/${file}`, absolute: path.join(dir, file), images: images.map(image => `${folder.name}/${item.name}/${image}`) });
            }
        }
    }
    return entries.sort((a, b) => a.key.localeCompare(b.key));
}

function readLedger() {
    try {
        return JSON.parse(fs.readFileSync(datesFile, "utf8"));
    } catch {
        return {};
    }
}

function stampOf(previous, file) {
    const hash = createHash("sha256").update(fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n")).digest("hex");
    if (!previous) return { added: gitDate(file, true), updated: gitDate(file, false), hash };
    if (previous.hash === hash) return previous;
    return { added: previous.added, updated: new Date().toISOString(), hash };
}

function syncDates() {
    const ledger = readLedger();
    const stamps = {};
    for (const { user, key, file, absolute } of listScripts()) {
        stamps[key] = stampOf(ledger[key] || ledger[`${user}/${file}`] || ledger[file], absolute);
    }
    const serialized = JSON.stringify(stamps, null, 2) + "\n";
    try {
        if (!fs.existsSync(datesFile) || fs.readFileSync(datesFile, "utf8") !== serialized) fs.writeFileSync(datesFile, serialized);
    } catch {}
    return stamps;
}

if (require.main === module) syncDates();

module.exports = { syncDates, listScripts };
