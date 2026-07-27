// ============================================================
// FUNDO DO LOGO — remoção e ENQUADRAMENTO no NAVEGADOR (canvas),
// sem biblioteca. Duas coisas, INDEPENDENTES uma da outra:
//
// 1) Apaga o fundo sólido (quase sempre branco) que vem no logo do
//    cliente e devolve um PNG com transparência, para o logo aparecer
//    direto sobre o cartão/imagem do post em vez de um quadrado branco.
// 2) Recorta a imagem justa no desenho, com uma margem de respiro.
//    Muito logo chega com bastante espaço vazio em volta e, como o app
//    mantém a proporção, aparece pequeno no post — e a margem ainda
//    atrapalha a leitura da cor da marca. O recorte acontece mesmo
//    quando o fundo NÃO é removido, desde que dê para localizar o
//    desenho com segurança (fundo transparente ou cor sólida). Em
//    fundo de foto/degradê não recortamos: logo com margem é melhor
//    que logo cortado no lugar errado.
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

// Recorte no conteúdo: a caixa precisa render alguma coisa e fazer sentido.
const RECORTE_SEM_GANHO = 0.98; // caixa deste tamanho já é a imagem inteira
const RECORTE_AREA_MIN = 0.05;  // caixa menor que isso = detecção suspeita
const RESPIRO = 0.04;           // margem de respiro: 4% do maior lado do desenho
const RESPIRO_MIN = 4;          // ...nunca menos que 4px

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

// Um pixel faz parte do DESENHO do logo? Dois critérios, escolhidos pelo
// mesmo sinal que a remoção de fundo já usa para saber o que é fundo:
//   "alfa" — fundo transparente (veio assim ou acabou de ser removido)
//   "cor"  — fundo sólido preservado: é desenho o que foge da cor da borda
function ehDesenho(criterio, data, p, borda) {
  const i = p * 4;
  if (data[i + 3] <= 8) return false;
  if (criterio === "alfa") return true;
  return distancia(data[i], data[i + 1], data[i + 2], borda.r, borda.g, borda.b) > TOLERANCIA;
}

// Caixa do conteúdo (bounding box) do desenho. Contamos os pixels de desenho
// POR LINHA e POR COLUNA em vez de pegar o min/max cru: um único pixel de
// ruído (JPEG, sujeira num canto) esticaria a caixa até a imagem inteira e o
// recorte não faria nada. Uma linha só entra na caixa se tiver um punhado de
// pixels de desenho. Devolve null quando não há conteúdo suficiente.
function caixaDoConteudo(data, w, h, criterio, borda) {
  const porLinha = new Uint32Array(h);
  const porColuna = new Uint32Array(w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ehDesenho(criterio, data, y * w + x, borda)) continue;
      porLinha[y]++;
      porColuna[x]++;
    }
  }

  const minPorLinha = Math.max(2, Math.round(w * 0.003));
  const minPorColuna = Math.max(2, Math.round(h * 0.003));
  let minY = -1, maxY = -1, minX = -1, maxX = -1;
  for (let y = 0; y < h; y++) if (porLinha[y] >= minPorLinha) { if (minY < 0) minY = y; maxY = y; }
  for (let x = 0; x < w; x++) if (porColuna[x] >= minPorColuna) { if (minX < 0) minX = x; maxX = x; }
  if (minY < 0 || minX < 0) return null;

  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Recorta o canvas justo no desenho, com uma margem de respiro (nunca colado
// no traço). Devolve { canvas, motivo }: canvas null quando não dá para
// localizar com segurança ou quando não há ganho — aí o chamador segue com a
// imagem inteira, porque logo com margem é melhor que logo cortado errado.
function recortarNoConteudo(canvas, ctx, w, h, criterio, borda) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const caixa = caixaDoConteudo(data, w, h, criterio, borda);
  if (!caixa) return { canvas: null, motivo: "não encontrei o desenho dentro da imagem" };

  if ((caixa.w * caixa.h) / (w * h) < RECORTE_AREA_MIN)
    return { canvas: null, motivo: "o desenho detectado é pequeno demais para ser confiável" };
  if (caixa.w >= w * RECORTE_SEM_GANHO && caixa.h >= h * RECORTE_SEM_GANHO)
    return { canvas: null, motivo: "o logo já preenche o quadro" };

  const respiro = Math.max(RESPIRO_MIN, Math.round(Math.max(caixa.w, caixa.h) * RESPIRO));
  const x = Math.max(0, caixa.x - respiro);
  const y = Math.max(0, caixa.y - respiro);
  const lw = Math.min(w, caixa.x + caixa.w + respiro) - x;
  const lh = Math.min(h, caixa.y + caixa.h + respiro) - y;
  if (lw === w && lh === h)
    return { canvas: null, motivo: "a margem de respiro já cobre a imagem inteira" };

  const corte = document.createElement("canvas");
  corte.width = lw; corte.height = lh;
  corte.getContext("2d").drawImage(canvas, x, y, lw, lh, 0, 0, lw, lh);
  return { canvas: corte, motivo: "" };
}

// Remove o fundo do logo e o enquadra no desenho. SEMPRE resolve — nunca lança:
//   { url, semFundo, motivo, recortado, motivoRecorte }
// semFundo e recortado são independentes: há logo recortado que mantém o fundo.
// Em qualquer desistência dos dois, url é o dataUrl original.
export async function removerFundoLogo(dataUrl) {
  // Devolve o logo exatamente como veio. Por padrão o motivo do não-recorte é
  // o mesmo da não-remoção (fundo fotográfico, por exemplo, impede os dois).
  const manter = (motivo, motivoRecorte = motivo) =>
    ({ url: dataUrl, semFundo: false, motivo, recortado: false, motivoRecorte });

  if (!dataUrl) return manter("sem logo");

  try {
    const { canvas, ctx, w, h } = await carregarNoCanvas(dataUrl);
    const imagem = ctx.getImageData(0, 0, w, h);
    const data = imagem.data;
    const total = w * h;

    // 1) Já tem transparência? É um PNG que veio pronto — não há fundo a tirar.
    // Exige uma fração mínima, não um pixel solto: ícone exportado costuma
    // ter um ou dois pixels de alfa no canto sem ter fundo transparente.
    let transparentes = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 10) transparentes++;
    if (transparentes / total > 0.01) {
      // Não há fundo a remover, mas o alfa diz com segurança onde está o
      // desenho — então ainda dá para enquadrar. Recorte e transparência
      // são decisões independentes.
      const motivo = "o logo já tem fundo transparente";
      const corte = recortarNoConteudo(canvas, ctx, w, h, "alfa", null);
      if (!corte.canvas) return manter(motivo, corte.motivo);
      return { url: corte.canvas.toDataURL("image/png"), semFundo: false, motivo, recortado: true, motivoRecorte: "" };
    }

    // 2) O fundo é sólido? Se a borda varia muito, é foto/degradê — aí não dá
    // para saber onde o fundo termina, e um recorte errado comeria o próprio
    // logo. Nesse caso não removemos NEM recortamos.
    const borda = analisarBorda(data, w, h);
    if (borda.dispersao > DISPERSAO_MAX) {
      return manter("o fundo do logo não é sólido (parece foto ou degradê)");
    }

    // Fundo sólido que a remoção não soube apagar: a borda é uniforme, então
    // o desenho ainda pode ser localizado pela distância de cor. Enquadramos
    // mantendo a cor de fundo do cliente — logo maior, fundo dele preservado.
    // Lê os pixels do canvas, que continua com a imagem original (o flood fill
    // abaixo mexe numa cópia e só volta pro canvas no passo 5).
    const enquadrarComFundo = (motivo) => {
      const corte = recortarNoConteudo(canvas, ctx, w, h, "cor", borda);
      if (!corte.canvas) return manter(motivo, corte.motivo);
      return { url: corte.canvas.toDataURL("image/png"), semFundo: false, motivo, recortado: true, motivoRecorte: "" };
    };

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
    if (fracao < REMOCAO_MIN) return enquadrarComFundo("não encontrei um fundo para remover");
    if (fracao > REMOCAO_MAX) return enquadrarComFundo("a remoção apagaria quase todo o logo");

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

    // 6) Recorta no desenho (o fundo virou transparência, então o alfa diz
    // onde ele está) e exporta em PNG, o formato com alfa.
    const corte = recortarNoConteudo(canvas, ctx, w, h, "alfa", borda);
    const final = corte.canvas || canvas;
    return {
      url: final.toDataURL("image/png"), semFundo: true, motivo: "",
      recortado: !!corte.canvas, motivoRecorte: corte.motivo,
    };
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
  if (!r.recortado && r.motivoRecorte) {
    console.warn("Logo mantido sem recorte —", r.motivoRecorte);
  }
  return r;
}
