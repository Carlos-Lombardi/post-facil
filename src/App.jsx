// ============================================================
// POST FÁCIL — APP
// ============================================================
import { useState, useRef, useMemo, useEffect } from "react";
import Onboarding from "./Onboarding.jsx";
import { criarFicha, salvarFicha, carregarFicha } from "./ficha.js";
import { DADOS } from "./dados.js";
import { gerarTexto, gerarImagem } from "./api.js";
import {
  PostFacilLogo, AppHeader, Toast, useToast, QuotaBar,
  ADMIN_PASS, DEFAULT_CODES, getDefaultLimits, getOverrides,
  saudacaoMotivacional, incPostCreditos, mensagemCreditos, podeGerarPost,
  getWppConfig, saveWppConfig, doCopy,
} from "./shared.jsx";
import logoPostFacil from "./assets/logo-postfacil.png";
import bannerCatalogo from "./assets/banner-catalogo.jpg";
import bannerLogo from "./assets/banner-logo.jpg";

// ============================================================
// LIGA/DESLIGA DA GERAÇÃO REAL DE TEXTO — POST DE NEGÓCIO
// true  = o post de Negócio chama a nossa IA de verdade (api/claude.js)
//         e recebe o JSON (legenda, texto_imagem, descricao_fundo,
//         zona_limpa, cta, hashtags). Ver Fluxo_Geracao_Post_REFERENCIA.md.
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
    reader.onload = () => onLogoSalvo(reader.result);
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
    reader.onload = () => { onLogoAtualizado(reader.result); setShowLogoOpcoes(false); };
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

  function logoSalvoDoModal(dataUrl) {
    setShowLogoModal(false);
    onLogoAtualizado(dataUrl);
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

// Traduz a "zona limpa" escolhida pela IA para o canto do logo na tela.
function zonaParaCanto(zona) {
  const z = (zona || "").toLowerCase();
  if (z.includes("superior") && z.includes("esquerd")) return "tl";
  if (z.includes("superior")) return "tr";
  if (z.includes("inferior") && z.includes("esquerd")) return "bl";
  if (z.includes("inferior")) return "br";
  return "br"; // "centro" e demais → canto padrão para o selo do logo
}

// Sorteia um item de uma lista (usado para variar a cena da imagem).
const escolherAleatorio = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Normaliza a "zona_texto" da IA (a faixa onde o texto é carimbado).
// Aceita objeto {posicao, altura_pct} ou texto ("faixa inferior 30%").
// Sempre devolve { posicao: "superior"|"inferior", alturaPct: 22..45 }.
function parseZonaTexto(z) {
  let posicao = "inferior";
  let alturaPct = 30;
  const ehCima = (s) => /superior|cima|topo|alto/.test(s);
  if (z && typeof z === "object") {
    if (ehCima(String(z.posicao || z.posição || "").toLowerCase())) posicao = "superior";
    const n = parseInt(z.altura_pct ?? z.alturaPct, 10);
    if (!isNaN(n)) alturaPct = n;
  } else if (typeof z === "string") {
    const s = z.toLowerCase();
    if (ehCima(s)) posicao = "superior";
    const m = s.match(/(\d{1,3})\s*%/);
    if (m) alturaPct = parseInt(m[1], 10);
  }
  alturaPct = Math.min(45, Math.max(22, alturaPct)); // limites sãos
  return { posicao, alturaPct };
}

// Lê a "metade_assunto" (metade da imagem onde fica o assunto principal).
// Retorna "superior" | "inferior", ou null se a IA não informou.
function parseMetade(m) {
  if (m == null) return null;
  const s = String(m).toLowerCase();
  if (/superior|cima|topo|alto/.test(s)) return "superior";
  if (/inferior|baixo|fundo|embaixo/.test(s)) return "inferior";
  return null;
}

// Força o canto do logo para a faixa OPOSTA à do texto, para que nunca se
// sobreponham. Mantém o lado horizontal (esquerda/direita) escolhido pela IA.
function cantoOpostoAoTexto(canto, posicaoTexto) {
  const horiz = canto.includes("l") ? "l" : "r";
  const vert = posicaoTexto === "inferior" ? "t" : "b"; // texto embaixo → logo em cima
  return vert + horiz;
}

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

  const system = [
    "Você é o diretor de arte do Post Fácil, um app que cria posts profissionais de Instagram para pequenos negócios brasileiros.",
    "Você PENSA A PEÇA INTEIRA DE UMA VEZ (imagem, texto da imagem e legenda nascem do mesmo raciocínio, coerentes entre si).",
    "",
    "Responda SEMPRE em português do Brasil e APENAS com um JSON válido, sem texto antes ou depois, sem cercas de código. O JSON tem exatamente estas chaves:",
    '- "legenda": legenda do post para o Instagram, calorosa e profissional, coerente com o texto_imagem.',
    '- "texto_imagem": texto CURTO (poucas palavras) que será carimbado por cima da imagem.',
    '- "metade_assunto": em qual metade da imagem fica o ASSUNTO PRINCIPAL da cena. "superior" OU "inferior". ALTERNE entre posts.',
    '- "descricao_fundo": descrição do cenário para a IA de imagem, SEM texto/letras/palavras na cena. Coloque o assunto principal na metade_assunto e descreva a metade OPOSTA como fundo limpo, neutro e desfocado, com espaço livre. Uso interno.',
    '- "zona_texto": faixa onde o texto será carimbado, SEMPRE na metade OPOSTA ao metade_assunto (onde a imagem fica limpa). Objeto {"posicao": "superior" OU "inferior", "altura_pct": número de 25 a 40}. A posicao é o oposto de metade_assunto; VARIE a altura_pct.',
    '- "zona_limpa": canto onde ficará o logo. Um de: "canto inferior direito", "canto inferior esquerdo", "canto superior direito", "canto superior esquerdo". VARIE a cada post. O logo fica sempre na faixa OPOSTA à do texto.',
    '- "cta": chamada para ação curta.',
    '- "hashtags": array de 4 a 6 hashtags do segmento (sem espaços dentro de cada uma).',
    "",
    "DIRETRIZES OBRIGATÓRIAS:",
    "A. COORDENE cena e texto: decida a metade_assunto (onde fica o assunto) e ponha o texto na metade OPOSTA. A descricao_fundo DEVE deixar a metade do texto visualmente limpa — fundo neutro e desfocado, sem elementos importantes — para o texto ter onde respirar. O assunto principal NUNCA fica na faixa do texto.",
    "B. Tom profissional que impressione: use na descricao_fundo termos como iluminação profissional, composição cuidada, aparência premium, foco nítido, cores harmoniosas.",
    "C. VARIE A CENA a cada post: mude cenário, ângulo, enquadramento e composição na descricao_fundo. Evite repetir o mesmo clichê (ex.: não caia sempre em \"xícara sobre balcão de madeira\"). Mantenha sempre a fidelidade ao segmento e à identidade do negócio.",
    "",
    "REGRAS: NUNCA invente produtos/serviços que o cliente não informou. A descricao_fundo é interna e nunca é mostrada ao cliente. Ao se referir à IA nos textos ao cliente, diga \"nossa IA\".",
  ].join("\n");

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
    "",
    "Lembre-se: alterne a metade_assunto entre posts (às vezes o assunto em cima, às vezes embaixo), ponha o texto sempre na metade oposta e varie a cena. Responda só com o JSON.",
  ]
    .filter(Boolean)
    .join("\n");

  const texto = await gerarTexto(system, user, 1200);
  const j = extrairJSON(texto);

  // Faixa (em proporção) onde o texto será carimbado, indicada pela IA.
  const zonaTexto = parseZonaTexto(j.zona_texto);
  // Coerência cena↔texto: o texto vai SEMPRE na metade oposta ao assunto
  // principal da imagem, para nunca cair por cima dele. Quando a IA informa a
  // metade_assunto, forçamos a posicao do texto para o lado oposto (não confiamos
  // só no prompt — o código garante).
  const metadeAssunto = parseMetade(j.metade_assunto);
  if (metadeAssunto) zonaTexto.posicao = metadeAssunto === "superior" ? "inferior" : "superior";
  // O logo vai para a faixa OPOSTA à do texto, para não se sobreporem.
  const canto = cantoOpostoAoTexto(zonaParaCanto(j.zona_limpa), zonaTexto.posicao);

  // Passo 3 da referência: a IA de imagem gera a imagem LIMPA (sem texto),
  // recebendo só a descricao_fundo. O texto e o logo são aplicados por cima
  // pelo código (o overlay da TelaResultado). Falha aqui NÃO derruba o post:
  // sem imagem, cai no placeholder demo (gradiente).
  const imagem = await gerarImagemLimpaNegocio(j, zonaTexto);

  // Mapeia o JSON real para o formato que a TelaResultado já sabe exibir.
  // descricao_fundo NÃO é exibida ao cliente (regra de negócio).
  return {
    legenda: (j.legenda || "").trim(),
    hashtags: normalizarHashtags(j.hashtags),
    destaque: (j.texto_imagem || "").trim(),
    sub: (j.cta || "").trim(),
    canto,
    zonaTexto,
    imagem,
  };
}

// Gera a imagem de fundo LIMPA (sem texto) a partir da descricao_fundo.
// Reforça explicitamente "sem texto/letras/palavras" (a IA de imagem erra ao
// escrever) e pede a zona_limpa neutra. Retorna null se falhar ou se a IA de
// imagem estiver desligada — nesse caso a tela usa o placeholder demo.
async function gerarImagemLimpaNegocio(j, zonaTexto) {
  if (!MODO_REAL_IMAGEM_NEGOCIO) return null;
  const fundo = (j.descricao_fundo || "").trim();
  if (!fundo) return null;

  const faixaTexto = zonaTexto?.posicao === "superior" ? "superior" : "inferior";
  const alturaTexto = zonaTexto?.alturaPct || 30;
  // O texto já vem forçado para a metade oposta ao assunto; então o assunto
  // (e o pequeno logo de canto) ficam na metade contrária à faixa do texto.
  const metadeAssunto = faixaTexto === "superior" ? "inferior" : "superior";
  const cantoLogo = metadeAssunto;

  // A IA de imagem é "sem memória" e converge para a mesma cena a cada chamada.
  // Sorteamos ângulo, enquadramento, composição e luz para forçar variação
  // real entre gerações, mantendo o segmento e a identidade do negócio.
  const angulo = escolherAleatorio([
    "ângulo baixo (contra-plongée)", "vista de cima (flat lay)", "à altura dos olhos",
    "vista em três quartos", "close-up de detalhe", "plano aberto do ambiente",
  ]);
  const enquadramento = escolherAleatorio([
    "enquadramento fechado no detalhe", "plano médio", "plano aberto mostrando o entorno",
    "composição com bastante espaço negativo",
  ]);
  const composicao = escolherAleatorio([
    "regra dos terços", "composição centralizada e simétrica",
    "linhas diagonais dinâmicas", "sujeito em foco com fundo desfocado (bokeh)",
  ]);
  const luz = escolherAleatorio([
    "luz natural de janela", "luz quente de fim de tarde",
    "iluminação de estúdio suave", "manhã clara e arejada",
  ]);

  const prompt = [
    fundo,
    `Variação obrigatória desta geração: ${angulo}; ${enquadramento}; ${composicao}; ${luz}.`,
    "Crie uma CENA DIFERENTE das anteriores — outro cenário, ângulo, enquadramento e composição — mantendo o mesmo segmento e a identidade do negócio.",
    `COMPOSIÇÃO: posicione o assunto principal na metade ${metadeAssunto} da imagem. A metade ${faixaTexto} (cerca de ${alturaTexto}% da altura) deve ficar visualmente LIMPA — fundo neutro e desfocado, sem elementos importantes — como espaço livre para o texto respirar.`,
    `Deixe também o canto da metade ${cantoLogo} discreto para um pequeno logo.`,
    "SEM TEXTO, SEM LETRAS, SEM PALAVRAS, sem números e sem logotipos na imagem.",
    "Qualidade profissional: iluminação cuidada, composição harmoniosa, aparência premium, foco nítido.",
  ].join(" ");

  // Post é retrato tanto no feed (4:5) quanto no stories (9:16).
  const size = "1024x1536";

  try {
    return await gerarImagem(prompt, size);
  } catch (e) {
    console.error("Geração de imagem falhou, usando placeholder:", e);
    return null;
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
const MSGS_CARREGANDO = [
  "Estamos criando o seu post...",
  "Preparando algo especial pro seu negócio...",
  "Cuidando de cada detalhe pra você...",
  "Montando seu post com a cara da sua marca...",
  "Deixando tudo pronto pra você postar...",
];
function TelaCarregamento() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % MSGS_CARREGANDO.length), 1600);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ minHeight: "100vh", background: "#F0F5FB", fontFamily: GEN_FONT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{`
        @keyframes pfLoadFloat { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-14px);} }
        @keyframes pfLoadGlow { 0%,100%{filter:drop-shadow(0 8px 10px rgba(150,205,255,.35));} 50%{filter:drop-shadow(0 16px 26px rgba(150,205,255,.75));} }
      `}</style>
      <div style={{ animation: "pfLoadFloat 3.6s ease-in-out infinite" }}>
        <div style={{ animation: "pfLoadGlow 2.4s ease-in-out infinite" }}>
          <PostFacilLogo size={120} />
        </div>
      </div>
      <div style={{ marginTop: 36, color: "#003BA0", fontWeight: 800, fontSize: 17, textAlign: "center", maxWidth: 300, minHeight: 48 }}>
        {MSGS_CARREGANDO[i]}
      </div>
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

  // Posiciona o texto DENTRO da faixa reservada pela IA (zona_texto), em vez
  // de fixá-lo no centro. Sem zona_texto (posts demo), mantém o centro antigo.
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
          <div style={{ width: "100%", aspectRatio: aspect, background: "linear-gradient(135deg,#ffd89b,#ff6b6b 60%,#c0392b)", position: "relative", overflow: "hidden" }}>
            {/* fundo LIMPO da nossa IA (post de Negócio); texto e logo entram por cima */}
            {r.imagem && <img src={r.imagem} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
            {midia && (midia.isVideo
              ? <video src={midia.url} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
              : <img src={midia.url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />)}
            <div style={textoBox}>
              <div style={{ fontSize: 34, fontWeight: 900, textShadow: "0 2px 8px rgba(0,0,0,.4)", lineHeight: 1.05 }}>{r.destaque}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10, background: "rgba(0,0,0,.25)", padding: "5px 14px", borderRadius: 20 }}>{r.sub}</div>
            </div>
            {profile.logo && (
              <div style={{ position: "absolute", ...cantoPos, width: 46, height: 46, borderRadius: 10, background: "#fff", padding: 4, boxSizing: "border-box", boxShadow: "0 2px 8px rgba(0,0,0,.25)" }}>
                <img src={profile.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
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
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  }

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
    onSalvar({
      ...profile,
      nomePessoa: nomePessoa.trim(),
      nome: nome.trim(),
      whatsapp,
      tons,
      logo,
      criarLogoDepois: !logo,
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
  const [profile, setProfile] = useState(() => carregarFicha());
  const [clicks, setClicks] = useState(0);
  const ct = useRef(null);

  const logoClick = () => {
    const n = clicks + 1;
    setClicks(n);
    clearTimeout(ct.current);
    if (n >= 3) { setPage("admin"); setClicks(0); return; }
    ct.current = setTimeout(() => setClicks(0), 1500);
  };

  function concluirOnboarding(dados) {
    if (dados && dados.acao === "criar_logo") return;
    const ficha = criarFicha(dados);
    salvarFicha(ficha);
    setProfile(ficha);
    // navegação acontece via onIrParaDashboard na TelaFim
  }

  function atualizarLogo(novoLogo) {
    const fichaAtualizada = { ...profile, logo: novoLogo, criarLogoDepois: false };
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
