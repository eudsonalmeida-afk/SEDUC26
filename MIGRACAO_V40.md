# V40 — implantação

1. Faça backup no aplicativo atual antes de publicar. Não limpe dados locais.
2. Publique todos os arquivos do ZIP no GitHub Pages.
3. Abra primeiro no Safari, confirme a inicialização e sincronização Supabase, depois teste no PWA instalado.
4. Diário → Importar Histórico de Estudos → escolha `HISTORICO_INICIAL_EXEMPLO.json` → confira a prévia, mapeie eventuais itens e confirme.
5. Verifique que os dois diagnósticos históricos foram preservados e que nenhuma hora/questão foi somada.
6. Reimportar o mesmo JSON atualiza os IDs; a reversão só é permitida se os registros da última importação ainda pertencerem ao lote.

**SQL:** nenhuma migração. Os novos objetos são gravados no JSON `study_state.payload`, preservando `question_images` e o estado antigo. Legacy permanece inalterada.

**Limites:** validação sintática estática efetuada; sincronização entre dois aparelhos e fluxo visual não foram testados em dispositivos reais. Diagnósticos históricos são mantidos separados dos indicadores de acertos recentes para evitar distorção. Fila de calibração distribui itens em lotes semanais sem agendar datas inventadas.
