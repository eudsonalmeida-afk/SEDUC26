# Histórico de aprendizagem — JSON v1

Formato independente do Banco de Questões. Campos raiz obrigatórios: `format` = `seduc2026-learning-history`, `version` = `1`, `baselines`, `contents`, `diagnostics`, `weaknesses` (listas, mesmo vazias).

Todos os registros têm `id` estável. As disciplinas são `Educação`, `Administração`, `Português`, `Dados`, `Biologia`.

`contents`: `id`, `discipline`, `topicId` (ID exato do mapa V39), `content`, `status` (`not_started`, `in_progress`, `completed`), `source` (`IFCE`, `SEDUC`, `ChatGPT`, `other`), `confidence` (`user_confirmed`, `activity_record`, `inferred`, `pending`); opcionais `studyDate` (`AAAA-MM-DD` ou null), `needsReview`, `notes`.

`baselines`: `id`, `discipline`, `estimate` (0–100 ou null). `diagnostics`: `id`, `discipline`, `title`, `questions`, `correct`, `date` (opcional ou null). `weaknesses`: `id`, `discipline`, `topicId`, `description`.

IDs repetidos são atualizados, sem somar horas ou questões. Diagnósticos históricos são armazenados separadamente; não geram tentativas fictícias. A primeira passagem só conta quando o estado é `completed` e a confirmação é `user_confirmed` ou `activity_record`. Inferências não concluem cobertura.
