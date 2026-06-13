import { useState, useMemo, useRef, useEffect } from "react";
import { DADOS } from "./dados.js";

/* ============================================================
   POST FÁCIL — Fluxo de escolha de segmento + perguntas
   VERSÃO COMPLETA com os 102 segmentos reais.
   ------------------------------------------------------------
   Uso no app:
     <SegmentoOnboarding onConcluir={(dados) => { ... }} />
   dados = { tipo, segmentoId, segmentoNome, respostas: {1:'',...,10:''} }
   ============================================================ */

/* ----------  PALETA / TOKENS VISUAIS  ---------- */
const C = {
  bg: "#F4F8FB",
  card: "#FFFFFF",
  ink: "#16323F",
  sub: "#5C7686",
  line: "#E4EEF3",
  comercio: "#2E9E73", comercioBg: "#E7F6EF",
  profissional: "#3B7DD8", profissionalBg: "#E8F1FC",
  pessoal: "#9B5DE5", pessoalBg: "#F2E9FC",
};
const FONT =
  "'Nunito', ui-rounded, 'Segoe UI', system-ui, -apple-system, sans-serif";

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
export default function Onboarding({ onConcluir }) {
  // Fluxo: tipo → lista → identificacao → tom → logo → perguntas → fim
  const [tela, setTela] = useState("tipo");
  const [tipo, setTipo] = useState(null);
  const [segmento, setSegmento] = useState(null);
  // cadastro acumula todos os dados do cliente
  const [cadastro, setCadastro] = useState({
    nome: "", whatsapp: "", tons: [], logo: null, criarLogoDepois: false, respostas: {},
  });

  const ehPessoal = tipo ? !!DADOS[tipo].direto : false;

  function reset() {
    setTipo(null); setSegmento(null);
    setCadastro({ nome: "", whatsapp: "", tons: [], logo: null, criarLogoDepois: false, respostas: {} });
    setTela("tipo");
  }
  function escolherTipo(t) {
    setTipo(t);
    if (DADOS[t].direto) { setSegmento(DADOS[t].direto); setTela("identificacao"); }
    else setTela("lista");
  }
  function escolherSegmento(seg) { setSegmento(seg); setTela("identificacao"); }

  function finalizar(resp, extra = {}) {
    const dadosFinais = {
      tipo,
      segmentoId: segmento.id,
      segmentoNome: segmento.nome,
      nome: cadastro.nome,
      whatsapp: cadastro.whatsapp,
      tons: cadastro.tons,
      logo: cadastro.logo,
      criarLogoDepois: cadastro.criarLogoDepois,
      respostas: resp,
      ...extra,
    };
    setCadastro((c) => ({ ...c, respostas: resp }));
    onConcluir?.(dadosFinais);
    setTela("fim");
  }

  return (
    <div style={{ fontFamily: FONT, background: C.bg, minHeight: "100vh", color: C.ink }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "0 18px 40px" }}>
        {tela === "tipo" && <TelaTipo onEscolher={escolherTipo} />}

        {tela === "lista" && (
          <TelaLista tipo={DADOS[tipo]} onVoltar={() => setTela("tipo")} onEscolher={escolherSegmento} />
        )}

        {tela === "identificacao" && (
          <TelaIdentificacao
            tipoInfo={DADOS[tipo]}
            ehPessoal={ehPessoal}
            valores={cadastro}
            onVoltar={() => setTela(ehPessoal ? "tipo" : "lista")}
            onAvancar={(v) => { setCadastro((c) => ({ ...c, ...v })); setTela("tom"); }}
          />
        )}

        {tela === "tom" && (
          <TelaTom
            tipoInfo={DADOS[tipo]}
            valores={cadastro}
            onVoltar={() => setTela("identificacao")}
            onAvancar={(v) => { setCadastro((c) => ({ ...c, ...v })); setTela("logo"); }}
          />
        )}

        {tela === "logo" && (
          <TelaLogo
            tipoInfo={DADOS[tipo]}
            valores={cadastro}
            onVoltar={() => setTela("tom")}
            onAvancar={(v) => { setCadastro((c) => ({ ...c, ...v })); setTela("perguntas"); }}
          />
        )}

        {tela === "perguntas" && (
          <TelaPerguntas
            tipoInfo={DADOS[tipo]}
            segmento={segmento}
            onVoltar={() => setTela("logo")}
            onConcluir={(resp) => finalizar(resp)}
          />
        )}

        {tela === "fim" && (
          <TelaFim
            tipoInfo={DADOS[tipo]}
            segmento={segmento}
            cadastro={cadastro}
            onCriarLogo={() => onConcluir?.({ acao: "criar_logo" })}
            onReiniciar={reset}
          />
        )}
      </div>
    </div>
  );
}

/* ===========  TELA 1 — ESCOLHA DO TIPO  =========== */
function TelaTipo({ onEscolher }) {
  const tipos = ["comercio", "profissional", "pessoal"];
  return (
    <div>
      <Topo titulo="Vamos começar! 🎉" sub="Para criar os melhores posts, conta pra gente o que você tem:" />
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}>
        {tipos.map((t, i) => {
          const d = DADOS[t];
          return (
            <button
              key={t}
              onClick={() => onEscolher(t)}
              style={{
                display: "flex", alignItems: "center", gap: 16, textAlign: "left",
                background: C.card, border: `2px solid ${C.line}`, borderRadius: 22,
                padding: "20px 18px", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(22,50,63,0.05)",
                transition: "transform .15s, border-color .15s, box-shadow .15s",
                animation: `fadeUp .4s ease ${i * 0.08}s both`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = d.cor; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 26px ${d.cor}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(22,50,63,0.05)"; }}
            >
              <div style={{ flexShrink: 0, width: 58, height: 58, borderRadius: 16, background: d.corBg, display: "grid", placeItems: "center", fontSize: 30 }}>
                {d.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 3 }}>{d.rotulo}</div>
                <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.4 }}>{d.descricao}</div>
              </div>
              <div style={{ fontSize: 22, color: d.cor, fontWeight: 800 }}>›</div>
            </button>
          );
        })}
      </div>
      <Estilos />
    </div>
  );
}

/* ===========  TELA 2 — LISTA COM BUSCA  =========== */
function TelaLista({ tipo, onVoltar, onEscolher }) {
  const [busca, setBusca] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 250); return () => clearTimeout(t); }, []);

  const todos = useMemo(
    () => tipo.categorias.flatMap((c) => c.segmentos.map((s) => ({ ...s, cat: c.nome }))),
    [tipo]
  );
  const termo = busca.trim().toLowerCase();
  // normaliza (ignora acentos) para a busca ser mais tolerante
  const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtrados = termo ? todos.filter((s) => norm(s.nome).includes(norm(termo))) : null;

  return (
    <div>
      <BotaoVoltar onClick={onVoltar} />
      <Topo titulo={`${tipo.emoji} ${tipo.rotulo}`} sub="Escolha o que mais combina. Pode buscar pelo nome 👇" cor={tipo.cor} />
      <div style={{ position: "sticky", top: 0, zIndex: 5, paddingTop: 6, paddingBottom: 10, background: C.bg }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 17, opacity: 0.5 }}>🔍</span>
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Digite seu tipo de negócio... (ex: pizzaria)"
            style={{ width: "100%", boxSizing: "border-box", padding: "15px 16px 15px 44px", fontSize: 15.5, fontFamily: FONT, borderRadius: 16, border: `2px solid ${C.line}`, outline: "none", background: C.card, color: C.ink }}
            onFocus={(e) => (e.target.style.borderColor = tipo.cor)}
            onBlur={(e) => (e.target.style.borderColor = C.line)}
          />
          {busca && (
            <button onClick={() => setBusca("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: C.line, color: C.sub, width: 24, height: 24, borderRadius: "50%", cursor: "pointer", fontWeight: 800, lineHeight: 1 }}>×</button>
          )}
        </div>
      </div>
      {filtrados ? (
        filtrados.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtrados.map((s) => (<ItemSegmento key={s.id} s={s} cor={tipo.cor} corBg={tipo.corBg} onClick={() => onEscolher(s)} />))}
          </div>
        ) : (<SemResultado termo={busca} cor={tipo.cor} />)
      ) : (
        tipo.categorias.map((cat) => (
          <div key={cat.nome} style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: C.sub, margin: "4px 4px 10px" }}>{cat.nome}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cat.segmentos.map((s) => (<ItemSegmento key={s.id} s={s} cor={tipo.cor} corBg={tipo.corBg} onClick={() => onEscolher(s)} />))}
            </div>
          </div>
        ))
      )}
      <Estilos />
    </div>
  );
}

function ItemSegmento({ s, cor, corBg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 13, textAlign: "left", width: "100%", background: C.card, border: `2px solid ${C.line}`, borderRadius: 16, padding: "13px 14px", cursor: "pointer", transition: "border-color .12s, background .12s" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.background = corBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = C.card; }}
    >
      <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: corBg, display: "grid", placeItems: "center", fontSize: 22 }}>{s.emoji}</span>
      <span style={{ fontWeight: 700, fontSize: 15.5, flex: 1 }}>{s.nome}</span>
      <span style={{ color: cor, fontWeight: 800, fontSize: 19 }}>›</span>
    </button>
  );
}

function SemResultado({ termo, cor }) {
  return (
    <div style={{ textAlign: "center", padding: "30px 20px", color: C.sub }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
      <div style={{ fontWeight: 700, color: C.ink, marginBottom: 6 }}>Não achamos “{termo}”</div>
      <div style={{ fontSize: 14, lineHeight: 1.5 }}>
        Tente outro nome, ou role a lista para escolher.<br />
        Não achou? Use a opção <span style={{ color: cor, fontWeight: 700 }}>“Outro Negócio”</span> no fim da lista.
      </div>
    </div>
  );
}

/* ===========  TELA 3 — PERGUNTAS UMA A UMA  =========== */
function TelaPerguntas({ tipoInfo, segmento, onVoltar, onConcluir }) {
  const total = segmento.perguntas.length;
  const [i, setI] = useState(0);
  const [resp, setResp] = useState({});
  const taRef = useRef(null);
  const cor = tipoInfo.cor;

  useEffect(() => { const t = setTimeout(() => taRef.current?.focus(), 200); return () => clearTimeout(t); }, [i]);

  const atual = segmento.perguntas[i];
  const valor = resp[i] || "";
  const ultima = i === total - 1;
  const progresso = Math.round(((i + 1) / total) * 100);

  function setValor(v) { setResp((r) => ({ ...r, [i]: v })); }
  function avancar() {
    if (ultima) {
      const final = {};
      Object.keys(resp).forEach((k) => (final[Number(k) + 1] = resp[k]));
      onConcluir(final);
    } else { setI((x) => x + 1); }
  }
  function voltar() { if (i === 0) onVoltar(); else setI((x) => x - 1); }

  return (
    <div>
      <BotaoVoltar onClick={voltar} rotulo={i === 0 ? "Voltar" : "Pergunta anterior"} />
      <PassoIndicador atual={4} cor={cor} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 16px" }}>
        <span style={{ fontSize: 22 }}>{segmento.emoji}</span>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{segmento.nome}</span>
      </div>
      <div style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: cor }}>Pergunta {i + 1} de {total}</span>
        <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>{progresso}%</span>
      </div>
      <div style={{ height: 9, background: C.line, borderRadius: 99, overflow: "hidden", marginBottom: 26 }}>
        <div style={{ height: "100%", width: `${progresso}%`, background: cor, borderRadius: 99, transition: "width .35s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <div key={i} style={{ animation: "slideIn .3s ease both" }}>
        <h2 style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.3, margin: "0 0 8px" }}>{atual.q}</h2>
        <div style={{ fontSize: 13.5, color: C.sub, fontStyle: "italic", lineHeight: 1.5, marginBottom: 16 }}>{atual.dica}</div>
        <textarea
          ref={taRef}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Responda do seu jeito, com suas palavras…"
          rows={4}
          style={{ width: "100%", boxSizing: "border-box", padding: 16, fontSize: 16, fontFamily: FONT, lineHeight: 1.5, borderRadius: 16, border: `2px solid ${C.line}`, outline: "none", resize: "none", background: C.card, color: C.ink }}
          onFocus={(e) => (e.target.style.borderColor = cor)}
          onBlur={(e) => (e.target.style.borderColor = C.line)}
        />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button onClick={avancar} style={{ flex: 1, padding: "16px", fontSize: 16.5, fontWeight: 800, fontFamily: FONT, color: "#fff", background: cor, border: "none", borderRadius: 16, cursor: "pointer", boxShadow: `0 6px 18px ${cor}44` }}>
          {ultima ? "Concluir ✨" : "Próxima →"}
        </button>
      </div>
      {!ultima && (
        <button onClick={avancar} style={{ display: "block", margin: "14px auto 0", background: "none", border: "none", color: C.sub, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
          Pular esta pergunta
        </button>
      )}
      <Estilos />
    </div>
  );
}

/* ===========  TELA 4 — CONCLUSÃO  =========== */
function TelaFim({ tipoInfo, segmento, cadastro, onCriarLogo, onReiniciar }) {
  const cor = tipoInfo.cor;
  const qtd = Object.values(cadastro.respostas || {}).filter((v) => v && v.trim()).length;
  const precisaLogo = cadastro.criarLogoDepois && !cadastro.logo;
  return (
    <div style={{ textAlign: "center", paddingTop: 40, animation: "fadeUp .5s ease both" }}>
      <div style={{ width: 88, height: 88, margin: "0 auto 20px", borderRadius: "50%", background: tipoInfo.corBg, display: "grid", placeItems: "center", fontSize: 44 }}>✅</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, margin: "0 0 10px" }}>Tudo pronto, {cadastro.nome?.split(" ")[0] || "tudo certo"}!</h2>
      <p style={{ color: C.sub, fontSize: 15.5, lineHeight: 1.55, margin: "0 0 6px" }}>
        Você configurou <b style={{ color: C.ink }}>{segmento.nome}</b> e respondeu <b style={{ color: cor }}>{qtd}</b> {qtd === 1 ? "pergunta" : "perguntas"}.
      </p>
      <p style={{ color: C.sub, fontSize: 15.5, lineHeight: 1.55, margin: "0 0 26px" }}>
        Agora a IA já sabe falar do jeitinho do seu negócio. 🚀
      </p>

      {precisaLogo && (
        <div style={{ background: tipoInfo.corBg, border: `2px solid ${cor}33`, borderRadius: 18, padding: "18px 16px", marginBottom: 18, textAlign: "left", animation: "fadeUp .4s ease .1s both" }}>
          <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 4 }}>🎨 Que tal criar seu logo agora?</div>
          <div style={{ fontSize: 13.5, color: C.sub, lineHeight: 1.5, marginBottom: 14 }}>
            A IA cria um logo pra você em segundos, com a cara do seu negócio. Seus posts ficam muito mais profissionais com ele!
          </div>
          <button onClick={onCriarLogo} style={{ width: "100%", padding: 15, fontSize: 15.5, fontWeight: 800, fontFamily: FONT, color: "#fff", background: cor, border: "none", borderRadius: 14, cursor: "pointer", boxShadow: `0 6px 18px ${cor}44` }}>
            Criar meu logo com IA ✨
          </button>
        </div>
      )}

      <button style={{ width: "100%", padding: 16, fontSize: 16.5, fontWeight: 800, fontFamily: FONT, color: precisaLogo ? cor : "#fff", background: precisaLogo ? C.card : cor, border: precisaLogo ? `2px solid ${cor}` : "none", borderRadius: 16, cursor: "pointer", boxShadow: precisaLogo ? "none" : `0 6px 18px ${cor}44`, marginBottom: 12 }}>
        {precisaLogo ? "Pular e criar meu primeiro post" : "Criar meu primeiro post ✨"}
      </button>
      <button onClick={onReiniciar} style={{ background: "none", border: "none", color: C.sub, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>← Recomeçar</button>
      <Estilos />
    </div>
  );
}

/* ===========  TELA 3 — NOME + WHATSAPP  =========== */
function TelaIdentificacao({ tipoInfo, ehPessoal, valores, onVoltar, onAvancar }) {
  const cor = tipoInfo.cor;
  const [nome, setNome] = useState(valores.nome || "");
  const [zap, setZap] = useState(valores.whatsapp || "");

  function mascararZap(v) {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : "";
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  const zapValido = zap.replace(/\D/g, "").length >= 10;
  const nomeValido = nome.trim().length >= 2;
  const podeAvancar = nomeValido && zapValido;

  const rotuloNome = ehPessoal
    ? "Qual é o seu nome ou o nome da sua página?"
    : tipoInfo.rotulo === "Sou profissional"
    ? "Qual é o seu nome ou o nome do seu trabalho?"
    : "Qual é o nome do seu negócio?";
  const dicaNome = ehPessoal
    ? "É como você quer aparecer nos posts. Ex: Ana Souza, @anacozinha"
    : tipoInfo.rotulo === "Sou profissional"
    ? "Ex: Dra. Marina Lopes, Studio Pilates Marina, João Eletricista"
    : "Ex: Pizzaria do Léo, Boutique Bella, Mercado São Jorge";

  return (
    <div>
      <BotaoVoltar onClick={onVoltar} />
      <PassoIndicador atual={1} cor={cor} />
      <Topo titulo="Vamos nos conhecer 👋" sub="Esses dados aparecem nos seus posts e no botão de contato." cor={cor} />
      <div style={{ marginTop: 22, animation: "fadeUp .35s ease both" }}>
        <Rotulo>{rotuloNome}</Rotulo>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Digite aqui…" style={inp(cor)}
          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
        <Ajuda>{dicaNome}</Ajuda>
        <div style={{ height: 18 }} />
        <Rotulo>Qual o WhatsApp de contato?</Rotulo>
        <input value={zap} onChange={(e) => setZap(mascararZap(e.target.value))} placeholder="(11) 98888-7777" inputMode="numeric" style={inp(cor)}
          onFocus={(e) => (e.target.style.borderColor = cor)} onBlur={(e) => (e.target.style.borderColor = C.line)} />
        <Ajuda>É pra onde seus clientes vão falar com você quando virem os posts. 💬</Ajuda>
      </div>
      <BotaoPrincipal cor={cor} desabilitado={!podeAvancar} onClick={() => onAvancar({ nome: nome.trim(), whatsapp: zap })}>
        Continuar →
      </BotaoPrincipal>
      <Estilos />
    </div>
  );
}

/* ===========  TELA 4 — TOM DE COMUNICAÇÃO (até 2)  =========== */
const TONS = [
  { id: "animado", emoji: "🎉", nome: "Animado", desc: "Empolgado, com energia e emojis" },
  { id: "profissional", emoji: "👔", nome: "Profissional", desc: "Sério, confiável e objetivo" },
  { id: "elegante", emoji: "✨", nome: "Elegante", desc: "Sofisticado e refinado" },
  { id: "descontraido", emoji: "😄", nome: "Descontraído", desc: "Leve, divertido e próximo" },
  { id: "emocional", emoji: "💛", nome: "Emocional", desc: "Caloroso, que toca o coração" },
  { id: "direto", emoji: "🎯", nome: "Direto", desc: "Curto, claro e sem rodeios" },
];

function TelaTom({ tipoInfo, valores, onVoltar, onAvancar }) {
  const cor = tipoInfo.cor;
  const [sel, setSel] = useState(valores.tons || []);
  function toggle(id) {
    setSel((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (s.length >= 2) return [s[1], id];
      return [...s, id];
    });
  }
  return (
    <div>
      <BotaoVoltar onClick={onVoltar} rotulo="Voltar" />
      <PassoIndicador atual={2} cor={cor} />
      <Topo titulo="Qual é o seu jeito de falar?" cor={cor}
        sub="O tom muda como a IA escreve seus posts. O mesmo anúncio fica bem diferente se for animado ou elegante — escolha o que combina com você." />
      <div style={{ fontSize: 13, fontWeight: 700, color: cor, margin: "16px 2px 12px" }}>
        Escolha 1 ou 2 {sel.length > 0 ? `· ${sel.length}/2 selecionado${sel.length > 1 ? "s" : ""}` : ""}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {TONS.map((t, idx) => {
          const ativo = sel.includes(t.id);
          return (
            <button key={t.id} onClick={() => toggle(t.id)}
              style={{ textAlign: "left", background: ativo ? tipoInfo.corBg : C.card, border: `2px solid ${ativo ? cor : C.line}`, borderRadius: 18, padding: "15px 14px", cursor: "pointer", position: "relative", transition: "all .15s", animation: `fadeUp .3s ease ${idx * 0.04}s both` }}>
              {ativo && (<span style={{ position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", background: cor, color: "#fff", fontSize: 12, fontWeight: 900, display: "grid", placeItems: "center" }}>✓</span>)}
              <div style={{ fontSize: 26, marginBottom: 6 }}>{t.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 2 }}>{t.nome}</div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.35 }}>{t.desc}</div>
            </button>
          );
        })}
      </div>
      <BotaoPrincipal cor={cor} desabilitado={sel.length === 0} onClick={() => onAvancar({ tons: sel })}>
        Continuar →
      </BotaoPrincipal>
      <Estilos />
    </div>
  );
}

/* ===========  TELA 5 — LOGOTIPO  =========== */
function TelaLogo({ tipoInfo, valores, onVoltar, onAvancar }) {
  const cor = tipoInfo.cor;
  const [logo, setLogo] = useState(valores.logo || null);
  const [analisando, setAnalisando] = useState(false);
  const fileRef = useRef(null);
  function escolherArquivo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result);
      setAnalisando(true);
      analisarLogoComIA(reader.result).then(() => setAnalisando(false)).catch(() => setAnalisando(false));
    };
    reader.readAsDataURL(f);
  }
  return (
    <div>
      <BotaoVoltar onClick={onVoltar} rotulo="Voltar" />
      <PassoIndicador atual={3} cor={cor} />
      <Topo titulo="Você tem um logotipo?" cor={cor}
        sub="O logo entra nos seus posts e ajuda a IA a usar as cores e o estilo da sua marca." />
      <div style={{ marginTop: 22 }}>
        {!logo ? (
          <button onClick={() => fileRef.current?.click()}
            style={{ width: "100%", border: `2px dashed ${cor}`, background: tipoInfo.corBg, borderRadius: 20, padding: "34px 20px", cursor: "pointer", textAlign: "center", fontFamily: FONT, animation: "fadeUp .35s ease both" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📤</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.ink, marginBottom: 4 }}>Enviar meu logotipo</div>
            <div style={{ fontSize: 13, color: C.sub }}>Toque para escolher uma imagem (PNG ou JPG)</div>
          </button>
        ) : (
          <div style={{ textAlign: "center", animation: "fadeUp .3s ease both" }}>
            <div style={{ width: 150, height: 150, margin: "0 auto 14px", borderRadius: 20, border: `2px solid ${C.line}`, background: "#fff", display: "grid", placeItems: "center", overflow: "hidden" }}>
              <img src={logo} alt="logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
            </div>
            {analisando ? (
              <div style={{ fontSize: 14, color: cor, fontWeight: 700 }}><span className="pf-pulse">🎨 Analisando cores e estilo do seu logo…</span></div>
            ) : (
              <div style={{ fontSize: 14, color: C.sub }}>Logo recebido! ✅ <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", color: cor, fontWeight: 700, cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>Trocar</button></div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={escolherArquivo} style={{ display: "none" }} />
      </div>
      <BotaoPrincipal cor={cor} desabilitado={analisando} onClick={() => onAvancar({ logo, criarLogoDepois: false })}>
        {logo ? "Continuar →" : "Continuar com logo"}
      </BotaoPrincipal>
      {!logo && (
        <button onClick={() => onAvancar({ logo: null, criarLogoDepois: true })}
          style={{ display: "block", width: "100%", marginTop: 12, padding: "15px", background: C.card, border: `2px solid ${C.line}`, borderRadius: 16, color: C.ink, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: FONT }}>
          ✨ Não tenho logo — criar depois
        </button>
      )}
      {!logo && (<Ajuda center>Sem problema! Você termina o cadastro e cria seu logo no final, com a ajuda da IA.</Ajuda>)}
      <Estilos />
    </div>
  );
}

async function analisarLogoComIA(dataUrl) {
  // GANCHO: no app, enviar a imagem ao modelo e pedir análise de cores/estilo.
  // Retornar { coresPrincipais:[], estilo:'', observacoes:'' } e salvar nos dados do cliente.
  await new Promise((r) => setTimeout(r, 1400));
  return { coresPrincipais: [], estilo: "", observacoes: "" };
}

/* ===========  PEÇAS DE FORM REUTILIZÁVEIS  =========== */
function PassoIndicador({ atual, cor }) {
  const total = 4; // 1 nome · 2 tom · 3 logo · 4 perguntas
  return (
    <div style={{ display: "flex", gap: 6, margin: "6px 0 2px" }}>
      {Array.from({ length: total }, (_, k) => (
        <div key={k} style={{ flex: 1, height: 5, borderRadius: 99, background: k < atual ? cor : C.line, transition: "background .3s" }} />
      ))}
    </div>
  );
}
function Rotulo({ children }) {
  return <label style={{ display: "block", fontWeight: 800, fontSize: 15.5, marginBottom: 8 }}>{children}</label>;
}
function Ajuda({ children, center }) {
  return <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.45, marginTop: 7, textAlign: center ? "center" : "left", fontStyle: "italic" }}>{children}</div>;
}
function inp(cor) {
  return { width: "100%", boxSizing: "border-box", padding: "15px 16px", fontSize: 16, fontFamily: FONT, borderRadius: 16, border: `2px solid ${C.line}`, outline: "none", background: C.card, color: C.ink };
}
function BotaoPrincipal({ cor, desabilitado, onClick, children }) {
  return (
    <button onClick={onClick} disabled={desabilitado}
      style={{ width: "100%", padding: 16, marginTop: 24, fontSize: 16.5, fontWeight: 800, fontFamily: FONT, color: "#fff", background: desabilitado ? "#C2D2DB" : cor, border: "none", borderRadius: 16, cursor: desabilitado ? "default" : "pointer", boxShadow: desabilitado ? "none" : `0 6px 18px ${cor}44`, transition: "background .2s" }}>
      {children}
    </button>
  );
}

/* ===========  PEÇAS REUTILIZÁVEIS  =========== */
function Topo({ titulo, sub, cor }) {
  return (
    <div style={{ paddingTop: 30 }}>
      <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 8px", color: cor || C.ink, lineHeight: 1.2 }}>{titulo}</h1>
      {sub && <p style={{ fontSize: 15, color: C.sub, lineHeight: 1.5, margin: 0 }}>{sub}</p>}
    </div>
  );
}
function BotaoVoltar({ onClick, rotulo = "Voltar" }) {
  return (
    <button onClick={onClick} style={{ marginTop: 18, marginBottom: 4, background: "none", border: "none", color: C.sub, fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT, padding: "4px 0" }}>← {rotulo}</button>
  );
}
function Estilos() {
  return (
    <style>{`
      @keyframes fadeUp { from { opacity:0; transform: translateY(12px);} to {opacity:1; transform:translateY(0);} }
      @keyframes slideIn { from { opacity:0; transform: translateX(16px);} to {opacity:1; transform:translateX(0);} }
      @keyframes pfPulse { 0%,100% { opacity:1; } 50% { opacity:.45; } }
      .pf-pulse { animation: pfPulse 1.2s ease-in-out infinite; display:inline-block; }
      * { -webkit-tap-highlight-color: transparent; }
      textarea::placeholder, input::placeholder { color: #9DB2BD; }
    `}</style>
  );
}
