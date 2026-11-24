# [USO EXCLUSIVO DO AVALIADOR] Webhooks de pagamento — pleno / web

> Não envie este arquivo para a pessoa candidata. O enunciado dela é
> `desafios/pleno-web-webhooks-pagamento/README.md`.

## O que o desafio mede

**Competência central:** processar eventos externos não confiáveis (duplicados, fora de ordem,
concorrentes, com dependência instável) sem perder nem duplicar efeitos colaterais.

**Habilidades relacionadas:** segurança básica de integração (HMAC sobre o corpo cru),
modelagem de estados, semântica de códigos HTTP como contrato com outro sistema e testes de comportamento.

A distância entre "código de treino" e "código de produção" aparece aqui de forma concreta:
uma implementação que funciona no caminho feliz (`if (event.type === 'payment.paid') ...`)
passa em mais ou menos 10 dos 14 testes e despacharia caixas em duplicado em produção.

## As armadilhas e o teste que pega cada uma

Validado durante a criação: a solução de referência passa nos 14 testes, e cada variante
abaixo falha apenas no(s) teste(s) indicado(s), de forma determinística (15/15 execuções).

| Armadilha | Solução ingênua | Teste que falha |
| --- | --- | --- |
| HMAC calculado sobre `JSON.stringify(request.body)` em vez dos bytes recebidos | Funciona nos testes com corpo compacto e quebra com qualquer outra formatação ou ordem de chaves | `valida a assinatura sobre os bytes exatamente como foram enviados` |
| Check-then-act com `await` no meio (`if (!processed.has(id)) { await ...; processed.add(id) }`) | Duas entregas simultâneas passam pelo `if` antes de qualquer uma marcar | `entregas simultâneas ... despacham uma única vez` |
| Atribuir o status do evento direto ao pedido | `failed` atrasado derruba `paid`; `paid` atrasado reabre um `refunded` e despacha | `falha de uma tentativa antiga ...`, `pagamento que chega depois do estorno ...` |
| Gravar `paid` (ou marcar o evento como processado) **antes** de chamar a Expedição | A Expedição falha, a resposta é 5xx, e na retentativa o pedido "já está pago", então nunca é despachado | `se a Expedição falhar, a retentativa ...` |
| Responder 4xx/5xx para erro de negócio permanente | O gateway reenvia para sempre um evento que nunca vai dar certo | `valor divergente ...`, `pagamento que chega depois do estorno ...` (exigem 2xx) |

Observação: a armadilha da Expedição costuma aparecer **depois** que a pessoa corrige a de
ordenação. Ao adicionar "não regredir status", a versão que grava antes de despachar
passa a ignorar a retentativa. É um bom momento para ver como ela depura.

## Uma solução de referência (descrição, não código)

- Parser `application/json` customizado (`addContentTypeParser` com `parseAs: 'buffer'`)
  guardando o corpo cru; HMAC sobre ele; comparação com `crypto.timingSafeEqual`
  (verificando o tamanho antes).
- Validação mínima do payload após a assinatura.
- Serialização do processamento **por `order_id`** (mutex em memória, encadeando promises).
  Por evento também resolve as duplicatas, mas não protege dois eventos diferentes do mesmo pedido.
- Precedência de estados: `pending < failed < paid ≈ payment_review < refunded`.
  Só aplica a transição se o novo estado for "mais avançado" que o atual; caso contrário, 2xx sem efeito.
- Ordem: Expedição → gravar `paid` → marcar evento como processado. Se a Expedição falhar,
  nada é persistido e a resposta é 503, para o gateway reenviar.
- `order_id` desconhecido: qualquer escolha justificada vale (ver abaixo).

Uma solução de ~60 linhas no `app.js` resolve tudo. Bem mais que isso não é demérito por si
só, mas vale perguntar o que o volume extra compra.

## Rubric

Pontue de 1 a 4 cada dimensão. Nível pleno esperado: maioria em 3.

| Dimensão | 1 — insuficiente | 2 — parcial | 3 — esperado (pleno) | 4 — acima |
| --- | --- | --- | --- | --- |
| **Correção** | < 10 testes passando | Passa a maioria, mas quebrou ou contornou testes | 14/14 sem alterar os testes existentes | 14/14 + testes próprios para casos que identificou |
| **Idempotência e concorrência** | Não trata duplicatas | Trata duplicata sequencial e passa no teste paralelo por acaso | Explica *por que* há corrida em Node single-thread (o `await`) e serializa o ponto crítico | Discute o escopo do lock (evento × pedido) e como isso vira constraint/transação no banco |
| **Modelagem de estados** | Copia o tipo do evento para o status | `if`s espalhados que cobrem os testes | Regra explícita e central de transições/precedência | Discute `occurred_at` (e por que relógio do remetente não é confiável para ordenar) e o que fazer com `payment_review` depois |
| **Contrato HTTP** | Códigos arbitrários | Acerta 401/400, mas não pensa na retentativa | Separa erro transitório (5xx) de permanente/obsoleto (2xx) e justifica | Lembra do timeout de 5 s e da Expedição lenta, e propõe responder rápido e despachar assíncrono |
| **Segurança** | Sem verificação ou comparando `JSON.stringify` | HMAC certo, comparação com `===` | Corpo cru + `timingSafeEqual` | Menciona replay (evento antigo reassinado/reenviado) e tolerância com `occurred_at` |
| **Comunicação (`DECISOES.md`)** | Ausente ou genérico | Descreve o que fez, não por quê | Justifica as decisões em aberto e identifica as janelas de falha | Mapeia cada janela de falha para "despacha 2×" ou "nunca despacha" e escolhe conscientemente qual risco aceitar |

**Sinais de alerta**, independentemente da nota:

- Alterou os testes existentes para passar.
- Afrouxou a verificação de assinatura "porque o teste formatado quebrava".
- Afirma que "Node é single-thread, então não tem race condition".
- Adicionou camadas (controllers/services/repositories/DTOs) sem resolver as armadilhas.
- `catch` que engole o erro da Expedição e responde 200.

**Sinais de uma boa solução:**

- A pessoa encontrou a corrida pelo teste e explicou a causa, em vez de adicionar `sleep` ou retries.
- O `DECISOES.md` admite a janela que sobra: "se o processo cair entre `release()` e gravar `paid`,
  a retentativa despacha de novo; para fechar isso de verdade seria preciso uma chave de idempotência
  na Expedição ou um outbox".
- Testes próprios para: `order_id` desconhecido, evento de outro pedido em paralelo e corpo que não é JSON.

## Pontos em aberto: respostas aceitáveis

**`order_id` desconhecido**

- `404`/`422` + log/alerta: aceitável se a pessoa entende que o gateway vai reenviar (4xx não é 2xx)
  e que isso pode ser desejável (o pedido pode estar sendo criado em outra instância) ou ruído.
- `2xx` + registrar para investigação: aceitável; evita retentativas infinitas.
- Não aceitável: `500` por `TypeError` (acessar `order.totalCents` de `null`).

**Falha da Expedição depois de gravar o estado**: aceitar a abordagem de gravar `paid` com uma marca
`dispatchedAt: null` e despachar na retentativa quando essa marca estiver vazia. É até melhor que a
referência, desde que os testes passem.

## Perguntas de aprofundamento (15 a 20 min de conversa)

1. "Node é single-thread. Por que o teste de entregas simultâneas falhou na primeira versão?"
2. "Se o processo cair logo depois do `release()` retornar e antes de gravar o status, o que acontece?
   Como você eliminaria isso?" (chave de idempotência na Expedição, outbox transacional)
3. "Com PostgreSQL e 3 instâncias, o seu lock em memória ainda funciona? O que substitui ele?"
   (`UNIQUE` em `event_id` dentro da transação, `SELECT ... FOR UPDATE` no pedido, update condicional
   `WHERE status IN (...)`, advisory lock)
4. "A Expedição passou a levar 8 s. O que quebra?" (timeout de 5 s do gateway → reentrega enquanto a
   primeira ainda está em andamento; resposta rápida + fila)
5. "Por que não usar `occurred_at` para ordenar os eventos?"
6. "O set de eventos processados cresce para sempre. Isso importa? Como você limitaria?"
7. "Como você testaria a verificação de assinatura contra timing attack?" (Resposta honesta: não testa
   o tempo, garante pelo uso de `timingSafeEqual`. Vale ver se a pessoa sabe dizer isso.)

## Extensões opcionais (para quem terminar cedo ou como 2ª etapa)

- Responder em < 100 ms independentemente da Expedição: outbox + worker com retentativa e backoff.
- Proteção contra replay: rejeitar eventos com `occurred_at` fora de uma janela, sem quebrar retentativas legítimas.
- Estorno de pedido já despachado: notificar a Expedição (cancelamento/devolução).
- Endpoint de reprocessamento manual para pedidos em `payment_review`.
