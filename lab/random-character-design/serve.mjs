import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = fileURLToPath(new URL('./', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml' };
export function createToolServer() {
  return http.createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); return response.end('Read-only static server'); }
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/__tool-health') { response.setHeader('Content-Type', 'application/json'); return response.end(JSON.stringify({ tool: 'character-dna-studio' })); }
      const target = path.resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
      const relative = path.relative(root, target);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !['.html', '.css', '.js', '.json', '.svg'].includes(path.extname(target))) { response.writeHead(404); return response.end('Not found'); }
      if (!(await stat(target)).isFile()) throw new Error('Not a file');
      const content = await readFile(target); response.setHeader('Content-Type', mime[path.extname(target)]); response.writeHead(200); response.end(request.method === 'HEAD' ? undefined : content);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.CHARACTER_DNA_PORT || 8767);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid CHARACTER_DNA_PORT');
  const url = `http://127.0.0.1:${port}`;
  const open = () => { if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, stdio: 'ignore' }).unref(); };
  const server = createToolServer();
  server.on('error', async error => {
    if (error.code === 'EADDRINUSE') {
      try { const check = await fetch(`${url}/__tool-health`, { signal: AbortSignal.timeout(1500) }); if ((await check.json()).tool === 'character-dna-studio') { console.log(`Character DNA Studio is already running: ${url}`); open(); return; } } catch { /* A different application owns this port. */ }
      console.error(`Port ${port} is occupied. Set CHARACTER_DNA_PORT to a free port. A different port uses separate browser data.`);
    } else console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => { console.log(`Character DNA Studio: ${url}\nKeep this terminal open. Ctrl+C to stop.`); open(); });
}
