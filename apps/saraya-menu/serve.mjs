// Local preview of public/ at http://localhost:4600 (or PORT). Serves /en/ and clean URLs like Vercel.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL("./public/", import.meta.url).pathname;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".json": "application/json" };
const port = Number(process.env.PORT || 4600);

createServer(async (req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(root, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
  } catch {
    file += ".html";
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => console.log(`http://localhost:${port}`));
