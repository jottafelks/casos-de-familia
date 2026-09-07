/* =============================================================================
   CASO CF-04 — O ÚLTIMO BALANÇO  (tema: empresa)
   Frigorífico Dois Irmãos Ltda., Uberlândia-MG. Domingo à noite.
   Arnaldo Prado, sócio-fundador, foi encontrado morto no próprio escritório,
   ao lado do cofre aberto. Faltam R$ 480 mil do caixa — e a página 14 do
   relatório que ele ia entregar na segunda-feira.

   COMO AS PISTAS FUNCIONAM AQUI: nenhuma aponta um nome. Elas apontam
   CARACTERÍSTICAS (usava graxa industrial, sabia a senha do cofre, ligou do
   ramal do galpão, imprimiu na sexta). Cabe à equipe cruzar o que a cena diz
   com o que cada um admite — e com o que cada um esconde.
   ========================================================================== */

export const EMPRESA = {
  id: 'empresa',
  code: 'CF-04',
  title: 'O ÚLTIMO BALANÇO',
  place: 'FRIGORÍFICO DOIS IRMÃOS LTDA · UBERLÂNDIA — MG',
  date: 'Domingo, 21h40',

  victim: {
    name: 'Arnaldo Prado',
    role: 'sócio-fundador e tesoureiro',
    bio: 'Fundou o frigorífico com o irmão, hoje falecido. Guardava as senhas de cabeça, conferia pessoalmente cada nota fiscal e não confiava em relatório que não tivesse lido duas vezes. Na segunda-feira entregaria a auditoria.'
  },

  briefing: [
    'O Frigorífico Dois Irmãos fecha aos domingos. Só a luz do escritório do sócio ficou acesa.',
    'Às 21h40, o vigilante encontrou Arnaldo Prado caído ao lado do cofre, que estava aberto.',
    'Faltam R$ 480 mil do caixa — e a página 14 do relatório que ele ia entregar na segunda.',
    'Quatro pessoas tinham crachá ativo, o elevador está quebrado desde sábado e a câmera do corredor parou de gravar às 21h12.',
    'Uma delas está mentindo sobre onde estava. Descubra quem — ou quem vocês decidirem culpar.'
  ],

  /* ------------------------------------------------------- características
     As pistas apontam para estas características, nunca para nomes.       */
  traits: {
    cracha: 'Seu crachá registrou entrada no prédio depois das 21h',
    cofre: 'Sabia a combinação do cofre do escritório',
    brigou: 'Teve uma discussão com Arnaldo na sexta-feira',
    canhoto: 'Escreve com a mão esquerda',
    cafe: 'Serviu café para Arnaldo naquela noite',
    planilha: 'É uma das duas pessoas que dominam as fórmulas do relatório',
    graxa: 'Usa sapato com graxa industrial (trabalhou no galpão)',
    ligou: 'Ligou para o ramal da vítima às 20h58',
    imprimiu: 'Foi a última pessoa a usar a impressora na sexta'
  },

  /* ---------------------------------------------------------------- locais */
  locations: [
    {
      id: 'recepcao', name: 'Recepção', short: 'RECEPÇÃO', decor: 'hall',
      ambient: { wall: '#2f3640', floor: '#1e2228', light: '#ffc98a', dust: 0.4 },
      spawn: { x: 640, y: 470 },
      nav: [
        { to: 'copa', x: 0, y: 380, w: 80, h: 220, label: 'Copa' },
        { to: 'reuniao', x: 1200, y: 380, w: 80, h: 220, label: 'Reunião' },
        { to: 'escritorio', x: 520, y: 70, w: 240, h: 130, label: 'Escritório' }
      ],
      objects: [
        {
          id: 'balcao', name: 'Balcão da recepção', prop: 'console', x: 400, y: 380, w: 420, h: 190,
          actions: [
            { id: 'crachas', label: 'Ver o controle de crachás', effects: [{ t: 'clue', id: 'cracha_log' }] },
            { id: 'ponto', label: 'Conferir o relógio de ponto', effects: [{ t: 'clue', id: 'ponto_21h09' }] },
            { id: 'gaveta', label: 'Abrir a gaveta do balcão', effects: [{ t: 'say', text: 'Só formulários antigos e um crachá desativado — o do irmão falecido.' }] }
          ]
        },
        {
          id: 'porta', name: 'Porta principal', prop: 'door_main', x: 1000, y: 200, w: 190, h: 330,
          actions: [
            { id: 'ver', label: 'Examinar a porta', effects: [{ t: 'say', text: 'Trancada por dentro. Quem saiu, saiu por outra porta.' }] },
            { id: 'fechadura', label: 'Testar a fechadura', effects: [{ t: 'clue', id: 'porta_trancada' }] }
          ]
        },
        {
          id: 'cabide', name: 'Cabideiro', prop: 'coatrack', x: 130, y: 250, w: 150, h: 300,
          actions: [
            { id: 'ver', label: 'Ver os casacos', effects: [{ t: 'say', text: 'Três jalecos e uma jaqueta com cheiro de graxa. Nenhum crachá no bolso.' }] }
          ]
        },
        {
          id: 'quadro', name: 'Quadro da inauguração', prop: 'painting', x: 520, y: 180, w: 220, h: 150,
          actions: [
            { id: 'ver', label: 'Olhar a foto', effects: [{ t: 'say', text: '1978. Dois irmãos na porta do frigorífico. Um deles já não está aqui para contar nada.' }] }
          ]
        }
      ]
    },

    {
      id: 'copa', name: 'Copa dos funcionários', short: 'COPA', decor: 'cozinha',
      ambient: { wall: '#3a3f42', floor: '#24282b', light: '#ffd79a', dust: 0.5 },
      spawn: { x: 640, y: 470 },
      nav: [
        { to: 'recepcao', x: 1200, y: 380, w: 80, h: 220, label: 'Recepção' },
        { to: 'reuniao', x: 520, y: 70, w: 240, h: 130, label: 'Reunião' }
      ],
      objects: [
        {
          id: 'pia', name: 'Pia', prop: 'sink', x: 220, y: 330, w: 300, h: 190,
          actions: [
            { id: 'ver', label: 'Olhar a pia', effects: [{ t: 'clue', id: 'xicara' }] },
            { id: 'armario', label: 'Abrir o armário', effects: [{ t: 'say', text: 'Café, açúcar, dois copos a mais do que a escala de domingo explica.' }] }
          ]
        },
        {
          id: 'lixeira', name: 'Lixeira', prop: 'can', x: 640, y: 420, w: 150, h: 210,
          actions: [
            { id: 'ver', label: 'Revirar a lixeira', effects: [{ t: 'clue', id: 'picotadeira' }] },
            { id: 'fundo', label: 'Olhar o fundo', effects: [{ t: 'clue', id: 'luvas' }] }
          ]
        },
        {
          id: 'geladeira', name: 'Geladeira', prop: 'fridge', x: 950, y: 220, w: 190, h: 380,
          actions: [
            { id: 'ver', label: 'Abrir a geladeira', effects: [{ t: 'say', text: 'Marmitas de segunda a sexta. Nada de domingo — ninguém planejava trabalhar hoje.' }] }
          ]
        },
        {
          id: 'calendario', name: 'Calendário de escala', prop: 'calendar', x: 480, y: 130, w: 210, h: 160,
          actions: [
            { id: 'ver', label: 'Ler a escala', effects: [{ t: 'say', text: 'Domingo circulado em vermelho com uma palavra escrita à mão: AUDITORIA.' }] }
          ]
        }
      ]
    },

    {
      id: 'reuniao', name: 'Sala de reunião', short: 'REUNIÃO', decor: 'biblioteca',
      ambient: { wall: '#33393f', floor: '#212529', light: '#ffc27a', dust: 0.6 },
      spawn: { x: 640, y: 470 },
      nav: [
        { to: 'copa', x: 0, y: 380, w: 80, h: 220, label: 'Copa' },
        { to: 'recepcao', x: 1200, y: 380, w: 80, h: 220, label: 'Recepção' },
        { to: 'arquivo', x: 520, y: 70, w: 240, h: 130, label: 'Arquivo' }
      ],
      objects: [
        {
          id: 'mesa', name: 'Mesa de reunião', prop: 'desk_small', x: 380, y: 360, w: 500, h: 210,
          actions: [
            { id: 'ver', label: 'Contar os lugares', effects: [{ t: 'clue', id: 'copo_intocado' }] },
            { id: 'cadeiras', label: 'Ver as cadeiras', effects: [{ t: 'say', text: 'Duas cadeiras fora do lugar — e só uma encostada como quem se levantou rápido.' }] }
          ]
        },
        {
          id: 'quadro', name: 'Quadro branco', prop: 'painting_dark', x: 520, y: 120, w: 300, h: 180,
          actions: [
            { id: 'ver', label: 'Ler o quadro', effects: [{ t: 'say', text: 'Números apagados pela metade. Alguém limpou às pressas — mas a sombra dos números ficou.' }] }
          ]
        },
        {
          id: 'janela', name: 'Janela para o pátio', prop: 'window_night', x: 980, y: 200, w: 220, h: 260,
          actions: [
            { id: 'ver', label: 'Olhar lá fora', effects: [{ t: 'say', text: 'O pátio está molhado. Só um carro na vaga — e não é o de Arnaldo.' }] }
          ]
        }
      ]
    },

    {
      id: 'escritorio', name: 'Escritório do sócio', short: 'ESCRITÓRIO', decor: 'escritorio',
      ambient: { wall: '#3b3128', floor: '#24201c', light: '#ffb46b', dust: 0.7 },
      spawn: { x: 640, y: 500 },
      nav: [
        { to: 'recepcao', x: 0, y: 380, w: 80, h: 220, label: 'Recepção' },
        { to: 'reuniao', x: 1200, y: 380, w: 80, h: 220, label: 'Reunião' }
      ],
      objects: [
        {
          id: 'corpo', name: 'Mesa do sócio', prop: 'desk_drawer', x: 420, y: 380, w: 480, h: 200,
          actions: [
            { id: 'gaveta', label: 'Abrir a gaveta', effects: [{ t: 'clue', id: 'bilhete_letra' }] },
            { id: 'agenda', label: 'Folhear a agenda', effects: [{ t: 'clue', id: 'agenda_rasurada' }] },
            { id: 'chao', label: 'Olhar o chão ao lado', effects: [{ t: 'say', text: 'O corpo caiu virado para o cofre, como quem tentou protegê-lo — ou chegou tarde demais.' }] }
          ]
        },
        {
          id: 'computador', name: 'Computador', prop: 'computer', x: 180, y: 300, w: 210, h: 190,
          actions: [
            { id: 'planilha', label: 'Abrir a planilha', effects: [{ t: 'clue', id: 'formula_atalho' }] },
            { id: 'email', label: 'Ver os rascunhos de e-mail', effects: [{ t: 'clue', id: 'rascunho_email' }] },
            { id: 'fila', label: 'Ver a fila de impressão', effects: [{ t: 'clue', id: 'fila_impressao' }] }
          ]
        },
        {
          id: 'cofre', name: 'Cofre', prop: 'safe', x: 960, y: 250, w: 200, h: 260,
          actions: [
            { id: 'abrir', label: 'Examinar o cofre', effects: [{ t: 'clue', id: 'cofre_aberto' }, { t: 'flag', k: 'porta_servidor', v: true }] },
            { id: 'dentro', label: 'Ver o que ficou dentro', effects: [{ t: 'say', text: 'Notas fiscais antigas e um envelope vazio. O dinheiro saiu em dinheiro, não em transferência.' }] }
          ]
        },
        {
          id: 'relatorio', name: 'Relatório impresso', prop: 'filing', x: 700, y: 150, w: 200, h: 200,
          actions: [
            { id: 'folhear', label: 'Folhear o relatório', effects: [{ t: 'clue', id: 'pagina_14' }] }
          ]
        },
        {
          id: 'telefone', name: 'Telefone do escritório', prop: 'phone', x: 300, y: 520, w: 170, h: 130,
          actions: [
            { id: 'ramal', label: 'Ver as últimas ligações', effects: [{ t: 'clue', id: 'ramal_20h58' }] }
          ]
        }
      ]
    },

    {
      id: 'arquivo', name: 'Arquivo e servidor', short: 'ARQUIVO', decor: 'porao',
      ambient: { wall: '#2b2f33', floor: '#191c1f', light: '#9fd0ff', dust: 0.9 },
      spawn: { x: 640, y: 470 },
      unlockBy: 'porta_servidor',
      lockedText: 'A porta do servidor está trancada. Só abre com a chave que fica no cofre do escritório.',
      nav: [
        { to: 'reuniao', x: 520, y: 610, w: 240, h: 110, label: 'Reunião' }
      ],
      objects: [
        {
          id: 'rack', name: 'Rack do servidor', prop: 'filing', x: 520, y: 260, w: 240, h: 280,
          actions: [
            { id: 'ver', label: 'Encostar a mão no rack', effects: [{ t: 'clue', id: 'servidor_quente' }] }
          ]
        },
        {
          id: 'disjuntor', name: 'Quadro de energia', prop: 'breaker', x: 120, y: 250, w: 180, h: 230,
          actions: [
            { id: 'ver', label: 'Abrir o quadro', effects: [{ t: 'clue', id: 'camera_21h12' }] }
          ]
        },
        {
          id: 'escada', name: 'Escada de serviço', prop: 'tunnel', x: 980, y: 200, w: 220, h: 340,
          actions: [
            { id: 'ver', label: 'Olhar os degraus', effects: [{ t: 'clue', id: 'graxa_escada' }] }
          ]
        },
        {
          id: 'caixas', name: 'Caixas de arquivo morto', prop: 'barrels', x: 300, y: 500, w: 260, h: 170,
          actions: [
            { id: 'ver', label: 'Ver as etiquetas', effects: [{ t: 'say', text: 'Tudo em ordem, menos a caixa de 2019: fora de lugar, com a fita recém-cortada.' }] }
          ]
        }
      ]
    }
  ],

  /* ----------------------------------------------------------------- pistas */
  clues: {
    camera_21h12: { text: 'A câmera do corredor foi desligada às 21h12 e religada às 21h47: 35 minutos sem gravação.', level: 'dificil' },
    cracha_log: { text: 'O controle de crachás mostra quatro acessos entre 21h e 22h — e um deles não tem registro de saída.', level: 'medio', tag: 'cracha' },
    cofre_aberto: { text: 'O cofre estava aberto com a combinação zerada. Quem abriu não precisou forçar nada.', level: 'facil', tag: 'cofre' },
    pagina_14: { text: 'No relatório impresso falta a página 14 — exatamente a do lançamento de R$ 480 mil.', level: 'dificil' },
    xicara: { text: 'Duas xícaras na mesa. Uma tem café pela metade e um comprimido meio dissolvido no fundo.', level: 'medio', tag: 'cafe' },
    formula_atalho: { text: 'A fórmula que esconde o desvio usa um atalho que só duas pessoas desta empresa conhecem.', level: 'dificil', tag: 'planilha' },
    bilhete_letra: { text: 'Bilhete na gaveta: "Domingo, 21h, sozinho." Letra inclinada para a esquerda.', level: 'medio', tag: 'canhoto' },
    elevador: { text: 'O elevador está quebrado desde sábado: quem subiu, subiu pela escada — e a escada range.', level: 'facil' },
    graxa_escada: { text: 'Marcas de sola com graxa industrial sobem a escada e param na porta do escritório.', level: 'dificil', tag: 'graxa' },
    ramal_20h58: { text: 'O telefone do escritório recebeu uma ligação interna às 20h58, vinda do ramal do galpão.', level: 'medio', tag: 'ligou' },
    fila_impressao: { text: 'A fila da impressora guarda um relatório enviado às 21h04 por um computador que só dois usam.', level: 'dificil', tag: 'imprimiu' },
    picotadeira: { text: 'Há papel picado na lixeira da copa — mas a picotadeira está sem energia desde sexta.', level: 'medio' },
    porta_trancada: { text: 'A porta do escritório estava trancada por dentro. Só há uma saída alternativa: pela sala do servidor.', level: 'facil' },
    servidor_quente: { text: 'O servidor estava quente e o nobreak desligado: alguém mexeu no rack depois das 21h30.', level: 'dificil' },
    agenda_rasurada: { text: 'A agenda da vítima tem um nome riscado com tanta força que o papel rasgou.', level: 'medio' },
    luvas: { text: 'Luvas descartáveis no fundo da lixeira, com graxa nas pontas dos dedos.', level: 'dificil', tag: 'graxa' },
    copo_intocado: { text: 'Um copo d\'água intocado do lado do visitante: Arnaldo não ofereceu nada a quem entrou.', level: 'facil' },
    rascunho_email: { text: 'Rascunho de e-mail não enviado: "Se não devolver até segunda, eu conto tudo."', level: 'medio' },
    ponto_21h09: { text: 'O relógio de ponto registra uma batida às 21h09 de alguém que disse ter saído às 20h.', level: 'medio', tag: 'cracha' }
  },

  /* ------------------------------------------------------------------ papéis
     O assassino NÃO é um perfil fixo: é um jogador sorteado a cada partida.
     Estes são os papéis/personas possíveis.                               */
  roles: [
    {
      id: 'filho', label: 'O(a) filho(a) mais velho(a)',
      traits: ['cracha', 'brigou'],
      alibi: 'Diz que passou o domingo em casa, em Uberaba, e chegou só depois das 22h.',
      secret: 'Você assinou um empréstimo de R$ 480 mil no nome da empresa. Arnaldo descobriu na sexta.'
    },
    {
      id: 'contador', label: 'O(a) contador(a)',
      traits: ['planilha', 'imprimiu'],
      alibi: 'Diz que entregou o relatório na sexta à tarde e não voltou ao prédio.',
      secret: 'Você montou a planilha que esconde o desvio — e Arnaldo ia assinar a auditoria na segunda.'
    },
    {
      id: 'gerente', label: 'O(a) gerente de produção',
      traits: ['graxa', 'cofre'],
      alibi: 'Diz que estava no galpão conferindo o estoque e só soube de tudo na segunda.',
      secret: 'Você desviou R$ 480 mil com notas frias de fornecedor — e o relatório de segunda provaria.',
      guilty: true
    },
    {
      id: 'motorista', label: 'O(a) motorista',
      traits: ['ligou', 'graxa'],
      alibi: 'Diz que lavou o caminhão, bateu o ponto às 20h e foi para casa.',
      secret: 'Você levou Arnaldo ao banco na sexta e ouviu a conversa inteira sobre a auditoria.'
    },
    {
      id: 'advogado', label: 'A(o) advogado(a)',
      traits: ['cafe', 'canhoto'],
      alibi: 'Diz que passou no escritório só para deixar um contrato assinado.',
      secret: 'Você preparou a procuração que Arnaldo se recusou a assinar — e foi a última pessoa a vê-lo de pé.'
    },
    {
      id: 'socia', label: 'O(a) sócio(a) minoritário(a)',
      traits: ['cracha', 'planilha'],
      alibi: 'Diz que estava viajando e chegou ao prédio depois das 22h.',
      secret: 'Você descobriu o desvio antes de todos e guardou os extratos — mas nunca contou a ninguém.'
    }
  ],

  /* ------------------------------------------------------------- testemunhas */
  witnesses: [
    {
      id: 'vigia', name: 'Seu Nilton', role: 'Vigilante do turno da noite',
      topics: [
        { id: 'onde', label: 'Onde o senhor estava?', text: 'Na guarita, na portaria. Só subi quando vi a luz do escritório acesa às 21h40.' },
        { id: 'quem', label: 'Quem entrou hoje?', text: 'Quatro crachás. Anotei os horários, mas um deles eu não vi sair — juro que não vi.', gives: 'cracha_log' },
        { id: 'barulho', label: 'Ouviu algum barulho?', text: 'A escada range quando chove. Rangeu umas duas vezes depois das nove. O elevador está parado desde sábado.', gives: 'elevador' }
      ]
    },
    {
      id: 'zeza', name: 'Dona Zeza', role: 'Secretária há 30 anos',
      topics: [
        { id: 'rotina', label: 'Arnaldo costumava trabalhar aos domingos?', text: 'Nunca. Domingo era dia de família. Se ele estava aqui, foi chamado — e ele atendia a qualquer um da família.' },
        { id: 'agenda', label: 'A agenda dele diz alguma coisa?', text: 'Diz. Tinha um nome riscado com tanta raiva que rasgou o papel. Eu vi na sexta.', gives: 'agenda_rasurada' },
        { id: 'cafe', label: 'Quem servia café para ele?', text: 'Ele mesmo. Sempre. Duas xícaras na mesa significa visita — e visita que ele não esperava.', gives: 'xicara' }
      ]
    },
    {
      id: 'ti', name: 'Rafael', role: 'Técnico de TI (meio período)',
      topics: [
        { id: 'camera', label: 'A câmera parou de gravar?', text: 'Parou às 21h12 e voltou às 21h47. Não foi defeito: alguém desligou o disjuntor e tornou a ligar.', gives: 'camera_21h12' },
        { id: 'impressora', label: 'Dá para saber quem imprimiu?', text: 'Dá. A fila guarda tudo: teve um relatório enviado às 21h04 de uma máquina que só dois aqui usam.', gives: 'fila_impressao' },
        { id: 'servidor', label: 'Mexeram no servidor?', text: 'Mexeram. O nobreak estava desligado e o rack, quente. Coisa de quem entrou correndo.', gives: 'servidor_quente' }
      ]
    }
  ],

  /* ------------------------------------------------- objetivos do assassino */
  objectives: [
    { id: 'frame_contador', text: 'FAZER O(A) CONTADOR(A) SER O MAIS VOTADO', hint: 'A planilha é a arma perfeita contra quem entende de planilha.', points: 100, kind: 'frame', target: 'contador' },
    { id: 'frame_motorista', text: 'FAZER O(A) MOTORISTA SER O MAIS VOTADO', hint: 'O ramal do galpão e a batida de ponto às 21h09 contam uma história.', points: 75, kind: 'frame', target: 'motorista' },
    { id: 'hide_pagina', text: 'IMPEÇA QUE ENCONTREM A FALTA DA PÁGINA 14', hint: 'Enquanto ninguém folhear o relatório, a página que falta não faz falta.', points: 75, kind: 'hide', clue: 'pagina_14' },
    { id: 'hide_graxa', text: 'NÃO DEIXE EXAMINAREM A ESCADA DE SERVIÇO', hint: 'A escada só é examinada por quem desconfia do galpão.', points: 50, kind: 'hide', clue: 'graxa_escada' },
    { id: 'two_votes', text: 'CONVENÇA PELO MENOS DUAS PESSOAS A VOTAR EM QUEM VOCÊ QUISER', hint: 'Papos secretos são o seu melhor instrumento.', points: 100, kind: 'two_votes' },
    { id: 'survive_quiet', text: 'SOBREVIVA SEM NUNCA SER CITADO NOS PAPOS SECRETOS', hint: 'Passe despercebido e deixe os outros se acusarem.', points: 75, kind: 'not_whispered' }
  ],

  minEvidence: 6,

  solution: {
    roleId: 'gerente',
    npcKiller: 'vigia',
    reveal: 'A câmera desligada às 21h12, o crachá sem registro de saída, a graxa na escada de serviço e o cofre aberto sem arrombamento: quem matou Arnaldo foi chamado por ele, entrou pela sala do servidor, apagou a gravação, sentou-se do lado errado da mesa e saiu levando a página 14 do relatório.',
    npcReveal: 'Seu Nilton desligou a câmera a pedido de alguém, subiu pela escada de serviço e abriu o cofre com a combinação que ouviu Arnaldo ditar ao telefone. Contava com o elevador quebrado para não ser visto — e esqueceu que a escada range.'
  }
};

export default EMPRESA;
