# Finances PRO

App de gestão financeira pessoal (PWA) em React + Firebase: lançamentos, contas fixas e parceladas, cartões de crédito, orçamentos por categoria, projeções de fluxo de caixa e score de saúde financeira.

## Stack

React 19 · Vite · Tailwind CSS 4 · Firebase (Auth + Firestore) · TypeScript

## Rodando localmente

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev      # http://localhost:3000
```

Configure o Firebase em `src/lib/firebase.ts`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run lint` | Checagem de tipos (`tsc --noEmit`) |
| `npm test` | Testes dos serviços financeiros |

## Regras do Firestore

As regras estão em `firestore.rules`: cada usuário acessa apenas `users/{uid}/...`, e lançamentos e orçamentos têm validação de tipo e tamanho. Publique com `firebase deploy --only firestore:rules`.

## Funcionalidades

- **Lançamentos:** diários, fixos e parcelados, com etiquetas e comprovante (foto reduzida e salva junto ao lançamento).
- **Importar/exportar:** extratos OFX e CSV (com detecção de duplicados) e exportação CSV/PDF.
- **Filtros avançados:** texto, valor, período, categoria, cartão, conta, etiquetas e situação, com filtros salvos no aparelho.
- **Contas e metas:** saldo por conta, transferências, conciliação com o extrato do banco e metas de economia.
- **Cartões:** faturas por ciclo de fechamento e vencimento, e limite comprometido.
- **Orçamentos:** teto padrão ou específico de um mês, com acúmulo opcional da sobra.
- **Relatórios:** comparativo entre meses, evolução de 12 meses e relatório anual.
- **Lembretes:** avisos de vencimento dentro do app e notificações do navegador (sem envio com o app fechado).
- **Compartilhado:** grupos para dividir despesas, saldos entre membros e acertos.

As regras novas do Firestore (contas, metas, transferências, anexos e grupos) precisam ser publicadas para essas telas gravarem dados.
