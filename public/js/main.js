const socket = (typeof io !== 'undefined') ? io() : { on:()=>{}, emit:()=>{} };

let moedas = 50;
let inventario = [];
let audioAtivo = false;
let chovendo = false;
let modoConstrucao = false;
let modoApagarAtivo = false;
let chatVisivel = true;
let corBlocoAtual = 0x38bdf8;
let velocidadeBaseJogador = 0.18;

// --- SISTEMA DE VEÍCULO ---
let noVeiculo = false;
let carroGroup = null;
let velocidadeCarro = 0;
let anguloDirecaoCarro = 0;
let luzesFarol = [];

// --- SISTEMA DE LOJA E ITENS ---
let temLanterna = false;
let luzLanterna = null;

// --- SISTEMA DE MISSÕES ---
let missaoAtiva = null;

// --- FÍSICA DE PULO DO JOGADOR ---
let emPulo = false;
let velocidadeY = 0;
const gravidade = -0.018;
const forcaPulo = 0.38;

// --- SISTEMA DE COLISÕES ---
const caixasColisao = [];

function registrarObjetoSolido(xMin, xMax, zMin, zMax) {
  caixasColisao.push({ xMin, xMax, zMin, zMax });
}

function checarColisao(novoX, novoZ, raio = 0.5) {
  for (const box of caixasColisao) {
    if (
      novoX + raio > box.xMin &&
      novoX - raio < box.xMax &&
      novoZ + raio > box.zMin &&
      novoZ - raio < box.zMax
    ) {
      return true;
    }
  }
  return false;
}

// --- SINTETIZADOR DE ÁUDIO ---
let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function toggleAudio() {
  initAudio();
  audioAtivo = !audioAtivo;
  document.getElementById('audioStatus').innerText = audioAtivo ? 'ON' : 'OFF';
  if (audioAtivo) tocarMúsicaAmbiente();
}

function tocarSomPasso() {
  if (!audioAtivo || !audioCtx || emPulo || noVeiculo) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.08);
}

function tocarSomPulo() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function tocarSomMoeda() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(987.77, audioCtx.currentTime);
  osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.25);
}

function tocarSomBloco() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.12);
}

function tocarSomQuebrarBloco() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function tocarMúsicaAmbiente() {
  if (!audioAtivo || !audioCtx) return;
  const notas = [261.63, 293.66, 329.63, 392.00, 440.00];
  let i = 0;
  setInterval(() => {
    if (!audioAtivo) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(notas[i % notas.length], audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 1.2);
    i++;
  }, 1600);
}

function falarVozNavegador(texto) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

function toggleChatPanel() {
  chatVisivel = !chatVisivel;
  const wrapper = document.getElementById('chat-wrapper');
  const btn = document.getElementById('toggle-chat-btn');
  if (wrapper && btn) {
    if (chatVisivel) {
      wrapper.classList.remove('recolhido');
      btn.innerText = '👁️ Ocultar Chat';
    } else {
      wrapper.classList.add('recolhido');
      btn.innerText = '💬 Abrir Chat';
    }
  }
}

function selecionarCor(corHex, btnEl) {
  corBlocoAtual = corHex;
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  if (btnEl) btnEl.classList.add('selected');
}

function toggleModoApagar() {
  modoApagarAtivo = !modoApagarAtivo;
  const btn = document.getElementById('btn-modo-apagar');
  if (btn) {
    if (modoApagarAtivo) {
      btn.innerText = '🔴 Modo: Apagar';
      btn.style.background = '#e11d48';
    } else {
      btn.innerText = '🟢 Modo: Criar';
      btn.style.background = '#10b981';
    }
  }
}

// --- THREE.JS CENA ---
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();

const corDia = new THREE.Color(0x38bdf8);
const corNoite = new THREE.Color(0x030712);
scene.background = corDia.clone();
scene.fog = new THREE.FogExp2(0x38bdf8, 0.002);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2500);
camera.position.set(-30, 28, 57);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

if (container) {
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
}

renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

// CONTROLES DE CÂMERA
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.03;
controls.rotateSpeed = 0.3;
controls.maxPolarAngle = Math.PI / 2 - 0.03;

// ILUMINAÇÃO
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff5ea, 1.2);
sunLight.position.set(100, 150, 100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
scene.add(sunLight);

const luzesPostes = [];
function criarPosteLuz(x, z) {
  const g = new THREE.Group();
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
  poste.position.y = 2.75; poste.castShadow = true; g.add(poste);

  const topo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  topo.position.y = 5.6; g.add(topo);

  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  bulb.position.y = 5.3; g.add(bulb);

  const pointLight = new THREE.PointLight(0xfef08a, 0, 18);
  pointLight.position.set(0, 5.2, 0); g.add(pointLight);
  luzesPostes.push(pointLight);

  g.position.set(x, 0, z);
  scene.add(g);
  registrarObjetoSolido(x - 0.4, x + 0.4, z - 0.4, z + 0.4);
}

for (let x = -160; x <= 160; x += 40) {
  criarPosteLuz(x, -9);
  criarPosteLuz(x, 9);
}

// TERRENO
const floorGeo = new THREE.PlaneGeometry(450, 450);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.9 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

// AVENIDA PRINCIPAL
const ruaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
const avenidaPrincipal = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), ruaMat);
avenidaPrincipal.rotation.x = -Math.PI / 2; avenidaPrincipal.position.set(0, 0.02, 0);
avenidaPrincipal.receiveShadow = true; scene.add(avenidaPrincipal);

const faixaCentral = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.4), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
faixaCentral.rotation.x = -Math.PI / 2; faixaCentral.position.set(0, 0.03, 0); scene.add(faixaCentral);

function criarPlacaIdentificacao(x, z, corCaixa, corPlaca, eVertical = false) {
  const g = new THREE.Group();
  const haste = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.5, 0.2), new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }));
  haste.position.y = 1.25; g.add(haste);

  const correio = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 1.0), new THREE.MeshStandardMaterial({ color: corCaixa, roughness: 0.4 }));
  correio.position.set(0, 2.3, 0); g.add(correio);

  const placaGeo = eVertical ? new THREE.BoxGeometry(0.2, 0.9, 2.8) : new THREE.BoxGeometry(2.8, 0.9, 0.2);
  const placa = new THREE.Mesh(placaGeo, new THREE.MeshStandardMaterial({ color: corPlaca, roughness: 0.3 }));
  placa.position.set(0, 3.1, 0); g.add(placa);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
}

function criarArvoreVoxel(x, z) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 }));
  tronco.position.y = 2; tronco.castShadow = true; g.add(tronco);

  const folhaMat = new THREE.MeshStandardMaterial({ color: 0x1e5128, roughness: 0.7 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 3.5), folhaMat); f1.position.y = 4; f1.castShadow = true; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), folhaMat); f2.position.y = 5.5; f2.castShadow = true; g.add(f2);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
}

[
  [-140, -45], [-70, -45], [70, -45], [140, -45],
  [-140, 45], [-70, 45], [70, 45], [140, 45]
].forEach(p => criarArvoreVoxel(p[0], p[1]));

const pontos3D = {
  padaria: { x: -80, z: -22 },
  igreja: { x: 0, z: -28 },
  farmacia: { x: 80, z: -22 },
  boteco: { x: -80, z: 22 },
  minhaCasa: { x: -30, z: 25 },
  casaRoxa: { x: 60, z: 22 },
  praca: { x: 0, z: 22 }
};

function criarPadariaDetalhada(x, z) {
  const g = new THREE.Group();
  const matCalçada = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
  const matMadeira = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });

  const calcada = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), matCalçada);
  calcada.position.y = 0.15; calcada.receiveShadow = true; g.add(calcada);

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.8), matParede);
  paredeFundo.position.set(0, 3.1, -5.5); g.add(paredeFundo);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeEsq.position.set(-6.5, 3.1, 0); g.add(paredeEsq);
  const paredeDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeDir.position.set(6.5, 3.1, 0); g.add(paredeDir);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 13), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
  telhado.position.y = 6.6; g.add(telhado);

  const vitrineVidro = new THREE.Mesh(new THREE.BoxGeometry(12, 4, 0.3), matVidro);
  vitrineVidro.position.set(0, 2.2, 5.2); g.add(vitrineVidro);

  const balcao = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 2), matMadeira);
  balcao.position.set(0, 1.1, 1); g.add(balcao);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 6, z + 6);
  criarPlacaIdentificacao(x + 6, z + 8, 0xd97706, 0xfacc15, false);
}

function criarBotecoDetalhado(x, z) {
  const g = new THREE.Group();
  const matCalçada = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
  const matBalcao = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.5 });
  const matSinuca = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });

  const calcada = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), matCalçada);
  calcada.position.y = 0.15; calcada.receiveShadow = true; g.add(calcada);

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.8), matParede);
  paredeFundo.position.set(0, 3.1, 5.5); g.add(paredeFundo);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeEsq.position.set(-6.5, 3.1, 0); g.add(paredeEsq);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 13), new THREE.MeshStandardMaterial({ color: 0x1f2937 }));
  telhado.position.y = 6.6; g.add(telhado);

  const balcaoL1 = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 1.5), matBalcao);
  balcaoL1.position.set(-1, 1.1, 2); g.add(balcaoL1);

  const mesaSinuca = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.4, 5), matSinuca);
  mesaSinuca.position.set(2.5, 0.8, -2); g.add(mesaSinuca);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 6, z + 6);
  criarPlacaIdentificacao(x - 6, z - 8, 0x854d0e, 0xf59e0b, false);
}

function criarFarmaciaDetalhada(x, z) {
  const g = new THREE.Group();
  const matCalçada = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.5 });
  const matBalcao = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  const matCruz = new THREE.MeshBasicMaterial({ color: 0x22c55e });

  const calcada = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), matCalçada);
  calcada.position.y = 0.15; calcada.receiveShadow = true; g.add(calcada);

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.8), matParede);
  paredeFundo.position.set(0, 3.1, -5.5); g.add(paredeFundo);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeEsq.position.set(-6.5, 3.1, 0); g.add(paredeEsq);

  const cruzH = new THREE.Mesh(new THREE.BoxGeometry(3, 0.8, 0.3), matCruz);
  cruzH.position.set(0, 5.0, 5.7); g.add(cruzH);
  const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3, 0.3), matCruz);
  cruzV.position.set(0, 5.0, 5.7); g.add(cruzV);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 13), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  telhado.position.y = 6.6; g.add(telhado);

  const balcao = new THREE.Mesh(new THREE.BoxGeometry(8, 2, 1.5), matBalcao);
  balcao.position.set(-1, 1.1, 0); g.add(balcao);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 6, z + 6);
  criarPlacaIdentificacao(x + 6, z + 8, 0xdb2777, 0x22c55e, false);
}

function criarCasaRoxaMorador(x, z) {
  const g = new THREE.Group();
  const matCalçada = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.6 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 });

  const calcada = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), matCalçada);
  calcada.position.y = 0.15; calcada.receiveShadow = true; g.add(calcada);

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.8), matParede);
  paredeFundo.position.set(0, 3.1, 5.5); g.add(paredeFundo);
  const paredeDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeDir.position.set(6.5, 3.1, 0); g.add(paredeDir);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeEsq.position.set(-6.5, 3.1, 0); g.add(paredeEsq);

  const telhado = new THREE.Mesh(new THREE.ConeGeometry(10, 5, 4), matTelhado);
  telhado.position.y = 8.5; telhado.rotation.y = Math.PI / 4; g.add(telhado);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 6, z + 6);
  criarPlacaIdentificacao(x + 6, z - 8, 0x4f46e5, 0xf8fafc, false);
}

function criarMinhaCasa(x, z) {
  const g = new THREE.Group();
  const matCalçada = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 });

  const calcada = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 14), matCalçada);
  calcada.position.y = 0.15; calcada.receiveShadow = true; g.add(calcada);

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.8), matParede);
  paredeFundo.position.set(0, 3.1, 5.5); g.add(paredeFundo);
  const paredeDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeDir.position.set(6.5, 3.1, 0); g.add(paredeDir);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 11), matParede);
  paredeEsq.position.set(-6.5, 3.1, 0); g.add(paredeEsq);

  const paredeFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6, 0.8), matParede);
  paredeFrenteEsq.position.set(-4.5, 3.1, -5.5); g.add(paredeFrenteEsq);
  const paredeFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6, 0.8), matParede);
  paredeFrenteDir.position.set(4.5, 3.1, -5.5); g.add(paredeFrenteDir);

  const telhado = new THREE.Mesh(new THREE.ConeGeometry(11, 5, 4), matTelhado);
  telhado.position.y = 8.5; telhado.rotation.y = Math.PI / 4; g.add(telhado);

  const sofa = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 2), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
  sofa.position.set(-3, 0.6, 2); g.add(sofa);
  const cama = new THREE.Mesh(new THREE.BoxGeometry(4, 0.8, 5), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
  cama.position.set(3, 0.5, 2); g.add(cama);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 6, z + 6);
  criarPlacaIdentificacao(x + 5, z - 8, 0x0284c7, 0xfacc15, false);
}

function criarIgrejaVoxel(x, z) {
  const g = new THREE.Group();
  const matParede = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.5 });
  const matCruz = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
  const matPorta = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });

  const paredeFundo = new THREE.Mesh(new THREE.BoxGeometry(14, 9, 0.8), matParede);
  paredeFundo.position.set(0, 4.5, -7.5); g.add(paredeFundo);
  const paredeEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 15), matParede);
  paredeEsq.position.set(-6.5, 4.5, 0); g.add(paredeEsq);
  const paredeDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 9, 15), matParede);
  paredeDir.position.set(6.5, 4.5, 0); g.add(paredeDir);

  const paredeFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(4.5, 9, 0.8), matParede);
  paredeFrenteEsq.position.set(-4.5, 4.5, 7.5); g.add(paredeFrenteEsq);
  const paredeFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(4.5, 9, 0.8), matParede);
  paredeFrenteDir.position.set(4.5, 4.5, 7.5); g.add(paredeFrenteDir);

  const portaEsq = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 0.3), matPorta);
  portaEsq.position.set(-1.2, 2.75, 7.6); g.add(portaEsq);
  const portaDir = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 0.3), matPorta);
  portaDir.position.set(1.2, 2.75, 7.6); g.add(portaDir);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 17), matTelhado);
  telhado.position.y = 9.8; g.add(telhado);

  const torre = new THREE.Mesh(new THREE.BoxGeometry(5, 7, 5), matParede);
  torre.position.set(0, 13, 5); g.add(torre);

  const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 0.5), matCruz);
  cruzV.position.set(0, 17.5, 5); g.add(cruzV);
  const cruzH = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.5), matCruz);
  cruzH.position.set(0, 17.8, 5); g.add(cruzH);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 7, x + 7, z - 8, z + 8);
  criarPlacaIdentificacao(x + 5, z + 9, 0x7f1d1d, 0xfacc15, false);
}

// CONSTRUÇÃO DO CARRO VOXEL
function criarCarroVoxel(x, z) {
  const g = new THREE.Group();
  const matCarro = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
  const matRoda = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

  const chassi = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 5.5), matCarro);
  chassi.position.y = 0.8; chassi.castShadow = true; g.add(chassi);

  const cabine = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 3.0), matVidro);
  cabine.position.set(0, 1.85, -0.2); g.add(cabine);

  const teto = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.2, 3.1), matCarro);
  teto.position.set(0, 2.45, -0.2); g.add(teto);

  // RODAS
  const geoRoda = new THREE.BoxGeometry(0.6, 0.8, 0.8);
  const r1 = new THREE.Mesh(geoRoda, matRoda); r1.position.set(-1.6, 0.4, 1.8); g.add(r1);
  const r2 = new THREE.Mesh(geoRoda, matRoda); r2.position.set(1.6, 0.4, 1.8); g.add(r2);
  const r3 = new THREE.Mesh(geoRoda, matRoda); r3.position.set(-1.6, 0.4, -1.8); g.add(r3);
  const r4 = new THREE.Mesh(geoRoda, matRoda); r4.position.set(1.6, 0.4, -1.8); g.add(r4);

  // FARÓIS
  const farolEsq = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 6, 0.5);
  farolEsq.position.set(-1.0, 1.0, 2.8);
  farolEsq.target.position.set(-1.0, 0, 10);
  g.add(farolEsq); g.add(farolEsq.target);
  luzesFarol.push(farolEsq);

  const farolDir = new THREE.SpotLight(0xffffff, 0, 40, Math.PI / 6, 0.5);
  farolDir.position.set(1.0, 1.0, 2.8);
  farolDir.target.position.set(1.0, 0, 10);
  g.add(farolDir); g.add(farolDir.target);
  luzesFarol.push(farolDir);

  g.position.set(x, 0, z);
  scene.add(g);
  return g;
}

carroGroup = criarCarroVoxel(-25, 0);

criarPadariaDetalhada(pontos3D.padaria.x, pontos3D.padaria.z);
criarBotecoDetalhado(pontos3D.boteco.x, pontos3D.boteco.z);
criarFarmaciaDetalhada(pontos3D.farmacia.x, pontos3D.farmacia.z);
criarCasaRoxaMorador(pontos3D.casaRoxa.x, pontos3D.casaRoxa.z);
criarMinhaCasa(pontos3D.minhaCasa.x, pontos3D.minhaCasa.z);
criarIgrejaVoxel(pontos3D.igreja.x, pontos3D.igreja.z);

// BALÕES DE FALA 3D NOS NPCS
function criarBalaoFala3D(texto) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 512; canvas.height = 128;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.roundRect(10, 10, 492, 108, 20);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(texto.substring(0, 32), 256, 68);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(10, 2.5, 1);
  sprite.position.y = 4.8;
  return sprite;
}

// PERSONAGENS HD
function criarPersonagemArticuladoHD(corCamisa, corCalca, acessorio) {
  const g = new THREE.Group();
  const matPele = new THREE.MeshStandardMaterial({ color: 0xfcb37c, roughness: 0.6 });
  const matCamisa = new THREE.MeshStandardMaterial({ color: corCamisa, roughness: 0.5 });
  const matCalca = new THREE.MeshStandardMaterial({ color: corCalca, roughness: 0.6 });

  const tronco = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.6), matCamisa); tronco.position.y = 1.8; tronco.castShadow = true; g.add(tronco);
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matPele); cabeca.position.y = 3.0; cabeca.castShadow = true; g.add(cabeca);

  const matOlho = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const o1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.1), matOlho); o1.position.set(-0.25, 3.1, 0.52); g.add(o1);
  const o2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.1), matOlho); o2.position.set(0.25, 3.1, 0.52); g.add(o2);

  const pivotBracoEsq = new THREE.Group(); pivotBracoEsq.position.set(-0.7, 2.3, 0);
  const meshBracoEsq = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), matCamisa); meshBracoEsq.position.y = -0.55; pivotBracoEsq.add(meshBracoEsq); g.add(pivotBracoEsq);

  const pivotBracoDir = new THREE.Group(); pivotBracoDir.position.set(0.7, 2.3, 0);
  const meshBracoDir = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.2, 0.35), matCamisa); meshBracoDir.position.y = -0.55; pivotBracoDir.add(meshBracoDir); g.add(pivotBracoDir);

  const pivotPernaEsq = new THREE.Group(); pivotPernaEsq.position.set(-0.28, 1.1, 0);
  const meshPernaEsq = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.42), matCalca); meshPernaEsq.position.y = -0.55; pivotPernaEsq.add(meshPernaEsq); g.add(pivotPernaEsq);

  const pivotPernaDir = new THREE.Group(); pivotPernaDir.position.set(0.28, 1.1, 0);
  const meshPernaDir = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.1, 0.42), matCalca); meshPernaDir.position.y = -0.55; pivotPernaDir.add(meshPernaDir); g.add(pivotPernaDir);

  const chap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.3, 1.3), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }));
  chap.position.y = 3.6; chap.castShadow = true; chap.visible = (acessorio === 'chapeu'); g.add(chap);

  const caixaEntrega = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
  );
  caixaEntrega.position.set(0, 1.9, 0.75);
  caixaEntrega.visible = false;
  g.add(caixaEntrega);

  // LANTERNA ANEXADA
  const lanternaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  lanternaMesh.rotation.x = Math.PI / 2;
  lanternaMesh.position.set(0, -0.4, 0.3);
  lanternaMesh.visible = false;
  pivotBracoDir.add(lanternaMesh);

  luzLanterna = new THREE.SpotLight(0xffffff, 0, 35, Math.PI / 5, 0.4);
  luzLanterna.position.set(0, 1.8, 0);
  g.add(luzLanterna); g.add(luzLanterna.target);

  g.userData = { 
    pivotBracoEsq, pivotBracoDir, pivotPernaEsq, pivotPernaDir, 
    matCamisa, matCalca, chapeuMesh: chap, caixaEntrega, lanternaMesh
  };
  return g;
}

const npcs = {
  seu_ze: { name: 'Seu Zé', group: criarPersonagemArticuladoHD(0xef4444, 0x1e293b, 'chapeu'), spriteBalao: null },
  dona_maria: { name: 'Dona Maria', group: criarPersonagemArticuladoHD(0xec4899, 0x831843, null), spriteBalao: null },
  tiao_bar: { name: 'Tião do Bar', group: criarPersonagemArticuladoHD(0xf59e0b, 0x1e3a8a, null), spriteBalao: null }
};

const seuZeGroup = npcs.seu_ze.group; seuZeGroup.position.set(pontos3D.padaria.x, 0, pontos3D.padaria.z + 9); scene.add(seuZeGroup);
const donaMariaGroup = npcs.dona_maria.group; donaMariaGroup.position.set(pontos3D.farmacia.x, 0, pontos3D.farmacia.z + 9); scene.add(donaMariaGroup);
const tiaoGroup = npcs.tiao_bar.group; tiaoGroup.position.set(pontos3D.boteco.x, 0, pontos3D.boteco.z - 9); scene.add(tiaoGroup);

const playerGroup = criarPersonagemArticuladoHD(0x0284c7, 0x0f172a, null);
playerGroup.position.set(-30, 0, 15); scene.add(playerGroup);

controls.target.set(playerGroup.position.x, playerGroup.position.y + 2, playerGroup.position.z);
controls.update();

// SISTEMA DE ENTRAR/SAIR DO VEÍCULO
function toggleEntrarVeiculo() {
  if (!carroGroup) return;
  const dist = playerGroup.position.distanceTo(carroGroup.position);

  if (!noVeiculo && dist <= 6) {
    noVeiculo = true;
    playerGroup.visible = false;
    document.getElementById('car-btn').innerText = '🚶‍♂️';
  } else if (noVeiculo) {
    noVeiculo = false;
    playerGroup.visible = true;
    playerGroup.position.set(carroGroup.position.x - 3, 0, carroGroup.position.z);
    document.getElementById('car-btn').innerText = '🚗';
  }
}

// SISTEMA DE LOJA
function abrirMenuLoja() { const el = document.getElementById('shop-modal'); if (el) el.style.display = 'block'; }
function fecharMenuLoja() { const el = document.getElementById('shop-modal'); if (el) el.style.display = 'none'; }

function comprarItem(item, preco) {
  if (moedas >= preco) {
    moedas -= preco;
    atualizarHud();
    tocarSomMoeda();

    if (item === 'lanterna') {
      temLanterna = true;
      playerGroup.userData.lanternaMesh.visible = true;
      alert('Lanterna adquirida! Ela ligará automaticamente à noite.');
    } else if (item === 'energetico') {
      velocidadeBaseJogador = 0.28;
      alert('Energético consumido! Sua velocidade aumentou!');
    }
    fecharMenuLoja();
  } else {
    alert('Moedas insuficientes!');
  }
}

// MENUS E SKINS
function abrirMenuSkin() { const el = document.getElementById('skin-modal'); if (el) el.style.display = 'flex'; }
function fecharMenuSkin() { const el = document.getElementById('skin-modal'); if (el) el.style.display = 'none'; }
function abrirMenuMissoes() { const el = document.getElementById('missions-modal'); if (el) el.style.display = 'flex'; }
function fecharMenuMissoes() { const el = document.getElementById('missions-modal'); if (el) el.style.display = 'none'; }

function atualizarSkinJogador() {
  const pCamisa = document.getElementById('pickerCamisa');
  const pCalca = document.getElementById('pickerCalca');
  const pAcessorio = document.getElementById('selectAcessorio');

  if (pCamisa && pCalca && pAcessorio) {
    const u = playerGroup.userData;
    u.matCamisa.color.set(pCamisa.value);
    u.matCalca.color.set(pCalca.value);
    u.chapeuMesh.visible = (pAcessorio.value === 'chapeu');
  }
}

// MISSÕES
function aceitarMissao(tipo) {
  if (missaoAtiva) { alert("Você já tem uma missão em andamento!"); return; }

  if (tipo === 'pao') {
    missaoAtiva = { id: 'pao', titulo: '🥖 Entregar Pães', origem: 'padaria', destino: 'casaRoxa', recompensa: 25 };
  } else if (tipo === 'remedio') {
    missaoAtiva = { id: 'remedio', titulo: '💊 Entregar Remédios', origem: 'farmacia', destino: 'padaria', recompensa: 30 };
  }

  playerGroup.userData.caixaEntrega.visible = true;
  const hud = document.getElementById('active-mission-hud');
  if (hud) { hud.style.display = 'block'; hud.innerText = `📦 ${missaoAtiva.titulo} (Leve ao Destino!)`; }
  fecharMenuMissoes();
}

function checarConclusaoMissao() {
  if (!missaoAtiva) return;
  const pontoDestino = pontos3D[missaoAtiva.destino];
  if (!pontoDestino) return;

  const posChecagem = noVeiculo ? carroGroup.position : playerGroup.position;
  const dist = posChecagem.distanceTo(new THREE.Vector3(pontoDestino.x, 0, pontoDestino.z));
  
  if (dist <= 10) {
    moedas += missaoAtiva.recompensa;
    atualizarHud();
    tocarSomMoeda();
    adicionarMensagemChat('voce', `Entreguei a encomenda no destino! Ganhei ${missaoAtiva.recompensa} moedas!`);
    missaoAtiva = null;
    playerGroup.userData.caixaEntrega.visible = false;
    const hud = document.getElementById('active-mission-hud');
    if (hud) hud.style.display = 'none';
  }
}

let alvoZe = { x: seuZeGroup.position.x, z: seuZeGroup.position.z };
let alvoMaria = { x: donaMariaGroup.position.x, z: donaMariaGroup.position.z };
let alvoTiao = { x: tiaoGroup.position.x, z: tiaoGroup.position.z };

let estadoRotinaAtual = '';
function atualizarRotinaAutomaticaNpcs(hora) {
  let novoEstado = (hora >= 6 && hora < 17) ? 'trabalho' : (hora >= 17 && hora < 21) ? 'fofoca_boteco' : 'descanso';

  if (novoEstado !== estadoRotinaAtual) {
    estadoRotinaAtual = novoEstado;
    if (novoEstado === 'trabalho') {
      alvoZe = { x: pontos3D.padaria.x, z: pontos3D.padaria.z + 9 };
      alvoMaria = { x: pontos3D.farmacia.x, z: pontos3D.farmacia.z + 9 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z - 9 };
    } else if (novoEstado === 'fofoca_boteco') {
      alvoZe = { x: pontos3D.boteco.x + 2, z: pontos3D.boteco.z - 5 };
      alvoMaria = { x: pontos3D.boteco.x - 2, z: pontos3D.boteco.z - 5 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z - 8 };
    } else if (novoEstado === 'descanso') {
      alvoZe = { x: pontos3D.casaRoxa.x, z: pontos3D.casaRoxa.z - 5 };
      alvoMaria = { x: pontos3D.farmacia.x, z: pontos3D.farmacia.z - 5 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z + 5 };
    }
  }
}

// CONTROLES
let moveInput = { x: 0, z: 0 };
const keysPressed = {};

const joystickZone = document.getElementById('joystick-zone');
const joystickKnob = document.getElementById('joystick-knob');
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };

if (joystickZone && joystickKnob) {
  joystickZone.addEventListener('pointerdown', (e) => {
    joystickActive = true;
    const rect = joystickZone.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    updateJoystick(e);
  });

  window.addEventListener('pointermove', (e) => { if (joystickActive) updateJoystick(e); });
  window.addEventListener('pointerup', () => {
    if (joystickActive) {
      joystickActive = false;
      joystickKnob.style.top = '35px'; joystickKnob.style.left = '35px';
      moveInput = { x: 0, z: 0 };
    }
  });
}

function updateJoystick(e) {
  const dx = e.clientX - joystickCenter.x;
  const dy = e.clientY - joystickCenter.y;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40);
  const angle = Math.atan2(dy, dx);

  if (joystickKnob) {
    joystickKnob.style.left = (Math.cos(angle) * dist + 35) + 'px';
    joystickKnob.style.top = (Math.sin(angle) * dist + 35) + 'px';
  }

  moveInput.x = (Math.cos(angle) * (dist / 40));
  moveInput.z = (Math.sin(angle) * (dist / 40));
}

function executarPulo() {
  if (!emPulo && !noVeiculo) {
    emPulo = true; velocidadeY = forcaPulo; tocarSomPulo();
  }
}

window.addEventListener('keydown', (e) => {
  if (document.activeElement.tagName === 'INPUT') return;
  keysPressed[e.key.toLowerCase()] = true;
  if (e.key === 'b' || e.key === 'B') toggleBuildMode();
  if (e.key === ' ') executarPulo();
  if (e.key === 'f' || e.key === 'F') toggleEntrarVeiculo();
});

window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

function processarMovimentoTeclado() {
  let kx = 0; let kz = 0;
  if (keysPressed['w'] || keysPressed['arrowup']) kz -= 1;
  if (keysPressed['s'] || keysPressed['arrowdown']) kz += 1;
  if (keysPressed['a'] || keysPressed['arrowleft']) kx -= 1;
  if (keysPressed['d'] || keysPressed['arrowright']) kx += 1;

  if (kx !== 0 || kz !== 0) {
    const len = Math.sqrt(kx * kx + kz * kz);
    moveInput.x = kx / len; moveInput.z = kz / len;
  } else if (!joystickActive) {
    moveInput.x = 0; moveInput.z = 0;
  }
}

// CONSTRUÇÃO E SAVES
const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
const blocosConstruidos = []; const dadosBlocosSalvos = [];

function toggleBuildMode() {
  modoConstrucao = !modoConstrucao;
  const ind = document.getElementById('mode-indicator');
  const ch = document.getElementById('crosshair');
  const pal = document.getElementById('color-palette');

  if (ind) ind.innerText = modoConstrucao ? '🧱 Modo: Construir (Toque/Clique p/ Adicionar ou Apagar)' : '🛠️ Modo: Explorar';
  if (ch) ch.style.display = modoConstrucao ? 'block' : 'none';
  if (pal) pal.style.display = modoConstrucao ? 'flex' : 'none';
}

function salvarBlocosNoNavegador() { localStorage.setItem('vila3d_blocos', JSON.stringify(dadosBlocosSalvos)); }

function carregarBlocosSalvos() {
  const salvos = localStorage.getItem('vila3d_blocos');
  if (salvos) {
    const lista = JSON.parse(salvos);
    lista.forEach(item => {
      const mat = new THREE.MeshStandardMaterial({ color: item.cor, roughness: 0.3 });
      const bloco = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
      bloco.position.set(item.x, item.y, item.z);
      bloco.castShadow = true; bloco.receiveShadow = true;
      scene.add(bloco);
      blocosConstruidos.push(bloco);
      dadosBlocosSalvos.push(item);
      registrarObjetoSolido(item.x - 1, item.x + 1, item.z - 1, item.z + 1);
    });
  }
}

function removerBloco(bloco) {
  scene.remove(bloco);
  const idx = blocosConstruidos.indexOf(bloco);
  if (idx !== -1) {
    blocosConstruidos.splice(idx, 1);
    dadosBlocosSalvos.splice(idx, 1);
    salvarBlocosNoNavegador();
    tocarSomQuebrarBloco();
  }
}

window.addEventListener('pointerdown', (e) => {
  if (!modoConstrucao) return;
  if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.target.closest('#chat-wrapper') || e.target.closest('#joystick-zone') || e.target.closest('#action-tools') || e.target.closest('#color-palette') || e.target.closest('#skin-modal') || e.target.closest('#missions-modal') || e.target.closest('#shop-modal') || e.target.closest('#top-bar')) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  if (e.button === 2 || modoApagarAtivo) {
    const intersects = raycaster.intersectObjects(blocosConstruidos);
    if (intersects.length > 0) removerBloco(intersects[0].object);
    return;
  }

  if (e.button === 0 && !modoApagarAtivo) {
    const intersects = raycaster.intersectObjects([floor, ...blocosConstruidos]);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const matBloco = new THREE.MeshStandardMaterial({ color: corBlocoAtual, roughness: 0.3 });
      const bloco = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), matBloco);
      bloco.castShadow = true; bloco.receiveShadow = true;

      const p = intersect.point.clone().add(intersect.face.normal);
      const bx = Math.floor(p.x / 2) * 2 + 1;
      const by = Math.floor(p.y / 2) * 2 + 1;
      const bz = Math.floor(p.z / 2) * 2 + 1;

      bloco.position.set(bx, by, bz);
      scene.add(bloco);

      blocosConstruidos.push(bloco);
      dadosBlocosSalvos.push({ x: bx, y: by, z: bz, cor: corBlocoAtual });
      salvarBlocosNoNavegador();
      registrarObjetoSolido(bx - 1, bx + 1, bz - 1, bz + 1);
      tocarSomBloco();
    }
  }
});

carregarBlocosSalvos();

function checarAproximacaoNpcs() {
  let npcMaisProximo = null; let menorDistancia = 999;
  const posChecagem = noVeiculo ? carroGroup.position : playerGroup.position;

  Object.keys(npcs).forEach(key => {
    const dist = posChecagem.distanceTo(npcs[key].group.position);
    if (dist < menorDistancia) {
      menorDistancia = dist;
      if (dist <= 12) npcMaisProximo = key;
    }
  });

  const statusBox = document.getElementById('statusBox');
  const statusTexto = document.getElementById('statusTexto');
  const selectNpc = document.getElementById('selectNpc');

  if (statusBox && statusTexto && selectNpc) {
    if (npcMaisProximo) {
      selectNpc.value = npcMaisProximo; selectNpc.disabled = true;
      statusBox.className = "status-conexao status-presencial";
      statusTexto.innerText = `📍 Conversa Presencial (${npcs[npcMaisProximo].name})`;
    } else {
      selectNpc.disabled = false;
      statusBox.className = "status-conexao status-ligacao";
      statusTexto.innerText = `📞 Modo: Ligação Telefônica`;
    }
  }

  // BOTAO DO CARRO EXIBIDO SE ESTIVER PERTO
  const btnCar = document.getElementById('car-btn');
  if (btnCar) {
    const distCarro = playerGroup.position.distanceTo(carroGroup.position);
    btnCar.style.display = (distCarro <= 8 || noVeiculo) ? 'block' : 'none';
  }
}

// CLIMA
const qtdChuva = 2000; const geoChuva = new THREE.BufferGeometry(); const posChuva = new Float32Array(qtdChuva * 3);
for (let i = 0; i < qtdChuva * 3; i += 3) {
  posChuva[i] = (Math.random() - 0.5) * 320; posChuva[i+1] = Math.random() * 60; posChuva[i+2] = (Math.random() - 0.5) * 320;
}
geoChuva.setAttribute('position', new THREE.BufferAttribute(posChuva, 3));
const sistemaChuva = new THREE.Points(geoChuva, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.25, transparent: true, opacity: 0.7 }));
sistemaChuva.visible = false; scene.add(sistemaChuva);

function toggleWeather() {
  chovendo = !chovendo; sistemaChuva.visible = chovendo;
  const c = document.getElementById('climaHud');
  if (c) c.innerText = chovendo ? '🌧️ Chovendo' : '☀️ Ensolarado';
}

const qtdVagalumes = 120; const geoVagalumes = new THREE.BufferGeometry(); const posVagalumes = new Float32Array(qtdVagalumes * 3);
for (let i = 0; i < qtdVagalumes * 3; i += 3) {
  posVagalumes[i] = (Math.random() - 0.5) * 280; posVagalumes[i+1] = Math.random() * 8 + 1; posVagalumes[i+2] = (Math.random() - 0.5) * 280;
}
geoVagalumes.setAttribute('position', new THREE.BufferAttribute(posVagalumes, 3));
const sistemaVagalumes = new THREE.Points(geoVagalumes, new THREE.PointsMaterial({ color: 0xfef08a, size: 0.6, transparent: true, opacity: 0.9 }));
sistemaVagalumes.visible = false; scene.add(sistemaVagalumes);

function animarPassos(group, andando, tempo) {
  const u = group.userData;
  if (andando) {
    const angulo = Math.sin(tempo * 10) * 0.7;
    u.pivotBracoEsq.rotation.x = angulo; u.pivotBracoDir.rotation.x = -angulo;
    u.pivotPernaEsq.rotation.x = -angulo; u.pivotPernaDir.rotation.x = angulo;
  } else {
    u.pivotBracoEsq.rotation.x = 0; u.pivotBracoDir.rotation.x = 0;
    u.pivotPernaEsq.rotation.x = 0; u.pivotPernaDir.rotation.x = 0;
  }
}

// LOOP DE ANIMAÇÃO
let tempoGlobal = 0; let horaSimulada = 10;
function animate() {
  requestAnimationFrame(animate);
  tempoGlobal += 0.05;

  processarMovimentoTeclado();

  if (noVeiculo) {
    // FÍSICA E PILOTAGEM DO CARRO
    if (moveInput.z !== 0) {
      velocidadeCarro = THREE.MathUtils.lerp(velocidadeCarro, -moveInput.z * 0.45, 0.05);
    } else {
      velocidadeCarro = THREE.MathUtils.lerp(velocidadeCarro, 0, 0.08);
    }

    if (Math.abs(velocidadeCarro) > 0.02) {
      anguloDirecaoCarro -= moveInput.x * 0.04 * Math.sign(velocidadeCarro);
    }

    carroGroup.rotation.y = anguloDirecaoCarro;
    carroGroup.translateZ(velocidadeCarro);

    playerGroup.position.copy(carroGroup.position);

    camera.position.x += (carroGroup.position.x - controls.target.x);
    camera.position.z += (carroGroup.position.z - controls.target.z);
    controls.target.copy(carroGroup.position);

  } else {
    // MOVIMENTO A PÉ
    if (emPulo) {
      playerGroup.position.y += velocidadeY;
      velocidadeY += gravidade;
      if (playerGroup.position.y <= 0) { playerGroup.position.y = 0; emPulo = false; velocidadeY = 0; }
    }

    if (moveInput.x !== 0 || moveInput.z !== 0) {
      const cameraAngle = Math.atan2(
        camera.position.x - controls.target.x,
        camera.position.z - controls.target.z
      );

      const moveX = moveInput.x * Math.cos(cameraAngle) + moveInput.z * Math.sin(cameraAngle);
      const moveZ = -moveInput.x * Math.sin(cameraAngle) + moveInput.z * Math.cos(cameraAngle);

      const proxX = playerGroup.position.x + moveX * velocidadeBaseJogador;
      const proxZ = playerGroup.position.z + moveZ * velocidadeBaseJogador;

      const deltaX = (checarColisao(proxX, playerGroup.position.z) ? playerGroup.position.x : proxX) - playerGroup.position.x;
      const deltaZ = (checarColisao(playerGroup.position.x, proxZ) ? playerGroup.position.z : proxZ) - playerGroup.position.z;

      playerGroup.position.x += deltaX;
      playerGroup.position.z += deltaZ;

      if (deltaX !== 0 || deltaZ !== 0) {
        playerGroup.rotation.y = Math.atan2(deltaX, deltaZ);
      }

      camera.position.x += deltaX;
      camera.position.z += deltaZ;
      controls.target.x += deltaX;
      controls.target.z += deltaZ;
      
      animarPassos(playerGroup, true, tempoGlobal);
      if (Math.floor(tempoGlobal * 10) % 4 === 0) tocarSomPasso();
    } else {
      animarPassos(playerGroup, false, tempoGlobal);
    }
  }

  checarAproximacaoNpcs();
  checarConclusaoMissao();

  horaSimulada = (horaSimulada + 0.005) % 24;
  const horaFormatada = Math.floor(horaSimulada);
  const eNoite = horaSimulada >= 18 || horaSimulada < 6;
  const rHud = document.getElementById('relogioHud');
  if (rHud) rHud.innerText = `🕒 ${String(horaFormatada).padStart(2, '0')}:00 - ${eNoite ? 'Noite 🌙' : 'Dia ☀️'}`;

  atualizarRotinaAutomaticaNpcs(horaFormatada);

  scene.background.lerp(eNoite ? corNoite : corDia, 0.02);
  scene.fog.color.lerp(eNoite ? corNoite : corDia, 0.02);
  sunLight.intensity = eNoite ? 0.1 : 1.2;
  ambientLight.intensity = eNoite ? 0.25 : 0.7;
  luzesPostes.forEach(l => l.intensity = eNoite ? 2.5 : 0);
  luzesFarol.forEach(l => l.intensity = eNoite ? 3.0 : 0);

  if (luzLanterna) {
    luzLanterna.intensity = (eNoite && temLanterna) ? 2.5 : 0;
    if (temLanterna) {
      const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
      luzLanterna.target.position.copy(playerGroup.position).add(dir.multiplyScalar(10));
    }
  }

  sistemaVagalumes.visible = eNoite;

  if (chovendo) {
    const pos = sistemaChuva.geometry.attributes.position.array;
    for (let i = 1; i < qtdChuva * 3; i += 3) { pos[i] -= 2.0; if (pos[i] < 0) pos[i] = 60; }
    sistemaChuva.geometry.attributes.position.needsUpdate = true;
  }

  const velocidadeNpc = 0.015;

  const dxZe = alvoZe.x - seuZeGroup.position.x; const dzZe = alvoZe.z - seuZeGroup.position.z;
  if (Math.sqrt(dxZe * dxZe + dzZe * dzZe) > 0.2) {
    seuZeGroup.position.x += dxZe * velocidadeNpc; seuZeGroup.position.z += dzZe * velocidadeNpc;
    seuZeGroup.rotation.y = Math.atan2(dxZe, dzZe); animarPassos(seuZeGroup, true, tempoGlobal);
  } else { animarPassos(seuZeGroup, false, tempoGlobal); }

  const dxMaria = alvoMaria.x - donaMariaGroup.position.x; const dzMaria = alvoMaria.z - donaMariaGroup.position.z;
  if (Math.sqrt(dxMaria * dxMaria + dzMaria * dzMaria) > 0.2) {
    donaMariaGroup.position.x += dxMaria * velocidadeNpc; donaMariaGroup.position.z += dzMaria * velocidadeNpc;
    donaMariaGroup.rotation.y = Math.atan2(dxMaria, dzMaria); animarPassos(donaMariaGroup, true, tempoGlobal);
  } else { animarPassos(donaMariaGroup, false, tempoGlobal); }

  const dxTiao = alvoTiao.x - tiaoGroup.position.x; const dzTiao = alvoTiao.z - tiaoGroup.position.z;
  if (Math.sqrt(dxTiao * dxTiao + dzTiao * dzTiao) > 0.2) {
    tiaoGroup.position.x += dxTiao * velocidadeNpc; tiaoGroup.position.z += dzTiao * velocidadeNpc;
    tiaoGroup.rotation.y = Math.atan2(dxTiao, dzTiao); animarPassos(tiaoGroup, true, tempoGlobal);
  } else { animarPassos(tiaoGroup, false, tempoGlobal); }

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// WEBSOCKETS
socket.on('resposta_npc', (data) => {
  const { npcId, decisao } = data;
  adicionarMensagemChat(npcId, decisao.fala);
  falarVozNavegador(decisao.fala);
  atualizarMovimentoNpc(npcId, decisao.destino);
  exibirBalaoNpc(npcId, decisao.fala);
});

socket.on('conversa_entre_npcs', (data) => {
  adicionarMensagemChat(data.falante, data.fala);
  falarVozNavegador(data.fala);
  atualizarMovimentoNpc(data.falante, data.decisao.destino);
  exibirBalaoNpc(data.falante, data.fala);
});

function exibirBalaoNpc(npcId, texto) {
  if (npcs[npcId]) {
    if (npcs[npcId].spriteBalao) npcs[npcId].group.remove(npcs[npcId].spriteBalao);
    const sprite = criarBalaoFala3D(texto);
    npcs[npcId].group.add(sprite);
    npcs[npcId].spriteBalao = sprite;

    setTimeout(() => {
      if (npcs[npcId].spriteBalao) {
        npcs[npcId].group.remove(npcs[npcId].spriteBalao);
        npcs[npcId].spriteBalao = null;
      }
    }, 6000);
  }
}

function atualizarHud() {
  const m = document.getElementById('moedasHud');
  if (m) m.innerText = `🪙 ${moedas} Moedas`;
}

function adicionarMensagemChat(npcId, texto) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  let nome = "Você"; let cssClass = "voce";
  if (npcId === 'seu_ze') { nome = 'Seu Zé'; cssClass = 'seu_ze'; }
  else if (npcId === 'dona_maria') { nome = 'Dona Maria'; cssClass = 'dona_maria'; }
  else if (npcId === 'tiao_bar') { nome = 'Tião do Bar'; cssClass = 'tiao_bar'; }

  log.innerHTML += `<div class="msg ${cssClass}"><strong>${nome}:</strong> ${texto}</div>`;
  log.scrollTop = log.scrollHeight;
}

const offsetsIniciais = { seu_ze: { x: 0, z: 2.0 }, dona_maria: { x: 0, z: 2.0 }, tiao_bar: { x: 0, z: -2.0 } };

function atualizarMovimentoNpc(npcId, destino) {
  if (!destino) return;
  const destLimpo = String(destino).toLowerCase();
  let chave = null;
  if (destLimpo.includes('casa')) chave = 'casaRoxa';
  else if (destLimpo.includes('padaria')) chave = 'padaria';
  else if (destLimpo.includes('praca') || destLimpo.includes('praça')) chave = 'praca';
  else if (destLimpo.includes('farmacia') || destLimpo.includes('farmácia')) chave = 'farmacia';
  else if (destLimpo.includes('boteco') || destLimpo.includes('bar')) chave = 'boteco';

  if (chave && pontos3D[chave]) {
    const d = pontos3D[chave];
    const offset = offsetsIniciais[npcId] || { x: 0, z: 0 };
    const xFinal = d.x + offset.x;
    const zFinal = d.z + offset.z;

    if (npcId === 'seu_ze') { alvoZe.x = xFinal; alvoZe.z = zFinal; }
    else if (npcId === 'dona_maria') { alvoMaria.x = xFinal; alvoMaria.z = zFinal; }
    else if (npcId === 'tiao_bar') { alvoTiao.x = xFinal; alvoTiao.z = zFinal; }
  }
}

function enviarMensagem() {
  const input = document.getElementById('inputMensagem');
  const npcSelect = document.getElementById('selectNpc');
  if (!input || !npcSelect) return;
  const msg = input.value.trim();
  if (!msg) return;

  adicionarMensagemChat('voce', msg);
  socket.emit('falar_com_npc', {
    npcId: npcSelect.value,
    mensagem: msg,
    contextoMundo: { horario: horaSimulada > 18 || horaSimulada < 6 ? "Noite" : "Dia" }
  });
  input.value = '';
}

function fazerNpcsConversarem() {
  adicionarMensagemChat('seu_ze', 'Oi Tião, me serve um guaraná gelado!');
  socket.emit('npc_conversar_npc', {
    npcOrigem: 'seu_ze',
    npcDestino: 'tiao_bar',
    falaInicial: 'Oi Tião, me serve um guaraná trincando que hoje o dia na padaria foi quente!'
  });
}
