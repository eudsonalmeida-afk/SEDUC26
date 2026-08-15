# SEDUC 2026 — PWA com sincronização

Este pacote é um **Progressive Web App (PWA)**: depois de publicado em HTTPS, pode ser instalado no celular/computador e aberto em janela própria, sem as abas comuns do navegador. Ele continua offline-first e pode sincronizar o progresso entre dispositivos via Supabase.

## 1. Publicar no GitHub Pages
1. Crie um repositório e envie **todos os arquivos e a pasta `icons/`** para a raiz.
2. GitHub → **Settings → Pages**.
3. Escolha **Deploy from a branch**, `main`, `/root`.
4. Abra o endereço HTTPS gerado.

> O PWA não instala quando você abre `index.html` diretamente por `file://`. Para testar localmente, use um servidor local; para uso real, GitHub Pages resolve isso.

## 2. Preparar a nuvem (Supabase)
1. Crie um projeto Supabase (ou use um projeto seu existente).
2. No **SQL Editor**, execute o arquivo `supabase-setup.sql`.
3. No Supabase, copie **Project URL** e a **Publishable key** (ou a antiga `anon` key). Nunca use `service_role`/secret key no front-end.
4. Abra `cloud-config.js` e preencha:

```js
window.SEDUC_CLOUD_CONFIG = {
  supabaseUrl: "https://SEU-PROJETO.supabase.co",
  supabaseAnonKey: "SUA_CHAVE_PUBLICA"
};
```

5. Faça commit/push dessa alteração. Como a chave é pública de cliente, a proteção dos dados vem das políticas **Row Level Security (RLS)** configuradas pelo SQL.

## 3. Entrar e sincronizar
1. No app, toque no ícone **☁**.
2. Crie uma conta com e-mail e senha ou entre em uma já criada.
3. O app compara a versão local e a nuvem e mantém a mais recente.
4. Cada alteração é salva localmente imediatamente e enviada à nuvem em seguida. Se estiver offline, fica pendente e sincroniza quando a internet voltar.

A estratégia é **“última alteração vence”**. Evite editar dois aparelhos offline ao mesmo tempo.

## 4. Instalar como app
### Android / Chrome / Edge
Use o botão **▣** do topo ou a opção “Instalar app / Adicionar à tela inicial” do navegador.

### iPhone / iPad
Abra no **Safari** → Compartilhar → **Adicionar à Tela de Início** → abra pelo ícone criado.

## Arquivos principais
- `index.html` — interface e cronograma completo
- `manifest.webmanifest` — identidade do PWA
- `service-worker.js` — cache/offline
- `cloud-sync.js` — login e sincronização
- `cloud-config.js` — URL/chave pública do Supabase
- `supabase-setup.sql` — tabela + RLS
- `icons/` — ícones do app

## Backup extra
Os botões ⇩/⇧ continuam exportando/importando JSON, mesmo com a nuvem ativada.

## Meta semanal adaptativa

O app mantém apenas metas **semanais** de questões. O motor adaptativo usa a meta-base do plano, o percentual cumprido na semana anterior e a precisão registrada para ajustar o sarrafo.

- ajuste instantâneo limitado a ±10% por fechamento semanal;
- tendência suavizada (70% semana atual + 30% ajuste anterior);
- aumento bloqueado se a precisão cair mais de 3 pontos percentuais em relação à tendência recente;
- sem precisão registrada, aumentos ficam limitados a 5%;
- fator acumulado protegido entre -25% e +35% da trajetória-base;
- Semana 0 (diagnóstico) e Semana 13 (taper) ficam protegidas;
- a meta pode ser congelada manualmente no Dashboard;
- o motor é salvo no mesmo estado sincronizado pelo Supabase.

## Atualização v5 — rotina real, feriados e rebalanceamento

- 07/09: 6h líquidas, priorizando PNE 2001, Lei 9.784 e Dados; Bio em manutenção.
- 08–12/09: InterAntares modelado como disponibilidade reduzida; 08 e 12 sem estudo formal e sessões leves nos demais dias.
- Semana 07–13/09: meta operacional de 140Q e proteção contra redução automática da meta futura.
- 12/10: 5h apenas no fim da tarde/noite por aniversário da mãe.
- 13/10 e 02/11: cerca de 6h líquidas com intervalos e prioridade para P1.
- Semanas com feriado têm ajuste positivo/negativo amortecido no motor adaptativo, evitando interpretar disponibilidade extra como rotina.
- Conteúdos de Biologia mais familiares foram convertidos em modo MANUTENÇÃO (retrieval + questões → teoria só se houver falha).
- Tempo economizado em Bio foi redistribuído para Educação, Administração/Legislação e Dados.
- Simulados continuam preservando a proporção oficial 50 Bio / 30 P1, funcionando como freio contra ilusão de competência em Biologia.

## Atualização v6 — sexta realista

- Quinta → sexta passa a ser a logística-padrão: dormir no namorado e treinar cedo na sexta.
- Sexta normal: chegada em casa pouco após 13:30, estudo formal 14:00–15:30, cabelo 16–17h e ensaio 19–21h.
- As antigas sessões de 2h de sexta foram reduzidas para 1h30.
- Os 30 min retirados da sexta reaparecem no domingo como segundo contato espaçado (retrieval + questões + feedback), em vez de simplesmente prolongar a mesma sessão.
- Semana do InterAntares mantém o desenho excepcional já configurado; semana final de taper permanece leve.
