# Post Fácil — Projeto pronto para o Vercel

## ✅ Fase 1 concluída
Cadastro novo (passo a passo, 102 segmentos, 2 tons, logo) + esqueleto do app
(Landing, Admin, planos, cota) — tudo já preparado para rodar no Vercel sem os
erros de antes.

## 📁 O que tem aqui
- `api/claude.js` e `api/imagem.js` — a "portinha dos fundos" (resolve o CORS e
  esconde as chaves). É o que faltava para funcionar no Vercel.
- `src/` — o app React (onboarding, ficha do cliente, telas).
- Configs do Vite + Vercel já prontas.

## 🚀 Como publicar no Vercel (passo a passo)

1. Crie uma conta em vercel.com (pode entrar com o GitHub).
2. Suba este projeto:
   - **Opção fácil:** instale o app do Vercel e arraste a pasta, ou
   - **Via GitHub:** suba a pasta para um repositório e conecte no Vercel.
3. Antes de publicar, em **Settings → Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave da Anthropic (console.anthropic.com)
   - `OPENAI_API_KEY` = sua chave da OpenAI (platform.openai.com)
4. Clique em **Deploy**. Pronto!

> As chaves ficam só no servidor do Vercel — nunca aparecem no navegador.
> Isso é mais seguro e é o que faz a geração funcionar fora do preview.

## 🧪 Rodar no seu computador (opcional)
```
npm install
npm run dev
```
(Para a geração de texto/imagem funcionar localmente, é preciso rodar via Vercel
CLI `vercel dev`, porque o `npm run dev` sozinho não sobe as funções da pasta /api.)

## 🔜 Próximas fases
- **Fase 2** — geração de texto (10 estilos + rodízio com memória).
- **Fase 3** — geração de imagem (post montado: imagem + logo + texto).
- O painel Admin, planos e cota já estão prontos e integrados.
