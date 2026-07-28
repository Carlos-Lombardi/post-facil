// ============================================================
// CLIENTE DA API — o app fala com a "portinha dos fundos"
// (/api/claude e /api/imagem), nunca com a Anthropic/OpenAI direto.
// É isto que faz funcionar no Vercel.
// ============================================================

// Detecta se estamos rodando com a portinha disponível (Vercel/produção)
// ou no preview/local sem backend.
async function postJSON(url, body) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // Lê como TEXTO primeiro. Quando a função estoura o tempo limite, o que
  // volta é uma página de erro do Vercel (HTML), não JSON — e o r.json()
  // escondia isso atrás de um "Resposta inválida do servidor" sem pista
  // nenhuma. Guardamos o código HTTP e o começo do corpo para o painel.
  const corpo = await r.text();
  const trecho = corpo.slice(0, 200).replace(/\s+/g, " ").trim() || "(corpo vazio)";

  let dados;
  try {
    dados = corpo ? JSON.parse(corpo) : {};
  } catch {
    throw new Error(`Resposta inválida do servidor (HTTP ${r.status}): ${trecho}`);
  }
  if (!r.ok || dados.error) {
    throw new Error(`${dados.error || "Erro no servidor"} (HTTP ${r.status}): ${trecho}`);
  }
  return dados;
}

// Gera texto com a nossa IA (via portinha)
export async function gerarTexto(system, user, maxTokens = 1000) {
  const dados = await postJSON("/api/claude", { system, user, max_tokens: maxTokens });
  return dados.texto || "";
}

// Gera imagem (via portinha)
export async function gerarImagem(prompt, size = "1024x1024") {
  const dados = await postJSON("/api/imagens", { prompt, size });
  // A portinha devolve a imagem em base64; montamos o data URL para o <img src>.
  return "data:image/png;base64," + dados.b64;
}
