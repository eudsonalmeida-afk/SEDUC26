SEDUC2026 V39 — correção de inicialização

Causa identificada: ensureLearningState() era chamado antes da declaração let state na V38, provocando ReferenceError e impedindo o boot do JavaScript principal.

Correção: a inicialização é feita depois da criação do estado, preservando os dados e recursos da V38. Cache do service worker atualizado. Nenhum SQL necessário. Substitua todos os arquivos do ZIP.
