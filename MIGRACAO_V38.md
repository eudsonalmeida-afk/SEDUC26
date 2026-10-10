# SEDUC2026 V38 — Migração e implantação

## Banco de dados / Supabase
**Nenhuma migração SQL é necessária.**

A sincronização atual grava o estado principal na coluna `payload jsonb` da tabela `study_state`.
A V38 acrescenta campos dentro desse JSON:
- `studyLog`
- `studyLogDeleted`
- `syllabusProgress`
- `baselineCoverage`
- `reviewSettings`

As tabelas existentes `study_state` e `question_images` permanecem inalteradas.

## Preservação de dados
A V38 mantém:
- `sessions`
- `fragilities`
- `simulations`
- `extraQuestions`
- `questionBank`
- `bankAttempts`
- `bankBlocks`
- configuração adaptativa
- imagens do banco e sincronização separada

Backups antigos continuam importáveis. Os novos campos são inicializados quando faltarem.

## Implantação
Para evitar mistura de arquivos de versões diferentes, substitua o pacote completo no GitHub pelo conteúdo do ZIP da V38.
Depois:
1. aguarde o GitHub Pages publicar;
2. abra o app no navegador;
3. faça uma atualização completa;
4. se estiver instalado como PWA, feche e reabra após a primeira atualização;
5. confira Nuvem, Diário e Banco de Questões.

## Sincronização e conflitos
Os registros do novo Diário possuem IDs e `updatedAt`.
A V38 faz merge por ID dos registros do Diário e usa tombstones de exclusão (`studyLogDeleted`) para reduzir o risco de registros excluídos reaparecerem em conflito entre dispositivos.
O restante do estado mantém o mecanismo de sincronização já existente.

## Legacy
A versão Legacy do iPad Mini 2 não é sobrescrita por esta atualização.
Os novos campos ficam dentro do mesmo JSON e não alteram os campos legados já usados pelo app antigo.
A interface nova de Diário/Cobertura foi implementada na PWA moderna; o Legacy continua operando com suas limitações anteriores.
