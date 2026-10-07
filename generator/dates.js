const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { createHash } = require("crypto");

const root = path.resolve(__dirname, "..");
const scriptsDir = path.join(root, "scripts");
const datesFile = path.join(__dirname, "dates.json");

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
        const dir = path.join(scriptsDir, folder.name);
        for (const file of fs.readdirSync(dir).filter(name => name.endsWith(".user.js")).sort()) {
            entries.push({ user: folder.name, file, key: `${folder.name}/${file}`, absolute: path.join(dir, file) });
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
    for (const { key, file, absolute } of listScripts()) {
        stamps[key] = stampOf(ledger[key] || ledger[file], absolute);
    }
    const serialized = JSON.stringify(stamps, null, 2) + "\n";
    try {
        if (!fs.existsSync(datesFile) || fs.readFileSync(datesFile, "utf8") !== serialized) fs.writeFileSync(datesFile, serialized);
    } catch {}
    return stamps;
}

if (require.main === module) syncDates();

module.exports = { syncDates, listScripts };
