import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const port = Number(process.env.PORT || 5173);
const root = path.resolve(new URL('../poc/', import.meta.url).pathname.slice(process.platform === 'win32' ? 1 : 0));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const relativePath = url.pathname === '/' ? '/star-chart.html' : url.pathname;
    const filePath = path.resolve(root, `.${decodeURIComponent(relativePath)}`);

    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const body = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Star chart POC: http://127.0.0.1:${port}/`);
});
