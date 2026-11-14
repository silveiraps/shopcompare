# ShopCompare — instruções para o Claude

App local para comparar **preço + portes até à ilha Terceira (Açores)** num conjunto de lojas online
de confiança. O utilizador mora na Terceira (códigos postais 9700–9760, ex.: 9700-000 Angra do Heroísmo).
Fala sempre em **português de Portugal**.

## Como funciona
- `data/lojas.json`: lojas guardadas e as regras de portes para a Terceira. É a "memória" do projeto.
  O utilizador edita-as na app (separador **Lojas**). Tu só as alteras com `/adicionar-loja` ou quando
  o utilizador pedir, e **sempre com confirmação antes de gravar**.
- `data/pesquisas/*.json`: uma pesquisa de produto por ficheiro. Escritas por ti (`/procurar`).
  A app (`npm start` → http://localhost:3000) mostra-as e calcula o total com `public/portes.js`.
- Os portes **não** se verificam em cada pesquisa: usam-se as regras guardadas. Só registas
  `portes_observados` se a página do produto mostrar explicitamente os portes para a Terceira/Açores.
- Depois de escrever qualquer ficheiro em `data/`, corre `npm run validar` e corrige erros.

## Esquema de uma loja (`data/lojas.json`, lista)
```json
{
  "id": "pcdiga",                       // slug único, minúsculas
  "nome": "PCDiga",
  "url": "https://www.pcdiga.com",
  "pais": "PT",
  "categorias": ["informática", "eletrónica"],
  "pesquisa_url": "https://www.pcdiga.com/search?q={q}",   // {q} = termo pesquisado
  "envia_terceira": "sim | depende | por_verificar | nao",
  "portes": {
    "custo_base": 4.99,                 // € para a Terceira; null se desconhecido
    "gratis_a_partir_de": 50,           // € ; null se não há
    "escaloes_peso": [{ "ate_kg": 2, "custo": 5.9 }]       // opcional
  },
  "transportadora": "CTT",
  "prazo_dias": "3-5",
  "devolucoes": "texto livre",
  "avaliacao": "boa | media | evitar | null",              // opinião do utilizador; não alterar sem pedido
  "notas": "texto livre",
  "verificado_em": "2026-11-14",        // data em que as condições foram confirmadas; null se nunca
  "fonte_url": "https://...",           // página onde estão as condições
  "ativa": true                         // false = ignorar nas pesquisas
}
```

## Esquema de uma pesquisa (`data/pesquisas/AAAAMMDD-HHMM-slug.json`)
```json
{
  "consulta": "Sony WH-1000XM5 preto",
  "criada_em": "2026-11-14T15:30:00Z",
  "notas": "Avisos gerais (opcional)",
  "resultados": [{
    "loja_id": "worten",
    "titulo": "Auscultadores Sony WH-1000XM5 Preto",
    "url": "https://... (página do produto, não da pesquisa)",
    "preco": 299.99,                    // € com IVA, preço atual (com promoção se houver)
    "disponivel": true,                 // false = esgotado; null = não sei
    "confianca": "exato | provavel | semelhante",
    "peso_kg": null,                    // só se for útil para escalões
    "portes_observados": null,          // € se a página mostrar portes p/ Açores
    "nota": "ex.: vendido por terceiro (marketplace)"
  }],
  "nao_encontrado": [{ "loja_id": "pcdiga", "motivo": "não vende este artigo" }]
}
```
