import { portesDoResultado, eur } from './portes.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let lojas = [];
let pesquisaAtual = null;
let assinaturaLista = '';

// ---------------- util ----------------
async function api(metodo, rota, corpo) {
  const r = await fetch('/api/' + rota, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const dados = await r.json();
  if (!r.ok) throw new Error(dados.erro || 'Erro');
  return dados;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('visivel');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('visivel'), 2500);
}

const ROTULO_ENVIA = { sim: 'Sim', depende: 'Depende', por_verificar: 'Por verificar', nao: 'Não' };
const ROTULO_AVAL = { boa: 'Boa', media: 'Média', evitar: 'A evitar' };
const ROTULO_CONF = { exato: 'Mesmo artigo', provavel: 'Provável', semelhante: 'Semelhante' };

function dataCurta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? esc(iso) : d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------------- tabs ----------------
document.querySelectorAll('[data-tab]').forEach((b) =>
  b.addEventListener('click', () => mostrarTab(b.dataset.tab)));

function mostrarTab(nome) {
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('ativo', b.dataset.tab === nome));
  document.querySelectorAll('.tab').forEach((s) => (s.hidden = s.id !== 'tab-' + nome));
  try { localStorage.setItem('tab', nome); } catch {}
}

// ---------------- lojas ----------------
async function carregarLojas() {
  lojas = await api('GET', 'lojas');
  desenharLojas();
}

function resumoPortes(l) {
  if (l.envia_terceira === 'nao') return '—';
  const p = l.portes || {};
  const partes = [];
  if (typeof p.custo_base === 'number') partes.push(eur(p.custo_base));
  if (p.escaloes_peso?.length) partes.push(`${p.escaloes_peso.length} escalões peso`);
  return partes.join(' · ') || '<span class="fraco">?</span>';
}

function desenharLojas() {
  const tbody = $('#tabela-lojas tbody');
  if (!lojas.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="vazio">Ainda não há lojas.</td></tr>';
    return;
  }
  tbody.innerHTML = lojas
    .slice()
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((l) => `
      <tr class="${l.ativa === false ? 'inativa' : ''}">
        <td><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.nome)}</a>
          <div class="fraco pequeno">${esc(l.pais || '')} ${l.categorias?.length ? '· ' + esc(l.categorias.join(', ')) : ''}</div></td>
        <td><span class="badge b-${esc(l.envia_terceira || 'por_verificar')}">${ROTULO_ENVIA[l.envia_terceira] || 'Por verificar'}</span></td>
        <td>${resumoPortes(l)}</td>
        <td>${typeof l.portes?.gratis_a_partir_de === 'number' ? eur(l.portes.gratis_a_partir_de) : '—'}</td>
        <td>${esc(l.prazo_dias || '—')}</td>
        <td>${l.avaliacao ? `<span class="badge a-${esc(l.avaliacao)}">${ROTULO_AVAL[l.avaliacao]}</span>` : '—'}</td>
        <td class="pequeno">${dataCurta(l.verificado_em)}</td>
        <td><button class="link" data-editar="${esc(l.id)}">Editar</button></td>
      </tr>
      ${l.notas ? `<tr class="notas ${l.ativa === false ? 'inativa' : ''}"><td colspan="8">${esc(l.notas)}</td></tr>` : ''}
    `).join('');
  tbody.querySelectorAll('[data-editar]').forEach((b) =>
    b.addEventListener('click', () => abrirLoja(lojas.find((l) => l.id === b.dataset.editar))));
}

// ---- formulário ----
const dlg = $('#dlg-loja');
const form = $('#form-loja');
let lojaEmEdicao = null;

function linhaEscalao(e = {}) {
  const div = document.createElement('div');
  div.className = 'escalao';
  div.innerHTML = `
    <label>até <input type="number" step="0.1" min="0" class="e-kg" value="${e.ate_kg ?? ''}"> kg</label>
    <label><input type="number" step="0.01" min="0" class="e-custo" value="${e.custo ?? ''}"> €</label>
    <button type="button" class="link perigo-txt" aria-label="Remover">✕</button>`;
  div.querySelector('button').addEventListener('click', () => div.remove());
  $('#escaloes').appendChild(div);
}
$('#btn-escalao').addEventListener('click', () => linhaEscalao());

function abrirLoja(l) {
  lojaEmEdicao = l || null;
  form.reset();
  $('#escaloes').innerHTML = '';
  $('#dlg-titulo').textContent = l ? `Editar ${l.nome}` : 'Nova loja';
  $('#btn-apagar').hidden = !l;
  const v = l || { envia_terceira: 'por_verificar', ativa: true, portes: {} };
  const f = form.elements;
  for (const k of ['nome', 'url', 'pais', 'pesquisa_url', 'envia_terceira', 'transportadora',
    'prazo_dias', 'avaliacao', 'devolucoes', 'notas', 'fonte_url', 'verificado_em']) {
    f[k].value = v[k] ?? '';
  }
  f.categorias.value = (v.categorias || []).join(', ');
  f.custo_base.value = v.portes?.custo_base ?? '';
  f.gratis_a_partir_de.value = v.portes?.gratis_a_partir_de ?? '';
  f.ativa.checked = v.ativa !== false;
  (v.portes?.escaloes_peso || []).forEach(linhaEscalao);
  dlg.showModal();
}

function numOuNull(s) {
  return s === '' || s == null ? null : Number(s);
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const f = form.elements;
  const escaloes = [...document.querySelectorAll('#escaloes .escalao')]
    .map((d) => ({ ate_kg: numOuNull(d.querySelector('.e-kg').value), custo: numOuNull(d.querySelector('.e-custo').value) }))
    .filter((e) => e.ate_kg != null && e.custo != null);
  const dados = {
    ...(lojaEmEdicao || {}),
    nome: f.nome.value.trim(),
    url: f.url.value.trim(),
    pais: f.pais.value.trim().toUpperCase(),
    categorias: f.categorias.value.split(',').map((s) => s.trim()).filter(Boolean),
    pesquisa_url: f.pesquisa_url.value.trim(),
    envia_terceira: f.envia_terceira.value,
    portes: {
      custo_base: numOuNull(f.custo_base.value),
      gratis_a_partir_de: numOuNull(f.gratis_a_partir_de.value),
      escaloes_peso: escaloes,
    },
    transportadora: f.transportadora.value.trim(),
    prazo_dias: f.prazo_dias.value.trim(),
    devolucoes: f.devolucoes.value.trim(),
    avaliacao: f.avaliacao.value || null,
    notas: f.notas.value.trim(),
    verificado_em: f.verificado_em.value || null,
    fonte_url: f.fonte_url.value.trim(),
    ativa: f.ativa.checked,
  };
  try {
    if (lojaEmEdicao) await api('PUT', 'lojas/' + lojaEmEdicao.id, dados);
    else await api('POST', 'lojas', dados);
    dlg.close();
    toast('Loja guardada');
    await carregarLojas();
    if (pesquisaAtual) desenharResultado(pesquisaAtual);
  } catch (e) { toast(e.message); }
});

$('#btn-cancelar').addEventListener('click', () => dlg.close());
$('#btn-apagar').addEventListener('click', async () => {
  if (!lojaEmEdicao || !confirm(`Apagar ${lojaEmEdicao.nome}?`)) return;
  await api('DELETE', 'lojas/' + lojaEmEdicao.id);
  dlg.close();
  toast('Loja apagada');
  carregarLojas();
});
$('#btn-nova-loja').addEventListener('click', () => abrirLoja(null));

// ---------------- pesquisas ----------------
$('#btn-copiar').addEventListener('click', async () => {
  const q = $('#q').value.trim();
  if (!q) { $('#q').focus(); return; }
  const cmd = `/procurar ${q}`;
  try {
    await navigator.clipboard.writeText(cmd);
    toast('Comando copiado. Cola-o no Claude Code');
  } catch {
    prompt('Copia este comando:', cmd);
  }
});
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-copiar').click(); });

async function carregarListaPesquisas() {
  const lista = await api('GET', 'pesquisas');
  const assinatura = JSON.stringify(lista);
  if (assinatura === assinaturaLista) return;
  const novaPrimeira = assinaturaLista && lista[0] && lista[0].id !== pesquisaAtual?.id;
  assinaturaLista = assinatura;

  const ul = $('#lista-pesquisas');
  ul.innerHTML = lista.length
    ? lista.map((p) => `
        <li><button data-pesq="${esc(p.id)}" class="${p.id === pesquisaAtual?.id ? 'ativo' : ''}">
          <span>${esc(p.consulta)}</span>
          <small>${dataCurta(p.criada_em)} · ${p.n_resultados} resultados</small>
        </button></li>`).join('')
    : '<li class="vazio">Sem pesquisas ainda.</li>';
  ul.querySelectorAll('[data-pesq]').forEach((b) =>
    b.addEventListener('click', () => abrirPesquisa(b.dataset.pesq)));

  if (novaPrimeira || (!pesquisaAtual && lista[0])) abrirPesquisa(lista[0].id);
  else if (pesquisaAtual) abrirPesquisa(pesquisaAtual.id, true);
}

async function abrirPesquisa(id, silencioso = false) {
  try {
    pesquisaAtual = await api('GET', 'pesquisas/' + id);
  } catch (e) {
    if (!silencioso) toast(e.message);
    return;
  }
  document.querySelectorAll('[data-pesq]').forEach((b) => b.classList.toggle('ativo', b.dataset.pesq === id));
  desenharResultado(pesquisaAtual);
}

function desenharResultado(p) {
  const porId = Object.fromEntries(lojas.map((l) => [l.id, l]));
  const linhas = (p.resultados || []).map((r) => {
    const loja = porId[r.loja_id];
    const portes = portesDoResultado(r, loja);
    const total = typeof r.preco === 'number' && portes.valor != null ? r.preco + portes.valor : null;
    return { r, loja, portes, total };
  });
  // Ordena: totais conhecidos primeiro (mais barato em cima), depois por preço.
  linhas.sort((a, b) => {
    const ea = a.r.disponivel === false, eb = b.r.disponivel === false;
    if (ea !== eb) return ea ? 1 : -1; // esgotados no fim
    if (a.total != null && b.total != null) return a.total - b.total;
    if (a.total != null) return -1;
    if (b.total != null) return 1;
    return (a.r.preco ?? Infinity) - (b.r.preco ?? Infinity);
  });
  const melhor = linhas.find((l) => l.total != null && l.r.disponivel !== false);

  $('#resultado').innerHTML = `
    <div class="cabecalho">
      <div>
        <h2>${esc(p.consulta)}</h2>
        <div class="fraco pequeno">${dataCurta(p.criada_em)}</div>
      </div>
      <button class="link perigo-txt" id="btn-apagar-pesq">Apagar pesquisa</button>
    </div>
    ${p.notas ? `<p class="nota-pesq">${esc(p.notas)}</p>` : ''}
    ${linhas.length ? `
    <div class="tabela-wrap">
      <table class="tabela resultados">
        <thead><tr><th>Loja</th><th>Artigo</th><th class="num">Preço</th><th class="num">Portes</th><th class="num">Total na Terceira</th></tr></thead>
        <tbody>
          ${linhas.map(({ r, loja, portes, total }) => `
            <tr class="${r === melhor?.r ? 'melhor' : ''} ${r.disponivel === false ? 'esgotado' : ''}">
              <td><b>${esc(loja?.nome || r.loja_id)}</b>
                ${loja?.avaliacao ? `<div><span class="badge a-${esc(loja.avaliacao)}">${ROTULO_AVAL[loja.avaliacao]}</span></div>` : ''}</td>
              <td><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.titulo)}</a>
                <div class="pequeno fraco">
                  ${r.confianca ? `<span class="badge c-${esc(r.confianca)}">${ROTULO_CONF[r.confianca] || esc(r.confianca)}</span>` : ''}
                  ${r.disponivel === false ? '<span class="badge b-nao">Esgotado</span>' : ''}
                  ${esc(r.nota || '')}
                </div></td>
              <td class="num">${eur(r.preco)}</td>
              <td class="num" title="${esc(portes.explicacao)}">${portes.valor != null ? eur(portes.valor) : '<span class="fraco">?</span>'}
                <div class="pequeno fraco">${esc(portes.explicacao)}</div></td>
              <td class="num total">${total != null ? eur(total) : '<span class="fraco">—</span>'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p class="vazio">Sem resultados.</p>'}
    ${p.nao_encontrado?.length ? `
      <details class="nao-encontrado">
        <summary>Não encontrado em ${p.nao_encontrado.length} loja(s)</summary>
        <ul>${p.nao_encontrado.map((n) => `<li><b>${esc(porId[n.loja_id]?.nome || n.loja_id)}</b>: ${esc(n.motivo || '')}</li>`).join('')}</ul>
      </details>` : ''}
  `;
  $('#btn-apagar-pesq').addEventListener('click', async () => {
    if (!confirm('Apagar esta pesquisa?')) return;
    await api('DELETE', 'pesquisas/' + p.id);
    pesquisaAtual = null;
    $('#resultado').innerHTML = '<p class="vazio">Pesquisa apagada.</p>';
    carregarListaPesquisas();
  });
}

// ---------------- arranque ----------------
let tabInicial = 'pesquisas';
try { tabInicial = localStorage.getItem('tab') || tabInicial; } catch {}
mostrarTab(tabInicial);
await carregarLojas();
await carregarListaPesquisas();
// O Claude Code escreve novas pesquisas em data/pesquisas/: verifica a cada 4 s.
setInterval(() => carregarListaPesquisas().catch(() => {}), 4000);
setInterval(() => carregarLojas().catch(() => {}), 15000);

