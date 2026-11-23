# Desafio: webhooks de pagamento

**Nível:** pleno · **Área:** web · **Tempo estimado:** 2 a 3 horas

## Contexto

Você trabalha no backend de uma loja online. Os pagamentos são processados pelo
gateway **PagFácil**, que avisa a loja sobre o que aconteceu com cada pagamento
enviando webhooks HTTP.

Quando um pagamento é confirmado, a loja precisa liberar o pedido para o serviço
de **Expedição**, que separa e envia a mercadoria.

Hoje o endpoint que recebe esses webhooks responde `501`. Sua tarefa é implementá-lo.

## Trecho da documentação do PagFácil

> **Entrega.** Enviamos `POST` para a URL cadastrada, com `Content-Type: application/json`.
> A entrega é *at-least-once*: o mesmo evento pode chegar mais de uma vez,
> inclusive em paralelo. Não garantimos a ordem de entrega entre eventos diferentes.
>
> **Retentativas.** Qualquer resposta fora da faixa `2xx`, ou sem resposta em 5 segundos,
> é tratada como falha e o evento é reenviado depois, com o mesmo `event_id`.
>
> **Assinatura.** Cada requisição traz o header
> `X-PagFacil-Signature: sha256=<hex>`, que é o HMAC-SHA256 do corpo da requisição,
> exatamente como foi enviado, usando o segredo compartilhado da sua conta.
>
> **Payload.**
>
> ```json
> {
>   "event_id": "evt_8f2a1c",
>   "type": "payment.paid",
>   "order_id": "ord_1",
>   "amount_cents": 15990,
>   "occurred_at": "2026-11-10T12:00:00Z"
> }
> ```
>
> | `type`             | Significado                                                        |
> | ------------------ | ------------------------------------------------------------------ |
> | `payment.paid`     | Pagamento aprovado.                                                |
> | `payment.failed`   | Uma tentativa de pagamento falhou. O cliente pode tentar de novo.  |
> | `payment.refunded` | Pagamento estornado (sempre o valor total).                        |
>
> Um pedido com tentativa falha pode ter uma nova tentativa aprovada depois.
> Um pagamento aprovado só pode mudar para estornado.

## O que já existe

```
src/
  app.js          # buildApp(): GET /orders/:id pronto; POST /webhooks/payments a implementar
  store.js        # "banco" em memória, assíncrono (trate como um banco de verdade)
  fulfillment.js  # cliente fake da Expedição
  server.js       # sobe a aplicação com alguns pedidos de exemplo
scripts/
  send-webhook.js # envia um webhook assinado para o servidor local
test/
  webhooks.test.js
```

Sobre a **Expedição**: ela **não é idempotente**. Cada chamada bem-sucedida a
`release(orderId)` gera um despacho físico, e às vezes ela fica indisponível e lança erro.

Os pedidos têm `id`, `totalCents` e `status`. Todo pedido começa em `pending`.

## Requisitos

Implemente `POST /webhooks/payments` de forma que:

1. Só eventos com assinatura válida sejam aceitos. Assinatura ausente ou inválida → `401`, sem efeito nenhum.
2. Eventos com assinatura válida, mas malformados ou de tipo desconhecido → `400`.
3. O status do pedido reflita o pagamento: `paid`, `failed` ou `refunded`.
4. O status nunca regrida por causa de um evento que chegou atrasado.
5. Cada pedido seja liberado para a Expedição **exatamente uma vez** quando o pagamento for confirmado,
   mesmo com reentregas, entregas simultâneas e falhas temporárias da Expedição.
6. Um `payment.paid` com `amount_cents` diferente de `totalCents` não confirme o pedido nem
   o libere: o pedido vai para `payment_review`, para análise manual.
7. A resposta ao PagFácil seja coerente com o mecanismo de retentativa dele: o gateway deve
   reenviar quando reenviar pode resolver, e parar quando não pode.

Restrições:

- Não há fila nem worker nesta versão: o único mecanismo de retentativa é o do próprio gateway.
- Você pode alterar qualquer arquivo de `src/`, inclusive o `store.js`, desde que o trate como um banco de dados.
- Pode adicionar dependências se achar que valem a pena, e explique por quê.

Fica a seu critério (decida e justifique): o que responder para um `order_id` que a loja não conhece,
e qualquer caso não descrito acima que você considere relevante.

## Como rodar

Requer Node.js 20 ou mais recente.

```bash
npm install
npm test          # testes automatizados (começam todos falhando)
npm start         # sobe em http://localhost:3000 (segredo: dev-secret)

# em outro terminal
npm run webhook -- payment.paid ord_1 15990
npm run webhook -- payment.paid ord_1 15990 evt_fixo   # reenvia sempre o mesmo evento
curl localhost:3000/orders/ord_1
```

Os testes em `test/webhooks.test.js` descrevem comportamentos esperados. Você pode e deve
acrescentar os seus, mas não altere os existentes para fazê-los passar.

## O que entregar

1. O código, com os testes passando.
2. Um arquivo `DECISOES.md` curto (meia página basta) respondendo:
   - Quais decisões você tomou nos pontos deixados em aberto, e por quê.
   - Em que momento o processamento de um evento pode ser interrompido (queda do processo, por exemplo)
     e o que acontece em cada caso. Existe alguma situação em que o pedido seria despachado duas vezes
     ou nenhuma vez?
   - O que mudaria se o `store` fosse um PostgreSQL e a aplicação rodasse em mais de uma instância.

Não precisa de banco real, Docker, autenticação de usuários nem interface gráfica.
Prefira uma solução correta e simples a uma solução extensa.
