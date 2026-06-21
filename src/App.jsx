// ============================================================
// POST FÁCIL — APP
// ============================================================
import { useState, useRef, useMemo } from "react";
import Onboarding from "./Onboarding.jsx";
import { criarFicha, salvarFicha, carregarFicha } from "./ficha.js";
import { DADOS } from "./dados.js";
import {
  PostFacilLogo, AppHeader, Toast, useToast, QuotaBar,
  ADMIN_PASS, DEFAULT_CODES, getDefaultLimits, getOverrides,
} from "./shared.jsx";

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
// DASHBOARD
// ============================================================
function Dashboard({ profile, onEdit, onLogoAtualizado }) {
  const prem = profile.plano === "premium";
  const [tab, setTab] = useState("home");
  const [showLogoModal, setShowLogoModal] = useState(false);
  const tons = (profile.tons || []).join(", ") || "—";
  const respostas = profile.respostas || {};
  const qtdResp = Object.values(respostas).filter((v) => v && String(v).trim()).length;

  const semLogo = !profile.logo;
  const ehPessoal = profile.tipo === "pessoal";
  const [showLogoOpcoes, setShowLogoOpcoes] = useState(false);
  const logoFileRef = useRef(null);

  function logoEscolhido(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => { onLogoAtualizado(reader.result); setShowLogoOpcoes(false); };
    reader.readAsDataURL(f);
  }

  function tentarGerarPost() {
    const dismissido = sessionStorage.getItem("pf_logo_dismissed") === "1";
    if (semLogo && !ehPessoal && !dismissido) {
      setShowLogoModal(true);
      return;
    }
    // Fase 2: lógica de geração de post virá aqui
  }

  function dispensarModal() {
    sessionStorage.setItem("pf_logo_dismissed", "1");
    setShowLogoModal(false);
  }

  function logoSalvoDoModal(dataUrl) {
    setShowLogoModal(false);
    onLogoAtualizado(dataUrl);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F0F5FB", fontFamily: "Nunito,sans-serif" }}>
      <AppHeader onLogo={() => setTab("home")} showHome={true} onHome={() => setTab("home")} tab={tab} isPremium={prem} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 56px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,59,160,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div onClick={() => setShowLogoOpcoes(true)} style={{ cursor: "pointer" }}>
              {profile.logo ? (
                <img src={profile.logo} alt="logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", border: "2px solid #bfdbfe" }} />
              ) : (
                <div style={{ width: 44, height: 44, background: "#003BA0", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "white" }}>
                  {(profile.nome && profile.nome[0] ? profile.nome[0] : "?").toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{profile.nome || "Sem nome"}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{profile.segmentoNome || "—"}</div>
            </div>
          </div>
          <button onClick={onEdit} style={{ padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#64748b", fontFamily: "Nunito,sans-serif" }}>✏️ Editar</button>
        </div>

        {prem && <QuotaBar profile={profile} />}

        <button onClick={tentarGerarPost} style={{ width: "100%", padding: "18px", background: "#003BA0", color: "white", border: "none", borderRadius: 16, fontSize: 17, fontWeight: 900, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 6px 20px rgba(0,59,160,0.25)", marginBottom: 16 }}>
          ✨ Gerar meu post
        </button>

        <div style={{ background: "#E6EEF9", borderRadius: 18, padding: "22px 20px", border: "1px solid #bfdbfe", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>✅ Cadastro concluído!</div>
          <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55 }}>
            Seu perfil foi salvo com sucesso. A geração de posts (texto + imagem) é a próxima etapa que vamos montar. Abaixo está um resumo do que nossa IA já sabe sobre o seu negócio:
          </div>
        </div>

        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,59,160,0.07)" }}>
          <div style={{ padding: "13px 18px", background: "#E6EEF9", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14 }}>📋 Resumo do seu perfil</div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            <LinhaResumo rotulo="Negócio" valor={profile.nome} />
            <LinhaResumo rotulo="Segmento" valor={profile.segmentoNome} />
            <LinhaResumo rotulo="WhatsApp" valor={profile.whatsapp} />
            <LinhaResumo rotulo="Tom de voz" valor={tons} />
            <LinhaResumo rotulo="Logo" valor={profile.logo ? "Enviado ✓" : profile.criarLogoDepois ? "Criar depois" : "—"} />
            <LinhaResumo rotulo="Respostas" valor={qtdResp + " de 10 preenchidas"} />
          </div>
        </div>
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
    </div>
  );
}

function LinhaResumo({ rotulo, valor }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingBottom: 8, borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{rotulo}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", textAlign: "right", maxWidth: "62%" }}>{valor || "—"}</span>
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
