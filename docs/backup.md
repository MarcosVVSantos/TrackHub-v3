# Backup do banco (Neon → R2)

Todo dia às 03:17 (horário de Brasília) o GitHub Actions roda `.github/workflows/backup.yml`:

1. Copia o banco de produção com `pg_dump`.
2. **Testa** a cópia restaurando num Postgres temporário (falha se vier vazia).
3. Criptografa com AES-256 usando a senha `BACKUP_PASSPHRASE`.
4. Envia para o bucket privado do R2, pasta `backups/`.
5. Apaga cópias com mais de 30 dias.

Se der erro, o GitHub te manda e-mail (falha de workflow agendado).

## Configuração (uma vez)

GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**:

| Segredo | Valor |
|---|---|
| `NEON_BACKUP_URL` | No Neon: **Connect** → desligue **Connection pooling** → copie a URL (o host **não** tem `-pooler`) |
| `BACKUP_PASSPHRASE` | Uma senha longa e aleatória. **Guarde num gerenciador de senhas**: sem ela não dá para abrir nenhum backup |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_ENDPOINT` | Os mesmos do Render |
| `R2_BACKUP_BUCKET` | O nome do bucket **privado** (o mesmo de `R2_PRIVATE_BUCKET` no Render) |

Para testar na hora: **Actions → Backup do banco → Run workflow**.

## Como restaurar

> Restaurar por cima do banco de produção apaga o que existe nele. Na dúvida, restaure primeiro
> num banco novo (no Neon dá para criar um *branch* do banco de graça) e confira.

1. Baixe o arquivo do R2 (painel da Cloudflare → R2 → bucket privado → `backups/`).
2. Descriptografe (pede a `BACKUP_PASSPHRASE`):
   ```bash
   gpg --output trackhub.dump --decrypt trackhub-AAAA-MM-DDTHHMMZ.dump.gpg
   ```
   No Windows, o `gpg` vem com o Git Bash ou com o Gpg4win.
3. Restaure (precisa do `pg_restore` 17+, que vem no instalador do PostgreSQL ou na imagem Docker `postgres:17`):
   ```bash
   pg_restore --no-owner --no-acl --clean --if-exists -d "URL_DO_BANCO_DESTINO" trackhub.dump
   ```
   `--clean --if-exists` apaga as tabelas do destino antes de recriar.
4. Rode `npx prisma migrate status` em `apps/api` apontando para o banco restaurado: deve dizer que está em dia.

## Arquivos (capas, áudios)

Este backup cobre **só o banco**. Os arquivos ficam no R2, que já guarda várias cópias internamente;
o risco ali é apagar por engano. Se quiser proteção contra isso, dá para ativar uma regra de
retenção no bucket ou copiar o bucket periodicamente.
