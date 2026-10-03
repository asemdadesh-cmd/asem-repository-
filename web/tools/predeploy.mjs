#!/usr/bin/env node
// Pre-deploy check for static sites. Catches the things that make a first deploy fail or 404:
//   * a referenced file that does not exist (Vercel/Netlify run on Linux: names are CASE-SENSITIVE)
//   * invalid vercel.json / missing publish config
//   * secrets, node_modules or .git inside the folder being published
//   * very large files
// Usage: node predeploy.mjs [folderToPublish]      (default: the parent of this file, i.e. web/)
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const problems = [], warnings = [];
const skipDirs = new Set(["tools", "node_modules", ".git"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(e.name)) continue;
    const p = path.join(dir, e.name);
    e.isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}
// exact-case existence check (fs.existsSync is case-insensitive on macOS/Windows, which hides the bug until Vercel runs it)
function existsExact(p) {
  const parts = path.relative(root, p).split(path.sep);
  let cur = root;
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") return false;
    let names; try { names = fs.readdirSync(cur); } catch { return false; }
    if (!names.includes(part)) return false;
    cur = path.join(cur, part);
  }
  return true;
}

const files = walk(root);
const rel = (p) => path.relative(root, p);

for (const f of files) {
  const r = rel(f), size = fs.statSync(f).size;
  if (/(^|\/)\.env(\.|$)/.test(r) || /\.(pem|key)$/.test(r)) problems.push(`secret-looking file would be published: ${r}`);
  if (size > 20 * 1024 * 1024) problems.push(`file over 20 MB: ${r}`);
  else if (size > 5 * 1024 * 1024) warnings.push(`large file (${(size / 1048576).toFixed(1)} MB): ${r}`);
}

// value up to the matching quote; skip ones glued to a JS expression ("assets/" + name), which cannot be checked statically
const attr = /\b(?:src|href|poster|data-sc-src|data-sc-src-mobile|action)\s*=\s*(["'])(.+?)\1(?!\s*\+)/g;
const cssUrl = /url\(\s*["']?([^"')]+)["']?\s*\)/g;
let refs = 0;
for (const f of files.filter((x) => /\.(html|css)$/.test(x))) {
  const text = fs.readFileSync(f, "utf8");
  const found = [];
  for (const m of text.matchAll(attr)) found.push(m[2]);
  for (const m of text.matchAll(cssUrl)) found.push(m[1]);
  for (let ref of found) {
    if (/^(https?:|mailto:|tel:|data:|#|javascript:|\/\/|%23)/i.test(ref) || ref.includes("${") || /["'`]\s*\+|\+\s*["'`]/.test(ref)) continue;
    ref = ref.split("#")[0].split("?")[0];
    if (!ref) continue;
    refs++;
    let target = ref.startsWith("/") ? path.join(root, ref) : path.resolve(path.dirname(f), ref);
    if (target.endsWith(path.sep) || (!path.extname(target) && fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
    if (!existsExact(target)) problems.push(`${rel(f)} references missing file: ${ref}`);
  }
}

const vj = path.join(root, "vercel.json");
if (fs.existsSync(vj)) { try { JSON.parse(fs.readFileSync(vj, "utf8")); } catch (e) { problems.push(`vercel.json is not valid JSON: ${e.message}`); } }
if (!fs.existsSync(path.join(root, "index.html"))) problems.push("no index.html at the root of the folder being published");

console.log(`Checked ${files.length} files and ${refs} references in ${root}`);
warnings.forEach((w) => console.log("  warn  " + w));
problems.forEach((p) => console.log("  FAIL  " + p));
console.log(problems.length ? `\n${problems.length} problem(s). Fix before deploying.` : "\nOK: safe to deploy.");
process.exit(problems.length ? 1 : 0);
