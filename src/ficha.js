// ============================================================
// FICHA DO CLIENTE — criar, salvar e carregar
// É o "banco de dados" do cliente. Hoje em localStorage;
// quando migrar pro Supabase, só estas funções mudam.
// ============================================================

const CHAVE_PERFIL = "pf_profile";

// Cria a ficha a partir do que o onboarding devolve
export function criarFicha(dados) {
  const agora = new Date().toISOString();
  return {
    // identificação
    nome: dados.nome || "",
    nomePessoa: dados.nomePessoa || "",
    whatsapp: dados.whatsapp || "",
    // tipo e segmento
    tipo: dados.tipo || null,
    segmentoId: dados.segmentoId || null,
    segmentoNome: dados.segmentoNome || null,
    // comunicação
    tons: Array.isArray(dados.tons) ? dados.tons : [],
    // respostas do onboarding
    respostas: dados.respostas && typeof dados.respostas === "object" ? dados.respostas : {},
    // marca
    logo: dados.logo || null,
    criarLogoDepois: !!dados.criarLogoDepois,
    analiseLogo: dados.analiseLogo || { coresPrincipais: [], estilo: "", observacoes: "" },
    // identidade visual opcional (definida depois)
    identidadeVisual: null,
    // memória do rodízio de estilos
    historicoEstilos: [],
    // plano (padrão básico; upgrade depois)
    plano: dados.plano || "basico",
    // controle
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
