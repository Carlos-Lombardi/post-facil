// ============================================================
// POST FÁCIL — APP (esqueleto)
// FASE 1: Landing → Onboarding (novo, passo a passo) → Ficha salva → Dashboard
// As fases 2 e 3 (geração de texto e imagem) entram no Dashboard depois.
// ============================================================
import { useState, useRef } from "react";
import Onboarding from "./Onboarding.jsx";
import { criarFicha, salvarFicha, carregarFicha } from "./ficha.js";
import {
  PostFacilLogo, AppHeader, Toast, useToast, QuotaBar,
  ADMIN_PASS, DEFAULT_CODES, getDefaultLimits, getOverrides,
} from "./shared.jsx";

// ============================================================
// LANDING
// ============================================================
function Landing({ onStart, onLogoClick }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "Nunito,sans-serif" }}>
      <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", boxShadow: "0 2px 12px rgba(26,79,214,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onLogoClick}>
          <PostFacilLogo size={36} />
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Post Fácil</span>
        </div>
        <button onClick={onStart} style={{ padding: "8px 18px", background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", color: "white", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Começar grátis →</button>
      </div>
      <div style={{ background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", padding: "52px 20px 60px", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><PostFacilLogo size={96} /></div>
        <div style={{ fontFamily: "Nunito,sans-serif", fontSize: 30, fontWeight: 900, color: "white", lineHeight: 1.2, maxWidth: 480, margin: "0 auto 14px" }}>Posts profissionais para o seu negócio em 1 clique</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", fontWeight: 600, maxWidth: 400, margin: "0 auto 32px", lineHeight: 1.6 }}>Nossa IA cria legendas, hashtags e imagens para o Instagram do seu negócio.</div>
        <button onClick={onStart} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: "#1a4fd6", border: "none", borderRadius: 16, padding: "16px 36px", fontSize: 18, fontWeight: 900, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 6px 24px rgba(0,0,0,0.15)" }}>✨ Criar minha conta grátis</button>
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
            <div key={s.n} style={{ background: "white", borderRadius: 18, padding: "22px 16px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(26,79,214,0.08)" }}>
              <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 900, fontSize: 15, margin: "0 auto 12px" }}>{s.n}</div>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600, lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", borderRadius: 24, padding: "36px 24px", textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontFamily: "Nunito,sans-serif", fontSize: 22, fontWeight: 900, color: "white", marginBottom: 8 }}>Pronto para começar?</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 600, marginBottom: 24 }}>Configure em 2 minutos e gere seu primeiro post hoje</div>
          <button onClick={onStart} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "white", color: "#1a4fd6", border: "none", borderRadius: 14, padding: "14px 32px", fontSize: 16, fontWeight: 900, cursor: "pointer", fontFamily: "Nunito,sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>🚀 Criar minha conta</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD (placeholder da Fase 1 — recebe as Fases 2 e 3 depois)
// Por enquanto mostra a ficha criada, provando que o fluxo funcionou.
// ============================================================
function Dashboard({ profile, onEdit }) {
  const prem = profile.plano === "premium";
  const [tab, setTab] = useState("home");
  const tons = (profile.tons || []).join(", ") || "—";
  const respostas = profile.respostas || {};
  const qtdResp = Object.values(respostas).filter((v) => v && String(v).trim()).length;

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "Nunito,sans-serif" }}>
      <AppHeader onLogo={() => setTab("home")} showHome={true} onHome={() => setTab("home")} tab={tab} isPremium={prem} />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 16px 56px" }}>
        <div style={{ background: "white", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", marginBottom: 16, boxShadow: "0 2px 12px rgba(26,79,214,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {profile.logo ? (
              <img src={profile.logo} alt="logo" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", border: "2px solid #bfdbfe" }} />
            ) : (
              <div style={{ width: 44, height: 44, background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "white" }}>
                {(profile.nome && profile.nome[0] ? profile.nome[0] : "?").toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{profile.nome || "Sem nome"}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{profile.segmentoNome || "—"}</div>
            </div>
          </div>
          <button onClick={onEdit} style={{ padding: "7px 14px", border: "1.5px solid #e2e8f0", borderRadius: 9, background: "white", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#64748b", fontFamily: "Nunito,sans-serif" }}>✏️ Editar</button>
        </div>

        {prem && <QuotaBar profile={profile} />}

        {/* Aviso de fase em construção */}
        <div style={{ background: "linear-gradient(135deg,#dbeafe,#dcfce7)", borderRadius: 18, padding: "22px 20px", border: "1px solid #bfdbfe", marginBottom: 16 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>✅ Cadastro concluído!</div>
          <div style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.55 }}>
            Seu perfil foi salvo com sucesso. A geração de posts (texto + imagem) é a próxima etapa que vamos montar. Abaixo está um resumo do que nossa IA já sabe sobre o seu negócio:
          </div>
        </div>

        {/* Resumo da ficha — prova que o fluxo funcionou */}
        <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 12px rgba(26,79,214,0.07)" }}>
          <div style={{ padding: "13px 18px", background: "linear-gradient(135deg,#dbeafe,#dcfce7)", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14 }}>📋 Resumo do seu perfil</div>
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
// ADMIN (mantido do original — chaves agora explicadas como server-side)
// ============================================================
function Admin({ onClose }) {
  const [auth, setAuth] = useState(false);
  const [pass, setPass] = useState("");
  const [codes, setCodes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pf_codes")) || DEFAULT_CODES;
    } catch {
      return DEFAULT_CODES;
    }
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
    setCodes(u);
    localStorage.setItem("pf_codes", JSON.stringify(u));
    setNc("");
    showToast("✅ Código adicionado!");
  };
  const remCode = (i) => {
    const u = codes.filter((_, idx) => idx !== i);
    setCodes(u);
    localStorage.setItem("pf_codes", JSON.stringify(u));
  };
  const saveLimits = () => {
    localStorage.setItem("pf_plan_limits", JSON.stringify(limits));
    showToast("✅ Limites salvos!");
  };
  const addOv = () => {
    if (!ovWa.trim()) return;
    const u = { ...overrides, [ovWa.trim()]: { daily: parseInt(ovD) || 5, monthly: parseInt(ovM) || 90 } };
    setOverrides(u);
    localStorage.setItem("pf_overrides", JSON.stringify(u));
    setOvWa("");
    showToast("✅ Limite personalizado salvo!");
  };
  const remOv = (wa) => {
    const u = { ...overrides };
    delete u[wa];
    setOverrides(u);
    localStorage.setItem("pf_overrides", JSON.stringify(u));
  };

  if (!auth)
    return (
      <div style={{ minHeight: "100vh", background: "#f0f4ff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Nunito,sans-serif" }}>
        <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 8px 40px rgba(26,79,214,0.18)", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
          <div style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 20, marginBottom: 20 }}>Painel Admin</div>
          <input type="password" placeholder="Senha admin..." value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pass === ADMIN_PASS && setAuth(true)} style={{ width: "100%", padding: "11px 14px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 14, fontFamily: "Nunito,sans-serif", marginBottom: 12, outline: "none", boxSizing: "border-box" }} />
          <button onClick={() => { if (pass === ADMIN_PASS) setAuth(true); else showToast("❌ Senha incorreta"); }} style={{ width: "100%", padding: 12, background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Nunito,sans-serif" }}>Entrar</button>
          <button onClick={onClose} style={{ marginTop: 12, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 600 }}>← Voltar</button>
        </div>
        {toast && <Toast msg={toast} />}
      </div>
    );

  const card = (title, children) => (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 2px 12px rgba(26,79,214,0.07)", overflow: "hidden", marginBottom: 16 }}>
      <div style={{ padding: "13px 18px", background: "linear-gradient(135deg,#dbeafe,#dcfce7)", borderBottom: "1px solid #e2e8f0", fontWeight: 800, fontSize: 14 }}>{title}</div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
  const ni = { padding: "9px 13px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "Nunito,sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4ff", fontFamily: "Nunito,sans-serif" }}>
      <AppHeader onLogo={onClose} showHome={true} onHome={onClose} tab="" isPremium={undefined} />
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px 56px" }}>
        {card("🔑 Chaves de API", (
          <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1e40af", marginBottom: 8 }}>🔒 Chaves agora ficam no servidor</div>
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
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: plano === "premium" ? "#92400e" : "#1e40af" }}>{plano === "premium" ? "🌟 Plano Premium" : "✍️ Plano Básico"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Por dia</label><input type="number" min="0" max="50" value={limits[plano]?.daily ?? 0} onChange={(e) => setLimits((l) => ({ ...l, [plano]: { ...l[plano], daily: parseInt(e.target.value) || 0 } }))} style={ni} /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Por mês</label><input type="number" min="0" max="500" value={limits[plano]?.monthly ?? 0} onChange={(e) => setLimits((l) => ({ ...l, [plano]: { ...l[plano], monthly: parseInt(e.target.value) || 0 } }))} style={ni} /></div>
                </div>
              </div>
            ))}
            <button onClick={saveLimits} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", color: "white", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>💾 Salvar limites</button>
          </>
        ))}

        {card("👤 Limite Personalizado por Cliente", (
          <>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginBottom: 16 }}>Defina limites exclusivos por cliente. Sobrescreve o limite do plano.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 64px 64px auto", gap: 8, marginBottom: 16, alignItems: "end" }}>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>WhatsApp</label><input placeholder="(11) 99999-9999" value={ovWa} onChange={(e) => setOvWa(e.target.value)} style={{ ...ni, fontSize: 13 }} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Dia</label><input type="number" min="0" value={ovD} onChange={(e) => setOvD(e.target.value)} style={ni} /></div>
              <div><label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 5 }}>Mês</label><input type="number" min="0" value={ovM} onChange={(e) => setOvM(e.target.value)} style={ni} /></div>
              <button onClick={addOv} style={{ padding: "10px 14px", background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>+ Salvar</button>
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
              <button onClick={addCode} style={{ padding: "9px 18px", background: "linear-gradient(135deg,#1a4fd6,#0f9b6e)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 800, fontFamily: "Nunito,sans-serif" }}>+ Add</button>
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
    if (n >= 3) {
      setPage("admin");
      setClicks(0);
      return;
    }
    ct.current = setTimeout(() => setClicks(0), 1500);
  };

  function concluirOnboarding(dados) {
    if (dados && dados.acao === "criar_logo") {
      // gancho da Fase 3 (criação de logo) — por ora volta pra home
      return;
    }
    const ficha = criarFicha(dados);
    salvarFicha(ficha);
    setProfile(ficha);
    setPage("home");
  }

  if (page === "admin") return <Admin onClose={() => setPage(profile ? "home" : "landing")} />;
  if (page === "landing") return <Landing onStart={() => setPage("onboarding")} onLogoClick={logoClick} />;
  if (page === "onboarding") return <Onboarding onConcluir={concluirOnboarding} />;
  return <Dashboard profile={profile} onEdit={() => setPage("onboarding")} />;
}
