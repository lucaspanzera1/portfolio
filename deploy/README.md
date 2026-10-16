# Deploy — lucaspanzera.com

Deploy automático do monorepo `lucaspanzera1/ong` (web React/Vite + api NestJS) no LXC `lucaspanzera`, usando o bastion via Cloudflare Access.

## Fluxo

```
push na main (ou "Run workflow" manual)
  └─ GitHub Actions (.github/workflows/deploy.yml)
       └─ cloudflared access ssh  ── service token gh-actions-peluga-bastion
            └─ bastion.peluga.com.br  (LXC 114, user jump, só direct-tcpip)
                 └─ permitopen 10.0.0.32:22
                      └─ deploy@10.0.0.32  (forced command)
                           └─ sudo /usr/local/bin/deploy.sh  (como root)
                                ├─ git reset --hard origin/main   em /root/ong
                                ├─ pnpm install --frozen-lockfile
                                ├─ pnpm build:prod
                                │    ├─ web: vite build → /var/www/lucaspanzera (nginx :4173)
                                │    └─ api: nest build
                                └─ systemctl restart ong-api.service + health check
```

A chave do Actions **não abre shell em lugar nenhum**: no bastion ela só encaminha TCP pros destinos liberados, e no LXC ela só consegue executar o `deploy.sh`.

## Componentes

| Item | Onde | Detalhe |
|---|---|---|
| Bastion | LXC 114, `10.0.0.101`, proxmox-2 | Usuário `jump` (`nologin`), exposto via Cloudflare Tunnel em `bastion.peluga.com.br` |
| App | LXC `lucaspanzera`, `10.0.0.32` | Repo em `/root/ong`, node via NVM do root, nginx :4173, `ong-api.service` |
| Script de deploy | `/usr/local/bin/deploy.sh` no LXC | Cópia versionada em [`deploy.sh`](deploy.sh) |
| Workflow | [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | Roda em push na `main` e via `workflow_dispatch` |

## Chaves

| Chave | Fingerprint | Pública autorizada em | Privada em |
|---|---|---|---|
| Jump (compartilhada entre apps) | `SHA256:tYwkFOVqy1Dvh0OOcOkKZA4M1bdDNhjufCcp3h+nBn0` | `/home/jump/.ssh/authorized_keys` no bastion | `/root/.ssh/peluga_jump` no Proxmox `10.0.0.198` + secret `PELUGA_JUMP_SSH_KEY` |
| Deploy da app | `SHA256:EDdq0EMeY16Us01Rni7dOsEJvSkhjq+MppF0HqZNcJc` | `/home/deploy/.ssh/authorized_keys` no LXC `10.0.0.32` | `~/.ssh/peluga_lucaspanzera_deploy` no Mac + secret `APP_SSH_KEY` |

⚠️ A `~/.ssh/peluga_jump` do Mac (`SHA256:NpLW...`) **não é** a chave do bastion. É outra chave com o mesmo nome e não serve pra esse fluxo.

## Secrets do repositório

O repo é da conta pessoal `lucaspanzera1`, **não** da org `pelugalabs`, então os secrets da org não chegam aqui. Tudo foi cadastrado no próprio repo (Settings → Secrets and variables → Actions):

| Nome | Tipo | Valor |
|---|---|---|
| `PELUGA_JUMP_SSH_KEY` | Secret | Privada da chave jump (`tYwk`) |
| `CF_ACCESS_CLIENT_ID` | Secret | Client ID do service token `gh-actions-peluga-bastion` |
| `CF_ACCESS_CLIENT_SECRET` | Secret | Client Secret do mesmo token |
| `APP_SSH_KEY` | Secret | Privada da chave de deploy (`EDdq`) |
| `APP_IP` | Variable | `10.0.0.32` |

## Configuração do bastion

`/home/jump/.ssh/authorized_keys` tem **uma única linha**, com um `permitopen` por app:

```
permitopen="10.0.0.42:22",permitopen="10.0.0.32:22",no-pty,no-X11-forwarding,no-agent-forwarding,no-user-rc ssh-ed25519 AAAA... jump@bastion
```

⚠️ **Não dá pra usar uma linha por app com a mesma chave.** O sshd usa só a primeira linha em que a chave bate e ignora as opções das outras. Na prática, só o primeiro destino fica liberado, e os outros dão `administratively prohibited: open failed`.

Pra adicionar uma app nova, acrescenta mais um `permitopen="IP:22",` nessa mesma linha.

## Configuração do LXC lucaspanzera

Feito uma vez, a partir do host Proxmox (`$VMID` = VMID do LXC lucaspanzera, ver `pct list`):

```bash
# script (root:root 755)
pct push $VMID /root/deploy.sh /usr/local/bin/deploy.sh --perms 755 --user 0 --group 0

# usuário deploy
pct exec $VMID -- bash -c '
command -v sudo >/dev/null || apt-get install -y sudo
id deploy >/dev/null 2>&1 || useradd -m -s /bin/bash deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
'
```

`/home/deploy/.ssh/authorized_keys` (600, dono `deploy`). O forced command faz a chave só conseguir disparar o deploy:
```
command="sudo /usr/local/bin/deploy.sh",no-pty,no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... deploy@lucaspanzera
```

`/etc/sudoers.d/deploy` (440):
```
deploy ALL=(root) NOPASSWD: /usr/local/bin/deploy.sh
```

O remote do repo usa HTTPS (o repo é público, então não precisa de chave pro fetch):
```bash
git -C /root/ong remote set-url origin https://github.com/lucaspanzera1/ong.git
```

## O que o `deploy.sh` faz

1. Pega um lock em `/var/lock/deploy-ong.lock`. Um segundo deploy simultâneo falha na hora em vez de rodar junto.
2. Carrega o NVM do root (`/root/.nvm`).
3. `git fetch` + `git reset --hard origin/main` em `/root/ong`. **Mudanças locais no servidor são descartadas.** Os `.env` estão no `.gitignore` e não são tocados.
4. `pnpm install --frozen-lockfile`.
5. `pnpm build:prod` com `--max-old-space-size=512`:
   - web: `tsc -b && vite build --mode prod`, depois substitui `/var/www/lucaspanzera` e faz `chown www-data`.
   - api: `nest build`.
6. `systemctl restart ong-api.service`. Espera 3s e falha (mostrando as últimas 50 linhas do journal) se o serviço não estiver `active`.
7. Imprime `deploy ok: <hash>`.

### Atualizando o próprio script

O `git reset` atualiza `/root/ong/deploy/deploy.sh`, mas **não** a cópia em `/usr/local/bin`, que é a que roda. Depois de mudar o script no repo e fazer o deploy, instala a versão nova no LXC:
```bash
install -o root -g root -m 755 /root/ong/deploy/deploy.sh /usr/local/bin/deploy.sh
```

## Disparando o deploy

**Automático:** qualquer push na `main`. Pushes seguidos entram numa fila (`concurrency: deploy-lucaspanzera`) e não rodam em paralelo.

**Manual pelo GitHub:** Actions → Deploy → Run workflow, ou:
```bash
gh workflow run Deploy
```

**Manual pelo Mac** (mesmo caminho do Actions, com login do Access pelo navegador):
```bash
# carrega a chave jump só no agent, sem gravar arquivo
ssh root@10.0.0.198 cat /root/.ssh/peluga_jump | ssh-add -t 1h -

cat > /tmp/peluga_ssh_config <<'EOF'
Host bastion
  HostName bastion.peluga.com.br
  User jump
  ProxyCommand cloudflared access ssh --hostname %h
EOF

ssh -F /tmp/peluga_ssh_config -o StrictHostKeyChecking=no -J bastion \
  -i ~/.ssh/peluga_lucaspanzera_deploy deploy@10.0.0.32
```

`PTY allocation request failed on channel 0` no começo é esperado (`no-pty`) e não é erro.

## Troubleshooting

| Sintoma | Causa |
|---|---|
| `dial tcp 10.0.0.32:443: connection refused` | `ProxyCommand` aninhado: o ssh de fora expande o `%h` do de dentro pro IP da app. Usar `Host bastion` num config + `-J bastion`. |
| `jump@bastion.peluga.com.br's password:` | O Access passou, mas o bastion recusou a chave. A chave usada não é a `tYwk`, ou a linha do `authorized_keys` está sem chave. Conferir com `pct exec 114 -- ssh-keygen -lf /home/jump/.ssh/authorized_keys`. |
| `administratively prohibited: open failed` | O destino não está no `permitopen` da **primeira** linha que bate com a chave (ver "Configuração do bastion"). |
| Secret gravado vazio | `ssh ... \| gh secret set` grava vazio se o ssh falhar. Carregar em variável e checar `[ -n "$KEY" ]` antes. |
| `Permissions 0660 for '/dev/stdin' are too open` | `ssh-keygen -lf` não lê chave privada pelo stdin. Para conferir o fingerprint, usar `ssh-add -` + `ssh-add -l`. |
| Logs do bastion | `pct exec 114 -- journalctl -u ssh -n 30 --no-pager` |
| Logs da API | `journalctl -u ong-api.service -n 100 --no-pager` no LXC |

## Pendências

- **RAM do LXC:** o build (`tsc` + `vite` + `nest`) roda no próprio LXC. Se a RAM for reduzida, o build pode morrer por falta de memória. A saída seria compilar no runner do Actions e mandar só os `dist` por rsync.
- **`cloudflared` sem versão fixa:** o workflow baixa `releases/latest`. Uma mudança de comportamento (como a das flags de service token) pode quebrar o deploy sem nenhuma mudança no repo.
- **`StrictHostKeyChecking no`** no bastion e na app. Dá pra trocar por `known_hosts` fixos no workflow.
- **pnpm:** aviso `Ignored build scripts: unrs-resolver`. Não afeta o build hoje.
- **Senha SMTP no `.env`** da API (pendência anterior, continua aberta).
