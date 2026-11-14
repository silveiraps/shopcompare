// Servidor local do ShopCompare. Sem dependências: só precisa de Node.js 18+.
// Arranque: npm start  (ou: node server.js)  →  http://localhost:3000

import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(ROOT, 'data');
const LOJAS = path.join(DATA, 'lojas.json');
const PESQUISAS = path.join(DATA, 'pesquisas');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

async function lerJSON(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error(`Ficheiro inválido: ${path.relative(ROOT, file)} (${e.message})`);
  }
}

async function escreverJSON(file, data) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, file);
}

function slug(s) {
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'loja';
}

function enviar(res, status, body) {
  res.writeHead(status, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function lerCorpo(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

// ---------- API ----------

async function api(req, res, url) {
  const partes = url.pathname.split('/').filter(Boolean).slice(1); // sem "api"
  const [recurso, id] = partes;

  if (recurso === 'lojas') {
    const lojas = await lerJSON(LOJAS, []);
    if (req.method === 'GET' && !id) return enviar(res, 200, lojas);

    if (req.method === 'POST' && !id) {
      const nova = await lerCorpo(req);
      if (!nova.nome) return enviar(res, 400, { erro: 'O nome é obrigatório' });
      let base = slug(nova.id || nova.nome), novoId = base, n = 2;
      while (lojas.some((l) => l.id === novoId)) novoId = `${base}-${n++}`;
      const loja = { ...nova, id: novoId };
      lojas.push(loja);
      await escreverJSON(LOJAS, lojas);
      return enviar(res, 201, loja);
    }

    const i = lojas.findIndex((l) => l.id === id);
    if (i === -1) return enviar(res, 404, { erro: 'Loja não encontrada' });

    if (req.method === 'PUT') {
      const dados = await lerCorpo(req);
      lojas[i] = { ...dados, id };
      await escreverJSON(LOJAS, lojas);
      return enviar(res, 200, lojas[i]);
    }
    if (req.method === 'DELETE') {
      lojas.splice(i, 1);
      await escreverJSON(LOJAS, lojas);
      return enviar(res, 200, { ok: true });
    }
  }

  if (recurso === 'pesquisas') {
    if (req.method === 'GET' && !id) {
      const ficheiros = (await fs.readdir(PESQUISAS).catch(() => [])).filter((f) => f.endsWith('.json'));
      const lista = [];
      for (const f of ficheiros) {
        try {
          const p = await lerJSON(path.join(PESQUISAS, f), null);
          lista.push({
            id: f.replace(/\.json$/, ''),
            consulta: p.consulta,
            criada_em: p.criada_em,
            n_resultados: (p.resultados || []).length,
          });
        } catch { /* ficheiro a meio de ser escrito: ignora */ }
      }
      lista.sort((a, b) => String(b.criada_em).localeCompare(String(a.criada_em)));
      return enviar(res, 200, lista);
    }
    if (!id || id.includes('..') || id.includes('/')) return enviar(res, 400, { erro: 'id inválido' });
    const file = path.join(PESQUISAS, id + '.json');
    if (req.method === 'GET') {
      const p = await lerJSON(file, null);
      return p ? enviar(res, 200, { id, ...p }) : enviar(res, 404, { erro: 'Pesquisa não encontrada' });
    }
    if (req.method === 'DELETE') {
      await fs.rm(file, { force: true });
      return enviar(res, 200, { ok: true });
    }
  }

  return enviar(res, 404, { erro: 'Rota desconhecida' });
}

// ---------- ficheiros estáticos ----------

async function estatico(res, url) {
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC)) return enviar(res, 403, { erro: 'Proibido' });
  try {
    const conteudo = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Não encontrado');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    return await estatico(res, url);
  } catch (e) {
    console.error(e);
    enviar(res, 500, { erro: e.message });
  }
});

await fs.mkdir(PESQUISAS, { recursive: true });
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  ShopCompare a correr em  http://localhost:${PORT}\n  (Ctrl+C para parar)\n`);
});
