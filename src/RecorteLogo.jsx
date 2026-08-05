// ============================================================
// TELA DE RECORTE DO LOGO — a "alça" de enquadramento
//
// Aparece SEMPRE que o cliente envia um logo, no cadastro e no Editar
// perfil. Não é um botão opcional de propósito: muita gente manda foto de
// cartão de visita ou de panfleto, e quando o recorte automático erra, um
// ajuste opcional simplesmente não é clicado — o cliente sai com o logo
// torto e não sabe por quê.
//
// A moldura NASCE no enquadramento que o recorte automático encontrou
// (ver enquadramentoSugerido em logo.js). Quando ele acerta — que é o
// normal — o cliente só confirma. Quando erra, ele corrige.
//
// RECORTE LIVRE: a moldura tem alça nos quatro cantos e nos quatro lados,
// e o cliente desenha o retângulo do tamanho e no lugar que quiser, direto
// sobre o logo. Não há proporção a escolher — a moldura assume qualquer
// formato, que é justamente o que evita sobrar espaço em volta de um logo
// comprido ou de um logo alto.
//
// O recorte é aplicado UMA VEZ, aqui no envio. O que sai daqui é o que
// segue para a remoção de fundo e para a leitura da cor da marca — ou
// seja, a cor sai do logo já recortado, não do original.
//
// Roda 100% no navegador (react-image-crop + canvas): zero custo de API.
// ============================================================
import { useState, useRef, useEffect } from "react";
import ReactCrop from "react-image-crop";
// Obrigatório: é neste CSS que mora o touch-action:none da moldura. Sem ele,
// arrastar com o dedo rola a página em vez de mexer no recorte.
import "react-image-crop/dist/ReactCrop.css";
import { enquadramentoSugerido } from "./logo.js";

const FONT = "Nunito,sans-serif";
const AZUL = "#003BA0";

// Maior lado do recorte entregue. O pipeline seguinte já reduz para 512px;
// 1024 aqui é só para não carregar um PNG de foto de 12 megapixels na
// memória do celular entre uma etapa e outra.
const MAX_LADO_CORTE = 1024;

// Menor moldura aceita, em pixels de tela. Impede o recorte degenerado de
// quem encostou o dedo sem querer e arrastou a alça até fechar a moldura.
const MIN_MOLDURA = 44;

// Aplica o recorte escolhido sobre a imagem ORIGINAL e devolve um PNG.
// area vem em pixels do arquivo do cliente — o recorte é convertido de volta
// para o tamanho natural antes de chegar aqui, então desenhar a moldura numa
// tela pequena não custa qualidade nenhuma.
function cortar(src, area) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // A conversão de porcentagem para pixel pode estourar a borda por
        // arredondamento; drawImage com origem negativa traz borda preta.
        const x = Math.max(0, Math.min(img.width - 1, Math.round(area.x)));
        const y = Math.max(0, Math.min(img.height - 1, Math.round(area.y)));
        const cw = Math.max(1, Math.min(img.width - x, Math.round(area.width)));
        const ch = Math.max(1, Math.min(img.height - y, Math.round(area.height)));

        const escala = Math.min(1, MAX_LADO_CORTE / Math.max(cw, ch));
        const w = Math.max(1, Math.round(cw * escala));
        const h = Math.max(1, Math.round(ch * escala));

        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, x, y, cw, ch, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("não foi possível carregar a imagem para recortar"));
    img.src = src;
  });
}

// ============================================================
// A TELA. Ocupa o aparelho inteiro: a imagem fica com todo o espaço que
// sobra dos controles, para a moldura nascer grande e dar para pegar as
// alças com o dedo.
// ============================================================
export function RecorteLogo({ src, sugestao, onConfirmar, onTrocarImagem }) {
  // A moldura vive em PORCENTAGEM da imagem, não em pixels de tela: assim ela
  // sobrevive a virar o aparelho e à imagem mudar de tamanho na tela, e a
  // conversão para os pixels do arquivo original no fim é uma multiplicação.
  const [moldura, setMoldura] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [natural, setNatural] = useState(null); // tamanho real do arquivo
  const [caixa, setCaixa] = useState(null);     // tamanho da imagem na tela
  const imgRef = useRef(null);
  const areaRef = useRef(null);

  // Trava a rolagem do app atrás da tela: no celular, arrastar a moldura
  // acabava rolando a página junto.
  useEffect(() => {
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, []);

  // A imagem é AMPLIADA até encher o espaço livre, não só limitada a ele.
  // Logo costuma ser arquivo pequeno (uns 200×80px é comum): deixado no
  // tamanho natural viraria uma tirinha no meio da tela, impossível de
  // ajustar com o dedo. Aqui é medido e escalado na mão em vez de resolvido
  // no CSS porque object-fit deixaria a imagem pintada MENOR que o elemento,
  // e a moldura da biblioteca é medida pelo elemento — o recorte sairia
  // deslocado.
  useEffect(() => {
    if (!natural) return;
    function medir() {
      const el = areaRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      const escala = Math.min(width / natural.w, height / natural.h);
      setCaixa({
        w: Math.max(1, Math.floor(natural.w * escala)),
        h: Math.max(1, Math.floor(natural.h * escala)),
      });
    }
    medir();
    // Virar o aparelho muda o espaço livre; a moldura vive em % e acompanha.
    window.addEventListener("resize", medir);
    window.addEventListener("orientationchange", medir);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("orientationchange", medir);
    };
  }, [natural]);

  // Assim que a imagem aparece, a moldura vai para o enquadramento que o
  // automático sugeriu. É isto que faz o cliente só CONFIRMAR quando o
  // automático acerta, que é o caso normal.
  function aoCarregarImagem(e) {
    const { naturalWidth: nw, naturalHeight: nh } = e.currentTarget;
    if (!nw || !nh) return;
    setNatural({ w: nw, h: nh });
    const s = sugestao;
    setMoldura(
      s
        ? {
            unit: "%",
            x: (s.x / nw) * 100,
            y: (s.y / nh) * 100,
            width: (s.w / nw) * 100,
            height: (s.h / nh) * 100,
          }
        : { unit: "%", x: 0, y: 0, width: 100, height: 100 },
    );
  }

  async function confirmar() {
    const img = imgRef.current;
    if (!moldura || !img || ocupado) return;
    setOcupado(true);
    try {
      // De volta aos pixels do arquivo do cliente.
      const area = {
        x: (moldura.x / 100) * img.naturalWidth,
        y: (moldura.y / 100) * img.naturalHeight,
        width: (moldura.width / 100) * img.naturalWidth,
        height: (moldura.height / 100) * img.naturalHeight,
      };
      onConfirmar(await cortar(src, area));
    } catch (e) {
      // Não dá para travar o cliente aqui: segue com a imagem inteira, que é
      // o mesmo que o app fazia antes de existir esta tela.
      console.error("Falha ao aplicar o recorte, seguindo com a imagem inteira:", e);
      onConfirmar(src);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000, background: "#0E1A22",
      display: "flex", flexDirection: "column", fontFamily: FONT,
    }}>
      <EstiloDaMoldura />
      <div style={{ padding: "16px 20px 12px", textAlign: "center", flexShrink: 0 }}>
        <div style={{ color: "white", fontWeight: 900, fontSize: 20 }}>Ajuste seu logo</div>
        <div style={{ color: "#9FB4C0", fontSize: 14, fontWeight: 600, marginTop: 4, lineHeight: 1.35 }}>
          Puxe os cantos para ajustar a moldura. Arraste o meio para mover.
        </div>
      </div>

      {/* A moldura precisa de folga para as alças não ficarem coladas na
          borda da tela quando o recorte vai até o canto da imagem. */}
      <div style={{ flex: 1, minHeight: 0, padding: "4px 22px", overflow: "hidden" }}>
        <div ref={areaRef} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
          <ReactCrop
            crop={moldura || undefined}
            onChange={(_, emPorcentagem) => setMoldura(emPorcentagem)}
            keepSelection            /* tocar fora não apaga a moldura sem querer */
            minWidth={MIN_MOLDURA}
            minHeight={MIN_MOLDURA}
          >
            <img
              ref={imgRef} src={src} alt="Seu logo"
              onLoad={aoCarregarImagem}
              style={caixa
                ? { width: caixa.w, height: caixa.h, display: "block" }
                : { maxWidth: "100%", maxHeight: "100%", display: "block" }}
            />
          </ReactCrop>
        </div>
      </div>

      <div style={{ padding: "16px 20px 20px", flexShrink: 0 }}>
        <button onClick={confirmar} disabled={ocupado || !moldura}
          style={{
            width: "100%", padding: "17px", background: ocupado ? "#2A4657" : AZUL, color: "white",
            border: "none", borderRadius: 16, fontSize: 17, fontWeight: 900,
            cursor: ocupado ? "default" : "pointer", fontFamily: FONT,
          }}>
          {ocupado ? "Preparando…" : "Usar este recorte"}
        </button>
        <button onClick={onTrocarImagem} disabled={ocupado}
          style={{
            width: "100%", padding: "13px", marginTop: 10, background: "transparent", color: "#9FB4C0",
            border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700,
            cursor: ocupado ? "default" : "pointer", fontFamily: FONT,
          }}>
          Escolher outra imagem
        </button>
      </div>
    </div>
  );
}

// As alças no tamanho de fábrica são pequenas demais para o nosso público, e
// a biblioteca ainda ESCONDE as alças dos lados em tela de toque (a regra
// pointer:coarse do CSS dela), deixando só os quatro cantos. Aqui as dos lados
// voltam e todas engordam: 36px de alça e barra de 26px na borda, que é área
// de sobra para o dedo de quem tem menos firmeza na mão.
function EstiloDaMoldura() {
  return (
    <style>{`
      .ReactCrop {
        --rc-drag-handle-size: 36px;
        --rc-drag-handle-mobile-size: 36px;
        --rc-drag-bar-size: 26px;
        --rc-drag-handle-bg-colour: #fff;
        --rc-border-color: #fff;
      }
      @media (pointer: coarse) {
        .ReactCrop .ord-n, .ReactCrop .ord-e,
        .ReactCrop .ord-s, .ReactCrop .ord-w { display: block; }
      }
      /* Alça branca cheia, com sombra para não sumir num logo claro. */
      .ReactCrop__drag-handle {
        border: 2px solid ${AZUL};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      }
    `}</style>
  );
}

// Aviso de espera entre confirmar o recorte e o logo ficar pronto: no celular,
// cortar + apagar o fundo + ler a cor leva um instante em que a tela ficaria
// parada sem explicação.
function Preparando() {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3100, background: "rgba(14,26,34,0.92)",
      display: "grid", placeItems: "center", fontFamily: FONT, color: "white",
      fontSize: 17, fontWeight: 800, textAlign: "center", padding: 24,
    }}>
      <div>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
        Preparando seu logo…
      </div>
    </div>
  );
}

// ============================================================
// O GANCHO DE ENVIO — é isto que os quatro pontos de envio usam, para que
// o caminho do logo seja exatamente o mesmo em todos:
//
//   arquivo → sugestão do automático → TELA DE RECORTE → aoConcluir(recortado)
//
// aoConcluir recebe o dataUrl JÁ recortado e faz o que cada tela precisa
// (chamar prepararLogoEnviado, salvar na ficha, ler a cor da marca...).
// Pode devolver uma promessa: enquanto ela não resolve, fica o aviso de
// "Preparando seu logo…".
//
// Devolve:
//   campo       — o <input type=file> escondido (precisa estar na árvore)
//   tela        — a tela de recorte / o aviso de espera (idem)
//   abrir()     — abre o seletor de arquivo do aparelho
//   ajustar()   — reabre o recorte na imagem ORIGINAL desta sessão
//   podeAjustar — se há original guardado para o "Ajustar recorte"
//
// O original fica só em memória, enquanto a tela está aberta: no
// localStorage ele estouraria a cota junto com a ficha, e o que o app
// precisa guardar de verdade é o logo já enquadrado.
// ============================================================
export function useEnvioDeLogo(aoConcluir) {
  const inputRef = useRef(null);
  const [original, setOriginal] = useState(null);
  const [recorte, setRecorte] = useState(null); // { src, sugestao }
  const [preparando, setPreparando] = useState(false);

  // Funções simples de propósito, sem useCallback: elas fecham sobre o
  // aoConcluir DESTA renderização, e memorizar deixaria uma versão velha
  // presa (o handler chamaria o estado da tela de duas renderizações atrás).
  function abrir() { inputRef.current?.click(); }

  async function abrirRecorte(src) {
    const sugestao = await enquadramentoSugerido(src);
    // sugestao null = a imagem nem carregou; a tela de recorte também não
    // conseguiria mostrá-la, então segue o caminho antigo, direto.
    if (!sugestao) { await concluir(src); return; }
    setRecorte({ src, sugestao });
  }

  async function concluir(dataUrl) {
    setRecorte(null);
    setPreparando(true);
    try {
      await aoConcluir(dataUrl);
    } finally {
      setPreparando(false);
    }
  }

  function aoEscolherArquivo(e) {
    const f = e.target.files?.[0];
    // Zera o campo: sem isso, escolher O MESMO arquivo de novo (depois de um
    // "Escolher outra imagem") não dispara onChange e a tela não volta.
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOriginal(reader.result);
      abrirRecorte(reader.result);
    };
    reader.readAsDataURL(f);
  }

  const campo = (
    <input ref={inputRef} type="file" accept="image/*"
      onChange={aoEscolherArquivo} style={{ display: "none" }} />
  );

  const tela = (
    <>
      {recorte && (
        <RecorteLogo
          src={recorte.src}
          sugestao={recorte.sugestao}
          onConfirmar={concluir}
          onTrocarImagem={() => { setRecorte(null); abrir(); }}
        />
      )}
      {preparando && <Preparando />}
    </>
  );

  return {
    campo, tela, abrir,
    ajustar: () => original && abrirRecorte(original),
    podeAjustar: !!original,
  };
}
