// Ficha do cliente — criar, salvar e carregar (o "banco de dados" dele)
// Hoje em localStorage; quando migrar pro Supabase, só estas funções mudam.

const CHAVE_PERFIL = "pf_profile";

export function criarFicha(dados) {
  const agora = new Date().toISOString();
  return {
    nome: dados.nome || "",
    whatsapp: dados.whatsapp || "",
    tipo: dados.tipo || null,
    segmentoId: dados.segmentoId || null,
    segmentoNome: dados.segmentoNome || null,
    tons: Array.isArray(dados.tons) ? dados.tons : [],
    respostas: dados.respostas && typeof dados.respostas === "object" ? dados.respostas : {},
    logo: dados.logo || null,
    criarLogoDepois: !!dados.criarLogoDepois,
    analiseLogo: dados.analiseLogo || { coresPrincipais: [], estilo: "", observacoes: "" },
    identidadeVisual: null,
    historicoEstilos: [],
    plano: dados.plano || "basico",
    criadoEm: agora,
    atualizadoEm: agora,
    versao: 1,
  };
}

export function salvarFicha(ficha) {
  const f = { ...ficha, atualizadoEm: new Date().toISOString() };
  try {
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(f));
  } catch {}
  return f;
}

export function carregarFicha() {
  try {
    const raw = localStorage.getItem(CHAVE_PERFIL);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function limparFicha() {
  try {
    localStorage.removeItem(CHAVE_PERFIL);
  } catch {}
}
