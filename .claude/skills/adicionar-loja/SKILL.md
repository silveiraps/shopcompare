---
name: adicionar-loja
description: Investiga as condições de envio de uma loja online para a ilha Terceira (Açores) e adiciona-a ou atualiza-a em data/lojas.json, após confirmação do utilizador. Usar quando o utilizador escreve /adicionar-loja <url ou nome>, pede para verificar portes de uma loja, ou quer rever lojas "por verificar".
argument-hint: <url ou nome da loja> | por-verificar
---

# /adicionar-loja: auditar condições de envio para a Terceira

Pedido: **$ARGUMENTS**

Segue o `CLAUDE.md` do projeto. Responde em português de Portugal.

Se o argumento for `por-verificar` (ou vazio), trata uma a uma as lojas de `data/lojas.json` com
`envia_terceira: "por_verificar"`, portes `null` ou `verificado_em` com mais de 6 meses.

## Passos

1. **Identifica a loja.** Se já existir em `data/lojas.json` (mesmo domínio), é uma atualização:
   mantém `id`, `avaliacao` e as `notas` do utilizador, salvo se ele disser o contrário.

2. **Encontra as condições de envio** com WebFetch e WebSearch:
   - Páginas típicas: "portes", "envios", "entregas", "condições de entrega", "ajuda/FAQ", "termos e condições".
   - Procura menções a **Açores / Regiões Autónomas / ilhas / Islas / Azoren / Azores**.
   - Lojas estrangeiras: confirma se Portugal inclui os Açores ou se as ilhas estão excluídas.
   - Recolhe: se envia para os Açores, custo (fixo, por peso, por valor), limiar de portes grátis,
     transportadora, prazo, exclusões (volumosos, marketplace) e custo das devoluções a partir dos Açores.
   - Descobre também o **URL de pesquisa** do site (ex.: `https://loja.pt/search?q={q}`).

3. **Mostra ao utilizador uma proposta** antes de gravar: os campos do esquema e a fonte (URL e frase
   citada). Separa o que está **confirmado na página** do que é **inferido**. Se a página não for clara,
   usa `envia_terceira: "por_verificar"` ou `"depende"`, deixa os valores a `null` e sugere confirmar no
   checkout com o código postal 9700-000.
   Nunca inventes valores.

4. **Depois do "sim"**, grava em `data/lojas.json` (lista; `id` slug único, `verificado_em` = hoje,
   `fonte_url` = página das condições, `ativa: true`) e corre `npm run validar`.

5. Confirma numa linha que a loja já aparece no separador **Lojas** da app.
