import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function safePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relative = normalize(decoded).replace(/^([/\\])+/, "");
  const candidate = resolve(join(root, relative || "index.html"));
  return candidate.startsWith(root) ? candidate : join(root, "index.html");
}

async function sendFile(res, path) {
  const data = await readFile(path);
  res.writeHead(200, {
    "Content-Type": mime[extname(path).toLowerCase()] || "application/octet-stream",
    "Cache-Control": path.endsWith("index.html") ? "no-cache" : "public, max-age=3600",
  });
  res.end(data);
}

const server = createServer(async (req, res) => {
  try {
    let path = safePath(req.url);
    try {
      const info = await stat(path);
      if (info.isDirectory()) path = join(path, "index.html");
      await sendFile(res, path);
    } catch {
      await sendFile(res, join(root, "index.html"));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Server error: ${error instanceof Error ? error.message : String(error)}`);
  }
});

function listen(port) {
  server.once("error", error => {
    if (error && error.code === "EADDRINUSE" && port < 5190) listen(port + 1);
    else throw error;
  });
  server.listen(port, "127.0.0.1", () => {
    const address = server.address();
    const activePort = typeof address === "object" && address ? address.port : port;
    const url = `http://127.0.0.1:${activePort}`;
    console.log(`Saudia One IT is running at ${url}`);
    console.log("Press Control + C to stop.");
    if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
  });
}

listen(4173);
