// ============================================================
// POST FÁCIL — APP
// ============================================================
import { useState, useRef, useMemo, useEffect } from "react";
import Onboarding from "./Onboarding.jsx";
import { criarFicha, salvarFicha, carregarFicha, garantirClienteId } from "./ficha.js";
import { DADOS } from "./dados.js";
import { gerarTexto, gerarImagem } from "./api.js";
import { analisarCorDoLogo, escurecerParaContraste } from "./cor.js";
import { prepararLogoEnviado } from "./logo.js";
import {
  PostFacilLogo, AppHeader, Toast, useToast, QuotaBar,
  ADMIN_PASS, DEFAULT_CODES, getDefaultLimits, getOverrides,
  saudacaoMotivacional, incPostCreditos, mensagemCreditos, podeGerarPost,
  getWppConfig, saveWppConfig, doCopy, chaveCliente,
} from "./shared.jsx";
import logoPostFacil from "./assets/logo-postfacil.png";
import bannerCatalogo from "./assets/banner-catalogo.jpg";
import bannerLogo from "./assets/banner-logo.jpg";

// ============================================================
// LIGA/DESLIGA DA GERAÇÃO REAL DE TEXTO — POST DE NEGÓCIO
// true  = o post de Negócio chama a nossa IA de verdade (api/claude.js)
//         e recebe o JSON (legenda, texto_imagem, descricao_fundo,
//         cta, hashtags). A posição do texto/logo é FIXA pelo layout
//         (não vem mais da IA). Ver Fluxo_Geracao_Post_REFERENCIA.md.
// false = tudo volta ao modo demo (nenhuma chamada de API).
// Promoção e Produto seguem SEMPRE em demo por enquanto.
// ============================================================
const MODO_REAL_NEGOCIO = true;

// LIGA/DESLIGA da IA de IMAGEM no post de Negócio (passo 3 da referência).
// true  = gera a imagem LIMPA (sem texto) a partir da descricao_fundo; o
//         texto e o logo continuam sendo aplicados por cima pelo código.
// false = a imagem volta ao placeholder demo (gradiente).
// Só tem efeito quando MODO_REAL_NEGOCIO também está ligado.
const MODO_REAL_IMAGEM_NEGOCIO = true;

// ============================================================
// PAINEL DE DESENVOLVEDOR — OCULTO DO CLIENTE, SÓ LEITURA
// Serve para ver COMO os prompts do último post de Negócio foram
// montados (hoje só se vê o resultado final).
//
// Só aparece quando a URL tem ?dev=<DEV_PALAVRA>. Sem esse parâmetro
// o painel nem entra na árvore da tela e NADA é capturado — para o
// cliente, absolutamente nada muda.
//
// Troque a palavra abaixo quando quiser (é só esta linha).
//
// NUNCA guarde nem exiba aqui chave de API ou variável de ambiente:
// as chaves ficam no servidor (/api/claude, /api/imagens) e não
// passam pelo app. Só entram neste espelho os campos listados em
// novoDebugNegocio().
// ============================================================
const DEV_PALAVRA = "bastidores";

const DEV_ON = (() => {
  try {
    return new URLSearchParams(window.location.search).get("dev") === DEV_PALAVRA;
  } catch (e) {
    console.error("Não consegui ler o parâmetro ?dev da URL:", e);
    return false;
  }
})();

// Bastidores do ÚLTIMO post de Negócio gerado. É um espelho de LEITURA:
// gerarPostNegocioReal cria o objeto e vai preenchendo os campos conforme
// as etapas acontecem — nada aqui participa da geração. Como o painel só
// é lido depois que a tela de resultado aparece, não precisa de estado
// nem de re-render.
let debugNegocio = null;

// Cria (e passa a ser o "último") registro de bastidores. Só é chamado
// quando o painel está ligado; com o painel desligado, debugNegocio
// continua null e nem memória é gasta.
function novoDebugNegocio() {
  debugNegocio = {
    promptPadrao: "",     // system — a parte igual para todos os clientes
    promptCliente: "",    // user — os dados deste cliente
    jsonCru: "",          // resposta crua do Claude, antes de extrairJSON
    promptImagem: "",     // prompt final enviado ao gerador de imagem
    corMarca: "",         // cor da marca usada no layout
    historicoTexto: "",   // bloco anti-repetição enviado ao Claude
    historicoCenas: [],   // cenas já usadas (só leitura; não vão à IA de imagem)
    msTexto: null,        // duração da chamada de texto
    msImagem: null,       // duração da chamada de imagem
    passo: "início",      // etapa em andamento (o painel mostra onde parou)
    erro: null,           // { mensagem, tipo, origem, passo, impacto, pilha, em }
    em: new Date(),
  };
  return debugNegocio;
}

function lerDebugNegocio() {
  return debugNegocio;
}

// Quantas linhas do stack o painel guarda: as primeiras já dizem onde quebrou,
// e o resto é ruído do React/navegador.
const PILHA_LINHAS = 5;

// Marca a etapa em andamento. Escreve no espelho de leitura e mais nada — com
// o painel desligado, debugNegocio é null e a função não faz nada.
function marcarPasso(passo) {
  if (debugNegocio) debugNegocio.passo = passo;
}

// Mascara qualquer coisa com cara de chave/token que apareça numa mensagem de
// erro. As chaves ficam no servidor e não passam pelo app, mas mensagem de erro
// de rede às vezes carrega URL com query — melhor cortar aqui do que confiar.
function limparSegredos(texto) {
  return String(texto || "")
    .replace(/\b(sk|pk|api[_-]?key|token|authorization|bearer)\b\s*[:=]?\s*\S+/gi, "$1 ***")
    .replace(/([?&](?:key|api_key|token|access_token)=)[^&\s]+/gi, "$1***");
}

// Nome da função do primeiro quadro do stack ("at gerarPostNegocioReal (...)").
// No build de produção os nomes são minificados — por isso o "Parou em" do
// painel vem do passo marcado, que continua legível.
function funcaoDoStack(stack) {
  const linha = String(stack || "").split("\n").find((l) => /\bat\s+\S/.test(l));
  const m = linha && linha.match(/at\s+([\w$.<>]+)/);
  return m ? m[1] : "";
}

// Registra a falha da última geração para o painel. NÃO altera o fluxo: quem
// chama já tratou o erro do seu jeito (fallback pro demo, placeholder da
// imagem) e só passa por aqui para deixar o rastro visível.
function registrarErroNegocio(e, impacto) {
  if (!DEV_ON) return;
  if (!debugNegocio) novoDebugNegocio(); // falhou antes de começar a registrar
  const pilha = String(e?.stack || "").split("\n").slice(0, PILHA_LINHAS).join("\n");
  debugNegocio.erro = {
    mensagem: limparSegredos(e?.message || e),
    tipo: e?.name || "Error",
    origem: funcaoDoStack(e?.stack) || debugNegocio.passo,
    passo: debugNegocio.passo,
    impacto,
    pilha: limparSegredos(pilha),
    em: new Date(),
  };
}

// ============================================================
// SEGUNDA CAMADA (OVERLAY) DO POST DE NEGÓCIO
// Layout FIXO copiado de layouts-post-facil.html (viewBox 1080×1350, 4:5).
// A imagem limpa da IA entra por baixo; esta camada gráfica entra por cima.
// A posição é FIXA e igual em feed (4:5) e stories (9:16):
//   • mensagem SEMPRE na faixa reservada de CIMA;
//   • onda decorativa + logo + CTA SEMPRE no rodapé (faixa reservada de BAIXO).
// A variação entre posts vem da CENA da imagem e da COR da marca — não da posição.
// ============================================================

// Cor da marca — UMA variável única que recolore a onda e o degradê.
// Fallback usado só quando o cliente ainda não tem cor extraída do logo.
const COR_MARCA_PADRAO = "#9B1129";

// Cor que o layout do post de Negócio usa (texto branco por cima): prefere a
// versão já ajustada para contraste; se só houver a original do cliente, ajusta
// na hora; senão cai no padrão. A extração/ajuste mora em cor.js.
function corDeLayout(profile) {
  if (profile?.corMarcaLayout) return profile.corMarcaLayout;
  if (profile?.corMarca) return escurecerParaContraste(profile.corMarca);
  return COR_MARCA_PADRAO;
}

// Medidas exatas do desenho (mesmos números do SVG de referência).
// Layout ÚNICO e fixo. Antes havia variantes A/B que alternavam a posição do
// logo; agora a posição é fixa, então sobrou só esta configuração (a antiga
// "B"): texto em cima, onda + logo + CTA no rodapé, degradê no topo.
const NEGOCIO = {
  onda: "M0,1350 L0,1336 C380,1306 780,1288 1080,1128 L1080,1350 Z", // onda na base
  grad: { y: 0, h: 365, stops: [[0, 0.82], [0.45, 0.38], [1, 0]] },   // degradê no topo (legibilidade do texto)
  logo: { bottom: 23 / 1350, right: 50 / 1080 },  // logo no rodapé, à direita (10px mais baixo que o desenho)
  texto: { pos: "cima", offset: 5.9 },            // baselines 150/248 → ~5,9% do topo
};

// ============================================================
// HISTÓRICO ANTI-REPETIÇÃO — POST DE NEGÓCIO
// Guarda, POR CLIENTE, um resumo curto (só texto, nunca a imagem)
// dos últimos posts, para que a próxima geração seja claramente
// diferente e o feed não fique repetitivo. Hoje mora no localStorage;
// quando migrar pro backend, só estas funções mudam.
// ============================================================
const HIST_NEG_MAX = 20; // guardamos só os últimos 20 posts do cliente

// Chave por cliente (nunca global), ancorada no identificador estável do
// cliente (clienteId) — a mesma âncora dos créditos/cota/config. Ver
// idCliente/chaveCliente em shared.jsx.
function chaveHistNegocio(profile) {
  return chaveCliente(profile, "pf_hist_neg_");
}

// Lê o histórico do cliente. Se algo falhar, registra e segue com [].
function lerHistoricoNegocio(profile) {
  try {
    const raw = localStorage.getItem(chaveHistNegocio(profile));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("Falha ao ler histórico do post de Negócio:", e);
    return [];
  }
}

// Registra o post recém-gerado e mantém só os últimos HIST_NEG_MAX
// (slice descarta o mais antigo). Se o salvamento falhar, registra o
// erro e SEGUE funcionando — nunca com catch vazio.
function registrarPostNegocio(profile, resumo) {
  try {
    const hist = lerHistoricoNegocio(profile);
    hist.push({ ...resumo, em: new Date().toISOString() });
    const ultimos = hist.slice(-HIST_NEG_MAX);
    localStorage.setItem(chaveHistNegocio(profile), JSON.stringify(ultimos));
  } catch (e) {
    console.error("Falha ao salvar histórico do post de Negócio:", e);
    // O post continua normalmente; só não fica registrado no histórico.
  }
}

// Etiqueta curta da cena que vai para o histórico. Usa o resumo_cena que a
// nossa IA devolve (rótulo de até 8 palavras); se vier vazio ou faltando, cai
// nas 12 primeiras palavras da descricao_fundo — reserva para o histórico
// nunca ficar sem cena, e nunca guardamos a descrição inteira.
function cenaParaHistorico(j) {
  const etiqueta = (j?.resumo_cena || "").trim();
  if (etiqueta) return etiqueta;
  const fundo = (j?.descricao_fundo || "").trim();
  return fundo ? fundo.split(/\s+/).slice(0, 12).join(" ") : "";
}

// Monta o trecho do prompt (texto) que leva o histórico à nossa IA, com
// a instrução explícita e o MOTIVO de variar. Vazio quando não há histórico.
function blocoHistoricoParaTexto(hist) {
  if (!hist.length) return "";
  const linhas = hist.map((h, i) =>
    // h.resumoCena é o campo ANTIGO (guardava a descricao_fundo inteira):
    // lido como reserva para os históricos já salvos no navegador do cliente
    // não virarem "-" até saírem da janela. Itens novos usam h.cena.
    `${i + 1}. Cena: ${h.cena || h.resumoCena || "-"} | Tema do texto: ${h.temaTexto || "-"}`
    + ` | Tom: ${h.tom || "-"} | Cor: ${h.corDestaque || "-"}`
  ).join("\n");
  return [
    "",
    "HISTÓRICO ANTI-REPETIÇÃO (últimos posts DESTE cliente, do mais antigo ao mais recente):",
    linhas,
    "MOTIVO: estas foram as últimas cenas e temas usados por este cliente; crie algo CLARAMENTE DIFERENTE das cenas e dos temas acima — outro assunto/cenário/enquadramento na imagem e outro ângulo de texto — para o feed dele não ficar repetitivo.",
  ].join("\n");
}

// Quebra o texto_imagem em até 2 linhas equilibradas (como no desenho).
function quebrarEmLinhas(txt) {
  const palavras = String(txt || "").trim().split(/\s+/).filter(Boolean);
  if (palavras.length <= 1) return palavras;
  let melhor = [palavras.join(" ")], menorDif = Infinity;
  for (let i = 1; i < palavras.length; i++) {
    const a = palavras.slice(0, i).join(" ");
    const b = palavras.slice(i).join(" ");
    const dif = Math.abs(a.length - b.length);
    if (dif < menorDif) { menorDif = dif; melhor = [a, b]; }
  }
  return melhor;
}

// ============================================================
// LANDING
// ============================================================
function Landing({ onStart, onLogoClick }) {
  return (
    <div style={{ minHeight: "100vh", background: "#F0F5FB", fontFamily: "Nunito,sans-serif" }}>
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxShadow: "0 2px 12px rgba(0,59,160,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onLogoClick}>
          <PostFacilLogo size={36} />
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg,#003BA0,#002D7A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Post Fácil</span>
        </div>
        <button onClick={onStart} style={{ padding: "8px 18px", background: "#003BA0", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Começar grátis →</button>
      </div>
      <div style={{ background: "linear-gradient(135deg,#003BA0,#002D7A)", padding: "52px 20px 60px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><PostFacilLogo size={96} /></div>
        <div style={{ fontFamily: "Nunito,sans-serif", fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1.2, maxWidth: 480, margin: "0 auto 14px" }}>Posts profissionais para o seu negócio em 1 clique</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: 600, maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.6 }}>Nossa IA cria legendas, hashtags e imagens para o Instagram do seu negócio.</div>
        <button onClick={onStart} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: "#003BA0", border: "none", borderRadius: 16, padding: "16px 36px", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,0.15)" }}>✨ Criar minha conta grátis</button>
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: 600 }}>Sem cartão de crédito · Começa em 2 minutos</div>
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 20px 0" }}>
        <div style={{ textAlign: "center", fontFamily: "Nunito,sans-serif", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Como funciona?</div>
        <div style={{ textAlign: "center", fontSize: 14, color: "#64748b", fontWeight: 600, marginBottom: 32 }}>Três passos simples para ter conteúdo todo dia</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 48 }}>
          {[
            { n: "1", icon: "⚙️", title: "Configure", desc: "Conte sobre seu negócio respondendo perguntas simples. Só uma vez." },
            { n: "2", icon: "🤖", title: "Gere com IA", desc: "Clique e nossa IA cria legenda, CTA e hashtags na hora." },
            { n: "3", icon: "📲", title: "Publique", desc: "Copie e cole no Instagram. Simples assim." },
          ].map((s) => (
            <div key={s.n} style={{ background: "white", borderRadius: 18, padding: "22px 16px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,59,160,0.08)" }}>
              <div style={{ width: 36, height: 36, background: "#003BA0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 15, margin: "0 auto 12px" }}>{s.n}</div>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg,#003BA0,#002D7A)", borderRadius: 24, padding: "36px 24px", textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "Nunito,sans-serif", fontSize: 22, fontWeight: 900, color: "white", marginBottom: 8 }}>Pronto para começar?</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginBottom: 24 }}>Configure em 2 minutos e gere seu primeiro post hoje</div>
          <button onClick={onStart} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: "#003BA0", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>🚀 Criar minha conta</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL — lembrete de logo ao tentar gerar post
// Aparece por sessão até o cliente enviar/criar o logo.
// Exceção: segmento "pessoal" nunca mostra este modal.
// ============================================================
function ModalLembreteLogo({ onContinuar, onLogoSalvo, onCriarComIA }) {
  const [view, setView] = useState("lembrete");
  const fileRef = useRef(null);

  function processarArquivo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    // Fundo removido no envio (uma vez só); se não der, segue o original.
    reader.onload = async () => {
      const r = await prepararLogoEnviado(reader.result);
      onLogoSalvo(r.url, r.semFundo, r.brilho);
    };
    reader.readAsDataURL(f);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,50,63,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "white", borderRadius: 24, padding: "32px 24px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 16px 48px rgba(0,59,160,0.18)", fontFamily: "Nunito,sans-serif" }}>
        {view === "lembrete" ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#16323F" }}>Seu post fica muito melhor com logo!</div>
            <div style={{ fontSize: 14, color: "#5C7686", lineHeight: 1.6, marginBottom: 24 }}>
              O logo entra nos seus posts e ajuda nossa IA a usar as cores e o estilo da sua marca. Seus posts ficam mais profissionais e reconhecíveis.
            </div>
            <button onClick={() => setView("opcoes")} style={{ width: "100%", padding: "15px", background: "#003BA0", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif", marginBottom: 10 }}>
              Criar logo
            </button>
            <button onClick={onContinuar} style={{ width: "100%", padding: "13px", background: "white", color: "#5C7686", border: "1.5px solid #E4EEF3", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
              Continuar sem logo
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#16323F" }}>Como quer criar seu logo?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "15px", background: "#003BA0", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                📤 Enviar imagem
              </button>
              <button onClick={onCriarComIA} style={{ width: "100%", padding: "15px", background: "white", color: "#003BA0", border: "2px solid #003BA0", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                ✨ Criar logo por nossa IA
              </button>
              <button onClick={() => setView("lembrete")} style={{ background: "none", border: "none", color: "#5C7686", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Nunito,sans-serif", marginTop: 4 }}>
                ← Voltar
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={processarArquivo} style={{ display: "none" }} />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD (HOME)
// Estrutura (de cima p/ baixo): cabeçalho → vitrine → saudação
// → 3 botões de post → faixa "Recursos extras" → banner Catálogo
// → banner Logo → rodapé → faixa verde final.
// Ver 01_DOCUMENTOS/Direcao_Home_Posicionamento.md
// ============================================================
const BOTOES_POST = [
  { ic: "✨", tipo: "negocio",  tt: "CRIAR POST DO MEU NEGÓCIO", ds: ["Imagem, legenda, seu logo, suas cores...", "Um post pensado pra você 👋"] },
  { ic: "📷", tipo: "produto",  tt: "CRIAR POST DO MEU PRODUTO", ds: ["Mande a foto ou vídeo do produto", "e deixa o resto com a gente 😉"] },
  { ic: "🔥", tipo: "promocao", tt: "CRIAR POST DE PROMOÇÃO",    ds: ["Informe a oferta. Nós criamos o post 🎯"] },
];

function Dashboard({ profile, onEdit, onLogoAtualizado }) {
  const prem = profile.plano === "premium";
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [tipoPendente, setTipoPendente] = useState(null);
  const [fluxoAtivo, setFluxoAtivo] = useState(null);

  const semLogo = !profile.logo;
  const ehPessoal = profile.tipo === "pessoal";
  const [showLogoOpcoes, setShowLogoOpcoes] = useState(false);
  const logoFileRef = useRef(null);
  const [toast, showToast] = useToast();

  // saudação motivacional (varia a cada abertura; usa o nome da pessoa)
  const [saud] = useState(() => saudacaoMotivacional(profile.nomePessoa));

  function logoEscolhido(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    // Fundo removido no envio (uma vez só); se não der, segue o original.
    reader.onload = async () => {
      const r = await prepararLogoEnviado(reader.result);
      onLogoAtualizado(r.url, r.semFundo, r.brilho);
      setShowLogoOpcoes(false);
    };
    reader.readAsDataURL(f);
  }

  // clique num dos 3 botões → (lembrete de logo, se preciso) → inicia o fluxo
  function tentarGerarPost(tipo) {
    const dismissido = sessionStorage.getItem("pf_logo_dismissed") === "1";
    if (semLogo && !ehPessoal && !dismissido) {
      setTipoPendente(tipo);
      setShowLogoModal(true);
      return;
    }
    setFluxoAtivo(tipo);
  }

  function dispensarModal() {
    sessionStorage.setItem("pf_logo_dismissed", "1");
    setShowLogoModal(false);
    if (tipoPendente) { setFluxoAtivo(tipoPendente); setTipoPendente(null); }
  }

  function logoSalvoDoModal(dataUrl, semFundo, brilho) {
    setShowLogoModal(false);
    onLogoAtualizado(dataUrl, semFundo, brilho);
    if (tipoPendente) { setFluxoAtivo(tipoPendente); setTipoPendente(null); }
  }

  // fluxo de geração ocupa a tela toda
  if (fluxoAtivo) {
    return <FluxoGeracao tipo={fluxoAtivo} profile={profile} onSair={() => setFluxoAtivo(null)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1FA", fontFamily: "Nunito,sans-serif", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* keyframes do logo flutuante na vitrine */}
      <style>{`
        @keyframes pfFloatLogo { 0%,100%{transform:translate(-50%,-34%);} 50%{transform:translate(-50%,-28%);} }
        @keyframes pfFloatShadow { 0%,100%{width:150px;opacity:.82;} 50%{width:168px;opacity:.95;} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 430, background: "#F0F5FB", minHeight: "100vh" }}>

        {/* 1. CABEÇALHO */}
        <div style={{ background: "#003BA0", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => setShowLogoOpcoes(true)} style={{ width: 44, height: 44, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", cursor: "pointer", flexShrink: 0 }}>
            {profile.logo ? (
              <img src={profile.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 3, boxSizing: "border-box" }} />
            ) : (
              <span style={{ fontSize: 20, fontWeight: 900, color: "#003BA0" }}>{(profile.nome && profile.nome[0] ? profile.nome[0] : "?").toUpperCase()}</span>
            )}
          </div>
          <div style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.1 }}>
            {profile.nome || "Meu negócio"}
            <br /><small style={{ fontWeight: 600, fontSize: 12, opacity: 0.9 }}>{profile.segmentoNome || "—"}</small>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <span onClick={onEdit} style={{ fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⚙️ Editar perfil</span>
            <span onClick={onEdit} style={{ fontSize: 18, fontWeight: 700, cursor: "pointer" }}>☰</span>
          </div>
        </div>

        {/* 2. VITRINE */}
        <div style={{ position: "relative", height: 300, background: "linear-gradient(180deg,#001a6e 0%,#002a8f 55%,#00329c 100%)", overflow: "hidden" }}>
          <div style={{ color: "#fff", padding: "10px 16px 0", fontWeight: 800, fontSize: 14, position: "relative", zIndex: 6 }}>← Voltar</div>
          {/* sombra retangular esfumaçada */}
          <div style={{ position: "absolute", left: "50%", top: "74%", transform: "translate(-50%,-50%)", width: 150, height: 34, borderRadius: 12, background: "rgba(0,3,16,.95)", filter: "blur(14px)", zIndex: 4, animation: "pfFloatShadow 3.6s ease-in-out infinite" }} />
          {/* logo Post Fácil flutuando */}
          <div style={{ position: "absolute", left: "50%", top: "30%", transform: "translate(-50%,-34%)", zIndex: 5, animation: "pfFloatLogo 3.6s ease-in-out infinite", filter: "drop-shadow(0 16px 20px rgba(0,8,40,.35))" }}>
            <img src={logoPostFacil} alt="Post Fácil" style={{ width: 200, height: 200, objectFit: "contain", display: "block" }} />
          </div>
          {/* corte branco arredondado (arco) na base */}
          <div style={{ position: "absolute", left: "-30%", bottom: -2, width: "160%", height: 150, background: "#F0F5FB", borderRadius: "50% 50% 0 0 / 100% 100% 0 0", zIndex: 3 }} />
        </div>
        <div style={{ textAlign: "center", color: "#003BA0", fontWeight: 800, fontSize: 18, position: "relative", zIndex: 6, marginTop: -46 }}>Postar nunca foi tão fácil! ✨</div>

        {/* 3. SAUDAÇÃO MOTIVACIONAL (card branco) */}
        <div style={{ padding: "20px 20px 4px" }}>
          <div style={{ width: "80%", margin: "0 auto", boxSizing: "border-box", background: "#fff", borderRadius: 18, padding: "18px 22px", textAlign: "center", boxShadow: "0 4px 16px rgba(0,59,160,0.07)" }}>
            <div style={{ color: "#16323F", fontSize: 18, fontWeight: 900, lineHeight: 1.35 }}>
              <span style={{ fontSize: 20 }}>{saud.emoji}</span> {saud.titulo}
            </div>
            <div style={{ color: "#16323F", fontSize: 14, fontWeight: 700, marginTop: 4 }}>{saud.sub}</div>
          </div>
        </div>

        {prem && <div style={{ padding: "0 20px" }}><QuotaBar profile={profile} /></div>}

        {/* 4. OS 3 BOTÕES DE CRIAR POST (texto de apoio ABAIXO de cada botão) */}
        <div style={{ padding: "40px 20px 26px" }}>
          {BOTOES_POST.map((b) => (
            <div key={b.tipo} style={{ marginBottom: 30 }}>
              <button onClick={() => tentarGerarPost(b.tipo)} style={{ width: "80%", margin: "0 auto", background: "#003BA0", color: "#fff", border: "none", borderRadius: 18, padding: "20px 22px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, boxShadow: "0 8px 20px rgba(0,59,160,.22)", fontFamily: "Nunito,sans-serif" }}>
                <span style={{ fontSize: 32, flexShrink: 0 }}>{b.ic}</span>
                <span style={{ fontWeight: 900, fontSize: 17, lineHeight: 1.2, textAlign: "center" }}>{b.tt}</span>
              </button>
              <div style={{ textAlign: "center", color: "#16323F", fontWeight: 700, fontSize: 13, lineHeight: 1.45, marginTop: 12, padding: "0 8px" }}>
                {b.ds.map((l, i) => <span key={i} style={{ display: "block" }}>{l}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* 5. FAIXA "RECURSOS EXTRAS" */}
        <div style={{ background: "#8FD420", padding: "10px 20px", textAlign: "center", color: "#003BA0", fontWeight: 800, fontSize: 14 }}>
          Recursos extras para o seu negócio:
        </div>

        {/* 6 e 7. BANNERS (Catálogo e Logo) — a imagem inteira é o botão */}
        <div style={{ padding: "22px 20px 8px" }}>
          <img src={bannerCatalogo} onClick={() => showToast("🛍️ Catálogo Prático chega em breve!")} alt="Catálogo Prático" style={{ width: "100%", display: "block", borderRadius: 18, cursor: "pointer", marginBottom: 24, boxShadow: "0 6px 20px rgba(0,59,160,.10)" }} />
          <img src={bannerLogo} onClick={() => showToast("🎨 Criar Logo chega em breve!")} alt="Criar Logo para o meu negócio" style={{ width: "100%", display: "block", borderRadius: 18, cursor: "pointer", boxShadow: "0 6px 20px rgba(0,59,160,.10)" }} />
        </div>

        {/* 8. RODAPÉ */}
        <div style={{ textAlign: "center", padding: "30px 24px 18px" }}>
          <div style={{ color: "#16323F", fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>Seu próximo cliente pode estar<br />esperando seu próximo post.</div>
          <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 10px" }}>
            <img src={logoPostFacil} alt="Post Fácil" style={{ width: 72, height: 72, objectFit: "contain", display: "block" }} />
          </div>
          <div style={{ color: "#003BA0", fontSize: 14, fontWeight: 800 }}>Postar nunca foi tão fácil!</div>
        </div>

        {/* 9. FAIXA VERDE-LIMÃO FINAL */}
        <div style={{ background: "#8FD420", height: 24 }} />
      </div>

      {showLogoModal && (
        <ModalLembreteLogo
          onContinuar={dispensarModal}
          onLogoSalvo={logoSalvoDoModal}
          onCriarComIA={() => { setShowLogoModal(false); }}
        />
      )}

      <input ref={logoFileRef} type="file" accept="image/*" onChange={logoEscolhido} style={{ display: "none" }} />
      {showLogoOpcoes && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,50,63,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "28px 24px", maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 16px 48px rgba(0,59,160,0.18)", fontFamily: "Nunito,sans-serif" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🖼️</div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 20, color: "#16323F" }}>{profile.logo ? "Trocar logo" : "Adicionar logo"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={() => logoFileRef.current?.click()} style={{ width: "100%", padding: "15px", background: "#003BA0", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                📤 Enviar imagem
              </button>
              <button onClick={() => setShowLogoOpcoes(false)} style={{ width: "100%", padding: "15px", background: "white", color: "#003BA0", border: "2px solid #003BA0", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>
                ✨ Criar logo por nossa IA
              </button>
              <button onClick={() => setShowLogoOpcoes(false)} style={{ background: "none", border: "none", color: "#5C7686", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Nunito,sans-serif", marginTop: 4 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ============================================================
// FLUXO DE GERAÇÃO DE POST  (Seções 3, 4, 5, 9, 10, 11)
// Máquina de etapas: [campos] → modal Feed/Stories → carregamento
// → resultado. "Meu Negócio" começa direto no modal.
// A geração em si (texto+imagem) é a Fase 2 (APIs no servidor);
// aqui montamos o fluxo completo com um resultado de demonstração.
// ============================================================
const GEN_FONT = "Nunito,sans-serif";

function FluxoGeracao({ tipo, profile, onSair }) {
  const [etapa, setEtapa] = useState(tipo === "negocio" ? "modal" : "campos");
  const [campos, setCampos] = useState({});
  const [formato, setFormato] = useState(null);
  const [resultado, setResultado] = useState(null);

  function gerar(fmt) {
    const usar = fmt || formato;
    setFormato(usar);
    setEtapa("loading");

    // Geração REAL de texto — só no post de Negócio e só quando ligada.
    // A imagem continua vindo do placeholder demo (não chamamos a IA de imagem).
    if (MODO_REAL_NEGOCIO && tipo === "negocio") {
      gerarPostNegocioReal(profile)
        .then((real) => setResultado(real))
        .catch((e) => {
          registrarErroNegocio(e, "o post inteiro caiu no modo demonstração");
          // Se a nossa IA falhar, cai no demo pra não travar a tela.
          console.error("Geração real falhou, usando demo:", e);
          setResultado(montarResultadoDemo({ tipo, profile, campos }));
        })
        .finally(() => {
          incPostCreditos(profile);
          setEtapa("resultado");
        });
      return;
    }

    // Modo demo (Promoção, Produto e Negócio com a geração real desligada).
    setTimeout(() => {
      setResultado(montarResultadoDemo({ tipo, profile, campos }));
      incPostCreditos(profile);
      setEtapa("resultado");
    }, 2800);
  }

  function fecharModal() {
    if (tipo === "negocio") onSair();
    else setEtapa("campos");
  }

  function novaVersao() {
    if (!podeGerarPost(profile)) return; // após os 92 do mês, aguardar recarga
    gerar(formato);
  }

  if (etapa === "campos" && tipo === "promocao")
    return <CamposPromocao valores={campos} onVoltar={onSair} onGerar={(c) => { setCampos(c); setEtapa("modal"); }} />;
  if (etapa === "campos" && tipo === "produto")
    return <CamposProduto valores={campos} onVoltar={onSair} onGerar={(c) => { setCampos(c); setEtapa("modal"); }} />;
  if (etapa === "loading")
    return <TelaCarregamento />;
  if (etapa === "resultado")
    return <TelaResultado tipo={tipo} profile={profile} campos={campos} formato={formato} resultado={resultado} onNovaVersao={novaVersao} onSair={onSair} />;
  // etapa "modal"
  return (
    <div style={{ minHeight: "100vh", background: "#EEF1FA", fontFamily: GEN_FONT, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#F0F5FB", minHeight: "100vh" }} />
      <ModalFeedStories onEscolher={(f) => gerar(f)} onFechar={fecharModal} />
    </div>
  );
}

// resultado de demonstração (Fase 2 substitui pela geração real)
function montarResultadoDemo({ tipo, profile, campos }) {
  const nomeNeg = profile.nome || "seu negócio";
  const seg = profile.segmentoNome || "";
  let legenda, destaque, sub;
  if (tipo === "promocao") {
    destaque = (campos.promocao || "Oferta especial").toUpperCase();
    sub = campos.prazo ? `🔥 ${campos.prazo}` : "🔥 Aproveite!";
    legenda = `${campos.promocao || "Promoção especial"}! ${campos.prazo ? campos.prazo + ". " : ""}${campos.condicao ? campos.condicao + ". " : ""}Corre que é por tempo limitado aqui na ${nomeNeg}! 🔥`;
  } else if (tipo === "produto") {
    destaque = (campos.produtoNome || campos.produto || nomeNeg).toUpperCase();
    sub = "✨ Novidade!";
    legenda = `${campos.produtoNome ? campos.produtoNome + ": " : ""}${campos.produto || "nosso produto"} feito com carinho pra você! ${campos.info ? campos.info + ". " : ""}Vem conferir na ${nomeNeg}. 😍`;
  } else {
    destaque = nomeNeg.toUpperCase();
    sub = "💙 Feito pra você";
    legenda = `Na ${nomeNeg} a gente capricha em cada detalhe pra você! Qualidade e carinho em tudo que fazemos. Conta com a gente. 💙`;
  }
  const tag = (s) => "#" + (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const hashtags = [tag(seg), tag(nomeNeg), "#post", "#instagram"].filter((h) => h.length > 1).join(" ");
  // Diretriz 2: alternar a posição do logo entre execuções
  const cantos = ["tl", "tr", "bl", "br"];
  const canto = cantos[Math.floor(Math.random() * cantos.length)];
  return { legenda, hashtags, destaque, sub, canto };
}

// ============================================================
// GERAÇÃO REAL DE TEXTO — POST DE NEGÓCIO
// Segue Fluxo_Geracao_Post_REFERENCIA.md: a nossa IA "pensa em tudo
// primeiro" e devolve UM JSON com as 6 partes. Aqui só a parte de TEXTO
// é usada; a imagem continua sendo o placeholder demo (a IA de imagem
// ainda não é chamada). A descricao_fundo NUNCA é mostrada ao cliente.
// ============================================================

// Localiza o segmento (com suas perguntas) pelo id salvo na ficha.
function acharSegmento(segmentoId) {
  for (const grupo of Object.values(DADOS)) {
    if (grupo.direto && grupo.direto.id === segmentoId) return grupo.direto;
    for (const cat of grupo.categorias || [])
      for (const seg of cat.segmentos || [])
        if (seg.id === segmentoId) return seg;
  }
  return null;
}

// Monta o bloco "Pergunta → Resposta" do onboarding (respostas são 1-based).
function montarPerguntasRespostas(profile) {
  const seg = acharSegmento(profile.segmentoId);
  const perguntas = seg?.perguntas || [];
  const respostas = profile.respostas || {};
  return perguntas
    .map((p, i) => {
      const r = (respostas[i + 1] || "").trim();
      return r ? `- ${p.q}\n  Resposta: ${r}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

// Sorteia um item de uma lista (usado para variar a cena da imagem).
const escolherAleatorio = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Normaliza hashtags (aceita array ou string) numa linha "#a #b #c".
function normalizarHashtags(hashtags) {
  const arr = Array.isArray(hashtags) ? hashtags : String(hashtags || "").split(/\s+/);
  return arr
    .map((h) => String(h).trim())
    .filter(Boolean)
    .map((h) => (h.startsWith("#") ? h : "#" + h.replace(/^#+/, "")))
    .join(" ");
}

// Extrai o objeto JSON da resposta da IA, mesmo se vier com texto/cercas ```.
function extrairJSON(texto) {
  const t = String(texto || "");
  const ini = t.indexOf("{");
  const fim = t.lastIndexOf("}");
  if (ini === -1 || fim === -1 || fim < ini) throw new Error("Resposta sem JSON.");
  return JSON.parse(t.slice(ini, fim + 1));
}

async function gerarPostNegocioReal(profile) {
  const nomeNeg = profile.nome || "o negócio";
  const seg = acharSegmento(profile.segmentoId);
  const segNome = profile.segmentoNome || seg?.nome || "";
  const tons = (profile.tons || []).join(", ") || "não informado";
  const qa = montarPerguntasRespostas(profile);
  const cores = (profile.analiseLogo?.coresPrincipais || []).join(", ");
  const estiloLogo = profile.analiseLogo?.estilo || "";

  // Histórico anti-repetição DESTE cliente (últimos posts). Lido antes de
  // chamar a nossa IA para orientá-la a criar algo diferente.
  const hist = lerHistoricoNegocio(profile);

  // Espelho de leitura para o painel de desenvolvedor. Fora do modo ?dev
  // fica null e nenhuma linha abaixo faz nada. Nada aqui altera a geração.
  const dbg = DEV_ON ? novoDebugNegocio() : null;

  const system = [
    "Você é o diretor de arte do Post Fácil, um app que cria posts profissionais de Instagram para pequenos negócios brasileiros.",
    "Você PENSA A PEÇA INTEIRA DE UMA VEZ (imagem, texto da imagem e legenda nascem do mesmo raciocínio, coerentes entre si).",
    "",
    "Responda SEMPRE em português do Brasil e APENAS com um JSON válido, sem texto antes ou depois, sem cercas de código. O JSON tem exatamente estas chaves:",
    '- "legenda": legenda do post para o Instagram, calorosa e profissional, coerente com o texto_imagem.',
    '- "texto_imagem": texto CURTO (poucas palavras, cabe em até 2 linhas) que será aplicado por cima da imagem.',
    '- "descricao_fundo": descrição do cenário para a IA de imagem, em UMA ÚNICA FRASE CORRIDA de NO MÁXIMO 100 PALAVRAS (não use listas, tópicos nem várias frases). A descrição deve COMEÇAR pelo enquadramento. É PROIBIDO usar as palavras "fechado", "close", "close-up" ou "plano médio fechado". Em cenas COM PESSOAS, o enquadramento deve ser "plano americano" ou "plano aberto" (nunca "plano médio", que é da cintura para cima e deixa a cabeça alta demais), com a pessoa afastada da câmera e espaço vazio acima da cabeça; "plano médio" só é permitido em cenas SEM PESSOAS. SEM texto/letras/palavras na cena. Descreva uma FOTOGRAFIA REAL (não ilustração/desenho/3D), de preferência com pessoas reais, com astral positivo e acolhedor, e faça a cena ALUDIR ao texto_imagem (imagem e texto conversam). Em cenas SEM PESSOAS, o assunto principal fica CENTRALIZADO (no miolo da imagem). Em cenas COM PESSOAS, é PROIBIDO escrever que o produto, o objeto ou as mãos ficam "centralizados", "no meio" ou "no centro da imagem": quem ocupa a faixa central é o ROSTO, e o produto aparece logo ABAIXO do rosto, na altura do peito ou do balcão — a frase precisa dizer isso de forma explícita. O topo e a base ficam calmos, com fundo neutro e desfocado. Uso interno.',
    '- "resumo_cena": etiqueta CURTA de NO MÁXIMO 8 PALAVRAS que identifica o TIPO de cena da descricao_fundo, para servir de memória entre posts. É um RÓTULO, não uma descrição: sem enquadramento, sem luz, sem adjetivos de estilo. Exemplos: "cliente escolhendo capinha em expositor giratório", "técnico consertando notebook na bancada", "entrega de pacote na porta". Uso interno.',
    '- "cta": chamada para ação curta.',
    '- "hashtags": array de 4 a 6 hashtags do segmento (sem espaços dentro de cada uma).',
    "",
    "DIRETRIZES OBRIGATÓRIAS:",
    "A. A imagem recebe uma camada gráfica por cima: uma faixa colorida e um texto grande cobrem os 20% do topo e os 20% da base. Por isso a descricao_fundo DEVE manter o assunto principal inteiramente no miolo (60% centrais) e descrever o topo e a base como áreas calmas — fundo neutro, desfocado, sem elementos importantes.",
    "B. Tom profissional que impressione: use na descricao_fundo termos como iluminação profissional, composição cuidada, aparência premium, foco nítido, cores harmoniosas.",
    "C. VARIE A CENA a cada post: mude cenário, ângulo, enquadramento e composição na descricao_fundo. Evite repetir o mesmo clichê (ex.: não caia sempre em \"xícara sobre balcão de madeira\"). Mantenha sempre a fidelidade ao segmento e à identidade do negócio.",
    "D. ESTILO REALISTA POR PADRÃO: a descricao_fundo descreve uma FOTO REAL, com pessoas reais quando fizer sentido, nunca ilustração/desenho/3D. EXCEÇÃO guiada pelo tema: assuntos infantis ou lúdicos/festivos/fantasiosos (festa de criança, brinquedos, produtos de bebê, doces infantis) PODEM pedir ilustração/desenho quando combinar melhor com o post — é exceção, não regra geral.",
    "",
    "REGRAS: NUNCA invente produtos/serviços que o cliente não informou. A descricao_fundo é interna e nunca é mostrada ao cliente. Ao se referir à IA nos textos ao cliente, diga \"nossa IA\".",
  ].join("\n");

  // Bloco do histórico anti-repetição que entra no prompt (vazio no 1º post).
  // Extraído para uma constante só para o painel poder mostrá-lo à parte.
  const blocoHist = blocoHistoricoParaTexto(hist);

  const user = [
    "Gere UM post de Instagram para este negócio.",
    "",
    `Negócio: ${nomeNeg}`,
    `Segmento: ${segNome}`,
    `Tom de comunicação (até 2): ${tons}`,
    cores ? `Cores da marca: ${cores}` : "",
    estiloLogo ? `Estilo do logo: ${estiloLogo}` : "",
    "",
    "Respostas do onboarding do cliente:",
    qa || "(sem respostas registradas)",
    blocoHist,
    "",
    "Lembre-se: mantenha o assunto centralizado no miolo, deixe o topo e a base calmos, e varie a cena a cada post. Responda só com o JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  marcarPasso("montagem do prompt do texto");
  if (dbg) {
    dbg.promptPadrao = system;
    dbg.promptCliente = user;
    dbg.historicoTexto = blocoHist;
    dbg.corMarca = corDeLayout(profile);
  }

  marcarPasso("chamada do texto (Claude)");
  const t0Texto = performance.now();
  const texto = await gerarTexto(system, user, 3000);
  if (dbg) {
    dbg.msTexto = Math.round(performance.now() - t0Texto);
    dbg.jsonCru = texto;   // cru, exatamente como veio (antes de extrairJSON)
  }
  marcarPasso("leitura do JSON");
  const j = extrairJSON(texto);

  // Passo 3 da referência: a IA de imagem gera a imagem LIMPA (sem texto),
  // recebendo só a descricao_fundo. A camada gráfica (onda, logo e texto) é
  // aplicada por cima pelo overlay de layout fixo (TelaResultado). Falha aqui
  // NÃO derruba o post: sem imagem, cai no placeholder demo (gradiente).
  // As cenas já usadas NÃO vão à IA de imagem (gerador não entende negação:
  // descrever a cena indesejada faz ele reproduzi-la). A anti-repetição é
  // feita no Claude; aqui a lista serve só para o painel de desenvolvedor.
  const historicoCenas = hist.map((h) => h.cena || h.resumoCena).filter(Boolean);
  const { imagem, promptImagem, msImagem } =
    await gerarImagemLimpaNegocio(j);

  if (dbg) {
    dbg.promptImagem = promptImagem;
    dbg.msImagem = msImagem;
    dbg.historicoCenas = historicoCenas;
  }

  // A posição do texto e do logo é FIXA pelo desenho — não vem da IA e não
  // alterna mais entre posts.

  // Registra este post no histórico anti-repetição (só texto, nunca a imagem)
  // para orientar as próximas gerações deste cliente.
  marcarPasso("montagem final");
  registrarPostNegocio(profile, {
    cena: cenaParaHistorico(j),
    temaTexto: [(j.texto_imagem || "").trim(), (j.cta || "").trim()].filter(Boolean).join(" · "),
    tom: tons,
    corDestaque: corDeLayout(profile),
  });

  // Mapeia o JSON real para o formato que a TelaResultado já sabe exibir.
  // descricao_fundo NÃO é exibida ao cliente (regra de negócio).
  marcarPasso("concluído");
  return {
    legenda: (j.legenda || "").trim(),
    hashtags: normalizarHashtags(j.hashtags),
    destaque: (j.texto_imagem || "").trim(),
    sub: (j.cta || "").trim(),
    overlay: "negocio",
    imagem,
  };
}

// Gera a imagem de fundo LIMPA (sem texto) a partir da descricao_fundo.
// A composição é FIXA: o assunto fica no miolo (60% centrais) e as faixas de
// topo e base ficam calmas, porque uma camada gráfica (faixa colorida + logo +
// texto grande) será aplicada por cima delas. Retorna
// { imagem, resumoCena, promptImagem, msImagem }: imagem é null se falhar ou se
// a IA de imagem estiver desligada (a tela usa o placeholder demo), resumoCena
// alimenta o histórico anti-repetição do cliente, e promptImagem/msImagem
// existem só para o painel de desenvolvedor ler (quem gera o post os ignora).
async function gerarImagemLimpaNegocio(j) {
  const fundo = (j.descricao_fundo || "").trim();

  // A IA de imagem é "sem memória" e converge para a mesma cena a cada chamada.
  // Sorteamos ângulo, composição e luz para forçar variação real entre gerações,
  // mantendo o segmento e a identidade do negócio. O ENQUADRAMENTO não é sorteado:
  // ele é decidido só pela descricao_fundo (que sabe se há pessoas na cena) — dois
  // donos para a mesma decisão faziam o sorteio contradizer a regra de composição.
  const angulo = escolherAleatorio([
    "ângulo baixo (contra-plongée)", "vista de cima (flat lay)", "à altura dos olhos",
    "vista em três quartos", "plano aberto do ambiente",
  ]);
  const composicao = escolherAleatorio([
    "regra dos terços", "composição centralizada e simétrica",
    "linhas diagonais dinâmicas", "sujeito em foco com fundo desfocado (bokeh)",
  ]);
  const luz = escolherAleatorio([
    "luz natural de janela", "luz quente de fim de tarde",
    "iluminação de estúdio suave", "manhã clara e arejada",
  ]);

  // Resumo curto da cena desta geração (só texto) — alimenta o histórico.
  const resumoCena = fundo
    ? `${fundo} — ${angulo}, ${composicao}, ${luz}`
    : "";

  // IA de imagem desligada ou sem descrição: sem imagem, mas devolvemos o
  // resumo (ainda útil para o histórico anti-repetição do texto).
  if (!MODO_REAL_IMAGEM_NEGOCIO || !fundo)
    return { imagem: null, resumoCena, promptImagem: "", msImagem: null };

  const temaMensagem = (j.texto_imagem || "").trim();

  marcarPasso("montagem do prompt da imagem");
  const prompt = [
    // Regra de composição em PRIMEIRO lugar, antes da cena: o gerador segue
    // melhor o que lê primeiro. Explica o MOTIVO (a camada gráfica que entra
    // por cima) e usa linguagem de fotografia em vez de porcentagens.
    "COMPOSIÇÃO (regra mais importante, vale acima de qualquer outra parte desta descrição): enquadre em PLANO ABERTO ou PLANO MÉDIO, NUNCA em close-up. Câmera afastada, com espaço vazio generoso acima da cabeça: se houver pessoas, o topo da cabeça começa por volta de um terço da altura da imagem, e o rosto inteiro — do topo da cabeça ao queixo — fica no miolo, folgado. O terço de cima e a faixa de baixo da imagem mostram APENAS ambiente: teto, parede, céu, prateleira desfocada, balcão, chão, fundo neutro e desfocado — sem rostos, sem cabeças, sem o produto principal, sem detalhe fino nem contraste forte. MOTIVO: sobre a faixa de cima será aplicada uma faixa escura com a frase do post, e sobre a faixa de baixo o logo da marca e a chamada para ação; qualquer rosto ou elemento importante nessas áreas será coberto e o post fica perdido. A imagem é limpa: SEM TEXTO, SEM LETRAS, SEM PALAVRAS, sem números e sem logotipos.",
    fundo,
    // Estilo: fotografia REAL por padrão; ilustração só como exceção guiada pelo tema.
    "ESTILO OBRIGATÓRIO: fotografia REAL (foto de verdade), de preferência com pessoas reais, com astral positivo e acolhedor. NÃO use ilustração, desenho, arte digital, 3D ou render. EXCEÇÃO: quando o tema for infantil ou lúdico/festivo/fantasioso (festa de criança, brinquedos, produtos de bebê, doces infantis), a imagem PODE ser ilustração ou desenho se combinar melhor com o universo do post — é uma exceção guiada pelo tema, não uma liberação geral; fora desses casos, mantenha a foto realista.",
    // A cena deve conversar com a mensagem que entra por cima (imagem e texto aludem-se).
    temaMensagem
      ? `A cena deve ALUDIR à mensagem que será aplicada por cima: "${temaMensagem}". Imagem e texto conversam — sem escrever esse texto nem qualquer palavra na cena.`
      : "",
    `Variação obrigatória desta geração: ${angulo}; ${composicao}; ${luz}.`,
    "Crie uma CENA DIFERENTE das anteriores — outro cenário, ângulo, enquadramento e composição — mantendo o mesmo segmento e a identidade do negócio.",
    "A imagem continua limpa: SEM TEXTO, SEM LETRAS, SEM PALAVRAS, sem números e sem logotipos.",
    "Qualidade profissional: iluminação cuidada, composição harmoniosa, aparência premium, foco nítido.",
  ].join(" ");

  // Post é retrato tanto no feed (4:5) quanto no stories (9:16).
  const size = "1024x1536";

  marcarPasso("chamada da imagem");
  const t0 = performance.now();
  try {
    const imagem = await gerarImagem(prompt, size);
    return { imagem, resumoCena, promptImagem: prompt, msImagem: Math.round(performance.now() - t0) };
  } catch (e) {
    registrarErroNegocio(e, "só a imagem caiu no placeholder; o texto do post foi gerado");
    console.error("Geração de imagem falhou, usando placeholder:", e);
    // Mesmo falhando devolvemos o prompt e o tempo: é justamente o caso em
    // que o painel de desenvolvedor precisa mostrar o que foi enviado.
    return { imagem: null, resumoCena, promptImagem: prompt, msImagem: Math.round(performance.now() - t0) };
  }
}

// ---- Recurso de mídia compartilhado (Seção 11) ----
function MediaUpload({ midia, onMidia }) {
  const ref = useRef(null);
  function escolher(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = (f.type || "").startsWith("video");
    const r = new FileReader();
    r.onload = () => onMidia({ url: r.result, isVideo });
    r.readAsDataURL(f);
  }
  return (
    <div>
      {midia ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 150, height: 150, borderRadius: 16, margin: "0 auto", overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,.2)", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {midia.isVideo
              ? <video src={midia.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
              : <img src={midia.url} alt="mídia" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
          </div>
          <span onClick={() => ref.current?.click()} style={{ color: "#003BA0", fontWeight: 800, fontSize: 13, marginTop: 12, cursor: "pointer", display: "inline-block" }}>🔄 Trocar mídia</span>
        </div>
      ) : (
        <div onClick={() => ref.current?.click()} style={{ border: "2px dashed #003BA0", borderRadius: 18, padding: "34px 16px", textAlign: "center", background: "#EAF1FB", cursor: "pointer" }}>
          <div style={{ fontSize: 44 }}>📤</div>
          <div style={{ color: "#003BA0", fontWeight: 900, fontSize: 16, marginTop: 10 }}>Toque para adicionar</div>
          <div style={{ color: "#5C7686", fontSize: 12, marginTop: 6, lineHeight: 1.4 }}>Foto ou vídeo do seu celular</div>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*,video/*" onChange={escolher} style={{ display: "none" }} />
    </div>
  );
}

// pedaços de formulário reutilizados nas telas de campos
function VoltarLimpo({ onClick }) {
  return <div onClick={onClick} style={{ color: "#003BA0", padding: "14px 16px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>← Voltar</div>;
}
function CampoTexto({ label, opcional, ajuda, valor, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: 38 }}>
      <span style={{ fontSize: 15, fontWeight: 900, color: "#16323F", marginBottom: 4, display: "block" }}>
        {label} {opcional && <span style={{ fontSize: 12, fontWeight: 700, color: "#8Fb14d" }}>(Opcional)</span>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#003BA0", margin: "4px 0 10px", display: "block", lineHeight: 1.4 }}>{ajuda}</span>
      <input type="text" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", boxSizing: "border-box", padding: 14, border: "1.5px solid #cdd9ea", borderRadius: 14, fontSize: 15, fontFamily: GEN_FONT, color: "#16323F", background: "#fff", outline: "none" }} />
    </div>
  );
}
function BtnCriarPost({ onClick, desabilitado }) {
  return (
    <div style={{ margin: "12px 20px 0" }}>
      <button onClick={onClick} disabled={desabilitado}
        style={{ width: "100%", background: desabilitado ? "#C2D2DB" : "#003BA0", color: "#fff", border: "none", padding: 18, borderRadius: 16, fontWeight: 900, fontSize: 17, cursor: desabilitado ? "default" : "pointer", boxShadow: desabilitado ? "none" : "0 6px 18px rgba(0,59,160,.3)", fontFamily: GEN_FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        ✨ Criar meu post
      </button>
    </div>
  );
}

// ---- Tela de campos: PROMOÇÃO (Seção 9) ----
function CamposPromocao({ valores, onVoltar, onGerar }) {
  const [promocao, setPromocao] = useState(valores.promocao || "");
  const [prazo, setPrazo] = useState(valores.prazo || "");
  const [condicao, setCondicao] = useState(valores.condicao || "");
  const [querMidia, setQuerMidia] = useState(valores.querMidia || false);
  const [midia, setMidia] = useState(valores.midia || null);
  const pode = promocao.trim() && prazo.trim();

  const opt = (sel) => ({ flex: 1, textAlign: "center", padding: 13, border: "1.5px solid " + (sel ? "#003BA0" : "#cdd9ea"), borderRadius: 14, fontSize: 14, fontWeight: 800, color: sel ? "#fff" : "#5C7686", cursor: "pointer", background: sel ? "#003BA0" : "#fff" });

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1FA", fontFamily: GEN_FONT, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#F0F5FB", minHeight: "100vh", paddingBottom: 40 }}>
        <VoltarLimpo onClick={onVoltar} />
        <div style={{ textAlign: "center", padding: 24, minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ color: "#003BA0", fontSize: 26, fontWeight: 900, lineHeight: 1.3 }}>Pra sua promoção ficar<br />do seu jeito 😊</h2>
          <p style={{ color: "#5A9E1B", fontSize: 15, fontWeight: 800, marginTop: 32, lineHeight: 1.6 }}>Responda essas 4 perguntinhas,<br />é bem rapidinho!</p>
        </div>
        <div style={{ padding: "6px 20px 8px" }}>
          <CampoTexto label="Qual promoção você tem em mente?" ajuda="Exemplo: Compre 1 leve 2, Toda loja com até 50% de desconto..." valor={promocao} onChange={setPromocao} placeholder="Escreva sua promoção aqui" />
          <CampoTexto label="Até quando vale a promoção?" ajuda="Exemplo: Só hoje, até domingo, enquanto durar os estoques..." valor={prazo} onChange={setPrazo} placeholder="Escreva o prazo aqui" />
          <CampoTexto label="Tem alguma condição?" opcional ajuda="Exemplo: Só no delivery, somente pagamento à vista..." valor={condicao} onChange={setCondicao} placeholder="Escreva a condição (se tiver)" />
          <div style={{ marginBottom: 38 }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#16323F", marginBottom: 4, display: "block" }}>Quer enviar uma foto ou vídeo do produto em promoção?</span>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <div onClick={() => setQuerMidia(true)} style={opt(querMidia)}>Sim</div>
              <div onClick={() => { setQuerMidia(false); setMidia(null); }} style={opt(!querMidia)}>Não precisa</div>
            </div>
            {querMidia && <div style={{ marginTop: 14 }}><MediaUpload midia={midia} onMidia={setMidia} /></div>}
          </div>
        </div>
        <BtnCriarPost desabilitado={!pode} onClick={() => onGerar({ promocao, prazo, condicao, querMidia, midia })} />
      </div>
    </div>
  );
}

// ---- Tela de campos: MEU PRODUTO (Seção 10) — mídia primeiro ----
function CamposProduto({ valores, onVoltar, onGerar }) {
  const [midia, setMidia] = useState(valores.midia || null);
  const [produto, setProduto] = useState(valores.produto || "");
  const [produtoNome, setProdutoNome] = useState(valores.produtoNome || "");
  const [info, setInfo] = useState(valores.info || "");
  const pode = produto.trim() && midia;

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1FA", fontFamily: GEN_FONT, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#F0F5FB", minHeight: "100vh", paddingBottom: 40 }}>
        <VoltarLimpo onClick={onVoltar} />
        <div style={{ textAlign: "center", padding: 24, minHeight: 230, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <h2 style={{ color: "#003BA0", fontSize: 26, fontWeight: 900, lineHeight: 1.3 }}>Vamos criar um post<br />com o seu produto! 📸</h2>
          <p style={{ color: "#5A9E1B", fontSize: 15, fontWeight: 800, marginTop: 26, lineHeight: 1.6 }}>É rapidinho: mande a mídia<br />e responda 2 perguntinhas!</p>
        </div>
        <div style={{ padding: "6px 20px 8px" }}>
          <div style={{ marginBottom: 38 }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#16323F", textAlign: "center", marginBottom: 14 }}>Envie a foto ou vídeo do seu produto</div>
            <MediaUpload midia={midia} onMidia={setMidia} />
          </div>
          <CampoTexto label="O que é o produto?" ajuda="Exemplo: Torta de chocolate com recheio de coco. / Tênis esportivo..." valor={produto} onChange={setProduto} placeholder="Descreva seu produto" />
          <CampoTexto label="Qual o nome do produto?" opcional ajuda="Exemplo: Torta Prestígio / NIKE Shot" valor={produtoNome} onChange={setProdutoNome} placeholder="Nome do produto (se tiver)" />
          <CampoTexto label="Tem algo que você gostaria de informar no post?" opcional ajuda="Exemplo: Aceitamos encomendas / 10X sem juros no cartão..." valor={info} onChange={setInfo} placeholder="Escreva aqui (se tiver)" />
        </div>
        <BtnCriarPost desabilitado={!pode} onClick={() => onGerar({ produto, produtoNome, info, midia })} />
      </div>
    </div>
  );
}

// ---- Modal "Feed ou Stories?" (Seção 3) — formatos visuais reais ----
function ModalFeedStories({ onEscolher, onFechar }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onFechar(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,20,60,.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20, fontFamily: GEN_FONT }}>
      <div style={{ background: "#fff", borderRadius: 22, padding: "28px 22px", width: "100%", maxWidth: 350, textAlign: "center", position: "relative" }}>
        <span onClick={onFechar} style={{ position: "absolute", top: 14, right: 18, fontSize: 22, color: "#5C7686", cursor: "pointer", fontWeight: 700 }}>✕</span>
        <h3 style={{ color: "#003BA0", fontSize: 20, fontWeight: 900, marginBottom: 6 }}>Onde você vai postar?</h3>
        <div style={{ color: "#5C7686", fontSize: 12, marginBottom: 22 }}>Escolha o formato do seu post</div>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => onEscolher("feed")} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 96, height: 120, borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 11, background: "linear-gradient(135deg,#f09433,#dc2743,#bc1888)" }}>4:5</div>
            <div style={{ fontWeight: 900, color: "#003BA0", fontSize: 15 }}>Feed</div>
            <div style={{ fontSize: 11, color: "#5C7686", marginTop: -6 }}>quadrado alto</div>
          </div>
          <div onClick={() => onEscolher("stories")} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ width: 75, height: 133, borderRadius: 10, boxShadow: "0 4px 12px rgba(0,0,0,.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 11, background: "linear-gradient(135deg,#003BA0,#0066ff)" }}>9:16</div>
            <div style={{ fontWeight: 900, color: "#003BA0", fontSize: 15 }}>Stories</div>
            <div style={{ fontSize: 11, color: "#5C7686", marginTop: -6 }}>tela cheia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Tela de carregamento (Seção 4.1) — SEM "IA" ----
// Segue tela-espera-post-facil.html: as frases entram uma por vez, de cima
// para baixo; a da vez cresce, fica azul e um brilho corre por cima dela;
// depois de PASSO_ESPERA volta ao normal e ganha o check.
// A animação NUNCA segura o resultado: quem manda é o FluxoGeracao — assim
// que a geração termina ele troca de etapa e esta tela é desmontada no meio
// da sequência. A frase final ("Gerando seu post completo...") é o estado de
// espera para quando a geração demora mais que a sequência inteira.
const PASSO_ESPERA = 2500; // 2,5s por frase

// Cada frase pode ser só texto ou [texto, complemento em cinza menor].
const BLOCOS_ESPERA = [
  {
    titulo: "ANALISANDO...",
    cor: "azul",
    frases: [
      "Dados do seu negócio",
      "Histórico de Posts",
      "Informações exclusivas",
      ["Identidade visual", " (a sua cara)"],
    ],
  },
  {
    titulo: "CRIANDO POR VOCÊ:...",
    cor: "verde",
    frases: [
      "Tema do Post de hoje",
      "Criativos do Post",
      "Descrevendo a Imagem",
      "Legenda inteligente",
      ["# Hashtags", " (Post será visto)"],
      ["Turbinando o algoritmo", " (mais alcance)"],
    ],
  },
];

// Lista achatada: cada frase guarda a que bloco pertence, para o título do
// bloco aparecer junto da primeira frase dele.
const LINHAS_ESPERA = BLOCOS_ESPERA.flatMap((b, bi) =>
  b.frases.map((f) => ({
    texto: Array.isArray(f) ? f[0] : f,
    par: Array.isArray(f) ? f[1] : "",
    cor: b.cor,
    bloco: bi,
  }))
);

function TelaCarregamento() {
  // passo = índice da frase ativa. Ao chegar em LINHAS_ESPERA.length todas
  // estão marcadas e a frase final entra girando.
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setPasso((p) => {
        if (p >= LINHAS_ESPERA.length) {
          clearInterval(t);
          return p;
        }
        return p + 1;
      });
    }, PASSO_ESPERA);
    return () => clearInterval(t);
  }, []);

  const fim = passo >= LINHAS_ESPERA.length;

  return (
    <div className="pf-esp-tela" style={{ fontFamily: GEN_FONT }}>
      <style>{`
        /* position:fixed em vez de 100dvh: o app não tem reset de CSS, então o
           body fica com a margem padrão de 8px do navegador — com altura de
           tela cheia o documento passava 16px do viewport e dava pra rolar.
           Ancorado no viewport, a tela é exatamente a tela e o logo cai no
           centro horizontal de verdade. */
        .pf-esp-tela{
          position:fixed; inset:0;
          background:#FFFFFF; overflow:hidden;
          display:flex; flex-direction:column; align-items:center;
          padding:clamp(4px,1.4vh,18px) 10px clamp(6px,1.8vh,22px);
        }
        /* o logo fica centralizado; só os blocos e a frase final vão à direita */
        .pf-esp-conteudo{ width:100%; max-width:430px; padding-left:clamp(24px,9vw,56px); padding-right:4px; }

        /* logo original do app (mesmo PNG e mesmo efeito de sombra da vitrine
           da Home), aqui sobre fundo branco: a sombra é um borrão separado,
           que acompanha o sobe-e-desce do logo. */
        .pf-esp-logo{
          position:relative;
          width:clamp(84px,24vw,124px); height:clamp(84px,24vw,124px);
          margin:clamp(0px,.6vh,12px) 0 clamp(12px,3vh,32px);
          flex:0 0 auto;
        }
        .pf-esp-marca{
          position:absolute; left:0; top:0; width:100%; height:100%;
          object-fit:contain; display:block; z-index:2;
          filter:drop-shadow(0 12px 16px rgba(0,8,40,.22));
          animation:pfEspFlutua 3.6s ease-in-out infinite;
        }
        /* o desenho dentro do PNG está 1% da largura à direita do centro do
           arquivo (sobra 38px à esquerda e 30px à direita no canvas 400x400);
           o -1% aqui devolve o logo ao centro óptico da tela. */
        @keyframes pfEspFlutua{
          0%,100%{transform:translate(-1%,0)}
          50%{transform:translate(-1%,-12px)}
        }
        .pf-esp-sombra{
          position:absolute; left:calc(50% - 1%); bottom:-12px;
          width:72%; height:16px; border-radius:12px;
          transform:translateX(-50%);
          background:rgba(0,45,122,.30); filter:blur(11px); z-index:1;
          animation:pfEspSombra 3.6s ease-in-out infinite;
        }
        @keyframes pfEspSombra{
          0%,100%{width:72%;opacity:.85}
          50%{width:82%;opacity:.55}
        }

        .pf-esp-bloco{ width:100%; margin-bottom:clamp(6px,2vh,26px); }
        .pf-esp-titulo{
          font-size:19px; font-weight:800; color:#243642; letter-spacing:.3px;
          margin-bottom:clamp(3px,1vh,14px);
          opacity:0; transform:translateY(6px);
        }
        .pf-esp-titulo.on{ animation:pfEspEntra .5s ease forwards; }

        /* camada de fora: entrada. camada de dentro: crescimento.
           separadas porque a animação com fill forwards venceria o transform
           da classe e o crescimento nunca aconteceria. */
        .pf-esp-linha{ padding:clamp(1px,.6vh,9px) 0; opacity:0; transform:translateX(-10px); }
        .pf-esp-linha.on{ animation:pfEspEntra .45s ease forwards; }
        /* max-width 78%: o crescimento é transform, que NÃO entra no cálculo de
           largura — sem esse teto o texto era diagramado em 100% e depois
           esticado para fora da tela. 78% x 1,22 = 95%, então a frase é
           quebrada já pensando no tamanho grande e o parêntese desce sozinho
           para a linha de baixo só quando não cabe. */
        .pf-esp-int{
          display:flex; align-items:center; gap:12px;
          font-size:17px; color:#243642; max-width:78%;
          transform-origin:left center; transition:transform .35s ease, color .35s ease;
        }
        .pf-esp-linha.ativa .pf-esp-int{ transform:scale(1.22); font-weight:700; color:#003BA0; }
        .pf-esp-linha.ativa .pf-esp-par{ color:#003BA0; opacity:.75; }
        /* nowrap: se o parêntese descer, desce inteiro — nunca parte no meio */
        .pf-esp-par{ color:#8A9AA6; font-size:14px; font-weight:400; display:inline-block; white-space:nowrap; }

        .pf-esp-check{
          width:26px; height:26px; border-radius:7px; flex:0 0 auto; box-sizing:border-box;
          display:flex; align-items:center; justify-content:center;
          border:2px solid #cdd9e5; background:#fff;
          color:#fff; font-size:15px; font-weight:800;
          transition:all .25s ease;
        }
        .pf-esp-check.feito{ animation:pfEspPop .4s ease; }
        .pf-esp-check.feito.azul{ background:#8FB7F0; border-color:#8FB7F0; }
        .pf-esp-check.feito.verde{ background:#2FA84F; border-color:#2FA84F; }
        @keyframes pfEspPop{ 0%{transform:scale(.5)} 60%{transform:scale(1.25)} 100%{transform:scale(1)} }

        /* brilho correndo por cima da frase ativa */
        .pf-esp-texto{ position:relative; overflow:hidden; }
        .pf-esp-linha.ativa .pf-esp-texto::after{
          content:""; position:absolute; top:0; left:-60%; width:50%; height:100%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.85),transparent);
          animation:pfEspBrilho 1.2s ease-in-out infinite;
        }
        @keyframes pfEspBrilho{ from{left:-60%} to{left:120%} }
        @keyframes pfEspEntra{ to{opacity:1;transform:none} }

        .pf-esp-final{
          width:100%; margin-top:clamp(1px,.8vh,8px);
          font-size:19px; font-weight:800; color:#243642;
          opacity:0; animation:pfEspEntra .5s ease forwards;
          display:flex; align-items:center; justify-content:center; gap:11px;
        }
        .pf-esp-spin{
          width:20px; height:20px; flex:0 0 auto; box-sizing:border-box;
          border:3px solid #cdd9e5; border-top-color:#003BA0; border-radius:50%;
          animation:pfEspGira .8s linear infinite;
        }
        @keyframes pfEspGira{ to{transform:rotate(360deg)} }
        .pf-esp-final-txt{ animation:pfEspPulsa 1.6s ease-in-out .5s infinite; }
        @keyframes pfEspPulsa{ 0%,100%{opacity:1} 50%{opacity:.55} }

        /* telas baixas: aperta os espaços primeiro — o tamanho das frases e o
           crescimento nunca mudam. Só abaixo de 600px de altura o logo cede. */
        @media (max-height:700px){
          .pf-esp-linha{ padding:1px 0; }
          .pf-esp-bloco{ margin-bottom:6px; }
          .pf-esp-titulo{ margin-bottom:3px; }
          .pf-esp-logo{ margin-bottom:10px; }
        }
        @media (max-height:600px){
          .pf-esp-logo{ width:74px; height:74px; margin:0 0 8px; }
          .pf-esp-linha{ padding:0; }
        }
      `}</style>

      <div className="pf-esp-logo">
        <div className="pf-esp-sombra" />
        <img className="pf-esp-marca" src={logoPostFacil} alt="Post Fácil" />
      </div>

      <div className="pf-esp-conteudo">
        {BLOCOS_ESPERA.map((b, bi) => {
          const primeira = LINHAS_ESPERA.findIndex((l) => l.bloco === bi);
          return (
            <div className="pf-esp-bloco" key={bi}>
              <div className={"pf-esp-titulo" + (passo >= primeira ? " on" : "")}>{b.titulo}</div>
              {LINHAS_ESPERA.map((l, i) =>
                l.bloco !== bi ? null : (
                  <div key={i} className={"pf-esp-linha" + (passo >= i ? " on" : "") + (passo === i ? " ativa" : "")}>
                    <div className="pf-esp-int">
                      <span className={"pf-esp-check " + l.cor + (passo > i ? " feito" : "")}>{passo > i ? "✓" : ""}</span>
                      <span className="pf-esp-texto">
                        {l.texto}
                        {l.par && <span className="pf-esp-par">{l.par}</span>}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          );
        })}

        {fim && (
          <div className="pf-esp-final">
            <span className="pf-esp-spin" />
            <span className="pf-esp-final-txt">Gerando seu post completo...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Segunda camada (overlay) do post de Negócio — LAYOUT FIXO (Seção 5) ----
// Reproduz layouts-post-facil.html: a onda e o degradê (SVG, recoloridos pela
// cor da marca) entram por baixo; o cartão do logo e o texto grande (HTML, sem
// distorção em 4:5 nem 9:16) entram por cima, nas posições fixas do desenho.
// As medidas em cqi acompanham a LARGURA do card (o container precisa de
// containerType: "inline-size").
function OverlayNegocio({ cor, logo, logoBrilho, destaque, sub }) {
  const L = NEGOCIO;
  const linhas = quebrarEmLinhas(destaque);
  const gid = "pfgrad-neg";
  const cta = String(sub || "").trim();

  // Contorno que descola o logo do fundo: drop-shadow segue o canal alfa, então
  // acompanha o desenho em vez de desenhar um retângulo. Sem deslocamento (0 0)
  // para cercar o logo por inteiro, em duas camadas — uma fechada, que marca a
  // silhueta, e uma aberta, que espalha de leve. Logo escuro sumia na faixa
  // escura da marca e ganha halo BRANCO; logo claro ganha sombra PRETA. Logo
  // antigo (sem a marcação) cai no halo branco, o lado seguro do problema.
  // O halo BRANCO estava forte demais e foi reduzido 25% duas vezes (alfas
  // x0,75 e x0,75 de novo: .95 -> .71 -> .53 e .70 -> .53 -> .40). Os raios de
  // desfoque não mudaram — quem controla a força é o alfa; mexer no raio
  // mudaria o tamanho do halo, não a força.
  const contornoLogo = logoBrilho === "claro"
    ? "drop-shadow(0 0 0.3cqi rgba(0,0,0,.55)) drop-shadow(0 0 1.1cqi rgba(0,0,0,.40))"
    : "drop-shadow(0 0 0.3cqi rgba(255,255,255,.53)) drop-shadow(0 0 1.1cqi rgba(255,255,255,.40))";

  // Área do logo: quadrado de 222/1080 = 20,56% da largura (222×222 no viewBox
  // 1080×1350). Caixa transparente — o logo é desenhado direto sobre a imagem.
  // box-sizing border-box para o padding NÃO somar à largura (o app não tem
  // reset global de box-sizing); assim a área fica exatamente em 20,56cqi, sem
  // escala extra. O padding de 2cqi continua: é ele que define o tamanho final
  // do desenho do logo (~16,56cqi), o mesmo de sempre.
  const ladoLogo = (222 / 1080) * 100; // ~20.56% da largura
  const posLogo = {
    position: "absolute", boxSizing: "border-box",
    width: ladoLogo + "cqi", height: ladoLogo + "cqi",
  };
  if (L.logo.top != null) posLogo.top = L.logo.top * 100 + "%";
  if (L.logo.bottom != null) posLogo.bottom = L.logo.bottom * 100 + "%";
  if (L.logo.left != null) posLogo.left = L.logo.left * 100 + "%";
  if (L.logo.right != null) posLogo.right = L.logo.right * 100 + "%";

  // Faixa do texto (cima ou baixo), ancorada na borda com o offset do desenho.
  const boxTexto = {
    position: "absolute", left: 0, right: 0,
    [L.texto.pos === "cima" ? "top" : "bottom"]: L.texto.offset + "%",
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center", padding: "0 6%", pointerEvents: "none",
  };

  return (
    <>
      {/* onda do rodapé recolorida pela cor da marca; o degradê do topo é
          PRETO FIXO — ele existe só para dar leitura à frase do post, e um
          preto neutro funciona sobre qualquer foto e com qualquer marca. */}
      <svg viewBox="0 0 1080 1350" preserveAspectRatio="none"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            {L.grad.stops.map(([off, op], k) => (
              <stop key={k} offset={off} stopColor="#000000" stopOpacity={op} />
            ))}
          </linearGradient>
        </defs>
        <rect x="0" y={L.grad.y} width="1080" height={L.grad.h} fill={`url(#${gid})`} />
        <path d={L.onda} fill={cor} />
      </svg>

      {/* logo do cliente (ou "LOGO" de exemplo) direto sobre a imagem, SEM
          cartão atrás — nem no fallback. A caixa aqui só posiciona e reserva o
          espaço; nada de fundo, borda ou sombra retangular. */}
      <div style={{ ...posLogo, padding: "2cqi",
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
        {logo
          ? <img src={logo} alt="logo" style={{
              width: "100%", height: "100%", objectFit: "contain",
              // Vale para TODO logo, inclusive o que manteve o fundo original:
              // ali o contorno cerca o quadrado do fundo, que é justamente o
              // que separa esse quadrado da imagem do post.
              filter: contornoLogo,
            }} />
          : <span style={{ color: "#fff", fontWeight: 700, fontSize: "3.15cqi", letterSpacing: "0.15em",
                           textShadow: "0 0.2cqi 0.5cqi rgba(0,0,0,.55)" }}>LOGO</span>}
      </div>

      {/* texto grande na faixa reservada, com a sombra difusa do desenho.
          font-size 88/1080=8,15cqi; entrelinha 98/88=1,11; letter-spacing -1. */}
      <div style={boxTexto}>
        {linhas.map((linha, k) => (
          <div key={k} style={{
                color: "#fff", fontWeight: 900, fontSize: "8.15cqi", lineHeight: 1.11,
                letterSpacing: "-0.09cqi",
                textShadow: "0 0.5cqi 1.2cqi rgba(0,0,0,.62), 0 0.2cqi 0.5cqi rgba(0,0,0,.5)",
                fontFamily: "'Arial Black','Helvetica Neue',system-ui,sans-serif" }}>
            {linha}
          </div>
        ))}
      </div>

      {/* CTA curto no rodapé, à ESQUERDA do logo. Fica ACIMA da onda
          (nunca por cima dela) e CENTRADO no vão livre que vai da margem
          esquerda até a lateral da área do logo. A caixa é a faixa desse vão;
          a pílula translúcida (que garante leitura sobre qualquer imagem) é
          centralizada dentro dela. Só aparece quando há CTA. */}
      {cta && (
        <div style={{
          position: "absolute",
          // A onda sobe da esquerda (y≈1336) para a direita (y≈1250 no fim do
          // vão). Base em 1200/1350 deixa ~50px de respiro entre a pílula e a onda.
          bottom: (150 / 1350) * 100 + "%",
          left: (50 / 1080) * 100 + "%",    // mesma margem lateral do logo
          right: (316 / 1080) * 100 + "%",  // para na lateral do logo, com folga (~44px)
          display: "flex", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            maxWidth: "100%",
            padding: "1.7cqi 2.8cqi", borderRadius: "3cqi",
            background: "rgba(0,0,0,.42)", boxShadow: "0 0.4cqi 1cqi rgba(0,0,0,.35)",
            color: "#fff", fontWeight: 800, fontSize: "3.4cqi", lineHeight: 1.15,
            textAlign: "center",
          }}>
            {cta}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// PAINEL DE DESENVOLVEDOR (só leitura) — ver ?dev= no topo do arquivo.
// Mostra como os prompts do último post de Negócio foram montados.
// Renderiza SOMENTE os campos de debugNegocio, um a um, escolhidos à mão:
// nunca o profile inteiro, nunca import.meta.env, nunca chave de API.
// Não tem nenhum campo de edição — é leitura e cópia.
// ============================================================

// Formata uma duração para leitura ("3,2 s (3218 ms)").
function formatarMs(ms) {
  if (ms == null) return "—";
  return (ms / 1000).toFixed(1).replace(".", ",") + " s (" + ms + " ms)";
}

// Junta as duas camadas do prompt do Claude, identificadas, para dar
// o "prompt completo" numa cópia só.
function montarPromptCompleto(d) {
  return [
    "===== CAMADA 1 · SYSTEM (padrão, igual para todos os clientes) =====",
    d.promptPadrao || "(vazio)",
    "",
    "===== CAMADA 2 · USER (dados deste cliente) =====",
    d.promptCliente || "(vazio)",
  ].join("\n");
}

// Um bloco recolhível com o conteúdo em monoespaçado e botão de copiar.
function BlocoDev({ titulo, conteudo, onCopiar }) {
  const [aberto, setAberto] = useState(false);
  const texto = conteudo || "(vazio)";
  return (
    <div style={{ border: "1px solid #2c3a4d", borderRadius: 10, marginBottom: 8, overflow: "hidden", background: "#0f172a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px" }}>
        <span onClick={() => setAberto(!aberto)} style={{ flex: 1, cursor: "pointer", color: "#cbd5e1", fontWeight: 800, fontSize: 12, lineHeight: 1.3 }}>
          {aberto ? "▾" : "▸"} {titulo}
        </span>
        <button
          onClick={() => onCopiar(texto)}
          style={{ border: "1px solid #3b4a5f", background: "#1e293b", color: "#93c5fd", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: GEN_FONT, flexShrink: 0 }}
        >
          📋 Copiar
        </button>
      </div>
      {aberto && (
        <pre style={{ margin: 0, padding: "10px 12px", borderTop: "1px solid #2c3a4d", color: "#e2e8f0", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 320, overflowY: "auto", fontFamily: "ui-monospace,Menlo,Consolas,monospace" }}>
          {texto}
        </pre>
      )}
    </div>
  );
}

function PainelDev() {
  const [aberto, setAberto] = useState(false); // recolhido por padrão
  const [toast, showToast] = useToast();
  const d = lerDebugNegocio();

  const copiar = (texto) =>
    doCopy(texto, () => showToast("📋 Copiado!"), () => showToast("Não consegui copiar 😕"));

  const caixa = { margin: "40px 20px 0", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 14, padding: 12 };
  const cabecalho = { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "#93c5fd", fontWeight: 900, fontSize: 13 };

  if (!d) {
    return (
      <div style={caixa}>
        <div style={{ ...cabecalho, cursor: "default" }}>🛠️ Painel do desenvolvedor</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
          Nenhum post de Negócio gerado nesta sessão ainda. Gere um post de Negócio
          para ver aqui como os prompts foram montados.
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    );
  }

  const totalMs = (d.msTexto || 0) + (d.msImagem || 0);
  const tempos = [
    "Texto (Claude): " + formatarMs(d.msTexto),
    "Imagem: " + formatarMs(d.msImagem),
    "Total das chamadas: " + formatarMs(totalMs || null),
  ].join("\n");

  const corEHistorico = [
    "Cor da marca usada no layout: " + (d.corMarca || "—"),
    "",
    "Bloco do histórico anti-repetição enviado ao Claude:",
    d.historicoTexto || "(nenhum — primeiro post deste cliente)",
    "",
    "Cenas já usadas por este cliente (NÃO são enviadas à IA de imagem):",
    d.historicoCenas.length
      ? d.historicoCenas.map((c, i) => `(${i + 1}) ${c}`).join("\n")
      : "(nenhuma)",
  ].join("\n");

  // Erro da última geração. Só chega aqui o que já foi tratado no fluxo (o
  // fallback continua igual); este bloco existe para o erro não sumir no
  // console. Sem chave de API: registrarErroNegocio mascara antes de guardar.
  const erro = d.erro
    ? [
        "Mensagem: " + (d.erro.mensagem || "(sem mensagem)"),
        "Tipo: " + d.erro.tipo,
        "Onde: " + d.erro.origem,
        "Parou em: " + d.erro.passo,
        "Impacto: " + d.erro.impacto,
        "Quando: " + d.erro.em.toLocaleTimeString("pt-BR"),
        "",
        `Stack (primeiras ${PILHA_LINHAS} linhas):`,
        d.erro.pilha || "(sem stack)",
      ].join("\n")
    : "(nenhum)";

  return (
    <div style={caixa}>
      <div onClick={() => setAberto(!aberto)} style={cabecalho}>
        <span>{aberto ? "▾" : "▸"}</span>
        <span style={{ flex: 1 }}>🛠️ Painel do desenvolvedor — último post de Negócio</span>
        <span style={{ color: "#64748b", fontWeight: 700, fontSize: 11 }}>só leitura</span>
      </div>

      {aberto && (
        <div style={{ marginTop: 12 }}>
          <BlocoDev titulo="1 · Prompt padrão (system) — igual para todos os clientes" conteudo={d.promptPadrao} onCopiar={copiar} />
          <BlocoDev titulo="2 · Dados deste cliente (user) — a camada que varia" conteudo={d.promptCliente} onCopiar={copiar} />
          <BlocoDev titulo="3 · Prompt completo enviado ao Claude (as duas camadas)" conteudo={montarPromptCompleto(d)} onCopiar={copiar} />
          <BlocoDev titulo="4 · JSON cru devolvido pelo Claude" conteudo={d.jsonCru} onCopiar={copiar} />
          <BlocoDev titulo="5 · Prompt final enviado ao gerador de imagem" conteudo={d.promptImagem} onCopiar={copiar} />
          <BlocoDev titulo="6 · Cor da marca e histórico anti-repetição" conteudo={corEHistorico} onCopiar={copiar} />
          <BlocoDev titulo="7 · Tempo de cada chamada" conteudo={tempos} onCopiar={copiar} />
          <BlocoDev titulo="8 · Erro da última geração" conteudo={erro} onCopiar={copiar} />
          <div style={{ color: "#475569", fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
            Visível só com ?dev na URL. Nenhuma chave de API passa pelo app — elas ficam no servidor.
          </div>
        </div>
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ---- Tela de resultado (Seção 5) + card WhatsApp (Seção 7) ----
function TelaResultado({ tipo, profile, campos, formato, resultado, onNovaVersao, onSair }) {
  const [toast, showToast] = useToast();
  const r = resultado || {};
  const aspect = formato === "stories" ? "9 / 16" : "4 / 5";
  const midia = campos?.midia;
  const cantoPos = {
    tl: { top: 12, left: 12 }, tr: { top: 12, right: 12 },
    bl: { bottom: 12, left: 12 }, br: { bottom: 12, right: 12 },
  }[r.canto || "br"];

  // Post de Negócio real → camada gráfica de LAYOUT FIXO (OverlayNegocio),
  // que alterna entre as variantes A/B. Demais posts (demo) mantêm o texto
  // centralizado/no canto como antes.
  const usarOverlay = r.overlay === "negocio";
  const zt = r.zonaTexto;
  const temFundo = !!(midia || r.imagem);
  const textoBox = zt
    ? {
        position: "absolute", left: 0, right: 0,
        [zt.posicao === "superior" ? "top" : "bottom"]: 0,
        height: zt.alturaPct + "%",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "#fff", textAlign: "center", padding: "12px 20px",
        background: temFundo
          ? `linear-gradient(${zt.posicao === "superior" ? "to bottom" : "to top"}, rgba(0,0,0,.42), rgba(0,0,0,0))`
          : "transparent",
      }
    : {
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        color: "#fff", textAlign: "center", padding: 20,
        background: temFundo ? "rgba(0,0,0,.28)" : "transparent",
      };

  function copiar() {
    doCopy(`${r.legenda}\n\n${r.hashtags}`, () => showToast("📋 Legenda copiada!"), () => showToast("Não consegui copiar 😕"));
  }
  function baixar() {
    showToast("⬇️ Download disponível na versão final ✨");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EEF1FA", fontFamily: GEN_FONT, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, background: "#F0F5FB", minHeight: "100vh", paddingTop: 10, paddingBottom: 40 }}>
        <div style={{ padding: "8px 16px 0" }}>
          <span onClick={onSair} style={{ color: "#003BA0", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>← Início</span>
        </div>

        {/* título */}
        <div style={{ textAlign: "center", padding: "16px 16px 0" }}>
          <h2 style={{ color: "#003BA0", fontSize: 24, fontWeight: 900 }}>Seu post está pronto! 🎉</h2>
          <p style={{ color: "#5C7686", fontSize: 13, marginTop: 4 }}>Feito com a cara da sua marca</p>
        </div>

        {/* card do post */}
        <div style={{ margin: "18px 20px", background: "#fff", borderRadius: 18, boxShadow: "0 6px 20px rgba(0,59,160,.12)", overflow: "hidden" }}>
          <div style={{ width: "100%", aspectRatio: aspect, background: "linear-gradient(135deg,#ffd89b,#ff6b6b 60%,#c0392b)", position: "relative", overflow: "hidden", containerType: "inline-size" }}>
            {/* fundo LIMPO da nossa IA (post de Negócio); a camada gráfica entra por cima */}
            {r.imagem && <img src={r.imagem} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            {midia && (midia.isVideo
              ? <video src={midia.url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
              : <img src={midia.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />)}
            {usarOverlay ? (
              <OverlayNegocio cor={corDeLayout(profile)} logo={profile.logo} logoBrilho={profile.logoBrilho} destaque={r.destaque} sub={r.sub} />
            ) : (
              <>
                <div style={textoBox}>
                  <div style={{ fontSize: 34, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.4)", lineHeight: 1.05 }}>{r.destaque}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10, background: "rgba(0,0,0,.25)", padding: "5px 14px", borderRadius: 20 }}>{r.sub}</div>
                </div>
                {profile.logo && (
                  <div style={{ position: "absolute", ...cantoPos, width: 46, height: 46, borderRadius: 10, background: "#fff", padding: 4, boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
                    {/* mesma regra do overlay: sombra só no logo sem fundo */}
                    <img src={profile.logo} alt="logo" style={{
                      width: "100%", height: "100%", objectFit: "contain",
                      filter: profile.logoSemFundo ? "drop-shadow(0 1px 2px rgba(0,0,0,.3))" : "none",
                    }} />
                  </div>
                )}
              </>
            )}
          </div>
          <div style={{ padding: 16, fontSize: 13, color: "#16323F", lineHeight: 1.6, borderTop: "1px solid #eef" }}>
            {r.legenda}
            <span style={{ color: "#003BA0", fontWeight: 700, marginTop: 8, display: "block", fontSize: 12 }}>{r.hashtags}</span>
          </div>
        </div>

        {/* ações principais */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "24px 20px 0" }}>
          <button onClick={copiar} style={{ padding: 15, borderRadius: 14, fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", background: "#003BA0", color: "#fff", boxShadow: "0 3px 10px rgba(0,59,160,.25)", fontFamily: GEN_FONT }}>📋 Copiar legenda</button>
          <button onClick={baixar} style={{ padding: 15, borderRadius: 14, fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", background: "#003BA0", color: "#fff", boxShadow: "0 3px 10px rgba(0,59,160,.25)", fontFamily: GEN_FONT }}>⬇️ Baixar imagem</button>
        </div>

        {/* gerar outra versão + contador */}
        <div style={{ textAlign: "center", margin: "28px 20px 0" }}>
          <span onClick={onNovaVersao} style={{ color: "#003BA0", fontWeight: 800, fontSize: 15, cursor: "pointer" }}>🔄 Gerar outra versão</span>
          <span style={{ display: "block", marginTop: 8, color: "#5C7686", fontSize: 12, fontWeight: 600, lineHeight: 1.5, padding: "0 6px" }}>{mensagemCreditos(profile)}</span>
        </div>

        {/* card do WhatsApp */}
        <CardWhatsApp profile={profile} />

        {/* painel do desenvolvedor: só existe com ?dev=<palavra> na URL */}
        {DEV_ON && <PainelDev />}

        {toast && <Toast msg={toast} />}
      </div>
    </div>
  );
}

// ---- Card do envio diário no WhatsApp (Seção 7) ----
function CardWhatsApp({ profile }) {
  const [cfg, setCfg] = useState(() => getWppConfig(profile));
  const [modo, setModo] = useState(() => (getWppConfig(profile).ativo ? "selo" : "convite")); // convite | ajustes | selo
  const [hora, setHora] = useState(cfg.hora || "09:00");
  const [formato, setFormato] = useState(cfg.formato || "alternar");

  const fopt = (val, sel) => ({ flex: 1, textAlign: "center", padding: "15px 4px", border: "1.5px solid " + (sel ? "#25A244" : "#cde9a0"), borderRadius: 12, fontSize: 12, fontWeight: 800, color: sel ? "#fff" : "#5C7686", cursor: "pointer", background: sel ? "#25A244" : "#fff", lineHeight: 1.3 });
  const labelFormato = { sempreFeed: "Sempre Feed", sempreStories: "Sempre Stories", alternar: "Alternando Feed/Stories" };

  function confirmar() {
    const novo = { ativo: true, hora, formato };
    saveWppConfig(profile, novo);
    setCfg(novo);
    setModo("selo");
  }

  if (modo === "selo") {
    return (
      <div onClick={() => setModo("ajustes")} style={{ margin: "40px 20px 0", background: "#e9f9ee", border: "1px solid #25A244", borderRadius: 14, padding: "14px 16px", fontSize: 13, color: "#1a7a3f", fontWeight: 800, textAlign: "center", cursor: "pointer" }}>
        ✅ Envio diário ativo às {cfg.hora} · {labelFormato[cfg.formato] || "Alternando Feed/Stories"}
        <span style={{ display: "block", fontWeight: 600, fontSize: 11, marginTop: 2 }}>toque para ajustar</span>
      </div>
    );
  }

  return (
    <div style={{ margin: "40px 20px 0", background: "#fff", borderRadius: 22, padding: "34px 24px 28px", textAlign: "center", boxShadow: "0 8px 28px rgba(0,0,0,.10)" }}>
      <style>{`@keyframes wavedown{0%,100%{transform:translateY(0) rotate(-6deg);}50%{transform:translateY(-10px) rotate(6deg);}}`}</style>
      <div style={{ fontSize: 60, marginBottom: 12 }}>💬📅</div>
      <h3 style={{ fontSize: 24, color: "#16323F", fontWeight: 900, lineHeight: 1.18, marginBottom: 14, letterSpacing: ".3px" }}>RECEBA SEU POST<br />AUTOMATICAMENTE</h3>
      <div style={{ fontSize: 20, color: "#16323F", fontWeight: 800, lineHeight: 1.3, marginBottom: 6 }}>Todo dia, com<br />hora marcada!</div>
      <div style={{ fontSize: 18, color: "#25A244", fontWeight: 900, marginBottom: 16 }}>via WhatsApp</div>

      {modo === "convite" ? (
        <div style={{ position: "relative", paddingTop: 34 }}>
          <span style={{ position: "absolute", left: 18, top: -6, fontSize: 46, transformOrigin: "50% 90%", animation: "wavedown 1s ease-in-out infinite", pointerEvents: "none", zIndex: 2 }}>👇</span>
          <button onClick={() => setModo("ajustes")} style={{ width: "100%", background: "#25A244", color: "#fff", border: "none", padding: 22, borderRadius: 16, fontWeight: 900, fontSize: 22, cursor: "pointer", boxShadow: "0 6px 18px rgba(37,162,68,.4)", fontFamily: GEN_FONT }}>Clique aqui</button>
        </div>
      ) : (
        <div style={{ marginTop: 24, paddingTop: 22, borderTop: "1px dashed #ccc", textAlign: "left" }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#16323F", marginBottom: 10, textAlign: "center" }}>⏰ Que horas quer receber?</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 14, border: "1.5px solid #cde9a0", borderRadius: 12, fontSize: 16, fontFamily: GEN_FONT, textAlign: "center" }} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#16323F", marginBottom: 10, textAlign: "center" }}>📱 Qual formato prefere postar?</label>
            <div style={{ display: "flex", gap: 8 }}>
              <div onClick={() => setFormato("sempreFeed")} style={fopt("sempreFeed", formato === "sempreFeed")}>Sempre<br />Feed</div>
              <div onClick={() => setFormato("sempreStories")} style={fopt("sempreStories", formato === "sempreStories")}>Sempre<br />Stories</div>
              <div onClick={() => setFormato("alternar")} style={fopt("alternar", formato === "alternar")}>Alternar<br /><span style={{ fontWeight: 600, fontSize: 10 }}>Feed ou Stories</span></div>
            </div>
          </div>
          <button onClick={confirmar} style={{ width: "100%", background: "#25A244", color: "#fff", border: "none", padding: 16, borderRadius: 14, fontWeight: 900, fontSize: 15, cursor: "pointer", marginTop: 6, fontFamily: GEN_FONT }}>Confirmar e ativar 🎉</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EDITAR PERFIL
// ============================================================
const TONS_LISTA = [
  { id: "animado",       emoji: "🎉", nome: "Animado",       desc: "Empolgado, com energia e emojis" },
  { id: "profissional",  emoji: "👔", nome: "Profissional",  desc: "Sério, confiável e objetivo" },
  { id: "elegante",      emoji: "✨", nome: "Elegante",       desc: "Sofisticado e refinado" },
  { id: "descontraido",  emoji: "😄", nome: "Descontraído",  desc: "Leve, divertido e próximo" },
  { id: "emocional",     emoji: "💛", nome: "Emocional",     desc: "Caloroso, que toca o coração" },
  { id: "direto",        emoji: "🎯", nome: "Direto",        desc: "Curto, claro e sem rodeios" },
];

function getPerguntasDoSegmento(tipo, segId) {
  const td = DADOS[tipo];
  if (!td) return [];
  if (td.direto) return td.direto.perguntas || [];
  for (const cat of (td.categorias || [])) {
    for (const seg of cat.segmentos) {
      if (seg.id === segId) return seg.perguntas || [];
    }
  }
  return [];
}

function EditarPerfil({ profile, onSalvar, onVoltar }) {
  const FONT = "'Nunito', ui-rounded, 'Segoe UI', system-ui, sans-serif";
  const tipo = profile.tipo;
  const tipoData = DADOS[tipo] || {};
  const temCategorias = !!tipoData.categorias;

  const [nomePessoa, setNomePessoa] = useState(profile.nomePessoa || "");
  const [nome,     setNome]     = useState(profile.nome || "");
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || "");
  const [tons,     setTons]     = useState(profile.tons || []);
  const [logo,     setLogo]     = useState(profile.logo || null);
  const [logoSemFundo, setLogoSemFundo] = useState(!!profile.logoSemFundo);
  const [logoBrilho, setLogoBrilho] = useState(profile.logoBrilho || null);
  const [corMarca, setCorMarca] = useState(profile.corMarca || "");
  const [segmento, setSegmento] = useState({ id: profile.segmentoId, nome: profile.segmentoNome });
  const [respostas, setRespostas] = useState(profile.respostas || {});
  const [perguntas, setPerguntas] = useState(() => getPerguntasDoSegmento(tipo, profile.segmentoId));

  const [modalTrocarSeg, setModalTrocarSeg] = useState(false);
  const [segPendente,    setSegPendente]    = useState(null);
  const [mostrarLista,   setMostrarLista]   = useState(false);
  const [buscaSeg,       setBuscaSeg]       = useState("");

  const [toast, showToast] = useToast();
  const fileRef = useRef(null);

  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  const todosSegs = useMemo(() => {
    if (!tipoData.categorias) return [];
    return tipoData.categorias.flatMap(cat => cat.segmentos.map(s => ({ ...s, cat: cat.nome })));
  }, [tipoData]);

  const segsFiltrados = useMemo(() => {
    const t = norm(buscaSeg.trim());
    return t ? todosSegs.filter(s => norm(s.nome).includes(t)) : todosSegs;
  }, [buscaSeg, todosSegs]);

  function mascararZap(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function toggleTom(id) {
    setTons(s => {
      if (s.includes(id)) return s.filter(x => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  }

  function escolherLogo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      // Fundo removido no envio (uma vez só); se não der, segue o original.
      const r = await prepararLogoEnviado(reader.result);
      setLogo(r.url);
      setLogoSemFundo(r.semFundo);
      setLogoBrilho(r.brilho);
      // Sugere a cor da marca detectada do novo logo (o cliente pode ajustar).
      // Roda sobre o logo já sem fundo: o branco virou transparência e é
      // descartado pelo filtro de alfa que cor.js já aplica.
      const cores = await analisarCorDoLogo(r.url);
      if (cores) setCorMarca(cores.original);
    };
    reader.readAsDataURL(f);
  }

  // Backfill: logos antigos (salvos antes deste recurso) ainda não têm cor.
  // Ao abrir a edição, detecta uma sugestão a partir do logo já existente.
  useEffect(() => {
    if (!logo || corMarca) return;
    let vivo = true;
    analisarCorDoLogo(logo).then((c) => { if (vivo && c) setCorMarca(c.original); });
    return () => { vivo = false; };
    // roda só na montagem (sugestão inicial); depois o cliente controla a cor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tentarTrocarSeg(seg) {
    if (seg.id === segmento.id) { setMostrarLista(false); return; }
    setSegPendente(seg);
    setModalTrocarSeg(true);
    setMostrarLista(false);
  }

  function confirmarTroca() {
    setSegmento({ id: segPendente.id, nome: segPendente.nome });
    setPerguntas(getPerguntasDoSegmento(tipo, segPendente.id));
    setRespostas({});
    setModalTrocarSeg(false);
    setSegPendente(null);
    showToast("✅ Segmento atualizado. Responda as novas perguntas.");
  }

  function salvar() {
    // Grava a cor escolhida pelo cliente (original) e a versão ajustada para
    // o layout (texto branco legível por cima). Recalcula a ajustada na hora.
    const corLayout = corMarca ? escurecerParaContraste(corMarca) : null;
    onSalvar({
      ...profile,
      nomePessoa: nomePessoa.trim(),
      nome: nome.trim(),
      whatsapp,
      tons,
      logo,
      logoSemFundo: logo ? logoSemFundo : false,
      logoBrilho: logo ? logoBrilho : null,
      criarLogoDepois: !logo,
      corMarca: corMarca || null,
      corMarcaLayout: corLayout,
      segmentoId: segmento.id,
      segmentoNome: segmento.nome,
      respostas,
    });
  }

  const inp = { width: "100%", boxSizing: "border-box", padding: "13px 14px", fontSize: 15, fontFamily: FONT, borderRadius: 12, border: "1.5px solid #E4EEF3", outline: "none", background: "white", color: "#16323F" };
  const rot = (label) => <label style={{ display: "block", fontWeight: 800, fontSize: 13.5, color: "#5C7686", marginBottom: 6 }}>{label}</label>;
  const secH = (t) => <div style={{ fontWeight: 900, fontSize: 15, color: "#16323F", borderBottom: "2px solid #E6EEF9", paddingBottom: 8, marginBottom: 14, marginTop: 28 }}>{t}</div>;

  return (
    <div style={{ minHeight: "100vh", background: "#F0F5FB", fontFamily: FONT }}>
      <AppHeader
        leftBtn={<button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14.5, fontWeight: 700, color: "#5C7686", fontFamily: FONT }}>← Voltar</button>}
        title="Editar perfil"
      />
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* DADOS */}
        {secH("Dados")}
        <div style={{ marginBottom: 14 }}>
          {rot("Como podemos te chamar?")}
          <input value={nomePessoa} onChange={e => setNomePessoa(e.target.value)} placeholder="Seu primeiro nome" style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          {rot("Nome do negócio")}
          <input value={nome} onChange={e => setNome(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom: 14 }}>
          {rot("WhatsApp")}
          <input value={whatsapp} onChange={e => setWhatsapp(mascararZap(e.target.value))} inputMode="numeric" style={inp} />
        </div>
        <div style={{ marginBottom: 4 }}>
          {rot("Segmento")}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ flex: 1, padding: "13px 14px", fontSize: 15, fontFamily: FONT, borderRadius: 12, border: "1.5px solid #E4EEF3", background: "white", color: "#16323F", fontWeight: 600 }}>
              {segmento.nome || "—"}
            </div>
            {temCategorias && (
              <button onClick={() => setMostrarLista(v => !v)} style={{ padding: "13px 16px", background: "#003BA0", color: "white", border: "none", borderRadius: 12, fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap" }}>
                {mostrarLista ? "Fechar" : "Trocar"}
              </button>
            )}
          </div>
        </div>
        {mostrarLista && (
          <div style={{ background: "white", border: "1.5px solid #E4EEF3", borderRadius: 14, padding: 14, marginTop: 6, marginBottom: 8 }}>
            <input value={buscaSeg} onChange={e => setBuscaSeg(e.target.value)} placeholder="Buscar segmento…" style={{ ...inp, fontSize: 14, marginBottom: 10 }} />
            <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {segsFiltrados.map(s => (
                <button key={s.id} onClick={() => tentarTrocarSeg(s)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, border: s.id === segmento.id ? "2px solid #003BA0" : "1.5px solid #E4EEF3", background: s.id === segmento.id ? "#E6EEF9" : "white", cursor: "pointer", fontFamily: FONT, fontSize: 14, fontWeight: s.id === segmento.id ? 800 : 600, color: "#16323F" }}>
                  {s.emoji} {s.nome}
                </button>
              ))}
              {segsFiltrados.length === 0 && <div style={{ textAlign: "center", color: "#5C7686", fontSize: 13, padding: "10px 0" }}>Nenhum resultado</div>}
            </div>
          </div>
        )}

        {/* TOM */}
        {secH("Tom de voz")}
        <div style={{ fontSize: 13, color: "#5C7686", fontWeight: 600, marginBottom: 12 }}>
          Escolha 1 ou 2{tons.length > 0 ? ` · ${tons.length}/2 selecionado${tons.length > 1 ? "s" : ""}` : ""}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {TONS_LISTA.map(t => {
            const ativo = tons.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTom(t.id)}
                style={{ textAlign: "left", background: ativo ? "#E6EEF9" : "white", border: `2px solid ${ativo ? "#003BA0" : "#E4EEF3"}`, borderRadius: 16, padding: "13px 12px", cursor: "pointer", position: "relative", fontFamily: FONT }}>
                {ativo && <span style={{ position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: "50%", background: "#003BA0", color: "#fff", fontSize: 11, fontWeight: 900, display: "grid", placeItems: "center" }}>✓</span>}
                <div style={{ fontSize: 22, marginBottom: 4 }}>{t.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{t.nome}</div>
                <div style={{ fontSize: 11.5, color: "#5C7686", lineHeight: 1.3 }}>{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* LOGO */}
        {secH("Logo")}
        {logo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logo} alt="logo" style={{ width: 72, height: 72, borderRadius: 14, objectFit: "contain", border: "1.5px solid #E4EEF3", background: "white", padding: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#16323F", marginBottom: 8 }}>Logo enviado ✓</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding: "8px 14px", background: "white", border: "1.5px solid #003BA0", color: "#003BA0", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Trocar</button>
                <button onClick={() => setLogo(null)} style={{ padding: "8px 14px", background: "white", border: "1.5px solid #E4EEF3", color: "#5C7686", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>Remover</button>
              </div>
            </div>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} style={{ width: "100%", padding: "15px", background: "#003BA0", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
            📤 Enviar logo
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={escolherLogo} style={{ display: "none" }} />

        {/* COR DA MARCA */}
        <div style={{ marginTop: 20 }}>
          {rot("Cor da marca")}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input
              type="color"
              value={corMarca || COR_MARCA_PADRAO}
              onChange={(e) => setCorMarca(e.target.value)}
              aria-label="Cor da marca"
              style={{ width: 54, height: 46, flexShrink: 0, border: "1.5px solid #E4EEF3", borderRadius: 12, background: "white", cursor: "pointer", padding: 3 }}
            />
            <div style={{ flex: 1, fontSize: 12.5, color: "#5C7686", fontWeight: 600, lineHeight: 1.45 }}>
              {corMarca
                ? "Detectada do seu logo. O texto do post fica branco por cima dela — ajuste se quiser."
                : "Escolha a cor que representa sua marca. O texto do post fica branco por cima dela."}
            </div>
          </div>
        </div>

        {/* RESPOSTAS */}
        {secH("Respostas")}
        {perguntas.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {perguntas.map((p, i) => (
              <div key={i}>
                <div style={{ fontWeight: 800, fontSize: 14.5, color: "#16323F", marginBottom: 4 }}>{i + 1}. {p.q}</div>
                <div style={{ fontSize: 13, color: "#003BA0", fontStyle: "italic", marginBottom: 8 }}>{p.dica}</div>
                <textarea
                  value={respostas[i + 1] || ""}
                  onChange={e => setRespostas(r => ({ ...r, [i + 1]: e.target.value }))}
                  placeholder="Responda do seu jeito…"
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 14.5, fontFamily: FONT, borderRadius: 12, border: "1.5px solid #E4EEF3", outline: "none", resize: "none", background: "white", color: "#16323F" }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", color: "#5C7686", fontSize: 14, padding: "20px 0" }}>Nenhuma pergunta para este segmento.</div>
        )}

        {/* SALVAR */}
        <button onClick={salvar} style={{ width: "100%", padding: "16px", background: "#003BA0", color: "white", border: "none", borderRadius: 16, fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: FONT, boxShadow: "0 6px 20px rgba(0,59,160,0.25)", marginTop: 32 }}>
          Salvar alterações
        </button>
        <button onClick={onVoltar} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", color: "#5C7686", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          ← Voltar sem salvar
        </button>
      </div>

      {/* Modal: confirmar troca de segmento */}
      {modalTrocarSeg && segPendente && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(22,50,63,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: 24, padding: "32px 24px", maxWidth: 400, width: "100%", fontFamily: FONT, boxShadow: "0 16px 48px rgba(0,59,160,0.18)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 14 }}>⚠️</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#16323F", marginBottom: 12, textAlign: "center" }}>Trocar de segmento?</div>
            <div style={{ fontSize: 14, color: "#5C7686", lineHeight: 1.65, marginBottom: 24 }}>
              Ao trocar para <b style={{ color: "#16323F" }}>{segPendente.nome}</b>, suas respostas atuais serão apagadas e você vai precisar responder as perguntas do novo segmento.
            </div>
            <button onClick={confirmarTroca} style={{ width: "100%", padding: "14px", background: "#003BA0", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT, marginBottom: 10 }}>
              Sim, trocar segmento
            </button>
            <button onClick={() => { setModalTrocarSeg(false); setSegPendente(null); }} style={{ width: "100%", padding: "13px", background: "white", color: "#5C7686", border: "1.5px solid #E4EEF3", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ============================================================
// ADMIN
// ============================================================
function Admin({ onClose }) {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [codes, setCodes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pf_codes")) || DEFAULT_CODES; } catch { return DEFAULT_CODES; }
  });
  const [nc, setNc] = useState("");
  const [limits, setLimits] = useState(getDefaultLimits);
  const [overrides, setOverrides] = useState(getOverrides);
  const [ovWa, setOvWa] = useState("");
  const [ovD, setOvD] = useState("5");
  const [ovM, setOvM] = useState("90");
  const [toast, showToast] = useToast();

  const addCode = () => {
    if (!nc.trim()) return;
    const u = [...codes, nc.trim().toUpperCase()];
    setCodes(u); localStorage.setItem("pf_codes", JSON.stringify(u)); setNc("");
    showToast("✅ Código adicionado!");
  };
  const remCode = (i) => {
    const u = codes.filter((_, idx) => idx !== i);
    setCodes(u); localStorage.setItem("pf_codes", JSON.stringify(u));
  };
  const saveLimits = () => {
    localStorage.setItem("pf_plan_limits", JSON.stringify(limits));
    showToast("✅ Limites salvos!");
  };
  const addOv = () => {
    if (!ovWa.trim()) return;
    const u = { ...overrides, [ovWa.trim()]: { daily: parseInt(ovD) || 5, monthly: parseInt(ovM) || 90 } };
    setOverrides(u); localStorage.setItem("pf_overrides", JSON.stringify(u)); setOvWa("");
    showToast("✅ Limite personalizado salvo!");
  };
  const remOv = (wa) => {
    const u = { ...overrides }; delete u[wa];
    setOverrides(u); localStorage.setItem("pf_overrides", JSON.stringify(u));
  };

  if (!auth)
    return (
      <div style={{ minHeight: "100vh", background: "#F0F5FB", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Nunito,sans-serif" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(0,59,160,0.18)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
          <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Painel Admin</div>
          <input type="password" placeholder="Senha admin..." value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pass === ADMIN_PASS && setAuth(true)} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontFamily: "Nunito,sans-serif", marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
          <button onClick={() => { if (pass === ADMIN_PASS) setAuth(true); else showToast("❌ Senha incorreta"); }} style={{ width: "100%", padding: 12, background: "#003BA0", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Entrar</button>
          <button onClick={onClose} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 600 }}>← Voltar</button>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    );

  const card = (title, children) => (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,59,160,0.07)", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "13px 18px", background: "#E6EEF9", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14 }}>{title}</div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
  const ni = { padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "Nunito,sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#F0F5FB", fontFamily: "Nunito,sans-serif" }}>
      <AppHeader onLogo={onClose} showHome={true} onHome={onClose} tab="" isPremium={undefined} />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 56px" }}>
        {card("🔑 Chaves de API", (
          <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#003BA0", marginBottom: 8 }}>🔒 Chaves agora ficam no servidor</div>
            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
              Por segurança, as chaves da nossa IA e de imagem ficam guardadas no servidor do Vercel (em "Environment Variables"), não mais no navegador. Configure lá as variáveis <b>ANTHROPIC_API_KEY</b> e <b>OPENAI_API_KEY</b>. Assim ninguém consegue ver ou roubar suas chaves.
            </div>
          </div>
        ))}
        {card("🎨 Limites de Imagens por Plano", (
          <>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 16 }}>Define os limites padrão de cada plano. Clientes com limite personalizado ignoram esses valores.</div>
            {["basico", "premium"].map((plano) => (
              <div key={plano} style={{ background: plano === "premium" ? "#fffbeb" : "#f8faff", border: "1.5px solid " + (plano === "premium" ? "#fcd34d" : "#bfdbfe"), borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: plano === "premium" ? "#92400e" : "#003BA0" }}>{plano === "premium" ? "🌟 Plano Premium" : "✍️ Plano Básico"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Por dia</label><input type="number" min="0" max="50" value={limits[plano]?.daily ?? 0} onChange={(e) => setLimits((l) => ({ ...l, [plano]: { ...l[plano], daily: parseInt(e.target.value) || 0 } }))} style={ni} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Por mês</label><input type="number" min="0" max="500" value={limits[plano]?.monthly ?? 0} onChange={(e) => setLimits((l) => ({ ...l, [plano]: { ...l[plano], monthly: parseInt(e.target.value) || 0 } }))} style={ni} /></div>
                </div>
              </div>
            ))}
            <button onClick={saveLimits} style={{ padding: "9px 20px", background: "#003BA0", color: "white", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>💾 Salvar limites</button>
          </>
        ))}
        {card("👤 Limite Personalizado por Cliente", (
          <>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 16 }}>Defina limites exclusivos por cliente. Sobrescreve o limite do plano.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px auto", gap: 8, marginBottom: 16, alignItems: "end" }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>WhatsApp</label><input placeholder="(11) 99999-9999" value={ovWa} onChange={(e) => setOvWa(e.target.value)} style={{ ...ni, fontSize: 13 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Dia</label><input type="number" min="0" value={ovD} onChange={(e) => setOvD(e.target.value)} style={ni} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Mês</label><input type="number" min="0" value={ovM} onChange={(e) => setOvM(e.target.value)} style={ni} /></div>
              <button onClick={addOv} style={{ padding: "10px 14px", background: "#003BA0", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>+ Salvar</button>
            </div>
            {Object.keys(overrides).length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px", color: "#94a3b8", fontSize: 13 }}>Nenhum limite personalizado</div>
            ) : (
              Object.entries(overrides).map(([wa, lim]) => (
                <div key={wa} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, marginBottom: 8 }}>
                  <div><div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>{wa}</div><div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{lim.daily}/dia · {lim.monthly}/mês</div></div>
                  <button onClick={() => remOv(wa)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>Remover</button>
                </div>
              ))
            )}
          </>
        ))}
        {card("🌟 Códigos Premium", (
          <>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 14 }}>Crie códigos únicos e envie para clientes que adquirirem o plano Premium.</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input placeholder="Ex: PREM-2024-XXXX" value={nc} onChange={(e) => setNc(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && addCode()} style={{ flex: 1, padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, fontFamily: "Nunito,sans-serif", outline: "none" }} />
              <button onClick={addCode} style={{ padding: "9px 18px", background: "#003BA0", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>+ Add</button>
            </div>
            {codes.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: "Nunito,sans-serif", fontSize: 14, fontWeight: 800, color: "#15803d" }}>🔑 {c}</span>
                <button onClick={() => remCode(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#ef4444", fontWeight: 700 }}>Remover</button>
              </div>
            ))}
          </>
        ))}
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  );
}

// ============================================================
// ROOT — controla a navegação entre as páginas
// ============================================================
export default function App() {
  const [page, setPage] = useState(() => (carregarFicha() ? "home" : "landing"));
  const [profile, setProfile] = useState(() => garantirClienteId(carregarFicha()));
  const [clicks, setClicks] = useState(0);
  const ct = useRef(null);

  const logoClick = () => {
    const n = clicks + 1;
    setClicks(n);
    clearTimeout(ct.current);
    if (n >= 3) { setPage("admin"); setClicks(0); return; }
    ct.current = setTimeout(() => setClicks(0), 1500);
  };

  async function concluirOnboarding(dados) {
    if (dados && dados.acao === "criar_logo") return;
    let ficha = criarFicha(dados);
    // Extrai a cor da marca do logo (no navegador) e guarda junto da ficha,
    // para não recalcular a cada post. Se falhar, segue sem cor (usa o padrão).
    if (ficha.logo && !ficha.corMarca) {
      const cores = await analisarCorDoLogo(ficha.logo);
      if (cores) ficha = { ...ficha, corMarca: cores.original, corMarcaLayout: cores.layout };
    }
    salvarFicha(ficha);
    setProfile(ficha);
    // navegação acontece via onIrParaDashboard na TelaFim
  }

  // O logo já chega com o fundo removido de quem chamou (ver logo.js);
  // semFundo diz se a remoção deu certo, e brilho ("claro"/"escuro") é o que
  // escolhe o contorno do logo no post.
  async function atualizarLogo(novoLogo, semFundo = false, brilho = null) {
    // Logo novo → recalcula a cor da marca a partir dele.
    const cores = novoLogo ? await analisarCorDoLogo(novoLogo) : null;
    const fichaAtualizada = {
      ...profile, logo: novoLogo, logoSemFundo: !!novoLogo && semFundo,
      logoBrilho: novoLogo ? brilho : null, criarLogoDepois: false,
      ...(cores ? { corMarca: cores.original, corMarcaLayout: cores.layout } : {}),
    };
    salvarFicha(fichaAtualizada);
    setProfile(fichaAtualizada);
  }

  function salvarEdicao(dadosAtualizados) {
    const ficha = salvarFicha(dadosAtualizados);
    setProfile(ficha);
    setPage("home");
  }

  if (page === "admin")  return <Admin onClose={() => setPage(profile ? "home" : "landing")} />;
  if (page === "landing") return <Landing onStart={() => setPage("onboarding")} onLogoClick={logoClick} />;
  if (page === "onboarding") return <Onboarding onConcluir={concluirOnboarding} onIrParaDashboard={() => setPage("home")} onVoltar={() => setPage("landing")} />;
  if (page === "editar") return <EditarPerfil profile={profile} onSalvar={salvarEdicao} onVoltar={() => setPage("home")} />;
  return <Dashboard profile={profile} onEdit={() => setPage("editar")} onLogoAtualizado={atualizarLogo} />;
}
