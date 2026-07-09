// ============================================================
// HELPERS COMPARTILHADOS + COTA + ÁTOMOS DE UI
// (reaproveitado e adaptado do app original, que já funcionava bem)
// ============================================================
import { useState, useRef } from "react";

export const ADMIN_PASS = "postfacil2024";
export const DEFAULT_CODES = ["PREM-2024-DEMO"];

// ---- cota de imagens (mantida do original) ----
export function getDefaultLimits() {
  try {
    return (
      JSON.parse(localStorage.getItem("pf_plan_limits")) || {
        basico: { daily: 0, monthly: 0 },
        premium: { daily: 5, monthly: 90 },
      }
    );
  } catch {
    return { basico: { daily: 0, monthly: 0 }, premium: { daily: 5, monthly: 90 } };
  }
}
export function getOverrides() {
  try {
    return JSON.parse(localStorage.getItem("pf_overrides") || "{}");
  } catch {
    return {};
  }
}
export function getLimits(profile) {
  const ov = getOverrides()[profile.whatsapp];
  if (ov) return ov;
  return getDefaultLimits()[profile.plano] || { daily: 0, monthly: 0 };
}
export function getQuota(profile) {
  const key = "pf_quota_" + profile.whatsapp;
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  try {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    if (s.day !== today) {
      s.day = today;
      s.dayCount = 0;
    }
    if (s.month !== month) {
      s.month = month;
      s.monthCount = 0;
    }
    return { day: today, month, dayCount: s.dayCount || 0, monthCount: s.monthCount || 0 };
  } catch {
    return { day: today, month, dayCount: 0, monthCount: 0 };
  }
}
export function saveQuota(profile, q) {
  localStorage.setItem("pf_quota_" + profile.whatsapp, JSON.stringify(q));
}
export function canGenImg(profile) {
  const lim = getLimits(profile);
  if (!lim.monthly) return { ok: false, reason: "Geração de imagens não disponível no seu plano." };
  const q = getQuota(profile);
  if (q.monthCount >= lim.monthly) return { ok: false, reason: "Limite mensal de imagens atingido." };
  if (q.dayCount >= lim.daily) return { ok: false, reason: "Limite diário de imagens atingido. Volte amanhã!" };
  return { ok: true };
}
export function incQuota(profile) {
  const q = getQuota(profile);
  q.dayCount++;
  q.monthCount++;
  saveQuota(profile, q);
}

// ============================================================
// CRÉDITOS DE POST (Seção 8 — sistema de créditos)
// Diário: 5/dia · Mensal: 92 reais (cliente "conhece" 90; +2 cortesia).
// Exibição SEMPRE em tom positivo (o que ele TEM, nunca o que gastou).
// Diário esgotado NÃO bloqueia — passa a consumir do saldo mensal.
// ============================================================
export const POST_LIMITE_DIA = 5;
export const POST_LIMITE_MES = 92;
export const POST_MES_CONHECIDO = 90;

export function getPostCreditos(profile) {
  const key = "pf_posts_" + (profile?.whatsapp || "anon");
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  try {
    const s = JSON.parse(localStorage.getItem(key) || "{}");
    if (s.day !== today) { s.day = today; s.dayCount = 0; }
    if (s.month !== month) { s.month = month; s.monthCount = 0; }
    return { day: today, month, dayCount: s.dayCount || 0, monthCount: s.monthCount || 0 };
  } catch {
    return { day: today, month, dayCount: 0, monthCount: 0 };
  }
}
export function incPostCreditos(profile) {
  const c = getPostCreditos(profile);
  c.dayCount++;
  c.monthCount++;
  try { localStorage.setItem("pf_posts_" + (profile?.whatsapp || "anon"), JSON.stringify(c)); } catch {}
  return c;
}
// dias até a renovação (fim do mês corrente)
function diasParaRenovar() {
  const hoje = new Date();
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const dias = Math.max(1, Math.ceil((fim - hoje) / 86400000));
  return dias === 1 ? "1 dia" : dias + " dias";
}
// Mensagem do contador na tela de resultado (sempre em tom positivo)
export function mensagemCreditos(profile) {
  const { dayCount, monthCount } = getPostCreditos(profile);
  if (monthCount >= POST_LIMITE_MES)
    return `Você aproveitou até o último post do mês! 🎉 Seus créditos renovam automaticamente em ${diasParaRenovar()}. Já já a gente se vê por aqui! 😊`;
  if (monthCount >= POST_MES_CONHECIDO)
    return "Seus posts do mês chegaram ao fim — mas a gente não te deixa na mão! 🎁 Liberamos +2 posts de cortesia pra você. Aproveite! 💙";
  if (dayCount >= POST_LIMITE_DIA)
    return "Você já criou seus posts de hoje! 🎉 Quer continuar? Sem problema — a partir daqui, vamos usando seus posts do mês. Assim você não perde o embalo! 😊";
  const restam = POST_LIMITE_DIA - dayCount;
  return `Você ainda tem ${restam} post${restam === 1 ? "" : "s"} pra criar hoje ✨`;
}
// true quando ainda pode gerar (só trava de vez após os 92 do mês)
export function podeGerarPost(profile) {
  return getPostCreditos(profile).monthCount < POST_LIMITE_MES;
}

// ============================================================
// SAUDAÇÃO MOTIVACIONAL (Seção 2)
// Cumprimenta pelo primeiro nome, frase que varia a cada abertura,
// com fallback caloroso SEM nome. Nunca exibe "Olá, !" vazio.
// ============================================================
const FRASES_SAUDACAO = [
  "Hoje é dia de aparecer nas redes! 🚀",
  "Bora criar algo incrível hoje? ✨",
  "Que tal um post novo pra brilhar? 💙",
  "Seu público está esperando por você! 😊",
  "Vamos deixar seu negócio em destaque? 🌟",
  "Tá na hora de mostrar seu trabalho pro mundo! 📲",
];
export function saudacaoMotivacional(nomePessoa) {
  const nome = (nomePessoa || "").trim().split(/\s+/)[0] || "";
  const h = new Date().getHours();
  const periodo = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const emoji = h < 12 ? "🌅" : h < 18 ? "☀️" : "🌙";
  const titulo = nome ? `${periodo}, ${nome}!` : `${periodo}!`;
  // anti-repetição entre aberturas
  let last = -1;
  try { last = parseInt(sessionStorage.getItem("pf_saud_idx") ?? "-1"); } catch {}
  let idx = Math.floor(Math.random() * FRASES_SAUDACAO.length);
  while (FRASES_SAUDACAO.length > 1 && idx === last) idx = Math.floor(Math.random() * FRASES_SAUDACAO.length);
  try { sessionStorage.setItem("pf_saud_idx", String(idx)); } catch {}
  return { titulo, emoji, sub: FRASES_SAUDACAO[idx] };
}

// ============================================================
// CONFIG DO ENVIO DIÁRIO NO WHATSAPP (Seção 7)
// opt-in ativo; parar só dentro do app. Persistido por cliente.
// ============================================================
export function getWppConfig(profile) {
  try {
    return JSON.parse(localStorage.getItem("pf_wpp_" + (profile?.whatsapp || "anon")) || "null") ||
      { ativo: false, hora: "09:00", formato: "alternar" };
  } catch {
    return { ativo: false, hora: "09:00", formato: "alternar" };
  }
}
export function saveWppConfig(profile, cfg) {
  try { localStorage.setItem("pf_wpp_" + (profile?.whatsapp || "anon"), JSON.stringify(cfg)); } catch {}
  return cfg;
}

// ---- códigos premium ----
export function getCodes() {
  try {
    return JSON.parse(localStorage.getItem("pf_codes")) || DEFAULT_CODES;
  } catch {
    return DEFAULT_CODES;
  }
}
export function validCode(code) {
  return getCodes()
    .map((c) => c.trim().toUpperCase())
    .includes(code.trim().toUpperCase());
}

// ---- utilidades ----
export function fmtDate(ts) {
  return new Date(ts).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
export function doCopy(text, onOk, onFail) {
  const fb = () => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand("copy");
      onOk();
    } catch {
      onFail();
    }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onOk).catch(fb);
  } else fb();
}
export async function dlImg(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    return true;
  } catch {
    window.open(url, "_blank");
    return false;
  }
}

// ---- LOGO ----
export function PostFacilLogo({ size = 72, style = {} }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: "linear-gradient(145deg,#003BA0,#002D7A)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", flexShrink: 0, position: "relative", overflow: "hidden", boxShadow: `0 ${size * 0.06}px ${size * 0.18}px rgba(0,59,160,0.35)`, ...style }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: "inherit", border: `${size * 0.025}px solid rgba(255,255,255,0.18)`, pointerEvents: "none" }} />
      <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontWeight: 900, fontSize: size * 0.31, color: "white", lineHeight: 1.05 }}>Post</div>
      <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontWeight: 900, fontSize: size * 0.31, color: "white", lineHeight: 1.05 }}>Fácil</div>
      <svg style={{ position: "absolute", bottom: size * 0.07, right: size * 0.09, width: size * 0.22, height: size * 0.22 }} viewBox="0 0 24 24" fill="none">
        <line x1="2" y1="6" x2="5" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="2" x2="6" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="8" x2="10.5" y2="10.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M9 9 L9 20 L12.5 16.5 L15.5 22 L17.5 21 L14.5 15 L19 15 Z" fill="white" />
      </svg>
    </div>
  );
}

// ---- TOAST ----
export function Toast({ msg }) {
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "white", padding: "11px 20px", borderRadius: 12, fontSize: 13, fontWeight: 700, zIndex: 9999, pointerEvents: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.20)", whiteSpace: "nowrap" }}>
      {msg}
    </div>
  );
}
export function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2600);
  };
  return [msg, show];
}

// ---- QUOTA BAR ----
export function QuotaBar({ profile }) {
  const lim = getLimits(profile);
  const q = getQuota(profile);
  if (!lim.monthly) return null;
  const hasOv = !!getOverrides()[profile.whatsapp];
  const color = (p) => (p >= 100 ? "#ef4444" : p >= 80 ? "#f59e0b" : "#22c55e");
  const items = [
    { label: "Hoje", used: q.dayCount, total: lim.daily, msg: (p) => (p >= 100 ? "Retorna amanhã" : lim.daily - q.dayCount + " restante(s)") },
    { label: "Este mês", used: q.monthCount, total: lim.monthly, msg: (p) => (p >= 100 ? "Renova no próximo mês" : lim.monthly - q.monthCount + " restante(s)") },
  ];
  return (
    <div style={{ background: "white", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,59,160,0.07)", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#003BA0", textTransform: "uppercase", letterSpacing: "0.5px" }}>🎨 Cota de Imagens IA</span>
        {hasOv && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>Personalizado</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map((item, i) => {
          const pct = Math.min(100, (item.used / item.total) * 100);
          return (
            <div key={i}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{item.label}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: pct >= 100 ? "#ef4444" : "#0f172a" }}>{item.used}/{item.total}</span>
              </div>
              <div style={{ height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: color(pct), borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: pct >= 100 ? "#ef4444" : "#64748b", marginTop: 3 }}>{item.msg(pct)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- HEADER ----
export function AppHeader({ onLogo, leftBtn, title, showHome, showHist, onHome, onHist, tab, isPremium }) {
  return (
    <div style={{ background: "white", borderBottom: "1px solid #e2e8f0", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", boxShadow: "0 2px 12px rgba(0,59,160,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
      {leftBtn || (
        <div onClick={onLogo} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 18, background: "linear-gradient(135deg,#003BA0,#002D7A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Post Fácil</span>
          {isPremium !== undefined && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 20, background: isPremium ? "linear-gradient(135deg,#fef3c7,#fde68a)" : "#dbeafe", color: isPremium ? "#92400e" : "#003BA0", border: isPremium ? "1px solid #fcd34d" : "none" }}>
              {isPremium ? "🌟 Premium" : "✍️ Básico"}
            </span>
          )}
        </div>
      )}
      {title && <span style={{ fontFamily: "Nunito,sans-serif", fontWeight: 800, fontSize: 16, color: "#0f172a", position: "absolute", left: "50%", transform: "translateX(-50%)" }}>{title}</span>}
      <div style={{ display: "flex", gap: 6 }}>
        {showHome && <button onClick={onHome} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + (tab === "home" ? "#bfdbfe" : "#e2e8f0"), background: tab === "home" ? "#eff6ff" : "white", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === "home" ? "#003BA0" : "#64748b", fontFamily: "Nunito,sans-serif" }}>🏠 Início</button>}
        {showHist && <button onClick={onHist} style={{ padding: "8px 14px", borderRadius: 10, border: "1.5px solid " + (tab === "hist" ? "#bfdbfe" : "#e2e8f0"), background: tab === "hist" ? "#eff6ff" : "white", cursor: "pointer", fontSize: 13, fontWeight: 700, color: tab === "hist" ? "#003BA0" : "#64748b", fontFamily: "Nunito,sans-serif" }}>📋 Histórico</button>}
      </div>
    </div>
  );
}
