// ============================================================
// BIBLIOTECA DE GANCHOS — A PARTE DE COPY DO PROMPT
//
// O prompt do post de Negócio tinha direção de arte detalhada (diretrizes A a
// F) e três linhas de copy: "legenda calorosa", "texto curto", "cta curto".
// Com isso a nossa IA repetia a mesma fórmula em todo post. Este arquivo é o
// outro lado: a mecânica do TRIO (chamada promete → legenda paga → CTA
// estende), as regras obrigatórias e as famílias de gancho.
//
// Fonte: biblioteca-de-ganchos/biblioteca-de-ganchos.md e o anexo B
// (profissional liberal). O anexo C (perfil pessoal) NÃO está aqui de
// propósito: ele exige um onboarding próprio (banco pessoal) que ainda não
// existe, e entrar pela metade geraria um perfil que só faz pergunta boba.
// Enquanto isso, tipo "pessoal" segue com a copy antiga.
//
// NADA aqui toca a direção de arte. descricao_fundo, resumo_cena, o ciclo
// 2:1 de cena e as diretrizes A a F continuam no App.jsx, intactas.
//
// O texto é enviado CONDENSADO e CONDICIONADO ao público: só o documento
// principal mais o regime do cliente. Nunca os três documentos inteiros.
// ============================================================

// ---- Os públicos de COPY ----
// Não são os mesmos três tipos da ficha: dentro de "profissional" convivem
// profissões com conselho de classe (médico, advogado) e ofícios sem conselho
// nenhum (eletricista, doceira, DJ). Aplicar a sobriedade do CFM a um chaveiro
// seria tirar dele justamente o que funciona — promoção, urgência, "chama no
// WhatsApp". Por isso o regime é decidido pela PROFISSÃO, não pelo tipo.
export const PUBLICOS = {
  COMERCIO: "comercio",       // comércio local com ponto físico
  SAUDE: "saude",             // profissão de saúde com conselho (CFM, CRP, CRN, CREFITO, COREN, CREF)
  ADVOCACIA: "advocacia",     // advogados — Provimento OAB 205/2021, o regime mais restrito
  PROF_OUTRA: "prof_outra",   // profissional liberal SEM conselho de publicidade
  PESSOAL: "pessoal",         // perfil pessoal — fora desta versão (ver cabeçalho)
};

// Segmentos de dados.js que caem no regime de SAÚDE. Manicure/pedicure fica
// de fora de propósito: é beleza, não profissão de saúde regulamentada.
const SEGMENTOS_SAUDE = [
  "psicologo_psicanalista",
  "nutricionista",
  "fisioterapeuta",
  "medico_consultorio_medico",
  "fonoaudiologo",
  "enfermeiro_enfermagem",
  "instrutora_de_yoga_pilates",
  "acupunturista_medicina_alternativa",
  "personal_trainer",
  "massoterapeuta",
];

// Segmentos que caem no regime da ADVOCACIA.
const SEGMENTOS_ADVOCACIA = [
  "advogado_trabalhista",
  "advogado_imobiliario",
  "advogado_de_familia",
];

// Descobre o público de copy a partir da ficha do cliente.
// Ficha antiga sem `tipo` cai em comércio, que é o comportamento de hoje.
export function publicoDoCliente(profile) {
  const tipo = profile?.tipo || "comercio";
  if (tipo === "pessoal") return PUBLICOS.PESSOAL;
  if (tipo === "profissional") {
    const seg = profile?.segmentoId || "";
    if (SEGMENTOS_ADVOCACIA.includes(seg)) return PUBLICOS.ADVOCACIA;
    if (SEGMENTOS_SAUDE.includes(seg)) return PUBLICOS.SAUDE;
    return PUBLICOS.PROF_OUTRA;
  }
  return PUBLICOS.COMERCIO;
}

// Rótulo do público para o bloco de dados do cliente (o que a IA lê).
export function rotuloDoPublico(publico) {
  return {
    [PUBLICOS.COMERCIO]: "comércio local",
    [PUBLICOS.SAUDE]: "profissional liberal da área da SAÚDE (profissão com conselho de classe)",
    [PUBLICOS.ADVOCACIA]: "ADVOGADO (Provimento OAB 205/2021 — o regime mais restrito)",
    [PUBLICOS.PROF_OUTRA]: "profissional liberal / autônomo (profissão sem conselho de publicidade)",
    [PUBLICOS.PESSOAL]: "perfil pessoal",
  }[publico] || "comércio local";
}

// A biblioteca só governa a copy destes públicos nesta versão.
export function temBibliotecaDeGanchos(publico) {
  return publico !== PUBLICOS.PESSOAL;
}

// ============================================================
// AS FAMÍLIAS DE GANCHO
//
// `publicos` lista quem pode usar a família. O critério é a matriz da seção 6
// do anexo B, lida de forma conservadora: só o que está ✅ entra. O que está
// ⚠️ ("com restrição") fica de fora, porque a restrição depende de julgamento
// que não dá para garantir em publicação automática — e o risco não é um post
// feio, é processo no conselho de classe do cliente.
//
// `porta` é uma condição que a nossa IA precisa conferir nas respostas do
// cadastro antes de escolher a família. Sem porta, a família é livre.
// ============================================================
export const FAMILIAS = [
  {
    id: "lista",
    nome: "Lista numerada",
    promete: "um número exato de informações úteis",
    legenda: "entrega exatamente aquele número, uma por linha, curtas e concretas",
    cta: "oferece o extra que não coube, ou aplica ao caso da pessoa",
    objetivo: "autoridade, seguidor",
    segmentos: "todos",
    modelos: [
      "3 ERROS QUE ESTRAGAM {COISA}",
      "4 COISAS QUE NINGUÉM TE CONTA SOBRE {ASSUNTO}",
      "3 SINAIS DE QUE {PROBLEMA}",
      "5 PERGUNTAS ANTES DE {DECISÃO}",
    ],
    exemplos: {
      padrao:
        "CHAMADA '3 SINAIS DE QUE SEU FREIO ESTÁ NO LIMITE' / LEGENDA '1) Chia ao frear devagar. 2) O pedal desce mais que o normal. 3) O carro puxa para um lado. Qualquer um dos três já é hora de olhar - não espere os três.' / CTA 'Passa aqui que a gente olha na hora, sem compromisso'",
      [PUBLICOS.ADVOCACIA]:
        "CHAMADA '3 DOCUMENTOS QUE VOCÊ PRECISA GUARDAR' / LEGENDA '1) Contrato de trabalho assinado. 2) Comprovantes de pagamento. 3) Registros de jornada. Em uma discussão trabalhista, a ausência desses documentos costuma dificultar a comprovação dos fatos.' / CTA 'Mais conteúdo informativo no perfil'",
      [PUBLICOS.SAUDE]:
        "CHAMADA '3 SINAIS DE QUE O SONO NÃO ESTÁ RESTAURADOR' / LEGENDA '1) Acordar cansado mesmo depois de 8 horas. 2) Sonolência no meio da tarde. 3) Dor de cabeça ao levantar. Nenhum dos três é normal por si só e todos merecem investigação.' / CTA 'Agende uma avaliação'",
    },
    evitar: "não use se você não tiver informação real do negócio para preencher a lista inteira",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA],
  },
  {
    id: "erro",
    nome: "Erro comum",
    promete: "apontar algo que a pessoa provavelmente faz errado",
    legenda: "explica por que é errado e mostra o jeito certo",
    cta: "oferece resolver isso pela pessoa",
    objetivo: "autoridade, venda",
    segmentos: "oficina, beleza, saúde, serviços, pet, academia",
    modelos: [
      "VOCÊ ESTÁ {AÇÃO} DO JEITO ERRADO",
      "PARE DE {AÇÃO COMUM}",
      "ISSO ESTRAGA SEU {PRODUTO} E NINGUÉM AVISA",
      "O ERRO QUE MAIS APARECE AQUI",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'PARE DE LAVAR O CABELO COM ÁGUA QUENTE' / LEGENDA 'A água quente abre a cutícula e leva embora a cor e a oleosidade natural. Resultado: cabelo opaco em duas semanas. Lave com água morna e finalize com fria.' / CTA 'Quer saber o que serve pro seu tipo de cabelo? Chama aqui'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'SALADA NO ALMOÇO NÃO SUBSTITUI A REFEIÇÃO' / LEGENDA 'Trocar o almoço por salada costuma deixar a refeição sem proteína e sem energia suficiente, e a fome volta no meio da tarde. A salada entra junto do prato, não no lugar dele.' / CTA 'Agende uma avaliação'",
    },
    evitar: "corrija com leveza, nunca com deboche nem com tom de bronca; sem alarmismo",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE],
  },
  {
    id: "bastidor",
    nome: "Bastidor",
    promete: "mostrar o que acontece por trás",
    legenda: "conta o processo com detalhe concreto (horário, quantidade, etapa)",
    cta: "convida a conhecer ou a provar o resultado",
    objetivo: "lembrança, seguidor",
    segmentos: "alimentação, oficina, varejo, serviços",
    modelos: [
      "O QUE ACONTECE AQUI ÀS {HORA}",
      "ANTES DA LOJA ABRIR",
      "NINGUÉM VÊ ESTA PARTE",
      "COMO {PRODUTO} FICA PRONTO",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'O QUE ACONTECE AQUI ÀS 4 DA MANHÃ' / LEGENDA 'A massa do pão de hoje foi sovada ontem à noite e descansou 8 horas na geladeira. É por isso que ele tem casca crocante e miolo macio - não tem atalho pra isso.' / CTA 'Sai do forno às 6h30. Chega cedo'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'O QUE ACONTECE ANTES DA SUA CONSULTA' / LEGENDA 'Todo retorno começa com a releitura da ficha e dos exames trazidos na consulta anterior. São uns 15 minutos antes de a porta abrir, e é o que permite retomar exatamente de onde paramos.' / CTA 'Agende sua consulta'",
    },
    evitar: "bastidor genérico não funciona: sem detalhe real do processo, escolha outra família",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE],
  },
  {
    id: "escolha",
    nome: "Escolha",
    promete: "uma decisão simples entre duas opções",
    legenda: "apresenta as duas com personalidade, sem dizer qual é a melhor",
    cta: "pede comentário — NUNCA empurra venda",
    objetivo: "interação",
    segmentos: "alimentação, beleza, varejo, pet",
    modelos: [
      "QUAL DESSES DOIS VOCÊ LEVA?",
      "SÓ DÁ PRA PEDIR UM. QUAL?",
      "ESCOLHE UM: {A} OU {B}",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'SÓ DÁ PRA PEDIR UM. QUAL?' / LEGENDA 'À esquerda, o clássico: cheddar, bacon e cebola caramelizada. À direita, o da casa: costela desfiada e maionese defumada. Os dois saem do mesmo balcão e os dois causam briga aqui dentro.' / CTA 'Responde aqui embaixo qual é o seu'",
    },
    // A porta existe porque a imagem é gerada por IA: sem dois produtos REAIS
    // informados pelo cliente, a família convida a inventar cardápio.
    porta:
      "SÓ pode ser escolhida se as DUAS opções forem produtos ou serviços que o cliente informou nas respostas do cadastro. Se você não conseguir nomear os dois a partir das respostas, escolha outra família.",
    evitar: "não use duas vezes na mesma semana — cansa",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA],
  },
  {
    id: "beneficio",
    nome: "Benefício direto",
    promete: "um ganho claro para a pessoa",
    legenda: "explica como esse ganho acontece",
    cta: "ação direta",
    objetivo: "venda",
    segmentos: "todos",
    modelos: [
      "ENQUANTO VOCÊ {ATIVIDADE}, {BENEFÍCIO}",
      "{RESULTADO} SEM {SACRIFÍCIO}",
      "{TEMPO CURTO} E PRONTO",
      "SAI DAQUI COM {RESULTADO}",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'DEIXA HOJE. BUSCA AMANHÃ.' / LEGENDA 'Lavagem, secagem e dobra em 24 horas. Você deixa a sacola na entrada e recebe tudo separado por tipo de peça. Sem fila, sem ficha.' / CTA 'Chama no WhatsApp e a gente já reserva sua vaga de amanhã'",
    },
    evitar: "benefício genérico ('qualidade', 'bom atendimento') não vale; precisa ser específico",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA],
  },
  {
    id: "objecao",
    nome: "Objeção",
    promete: "responder a dúvida que trava a decisão",
    legenda: "responde de forma honesta e direta, inclusive admitindo limites",
    cta: "convida a tirar a dúvida específica",
    objetivo: "venda, autoridade",
    segmentos: "serviços, saúde, imóveis, educação, oficina",
    modelos: [
      "'É CARO?'",
      "TODO MUNDO PERGUNTA ISSO",
      "A DÚVIDA QUE MAIS CHEGA AQUI",
      "VALE A PENA MESMO?",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'VOU TER QUE PARAR DE COMER PÃO?' / LEGENDA 'Não. Essa é a pergunta que mais chega aqui e a resposta é não. O que muda é a quantidade, o horário e o que vai junto. Plano que proíbe tudo é plano que ninguém segue.' / CTA 'Manda sua dúvida no WhatsApp, respondo pessoalmente'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'VOU TER QUE PARAR DE COMER PÃO?' / LEGENDA 'Não. Essa é a pergunta que mais chega ao consultório e a resposta é não. O que costuma mudar é a quantidade, o horário e o que vai junto. Cada caso é avaliado individualmente.' / CTA 'Agende uma avaliação'",
      [PUBLICOS.ADVOCACIA]:
        "CHAMADA 'PRECISO DE ADVOGADO PRA ISSO?' / LEGENDA 'Nem todo problema vira processo. Parte se resolve em acordo ou com um documento bem redigido. O trabalho começa antes disso: entender o caso e apontar quais são os caminhos possíveis.' / CTA 'Conteúdo informativo no perfil'",
    },
    evitar: "se a resposta honesta for ruim para o cliente, não force: escolha outra família",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA],
  },
  {
    id: "identificacao",
    nome: "Identificação",
    promete: "falar diretamente com um tipo de pessoa",
    legenda: "descreve a situação dela com precisão e oferece a saída",
    cta: "ação direta",
    objetivo: "venda, seguidor",
    segmentos: "todos",
    modelos: [
      "SE VOCÊ {SITUAÇÃO}, ISSO É PRA VOCÊ",
      "PRA QUEM {SITUAÇÃO}",
      "VOCÊ TAMBÉM {HÁBITO}?",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'PRA QUEM SOFRE NA HORA DO BANHO' / LEGENDA 'Cachorro que treme, foge e faz drama. A gente atende com hora marcada, um por vez, sem outros cães no salão. Menos barulho, menos medo.' / CTA 'Agenda pelo WhatsApp e escolhe o horário mais tranquilo'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'PRA QUEM TRABALHA SENTADO O DIA INTEIRO' / LEGENDA 'Oito horas na mesma posição sobrecarregam pescoço e lombar, e o incômodo costuma aparecer só no fim do dia. Pausas curtas com movimento a cada hora mudam mais a rotina do que qualquer acessório.' / CTA 'Tire sua dúvida sobre o assunto'",
      [PUBLICOS.ADVOCACIA]:
        "CHAMADA 'PRA QUEM VAI COMPRAR O PRIMEIRO IMÓVEL' / LEGENDA 'Antes da assinatura costumam ser conferidos a matrícula atualizada, as certidões do vendedor e a minuta do contrato. É neles que aparecem pendências que o anúncio não mostra.' / CTA 'Mais conteúdo informativo no perfil'",
    },
    evitar: "nunca aponte defeito da pessoa nem use característica constrangedora",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA],
  },
  {
    id: "urgencia",
    nome: "Urgência real",
    promete: "algo que acaba ou muda",
    legenda: "deixa claro o prazo e o motivo",
    cta: "ação imediata",
    objetivo: "venda",
    segmentos: "alimentação, varejo, beleza, serviços",
    modelos: ["SÓ ATÉ {DIA}", "ÚLTIMAS {QUANTIDADE}", "ACABA HOJE", "SÓ TEM HOJE"],
    exemplos: {
      padrao:
        "CHAMADA 'SÓ TEM HOJE' / LEGENDA 'Açaí com cupuaçu só entra quando chega fruta boa, e a última remessa deu pra hoje. Amanhã volta o cardápio normal.' / CTA 'Chama no WhatsApp antes que acabe'",
    },
    // Sem campo de promoção no post de Negócio, a urgência só existe se vier
    // das respostas do cadastro. Inventar prazo queima o perfil do cliente.
    porta:
      "SÓ pode ser escolhida se as respostas do cadastro trouxerem uma urgência REAL (prazo, temporada, quantidade que acaba). NUNCA invente prazo. Na dúvida, escolha outra família.",
    evitar: "urgência toda semana deixa de ser urgência",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA],
  },
  {
    id: "curiosidade",
    nome: "Curiosidade sobre o produto ou o assunto",
    promete: "revelar algo inesperado sobre o que o cliente faz ou vende",
    legenda: "entrega a explicação, com detalhe concreto",
    cta: "convida a experimentar ou a saber mais",
    objetivo: "lembrança, seguidor",
    segmentos: "alimentação, varejo, beleza, pet",
    modelos: [
      "POR QUE {PRODUTO} É {CARACTERÍSTICA}",
      "TEM UM MOTIVO PRA ISSO",
      "NÃO É {SUPOSIÇÃO ÓBVIA}",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'NÃO É O GRÃO. É A ÁGUA.' / LEGENDA 'Café é 98% água. A gente filtra e ajusta a temperatura pra 92 graus - acima disso queima e amarga. O grão bom só aparece se a água deixar.' / CTA 'Vem provar a diferença'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'POR QUE A PRESSÃO SOBE MAIS DE MANHÃ' / LEGENDA 'O corpo libera cortisol nas primeiras horas do dia, e isso eleva naturalmente a pressão arterial. Por isso a medição matinal costuma ser solicitada no acompanhamento.' / CTA 'Agende sua consulta'",
      [PUBLICOS.ADVOCACIA]:
        "CHAMADA 'POR QUE CONTRATO PEDE DUAS TESTEMUNHAS' / LEGENDA 'Um contrato particular assinado por duas testemunhas passa a ser título executivo extrajudicial. Na prática, isso muda o caminho da cobrança quando o combinado não é cumprido.' / CTA 'Leia mais no perfil'",
    },
    evitar: "se você não souber o motivo real, não invente (R5): escolha outra família",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA],
  },
  {
    id: "data",
    nome: "Data e momento",
    promete: "conectar com algo que está acontecendo agora",
    legenda: "amarra a data ao que o cliente oferece, sem forçar",
    cta: "ação ligada ao momento",
    objetivo: "venda, lembrança",
    segmentos: "todos",
    modelos: [
      "{DIA DA SEMANA} PEDE {COISA}",
      "CHEGOU O {ESTAÇÃO/DATA}",
      "HOJE É DIA DE {COISA}",
    ],
    exemplos: {
      padrao:
        "CHAMADA 'DOMINGO PEDE PIZZA E SOFÁ' / LEGENDA 'Ninguém quer cozinhar hoje. A gente já sabe: domingo é o dia de mais entrega da semana, e a cozinha abre uma hora antes por causa disso.' / CTA 'Chama no WhatsApp que sai em 40 minutos'",
      [PUBLICOS.SAUDE]:
        "CHAMADA 'NO CALOR A SEDE CHEGA ATRASADA' / LEGENDA 'A sensação de sede aparece depois que o corpo já perdeu líquido, e no verão essa diferença aumenta. Beber em intervalos regulares funciona melhor do que esperar sentir sede.' / CTA 'Tire sua dúvida sobre o assunto'",
      [PUBLICOS.ADVOCACIA]:
        "CHAMADA 'COMEÇO DE ANO É ÉPOCA DE RESCISÃO' / LEGENDA 'Depois das festas o volume de desligamentos sobe. Vale guardar o termo de rescisão, os comprovantes de pagamento e o extrato do FGTS: são eles que sustentam qualquer discussão posterior.' / CTA 'Conteúdo informativo no perfil'",
    },
    evitar: "se a ligação com a data for forçada, pule esta família",
    publicos: [PUBLICOS.COMERCIO, PUBLICOS.PROF_OUTRA, PUBLICOS.SAUDE, PUBLICOS.ADVOCACIA],
  },
];

// Famílias que existem na biblioteca e estão FORA desta versão do app, com o
// motivo. Vão para o prompt em uma linha cada: mais barato avisar do que
// deixar a nossa IA inventar um "antes e depois" que a gente não sabe fazer.
export const FAMILIAS_BLOQUEADAS = [
  {
    nome: "Transformação (antes e depois)",
    motivo:
      "exige foto REAL do antes. A imagem deste app é gerada por IA, então um antes e depois seria mentira. Bloqueada até existir envio de foto do cliente.",
  },
  {
    nome: "Prova (números, tempo de casa, depoimento)",
    motivo:
      "exige número ou fato verificável que o cadastro ainda não coleta. Bloqueada — e não invente número (R5).",
  },
  {
    nome: "Ganchos de vídeo (espera até o final, passo a passo, contagem)",
    motivo: "este app entrega imagem estática. Numa foto parada eles viram promessa falsa.",
  },
];

// ---- Consultas ----

// Famílias liberadas para um público, na ordem da biblioteca.
export function familiasLiberadas(publico) {
  return FAMILIAS.filter((f) => f.publicos.includes(publico));
}

// Converte o que a nossa IA devolveu no campo "familia" para um id conhecido.
// Aceita o id ("bastidor") e o nome ("Bastidor"), com ou sem acento e caixa.
// Devolve "" quando não reconhece — o histórico guarda vazio em vez de sujeira.
export function normalizarFamilia(valor) {
  const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const limpo = semAcento(valor || "");
  if (limpo.length < 3) return ""; // "l" não pode virar "Lista numerada"
  const achou = FAMILIAS.find((f) => {
    const nome = semAcento(f.nome);
    return f.id === limpo || nome === limpo || nome.startsWith(limpo) || limpo.startsWith(f.id);
  });
  return achou ? achou.id : "";
}

// Nome de exibição de uma família (para o histórico e o painel de dev).
export function nomeDaFamilia(id) {
  const f = FAMILIAS.find((x) => x.id === id);
  return f ? f.nome : (id || "—");
}

// ============================================================
// O TESTE DE CREDIBILIDADE E AS REGRAS DE CADA PÚBLICO
// R2 do documento principal (teste do bairro) vale para comércio; o anexo B
// sobrescreve com o teste da sala de espera para as profissões com conselho.
// ============================================================
function blocoDoPublico(publico) {
  if (publico === PUBLICOS.ADVOCACIA) {
    return [
      "R2 — TESTE DA SALA DE ESPERA (substitui o teste do bairro):",
      "Se um cliente lesse este post na sala de espera, ele sairia com MAIS CONFIANÇA no profissional, ou com a sensação de estar diante de um VENDEDOR? Se a resposta for 'vendedor', o post está errado, mesmo que a frase seja boa.",
      "O tom obrigatório é SÓBRIO, EDUCATIVO E INFORMATIVO. Sem superlativo, sem adjetivo de superioridade, sem euforia, sem emoji de festa.",
      "",
      "REGRAS DA ADVOCACIA (Provimento OAB 205/2021 — o público mais restrito). Violou uma, o post não pode sair:",
      "- NUNCA prometer ou garantir resultado (ex.: 'garantimos seu benefício') — é a violação mais grave.",
      "- NUNCA usar superlativo nem comparação ('o melhor', 'número 1', 'mais experiente').",
      "- NUNCA mencionar honorário, valor, desconto ou gratuidade.",
      "- NUNCA contar caso concreto, cliente específico ou depoimento, mesmo sem nome.",
      "- NUNCA descrever a estrutura física do escritório, nem ostentação (carro, viagem, relógio).",
      "- NUNCA fazer captação ativa de cliente. Por isso o CTA NÃO PODE convidar para o WhatsApp nem pedir contato: ele oferece INFORMAÇÃO.",
      "- Nada de sensacionalismo, drama ou alarmismo.",
      "CTA permitido para este público (use um destes, ou algo do mesmo tipo):",
      "'Mais conteúdo informativo no perfil' · 'Leia mais no perfil' · 'Conteúdo informativo — perfil na bio'",
    ].join("\n");
  }

  if (publico === PUBLICOS.SAUDE) {
    return [
      "R2 — TESTE DA SALA DE ESPERA (substitui o teste do bairro):",
      "Se um paciente lesse este post na sala de espera, ele sairia com MAIS CONFIANÇA no profissional, ou com a sensação de estar diante de um VENDEDOR? Se a resposta for 'vendedor', o post está errado, mesmo que a frase seja boa.",
      "O tom obrigatório é SÓBRIO, EDUCATIVO E INFORMATIVO. Sem superlativo, sem adjetivo de superioridade, sem euforia, sem emoji de festa.",
      "O critério que separa o permitido do proibido é o CARÁTER EDUCATIVO: conteúdo que explica, orienta e informa passa; conteúdo que exalta o profissional não passa.",
      "",
      "REGRAS DAS PROFISSÕES DE SAÚDE (CFM, CRP, CRN, CREFITO, COREN, CREF). Violou uma, o post não pode sair:",
      "- NUNCA prometer ou garantir resultado ('você vai emagrecer 10kg', 'seu sorriso perfeito').",
      "- NUNCA usar superlativo nem comparação com outros profissionais.",
      "- NUNCA mencionar preço, honorário, desconto, gratuidade ou promoção.",
      "- NUNCA contar caso concreto de paciente, mesmo sem nome, e nunca reproduzir elogio ou depoimento.",
      "- Nada de sensacionalismo, drama ou alarmismo ('você não vai acreditar').",
      "- Nunca dar diagnóstico nem orientação que substitua consulta: o post informa, o consultório avalia.",
      "CTA permitido para este público (use um destes, ou algo do mesmo tipo):",
      "'Agende sua consulta' · 'Agende uma avaliação' · 'Tire sua dúvida sobre o assunto'",
    ].join("\n");
  }

  if (publico === PUBLICOS.PROF_OUTRA) {
    return [
      "R2 — TESTE DO BAIRRO:",
      "A chamada precisa fazer sentido para uma pessoa comum que precisa desse serviço. Se soar como coach, guru ou curso de internet, está errado.",
      "ERRADO: 'A grande verdade que ninguém tem coragem de te dizer'",
      "CERTO: 'O que a gente faz antes de começar o serviço, todo dia'",
      "",
      "REGRA EXTRA DESTE PÚBLICO: nunca prometa resultado garantido. Descreva o que é feito e como é feito; quem promete resultado perde credibilidade e, dependendo da profissão, cria problema para o cliente.",
      "CTA: pode convidar para o WhatsApp normalmente.",
    ].join("\n");
  }

  // Comércio
  return [
    "R2 — TESTE DO BAIRRO:",
    "A chamada precisa fazer sentido para uma pessoa comum passando na frente da loja. Se soar como coach, guru ou curso de internet, está errado.",
    "ERRADO: 'A grande verdade que ninguém tem coragem de te dizer'",
    "CERTO: 'O que a gente faz antes de abrir, todo dia às 5h'",
    "CTA: pode convidar para o WhatsApp normalmente.",
  ].join("\n");
}

// O par CERTO/ERRADO que ensina a amarração do trio. É por PÚBLICO porque
// exemplo vale mais que regra para a nossa IA: mostrar um CTA de WhatsApp
// para advogado enquanto a regra proíbe captação seria ensinar o erro.
function trioParaTexto(publico) {
  if (publico === PUBLICOS.ADVOCACIA) {
    return [
      "CERTO: CHAMADA '3 DOCUMENTOS QUE VOCÊ PRECISA GUARDAR' / LEGENDA '1) Contrato de trabalho assinado. 2) Comprovantes de pagamento. 3) Registros de jornada. Em uma discussão trabalhista, a ausência desses documentos costuma dificultar a comprovação dos fatos.' / CTA 'Mais conteúdo informativo no perfil'",
      "ERRADO: a MESMA chamada com a legenda 'Somos o escritório mais completo da região e garantimos o seu direito!' — não entregou nenhum dos três documentos, e ainda usa superlativo e promete resultado.",
    ].join("\n");
  }
  if (publico === PUBLICOS.SAUDE) {
    return [
      "CERTO: CHAMADA '3 SINAIS DE QUE O SONO NÃO ESTÁ RESTAURADOR' / LEGENDA '1) Acordar cansado mesmo depois de 8 horas. 2) Sonolência no meio da tarde. 3) Dor de cabeça ao levantar. Nenhum dos três é normal por si só e todos merecem investigação.' / CTA 'Agende uma avaliação'",
      "ERRADO: a MESMA chamada com a legenda 'Aqui no consultório a gente resolve isso rapidinho, agende já e garanta seu resultado!' — não entregou nenhum dos três sinais e ainda promete resultado.",
    ].join("\n");
  }
  return [
    "CERTO: CHAMADA '3 ERROS QUE ESTRAGAM SEU CHURRASCO' / LEGENDA '1) Carne gelada direto na grelha. 2) Furar com garfo. 3) Sal só no final. Os três fazem a carne perder água - e água é sabor.' / CTA 'Passa aqui que a gente já entrega a carne no ponto certo de temperar'",
    "ERRADO: a MESMA chamada com a legenda 'Venha conhecer nossa loja! Temos os melhores produtos da região.' — a chamada prometeu três erros e a legenda não entregou nenhum. A pessoa sai do post em segundos.",
  ].join("\n");
}

// Uma família renderizada para o prompt: compacta, mas com o exemplo — é o
// exemplo que ensina o formato, não a descrição.
function familiaParaTexto(f, publico, i) {
  const exemplo = f.exemplos[publico] || f.exemplos.padrao;
  return [
    `${i + 1}. ${f.nome}  [id: ${f.id}]  objetivo: ${f.objetivo}  segmentos: ${f.segmentos}`,
    `   PROMETE: ${f.promete}`,
    `   LEGENDA DEVE: ${f.legenda}`,
    `   CTA DEVE: ${f.cta}`,
    `   MODELOS DE CHAMADA: ${f.modelos.join(" · ")}`,
    `   EXEMPLO: ${exemplo}`,
    f.porta ? `   PORTA: ${f.porta}` : "",
    `   CUIDADO: ${f.evitar}`,
  ].filter(Boolean).join("\n");
}

// ============================================================
// O BLOCO DE COPY QUE ENTRA NO SYSTEM PROMPT
// ============================================================
export function blocoCopyParaSystem(publico) {
  const liberadas = familiasLiberadas(publico);

  return [
    "════════ COPY: A BIBLIOTECA DE GANCHOS ════════",
    "Esta parte governa APENAS legenda, texto_imagem, cta e familia. A direção de arte (descricao_fundo, resumo_cena, diretrizes A a F) segue depois e não muda nada aqui.",
    "",
    "O TRIO. Todo post tem três peças amarradas:",
    "- CHAMADA (o campo texto_imagem, em cima da foto): FAZ a promessa",
    "- LEGENDA (embaixo do post): PAGA a promessa",
    "- CTA (rodapé da arte): ESTENDE o que foi pago",
    "Se as três não estiverem amarradas, o post FALHOU — mesmo que cada peça seja boa sozinha. Coerência não basta: a legenda precisa entregar exatamente o que a chamada prometeu.",
    "",
    trioParaTexto(publico),
    "",
    "ORDEM DE TRABALHO (não inverta): 1) escolha a FAMÍLIA de gancho; 2) confirme que tem informação real do cadastro para pagar a promessa dela; 3) escreva chamada, legenda e CTA NA MESMA PASSADA, como um conjunto. Escrever a chamada primeiro e a legenda depois é o erro mais comum.",
    "",
    "REGRAS OBRIGATÓRIAS (não são sugestões: se uma for violada, escolha outra família)",
    "R1 — A PROMESSA PRECISA SER PAGA. Se a chamada diz '3 coisas', a legenda traz 3 coisas concretas. Sem informação suficiente no cadastro, troque de família.",
    "",
    blocoDoPublico(publico),
    "",
    "R3 — CABE EM ATÉ 3 LINHAS. A chamada é texto grande em fonte pesada, no máximo 3 linhas curtas. Prefira de 6 a 10 palavras no total. Se não couber, corte palavras até caber.",
    "R4 — NÃO REPETIR. Nunca use a mesma família do post imediatamente anterior. Entre as famílias liberadas, prefira sempre a MENOS USADA nos últimos 7 posts. O bloco de dados do cliente traz a família anterior e a contagem de uso: siga os dois.",
    "R5 — NUNCA INVENTAR. Não invente preço, prazo, número, prêmio, tempo de mercado, quantidade de clientes, produto, serviço ou qualquer dado que o cliente não tenha informado. Se o gancho precisa de um número que você não tem, escolha outro gancho.",
    "R6 — UM POST, UMA PROMESSA. Não junte dois ganchos no mesmo post.",
    "R7 — O CTA SEGUE O OBJETIVO DA FAMÍLIA. Cada família abaixo diz o tipo de CTA. Nem todo post empurra venda: post de interação pede comentário, e comentário gera alcance. O CTA é curto (até 45 caracteres) porque é aplicado numa faixa pequena no rodapé da arte.",
    "",
    `FAMÍLIAS LIBERADAS PARA ESTE CLIENTE (${liberadas.length}) — escolha UMA e devolva o id dela no campo "familia":`,
    liberadas.map((f, i) => familiaParaTexto(f, publico, i)).join("\n\n"),
    "",
    "FAMÍLIAS FORA DESTA VERSÃO — não escolha nenhuma delas, nem uma variação disfarçada:",
    FAMILIAS_BLOQUEADAS.map((f) => `- ${f.nome}: ${f.motivo}`).join("\n"),
    "",
    "NUNCA USE ESTES GANCHOS (foram descartados de propósito):",
    "- 'A grande verdade que ninguém te conta' — cara de coach",
    "- 'Você não vai acreditar no que aconteceu' — promessa vazia",
    "- 'Isso mudou minha vida para sempre' — exagero que derruba a credibilidade",
    "- 'Salve este post agora' — pede ação antes de entregar valor",
    "- 'Comente X que eu mando Y' — depende de automação que o app não tem",
    "",
    "CHECKLIST ANTES DE RESPONDER. Se qualquer resposta for 'não', refaça:",
    "- A chamada cabe em até 3 linhas curtas?",
    "- A legenda paga EXATAMENTE o que a chamada prometeu?",
    "- O CTA continua o raciocínio da chamada, em vez de ser um botão genérico?",
    "- O tipo de CTA bate com o objetivo da família escolhida?",
    "- Passa no teste do público (R2)?",
    "- Nenhum dado foi inventado?",
    "- A família é diferente da do post anterior?",
    "════════ FIM DA BIBLIOTECA DE GANCHOS ════════",
  ].join("\n");
}

// ============================================================
// O BLOCO DA ESCOLHA DA FAMÍLIA (vai na camada do CLIENTE)
// R4 depende do histórico DESTE cliente, então a conta é feita aqui, em
// código, e a nossa IA recebe o resultado pronto. Deixar a IA contar sozinha
// a partir do histórico era pedir para ela errar.
// ============================================================
const JANELA_FAMILIA = 7; // "menos usada nos últimos 7 posts"

export function blocoEscolhaDaFamilia(publico, hist) {
  const liberadas = familiasLiberadas(publico);
  if (!liberadas.length) return "";

  const ultimos = (hist || []).slice(-JANELA_FAMILIA);
  const anterior = (hist || []).length ? normalizarFamilia(hist[hist.length - 1].familia) : "";

  // Contagem por família liberada, da menos usada para a mais usada. Empate
  // mantém a ordem da biblioteca — determinístico, sem sorteio.
  const contagem = liberadas.map((f) => ({
    nome: f.nome,
    id: f.id,
    vezes: ultimos.filter((h) => normalizarFamilia(h.familia) === f.id).length,
    proibida: f.id === anterior,
  }));
  const disponiveis = contagem.filter((c) => !c.proibida);
  const menor = disponiveis.length ? Math.min(...disponiveis.map((c) => c.vezes)) : 0;
  const preferidas = disponiveis.filter((c) => c.vezes === menor).map((c) => c.nome);

  return [
    "",
    "ESCOLHA DA FAMÍLIA DE GANCHO (regra R4, com os dados deste cliente):",
    anterior
      ? `- Família do post ANTERIOR: ${nomeDaFamilia(anterior)} — PROIBIDA nesta geração.`
      : "- Este é o primeiro post com família registrada: nenhuma está proibida.",
    `- Uso das famílias liberadas nos últimos ${JANELA_FAMILIA} posts: ` +
      contagem.map((c) => `${c.nome} ${c.vezes}x`).join(" | "),
    preferidas.length
      ? `- PREFIRA uma destas (as menos usadas): ${preferidas.join(", ")}. Só escolha outra se a R1 (não consigo pagar a promessa) ou a PORTA da família impedirem — e, nesse caso, pegue a próxima menos usada.`
      : "",
  ].filter(Boolean).join("\n");
}
