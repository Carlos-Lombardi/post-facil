// ============================================================
// FICHA DO CLIENTE — criar, salvar e carregar
// É o "banco de dados" do cliente. Hoje em localStorage;
// quando migrar pro Supabase, só estas funções mudam.
// ============================================================

const CHAVE_PERFIL = "pf_profile";

// Gera um identificador estável e único para o cliente. É a âncora dos dados
// por cliente (ex.: histórico anti-repetição): não muda se o cliente editar o
// WhatsApp depois e nunca colide com o balde "anon".
function novoClienteId() {
  const rnd = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  return "cli_" + rnd;
}

// Garante que uma ficha já existente tenha clienteId, persistindo se faltar.
// (Fichas criadas antes deste campo recebem um id na primeira carga.)
export function garantirClienteId(ficha) {
  if (!ficha || ficha.clienteId) return ficha;
  const atualizada = { ...ficha, clienteId: novoClienteId() };
  salvarFicha(atualizada);
  return atualizada;
}

// Cria a ficha a partir do que o onboarding devolve
export function criarFicha(dados) {
  const agora = new Date().toISOString();
  return {
    // identificador estável do cliente (âncora de dados por cliente)
    clienteId: dados.clienteId || novoClienteId(),
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
    // cor da marca extraída do logo (original do cliente) e a versão ajustada
    // para o layout (escurecida para o texto branco ficar legível por cima)
    corMarca: dados.corMarca || null,
    corMarcaLayout: dados.corMarcaLayout || null,
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
