---
name: procurar
description: Procura um produto em todas as lojas guardadas em data/lojas.json e grava o resultado (preço, link, disponibilidade) em data/pesquisas/ para a app mostrar o custo total até à Terceira. Usar quando o utilizador escreve /procurar <produto> ou pede para procurar/comparar o preço de um artigo.
argument-hint: <produto a procurar>
---

# /procurar: pesquisa de produto nas lojas guardadas

Produto pedido: **$ARGUMENTS**

Segue o `CLAUDE.md` do projeto (esquemas e regras). Responde em português de Portugal.

## Passos

1. **Lê `data/lojas.json`.** Considera só lojas com `ativa !== false` e `envia_terceira !== "nao"`.
   Se o produto claramente não pertence às `categorias` de uma loja (ex.: um livro numa loja só de
   informática), salta-a e regista-a em `nao_encontrado` com o motivo "fora das categorias".
   Lojas com categoria `geral` incluem-se sempre.

2. **Esclarece só se for preciso.** Se o pedido for muito vago (ex.: "auscultadores"), pergunta
   modelo/orçamento antes de pesquisar. Se for razoavelmente específico, avança.

3. **Procura em cada loja**, se possível em paralelo:
   - Abre `pesquisa_url` com `{q}` substituído pelo termo (codificado para URL), com WebFetch.
   - Se falhar (bloqueio, página vazia, JavaScript), usa WebSearch com `site:<domínio> <produto>`.
   - Abre a página do produto para confirmar **preço atual, disponibilidade e se é o mesmo artigo**.
     Prefere os dados estruturados da página (JSON-LD `Product`/`Offer`, EAN/GTIN, referência do fabricante).
   - `confianca`: `exato` = mesmo modelo/variante (EAN ou referência coincidem); `provavel` = mesmo modelo,
     variante pouco clara; `semelhante` = alternativa próxima (só se não houver o exato nessa loja).
   - Amazon e Worten têm marketplace: indica na `nota` quem vende/envia (ex.: "vendido por terceiro")
     porque isso muda os portes e se envia para os Açores.
   - Se a página mostrar portes para os Açores/Terceira, regista em `portes_observados`.
   - Máximo 2 resultados por loja (o mais relevante e, se útil, uma alternativa).
   - Nunca inventes preços. Se não conseguiste confirmar, põe a loja em `nao_encontrado` com o motivo.

4. **Grava** `data/pesquisas/<AAAAMMDD-HHMM>-<slug-do-produto>.json` segundo o esquema do `CLAUDE.md`
   (`criada_em` em ISO UTC). Usa `notas` para avisos gerais (ex.: "preços da Amazon variam muito").

5. **Valida:** `npm run validar`. Corrige até dar ✓.

6. **Resume na conversa** (curto): a melhor opção com o total estimado na Terceira (preço + portes das
   regras guardadas, ou "portes por confirmar"), as 2-3 seguintes, e lojas onde não encontraste.
   Lembra que a tabela completa está em http://localhost:3000 (separador Pesquisas).
   Se alguma loja tiver `envia_terceira: "por_verificar"` ou portes `null`, sugere `/adicionar-loja <url>`
   para fechar essa lacuna.
