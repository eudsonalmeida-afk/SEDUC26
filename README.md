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

## Atualização v7 — técnicas, segunda e Manaus

- Siglas de técnicas no cronograma agora são clicáveis e abrem nome, explicação e exemplos.
- Aba Técnicas passou a exibir listas rápidas de atividades-exemplo para cada técnica.
- Domingo → segunda virou logística-padrão nas semanas normais: dormir no namorado, treinar cedo na segunda e alongar em ~30 min o estudo da noite.
- 18/09 às 17h → 20/09 por volta de 12h: viagem a Manaus para arbitragem.
- Semana 14–20/09 passou a disponibilidade reduzida, com meta operacional de 150Q; sexta/sábado sem estudo formal.
- Simulado de 19/09 foi remanejado para domingo 20/09, junto com PNE 2014 condensado e Bio em manutenção.
- A viagem não penaliza o motor adaptativo.

## Atualização v8 — Administração Pública detalhada

O cronograma de Administração foi revisado contra o edital e distribuído em 13 pontos:
1. conceitos e princípios; 2. reformas administrativas; 3. modelos; 4. Constituição/servidores;
5. Lei 9.784/1999; 6. organização (órgãos, fundos, entidades, Direta/Indireta);
7. controle administrativo e legislativo; 8. seis poderes administrativos;
9. PNE 2026–2036; 10. Modelo de Gestão do Ceará; 11. Guia de Modelagem 2ª ed./jul. 2021;
12. Código de Ética e Conduta; 13. Estatuto dos Servidores do Ceará.

As sessões agora informam os subtemas concretos a estudar e critérios de saída, em vez de rótulos genéricos.

## Atualização v9 — PNE atual em comparação histórica

O bloco do PNE 2026–2036 foi detalhado para exigir comparação explícita com os PNEs 2001 e 2014.
A sequência agora é: compreender o PNE atual por si só → preencher tabela 2001 × 2014 × 2026 →
identificar continuidades, mudanças de prioridade, reformulações, ampliações/reduções e similaridades →
recuperar 3 continuidades + 3 mudanças sem consulta nas revisões posteriores.

## Atualização v10 — auditoria de Educação Brasileira

- Mantida a distribuição original de semanas e carga horária.
- Detalhamento interno das sessões foi auditado contra o edital.
- Foram explicitados: organização didática; sala de aula como espaço de aprendizagem; fundamento epistemológico do fazer docente; planejamento de curso/unidade/aula; bases empíricas/metodológicas/epistemológicas das teorias; psicologia do desenvolvimento biopsicossocial; cinco temas contemporâneos; BNCC; formação/pesquisa/ética docente; marcos legais de Educação Integral; DCRC e equidade.
- Adicionado mapa recolhível de cobertura de Educação no cronograma.

## Atualização v11 — blocos realocados incorporados

Os antigos cartões separados de “Bloco realocado de Bio → ...” foram removidos.
O conteúdo, tempo, questões e técnicas desses reforços foram incorporados às sessões já existentes
das respectivas disciplinas/tópicos, reduzindo poluição visual. As sessões de cada semana também
foram ordenadas cronologicamente por data.

## Atualização V12 — questões extras, progresso semanal e calibração

- Motor de Meta Semanal redesenhado para corrigir layout comprimido.
- Barra grande de progresso semanal logo abaixo do motor.
- Questões extras entram na meta semanal e na precisão por área, sem criar sessões no cronograma.
- Nova aba "Questões extras" para metrô, caminhada, espera, casa etc.
- Registro: data, área, contexto, fonte, número de questões, acertos, confiança prevista e notas.
- Calibração compara confiança prevista antes das questões com precisão real.
- Exibe viés (superestimação/subestimação) e erro médio de calibração ponderado pelo número de questões.
- A calibração usa tanto sessões planejadas quanto baterias extras quando houver confiança registrada.

## Atualização V13 — Banco de Questões

- Nova aba "Banco de Questões".
- Cadastro manual e importação JSON em lote (NotebookLM, Gemini, ChatGPT, autoral).
- Filtros por área, status e dificuldade.
- Modo treino interno com alternativas, gabarito comentado e confiança prevista por questão.
- Cada tentativa do banco entra automaticamente:
  - na meta semanal de questões;
  - na precisão por área;
  - na calibração confiança prevista × precisão real.
- Fila adaptativa:
  - erro -> revisão no dia seguinte;
  - acerto com confiança <70% -> revisão em 3 dias;
  - acerto seguro -> revisão em 7 dias;
  - sucessivos acertos -> questão passa a consolidada e o intervalo cresce.
- Exportação do banco para JSON e download de modelo de importação.

## Atualização V14 — blocos de treino personalizados

- “Treinar revisões” não dispara mais todas as questões vencidas.
- Agora abre um montador de bloco.
- É possível escolher origem, quantidade exata, confiança prevista do bloco e ordem.
- A calibração do banco passa a ser feita por bloco: previsão antes de começar × acurácia real ao terminar.
- Cada questão respondida continua contando na meta semanal e na precisão por área.

## Atualização V15 — revisão automática do banco

- O usuário não escolhe mais origem nem ordem no bloco de revisão.
- Para revisar, escolhe somente:
  - número de questões;
  - confiança prevista do bloco.
- Seleção das questões é automática.
- Prioridade leva em conta:
  - data de vencimento;
  - tempo desde a última tentativa;
  - erro recente;
  - confiança anterior;
  - precisão recente;
  - sequência de acertos.
- Se houver menos questões vencidas que o tamanho solicitado, o bloco é completado com as próximas revisões mais próximas.
- Intervalos adaptativos:
  - erro: ~1 dia;
  - acerto com confiança muito baixa: ~2 dias;
  - confiança frágil/calibração ruim: ~3 dias;
  - acerto inicial: ~5 dias;
  - 2 acertos consecutivos: ~7 dias;
  - 3 acertos consecutivos: ~14 dias;
  - domínio estável: intervalos crescentes até 45 dias.

## Atualização V16 — navegação mobile
- Ícones/identidade ficam em cima.
- Abas ficam em uma linha horizontal logo abaixo.
- As abas rolam horizontalmente quando necessário.
- Sidebar deixa de roubar largura lateral.
- Conteúdo usa 100% da largura no celular.

## V17 — correção do index e header mobile
- Corrigido erro de sintaxe JavaScript que impedia o index de inicializar.
- No mobile, marca/título e ícones ficam na primeira linha.
- As abas ficam em uma segunda linha completa, abaixo dos ícones.
- Ícones foram compactados no celular para liberar largura.
- Abas têm rolagem horizontal independente.

## V18 — blocos por área/disciplina
- Montador permite composição exata por área.
- Preset P1 oficial: 30 questões = 8 Educação + 8 Administração + 8 Português + 6 Dados, Biologia = 0.
- Preset P2 Biologia: 50 questões de Biologia.
- Usuário pode montar qualquer distribuição manual.
- Dentro de cada área, o app continua escolhendo automaticamente as questões prioritárias pela fila adaptativa.
- O app bloqueia o início se o banco não tiver questões suficientes em alguma área solicitada.

## SEDUC2026 — Versão 19: Banco de Questões → Fragilidades

Mudanças:
- blocos do Banco de Questões agora são embaralhados entre as disciplinas;
- ao clicar em "Concluir bloco", se houver erros, abre uma etapa obrigatória de classificação;
- categorias: erro conceitual, confusão entre conceitos, ausência de conhecimento, interpretação, desatenção, cálculo/procedimento, memória/recuperação e chute;
- ao finalizar a análise, os tópicos errados entram automaticamente em Fragilidades;
- erros repetidos do mesmo tópico reforçam a fragilidade existente em vez de criar cartões duplicados;
- fragilidades vindas do Banco mostram origem e número de ocorrências;
- a tentativa da questão continua alimentando normalmente a fila adaptativa/revisão do Banco.

## SEDUC2026 — Versão 20: questões com imagens

- Questões do Banco agora podem ter gráfico/tabela/figura.
- Cadastro manual aceita arquivo de imagem ou URL/caminho relativo.
- Imagens locais são armazenadas em IndexedDB, separadas do localStorage, para não inflar o estado principal.
- As imagens aparecem no acervo, no quiz e na classificação de erros.
- Novo filtro: somente questões com imagem.
- Importação em pacote: selecionar ao mesmo tempo 1 JSON + todos os arquivos de imagem.
- O JSON usa `imageFile` para associar cada questão ao nome exato do arquivo.
- Também aceita `imageUrl` para imagens hospedadas junto ao site (ex.: `images/grafico_01.png`).
- Exportação portátil "banco + imagens" gera um JSON único com imagens incorporadas, útil para backup ou transferência entre aparelhos.

## SEDUC2026 — Versão 21: compatibilidade iPad / Safari

- detecção automática de iPad, inclusive Safari que se identifica como Mac;
- header deixa de ser sticky no iPad para evitar sobreposição/área de toque problemática;
- abas passam a quebrar em múltiplas linhas no iPad, sem depender de rolagem horizontal;
- alvos de toque ampliados para 44 px;
- inputs em 16 px para impedir zoom automático do Safari;
- navegação por abas ganhou fallback independente por event delegation;
- fallback para `<dialog>` em Safari antigo;
- banner de diagnóstico aparece se o script principal não completar o boot;
- service worker usa cache V21 e estratégia network-first/no-store para reduzir versão antiga presa no Safari/PWA;
- registro do service worker força `update()`.

## SEDUC2026 — Versão 22: imagens sincronizadas entre aparelhos

- Cada questão pode manter `imageData` sincronizada dentro do próprio state.
- `bankImageSrc()` prioriza `imageData`, permitindo que desktop/celular mostrem a mesma figura após o sync.
- Imagens locais antigas (IndexedDB) podem ser migradas pelo botão “Sincronizar imagens deste aparelho”.
- A V22 também tenta migrar silenciosamente imagens antigas ao abrir no aparelho que possui os arquivos locais.
- Arquivos grandes são reduzidos antes de entrar no state sincronizado; imagens pequenas são preservadas.
- Novas importações JSON + imagens já criam simultaneamente a cópia local/offline e a cópia sincronizável.
- O IndexedDB continua sendo usado como cache local, mas deixa de ser a única fonte da imagem.
- Para recuperar imagens anexadas em versões anteriores, é necessário abrir a V22 no mesmo aparelho em que elas foram originalmente importadas, enquanto o armazenamento local ainda existir.

## SEDUC2026 — Versão 23: Banco somente por importação JSON

- formulário manual de criação removido;
- botão Editar removido;
- novas questões entram somente por:
  - Importar JSON;
  - Importar JSON + imagens juntos;
- permanecem exportação, modelo JSON, sincronização de imagens, exclusão, filtros, blocos adaptativos e classificação de erros em Fragilidades.
