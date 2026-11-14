# ShopCompare: preço + portes até à Terceira

App local para descobrir onde comprar mais barato **com os portes para a Terceira (Açores) incluídos**.

- Guardas as lojas que conheces e as condições de envio delas (uma vez só, e corriges quando mudarem).
- Pedes ao **Claude Code** para procurar um produto: ele vai a todas essas lojas e a app mostra
  uma tabela ordenada pelo **total entregue na Terceira**.

## Arrancar (uma vez por sessão)

Precisas de [Node.js](https://nodejs.org) 18 ou mais recente e do [Claude Code](https://claude.com/claude-code).

```bash
git clone https://github.com/silveiraps/shopcompare.git
cd shopcompare
npm start
```

Abre **http://localhost:3000**. Não há nada para instalar além disto (zero dependências).

## Usar

Num segundo terminal, na pasta `shopcompare`, abre o Claude Code com `claude` e escreve:

| Comando | O que faz |
|---|---|
| `/procurar Sony WH-1000XM5` | Procura o artigo em todas as lojas ativas e grava o resultado. A app atualiza sozinha. |
| `/adicionar-loja https://www.loja.pt` | Lê as condições de envio da loja, mostra-te uma proposta e, se aceitares, guarda-a. |
| `/adicionar-loja por-verificar` | Revê as lojas com portes ainda por confirmar. |

Na app também podes:
- **Pesquisas**: escrever o produto e carregar em *Copiar comando* (copia o `/procurar ...` para colares no Claude Code). Vês o histórico de pesquisas.
- **Lojas**: adicionar e editar lojas à mão (custo dos portes, grátis a partir de X €, escalões por peso, prazo, avaliação, notas).

## Onde ficam os dados
- `data/lojas.json`: as tuas lojas e regras de portes.
- `data/pesquisas/`: uma pesquisa por ficheiro.

São ficheiros de texto simples. Faz `git commit` de vez em quando para não perderes nada.
