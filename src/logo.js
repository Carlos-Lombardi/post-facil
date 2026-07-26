// ============================================================
// FUNDO DO LOGO — remoção no NAVEGADOR (canvas), sem biblioteca
// Apaga o fundo sólido (quase sempre branco) que vem no logo do
// cliente e devolve um PNG com transparência, para o logo aparecer
// direto sobre o cartão/imagem do post em vez de um quadrado branco.
//
// Roda UMA VEZ, no envio do logo — nunca a cada post. NÃO usa serviço
// externo (zero custo por imagem) e não adiciona dependência: é o
// mesmo padrão de cor.js, que já lê os pixels do logo por aqui.
//
// Técnica: flood fill a partir das bordas. Isso importa — apagar
// "todo pixel branco" destruiria o branco de DENTRO do logo (letra
// branca dentro de um círculo colorido, por exemplo). O flood fill só
// alcança o que está conectado à borda, que é o fundo de verdade.
//
// Em qualquer dúvida a função DESISTE e devolve o logo original: é
// melhor um logo com fundo do que nenhum logo.
// ============================================================

// Maior lado do logo depois de processado. O resultado sai
// obrigatoriamente em PNG (JPG não guarda transparência), e PNG de
// imagem grande incha o data URL — que vive no localStorage junto da
// ficha. 512px é de sobra para o cartão do post.
const MAX_LADO = 512;

// Distância de cor (0..441) para um pixel ainda ser considerado "fundo".
const TOLERANCIA = 40;

// Quanto a borda pode variar e ainda ser considerada um fundo sólido.
const DISPERSAO_MAX = 26;

// Faixas de sanidade do resultado (fração de pixels removidos).
const REMOCAO_MIN = 0.02; // abaixo disso não fez nada de útil
const REMOCAO_MAX = 0.92; // acima disso apagaria o próprio logo

// Distância euclidiana entre duas cores RGB.
function distancia(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Carrega o data URL num canvas já reduzido. Data URLs não "sujam" o
// canvas, então getImageData funciona sem problema de CORS.
function carregarNoCanvas(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAX_LADO / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * escala));
      const h = Math.max(1, Math.round(img.height * escala));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ canvas, ctx, w, h });
    };
    img.onerror = () => reject(new Error("não foi possível carregar a imagem do logo"));
    img.src = dataUrl;
  });
}

// Percorre os pixels da moldura de 1px e devolve a cor média das bordas
// e a dispersão em relação a ela. Dispersão alta = fundo fotográfico ou
// em degradê, que este método não sabe recortar.
function analisarBorda(data, w, h) {
  const idx = [];
  for (let x = 0; x < w; x++) {
    idx.push((0 * w + x) * 4);          // topo
    idx.push(((h - 1) * w + x) * 4);    // base
  }
  for (let y = 0; y < h; y++) {
    idx.push((y * w + 0) * 4);          // esquerda
    idx.push((y * w + (w - 1)) * 4);    // direita
  }

  let r = 0, g = 0, b = 0;
  for (const i of idx) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  r /= idx.length; g /= idx.length; b /= idx.length;

  let soma = 0;
  for (const i of idx) soma += distancia(data[i], data[i + 1], data[i + 2], r, g, b);
  return { r, g, b, dispersao: soma / idx.length };
}

// Apara as margens totalmente transparentes. Depois de tirar o quadrado
// do fundo costuma sobrar bastante margem vazia, o que faz o logo
// parecer pequeno dentro do cartão do post.
function aparar(canvas, ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return canvas; // nada sobrou: devolve como está

  const lw = maxX - minX + 1, lh = maxY - minY + 1;
  if (lw === w && lh === h) return canvas;       // não havia margem

  const corte = document.createElement("canvas");
  corte.width = lw; corte.height = lh;
  corte.getContext("2d").drawImage(canvas, minX, minY, lw, lh, 0, 0, lw, lh);
  return corte;
}

// Remove o fundo do logo. SEMPRE resolve — nunca lança:
//   { url, semFundo, motivo }
// Em qualquer desistência, url é o dataUrl original e semFundo é false.
export async function removerFundoLogo(dataUrl) {
  const manter = (motivo) => ({ url: dataUrl, semFundo: false, motivo });

  if (!dataUrl) return manter("sem logo");

  try {
    const { canvas, ctx, w, h } = await carregarNoCanvas(dataUrl);
    const imagem = ctx.getImageData(0, 0, w, h);
    const data = imagem.data;
    const total = w * h;

    // 1) Já tem transparência? É um PNG que veio pronto — não mexemos.
    // Exige uma fração mínima, não um pixel solto: ícone exportado costuma
    // ter um ou dois pixels de alfa no canto sem ter fundo transparente.
    let transparentes = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 10) transparentes++;
    if (transparentes / total > 0.01) return manter("o logo já tem fundo transparente");

    // 2) O fundo é sólido? Se a borda varia muito, é foto/degradê.
    const borda = analisarBorda(data, w, h);
    if (borda.dispersao > DISPERSAO_MAX) {
      return manter("o fundo do logo não é sólido (parece foto ou degradê)");
    }

    // 3) Flood fill a partir de TODA a moldura, com pilha (nunca
    // recursão: um logo de 512px tem 260 mil pixels e estouraria a
    // pilha de chamadas). Só o fundo conectado à borda é alcançado.
    const visitado = new Uint8Array(total);
    const pilha = [];
    for (let x = 0; x < w; x++) { pilha.push(x); pilha.push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { pilha.push(y * w); pilha.push(y * w + (w - 1)); }

    let removidos = 0;
    while (pilha.length) {
      const p = pilha.pop();
      if (visitado[p]) continue;
      visitado[p] = 1;

      const i = p * 4;
      if (distancia(data[i], data[i + 1], data[i + 2], borda.r, borda.g, borda.b) > TOLERANCIA) continue;

      data[i + 3] = 0;
      removidos++;

      const x = p % w, y = (p - x) / w;
      if (x > 0)     pilha.push(p - 1);
      if (x < w - 1) pilha.push(p + 1);
      if (y > 0)     pilha.push(p - w);
      if (y < h - 1) pilha.push(p + w);
    }

    // 4) Sanidade: nem quase nada, nem quase tudo.
    const fracao = removidos / total;
    if (fracao < REMOCAO_MIN) return manter("não encontrei um fundo para remover");
    if (fracao > REMOCAO_MAX) return manter("a remoção apagaria quase todo o logo");

    // 5) Suaviza a borda do recorte: pixel mantido que faz fronteira com
    // um removido ganha alfa proporcional à distância da cor de fundo.
    // Sem isso o contorno fica serrilhado sobre a imagem do post.
    const alfaFinal = new Uint8ClampedArray(total);
    for (let p = 0; p < total; p++) alfaFinal[p] = data[p * 4 + 3];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (data[p * 4 + 3] === 0) continue; // já é fundo

        const vizinhoRemovido =
          (x > 0     && data[(p - 1) * 4 + 3] === 0) ||
          (x < w - 1 && data[(p + 1) * 4 + 3] === 0) ||
          (y > 0     && data[(p - w) * 4 + 3] === 0) ||
          (y < h - 1 && data[(p + w) * 4 + 3] === 0);
        if (!vizinhoRemovido) continue;

        const i = p * 4;
        const d = distancia(data[i], data[i + 1], data[i + 2], borda.r, borda.g, borda.b);
        // Encosta na cor do fundo → quase transparente; longe dela → opaco.
        alfaFinal[p] = Math.round(255 * Math.min(1, d / (TOLERANCIA * 2)));
      }
    }
    for (let p = 0; p < total; p++) data[p * 4 + 3] = alfaFinal[p];

    ctx.putImageData(imagem, 0, 0);

    // 6) Apara a margem vazia e exporta em PNG (o formato com alfa).
    const final = aparar(canvas, ctx, w, h);
    return { url: final.toDataURL("image/png"), semFundo: true, motivo: "" };
  } catch (e) {
    console.error("Falha ao remover o fundo do logo, mantendo o original:", e);
    return manter("erro ao processar a imagem");
  }
}

// Wrapper para os pontos de envio: remove o fundo e registra no console
// o motivo quando desiste, para nunca falhar em silêncio.
export async function prepararLogoEnviado(dataUrl) {
  const r = await removerFundoLogo(dataUrl);
  if (!r.semFundo && r.motivo) {
    console.warn("Logo mantido com o fundo original —", r.motivo);
  }
  return r;
}
