// ============================================================
// TESTE DA LEITURA DO JSON DA NOSSA IA (post de Negócio)
//
//   npm run teste-json
//
// Por que existe: uma aspa dupla não escapada no meio da legenda fechava a
// string cedo, o JSON.parse lançava e o post INTEIRO caía no modo
// demonstração — texto, imagem e layout de Negócio. O extrairJSON passou a ler
// em quatro camadas; este script prova que as camadas pegam cada defeito.
//
// Como testa: recorta o bloco "LEITURA DO JSON" do próprio src/App.jsx e o
// avalia. Testa o CÓDIGO REAL, não uma cópia — se alguém mexer no App.jsx e
// quebrar a cascata, este teste acusa. Em troca, ele depende dos nomes do
// bloco; se o recorte falhar, a mensagem diz o que procurar.
//
// O arquivo é .cjs porque o package.json tem "type": "module".
// ============================================================
const fs = require("fs");

const CAMINHO = process.argv[2] || "src/App.jsx";

const src = fs.readFileSync(CAMINHO, "utf8");
const marca = src.indexOf("// LEITURA DO JSON DA NOSSA IA");
const fimBloco = src.indexOf("async function gerarPostNegocioReal");
if (marca === -1 || fimBloco === -1) {
  console.error(
    `ERRO: não achei o bloco de leitura do JSON em ${CAMINHO}.\n` +
    'Procuro o comentário "LEITURA DO JSON DA NOSSA IA" e a função ' +
    '"gerarPostNegocioReal". Se algum dos dois foi renomeado, ajuste aqui.'
  );
  process.exit(1);
}
const bloco = src.slice(src.lastIndexOf("// ===", marca), fimBloco);

// debugNegocio é uma variável de módulo no App.jsx; aqui vira um espelho local
// para o teste saber QUAL camada salvou a leitura.
const api = new Function(
  "let debugNegocio = null;\n" +
  bloco +
  "\nreturn { extrairJSON," +
  "  resetDbg: () => { debugNegocio = { recuperacaoJSON: null }; }," +
  "  dbg: () => debugNegocio };"
)();

let falhas = 0;

// Roda um caso e confere DUAS coisas: qual camada resolveu, e se o conteúdo
// recuperado está certo (não basta não lançar — o texto tem que sobreviver).
function caso(nome, texto, camadaEsperada, checaConteudo) {
  api.resetDbg();
  let camada, obj = null, erro = null;
  try {
    obj = api.extrairJSON(texto);
    const nota = api.dbg().recuperacaoJSON;
    camada = !nota ? "1-parse" : nota.startsWith("faxina") ? "2-faxina" : "3-esquema";
  } catch (e) {
    camada = "4-desiste";
    erro = e.message;
  }
  const okCamada = camada === camadaEsperada;
  const okConteudo = checaConteudo ? checaConteudo(obj) : true;
  if (!okCamada || !okConteudo) falhas++;

  console.log(
    (okCamada && okConteudo ? "  ok  " : " FALHA") + ` | ${nome}` +
    `\n        camada esperada: ${camadaEsperada} | obtida: ${camada}` +
    (checaConteudo ? ` | conteúdo: ${okConteudo ? "certo" : "ERRADO"}` : "") +
    (obj ? `\n        legenda: ${JSON.stringify(String(obj.legenda).slice(0, 70))}` : "") +
    (erro ? `\n        erro: ${erro.slice(0, 90)}` : "")
  );
}

// ---- camada 1: o caminho normal, que é o caso da grande maioria ----
caso("JSON válido", `{
  "legenda": "Pao quentinho todo dia na nossa padaria!",
  "texto_imagem": "PAO FRESCO",
  "descricao_fundo": "plano americano de atendente sorrindo",
  "resumo_cena": "atendente entregando pao",
  "cta": "Venha hoje",
  "hashtags": ["#padaria", "#paoquentinho"]
}`, "1-parse", (o) => o.hashtags.length === 2 && o.cta === "Venha hoje");

// ---- camada 2: defeitos mecânicos ----
caso("vírgula sobrando antes do }", `{
  "legenda": "Pao quentinho todo dia!",
  "texto_imagem": "PAO FRESCO",
  "cta": "Venha hoje",
  "hashtags": ["#padaria"],
}`, "2-faxina", (o) => o.cta === "Venha hoje");

caso("quebra de linha literal dentro da string", `{
  "legenda": "Pao quentinho
todo dia!",
  "texto_imagem": "PAO FRESCO",
  "cta": "Venha hoje",
  "hashtags": ["#padaria"]
}`, "2-faxina", (o) => o.legenda.includes("todo dia"));

// ---- camada 3: aspas e vírgulas que o parse não perdoa ----
// Este é o erro capturado ao vivo no painel de dev: "Expected ',' or '}' after
// property value in JSON at position 93 (line 2 column 92)". A aspa cai por
// volta da coluna 92 da linha 2, que é a legenda.
caso("aspa não escapada na legenda (o erro capturado em produção)", `{
  "legenda": "Na nossa padaria o pao sai quentinho do forno a lenha "de verdade", do jeito que a vovo fazia! Vem provar.",
  "texto_imagem": "PAO DE VERDADE",
  "descricao_fundo": "plano americano de padeiro tirando pao do forno",
  "resumo_cena": "padeiro tirando pao do forno",
  "cta": "Venha provar hoje",
  "hashtags": ["#padaria", "#paoartesanal", "#forno"]
}`, "3-esquema", (o) =>
  o.legenda.includes("de verdade") &&
  o.legenda.includes("Vem provar") &&
  o.texto_imagem === "PAO DE VERDADE" &&
  o.cta === "Venha provar hoje" &&
  o.hashtags.includes("#paoartesanal")
);

// A outra causa possível da MESMA mensagem de erro do V8.
caso("vírgula faltando entre as chaves", `{
  "legenda": "Pao quentinho todo dia na nossa padaria de bairro, feito com carinho!"
  "texto_imagem": "PAO FRESCO",
  "cta": "Venha hoje",
  "hashtags": ["#padaria"]
}`, "3-esquema", (o) => o.legenda.includes("carinho") && o.texto_imagem === "PAO FRESCO");

caso("várias aspas soltas no mesmo texto", `{
  "legenda": "O nosso "pao da casa" e o "campeao" da vizinhanca!",
  "texto_imagem": "O "CAMPEAO"",
  "cta": "Prove",
  "hashtags": ["#padaria"]
}`, "3-esquema", (o) => o.legenda.includes("campeao") && o.texto_imagem.includes("CAMPEAO"));

// ---- lacuna conhecida, registrada de propósito ----
// JSON VÁLIDO mas sem legenda passa pela camada 1 e o post sai com texto
// vazio. É o comportamento que já existia antes da cascata; fechar isso
// mandaria uma resposta bem-formada para o demo, um caminho de falha novo.
caso("válido mas sem legenda (lacuna pré-existente)", `{ "cta": "Venha", "hashtags": ["#a"] }`,
  "1-parse", (o) => o.legenda === undefined && o.cta === "Venha");

// ---- camada 4: aí sim, demo ----
caso("malformado e sem legenda", `{ "cta": "Venha" "hashtags": ["#a"] }`, "4-desiste");
caso("resposta sem JSON nenhum", "Desculpe, nao consegui gerar.", "4-desiste");

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTodos os casos passaram.");
process.exit(falhas ? 1 : 0);
