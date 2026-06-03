// Portinha dos fundos — Imagem (DALL-E / OpenAI)
// Roda no servidor do Vercel. Esconde a chave e evita CORS.

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
        model: "dall-e-3",
        prompt,
        n: 1,
        size: size || "1024x1024",
        quality: "standard",
      }),
    });

    const dados = await resposta.json();

    if (dados.error) {
      return res.status(500).json({ error: dados.error.message || "Erro ao gerar imagem." });
    }

    return res.status(200).json({ url: dados.data[0].url });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao gerar imagem: " + (e.message || "desconhecido") });
  }
}
