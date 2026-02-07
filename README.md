# TrackHub MVP

Plataforma colaborativa para produtores musicais com foco em organização de projetos, colaboração e analytics.

## Estrutura

- `apps/api`: API Node.js + Express + Prisma (MySQL)
- `apps/web`: Front-end React + Vite + TailwindCSS

## Requisitos

- Node.js 18+
- MySQL 8+

## Variáveis de ambiente

Copie e ajuste:

- `apps/api/.env.example` → `apps/api/.env`

## Scripts

Os scripts são executados a partir da raiz do repositório.

- `npm run dev`: inicia API e front-end em paralelo
- `npm run build`: build da API e do front-end
- `npm run test`: roda testes rápidos

## Banco de dados (Prisma)

Após configurar o `.env`, rode as migrações na API:

- `npx prisma migrate dev`

## Observações

Uploads são salvos localmente em `apps/api/uploads`. A estrutura está preparada para futura integração com S3.
