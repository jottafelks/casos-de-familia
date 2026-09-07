/* =============================================================================
   CASO 47 — A NOITE DE HELENA
   Conteúdo do jogo (dados puros + validadores).
   Este arquivo é compartilhado entre SERVIDOR (autoridade) e CLIENTE (modo offline),
   garantindo que as regras nunca divirjam entre os dois.
   ========================================================================== */

export const META = {
  title: 'CASO 47',
  subtitle: 'A NOITE DE HELENA',
  place: 'Mansão Alencar · Vazante — MG',
  date: '14 de setembro',
  defaultDuration: 45 * 60 * 1000, // 45 minutos
  minPlayers: 1,
  maxPlayers: 6,
  intro: [
    'Vazante, Minas Gerais. 14 de setembro.',
    'Tempestade. A estrada da serra vai fechar em 45 minutos.',
    'Helena Alencar, jornalista, desapareceu dentro da própria mansão.',
    'Cinco pessoas estavam na casa naquela noite.',
    'Nenhuma saiu. Nenhuma viu nada. Todas mentem.',
    'O relógio do hall parou. Descubram por quê.'
  ],
  briefing: [
    'Vocês são a equipe de investigação. Chegaram antes da perícia.',
    'Explorem a casa. Abram gavetas. Leiam tudo.',
    'Nada aqui é um formulário: a resposta está nos objetos.',
    'Cada um de vocês pode estar em um cômodo diferente — conversem.',
    'Quando a luz acabar, a casa vai mudar.'
  ]
};

/* ---------------------------------------------------------------------------
   ITENS (inventário coletivo da equipe)
--------------------------------------------------------------------------- */
export const ITEMS = {
  lanterna:       { name: 'Lanterna', icon: '🔦', desc: 'Pilhas fracas, mas serve. Ilumina o porão.' },
  alicate:        { name: 'Alicate', icon: '🔧', desc: 'Corta correntes e força gavetas.' },
  chave_pequena:  { name: 'Chave pequena', icon: '🗝️', desc: 'Abre portas de vidro. Serve no relógio do hall.' },
  chave_escritorio:{ name: 'Chave do escritório', icon: '🔑', desc: 'Chave de latão com etiqueta "E".' },
  chave_porao:    { name: 'Chave do porão', icon: '🔑', desc: 'Chave grossa e enferrujada.' },
  isqueiro:       { name: 'Isqueiro', icon: '🔥', desc: 'Tem a gravação "A.V." na base.' },
  gravador:       { name: 'Gravador de Helena', icon: '🎙️', desc: 'A última voz da casa.' },
  pendrive:       { name: 'Pendrive', icon: '💾', desc: 'Marcado com uma etiqueta: "PROVAS — NÃO PERDER".' }
};

/* ---------------------------------------------------------------------------
   PISTAS (arquivo da equipe)
--------------------------------------------------------------------------- */
export const CLUES = {
  hora_crime: {
    title: 'Relógio parado — 23:47',
    kind: 'object', tag: 'Tempo',
    text: 'O relógio do hall parou às 23:47. A porta de vidro foi forçada por dentro. Alguém o derrubou.'
  },
  bilhete_pendulo: {
    title: 'Bilhete no pêndulo',
    kind: 'note', tag: 'Vítima',
    text: 'Escrito por Helena: "O relatório está no cofre. Perguntem a quem serviu o vinho."'
  },
  corrente_cortada: {
    title: 'Corrente da porta principal',
    kind: 'object', tag: 'Cena',
    text: 'A corrente foi cortada e recolocada — mas os elos estão abertos para fora. Alguém saiu e voltou.'
  },
  lista_convidados: {
    title: 'Lista de convidados',
    kind: 'doc', tag: 'Tempo',
    text: 'Ordem de chegada, escrita por Benedita:\n18:50 — Rafael (caseiro)\n19:30 — Benedita (governanta)\n20:00 — Cecília Alencar (irmã)\n20:40 — Dr. Amaro Vasques (advogado)\n21:15 — Tomás Rocha (fotógrafo)'
  },
  casaco_umido: {
    title: 'Casaco encharcado',
    kind: 'object', tag: 'Cena',
    text: 'Um casaco masculino, ombros molhados. No bolso: um isqueiro com as iniciais "A.V.".'
  },
  arrasto: {
    title: 'Marca de arrasto',
    kind: 'object', tag: 'Cena',
    text: 'Sob o tapete, duas marcas paralelas no assoalho indo do hall até a porta da biblioteca.'
  },
  simbolo_lua: {
    title: 'Símbolo: LUA',
    kind: 'object', tag: 'Símbolo',
    text: 'Cartão escondido no tijolo solto. Uma lua crescente desenhada à tinta azul. Ao lado, um broche de prata.'
  },
  simbolo_serpente: {
    title: 'Símbolo: SERPENTE',
    kind: 'object', tag: 'Símbolo',
    text: 'Papel chamuscado nas cinzas da lareira. Uma serpente desenhada. Ao lado, restos de um prendedor de gravata.'
  },
  simbolo_olho: {
    title: 'Símbolo: OLHO',
    kind: 'object', tag: 'Símbolo',
    text: 'Dentro da lata de café. Um olho desenhado, do tamanho de uma lente. Há uma alça de câmera junto.'
  },
  simbolo_chave: {
    title: 'Símbolo: CHAVE',
    kind: 'object', tag: 'Símbolo',
    text: 'Chaveiro na gaveta do escritório: pingente em forma de chave. Preso nele, um lacre de uniforme de governanta.'
  },
  livro_dedicatoria: {
    title: 'Dedicatória no livro',
    kind: 'note', tag: 'Suspeitos',
    text: 'Dentro do compartimento secreto: "Para C., que sempre soube onde esconder as chaves." — H.'
  },
  cinzas_doc: {
    title: 'Documento queimado',
    kind: 'doc', tag: 'Motivo',
    text: '...ão assinei o contra... se o relatório vazar, a culpa cairá sobre m... — restam só as bordas.'
  },
  foto_jantar: {
    title: 'Foto do jantar',
    kind: 'photo', tag: 'Tempo',
    text: '14/09, 21:40. Mesa posta para seis. Só quatro cadeiras ocupadas: Cecília, Amaro, Benedita e Rafael. Helena e Tomás não aparecem.'
  },
  foto_mineradora: {
    title: 'Foto na mineradora',
    kind: 'photo', tag: 'Motivo',
    text: 'Helena e Tomás em frente aos galpões da Vazante Mineração, de noite, com uma câmera escondida.'
  },
  tacas_vinho: {
    title: 'Taças de vinho',
    kind: 'object', tag: 'Cena',
    text: 'Duas taças usadas. Batom em uma delas. Uma terceira taça, limpa, foi posta e nunca tocada.'
  },
  carta_ameaca: {
    title: 'Carta anônima',
    kind: 'doc', tag: 'Ameaça',
    text: '"Pare de cavar. A próxima cova pode ser a sua." Papel branco comum, sem timbre visível.'
  },
  ameaca_escritorio: {
    title: 'A ameaça veio de dentro',
    kind: 'doc', tag: 'Ameaça',
    text: 'Comparando a carta com uma folha timbrada do escritório: mesma gramatura, mesma marca d\'água. A carta foi impressa aqui — na mesa de Amaro.'
  },
  pegadas_lama: {
    title: 'Pegadas na lama',
    kind: 'object', tag: 'Cena',
    text: 'Da janela: pegadas grandes indo da porta de serviço até o galpão. Botas de caseiro. E o carro de Tomás continua na entrada.'
  },
  voz_disco: {
    title: 'Voz no disco',
    kind: 'audio', tag: 'Vítima',
    text: 'Por trás da música, uma voz gravada por engano: "...ninguém quebrou o relógio... ele caiu..."'
  },
  radio_noticia: {
    title: 'Notícia no rádio',
    kind: 'audio', tag: 'Falsa',
    text: '"Corpo de mulher é encontrado no rio Santa Catarina." A descrição não bate: Helena não usa aliança.'
  },
  numero_telefone: {
    title: 'Número no fósforo',
    kind: 'note', tag: 'Pista',
    text: 'Uma caixa de fósforos do bar "Estação" com um número rabiscado: 3371-2244.'
  },
  faca_faltando: {
    title: 'Faca desaparecida',
    kind: 'object', tag: 'Arma',
    text: 'No bloco de facas da cozinha falta uma peça de 20 cm. A marca de poeira mostra onde estava.'
  },
  faca_cozinha_porao: {
    title: 'A faca da casa',
    kind: 'object', tag: 'Arma',
    text: 'A faca que faltava na cozinha está no porão, lavada às pressas. O cabo ainda tem resíduo sob a luz.'
  },
  recibo_lavanderia: {
    title: 'Recibo da lavanderia',
    kind: 'doc', tag: 'Falsa',
    text: 'Avental de Benedita com "mancha difícil", retirado em 15/09 — um dia depois do crime. Data forjada.'
  },
  copo_vinho: {
    title: 'Copo lavado às pressas',
    kind: 'object', tag: 'Cena',
    text: 'Um copo lavado há pouco. Ainda há cheiro de vinho tinto no ralo.'
  },
  servico_trancada: {
    title: 'Porta de serviço',
    kind: 'object', tag: 'Cena',
    text: 'Trancada por dentro, tranca intacta, teia de aranha no batente. Ninguém saiu por aqui.'
  },
  jantar_intacto: {
    title: 'O jantar que não houve',
    kind: 'object', tag: 'Tempo',
    text: 'A geladeira está cheia e intacta. Nada foi cozido. A história do jantar às 21:40 é mentira.'
  },
  agenda_porao: {
    title: 'Agenda da cozinha',
    kind: 'doc', tag: 'Tempo',
    text: 'Calendário aberto em 14/09. Anotação a lápis, letra de Helena: "23:30 — encontro com T. no porão. Levar o gravador."'
  },
  email_cecilia: {
    title: 'E-mail de Cecília',
    kind: 'doc', tag: 'Motivo',
    text: 'De: c.alencar@alencarmineracao.br — 14/09 22:58\n"Ela vai publicar amanhã. O contrato tem a minha assinatura. Não podemos deixar."'
  },
  rascunho_helena: {
    title: 'Rascunho de Helena',
    kind: 'doc', tag: 'Vítima',
    text: '"Se eu não voltar desta noite, procurem no porão. Tenho a gravação. — H."'
  },
  contrato_mineradora: {
    title: 'Contrato de lavra',
    kind: 'doc', tag: 'Motivo',
    text: 'Contrato de expansão da lavra sobre o córrego da comunidade. Assinado por Cecília Alencar. Anexo técnico: contaminação por metais pesados.'
  },
  papel_timbrado: {
    title: 'Papel timbrado',
    kind: 'doc', tag: 'Pista',
    text: 'Papel do escritório de Amaro: timbre dourado, marca d\'água "AV". Guardado no arquivo.'
  },
  foto_rasgada: {
    title: 'Foto rasgada (metade)',
    kind: 'photo', tag: 'Suspeitos',
    text: 'Metade de uma fotografia. Vê-se um ombro, um braço com relógio de ouro e o portão da mineradora ao fundo.'
  },
  meia_foto: {
    title: 'Outra metade da foto',
    kind: 'photo', tag: 'Suspeitos',
    text: 'A outra metade da foto, escondida no tijolo solto do porão. Mostra uma mão com anel de esmeralda.'
  },
  foto_completa: {
    title: 'A foto completa',
    kind: 'photo', tag: 'Reviravolta',
    text: 'Cecília e Amaro, juntos, em frente ao portão da mineradora. O anel de esmeralda é dela. O relógio de ouro é dele. Não era só sociedade.'
  },
  ligacao_tomas: {
    title: 'Ligação para o fósforo',
    kind: 'audio', tag: 'Suspeitos',
    text: 'Voz de Tomás, gravada na caixa postal: "Helena, se você sair agora eu conto tudo. Te espero no portão às 23:30."'
  },
  chamada_2352: {
    title: 'Chamada às 23:52',
    kind: 'object', tag: 'Tempo',
    text: 'Registro do telefone: ligação para fora da cidade às 23:52 — cinco minutos depois de o relógio parar. Durou 11 minutos.'
  },
  passagem_onibus: {
    title: 'Passagem de ônibus',
    kind: 'doc', tag: 'Vítima',
    text: 'Vazante → Belo Horizonte, 15/09, 06:15. No nome de Helena. Ela ia fugir naquela noite.'
  },
  provas_contaminacao: {
    title: 'Amostras de água',
    kind: 'object', tag: 'Motivo',
    text: 'Galões com amostras do córrego, etiquetadas por Helena: chumbo e arsênio acima do limite em 14 pontos.'
  },
  gravacao_final: {
    title: 'A gravação final',
    kind: 'audio', tag: 'Reviravolta',
    text: 'Voz de Helena, trêmula: "Eu descobri quem assinou... Cecília, eu ouvi vocês dois..." — barulho de vidro quebrado, um grito abafado e uma voz masculina: "Segura ela."'
  },
  faca_monograma: {
    title: 'Faca com monograma',
    kind: 'object', tag: 'Arma',
    text: 'A faca do porão tem "C.A." gravado no cabo. Duas pessoas nesta casa têm essas iniciais — mas só uma usa esmeraldas.'
  },
  resumo_timeline: {
    title: 'Linha do tempo',
    kind: 'doc', tag: 'Tempo',
    text: '23:30 Helena desce ao porão com o gravador. 23:47 o relógio do hall cai e para. 23:52 alguém telefona por 11 minutos. Ninguém "jantou" às 21:40.'
  }
};

/* ---------------------------------------------------------------------------
   COMBINAÇÕES DE PISTAS (mecânica: relacionar duas pistas)
--------------------------------------------------------------------------- */
export const COMBOS = [
  { a: 'carta_ameaca',   b: 'papel_timbrado',  result: 'ameaca_escritorio',
    text: 'A carta anônima foi impressa no escritório de Amaro.' },
  { a: 'faca_faltando',  b: 'faca_monograma',  result: 'faca_cozinha_porao',
    text: 'A faca que faltava na cozinha é a mesma do porão.' },
  { a: 'foto_rasgada',   b: 'meia_foto',       result: 'foto_completa',
    text: 'As metades se encaixam: Cecília e Amaro, juntos.' },
  { a: 'hora_crime',     b: 'agenda_porao',    result: 'resumo_timeline',
    text: 'O relógio parou 17 minutos depois de Helena descer.' }
];

/* ---------------------------------------------------------------------------
   ENIGMAS
--------------------------------------------------------------------------- */
export const PUZZLES = {
  /* -- Livro certo: depende da hora lida no relógio (outra sala) ---------- */
  livros: {
    id: 'livros', type: 'choice', scene: 'biblioteca',
    title: 'Estante de livros',
    prompt: 'Cinco livros têm horas gravadas na lombada. Um deles não está alinhado com os outros.',
    hint: 'A hora certa não está nesta sala. Alguém precisa ler o relógio do hall.',
    options: [
      { id: 'l2110', label: '“O Córrego Seco” — 21:10' },
      { id: 'l2205', label: '“Cartas de Vazante” — 22:05' },
      { id: 'l2347', label: '“O Relógio de Areia” — 23:47' },
      { id: 'l0015', label: '“Noite de São João” — 00:15' },
      { id: 'l0120', label: '“Ferro e Sangue” — 01:20' }
    ],
    answer: 'l2347',
    requires: { flags: { hora_lida: true } },
    lockedText: 'Você não sabe qual livro procurar. Precisa de uma hora exata.',
    success: 'O livro cede com um estalo. A estante range e um compartimento se abre.'
  },

  /* -- Senha do computador: nome do cão (pista em outra sala) ------------- */
  senha_pc: {
    id: 'senha_pc', type: 'text', scene: 'escritorio',
    title: 'Terminal — ALENCAR / FINANÇAS',
    prompt: 'Bloqueado. DICA (adesivo sob o teclado): “senha = nome do cachorro, minúsculas, sem acento”.',
    hint: 'O nome está na plaquinha da coleira, pendurada no cabideiro do hall.',
    answer: 'bidu',
    placeholder: 'senha...',
    success: 'Acesso concedido. Caixa de entrada aberta.'
  },

  /* -- Cofre: sequência de 4 símbolos (cada símbolo em uma sala) ---------- */
  cofre: {
    id: 'cofre', type: 'symbols', scene: 'escritorio',
    title: 'Cofre de parede',
    prompt: 'Quatro discos com símbolos. Gire cada disco e confirme a sequência.',
    hint: 'Cada símbolo estava com o objeto pessoal de alguém. A ordem é a ordem de chegada da lista de convidados.',
    symbols: ['chave', 'lua', 'serpente', 'olho'],
    symbolNames: { chave: 'CHAVE', lua: 'LUA', serpente: 'SERPENTE', olho: 'OLHO' },
    answer: ['chave', 'lua', 'serpente', 'olho'],
    requires: { clues: ['simbolo_chave', 'simbolo_lua', 'simbolo_serpente', 'simbolo_olho'] },
    lockedText: 'Faltam símbolos. Alguém precisa encontrar os quatro — espalhados pela casa.',
    success: 'O mecanismo cede. O cofre se abre.'
  },

  /* -- Telefone: número achado na caixa de fósforos da cozinha ------------ */
  telefone: {
    id: 'telefone', type: 'text', scene: 'escritorio',
    title: 'Telefone fixo',
    prompt: 'Discar número (8 dígitos).',
    hint: 'O número foi rabiscado em algum lugar da cozinha.',
    answer: '33712244',
    placeholder: '0000-0000',
    success: 'Chama... uma caixa postal.'
  },

  /* -- Energia: dois jogadores, duas salas, ao mesmo tempo ---------------- */
  energia: {
    id: 'energia', type: 'sync', scene: '*',
    title: 'Quadro de energia',
    prompt: 'A casa está no escuro. Alguém precisa segurar a chave do disjuntor NA COZINHA enquanto outro religa o quadro NO HALL — dentro de poucos segundos.',
    hint: 'Dois jogadores, dois cômodos, ao mesmo tempo. Conversem e contem até três.',
    syncIds: ['disjuntor_cozinha', 'quadro_hall'],
    windowMs: 6000,
    soloWindowMs: 25000,
    success: 'A energia volta. As lâmpadas piscam e acendem.'
  },

  /* -- Acusação final ----------------------------------------------------- */
  acusacao: {
    id: 'acusacao', type: 'accusation', scene: '*',
    title: 'Quadro de acusação',
    prompt: 'Quem? E com quais provas?',
    hint: 'A gravação diz um nome. A faca tem iniciais. A fotografia mostra duas pessoas onde a casa jurava haver apenas sociedade. O resto é mentira plantada.',
    suspects: ['cecilia', 'amaro', 'tomas', 'rafael', 'benedita'],
    evidencePool: [
      'gravacao_final', 'faca_monograma', 'foto_completa', 'email_cecilia',
      'ameaca_escritorio', 'contrato_mineradora', 'resumo_timeline',
      'passagem_onibus', 'provas_contaminacao', 'ligacao_tomas', 'chamada_2352'
    ],
    answer: { suspect: 'cecilia', evidence: ['gravacao_final', 'faca_monograma', 'foto_completa'] },
    requires: { flags: { porao_aberto: true } },
    lockedText: 'Vocês ainda não estiveram no porão.'
  }
};

/* ---------------------------------------------------------------------------
   CENAS
   Cada cena: 1280x720 de mundo. Objetos com hitbox e ações.
--------------------------------------------------------------------------- */
export const SCENES = {
  hall: {
    id: 'hall', name: 'Hall de entrada', short: 'HALL',
    unlockBy: null,
    spawn: { x: 640, y: 470 },
    ambient: { wall: '#3d342b', floor: '#26211b', light: '#ffb46b', dust: 0.5 },
    nav: [
      { to: 'biblioteca', x: 1140, y: 570, w: 130, h: 140, label: 'Biblioteca' },
      { to: 'cozinha',    x: 0,    y: 430, w: 74,  h: 200, label: 'Cozinha' },
      { to: 'escritorio', x: 540,  y: 120, w: 200, h: 210, label: 'Escritório', requires: { flags: { escritorio_aberto: true } } }
    ],
    objects: [
      {
        id: 'relogio', name: 'Relógio de pêndulo', prop: 'clock',
        x: 176, y: 236, w: 108, h: 300, label: 'Relógio de pêndulo',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'flag', k: 'hora_lida', v: true },
            { t: 'clue', id: 'hora_crime' },
            { t: 'sfx', id: 'tick' },
            { t: 'log', text: 'leu a hora no relógio do hall: 23:47' }
          ]},
          { id: 'abrir', label: 'Abrir porta de vidro', requires: { flags: { hora_lida: true } },
            lockedText: 'Está emperrada. Examine antes.', effects: [
            { t: 'sfx', id: 'creak' },
            { t: 'say', text: 'A porta de vidro range. Dentro, preso ao pêndulo, há um bilhete dobrado.' },
            { t: 'flag', k: 'relogio_aberto', v: true }, { t: 'open' }
          ]},
          { id: 'pegar', label: 'Pegar o bilhete', requires: { flags: { relogio_aberto: true }, not: { relogio_bilhete: true } },
            hiddenUnless: { flags: { relogio_aberto: true } }, effects: [
            { t: 'clue', id: 'bilhete_pendulo' }, { t: 'flag', k: 'relogio_bilhete', v: true },
            { t: 'sfx', id: 'paper' }, { t: 'fx', id: 'flash' }
          ]}
        ]
      },
      {
        id: 'quadro_retrato', name: 'Retrato de Helena', prop: 'painting',
        x: 470, y: 150, w: 150, h: 118, label: 'Retrato a óleo',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'say', text: 'Helena Alencar, 34 anos. Os olhos foram riscados com algo pontudo.' },
            { t: 'flag', k: 'retrato_visto', v: true }
          ]},
          { id: 'deslocar', label: 'Deslocar o quadro', effects: [
            { t: 'flag', k: 'retrato_movido', v: true }, { t: 'open' }, { t: 'sfx', id: 'thud' },
            { t: 'say', text: 'Atrás do quadro: uma marca de fuligem e um tijolo solto na parede.' }
          ]},
          { id: 'tijolo', label: 'Remover o tijolo', hiddenUnless: { flags: { retrato_movido: true } },
            requires: { flags: { retrato_movido: true } }, effects: [
            { t: 'clue', id: 'simbolo_lua' }, { t: 'flag', k: 'tijolo_removido', v: true },
            { t: 'sfx', id: 'stone' }, { t: 'fx', id: 'shake' },
            { t: 'react', char: 'cecilia', line: 'Vocês estão revirando a casa toda?', mood: 'irritada' }
          ]}
        ]
      },
      {
        id: 'balcao_recepcao', name: 'Balcão da recepção', prop: 'console',
        x: 700, y: 400, w: 300, h: 150, label: 'Balcão',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'say', text: 'Móvel de madeira escura. Uma gaveta, um livro de visitas fechado e um telefone sem linha.' }
          ]}
        ]
      },
      {
        id: 'gaveta_recepcao', name: 'Gaveta do balcão', prop: 'drawer_console',
        x: 790, y: 452, w: 150, h: 52, label: 'Gaveta',
        actions: [
          { id: 'abrir', label: 'Abrir gaveta', effects: [
            { t: 'open' }, { t: 'sfx', id: 'drawer' },
            { t: 'item', id: 'lanterna' }, { t: 'clue', id: 'lista_convidados' },
            { t: 'flag', k: 'gaveta_hall', v: true },
            { t: 'say', text: 'Uma lanterna e o livro de visitas com a ordem de chegada de todos.' }
          ]}
        ]
      },
      {
        id: 'porta_principal', name: 'Porta principal', prop: 'door_main',
        x: 560, y: 300, w: 200, h: 260, label: 'Porta principal',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'say', text: 'Corrente e cadeado. A tempestade bate na madeira. Os elos estão abertos para fora.' }
          ]},
          { id: 'cortar', label: 'Cortar a corrente', requires: { items: ['alicate'] },
            lockedText: 'Precisa de algo que corte metal.', effects: [
            { t: 'clue', id: 'corrente_cortada' }, { t: 'flag', k: 'corrente_cortada', v: true },
            { t: 'sfx', id: 'metal' }, { t: 'fx', id: 'shake' },
            { t: 'react', char: 'rafael', line: 'Não! Essa corrente... ela tava inteira ontem.', mood: 'nervoso' }
          ]}
        ]
      },
      {
        id: 'cabideiro', name: 'Cabideiro', prop: 'coatrack',
        x: 1000, y: 320, w: 130, h: 230, label: 'Cabideiro',
        actions: [
          { id: 'ver', label: 'Revistar casacos', effects: [
            { t: 'clue', id: 'casaco_umido' }, { t: 'item', id: 'isqueiro' },
            { t: 'clue', id: 'pegadas_lama' },
            { t: 'flag', k: 'casacos_vistos', v: true },
            { t: 'say', text: 'Casaco molhado, isqueiro gravado "A.V." e, pendurada, a coleira do cão com a plaquinha: BIDU.' }
          ]}
        ]
      },
      {
        id: 'tapete_hall', name: 'Tapete', prop: 'rug',
        x: 520, y: 520, w: 380, h: 90, label: 'Tapete persa',
        actions: [
          { id: 'mover', label: 'Arrastar o tapete', effects: [
            { t: 'open' }, { t: 'clue', id: 'arrasto' }, { t: 'sfx', id: 'drag' },
            { t: 'flag', k: 'tapete_movido', v: true },
            { t: 'say', text: 'Duas marcas no assoalho: algo pesado foi arrastado até a biblioteca.' }
          ]}
        ]
      },
      {
        id: 'quadro_hall', name: 'Quadro de luz', prop: 'breaker',
        x: 1218, y: 300, w: 56, h: 90, label: 'Quadro de luz',
        actions: [
          { id: 'ligar', label: 'Religar quadro geral', requires: { flags: { blecaute: true } },
            lockedText: 'A energia está normal — por enquanto.', effects: [
            { t: 'sync', id: 'quadro_hall' }, { t: 'sfx', id: 'switch' }
          ]}
        ]
      },
      {
        id: 'lustre', name: 'Lustre', prop: 'chandelier',
        x: 560, y: 60, w: 220, h: 110, label: 'Lustre',
        actions: [
          { id: 'ver', label: 'Olhar para cima', effects: [
            { t: 'say', text: 'Três lâmpadas apagadas e uma acesa, tremendo. Há um fio puxado, como se alguém tivesse pendurado algo nele.' },
            { t: 'flag', k: 'lustre_visto', v: true }
          ]}
        ]
      }
    ]
  },

  biblioteca: {
    id: 'biblioteca', name: 'Biblioteca', short: 'BIBLIOTECA',
    unlockBy: null,
    spawn: { x: 640, y: 500 },
    ambient: { wall: '#3e2f22', floor: '#251c14', light: '#ffa552', dust: 0.9 },
    nav: [
      { to: 'hall', x: 0, y: 430, w: 74, h: 200, label: 'Hall' }
    ],
    objects: [
      {
        id: 'estante', name: 'Estante de livros', prop: 'bookshelf',
        x: 90, y: 120, w: 330, h: 340, label: 'Estante',
        actions: [
          { id: 'ver', label: 'Examinar lombadas', effects: [ { t: 'puzzle', id: 'livros' } ] }
        ]
      },
      {
        id: 'lareira', name: 'Lareira', prop: 'fireplace',
        x: 520, y: 250, w: 260, h: 240, label: 'Lareira',
        actions: [
          { id: 'ver', label: 'Examinar cinzas', effects: [
            { t: 'clue', id: 'cinzas_doc' }, { t: 'flag', k: 'cinzas_vistas', v: true }, { t: 'sfx', id: 'paper' },
            { t: 'say', text: 'Folhas meio queimadas. Alguém tentou destruir um contrato — e não terminou o serviço.' }
          ]},
          { id: 'atiçar', label: 'Atiçar as cinzas', requires: { flags: { cinzas_vistas: true } },
            lockedText: 'Examine antes de mexer.', effects: [
            { t: 'clue', id: 'simbolo_serpente' }, { t: 'flag', k: 'serpente_vista', v: true },
            { t: 'sfx', id: 'ember' }, { t: 'fx', id: 'embers' },
            { t: 'react', char: 'cecilia', line: 'Isso aí é lixo. Não significa nada.', mood: 'irritada' }
          ]}
        ]
      },
      {
        id: 'album', name: 'Álbum de fotografias', prop: 'photoalbum',
        x: 830, y: 420, w: 130, h: 70, label: 'Álbum de fotos',
        actions: [
          { id: 'folhear', label: 'Folhear o álbum', effects: [
            { t: 'clue', id: 'foto_jantar' }, { t: 'clue', id: 'foto_mineradora' },
            { t: 'flag', k: 'album_visto', v: true }, { t: 'sfx', id: 'paper' },
            { t: 'say', text: 'Foto do jantar: só quatro cadeiras ocupadas. E uma foto solta de Helena com Tomás na mineradora.' }
          ]}
        ]
      },
      {
        id: 'bar', name: 'Armário de bebidas', prop: 'bar',
        x: 900, y: 180, w: 260, h: 250, label: 'Armário de bebidas',
        actions: [
          { id: 'abrir', label: 'Abrir o armário', effects: [
            { t: 'open' }, { t: 'clue', id: 'tacas_vinho' }, { t: 'sfx', id: 'creak' },
            { t: 'flag', k: 'bar_aberto', v: true },
            { t: 'say', text: 'Duas taças com batom, uma terceira limpa e intocada. Alguém serviu vinho para duas pessoas.' }
          ]}
        ]
      },
      {
        id: 'vitrola', name: 'Vitrola', prop: 'recordplayer',
        x: 380, y: 430, w: 170, h: 130, label: 'Vitrola',
        actions: [
          { id: 'tocar', label: 'Tocar o disco', effects: [
            { t: 'clue', id: 'voz_disco' }, { t: 'flag', k: 'disco_tocado', v: true },
            { t: 'sfx', id: 'record' }, { t: 'fx', id: 'music' },
            { t: 'say', text: 'A música começa e, por baixo dela, uma voz gravada por acidente.' }
          ]}
        ]
      },
      {
        id: 'tapete_bib', name: 'Alçapão', prop: 'trapdoor',
        x: 560, y: 540, w: 220, h: 100, label: 'Tapete sobre o chão',
        actions: [
          { id: 'mover', label: 'Mover o tapete', effects: [
            { t: 'flag', k: 'alcapao_visto', v: true }, { t: 'open' }, { t: 'sfx', id: 'drag' },
            { t: 'say', text: 'Há um alçapão de madeira no chão, com um cadeado grosso.' }
          ]},
          { id: 'abrir', label: 'Destrancar o alçapão', hiddenUnless: { flags: { alcapao_visto: true } },
            requires: { items: ['chave_porao'] }, lockedText: 'O cadeado é grosso. Serve uma chave pesada.',
            effects: [ { t: 'go', scene: 'porao' }, { t: 'sfx', id: 'lock' } ] }
        ]
      },
      {
        id: 'poltrona', name: 'Poltrona e janela', prop: 'armchair',
        x: 620, y: 380, w: 250, h: 110, label: 'Poltrona',
        actions: [
          { id: 'ver', label: 'Olhar pela janela', effects: [
            { t: 'clue', id: 'pegadas_lama' }, { t: 'say', text: 'A tempestade. O galpão no fundo tem uma luz acesa — e não devia.' }
          ]}
        ]
      },
      {
        id: 'mesa_centro', name: 'Mesa de centro', prop: 'sidetable',
        x: 780, y: 470, w: 190, h: 80, label: 'Mesa de centro',
        actions: [
          { id: 'ver', label: 'Ler os papéis', effects: [
            { t: 'clue', id: 'carta_ameaca' }, { t: 'flag', k: 'carta_vista', v: true }, { t: 'sfx', id: 'paper' },
            { t: 'say', text: 'Uma carta anônima ameaçando Helena. Papel branco, sem assinatura.' }
          ]}
        ]
      },
      {
        id: 'escrivaninha', name: 'Escrivaninha', prop: 'desk_small',
        x: 1140, y: 330, w: 140, h: 170, label: 'Escrivaninha',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'say', text: 'Cartas de Cecília, todas com o mesmo perfume. E um recibo de passagem de ônibus.' },
            { t: 'clue', id: 'passagem_onibus' }, { t: 'flag', k: 'passagem_vista', v: true }
          ]}
        ]
      }
    ]
  },

  cozinha: {
    id: 'cozinha', name: 'Cozinha', short: 'COZINHA',
    unlockBy: null,
    spawn: { x: 640, y: 470 },
    ambient: { wall: '#2e3835', floor: '#1c2224', light: '#cfe8ff', dust: 0.3 },
    nav: [
      { to: 'hall', x: 0, y: 664, w: 150, h: 56, label: 'Hall' }
    ],
    objects: [
      {
        id: 'radio', name: 'Rádio', prop: 'radio',
        x: 180, y: 330, w: 140, h: 90, label: 'Rádio de pilha',
        actions: [
          { id: 'ligar', label: 'Ligar o rádio', effects: [
            { t: 'clue', id: 'radio_noticia' }, { t: 'flag', k: 'radio_ligado', v: true },
            { t: 'sfx', id: 'radio' },
            { t: 'say', text: 'Notícia local: um corpo no rio. A descrição não bate com Helena.' }
          ]}
        ]
      },
      {
        id: 'despensa', name: 'Despensa', prop: 'pantry',
        x: 60, y: 150, w: 220, h: 300, label: 'Despensa',
        actions: [
          { id: 'abrir', label: 'Abrir a despensa', effects: [
            { t: 'open' }, { t: 'item', id: 'alicate' }, { t: 'clue', id: 'numero_telefone' },
            { t: 'flag', k: 'despensa_aberta', v: true }, { t: 'sfx', id: 'creak' },
            { t: 'say', text: 'Ferramentas, velas e uma lata de café. Dentro da lata: um cartão com um OLHO desenhado e uma caixa de fósforos com um número.' }
          ]}
        ]
      },
      {
        id: 'lata', name: 'Lata de café', prop: 'can',
        x: 300, y: 420, w: 90, h: 110, label: 'Lata de café',
        actions: [
          { id: 'abrir', label: 'Abrir a lata', effects: [
            { t: 'clue', id: 'simbolo_olho' }, { t: 'flag', k: 'olho_visto', v: true }, { t: 'sfx', id: 'metal' },
            { t: 'say', text: 'Um cartão com o símbolo do OLHO e um pedaço de alça de câmera fotográfica.' }
          ]}
        ]
      },
      {
        id: 'faca_bloco', name: 'Bloco de facas', prop: 'knife_block',
        x: 480, y: 330, w: 110, h: 120, label: 'Bloco de facas',
        actions: [
          { id: 'ver', label: 'Contar as facas', effects: [
            { t: 'clue', id: 'faca_faltando' }, { t: 'flag', k: 'facas_vistas', v: true },
            { t: 'say', text: 'Falta uma faca de 20 cm. A poeira guarda o desenho exato da lâmina.' }
          ]}
        ]
      },
      {
        id: 'gaveta_cozinha', name: 'Gaveta da pia', prop: 'drawer_console',
        x: 640, y: 430, w: 180, h: 60, label: 'Gaveta',
        actions: [
          { id: 'abrir', label: 'Abrir a gaveta', effects: [
            { t: 'open' }, { t: 'item', id: 'chave_pequena' }, { t: 'clue', id: 'recibo_lavanderia' },
            { t: 'flag', k: 'gaveta_cozinha', v: true }, { t: 'sfx', id: 'drawer' },
            { t: 'say', text: 'Uma chave pequena e um recibo de lavanderia com data errada.' }
          ]}
        ]
      },
      {
        id: 'pia', name: 'Pia', prop: 'sink',
        x: 860, y: 330, w: 200, h: 130, label: 'Pia',
        actions: [
          { id: 'ver', label: 'Examinar a pia', effects: [
            { t: 'clue', id: 'copo_vinho' }, { t: 'flag', k: 'pia_vista', v: true }, { t: 'sfx', id: 'water' },
            { t: 'say', text: 'Um copo recém-lavado. O ralo ainda guarda cheiro de vinho tinto.' }
          ]}
        ]
      },
      {
        id: 'geladeira', name: 'Geladeira', prop: 'fridge',
        x: 1090, y: 200, w: 150, h: 290, label: 'Geladeira',
        actions: [
          { id: 'abrir', label: 'Abrir a geladeira', effects: [
            { t: 'open' }, { t: 'clue', id: 'jantar_intacto' }, { t: 'flag', k: 'geladeira_aberta', v: true },
            { t: 'sfx', id: 'creak' },
            { t: 'say', text: 'Tudo intacto. Nada foi cozido. O "jantar" das 21:40 nunca aconteceu.' }
          ]}
        ]
      },
      {
        id: 'calendario', name: 'Calendário', prop: 'calendar',
        x: 420, y: 200, w: 120, h: 120, label: 'Calendário',
        actions: [
          { id: 'ler', label: 'Ler o calendário', effects: [
            { t: 'clue', id: 'agenda_porao' }, { t: 'flag', k: 'agenda_vista', v: true }, { t: 'sfx', id: 'paper' },
            { t: 'say', text: 'Letra de Helena: "23:30 — encontro com T. no porão. Levar o gravador."' }
          ]}
        ]
      },
      {
        id: 'servico', name: 'Porta de serviço', prop: 'door_service',
        x: 200, y: 460, w: 170, h: 200, label: 'Porta de serviço',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'clue', id: 'servico_trancada' }, { t: 'say', text: 'Trancada por dentro, teia de aranha intacta. Ninguém saiu por aqui.' }
          ]}
        ]
      },
      {
        id: 'disjuntor', name: 'Disjuntor', prop: 'fuse',
        x: 1230, y: 250, w: 50, h: 100, label: 'Disjuntor',
        actions: [
          { id: 'segurar', label: 'Segurar a chave do disjuntor', requires: { flags: { blecaute: true } },
            lockedText: 'Não há nada para consertar agora.', effects: [
            { t: 'sync', id: 'disjuntor_cozinha' }, { t: 'sfx', id: 'switch' }
          ]}
        ]
      },
      {
        id: 'fogao', name: 'Fogão', prop: 'stove',
        x: 620, y: 300, w: 190, h: 130, label: 'Fogão',
        actions: [
          { id: 'ver', label: 'Examinar o fogão', effects: [
            { t: 'say', text: 'Frio. Ninguém acendeu o fogo hoje.' }
          ]}
        ]
      }
    ]
  },

  escritorio: {
    id: 'escritorio', name: 'Escritório', short: 'ESCRITÓRIO',
    unlockBy: { flags: { escritorio_aberto: true } },
    lockedText: 'A porta está trancada. A chave tem uma etiqueta "E".',
    spawn: { x: 640, y: 490 },
    ambient: { wall: '#2a363b', floor: '#1c2226', light: '#ffd28a', dust: 0.6 },
    nav: [
      { to: 'hall', x: 0, y: 430, w: 80, h: 190, label: 'Hall' }
    ],
    objects: [
      {
        id: 'computador', name: 'Computador', prop: 'computer',
        x: 520, y: 300, w: 220, h: 150, label: 'Computador',
        actions: [
          { id: 'usar', label: 'Usar o terminal', effects: [ { t: 'puzzle', id: 'senha_pc' } ] }
        ]
      },
      {
        id: 'cofre', name: 'Cofre', prop: 'safe',
        x: 1010, y: 250, w: 190, h: 190, label: 'Cofre de parede',
        actions: [
          { id: 'usar', label: 'Examinar o cofre', effects: [ { t: 'puzzle', id: 'cofre' } ] }
        ]
      },
      {
        id: 'quadro_esc', name: 'Quadro torto', prop: 'painting_dark',
        x: 1010, y: 140, w: 150, h: 90, label: 'Quadro',
        actions: [
          { id: 'ver', label: 'Endireitar o quadro', effects: [
            { t: 'say', text: 'O quadro estava cobrindo o cofre. Alguém o deixou torto de propósito.' },
            { t: 'flag', k: 'quadro_esc_visto', v: true }
          ]}
        ]
      },
      {
        id: 'gaveta_mesa', name: 'Gaveta da mesa', prop: 'desk_drawer',
        x: 660, y: 440, w: 170, h: 56, label: 'Gaveta trancada',
        actions: [
          { id: 'forçar', label: 'Forçar com o alicate', requires: { items: ['alicate'] },
            lockedText: 'Trancada. Não cede à mão.', effects: [
            { t: 'open' }, { t: 'sfx', id: 'metal' },
            { t: 'clue', id: 'simbolo_chave' }, { t: 'clue', id: 'foto_rasgada' },
            { t: 'flag', k: 'gaveta_mesa_aberta', v: true },
            { t: 'say', text: 'Chaveiro com pingente em forma de CHAVE e metade de uma fotografia rasgada.' },
            { t: 'react', char: 'amaro', line: 'Isso é invasão de privacidade.', mood: 'irritado' }
          ]}
        ]
      },
      {
        id: 'telefone', name: 'Telefone fixo', prop: 'phone',
        x: 380, y: 330, w: 120, h: 90, label: 'Telefone',
        actions: [
          { id: 'discar', label: 'Discar um número', effects: [ { t: 'puzzle', id: 'telefone' } ] },
          { id: 'rediscar', label: 'Ver últimas chamadas', effects: [
            { t: 'clue', id: 'chamada_2352' }, { t: 'flag', k: 'chamadas_vistas', v: true },
            { t: 'sfx', id: 'beep' },
            { t: 'say', text: 'Registro: ligação para fora da cidade às 23:52. Durou 11 minutos.' }
          ]}
        ]
      },
      {
        id: 'arquivo', name: 'Arquivo de aço', prop: 'filing',
        x: 120, y: 260, w: 200, h: 260, label: 'Arquivo',
        actions: [
          { id: 'abrir', label: 'Abrir o arquivo', effects: [
            { t: 'open' }, { t: 'clue', id: 'papel_timbrado' }, { t: 'clue', id: 'contrato_mineradora' },
            { t: 'flag', k: 'arquivo_aberto', v: true }, { t: 'sfx', id: 'drawer' },
            { t: 'say', text: 'Papel timbrado "AV" e o contrato de lavra — assinado por Cecília Alencar.' }
          ]}
        ]
      },
      {
        id: 'copo_uisque', name: 'Copo de uísque', prop: 'whiskey',
        x: 810, y: 350, w: 90, h: 80, label: 'Copo e cinzeiro',
        actions: [
          { id: 'ver', label: 'Examinar', effects: [
            { t: 'say', text: 'Uísque intacto, charuto apagado pela metade. Alguém se sentou aqui e saiu rápido.' },
            { t: 'flag', k: 'uisque_visto', v: true }
          ]}
        ]
      },
      {
        id: 'janela_esc', name: 'Janela', prop: 'window_night',
        x: 480, y: 110, w: 240, h: 150, label: 'Janela',
        actions: [
          { id: 'ver', label: 'Olhar o galpão', effects: [
            { t: 'say', text: 'A luz do galpão acende e apaga, como se alguém lá dentro procurasse alguma coisa.' },
            { t: 'flag', k: 'galpao_visto', v: true }, { t: 'sfx', id: 'thunder' }
          ]}
        ]
      },
      {
        id: 'luminaria', name: 'Luminária', prop: 'lamp',
        x: 300, y: 250, w: 90, h: 130, label: 'Luminária',
        actions: [
          { id: 'ver', label: 'Levantar a luminária', effects: [
            { t: 'say', text: 'Sob a base, um adesivo: "senha = nome do cachorro, minúsculas".' },
            { t: 'flag', k: 'adesivo_visto', v: true }
          ]}
        ]
      }
    ]
  },

  porao: {
    id: 'porao', name: 'Porão', short: 'PORÃO',
    unlockBy: { flags: { porao_aberto: true } },
    lockedText: 'O alçapão está trancado.',
    spawn: { x: 200, y: 470 },
    ambient: { wall: '#20262a', floor: '#14191b', light: '#7fd4ff', dust: 1.4, dark: true },
    nav: [
      { to: 'biblioteca', x: 30, y: 40, w: 180, h: 120, label: 'Subir (alçapão)' }
    ],
    objects: [
      {
        id: 'trevas', name: 'Escuridão', prop: 'darkness',
        x: 320, y: 120, w: 640, h: 380, label: 'Escuridão',
        actions: [
          { id: 'olhar', label: 'Tatear no escuro', effects: [
            { t: 'say', text: 'Não dá para ver um palmo à frente. É preciso luz — alguém precisa trazê-la e segurá-la aqui.' },
            { t: 'flag', k: 'trevas_vistas', v: true }
          ]},
          { id: 'iluminar', label: 'Acender a lanterna AQUI', requires: { items: ['lanterna'] },
            lockedText: 'A lanterna não está com a equipe.', effects: [
            { t: 'flag', k: 'porao_claro', v: true }, { t: 'sfx', id: 'switch' },
            { t: 'fx', id: 'lights' },
            { t: 'say', text: 'O feixe de luz varre o porão: galões, uma mala, prateleiras — e algo caído no chão.' },
            { t: 'react', char: 'cecilia', line: 'Ninguém desce aí. Nunca.', mood: 'nervosa' }
          ]},
          { id: 'isqueiro', label: 'Acender o isqueiro AQUI', requires: { items: ['isqueiro'] },
            lockedText: 'Sem o isqueiro.', effects: [
            { t: 'flag', k: 'porao_claro', v: true }, { t: 'sfx', id: 'switch' }, { t: 'fx', id: 'lights' },
            { t: 'say', text: 'A chama pequena treme, mas revela o suficiente.' }
          ]}
        ]
      },
      {
        id: 'mala', name: 'Mala de viagem', prop: 'suitcase',
        x: 380, y: 420, w: 160, h: 120, label: 'Mala',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'abrir', label: 'Abrir a mala', effects: [
            { t: 'open' }, { t: 'clue', id: 'passagem_onibus' }, { t: 'item', id: 'pendrive' },
            { t: 'flag', k: 'mala_aberta', v: true }, { t: 'sfx', id: 'creak' },
            { t: 'say', text: 'Roupas dobradas, um passaporte e um pendrive marcado "PROVAS". Helena ia fugir naquela noite.' }
          ]}
        ]
      },
      {
        id: 'gravador', name: 'Gravador', prop: 'recorder',
        x: 700, y: 460, w: 120, h: 80, label: 'Gravador caído',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'tocar', label: 'Pressionar PLAY', effects: [
            { t: 'clue', id: 'gravacao_final' }, { t: 'item', id: 'gravador' },
            { t: 'flag', k: 'gravacao_ouvida', v: true }, { t: 'sfx', id: 'record' }, { t: 'fx', id: 'shake' },
            { t: 'say', text: 'A voz de Helena enche o porão. Quando termina, ninguém na casa fala por um segundo.' },
            { t: 'react', char: 'cecilia', line: '...desliguem isso.', mood: 'nervosa' },
            { t: 'react', char: 'amaro', line: 'Eu não sabia dessa gravação.', mood: 'nervoso' }
          ]}
        ]
      },
      {
        id: 'faca_porao', name: 'Faca no chão', prop: 'knife_floor',
        x: 880, y: 480, w: 130, h: 70, label: 'Algo metálico',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'pegar', label: 'Examinar com cuidado', effects: [
            { t: 'clue', id: 'faca_monograma' }, { t: 'flag', k: 'faca_vista', v: true }, { t: 'sfx', id: 'metal' },
            { t: 'say', text: 'A faca que faltava na cozinha. No cabo, gravado: C.A.' }
          ]}
        ]
      },
      {
        id: 'galoes', name: 'Galões', prop: 'barrels',
        x: 120, y: 330, w: 220, h: 200, label: 'Galões',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'ver', label: 'Ler os rótulos', effects: [
            { t: 'clue', id: 'provas_contaminacao' }, { t: 'flag', k: 'galoes_vistos', v: true },
            { t: 'say', text: 'Amostras de água do córrego, etiquetadas por Helena: chumbo e arsênio acima do limite.' }
          ]}
        ]
      },
      {
        id: 'parede_porao', name: 'Parede úmida', prop: 'bricks',
        x: 980, y: 250, w: 220, h: 230, label: 'Parede de tijolos',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'tijolo', label: 'Apertar os tijolos', effects: [
            { t: 'clue', id: 'meia_foto' }, { t: 'flag', k: 'tijolo_porao', v: true }, { t: 'sfx', id: 'stone' },
            { t: 'say', text: 'Um tijolo cede. Dentro: a outra metade da fotografia rasgada.' }
          ]}
        ]
      },
      {
        id: 'tunel', name: 'Túnel', prop: 'tunnel',
        x: 500, y: 150, w: 300, h: 180, label: 'Túnel fechado',
        requiresFlags: { porao_claro: true },
        actions: [
          { id: 'ver', label: 'Examinar o túnel', effects: [
            { t: 'say', text: 'Uma saída antiga para o galpão, fechada com tábuas por dentro. Quem trancou, trancou de fora... ou de dentro.' },
            { t: 'flag', k: 'tunel_visto', v: true }
          ]}
        ]
      }
    ]
  }
};

/* -- Porta do escritório (objeto do hall que destranca a cena) ------------- */
SCENES.hall.objects.push({
  id: 'porta_escritorio', name: 'Porta do escritório', prop: 'door_office',
  x: 560, y: 120, w: 200, h: 210, label: 'Porta do escritório',
  actions: [
    { id: 'ver', label: 'Examinar', effects: [
      { t: 'say', text: 'Porta de madeira maciça, trancada. A fechadura tem uma etiqueta desbotada: "E".' }
    ]},
    { id: 'abrir', label: 'Usar a chave do escritório', requires: { items: ['chave_escritorio'] },
      lockedText: 'Trancada. Falta uma chave com etiqueta "E".', effects: [
      { t: 'flag', k: 'escritorio_aberto', v: true }, { t: 'open' }, { t: 'sfx', id: 'lock' },
      { t: 'log', text: 'abriu a porta do escritório' },
      { t: 'say', text: 'A chave gira duas vezes. A porta do escritório se abre com um sopro de ar frio.' },
      { t: 'react', char: 'amaro', line: 'Quem autorizou vocês a entrarem ali?', mood: 'irritado' }
    ]},
    { id: 'entrar', label: 'Entrar no escritório', hiddenUnless: { flags: { escritorio_aberto: true } },
      effects: [ { t: 'go', scene: 'escritorio' } ] }
  ]
});

/* ---------------------------------------------------------------------------
   PERSONAGENS (vivos: rotina, reações e diálogos)
--------------------------------------------------------------------------- */
export const CHARACTERS = {
  cecilia: {
    id: 'cecilia', name: 'Cecília Alencar', role: 'Irmã de Helena',
    color: '#7ee0d0', coat: '#2b3a44', hair: '#3a2a24', scene: 'biblioteca',
    height: 1.0, accessory: 'brooch',
    routine: [
      { scene: 'biblioteca', x: 700, act: 'idle', dur: 6000 },
      { scene: 'biblioteca', x: 520, act: 'look', dur: 3000 },
      { scene: 'biblioteca', x: 880, act: 'walk', dur: 0 },
      { scene: 'biblioteca', x: 880, act: 'examine', dur: 4000 },
      { scene: 'biblioteca', x: 640, act: 'pace', dur: 6000 }
    ],
    reactions: {
      cofre_aberto:   { line: 'O cofre... quem deu a senha pra vocês?', mood: 'nervosa', moveTo: 'escritorio', x: 900 },
      gravacao_ouvida:{ line: 'Isso não prova nada. É uma gravação.', mood: 'irritada', moveTo: 'porao', x: 640 },
      blecaute:      { line: 'Rafael! A luz de novo!', mood: 'nervosa' },
      tijolo_removido:{ line: 'Vocês estão quebrando a casa?', mood: 'irritada' }
    },
    talk: {
      intro: 'Eu estava na biblioteca a noite toda. Sozinha. Como sempre.',
      topics: [
        { id: 'hora', label: 'Onde você estava às 23:47?',
          text: 'Aqui. Lendo. A luz caiu uns minutos, eu acendi a lareira de novo.',
          gives: null, flag: 'cecilia_hora' },
        { id: 'helena', label: 'Sobre Helena',
          text: 'Minha irmã achava que o mundo se conserta com uma reportagem. Eu acho que o mundo se conserta com dinheiro.',
          gives: 'foto_jantar', flag: 'cecilia_helena' },
        { id: 'mina', label: 'Sobre a mineradora',
          text: 'Eu assino contratos, investigador. Não escolho o que vai neles. — Ela desvia o olhar. — Helena nunca entendeu isso.',
          gives: 'contrato_mineradora', flag: 'cecilia_mina' },
        { id: 'amaro', label: 'Você e Amaro...',
          requires: { clues: ['foto_completa'] },
          text: '...temos negócios. Só negócios. — O anel de esmeralda dela bate na madeira da mesa.',
          gives: null, flag: 'cecilia_amaro' }
      ]
    }
  },
  amaro: {
    id: 'amaro', name: 'Dr. Amaro Vasques', role: 'Advogado da mineradora',
    color: '#f0b46b', coat: '#3a2f26', hair: '#4a4a4a', scene: 'hall',
    height: 1.05, accessory: 'tie',
    routine: [
      { scene: 'hall', x: 800, act: 'idle', dur: 5000 },
      { scene: 'hall', x: 620, act: 'pace', dur: 7000 },
      { scene: 'hall', x: 1000, act: 'look', dur: 3000 },
      { scene: 'hall', x: 240, act: 'walk', dur: 0 },
      { scene: 'hall', x: 240, act: 'examine', dur: 3500 }
    ],
    reactions: {
      escritorio_aberto: { line: 'Este escritório é particular. Estou avisando.', mood: 'irritado', moveTo: 'escritorio', x: 760 },
      cofre_aberto:      { line: 'Isso é roubo de documento. Vou chamar a polícia.', mood: 'nervoso', moveTo: 'escritorio', x: 1020 },
      blecaute:          { line: 'Ótimo. Simplesmente ótimo.', mood: 'nervoso' },
      gaveta_mesa_aberta:{ line: 'Vocês não têm mandado para isso.', mood: 'irritado' }
    },
    talk: {
      intro: 'Eu vim jantar. O jantar não aconteceu. Vim embora às 22h. Ou seria 23h? A noite foi longa.',
      topics: [
        { id: 'hora', label: 'Você saiu às 22h ou às 23h?',
          text: '...23h50. Saí às 23h50. O caseiro me viu. Pergunte a ele.',
          gives: null, flag: 'amaro_hora' },
        { id: 'carta', label: 'A carta anônima',
          text: 'Eu escrevo dezenas de cartas por semana. Isso não é uma confissão, é coincidência.',
          gives: 'papel_timbrado', flag: 'amaro_carta' },
        { id: 'contrato', label: 'Quem assinou o contrato?',
          text: 'Pergunte a ela. — Ele aponta para a biblioteca. — Eu só dou forma às palavras.',
          gives: null, flag: 'amaro_contrato' },
        { id: 'isqueiro', label: 'Este isqueiro é seu?',
          requires: { items: ['isqueiro'] },
          text: '...estava no meu bolso ontem. Alguém pegou. Ou eu deixei em algum lugar. Não me lembro de ontem, investigador.',
          gives: null, flag: 'amaro_isqueiro' }
      ]
    }
  },
  tomas: {
    id: 'tomas', name: 'Tomás Rocha', role: 'Fotógrafo',
    color: '#b69cff', coat: '#2d2a3d', hair: '#22201c', scene: 'hall',
    height: 0.98, accessory: 'camera',
    routine: [
      { scene: 'hall', x: 400, act: 'sit', dur: 7000 },
      { scene: 'hall', x: 400, act: 'idle', dur: 3000 },
      { scene: 'hall', x: 700, act: 'walk', dur: 0 },
      { scene: 'hall', x: 700, act: 'look', dur: 4000 },
      { scene: 'hall', x: 300, act: 'pace', dur: 5000 }
    ],
    reactions: {
      album_visto:   { line: 'Essa foto da mineradora... eu tirei. Ela me pediu.', mood: 'triste', moveTo: 'biblioteca', x: 820 },
      telefone_aberto:{ line: 'Vocês ouviram a mensagem. Eu esperei. Ela não veio.', mood: 'triste' },
      blecaute:      { line: 'Eu tenho a luz da câmera. Não serve de muito.', mood: 'triste' }
    },
    talk: {
      intro: 'Ela ia embora naquela noite. Eu ia levar ela até a rodoviária às 6 da manhã.',
      topics: [
        { id: 'porao', label: 'O encontro das 23:30 no porão',
          requires: { clues: ['agenda_porao'] },
          text: 'Eu esperei no portão. Não no porão. Ela mudou o lugar e não me avisou. — Ele respira fundo. — Isso me mata.',
          gives: null, flag: 'tomas_porao' },
        { id: 'ligacao', label: 'Sobre a sua mensagem',
          requires: { clues: ['ligacao_tomas'] },
          text: '"Se você sair agora eu conto tudo." Eu estava com raiva. Era sobre a reportagem, não sobre ela.',
          gives: null, flag: 'tomas_ligacao' },
        { id: 'quem', label: 'Quem você acha que fez isso?',
          text: 'Todo mundo aqui ganha com o silêncio dela. Menos eu.',
          gives: 'foto_mineradora', flag: 'tomas_quem' }
      ]
    }
  },
  benedita: {
    id: 'benedita', name: 'Benedita Souza', role: 'Governanta',
    color: '#8ee08a', coat: '#26332a', hair: '#1f1d1b', scene: 'cozinha',
    height: 0.95, accessory: 'apron',
    routine: [
      { scene: 'cozinha', x: 700, act: 'wipe', dur: 6000 },
      { scene: 'cozinha', x: 480, act: 'walk', dur: 0 },
      { scene: 'cozinha', x: 480, act: 'examine', dur: 3000 },
      { scene: 'cozinha', x: 900, act: 'idle', dur: 4000 },
      { scene: 'cozinha', x: 300, act: 'look', dur: 3500 }
    ],
    reactions: {
      despensa_aberta: { line: 'Isso é a minha despensa. Guardem tudo no lugar.', mood: 'irritada' },
      blecaute:        { line: 'A vela está na segunda gaveta. Sempre esteve.', mood: 'calma' },
      faca_vista:      { line: 'Eu lavei essa faca. Não, espera — eu não lavei.', mood: 'nervosa' }
    },
    talk: {
      intro: 'Trabalho aqui há vinte anos. Sei onde tudo está. Menos hoje.',
      topics: [
        { id: 'jantar', label: 'O jantar foi servido?',
          text: 'Não. Dona Helena mandou dispensar todo mundo às nove. Disse que ia receber uma visita.',
          gives: 'jantar_intacto', flag: 'benedita_jantar' },
        { id: 'lista', label: 'Quem chegou primeiro?',
          text: 'O Rafael, dezoito e cinquenta. Depois eu. Depois a Cecília, o doutor e o rapaz da câmera. Está no livro.',
          gives: 'lista_convidados', flag: 'benedita_lista' },
        { id: 'porao', label: 'Quem desce ao porão?',
          text: 'Ninguém. A chave fica com a família. — Ela olha para a porta. — A chave estava no cofre.',
          gives: null, flag: 'benedita_porao' },
        { id: 'faca', label: 'E a faca que falta?',
          requires: { clues: ['faca_faltando'] },
          text: 'Faltava ontem mesmo. Juro. — Ela torce o avental. — Eu acho.',
          gives: null, flag: 'benedita_faca' }
      ]
    }
  },
  rafael: {
    id: 'rafael', name: 'Rafael Lima', role: 'Caseiro e motorista',
    color: '#ffa06b', coat: '#332a22', hair: '#2a2018', scene: 'hall',
    height: 1.02, accessory: 'boots',
    routine: [
      { scene: 'hall', x: 980, act: 'idle', dur: 4000 },
      { scene: 'hall', x: 980, act: 'look', dur: 2500 },
      { scene: 'hall', x: 560, act: 'walk', dur: 0 },
      { scene: 'hall', x: 560, act: 'examine', dur: 3000 },
      { scene: 'cozinha', x: 900, act: 'walk', dur: 0 },
      { scene: 'cozinha', x: 900, act: 'idle', dur: 5000 },
      { scene: 'cozinha', x: 200, act: 'examine', dur: 3000 },
      { scene: 'hall', x: 240, act: 'walk', dur: 0 },
      { scene: 'hall', x: 240, act: 'pace', dur: 4000 }
    ],
    reactions: {
      corrente_cortada: { line: 'Eu não saí. Eu juro que não saí.', mood: 'nervoso', moveTo: 'hall', x: 640 },
      blecaute:         { line: 'Vou ver o gerador. Sozinho. Como sempre.', mood: 'nervoso', moveTo: 'cozinha', x: 1200 },
      tunel_visto:      { line: 'Aquele túnel... eu tranquei. Faz meses.', mood: 'nervoso' }
    },
    talk: {
      intro: 'O caseiro sou eu. Se algo entra ou sai desta casa, sou eu que vejo. E eu não vi nada.',
      topics: [
        { id: 'portao', label: 'Você viu Helena sair?',
          text: 'Vi o carro dela na garagem às seis da manhã. A chave estava na ignição. Ela não ia a pé pra lugar nenhum.',
          gives: null, flag: 'rafael_portao' },
        { id: 'amaro', label: 'Você viu Amaro sair às 23:50?',
          text: 'Vi ele no portão, de casaco, falando no telefone. Voltou dez minutos depois. Sozinho.',
          gives: 'chamada_2352', flag: 'rafael_amaro' },
        { id: 'galpao', label: 'Tem luz no galpão',
          requires: { flags: { galpao_visto: true } },
          text: 'A luz do galpão tem sensor. Se acende, tem gente lá. E não devia ter ninguém.',
          gives: null, flag: 'rafael_galpao' }
      ]
    }
  }
};

/* ---------------------------------------------------------------------------
   EVENTOS DE TEMPO (tensão crescente)
--------------------------------------------------------------------------- */
export const TIMED_EVENTS = [
  { at: 0.85, id: 'primeira_luz', text: 'As lâmpadas do hall tremem. Algo mudou na casa.', sfx: 'thunder' },
  { at: 0.70, id: 'telefone_toca', text: 'O telefone do escritório toca sozinho e ninguém atende.', sfx: 'phone',
    react: { char: 'amaro', line: 'Não atenda.', mood: 'nervoso' } },
  { at: 0.55, id: 'blecaute', text: 'A ENERGIA CAIU. A casa inteira ficou no escuro.', sfx: 'blackout',
    flag: { blecaute: true }, fx: 'shake' },
  { at: 0.40, id: 'passos', text: 'Passos no corredor. Ninguém deveria estar no corredor.', sfx: 'steps' },
  { at: 0.25, id: 'rafael_foge', text: 'Rafael corre para a porta principal. A corrente estala.', sfx: 'metal',
    react: { char: 'rafael', line: 'Eu não fico mais aqui!', mood: 'nervoso' }, fx: 'shake' },
  { at: 0.12, id: 'tempestade', text: 'A tempestade fecha a estrada. Vocês estão presos com eles.', sfx: 'thunder', fx: 'shake' },
  { at: 0.05, id: 'final', text: 'Cinco minutos. A polícia está a caminho — e vai prender quem estiver aqui.', sfx: 'heart', fx: 'shake' }
];

/* ---------------------------------------------------------------------------
   FINAIS
--------------------------------------------------------------------------- */
export const ENDINGS = {
  win: {
    title: 'CASO 47 — ENCERRADO',
    lines: [
      'Cecília Alencar não diz nada. Ela olha para o anel de esmeralda, depois para a escada do porão.',
      'O contrato tinha a assinatura dela. A gravação tinha a voz dela. A faca tinha as iniciais dela.',
      'Amaro ligou às 23:52 — não para a polícia. Ligou para quem podia fazer o corpo desaparecer.',
      'Helena ia embora às 6h15. Faltaram seis horas.',
      'O relógio do hall parou às 23:47 porque caiu. Caiu porque alguém o derrubou ao passar correndo com algo pesado nos braços.'
    ],
    epilogue: 'O relatório de Helena foi publicado três dias depois, com uma nota da redação: “Ela escreveu isso antes de sumir. Nós só terminamos.”'
  },
  lose: {
    title: 'A NOITE ACABOU',
    lines: [
      'A polícia chega e encontra a casa arrumada. Nenhuma prova onde vocês deixaram.',
      'Rafael jura que a corrente sempre esteve cortada. Benedita esqueceu a faca. Tomás não viu nada.',
      'Cecília serve café para todos na manhã seguinte.',
      'O relógio do hall continua parado em 23:47. Ninguém conserta.'
    ],
    epilogue: 'O caso virou uma página pequena no jornal de segunda-feira: “Jornalista desaparecida — buscas encerradas”.'
  }
};

/* ---------------------------------------------------------------------------
   HELPERS usados por servidor e cliente
--------------------------------------------------------------------------- */
export function getObject(sceneId, objId) {
  const s = SCENES[sceneId];
  return s ? s.objects.find(o => o.id === objId) : null;
}

export function sceneUnlocked(sceneId, state) {
  const s = SCENES[sceneId];
  if (!s) return false;
  if (s.id === 'porao') return !!state.flags.porao_aberto;
  if (!s.unlockBy) return true;
  return Object.entries(s.unlockBy.flags || {}).every(([k, v]) => state.flags[k] === v);
}

export function requirementsMet(req, state) {
  if (!req) return true;
  if (req.flags) for (const [k, v] of Object.entries(req.flags)) if (state.flags[k] !== v) return false;
  if (req.not) for (const [k, v] of Object.entries(req.not)) if (state.flags[k] === v) return false;
  if (req.items) for (const it of req.items) if (!state.items.includes(it)) return false;
  if (req.clues) for (const c of req.clues) if (!state.clues.includes(c)) return false;
  return true;
}

export function normalizeAnswer(s) {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function checkPuzzle(puzzleId, input, state) {
  const p = PUZZLES[puzzleId];
  if (!p) return { ok: false, msg: 'Enigma inexistente.' };
  if (p.requires && !requirementsMet(p.requires, state)) return { ok: false, msg: p.lockedText || 'Ainda falta alguma coisa.' };

  switch (p.type) {
    case 'choice':
      return { ok: normalizeAnswer(input) === normalizeAnswer(p.answer) };
    case 'text':
      return { ok: normalizeAnswer(input) === normalizeAnswer(p.answer) };
    case 'symbols': {
      const arr = Array.isArray(input) ? input : [];
      return { ok: arr.length === p.answer.length && arr.every((s, i) => s === p.answer[i]) };
    }
    case 'sync':
      return { ok: true }; // validado pelo efeito de sincronização em applyEffects
    case 'accusation': {
      const a = input || {};
      const ev = (a.evidence || []).slice().sort();
      const need = p.answer.evidence.slice().sort();
      return { ok: a.suspect === p.answer.suspect && need.every(e => ev.includes(e)) };
    }
    default:
      return { ok: false };
  }
}

export const SUSPECT_NAMES = {
  cecilia: 'Cecília Alencar', amaro: 'Dr. Amaro Vasques', tomas: 'Tomás Rocha',
  rafael: 'Rafael Lima', benedita: 'Benedita Souza'
};
