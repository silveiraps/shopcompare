// Valida data/lojas.json e data/pesquisas/*.json.
// Uso: npm run validar   (ou: node scripts/validar.js [ficheiro-pesquisa.json])
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const erros = [];
const err = (onde, msg) => erros.push(`${onde}: ${msg}`);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const numOuNull = (v) => v === null || v === undefined || isNum(v);

function ler(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { err(path.relative(ROOT, file), `JSON inválido (${e.message})`); return null; }
}

// ---- lojas ----
const lojasFile = path.join(ROOT, 'data', 'lojas.json');
const lojas = ler(lojasFile) || [];
const ids = new Set();
const ENVIA = ['sim', 'nao', 'depende', 'por_verificar'];
const AVAL = [null, undefined, 'boa', 'media', 'evitar'];
if (!Array.isArray(lojas)) err('lojas.json', 'tem de ser uma lista');
else lojas.forEach((l, i) => {
  const onde = `lojas.json[${i}] ${l?.nome ?? ''}`;
  if (!l.id) err(onde, 'falta id');
  if (ids.has(l.id)) err(onde, `id repetido "${l.id}"`);
  ids.add(l.id);
  if (!l.nome) err(onde, 'falta nome');
  if (!ENVIA.includes(l.envia_terceira)) err(onde, `envia_terceira deve ser um de ${ENVIA.join('/')}`);
  if (!AVAL.includes(l.avaliacao)) err(onde, 'avaliacao deve ser boa/media/evitar/null');
  const p = l.portes || {};
  if (!numOuNull(p.custo_base)) err(onde, 'portes.custo_base deve ser número ou null');
  if (!numOuNull(p.gratis_a_partir_de)) err(onde, 'portes.gratis_a_partir_de deve ser número ou null');
  (p.escaloes_peso || []).forEach((e, j) => {
    if (!isNum(e.ate_kg) || !isNum(e.custo)) err(onde, `escaloes_peso[${j}] precisa de ate_kg e custo numéricos`);
  });
  if (l.pesquisa_url && !l.pesquisa_url.includes('{q}')) err(onde, 'pesquisa_url deve conter {q}');
});

// ---- pesquisas ----
const dir = path.join(ROOT, 'data', 'pesquisas');
const alvo = process.argv[2];
const ficheiros = alvo ? [path.resolve(alvo)]
  : fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
const CONF = [undefined, null, 'exato', 'provavel', 'semelhante'];
for (const f of ficheiros) {
  const p = ler(f);
  if (!p) continue;
  const onde = path.relative(ROOT, f);
  if (!p.consulta) err(onde, 'falta consulta');
  if (!p.criada_em || isNaN(new Date(p.criada_em))) err(onde, 'criada_em deve ser data ISO');
  if (!Array.isArray(p.resultados)) err(onde, 'resultados deve ser lista');
  (p.resultados || []).forEach((r, i) => {
    const o = `${onde} resultados[${i}]`;
    if (!ids.has(r.loja_id)) err(o, `loja_id "${r.loja_id}" não existe em lojas.json`);
    if (!r.titulo) err(o, 'falta titulo');
    if (!r.url) err(o, 'falta url');
    if (!isNum(r.preco)) err(o, 'preco deve ser número (€)');
    if (!numOuNull(r.portes_observados)) err(o, 'portes_observados deve ser número ou null');
    if (!numOuNull(r.peso_kg)) err(o, 'peso_kg deve ser número ou null');
    if (!CONF.includes(r.confianca)) err(o, 'confianca deve ser exato/provavel/semelhante');
  });
  (p.nao_encontrado || []).forEach((n, i) => {
    if (!ids.has(n.loja_id)) err(`${onde} nao_encontrado[${i}]`, `loja_id "${n.loja_id}" não existe`);
  });
}

if (erros.length) {
  console.error(`✗ ${erros.length} problema(s):\n  - ` + erros.join('\n  - '));
  process.exit(1);
}
console.log(`✓ OK: ${lojas.length} lojas, ${ficheiros.length} pesquisa(s)`);
