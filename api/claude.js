// ============================================================
// PORTINHA DOS FUNDOS — Claude (texto)
// Esta função roda no SERVIDOR do Vercel, não no navegador.
// Resolve o CORS e esconde a chave da API.
// O app chama /api/claude em vez de chamar a Anthropic direto.
// ============================================================

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
        model: "claude-sonnet-4-20250514",
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
    const texto = (dados.content || []).map((b) => b.text || "").join("").trim();
    return res.status(200).json({ texto });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao falar com a nossa IA: " + (e.message || "desconhecido") });
  }
}
