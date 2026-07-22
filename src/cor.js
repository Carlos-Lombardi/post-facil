// ============================================================
// COR DA MARCA — extração no NAVEGADOR (canvas) + ajuste de contraste
// Lê os pixels do logo e escolhe a cor de identidade. NÃO usa nenhum
// serviço externo (zero custo de API). Data URLs não "sujam" o canvas,
// então getImageData funciona sem problema de CORS.
// ============================================================

const doisDig = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

export function rgbParaHex(r, g, b) {
  return "#" + doisDig(r) + doisDig(g) + doisDig(b);
}

export function hexParaRgb(hex) {
  const s = String(hex || "").replace("#", "").trim();
  if (s.length !== 6) return null;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Saturação (s) e luminosidade (l) em 0..1, modelo HSL.
function satLum(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { s, l };
}

// Luminância relativa (WCAG) — usada para medir contraste.
function lumRelativa(r, g, b) {
  const f = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// Contraste da cor contra o BRANCO (1 = nenhum, 21 = máximo).
export function contrasteComBranco(hex) {
  const c = hexParaRgb(hex);
  if (!c) return 1;
  return 1.05 / (lumRelativa(c.r, c.g, c.b) + 0.05);
}

// Escurece a cor até o texto BRANCO ficar legível por cima (contraste alvo).
// Cores claras (amarelo, bege, pastel) ganham profundidade sem trocar de matiz.
export function escurecerParaContraste(hex, alvo = 3.5) {
  const c = hexParaRgb(hex);
  if (!c) return hex;
  let { r, g, b } = c;
  let i = 0;
  while (contrasteComBranco(rgbParaHex(r, g, b)) < alvo && i < 40) {
    r *= 0.92; g *= 0.92; b *= 0.92;
    i++;
  }
  return rgbParaHex(r, g, b);
}

// Extrai a cor de identidade do logo. Promise<hex|null>.
// Regras: ignora transparentes, quase-brancos, quase-pretos e cinzas sem
// saturação; prefere a cor mais SATURADA e presente (soma de saturação por
// balde de cor — não a que ocupa mais área).
export function extrairCorMarca(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(null); return; }
    const img = new Image();
    img.onload = () => {
      try {
        const maxLado = 120; // reduz para ler poucos milhares de pixels
        const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * escala));
        const h = Math.max(1, Math.round(img.height * escala));
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);

        const baldes = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 125) continue;          // transparente
          const { s, l } = satLum(r, g, b);
          if (l > 0.92) continue;         // quase-branco (fundo comum de logo)
          if (l < 0.08) continue;         // quase-preto
          if (s < 0.18) continue;         // cinza sem saturação
          // balde: quantiza cada canal em 16 níveis (agrupa a mesma família de cor)
          const chave = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
          const atual = baldes.get(chave) || { score: 0, r: 0, g: 0, b: 0, n: 0 };
          atual.score += s;               // "mais saturada e presente"
          atual.r += r; atual.g += g; atual.b += b; atual.n++;
          baldes.set(chave, atual);
        }

        if (baldes.size === 0) { resolve(null); return; }
        let melhor = null;
        for (const v of baldes.values()) if (!melhor || v.score > melhor.score) melhor = v;
        resolve(rgbParaHex(melhor.r / melhor.n, melhor.g / melhor.n, melhor.b / melhor.n));
      } catch (e) {
        console.error("Falha ao extrair a cor do logo:", e);
        resolve(null);
      }
    };
    img.onerror = () => {
      console.error("Não foi possível carregar o logo para extrair a cor.");
      resolve(null);
    };
    img.src = dataUrl;
  });
}

// Analisa o logo e devolve { original, layout } — a cor original do cliente e a
// versão escurecida para o texto branco ficar legível no layout. null se falhar.
export async function analisarCorDoLogo(dataUrl) {
  const original = await extrairCorMarca(dataUrl);
  if (!original) return null;
  return { original, layout: escurecerParaContraste(original) };
}
