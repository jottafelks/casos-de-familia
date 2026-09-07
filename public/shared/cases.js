/* =============================================================================
   CASOS DE FAMÍLIA — DADOS DOS CASOS
   -----------------------------------------------------------------------------
   Tudo aqui é declarativo: para criar um caso novo, copie um bloco e preencha.
   Nenhuma regra de jogo mora neste arquivo (as regras ficam em engine.js).

   Estrutura de um caso:
     briefing   → telas de introdução (com botão CONTINUAR)
     victim     → quem morreu
     locations  → locais navegáveis (salas), cada um com objetos investigáveis
     clues      → textos das pistas (sutis; NUNCA dizem "fulano é o assassino")
     traits     → características que uma pista pode apontar
     roles      → identidades secretas distribuídas entre os jogadores
                  (exatamente uma tem guilty: true — a do assassino)
     witnesses  → personagens controlados pelo jogo (depoimentos, álibis)
     objectives → objetivos secundários do assassino (verificáveis)
     solution   → solução (usada no modo solo e na revelação final)
   ========================================================================== */

export const CASE_VERSION = 3;

const AMB = {
  hall:    { wall: '#3d342b', floor: '#26211b', light: '#ffb46b', dust: 0.5 },
  lib:     { wall: '#33313c', floor: '#221f28', light: '#ffc27a', dust: 0.7 },
  kitchen: { wall: '#3a3a36', floor: '#242320', light: '#ffd08a', dust: 0.3 },
  office:  { wall: '#2f3946', floor: '#1e242c', light: '#9fc4ff', dust: 0.4 },
  cellar:  { wall: '#2b2b2b', floor: '#1a1a1a', light: '#8fd0ff', dust: 0.9 },
  barn:    { wall: '#4a3a22', floor: '#2e2415', light: '#ffcf7a', dust: 1.0 },
  yard:    { wall: '#2c3a2c', floor: '#1f2a1f', light: '#bfe6a0', dust: 0.6 },
  lobby:   { wall: '#3b3a3f', floor: '#26252a', light: '#ffcf9a', dust: 0.4 },
  room:    { wall: '#3f3540', floor: '#282231', light: '#ffb9a0', dust: 0.5 }
};

/* ------------------------------------------------------------------ CASO 1 */
const MANSAO = {
  id: 'mansao',
  code: 'CF-01',
  title: 'A NOITE DE HELENA',
  place: 'MANSÃO ALENCAR · VAZANTE — MG',
  date: '14 DE SETEMBRO · 23h47',
  victim: {
    name: 'Helena Alencar',
    role: 'Herdeira e sócia-fundadora da Lavra Vazante',
    bio: 'Encontrada no escritório, com a porta trancada por dentro. O relógio de pêndulo do hall parou às 23:47.'
  },
  briefing: [
    'VAZANTE — MG. Chuva desde o início da noite. A estrada de terra que leva à Mansão Alencar virou lama: ninguém saiu, ninguém entrou.',
    'Às 23:47 o relógio de pêndulo do hall parou. No mesmo minuto, Helena Alencar caiu morta no escritório — a porta trancada por dentro.',
    'Seis pessoas estavam na casa. Todas conheciam Helena. Todas tinham um motivo. Nenhuma admite ter saído do próprio quarto.',
    'Vocês são a equipe de investigação. Um de vocês, porém, não está aqui para ajudar: um de vocês é o assassino — e vai mentir, desviar e plantar dúvida até o último segundo.',
    'Explorem a casa. Juntem pistas. Conversem. E descubram quem, entre vocês, matou Helena Alencar.'
  ],
  locations: [
    {
      id: 'hall', name: 'Hall de entrada', short: 'HALL', decor: 'hall',
      ambient: AMB.hall, spawn: { x: 640, y: 470 },
      nav: [
        { to: 'biblioteca', x: 1140, y: 570, w: 130, h: 140, label: 'Biblioteca' },
        { to: 'cozinha', x: 0, y: 430, w: 74, h: 200, label: 'Cozinha' },
        { to: 'escritorio', x: 540, y: 120, w: 200, h: 210, label: 'Escritório' }
      ],
      objects: [
        {
          id: 'relogio', name: 'Relógio de pêndulo', prop: 'clock',
          x: 176, y: 236, w: 108, h: 300,
          actions: [
            { id: 'ver', label: 'Examinar o mostrador', effects: [{ t: 'clue', id: 'hora_parada' }, { t: 'sfx', id: 'tick' }] },
            { id: 'abrir', label: 'Abrir a porta de vidro', effects: [{ t: 'clue', id: 'bilhete_relogio' }, { t: 'sfx', id: 'creak' }] }
          ]
        },
        {
          id: 'cabideiro', name: 'Cabideiro', prop: 'coatrack',
          x: 520, y: 300, w: 120, h: 240,
          actions: [
            { id: 'ver', label: 'Revistar casacos', effects: [{ t: 'clue', id: 'perfume_casaco' }] },
            { id: 'bolsos', label: 'Verificar bolsos', effects: [{ t: 'clue', id: 'recibo_luva' }] }
          ]
        },
        {
          id: 'tapete', name: 'Tapete da entrada', prop: 'rug',
          x: 700, y: 560, w: 320, h: 120,
          actions: [
            { id: 'ver', label: 'Levantar o tapete', effects: [{ t: 'clue', id: 'pegadas_barro' }] },
            { id: 'cheirar', label: 'Sentir o tecido', effects: [{ t: 'nothing', text: 'Só cheiro de chuva e cera de madeira.' }] }
          ]
        },
        {
          id: 'quadro', name: 'Retrato da família', prop: 'painting',
          x: 900, y: 180, w: 200, h: 160,
          actions: [
            { id: 'ver', label: 'Examinar o retrato', effects: [{ t: 'clue', id: 'retrato_riscado' }] },
            { id: 'tras', label: 'Olhar atrás da moldura', effects: [{ t: 'clue', id: 'apelido_lena' }] }
          ]
        },
        {
          id: 'porta', name: 'Porta principal', prop: 'door_main',
          x: 60, y: 200, w: 130, h: 300,
          actions: [
            { id: 'ver', label: 'Testar a fechadura', effects: [{ t: 'clue', id: 'porta_trancada' }] }
          ]
        }
      ]
    },
    {
      id: 'biblioteca', name: 'Biblioteca', short: 'BIBLIOTECA', decor: 'biblioteca',
      ambient: AMB.lib, spawn: { x: 640, y: 500 },
      nav: [
        { to: 'hall', x: 0, y: 430, w: 74, h: 200, label: 'Hall' },
        { to: 'escritorio', x: 1150, y: 430, w: 130, h: 200, label: 'Escritório' }
      ],
      objects: [
        {
          id: 'estante', name: 'Estante de livros', prop: 'bookshelf',
          x: 300, y: 150, w: 420, h: 330,
          actions: [
            { id: 'ver', label: 'Examinar lombadas', effects: [{ t: 'clue', id: 'livro_fora_lugar' }] },
            { id: 'puxar', label: 'Puxar o livro torto', effects: [{ t: 'clue', id: 'bilhete_livro' }, { t: 'sfx', id: 'creak' }] }
          ]
        },
        {
          id: 'lareira', name: 'Lareira', prop: 'fireplace',
          x: 760, y: 250, w: 260, h: 240,
          actions: [
            { id: 'cinzas', label: 'Remexer as cinzas', effects: [{ t: 'clue', id: 'papel_queimado' }] }
          ]
        },
        {
          id: 'poltrona', name: 'Poltrona e janela', prop: 'armchair',
          x: 120, y: 480, w: 220, h: 180,
          actions: [
            { id: 'ver', label: 'Procurar entre as almofadas', effects: [{ t: 'clue', id: 'fio_cabelo' }] },
            { id: 'janela', label: 'Olhar a janela', effects: [{ t: 'clue', id: 'janela_aberta' }] }
          ]
        },
        {
          id: 'vitrola', name: 'Vitrola', prop: 'recordplayer',
          x: 980, y: 500, w: 160, h: 140,
          actions: [
            { id: 'ver', label: 'Ver o disco', effects: [{ t: 'clue', id: 'disco_riscado' }] }
          ]
        }
      ]
    },
    {
      id: 'cozinha', name: 'Cozinha', short: 'COZINHA', decor: 'cozinha',
      ambient: AMB.kitchen, spawn: { x: 640, y: 500 },
      nav: [
        { to: 'hall', x: 1150, y: 430, w: 130, h: 200, label: 'Hall' },
        { to: 'porao', x: 540, y: 640, w: 200, h: 80, label: 'Porão', requires: { flags: { porao_aberto: true } } }
      ],
      objects: [
        {
          id: 'faca', name: 'Faca no chão', prop: 'knife_floor',
          x: 420, y: 600, w: 150, h: 60,
          actions: [
            { id: 'ver', label: 'Examinar a faca', effects: [{ t: 'clue', id: 'faca_pegada' }] },
            { id: 'cabo', label: 'Olhar o cabo', effects: [{ t: 'clue', id: 'faca_marca' }] }
          ]
        },
        {
          id: 'lata', name: 'Lata de café', prop: 'can',
          x: 800, y: 300, w: 90, h: 130,
          actions: [
            { id: 'abrir', label: 'Abrir a lata', effects: [{ t: 'clue', id: 'lata_chave' }] }
          ]
        },
        {
          id: 'despensa', name: 'Despensa', prop: 'pantry',
          x: 120, y: 220, w: 220, h: 300,
          actions: [
            { id: 'ver', label: 'Organizar prateleiras', effects: [{ t: 'clue', id: 'copo_extra' }] }
          ]
        },
        {
          id: 'pia', name: 'Pia', prop: 'sink',
          x: 980, y: 380, w: 200, h: 160,
          actions: [
            { id: 'ver', label: 'Olhar o ralo', effects: [{ t: 'clue', id: 'ralo_mancha' }] }
          ]
        }
      ]
    },
    {
      id: 'escritorio', name: 'Escritório', short: 'ESCRITÓRIO', decor: 'escritorio',
      ambient: AMB.office, spawn: { x: 640, y: 500 },
      nav: [
        { to: 'hall', x: 0, y: 430, w: 74, h: 200, label: 'Hall' },
        { to: 'biblioteca', x: 1150, y: 430, w: 130, h: 200, label: 'Biblioteca' }
      ],
      objects: [
        {
          id: 'corpo', name: 'Local do corpo', prop: 'rug',
          x: 520, y: 480, w: 300, h: 170,
          actions: [
            { id: 'ver', label: 'Examinar a cena', effects: [{ t: 'clue', id: 'corpo_posicao' }, { t: 'sfx', id: 'thud' }] },
            { id: 'maos', label: 'Olhar as mãos da vítima', effects: [{ t: 'clue', id: 'unha_sangue' }] }
          ]
        },
        {
          id: 'computador', name: 'Computador', prop: 'computer',
          x: 180, y: 320, w: 220, h: 180,
          actions: [
            { id: 'ver', label: 'Ligar a tela', effects: [{ t: 'clue', id: 'email_noite' }] }
          ]
        },
        {
          id: 'cofre', name: 'Cofre', prop: 'safe',
          x: 980, y: 280, w: 190, h: 220,
          actions: [
            { id: 'ver', label: 'Examinar o cofre', effects: [{ t: 'clue', id: 'cofre_fechado' }] }
          ]
        },
        {
          id: 'gaveta', name: 'Gaveta da mesa', prop: 'desk_drawer',
          x: 700, y: 400, w: 200, h: 120,
          actions: [
            { id: 'abrir', label: 'Abrir a gaveta', effects: [{ t: 'clue', id: 'gravador_sumido' }] }
          ]
        }
      ]
    },
    {
      id: 'porao', name: 'Porão', short: 'PORÃO', decor: 'porao',
      ambient: AMB.cellar, spawn: { x: 640, y: 500 }, locked: true,
      lockedText: 'A porta do porão está trancada por dentro. Alguém a abriu por outra passagem.',
      unlockBy: 'porao_aberto',
      nav: [{ to: 'cozinha', x: 540, y: 100, w: 200, h: 90, label: 'Cozinha' }],
      objects: [
        {
          id: 'barris', name: 'Barris de vinho', prop: 'barrels',
          x: 180, y: 300, w: 260, h: 260,
          actions: [
            { id: 'ver', label: 'Mover os barris', effects: [{ t: 'clue', id: 'botas_escondidas' }] }
          ]
        },
        {
          id: 'quadro_forca', name: 'Quadro de força', prop: 'breaker',
          x: 900, y: 250, w: 120, h: 200,
          actions: [
            { id: 'ver', label: 'Ler a etiqueta', effects: [{ t: 'clue', id: 'energia_queda' }] }
          ]
        }
      ]
    }
  ],
  traits: {
    terra_botas: 'Usa botas de jardim (terra vermelha presa no solado)',
    chegou_tarde: 'Chegou na mansão depois das 22h',
    conhecia_apelido: 'Chamava a vítima pelo apelido de infância',
    tinha_chave: 'Tinha acesso à chave do escritório',
    brigou: 'Teve uma discussão com a vítima naquela noite',
    canhoto: 'Escreve com a mão esquerda',
    perfume: 'Usa perfume adocicado e marcante',
    sangue_manga: 'A manga da camisa tinha um rasgo recente'
  },
  clues: {
    hora_parada: { text: 'O pêndulo parou às 23:47 — travado, não foi vento. Alguém o segurou com a mão.', level: 'medio', tag: null },
    bilhete_relogio: { text: 'Dentro do relógio, um bilhete dobrado: "Às 23, no escritório. Sem testemunhas." Letra inclinada para a esquerda.', level: 'dificil', tag: 'canhoto' },
    perfume_casaco: { text: 'Um dos casacos ainda está úmido de chuva — e com cheiro forte de perfume doce.', level: 'medio', tag: 'perfume' },
    recibo_luva: { text: 'Recibo de farmácia às 21:12, no bolso de um casaco: gaze, álcool e luvas descartáveis.', level: 'dificil', tag: null },
    pegadas_barro: { text: 'Marcas de bota na madeira: terra vermelha do jardim, indo da porta de serviço até a escada. Solado número 41.', level: 'facil', tag: 'terra_botas' },
    retrato_riscado: { text: 'O retrato da família tem o rosto de Helena riscado por cima — com algo pontudo e recente.', level: 'medio', tag: null },
    apelido_lena: { text: 'Atrás da moldura, uma inscrição antiga: "Lena, 1989". Só quem cresceu com ela usava esse nome.', level: 'dificil', tag: 'conhecia_apelido' },
    porta_trancada: { text: 'A porta principal está trancada por dentro desde as 20h. Ninguém entrou ou saiu por aqui.', level: 'facil', tag: null },
    livro_fora_lugar: { text: 'Um livro da estante está torto, fora do alinhamento — foi puxado às pressas.', level: 'facil', tag: null },
    bilhete_livro: { text: 'Dentro do livro torto: "Você me deve isso desde a lavra. Ou eu conto tudo."', level: 'dificil', tag: null },
    papel_queimado: { text: 'Resto de papel queimado na lareira. Dá para ler três palavras: "lavra", "testamento" e "nunca mais".', level: 'medio', tag: null },
    fio_cabelo: { text: 'Um fio de cabelo preso na poltrona — não é da vítima. É curto e escuro.', level: 'medio', tag: null },
    janela_aberta: { text: 'A janela da biblioteca tem o trinco forçado. Só que a lama do lado de fora está intacta: ninguém passou por ali.', level: 'dificil', tag: null },
    disco_riscado: { text: 'A vitrola parou no mesmo disco há horas, riscando. A música tocou a noite toda — deve ter coberto um barulho.', level: 'medio', tag: null },
    faca_pegada: { text: 'A lâmina tem marcas de dois dedos, polegar e indicador — mas nenhuma digital. Alguém limpou.', level: 'medio', tag: null },
    faca_marca: { text: 'O cabo da faca tem uma marca de unha esmalteada, em vermelho.', level: 'dificil', tag: null },
    lata_chave: { text: 'Dentro da lata de café: um molho de chaves com uma etiqueta "E" — a do escritório.', level: 'dificil', tag: 'tinha_chave' },
    copo_extra: { text: 'Havia cinco copos na pia. Quatro limpos, um com batom e vinho pela metade.', level: 'medio', tag: null },
    ralo_mancha: { text: 'O ralo tem resíduo escuro — alguém lavou as mãos aqui com pressa, há poucas horas.', level: 'medio', tag: null },
    corpo_posicao: { text: 'Helena caiu de frente para a mesa, com a mão direita estendida. Não parece que ela estava escrevendo: parece que alcançava algo.', level: 'facil', tag: null },
    unha_sangue: { text: 'Sob a unha do indicador direito, pele e sangue de outra pessoa. Ela arranhou quem a atacou.', level: 'dificil', tag: 'sangue_manga' },
    email_noite: { text: 'Último e-mail lido às 22:58: "Precisamos conversar. Amanhã conto tudo à polícia."', level: 'medio', tag: null },
    cofre_fechado: { text: 'O cofre está fechado — e o papel carbono da última abertura mostra que foi aberto às 22h40.', level: 'dificil', tag: 'tinha_chave' },
    gravador_sumido: { text: 'Na gaveta, o espaço onde ficava um gravador — e a marca de poeira mostra que ele saiu hoje.', level: 'dificil', tag: null },
    botas_escondidas: { text: 'Atrás dos barris: um par de botas com terra vermelha, escondido às pressas e ainda úmido.', level: 'facil', tag: 'terra_botas' },
    energia_queda: { text: 'O disjuntor geral foi desligado à mão às 23:45 — e religado dois minutos depois.', level: 'dificil', tag: null }
  },
  roles: [
    { id: 'herdeiro', label: 'O(a) herdeiro(a)', traits: ['terra_botas', 'brigou'], guilty: true,
      alibi: 'Diz que dormia no quarto do segundo andar.',
      secret: 'Você discutiu com Helena às 22h sobre o testamento — e esteve no jardim na chuva. Você a matou.' },
    { id: 'socio', label: 'O(a) sócio(a) da lavra', traits: ['tinha_chave', 'chegou_tarde'],
      alibi: 'Diz que chegou às 22h10 e foi direto para a cozinha.',
      secret: 'Você copiou a chave do escritório na semana passada. Não conta isso a ninguém.' },
    { id: 'enfermeiro', label: 'O(a) enfermeiro(a)', traits: ['chegou_tarde', 'sangue_manga'],
      alibi: 'Diz que preparava o remédio da noite na cozinha.',
      secret: 'A manga da sua camisa rasgou hoje. Se perguntarem, você diz que foi na porta do quarto.' },
    { id: 'caseiro', label: 'O(a) caseiro(a)', traits: ['terra_botas', 'conhecia_apelido'],
      alibi: 'Diz que trancou as portas às 20h e foi para a casa dos fundos.',
      secret: 'Você cresceu com Helena e a chamava de Lena. Suas botas estão sujas de terra — mas você trabalha no jardim.' },
    { id: 'advogado', label: 'O(a) advogado(a)', traits: ['canhoto', 'perfume'],
      alibi: 'Diz que revisava documentos na biblioteca até tarde.',
      secret: 'Você escreve com a mão esquerda — e seu perfume é inconfundível.' },
    { id: 'jornalista', label: 'O(a) jornalista', traits: ['perfume', 'conhecia_apelido'],
      alibi: 'Diz que fazia anotações no quarto de hóspedes.',
      secret: 'Você investigava a lavra há meses e sabia o apelido de Helena. Estava aqui a trabalho.' }
  ],
  witnesses: [
    {
      id: 'cecilia', name: 'Cecília Alencar', role: 'Irmã da vítima',
      topics: [
        { id: 'onde', label: 'Onde você estava?', text: 'Na sala de música, ouvindo a vitrola. A casa inteira ouviu aquele disco riscando a noite toda.' },
        { id: 'helena', label: 'Helena tinha inimigos?', text: 'A lavra rendeu dinheiro e inimizade. Mas quem ganha com a morte dela está nesta casa agora.', gives: 'retrato_riscado' },
        { id: 'testamento', label: 'Sobre o testamento', text: 'Foi alterado em agosto. Helena não contou a ninguém o que mudou — e alguém aqui ficou furioso com isso.' }
      ]
    },
    {
      id: 'amaro', name: 'Amaro Dias', role: 'Caseiro',
      topics: [
        { id: 'portas', label: 'As portas estavam trancadas?', text: 'Tranquei tudo às vinte horas. A da frente continuava trancada por dentro quando a polícia chegou.' },
        { id: 'porao', label: 'E o porão?', text: 'A chave do porão fica na cozinha. Mas tem a passagem do jardim, por fora — a terra lá é vermelha, gruda na sola.', gives: 'pegadas_barro' },
        { id: 'terra', label: 'Você viu terra na casa?', text: 'Teve gente que reparou nas marcas. Eu lavei o chão de manhã, mas de noite elas voltaram.' }
      ]
    },
    {
      id: 'tomas', name: 'Tomás Prado', role: 'Noivo da vítima',
      topics: [
        { id: 'noite', label: 'Como foi a noite?', text: 'Jantamos às oito. Helena saiu da mesa nervosa depois de uma ligação. Não voltou.' },
        { id: 'ligacao', label: 'Quem ligou?', text: 'Ela não disse. Só falou "isso não fica assim" e subiu. O relógio do hall bateu quando ela subia.', gives: 'email_noite' },
        { id: 'desconfiou', label: 'De quem você desconfia?', text: 'De quem chegou tarde e de quem sabia onde o testamento estava guardado.' }
      ]
    },
    {
      id: 'benedita', name: 'Benedita Rocha', role: 'Cozinheira',
      topics: [
        { id: 'copos', label: 'Quantos estavam na mesa?', text: 'Seis lugares, cinco copos na pia. Alguém não bebeu — ou levou o copo embora.' },
        { id: 'chave', label: 'Onde ficam as chaves?', text: 'Penduradas no hall. A do escritório some e aparece. Hoje ela apareceu dentro de uma lata, imagina.', gives: 'lata_chave' },
        { id: 'barulho', label: 'Ouviu algum barulho?', text: 'A vitrola tocava alto. Mas às onze e quarenta e cinco a luz piscou e a música parou de repente.' }
      ]
    }
  ],
  objectives: [
    { id: 'frame_caseiro', text: 'FAZER O(A) CASEIRO(A) SER O MAIS VOTADO', hint: 'As botas com terra são dele(a). Use isso.', points: 100, kind: 'frame', target: 'caseiro' },
    { id: 'hide_bilhete', text: 'IMPEÇA QUE ENCONTREM O BILHETE DO RELÓGIO', hint: 'Ninguém precisa abrir a porta de vidro do relógio.', points: 50, kind: 'hide', clue: 'bilhete_relogio' },
    { id: 'hide_botas', text: 'NÃO DEIXE DESCOBRIREM AS BOTAS NO PORÃO', hint: 'O porão fica trancado se ninguém achar a passagem.', points: 50, kind: 'hide', clue: 'botas_escondidas' },
    { id: 'two_votes', text: 'CONVENÇA PELO MENOS DUAS PESSOAS A VOTAR EM QUEM VOCÊ QUISER', hint: 'Papos secretos são o seu melhor instrumento.', points: 100, kind: 'two_votes' },
    { id: 'survive_quiet', text: 'SOBREVIVA SEM NUNCA SER CITADO NOS PAPOS SECRETOS', hint: 'Passe despercebido e deixe os outros se acusarem.', points: 75, kind: 'not_whispered' }
  ],
  solution: {
    roleId: 'herdeiro',
    npcKiller: 'cecilia',
    reveal: 'A discussão às 22h, as botas com terra do jardim escondidas no porão e o bilhete com letra canhota: quem matou Helena entrou pela porta de serviço, apagou a luz às 23:45, cometeu o crime às 23:47 e voltou para o quarto como se nada tivesse acontecido.',
    npcReveal: 'Cecília alterou o testamento com a ajuda do advogado, desligou a energia para abrir o cofre e usou a lata de café para guardar a chave. Ela contava com a chuva para apagar os rastros.'
  },
  minEvidence: 6
};

/* ------------------------------------------------------------------ CASO 2 */
const FAZENDA = {
  id: 'fazenda',
  code: 'CF-02',
  title: 'O SILÊNCIO DA VARGEM ALTA',
  place: 'FAZENDA VARGEM ALTA · GOIÁS',
  date: '2 DE MARÇO · 04h12',
  victim: {
    name: 'Otávio Vargem',
    role: 'Patrão da fazenda',
    bio: 'Encontrado no curral ao amanhecer. A porta do escritório estava arrombada e o cofre, vazio.'
  },
  briefing: [
    'VARGEM ALTA — GO. A noite estava quente e sem vento quando o gerente encontrou Otávio Vargem caído no curral, ao lado do portão aberto.',
    'O cofre do escritório foi esvaziado. Os cães não latiram — o que só acontece quando conhecem quem chega.',
    'Seis pessoas dormiam na sede. Todas acordaram depois do fato. Todas juram não ter ouvido nada.',
    'Nesta investigação, um de vocês não está do seu lado: o assassino vai mentir sobre onde estava e sobre o que viu.',
    'Reúnam provas, comparem versões e decidam em quem confiar antes que o sol esquente demais.'
  ],
  locations: [
    {
      id: 'alpendre', name: 'Alpendre', short: 'ALPENDRE', decor: 'hall',
      ambient: AMB.yard, spawn: { x: 640, y: 470 },
      nav: [
        { to: 'sede', x: 1100, y: 520, w: 150, h: 160, label: 'Casa sede' },
        { to: 'celeiro', x: 0, y: 430, w: 90, h: 200, label: 'Celeiro' }
      ],
      objects: [
        {
          id: 'redes', name: 'Redes de descanso', prop: 'armchair',
          x: 300, y: 420, w: 260, h: 170,
          actions: [
            { id: 'ver', label: 'Verificar as redes', effects: [{ t: 'clue', id: 'rede_quente' }] }
          ]
        },
        {
          id: 'lamparina', name: 'Lamparina', prop: 'lamp',
          x: 800, y: 300, w: 100, h: 160,
          actions: [
            { id: 'ver', label: 'Examinar a lamparina', effects: [{ t: 'clue', id: 'querosene' }] }
          ]
        },
        {
          id: 'botas', name: 'Botas na entrada', prop: 'barrels',
          x: 950, y: 520, w: 180, h: 150,
          actions: [
            { id: 'ver', label: 'Comparar os pares', effects: [{ t: 'clue', id: 'par_faltando' }] }
          ]
        }
      ]
    },
    {
      id: 'sede', name: 'Casa sede', short: 'SEDE', decor: 'biblioteca',
      ambient: AMB.lib, spawn: { x: 640, y: 500 },
      nav: [
        { to: 'alpendre', x: 0, y: 430, w: 90, h: 200, label: 'Alpendre' },
        { to: 'escritorio_fazenda', x: 1150, y: 430, w: 130, h: 200, label: 'Escritório' }
      ],
      objects: [
        {
          id: 'mesa', name: 'Mesa de jantar', prop: 'desk_small',
          x: 420, y: 380, w: 340, h: 180,
          actions: [
            { id: 'ver', label: 'Contar os lugares', effects: [{ t: 'clue', id: 'lugar_vazio' }] }
          ]
        },
        {
          id: 'radio', name: 'Rádio da fazenda', prop: 'radio',
          x: 120, y: 300, w: 160, h: 140,
          actions: [
            { id: 'ver', label: 'Sintonizar', effects: [{ t: 'clue', id: 'radio_horario' }] }
          ]
        },
        {
          id: 'armario', name: 'Armário de armas', prop: 'filing',
          x: 980, y: 250, w: 150, h: 280,
          actions: [
            { id: 'ver', label: 'Conferir as armas', effects: [{ t: 'clue', id: 'arma_limpa' }] }
          ]
        }
      ]
    },
    {
      id: 'celeiro', name: 'Celeiro', short: 'CELEIRO', decor: 'porao',
      ambient: AMB.barn, spawn: { x: 640, y: 500 },
      nav: [
        { to: 'alpendre', x: 1150, y: 430, w: 130, h: 200, label: 'Alpendre' },
        { to: 'curral', x: 540, y: 640, w: 200, h: 80, label: 'Curral' }
      ],
      objects: [
        {
          id: 'fardos', name: 'Fardos de feno', prop: 'barrels',
          x: 220, y: 320, w: 280, h: 260,
          actions: [
            { id: 'ver', label: 'Revirar o feno', effects: [{ t: 'clue', id: 'feno_sangue' }] }
          ]
        },
        {
          id: 'corda', name: 'Cordas e arreios', prop: 'coatrack',
          x: 820, y: 280, w: 160, h: 260,
          actions: [
            { id: 'ver', label: 'Examinar os arreios', effects: [{ t: 'clue', id: 'corda_cortada' }] }
          ]
        },
        {
          id: 'lata_combustivel', name: 'Latas de combustível', prop: 'can',
          x: 1030, y: 520, w: 110, h: 130,
          actions: [
            { id: 'ver', label: 'Cheirar as latas', effects: [{ t: 'clue', id: 'querosene' }] }
          ]
        }
      ]
    },
    {
      id: 'escritorio_fazenda', name: 'Escritório', short: 'ESCRITÓRIO', decor: 'escritorio',
      ambient: AMB.office, spawn: { x: 640, y: 500 },
      nav: [{ to: 'sede', x: 0, y: 430, w: 90, h: 200, label: 'Sede' }],
      objects: [
        {
          id: 'cofre_fazenda', name: 'Cofre arrombado', prop: 'safe',
          x: 900, y: 260, w: 200, h: 230,
          actions: [
            { id: 'ver', label: 'Examinar o cofre', effects: [{ t: 'clue', id: 'cofre_sem_arrombamento' }] }
          ]
        },
        {
          id: 'agenda', name: 'Agenda do patrão', prop: 'calendar',
          x: 300, y: 320, w: 180, h: 160,
          actions: [
            { id: 'ver', label: 'Folhear a agenda', effects: [{ t: 'clue', id: 'agenda_ultima' }] }
          ]
        },
        {
          id: 'janela_escritorio', name: 'Janela dos fundos', prop: 'window_night',
          x: 620, y: 120, w: 200, h: 150,
          actions: [
            { id: 'ver', label: 'Olhar o batente', effects: [{ t: 'clue', id: 'janela_fechada' }] }
          ]
        }
      ]
    },
    {
      id: 'curral', name: 'Curral', short: 'CURRAL', decor: 'hall',
      ambient: AMB.yard, spawn: { x: 640, y: 500 },
      nav: [{ to: 'celeiro', x: 540, y: 100, w: 200, h: 90, label: 'Celeiro' }],
      objects: [
        {
          id: 'portao', name: 'Portão aberto', prop: 'door_main',
          x: 560, y: 240, w: 200, h: 300,
          actions: [
            { id: 'ver', label: 'Examinar o portão', effects: [{ t: 'clue', id: 'portao_sem_forca' }] }
          ]
        },
        {
          id: 'chao', name: 'Chão de terra', prop: 'rug',
          x: 300, y: 560, w: 380, h: 130,
          actions: [
            { id: 'ver', label: 'Procurar pegadas', effects: [{ t: 'clue', id: 'pegadas_curral' }] }
          ]
        },
        {
          id: 'caes', name: 'Cachorros', prop: 'suitcase',
          x: 900, y: 480, w: 180, h: 150,
          actions: [
            { id: 'ver', label: 'Observar os cães', effects: [{ t: 'clue', id: 'caes_calmos' }] }
          ]
        }
      ]
    }
  ],
  traits: {
    conhece_senha: 'Sabia a senha do cofre',
    sem_barro: 'Não tem barro nas botas (não saiu na chuva)',
    acordou_cedo: 'Já estava de pé antes das 4h',
    cortou_corda: 'Teve acesso à faca do celeiro',
    mancha_ferrugem: 'Tem mancha de ferrugem na roupa',
    discutiu_pagamento: 'Estava com pagamento atrasado',
    cachorros_conhecem: 'Os cães conhecem essa pessoa e não latem',
    mentiu_horario: 'Disse uma hora diferente da que o rádio registrou'
  },
  clues: {
    rede_quente: { text: 'Uma das redes ainda guarda o calor do corpo — alguém se levantou dali há poucos minutos.', level: 'medio', tag: 'acordou_cedo' },
    querosene: { text: 'Cheiro de querosene nas mãos de quem mexeu na lamparina. Mancha de ferrugem no pavio.', level: 'medio', tag: 'mancha_ferrugem' },
    par_faltando: { text: 'Falta um par de botas no cabideiro. As que sobraram estão lambuzadas de barro da chuva.', level: 'facil', tag: 'sem_barro' },
    lugar_vazio: { text: 'Seis lugares na mesa, cinco pratos sujos. Um lugar estava ocupado, mas ninguém comeu ali.', level: 'medio', tag: null },
    radio_horario: { text: 'O rádio ficou ligado a noite toda e gravou o boletim das 03h40 — dá para ouvir vozes ao fundo.', level: 'dificil', tag: 'mentiu_horario' },
    arma_limpa: { text: 'A espingarda do armário foi limpa recentemente. Mas não foi disparada — o cano está frio.', level: 'medio', tag: null },
    feno_sangue: { text: 'O feno do canto tem gotas escuras, ainda úmidas. Alguém se cortou ali antes de ir ao curral.', level: 'dificil', tag: 'cortou_corda' },
    corda_cortada: { text: 'Um pedaço de corda foi cortado com lâmina reta — e a faca do celeiro foi lavada às pressas.', level: 'medio', tag: 'cortou_corda' },
    cofre_sem_arrombamento: { text: 'O cofre não foi arrombado: foi aberto com a senha. Só três pessoas a conheciam.', level: 'dificil', tag: 'conhece_senha' },
    agenda_ultima: { text: 'Na agenda, um compromisso às 04h: "encontro no curral". Letra de Otávio, sem nome.', level: 'facil', tag: null },
    janela_fechada: { text: 'A janela dos fundos está fechada por dentro, com o trinco empoeirado: ninguém passou por ela.', level: 'facil', tag: null },
    portao_sem_forca: { text: 'O portão do curral não foi forçado. Foi aberto com calma, e depois deixado assim.', level: 'facil', tag: null },
    pegadas_curral: { text: 'Pegadas de bota sem barro vão do celeiro até o corpo e voltam para a sede.', level: 'facil', tag: 'sem_barro' },
    caes_calmos: { text: 'Os cães nem latiram. Eles só ficam quietos assim quando reconhecem quem chega.', level: 'medio', tag: 'cachorros_conhecem' }
  },
  roles: [
    { id: 'gerente', label: 'O(a) gerente', traits: ['conhece_senha', 'sem_barro'], guilty: true,
      alibi: 'Diz que dormia na sede e acordou com o grito do vaqueiro.',
      secret: 'Você sabia a senha do cofre e suas botas estão limpas porque você não saiu na chuva: você foi ao curral.' },
    { id: 'vaqueiro', label: 'O(a) vaqueiro(a)', traits: ['cachorros_conhecem', 'acordou_cedo'],
      alibi: 'Diz que foi o primeiro a chegar ao curral, às 4h.',
      secret: 'Você estava de pé antes de todos — e os cães nunca latem para você.' },
    { id: 'cozinheira', label: 'A(o) cozinheira(o)', traits: ['acordou_cedo', 'mancha_ferrugem'],
      alibi: 'Diz que acendia o fogão de lenha quando ouviu o alvoroço.',
      secret: 'Você consertou a lamparina ontem e sua manga ficou com ferrugem.' },
    { id: 'sobrinha', label: 'A(o) sobrinha(o)', traits: ['conhece_senha', 'mentiu_horario'],
      alibi: 'Diz que chegou da cidade às 23h, mas ninguém viu o carro.',
      secret: 'Você mentiu sobre a hora em que chegou — e Otávio tinha lhe dado a senha do cofre.' },
    { id: 'veterinario', label: 'O(a) veterinário(a)', traits: ['cortou_corda', 'sem_barro'],
      alibi: 'Diz que atendia uma égua no celeiro a noite toda.',
      secret: 'A faca do celeiro é sua. E suas botas estavam secas porque você ficou dentro.' },
    { id: 'caseiro_fazenda', label: 'O(a) caseiro(a) da fazenda', traits: ['cachorros_conhecem', 'discutiu_pagamento'],
      alibi: 'Diz que rondava a sede quando o gerente gritou.',
      secret: 'Você estava com o pagamento atrasado há três meses e discutiu com Otávio naquela tarde.' }
  ],
  witnesses: [
    {
      id: 'dona_neri', name: 'Dona Neri', role: 'Cozinheira da sede',
      topics: [
        { id: 'noite', label: 'Alguém acordou na sede?', text: 'A rede do alpendre rangeu de madrugada. Quem estava nela levantou antes do galo cantar.' },
        { id: 'cofre', label: 'Quem sabia a senha?', text: 'O gerente, a sobrinha e o próprio Otávio. Mais ninguém. Pelo menos era o que ele dizia.', gives: 'cofre_sem_arrombamento' },
        { id: 'caes', label: 'E os cães?', text: 'Não latiram. Aquilo me assustou mais que o corpo.' }
      ]
    },
    {
      id: 'ze_paulo', name: 'Zé Paulo', role: 'Vaqueiro',
      topics: [
        { id: 'corpo', label: 'Como você encontrou o corpo?', text: 'Fui abrir o curral de manhã. O portão já estava aberto, escancarado, e ele estava caído do lado de dentro.' },
        { id: 'noite', label: 'Ouviu alguma coisa?', text: 'Os cães ficaram mudos a noite inteira. Só estranho late para quem não conhece.' },
        { id: 'desconfiou', label: 'De quem você desconfia?', text: 'De quem não tem barro nas botas. Choveu até as duas da manhã.', gives: 'pegadas_curral' }
      ]
    },
    {
      id: 'doutor_vieira', name: 'Dr. Vieira', role: 'Veterinário',
      topics: [
        { id: 'celeiro', label: 'Você usou a faca do celeiro?', text: 'Usei ontem para cortar corda. Guardei lavada. Se apareceu suja, não fui eu que deixei.' },
        { id: 'hora', label: 'A que horas você chegou?', text: 'Antes da chuva. Pergunte ao rádio: ele fica ligado e grava tudo.', gives: 'radio_horario' },
        { id: 'senha', label: 'Sabia a senha do cofre?', text: 'Nunca soube, e nunca quis saber.' }
      ]
    }
  ],
  objectives: [
    { id: 'frame_vet', text: 'FAZER O(A) VETERINÁRIO(A) SER O MAIS VOTADO', hint: 'A faca do celeiro é dele(a).', points: 100, kind: 'frame', target: 'veterinario' },
    { id: 'hide_feno', text: 'IMPEÇA QUE ENCONTREM SANGUE NO FENO', hint: 'Ninguém revira fardo sem motivo.', points: 50, kind: 'hide', clue: 'feno_sangue' },
    { id: 'hide_radio', text: 'NÃO DEIXE NINGUÉM SINTONIZAR O RÁDIO', hint: 'A gravação derruba álibis.', points: 50, kind: 'hide', clue: 'radio_horario' },
    { id: 'two_votes', text: 'CONVENÇA DUAS PESSOAS A VOTAR COM VOCÊ', hint: 'Use os papos secretos.', points: 100, kind: 'two_votes' },
    { id: 'survive_quiet', text: 'SOBREVIVA SEM SER CITADO NOS PAPOS SECRETOS', hint: 'Silêncio também é estratégia.', points: 75, kind: 'not_whispered' }
  ],
  solution: {
    roleId: 'gerente',
    npcKiller: 'doutor_vieira',
    reveal: 'O cofre foi aberto com senha, as pegadas sem barro iam do celeiro ao curral e o encontro estava marcado na agenda às 4h: quem matou Otávio abriu o cofre e deixou o portão aberto para encenar uma invasão.',
    npcReveal: 'Dr. Vieira cortou a corda e feriu a mão no feno: ele foi ao curral para cobrar o pagamento, discutiu e deixou Otávio cair. A faca lavada foi o seu erro.'
  },
  minEvidence: 6
};

/* ------------------------------------------------------------------ CASO 3 */
const HOTEL = {
  id: 'hotel',
  code: 'CF-03',
  title: 'O HÓSPEDE DO 12',
  place: 'HOTEL BEIRA-RIO · PORTO SEGURO — BA',
  date: '30 DE DEZEMBRO · 01h26',
  victim: {
    name: 'Marina Costa',
    role: 'Hóspede do quarto 12',
    bio: 'Encontrada pela camareira na manhã do dia 30. A porta estava trancada por dentro e a chave, sobre a cômoda.'
  },
  briefing: [
    'PORTO SEGURO — BA. Réveillon, hotel lotado, chuva no deque e música alta no salão até tarde.',
    'Marina Costa foi encontrada no quarto 12 de manhã. Porta trancada por dentro, chave sobre a cômoda, janela fechada.',
    'Seis pessoas estavam no hotel naquela noite e todas circulavam pelos mesmos corredores.',
    'Um de vocês é o assassino — e vai usar o barulho, a festa e os depoimentos dos funcionários para se proteger.',
    'Descubram o que cada um fazia enquanto a cidade soltava fogos.'
  ],
  locations: [
    {
      id: 'recepcao', name: 'Recepção', short: 'RECEPÇÃO', decor: 'hall',
      ambient: AMB.lobby, spawn: { x: 640, y: 470 },
      nav: [
        { to: 'quarto12', x: 1120, y: 200, w: 140, h: 200, label: 'Quarto 12' },
        { to: 'restaurante', x: 0, y: 430, w: 90, h: 200, label: 'Restaurante' },
        { to: 'lavanderia', x: 540, y: 640, w: 200, h: 80, label: 'Lavanderia' }
      ],
      objects: [
        {
          id: 'balcao', name: 'Balcão da recepção', prop: 'desk_small',
          x: 300, y: 380, w: 380, h: 180,
          actions: [
            { id: 'ver', label: 'Pedir o registro de entradas', effects: [{ t: 'clue', id: 'livro_entradas' }] }
          ]
        },
        {
          id: 'cameras', name: 'Monitor das câmeras', prop: 'console',
          x: 860, y: 300, w: 200, h: 160,
          actions: [
            { id: 'ver', label: 'Rever as imagens', effects: [{ t: 'clue', id: 'camera_corredor' }] }
          ]
        },
        {
          id: 'chaves', name: 'Painel de chaves', prop: 'coatrack',
          x: 120, y: 250, w: 120, h: 260,
          actions: [
            { id: 'ver', label: 'Conferir as chaves', effects: [{ t: 'clue', id: 'chave_duplicada' }] }
          ]
        }
      ]
    },
    {
      id: 'quarto12', name: 'Quarto 12', short: 'QUARTO 12', decor: 'biblioteca',
      ambient: AMB.room, spawn: { x: 640, y: 500 },
      nav: [{ to: 'recepcao', x: 0, y: 430, w: 90, h: 200, label: 'Recepção' }],
      objects: [
        {
          id: 'cama', name: 'Cama desfeita', prop: 'armchair',
          x: 380, y: 400, w: 340, h: 180,
          actions: [
            { id: 'ver', label: 'Examinar a cama', effects: [{ t: 'clue', id: 'cama_intocada' }] }
          ]
        },
        {
          id: 'comoda', name: 'Cômoda', prop: 'drawer_console',
          x: 820, y: 330, w: 200, h: 180,
          actions: [
            { id: 'ver', label: 'Abrir as gavetas', effects: [{ t: 'clue', id: 'chave_comoda' }] },
            { id: 'celular', label: 'Procurar o celular', effects: [{ t: 'clue', id: 'celular_mensagens' }] }
          ]
        },
        {
          id: 'varanda_q12', name: 'Varanda', prop: 'window_night',
          x: 120, y: 180, w: 180, h: 180,
          actions: [
            { id: 'ver', label: 'Olhar a grade', effects: [{ t: 'clue', id: 'varanda_fechada' }] }
          ]
        },
        {
          id: 'copo12', name: 'Copo e garrafa', prop: 'whiskey',
          x: 620, y: 240, w: 120, h: 130,
          actions: [
            { id: 'ver', label: 'Examinar o copo', effects: [{ t: 'clue', id: 'copo_dormir' }] }
          ]
        }
      ]
    },
    {
      id: 'restaurante', name: 'Restaurante', short: 'RESTAURANTE', decor: 'cozinha',
      ambient: AMB.kitchen, spawn: { x: 640, y: 500 },
      nav: [{ to: 'recepcao', x: 1150, y: 430, w: 130, h: 200, label: 'Recepção' }],
      objects: [
        {
          id: 'mesa_festa', name: 'Mesa da ceia', prop: 'desk_small',
          x: 420, y: 380, w: 360, h: 180,
          actions: [
            { id: 'ver', label: 'Ver o mapa de mesa', effects: [{ t: 'clue', id: 'lugar_marina' }] }
          ]
        },
        {
          id: 'geladeira', name: 'Geladeira do bar', prop: 'fridge',
          x: 140, y: 260, w: 170, h: 280,
          actions: [
            { id: 'ver', label: 'Conferir as bebidas', effects: [{ t: 'clue', id: 'garrafa_extra' }] }
          ]
        },
        {
          id: 'nota_fiscal', name: 'Comandas da noite', prop: 'calendar',
          x: 880, y: 320, w: 170, h: 150,
          actions: [
            { id: 'ver', label: 'Ler as comandas', effects: [{ t: 'clue', id: 'comanda_hora' }] }
          ]
        }
      ]
    },
    {
      id: 'lavanderia', name: 'Lavanderia', short: 'LAVANDERIA', decor: 'porao',
      ambient: AMB.cellar, spawn: { x: 640, y: 500 },
      nav: [{ to: 'recepcao', x: 540, y: 100, w: 200, h: 90, label: 'Recepção' }],
      objects: [
        {
          id: 'cesto', name: 'Cesto de roupas', prop: 'suitcase',
          x: 300, y: 420, w: 240, h: 180,
          actions: [
            { id: 'ver', label: 'Revirar o cesto', effects: [{ t: 'clue', id: 'toalha_manchada' }] }
          ]
        },
        {
          id: 'maquina', name: 'Máquina de lavar', prop: 'breaker',
          x: 780, y: 280, w: 200, h: 240,
          actions: [
            { id: 'ver', label: 'Abrir o tambor', effects: [{ t: 'clue', id: 'camisa_lavada' }] }
          ]
        }
      ]
    }
  ],
  traits: {
    tinha_duplicata: 'Tinha uma chave extra do quarto 12',
    saiu_festa: 'Saiu da ceia antes da meia-noite',
    bebeu_com: 'Bebeu com a vítima naquela noite',
    lavou_roupa: 'Usou a lavanderia durante a madrugada',
    conhecia_quarto: 'Sabia de cor o número do quarto dela',
    mensagem_apagada: 'Mandou mensagem para a vítima e apagou',
    usou_crachá: 'Passou o crachá no corredor de madrugada',
    sem_fogos: 'Estava dentro do hotel quando os fogos começaram'
  },
  clues: {
    livro_entradas: { text: 'O registro mostra um nome riscado e reescrito por cima — alguém se registrou duas vezes na mesma noite.', level: 'dificil', tag: null },
    camera_corredor: { text: 'A câmera do 2º andar mostra alguém entrando no 12 às 00:52. A imagem não mostra o rosto, mas mostra uma camisa clara.', level: 'facil', tag: 'usou_cracha' },
    chave_duplicada: { text: 'Falta uma chave no painel — a do quarto 12. Ela não está com a vítima nem com a camareira.', level: 'facil', tag: 'tinha_duplicata' },
    cama_intocada: { text: 'A cama está arrumada do lado de quem dorme. Marina não se deitou: ela estava de saída.', level: 'medio', tag: null },
    chave_comoda: { text: 'A chave do quarto está sobre a cômoda — mas a fechadura é daquelas que trancam por fora também.', level: 'dificil', tag: null },
    celular_mensagens: { text: 'A última conversa do celular foi apagada, mas a nuvem guardou o aviso: "preciso falar com você agora".', level: 'dificil', tag: 'mensagem_apagada' },
    varanda_fechada: { text: 'A grade da varanda está intacta e empoeirada. Ninguém entrou por ali.', level: 'facil', tag: null },
    copo_dormir: { text: 'O copo tem resíduo de um sedativo — e a garrafa de vinho da vítima está intacta, ainda lacrada.', level: 'dificil', tag: null },
    lugar_marina: { text: 'O lugar de Marina na ceia ficou vazio a partir das 23h30. Ninguém notou na hora.', level: 'medio', tag: 'saiu_festa' },
    garrafa_extra: { text: 'Duas taças foram servidas, mas só uma comanda registrada. Alguém bebeu sem pagar — e sem ser visto.', level: 'medio', tag: 'bebeu_com' },
    comanda_hora: { text: 'A comanda da mesa 4 foi fechada às 00h40 — e alguém pediu café forte para levar ao quarto.', level: 'dificil', tag: null },
    toalha_manchada: { text: 'Uma toalha no cesto tem mancha avermelhada lavada pela metade, às pressas.', level: 'medio', tag: 'lavou_roupa' },
    camisa_lavada: { text: 'Dentro da máquina, uma camisa clara passando por um ciclo rápido às 3h da manhã.', level: 'facil', tag: 'lavou_roupa' }
  },
  roles: [
    { id: 'recepcionista', label: 'O(a) recepcionista', traits: ['tinha_duplicata', 'usou_cracha'], guilty: true,
      alibi: 'Diz que ficou no balcão até o fim do plantão.',
      secret: 'Você tem a chave extra do 12 e seu crachá foi registrado no segundo andar às 00:52.' },
    { id: 'garcom', label: 'O(a) garçom/garçonete', traits: ['bebeu_com', 'lavou_roupa'],
      alibi: 'Diz que serviu a ceia e foi dormir no alojamento.',
      secret: 'Você levou café ao quarto 12 e lavou uma camisa de madrugada na lavanderia.' },
    { id: 'hospede_13', label: 'O(a) hóspede do 13', traits: ['saiu_festa', 'sem_fogos'],
      alibi: 'Diz que voltou para o quarto antes da meia-noite.',
      secret: 'Você saiu da ceia às 23h30, pouco depois de Marina.' },
    { id: 'camareira', label: 'A(o) camareira(o)', traits: ['conhecia_quarto', 'lavou_roupa'],
      alibi: 'Diz que só entrou no 12 de manhã, para arrumar.',
      secret: 'Você sabe de cor qual era o quarto dela — e usou a lavanderia de madrugada.' },
    { id: 'seguranca', label: 'O(a) segurança', traits: ['usou_cracha', 'sem_fogos'],
      alibi: 'Diz que rondava o deque na hora dos fogos.',
      secret: 'Seu crachá aparece no corredor de madrugada, e você estava dentro quando os fogos começaram.' },
    { id: 'amiga_viagem', label: 'O(a) amigo(a) de viagem', traits: ['mensagem_apagada', 'bebeu_com'],
      alibi: 'Diz que estava no salão quando os fogos começaram.',
      secret: 'Você apagou a última mensagem que mandou para Marina — e bebeu com ela na ceia.' }
  ],
  witnesses: [
    {
      id: 'gerente_hotel', name: 'Seu Nilton', role: 'Gerente do hotel',
      topics: [
        { id: 'chaves', label: 'Quantas chaves existem do 12?', text: 'Duas. Uma fica no painel, outra é do serviço. A do serviço sumiu na semana passada.', gives: 'chave_duplicada' },
        { id: 'camera', label: 'As câmeras gravam tudo?', text: 'O corredor, sim. Mas o ângulo do 12 pega as costas de quem entra. A camareira pode confirmar o resto.' },
        { id: 'noite', label: 'O hotel estava cheio?', text: 'Lotado. Com festa e fogos, ninguém nota uma porta abrindo.' }
      ]
    },
    {
      id: 'camareira_np', name: 'Dona Zeza', role: 'Camareira',
      topics: [
        { id: 'quarto', label: 'Como estava o quarto?', text: 'Trancado por dentro. A chave estava em cima da cômoda, limpinha. Estranho: ela sempre guardava na bolsa.' },
        { id: 'lavanderia', label: 'Alguém usou a lavanderia?', text: 'Teve máquina rodando de madrugada. Ciclo rápido, coisa de quem tem pressa.', gives: 'camisa_lavada' },
        { id: 'desconfiou', label: 'De quem você desconfia?', text: 'De quem sabia o número do quarto sem precisar perguntar.' }
      ]
    },
    {
      id: 'barman', name: 'Barman do hotel',
      topics: [
        { id: 'ceia', label: 'Quem bebeu com Marina?', text: 'Servi duas taças na mesa quatro. Só uma entrou na comanda.' },
        { id: 'cafe', label: 'Alguém pediu café de madrugada?', text: 'Pediram, sim. Café forte para levar ao quarto doze. Não lembro quem buscou.', gives: 'comanda_hora' },
        { id: 'fogos', label: 'Onde você estava nos fogos?', text: 'Aqui no bar. Quem estava no deque não ouviu nada do que aconteceu no segundo andar.' }
      ]
    }
  ],
  objectives: [
    { id: 'frame_camareira', text: 'FAZER A(O) CAMAREIRA(O) SER O MAIS VOTADO', hint: 'Ela sabia o quarto e usou a lavanderia.', points: 100, kind: 'frame', target: 'camareira' },
    { id: 'hide_camisa', text: 'IMPEÇA QUE ENCONTREM A CAMISA NA MÁQUINA', hint: 'O tambor é o primeiro lugar onde se procura.', points: 50, kind: 'hide', clue: 'camisa_lavada' },
    { id: 'hide_camera', text: 'NÃO DEIXE NINGUÉM VER AS CÂMERAS DO CORREDOR', hint: 'O monitor fica bem à vista na recepção.', points: 50, kind: 'hide', clue: 'camera_corredor' },
    { id: 'two_votes', text: 'CONVENÇA DUAS PESSOAS A VOTAR COM VOCÊ', hint: 'Papo secreto é onde a mentira convence.', points: 100, kind: 'two_votes' },
    { id: 'survive_quiet', text: 'SOBREVIVA SEM SER CITADO NOS PAPOS SECRETOS', hint: 'Deixe que os outros se acusem.', points: 75, kind: 'not_whispered' }
  ],
  solution: {
    roleId: 'recepcionista',
    npcKiller: 'gerente_hotel',
    reveal: 'A chave de serviço sumida, o crachá no corredor às 00:52 e a camisa clara lavada às 3h: quem matou entrou no quarto 12 com a chave extra, deixou a chave sobre a cômoda e trancou a porta por fora.',
    npcReveal: 'Seu Nilton tinha a chave de serviço, serviu o café com sedativo e usou a lavanderia para apagar o próprio rastro: contava com o barulho dos fogos.'
  },
  minEvidence: 6
};

export const CASES = [MANSAO, FAZENDA, HOTEL];

export function getCase(id) {
  return CASES.find(c => c.id === id) || CASES[0];
}

/** Local de um caso (com o caso já resolvido). */
export function getLocation(CASE, id) {
  return (CASE.locations || []).find(l => l.id === id) || CASE.locations[0];
}

export function getObject(CASE, scene, objId) {
  const l = getLocation(CASE, scene);
  return (l?.objects || []).find(o => o.id === objId) || null;
}

export function getClue(CASE, id) {
  const c = CASE.clues[id];
  if (!c) return null;
  return { ...c, id };
}

export function getWitness(CASE, id) {
  return (CASE.witnesses || []).find(w => w.id === id) || null;
}

export const DEFAULT_CASE_ID = 'mansao';
