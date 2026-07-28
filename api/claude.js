// ============================================================
// PORTINHA DOS FUNDOS — Claude (texto)
// Esta função roda no SERVIDOR do Vercel, não no navegador.
// Resolve o CORS e esconde a chave da API.
// O app chama /api/claude em vez de chamar a Anthropic direto.
// ============================================================

// Duração máxima desta função no Vercel. A geração de texto passa de 30s em
// post longo, e no limite padrão a função era cortada antes de responder — o
// app recebia uma resposta vazia e caía no modo demonstração. 60s é o teto do
// plano Hobby. Formato do objeto config: é o que o Vercel lê em função avulsa
// na pasta /api (o `export const maxDuration` é a forma do Next.js).
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // A chave fica numa variável de ambiente do Vercel (segura, fora do navegador)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave da nossa IA não configurada no servidor." });
  }

  try {
    const { system, user, max_tokens } = req.body || {};
    if (!user) {
      return res.status(400).json({ error: "Faltou o conteúdo da mensagem." });
    }

    const resposta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: max_tokens || 1000,
        system: system || "",
        messages: [{ role: "user", content: user }],
      }),
    });

    const dados = await resposta.json();

    if (dados.error) {
      return res.status(500).json({ error: dados.error.message || "Erro na nossa IA." });
    }

    // devolve só o texto, já montado
    const blocos = Array.isArray(dados.content) ? dados.content : [];
    const texto = blocos.map((b) => b.text || "").join("").trim();

    // Nunca respondemos 200 sem texto: o sucesso vazio fazia o app cair no
    // modo demonstração sem nenhuma pista do motivo — o painel mostrava
    // "Resposta sem JSON" com o JSON cru vazio. Aqui vai o diagnóstico do que
    // a Anthropic devolveu. Só dados da resposta: nada de chave nem cabeçalho.
    if (!texto) {
      return res.status(502).json({
        error:
          "A nossa IA respondeu sem texto." +
          ` stop_reason: ${dados.stop_reason || "(ausente)"};` +
          ` blocos em content: ${blocos.length};` +
          ` tipo do primeiro bloco: ${blocos[0]?.type || "(nenhum)"};` +
          ` amostra: ${blocos.length ? JSON.stringify(blocos).slice(0, 200) : "(nada)"}`,
      });
    }

    return res.status(200).json({ texto });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao falar com a nossa IA: " + (e.message || "desconhecido") });
  }
}
