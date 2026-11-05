# ÍRIS

Assistente pessoal (Pessoal, Trabalho, Faculdade e Financeiro). Página estática no GitHub Pages, dados no Supabase.

## Como publicar (uns 5 minutos, tudo gratuito)

1. No GitHub, crie um repositório novo (ex.: `iris`) e envie todos os arquivos desta pasta, incluindo a pasta `.github`.
2. No repositório: Settings > Pages > Source: **GitHub Actions**. O deploy roda sozinho a cada push na branch `main`.
3. No Supabase (projeto `iris`): Authentication > URL Configuration. Em **Site URL** e **Redirect URLs**, coloque o endereço do Pages (`https://SEU-USUARIO.github.io/iris/`).
4. Abra o endereço, digite seu e-mail e entre pelo link que chega na caixa de entrada.

## Estrutura

- `index.html`: o app (mesmo da versão do Claude).
- `adapter.js`: faz o Supabase responder à interface de dados que o app já usa.
- `config.js`: URL e chave **pública** do Supabase. A chave de verdade (service_role) e a do Gemini nunca entram aqui.
- `supabase/schema.sql`: tabelas `items`, `fintx` e `fin`, com segurança por linha (cada pessoa só enxerga o que é dela).

## O que ainda não funciona nesta versão

- Gmail e Google Agenda (dependiam do Claude). Exigem login do Google próprio.
- Chat com IA e leitura de faturas (dependiam do Claude). Previsto: função do Supabase guardando a chave do Gemini como segredo.
