// Cálculo de portes para a Terceira a partir das regras guardadas de cada loja.
// Usado tanto pelo servidor como pelo browser.

/**
 * @param {object} loja    registo de data/lojas.json
 * @param {number} preco   preço do artigo (€)
 * @param {number|null} pesoKg peso estimado (opcional, só usado se a loja tiver escalões)
 * @returns {{valor: number|null, explicacao: string}}
 */
export function calcularPortes(loja, preco, pesoKg = null) {
  if (!loja) return { valor: null, explicacao: 'Loja desconhecida' };
  if (loja.envia_terceira === 'nao') {
    return { valor: null, explicacao: 'Não envia para a Terceira' };
  }
  const p = loja.portes || {};

  if (num(p.gratis_a_partir_de) && preco >= p.gratis_a_partir_de) {
    return { valor: 0, explicacao: `Grátis (compra ≥ ${eur(p.gratis_a_partir_de)})` };
  }

  if (Array.isArray(p.escaloes_peso) && p.escaloes_peso.length && num(pesoKg)) {
    const esc = [...p.escaloes_peso]
      .sort((a, b) => a.ate_kg - b.ate_kg)
      .find((e) => pesoKg <= e.ate_kg);
    if (esc) return { valor: esc.custo, explicacao: `Escalão até ${esc.ate_kg} kg` };
  }

  if (num(p.custo_base)) {
    let txt = 'Custo base';
    if (num(p.gratis_a_partir_de)) txt += ` (grátis a partir de ${eur(p.gratis_a_partir_de)})`;
    return { valor: p.custo_base, explicacao: txt };
  }

  return { valor: null, explicacao: 'Portes por confirmar' };
}

/**
 * Portes de um resultado de pesquisa: se o Claude viu os portes reais no site
 * (portes_observados), esses têm prioridade sobre as regras guardadas.
 */
export function portesDoResultado(resultado, loja) {
  if (num(resultado.portes_observados)) {
    return { valor: resultado.portes_observados, explicacao: 'Observado no site' };
  }
  return calcularPortes(loja, resultado.preco, resultado.peso_kg ?? null);
}

export function eur(v) {
  return num(v) ? v.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—';
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
