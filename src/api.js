// Cliente da API — o app fala com a "portinha dos fundos"
// (/api/claude e /api/imagem), nunca com a Anthropic/OpenAI direto.

async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let dados;
  try {
    dados = await r.json();
  } catch {
    throw new Error("Resposta inválida do servidor.");
  }
  if (!r.ok || dados.error) {
    throw new Error(dados.error || "Erro no servidor (" + r.status + ").");
  }
  return dados;
}

export async function gerarTexto(system, user, maxTokens = 1000) {
  const dados = await postJSON("/api/claude", { system, user, max_tokens: maxTokens });
  return dados.texto || "";
}

export async function gerarImagem(prompt, size = "1024x1024") {
  const dados = await postJSON("/api/imagem", { prompt, size });
  return dados.url;
}
