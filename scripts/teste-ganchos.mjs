// ============================================================
// TESTE DA BIBLIOTECA DE GANCHOS (post de Negócio)
//
//   npm run teste-ganchos
//
// Por que existe: a copy do post passou a depender de duas peças que erram em
// silêncio. (1) O PÚBLICO do cliente decide quais famílias de gancho estão
// liberadas — um segmento no balde errado libera urgência para médico, que é
// proibido pelo conselho. (2) A chamada agora tem até 3 LINHAS e a fonte
// encolhe sozinha — se a conta errar, a terceira linha cai fora da faixa
// escura, em cima da foto crua, e ninguém lê.
//
// Também trava um erro sutil que já aconteceu uma vez: EXEMPLO ENSINANDO O
// QUE A REGRA PROÍBE. Para a nossa IA, um exemplo com 'Chama no WhatsApp'
// vale mais que a regra escrita dizendo que advogado não pode captar cliente.
//
// A quebra de linha é lida do PRÓPRIO src/App.jsx (o bloco entre NEGOCIO e a
// Landing) — testa o código real, não uma cópia.
//
// O arquivo é .mjs para poder importar src/ganchos.js, que é ESM.
// ============================================================
import fs from "fs";
import {
  publicoDoCliente, rotuloDoPublico, temBibliotecaDeGanchos, familiasLiberadas,
  blocoCopyParaSystem, blocoEscolhaDaFamilia, normalizarFamilia, PUBLICOS,
} from "../src/ganchos.js";

const CAMINHO = process.argv[2] || "src/App.jsx";
const src = fs.readFileSync(CAMINHO, "utf8");
const ini = src.indexOf("const NEGOCIO = {");
const fim = src.indexOf("function Landing(");
if (ini === -1 || fim === -1 || fim < ini) {
  console.error(
    `ERRO: não achei o bloco do layout em ${CAMINHO}.\n` +
    'Procuro "const NEGOCIO = {" e "function Landing(". Se algum dos dois ' +
    "foi renomeado, ajuste aqui."
  );
  process.exit(1);
}
const { quebrarEmLinhas, tamanhoDaChamada, alturaDoDegrade } = new Function(
  src.slice(ini, fim) + "\nreturn { quebrarEmLinhas, tamanhoDaChamada, alturaDoDegrade };"
)();

let falhas = 0;
function ok(cond, msg, extra = "") {
  if (!cond) falhas++;
  console.log((cond ? "  ok  " : " FALHA") + " | " + msg + (extra ? "\n        " + extra : ""));
}

// ---- 1. cada segmento cai no público certo, com as famílias certas ----
console.log("=== PÚBLICO E FAMÍLIAS LIBERADAS ===");
const casos = [
  ["comércio", { tipo: "comercio", segmentoId: "padaria" }, PUBLICOS.COMERCIO, 10],
  ["advogado", { tipo: "profissional", segmentoId: "advogado_trabalhista" }, PUBLICOS.ADVOCACIA, 5],
  ["nutricionista", { tipo: "profissional", segmentoId: "nutricionista" }, PUBLICOS.SAUDE, 7],
  ["médico", { tipo: "profissional", segmentoId: "medico_consultorio_medico" }, PUBLICOS.SAUDE, 7],
  ["eletricista", { tipo: "profissional", segmentoId: "eletricista" }, PUBLICOS.PROF_OUTRA, 10],
  ["perfil pessoal", { tipo: "pessoal", segmentoId: "pagina_pessoal" }, PUBLICOS.PESSOAL, 0],
  ["ficha antiga sem tipo", {}, PUBLICOS.COMERCIO, 10],
];
for (const [rotulo, perfil, esperado, quantas] of casos) {
  const p = publicoDoCliente(perfil);
  const fams = familiasLiberadas(p);
  ok(p === esperado && fams.length === quantas,
    `${rotulo} -> ${p} (${fams.length} famílias)`,
    rotuloDoPublico(p) + "\n        " + (fams.map((f) => f.id).join(", ") || "(nenhuma)"));
}
ok(!temBibliotecaDeGanchos(PUBLICOS.PESSOAL),
  "perfil pessoal fica FORA da biblioteca (espera o onboarding próprio)");

// ---- 2. famílias bloqueadas não vazam para nenhum público ----
console.log("\n=== FAMÍLIAS BLOQUEADAS ===");
for (const p of [PUBLICOS.COMERCIO, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA, PUBLICOS.PROF_OUTRA]) {
  const ids = familiasLiberadas(p).map((f) => f.id);
  ok(!ids.includes("transformacao") && !ids.includes("prova"),
    `${p}: sem Transformação (precisa de foto real do antes) nem Prova (precisa de número real)`);
}
const adv = familiasLiberadas(PUBLICOS.ADVOCACIA).map((f) => f.id);
ok(!adv.includes("urgencia") && !adv.includes("beneficio") && !adv.includes("escolha"),
  "advocacia: sem urgência, benefício direto nem escolha", adv.join(", "));
const sau = familiasLiberadas(PUBLICOS.SAUDE).map((f) => f.id);
ok(!sau.includes("urgencia") && !sau.includes("beneficio"),
  "saúde: sem urgência (proibida) nem benefício direto (vira promessa de resultado)", sau.join(", "));

// ---- 3. o prompt não pode ensinar o que ele mesmo proíbe ----
console.log("\n=== O QUE OS EXEMPLOS ENSINAM ===");
const exemplosDe = (p) =>
  blocoCopyParaSystem(p).split("\n").filter((l) => /^(\s*EXEMPLO:|CERTO:)/.test(l));

for (const p of [PUBLICOS.COMERCIO, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA, PUBLICOS.PROF_OUTRA]) {
  // Aspa dupla dentro de um texto quebra o JSON e derruba o post inteiro.
  // A biblioteca original escrevia as chamadas de objeção entre aspas duplas.
  const comAspas = exemplosDe(p).filter((l) => l.includes('"'));
  ok(comAspas.length === 0, `${p}: nenhum exemplo com aspa dupla`,
    comAspas.map((l) => l.slice(0, 100)).join("\n        "));
}
for (const p of [PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA]) {
  const captacao = exemplosDe(p).filter((l) => /whats|chama aqui|chama no|passa aqui/i.test(l));
  ok(captacao.length === 0,
    `${p}: nenhum exemplo com CTA de captação (${exemplosDe(p).length} exemplos conferidos)`,
    captacao.map((l) => l.slice(0, 100)).join("\n        "));
  const promessa = exemplosDe(p).filter((l) => /garant|melhor da regi/i.test(l));
  ok(promessa.length === 0, `${p}: nenhum exemplo com promessa de resultado ou superlativo`,
    promessa.map((l) => l.slice(0, 100)).join("\n        "));
}

// ---- 4. leitura do campo "familia" que a nossa IA devolve ----
console.log("\n=== NORMALIZAÇÃO DA FAMÍLIA ===");
[
  ["lista", "lista"], ["Lista numerada", "lista"], ["BASTIDOR", "bastidor"],
  ["Objeção", "objecao"], ["objecao", "objecao"], ["Data e momento", "data"],
  ["", ""], ["l", ""], ["transformacao", ""], ["qualquer coisa", ""],
].forEach(([entrada, esperado]) => {
  const r = normalizarFamilia(entrada);
  ok(r === esperado, `"${entrada}" -> "${r}"`);
});

// ---- 5. regra R4: a anterior é proibida, a menos usada é preferida ----
console.log("\n=== REGRA R4 ===");
const hist = [
  { familia: "lista" }, { familia: "bastidor" }, { familia: "lista" },
  { familia: "erro" }, { familia: "lista" }, { familia: "objecao" },
  { familia: "curiosidade" }, { familia: "data" },
];
const b = blocoEscolhaDaFamilia(PUBLICOS.COMERCIO, hist);
ok(b.includes("Data e momento — PROIBIDA"), "a família do post anterior fica proibida");
ok(b.includes("Lista numerada 2x"), "a contagem olha só os últimos 7 (lista aparece 3x no total)");
ok(!/PREFIRA[^\n]*Data e momento/.test(b), "a proibida não entra na lista de preferidas");
ok(blocoEscolhaDaFamilia(PUBLICOS.ADVOCACIA, []).includes("primeiro post"),
  "primeiro post do cliente: nenhuma família proibida");
ok(blocoEscolhaDaFamilia(PUBLICOS.COMERCIO, [{ cena: "x" }]).includes("primeiro post"),
  "histórico anterior à biblioteca (sem família) não trava nada");
// Nunca pode dar impasse: mesmo no público de 5 famílias, sempre sobra opção.
const seguidos = Array.from({ length: 20 }, () => ({ familia: "lista" }));
ok(/PREFIRA/.test(blocoEscolhaDaFamilia(PUBLICOS.ADVOCACIA, seguidos)),
  "20 posts da mesma família e ainda sobra o que escolher (sem impasse)");

// ---- 6. a chamada de até 3 linhas cabe e continua legível ----
console.log("\n=== CHAMADA: QUEBRA, FONTE E FAIXA ESCURA ===");
const chamadas = [
  "PAO FRESCO",
  "3 ERROS QUE ESTRAGAM SEU CHURRASCO",
  "3 SINAIS DE QUE SEU FREIO ESTA NO LIMITE",
  "4 COISAS QUE NINGUEM TE CONTA SOBRE ADUBACAO DE JARDIM",
  "PARE DE LAVAR O CABELO COM AGUA QUENTE",
  "3 DOCUMENTOS QUE VOCE PRECISA GUARDAR",
];
for (const c of chamadas) {
  const linhas = quebrarEmLinhas(c);
  const fonte = tamanhoDaChamada(linhas);
  const maior = Math.max(...linhas.map((l) => l.length));
  const grad = alturaDoDegrade(linhas, fonte);
  const fimTexto = (5.9 / 100) * 125 + linhas.length * 1.11 * fonte;   // cqi
  const fimUtil = (grad / 1350) * 125 * 0.756;                          // cqi
  ok(linhas.length <= 3 && fimTexto <= fimUtil + 0.01 && maior * fonte * 0.62 <= 88.01,
    `"${c}"`,
    `${linhas.length} linha(s) · fonte ${fonte.toFixed(2)}cqi · degradê ${grad} · ` +
    `texto acaba em ${fimTexto.toFixed(1)}cqi (útil até ${fimUtil.toFixed(1)})\n        ` +
    linhas.map((l) => "[" + l + "]").join(" "));
  ok(linhas.join(" ") === c, "  nenhuma palavra cortada ou perdida");
}
ok(alturaDoDegrade(["UMA"], 8.15) === 365 && alturaDoDegrade(["UMA", "DUAS"], 8.15) === 365,
  "com 1 ou 2 linhas o degradê continua exatamente o do desenho (365)");

console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTodos os casos passaram.");
process.exit(falhas ? 1 : 0);
