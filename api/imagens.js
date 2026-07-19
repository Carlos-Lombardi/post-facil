// Portinha dos fundos — Imagem (gpt-image-1-mini / OpenAI)
// Roda no servidor do Vercel. Esconde a chave e evita CORS.
// Os modelos GPT Image devolvem a imagem em base64 (b64_json), não URL.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chave de imagem não configurada no servidor." });
  }

  try {
    const { prompt, size } = req.body || {};
    if (!prompt) {
      return res.status(400).json({ error: "Faltou a descrição da imagem." });
    }

    const resposta = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "gpt-image-1-mini",
        prompt,
        n: 1,
        size: size || "1024x1024",
        quality: "medium",
      }),
    });

    const dados = await resposta.json();

    if (dados.error) {
      return res.status(500).json({ error: dados.error.message || "Erro ao gerar imagem." });
    }

    // GPT Image devolve a imagem em base64 (não URL). Devolvemos o b64 cru;
    // o app monta o data URL para usar direto no <img src>.
    return res.status(200).json({ b64: dados.data[0].b64_json });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao gerar imagem: " + (e.message || "desconhecido") });
  }
}
