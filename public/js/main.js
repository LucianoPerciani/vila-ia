const socket = (typeof io !== "undefined") ? io() : { on:()=>{}, emit:()=>{} };

let moedas = 50;
let inventario = [];
let audioAtivo = true;
let musicaIniciada = false;
let chovendo = false;
let modoConstrucao = false;
let modoApagarAtivo = false;
let chatVisivel = true;
let modoEntradaVoz = false;
let corBlocoAtual = 0x38bdf8;
let velocidadeBaseJogador = 0.28;

let noVeiculo = false;
let carroGroup = null;
let velocidadeCarro = 0;
let anguloDirecaoCarro = 0;
let temLanterna = false;
let missaoAtiva = null;

let emPulo = false;
let velocidadeY = 0;
const gravidade = -0.018;
const forcaPulo = 0.38;

const caixasColisao = [];

function registrarObjetoSolido(xMin, xMax, zMin, zMax) {
  caixasColisao.push({ xMin, xMax, zMin, zMax });
}

function checarColisao(novoX, novoZ, raio = 0.8) {
  for (let i = 0; i < caixasColisao.length; i++) {
    const box = caixasColisao[i];
    if (novoX + raio > box.xMin && novoX - raio < box.xMax && novoZ + raio > box.zMin && novoZ - raio < box.zMax) {
      return true;
    }
  }
  return false;
}

const portasInterativas = [];

function criarPortaInterativa(x, z, rotY = 0) {
  const gPorta = new THREE.Group();
  const matPorta = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  const meshPorta = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.2, 0.3), matPorta);
  meshPorta.position.set(1.2, 2.1, 0);

  gPorta.add(meshPorta);
  gPorta.position.set(x, 0, z);
  gPorta.rotation.y = rotY;
  scene.add(gPorta);

  portasInterativas.push({ group: gPorta, aberta: false, anguloAlvo: 0, anguloAtual: 0 });
}

function checarEAlternarPortasProximas(pos) {
  portasInterativas.forEach(p => {
    const dist = pos.distanceTo(p.group.position);
    if (dist <= 7.0) {
      p.aberta = !p.aberta;
      p.anguloAlvo = p.aberta ? Math.PI / 2 : 0;
      tocarSomPorta();
    }
  });
}

let audioCtx = null;
function initAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  if (!musicaIniciada && audioAtivo) { musicaIniciada = true; tocarMusicaAmbiente(); }
}

window.addEventListener("pointerdown", () => { initAudio(); }, { once: true });

window.toggleAudio = function() {
  initAudio();
  audioAtivo = !audioAtivo;
  const btn = document.getElementById("audio-btn");
  if (btn) btn.innerText = audioAtivo ? "🔊" : "🔇";
};

window.toggleWeather = function() {
  chovendo = !chovendo;
  if (sistemaChuva) sistemaChuva.visible = chovendo;
  const c = document.getElementById("climaHud");
  if (c) c.innerText = chovendo ? "🌧️ Chovendo" : "☀️ Ensolarado";
};

window.toggleBuildMode = function() {
  modoConstrucao = !modoConstrucao;
  const ind = document.getElementById("mode-indicator");
  const ch = document.getElementById("crosshair");
  const pal = document.getElementById("color-palette");
  if (ind) ind.innerText = modoConstrucao ? "🧱 Modo: Construir" : "🛠️ Modo: Explorar";
  if (ch) ch.style.display = modoConstrucao ? "block" : "none";
  if (pal) pal.style.display = modoConstrucao ? "flex" : "none";
};

window.toggleModoApagar = function() {
  modoApagarAtivo = !modoApagarAtivo;
  const btn = document.getElementById("btn-modo-apagar");
  if (btn) {
    btn.innerText = modoApagarAtivo ? "🔴 Modo: Apagar" : "🟢 Modo: Criar";
    btn.style.background = modoApagarAtivo ? "#e11d48" : "#10b981";
  }
};

window.selecionarCor = function(corHex, btnEl) {
  corBlocoAtual = corHex;
  document.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
  if (btnEl) btnEl.classList.add("selected");
};

window.enviarMensagem = function() {
  const input = document.getElementById("inputMensagem");
  const npcSelect = document.getElementById("selectNpc");
  if (!input || !npcSelect) return;
  const msg = input.value.trim();
  if (!msg) return;
  adicionarMensagemChat("voce", msg);
  socket.emit("falar_com_npc", { 
    npcId: npcSelect.value, 
    mensagem: msg, 
    contextoMundo: { horario: horaSimulada > 18 || horaSimulada < 6 ? "Noite" : "Dia" } 
  });
  input.value = "";
};

window.iniciarReconhecimentoVoz = function() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { alert("Navegador sem suporte a voz."); return; }
  const recognition = new SpeechRecognition();
  recognition.lang = "pt-BR"; 
  recognition.interimResults = false;
  const btnMic = document.getElementById("btn-microfone");
  const txtStatus = document.getElementById("statusVozTexto");
  if (btnMic) { btnMic.style.background = "#e11d48"; btnMic.innerText = "🔴 Ouvindo..."; }
  if (txtStatus) txtStatus.innerText = "Escutando...";
  recognition.start();
  
  recognition.onresult = (event) => {
    const textoFalado = event.results[0][0].transcript;
    if (txtStatus) txtStatus.innerText = "Você falou: " + textoFalado;
    const npcSelect = document.getElementById("selectNpc");
    if (npcSelect) {
      adicionarMensagemChat("voce", textoFalado);
      socket.emit("falar_com_npc", { 
        npcId: npcSelect.value, 
        mensagem: textoFalado, 
        contextoMundo: { horario: horaSimulada > 18 || horaSimulada < 6 ? "Noite" : "Dia" } 
      });
    }
  };
  
  recognition.onerror = () => restaurarBotaoMic();
  recognition.onend = () => restaurarBotaoMic();
};

function restaurarBotaoMic() {
  const btnMic = document.getElementById("btn-microfone");
  if (btnMic) { btnMic.style.background = "#10b981"; btnMic.innerText = "🎙️ Clique p/ Falar"; }
}

window.alternarModoEntrada = function() {
  modoEntradaVoz = !modoEntradaVoz;
  const cTeclado = document.getElementById("container-teclado");
  const cVoz = document.getElementById("container-voz");
  const btn = document.getElementById("btn-modo-input");
  if (modoEntradaVoz) {
    if (cTeclado) cTeclado.style.display = "none";
    if (cVoz) cVoz.style.display = "block";
    if (btn) btn.innerText = "⌨️ Teclado";
  } else {
    if (cTeclado) cTeclado.style.display = "block";
    if (cVoz) cVoz.style.display = "none";
    if (btn) btn.innerText = "🎙️ Voz";
  }
};

window.toggleChatPanel = function() {
  chatVisivel = !chatVisivel;
  const wrapper = document.getElementById("chat-wrapper");
  const btn = document.getElementById("toggle-chat-btn");
  if (wrapper && btn) {
    if (chatVisivel) { wrapper.classList.remove("recolhido"); btn.innerText = "✖ Ocultar"; }
    else { wrapper.classList.add("recolhido"); btn.innerText = "💬 Chat"; }
  }
};

window.toggleEntrarVeiculo = function() {
  if (!carroGroup) return;
  const dist = playerGroup.position.distanceTo(carroGroup.position);
  if (!noVeiculo && dist <= 6) {
    noVeiculo = true; playerGroup.visible = false;
    document.getElementById("car-btn").innerText = "🚶‍♂️";
  } else if (noVeiculo) {
    noVeiculo = false; playerGroup.visible = true;
    playerGroup.position.set(carroGroup.position.x - 3, 0, carroGroup.position.z);
    document.getElementById("car-btn").innerText = "🚗";
  }
};

window.abrirMenuLoja = function() { const el = document.getElementById("shop-modal"); if (el) el.style.display = "block"; };
window.fecharMenuLoja = function() { const el = document.getElementById("shop-modal"); if (el) el.style.display = "none"; };
window.abrirMenuSkin = function() { const el = document.getElementById("skin-modal"); if (el) el.style.display = "flex"; };
window.fecharMenuSkin = function() { const el = document.getElementById("skin-modal"); if (el) el.style.display = "none"; };
window.abrirMenuMissoes = function() { const el = document.getElementById("missions-modal"); if (el) el.style.display = "flex"; };
window.fecharMenuMissoes = function() { const el = document.getElementById("missions-modal"); if (el) el.style.display = "none"; };

window.comprarItem = function(item, preco) {
  if (moedas >= preco) {
    moedas -= preco; atualizarHud(); tocarSomMoeda();
    if (item === "lanterna") { temLanterna = true; playerGroup.userData.lanternaMesh.visible = true; alert("Lanterna adquirida!"); }
    else if (item === "energetico") { velocidadeBaseJogador = 0.40; alert("Energético consumido!"); }
    window.fecharMenuLoja();
  } else { alert("Moedas insuficientes!"); }
};

window.atualizarSkinJogador = function() {
  const pCamisa = document.getElementById("pickerCamisa");
  const pCalca = document.getElementById("pickerCalca");
  const pAcessorio = document.getElementById("selectAcessorio");
  if (pCamisa && pCalca && pAcessorio) {
    const u = playerGroup.userData;
    u.matCamisa.color.set(pCamisa.value);
    u.matCalca.color.set(pCalca.value);
    u.chapeuMesh.visible = (pAcessorio.value === "chapeu");
  }
};

window.aceitarMissao = function(tipo) {
  if (missaoAtiva) { alert("Você já tem uma missão em andamento!"); return; }
  if (tipo === "pao") missaoAtiva = { id: "pao", titulo: "🥖 Entregar Pães", origem: "padaria", destino: "casaRoxa", recompensa: 25 };
  else if (tipo === "remedio") missaoAtiva = { id: "remedio", titulo: "💊 Entregar Remédios", origem: "farmacia", destino: "padaria", recompensa: 30 };
  playerGroup.userData.caixaEntrega.visible = true;
  const hud = document.getElementById("active-mission-hud");
  if (hud) { hud.style.display = "block"; hud.innerText = "📦 " + missaoAtiva.titulo; }
  window.fecharMenuMissoes();
};

function tocarSomPorta() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(180, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function tocarSomPasso() {
  if (!audioAtivo || !audioCtx || emPulo || noVeiculo) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "triangle"; osc.frequency.setValueAtTime(120, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.08);
}

function tocarSomPulo() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(150, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function tocarSomMoeda() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.25);
}

function tocarSomBloco() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sine"; osc.frequency.setValueAtTime(440, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.12);
}

function tocarSomQuebrarBloco() {
  if (!audioAtivo || !audioCtx) return;
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.type = "sawtooth"; osc.frequency.setValueAtTime(300, audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
  osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function tocarMusicaAmbiente() {
  if (!audioCtx) return;
  const notas = [261.63, 293.66, 329.63, 392.00, 440.00]; let i = 0;
  setInterval(() => {
    if (!audioAtivo || !audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = "sine"; osc.frequency.setValueAtTime(notas[i % notas.length], audioCtx.currentTime);
    gain.gain.setValueAtTime(0.02, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 1.2);
    i++;
  }, 1600);
}

function falarVozNavegador(texto) {
  if ("speechSynthesis" in window && audioAtivo) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "pt-BR"; utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

const container = document.getElementById("webgl-container");
const scene = new THREE.Scene();
const corDia = new THREE.Color(0x38bdf8); const corNoite = new THREE.Color(0x030712);
scene.background = corDia.clone();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1500);
camera.position.set(-30, 35, 65);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
renderer.shadowMap.enabled = false;

if (container) { container.innerHTML = ""; container.appendChild(renderer.domElement); }
renderer.domElement.addEventListener("contextmenu", e => e.preventDefault());

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05; controls.rotateSpeed = 0.4;
controls.minPolarAngle = 0.1; controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.minDistance = 10; controls.maxDistance = 120;
controls.enableKeys = false; controls.enableZoom = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.85); scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff5ea, 0.8); sunLight.position.set(100, 150, 100); scene.add(sunLight);

function criarPosteLuz(x, z) {
  const g = new THREE.Group();
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
  poste.position.y = 2.75; g.add(poste);
  const topo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  topo.position.y = 5.6; g.add(topo);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  bulb.position.y = 5.3; g.add(bulb);
  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
}

const floorGeo = new THREE.PlaneGeometry(500, 500);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.9 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2; scene.add(floor);

const ruaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
const calcadaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

const avPrincipal = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), ruaMat);
avPrincipal.rotation.x = -Math.PI / 2; avPrincipal.position.set(0, 0.02, 0); scene.add(avPrincipal);

const faixaCentral = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.4), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
faixaCentral.rotation.x = -Math.PI / 2; faixaCentral.position.set(0, 0.03, 0); scene.add(faixaCentral);

const calcadaAvNorte = new THREE.Mesh(new THREE.PlaneGeometry(400, 3), calcadaMat);
calcadaAvNorte.rotation.x = -Math.PI / 2; calcadaAvNorte.position.set(0, 0.04, -8.5); scene.add(calcadaAvNorte);

const calcadaAvSul = new THREE.Mesh(new THREE.PlaneGeometry(400, 3), calcadaMat);
calcadaAvSul.rotation.x = -Math.PI / 2; calcadaAvSul.position.set(0, 0.04, 8.5); scene.add(calcadaAvSul);

[0, 100, -100].forEach(posX => {
  const rua = new THREE.Mesh(new THREE.PlaneGeometry(14, 300), ruaMat);
  rua.rotation.x = -Math.PI / 2; rua.position.set(posX, 0.02, 0); scene.add(rua);
  const calcEsq = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), calcadaMat);
  calcEsq.rotation.x = -Math.PI / 2; calcEsq.position.set(posX - 8.5, 0.04, 0); scene.add(calcEsq);
  const calcDir = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), calcadaMat);
  calcDir.rotation.x = -Math.PI / 2; calcDir.position.set(posX + 8.5, 0.04, 0); scene.add(calcDir);
});

for (let x = -150; x <= 150; x += 40) { criarPosteLuz(x, -11); criarPosteLuz(x, 11); }

function criarCercaAoRedor(x, z, largura = 20, profundidade = 18, temPortaoFrente = true, rotY = 0) {
  const g = new THREE.Group();
  const matMadeira = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  function criarPalanque(px, pz) {
    const palanque = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), matMadeira);
    palanque.position.set(px, 0.8, pz); g.add(palanque);
  }
  function criarRipa(rx, rz, tamX, tamZ) {
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(tamX, 0.2, tamZ), matMadeira); r1.position.set(rx, 0.6, rz); g.add(r1);
    const r2 = new THREE.Mesh(new THREE.BoxGeometry(tamX, 0.2, tamZ), matMadeira); r2.position.set(rx, 1.2, rz); g.add(r2);
  }
  const medioL = largura / 2; const medioP = profundidade / 2;
  for (let p = -medioP; p <= medioP; p += 3) {
    criarPalanque(-medioL, p); criarPalanque(medioL, p);
    if (p + 3 <= medioP) { criarRipa(-medioL, p + 1.5, 0.2, 3); criarRipa(medioL, p + 1.5, 0.2, 3); }
  }
  for (let l = -medioL; l <= medioL; l += 3) {
    criarPalanque(l, -medioP); if (l + 3 <= medioL) criarRipa(l + 1.5, -medioP, 3, 0.2);
  }
  for (let l = -medioL; l <= medioL; l += 3) {
    if (temPortaoFrente && Math.abs(l) < 3) continue;
    criarPalanque(l, medioP);
    if (l + 3 <= medioL && (!temPortaoFrente || Math.abs(l + 1.5) >= 3)) criarRipa(l + 1.5, medioP, 3, 0.2);
  }
  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
}

let lagoMesh = null;
function criarLagoComPonte(x, z) {
  const g = new THREE.Group();
  const bordaGeo = new THREE.RingGeometry(18, 22, 24);
  const bordaMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, side: THREE.DoubleSide });
  const borda = new THREE.Mesh(bordaGeo, bordaMat); borda.rotation.x = -Math.PI / 2; borda.position.y = 0.05; g.add(borda);

  const aguaGeo = new THREE.CircleGeometry(19, 24);
  const aguaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, transparent: true, opacity: 0.85 });
  lagoMesh = new THREE.Mesh(aguaGeo, aguaMat); lagoMesh.rotation.x = -Math.PI / 2; lagoMesh.position.y = 0.08; g.add(lagoMesh);

  const ponteMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const ponteChao = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 42), ponteMat); ponteChao.position.set(0, 0.3, 0); g.add(ponteChao);
  const corrimaoEsq = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 42), ponteMat); corrimaoEsq.position.set(-2.8, 1.0, 0); g.add(corrimaoEsq);
  const corrimaoDir = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 42), ponteMat); corrimaoDir.position.set(2.8, 1.0, 0); g.add(corrimaoDir);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 22, x - 3, z - 22, z + 22);
  registrarObjetoSolido(x + 3, x + 22, z - 22, z + 22);
}

criarLagoComPonte(-140, 60);

function criarPracaCentral(x, z) {
  const g = new THREE.Group();
  const piso = new THREE.Mesh(new THREE.BoxGeometry(50, 0.2, 50), new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 }));
  piso.position.y = 0.1; g.add(piso);
  const baseChafariz = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x475569 }));
  baseChafariz.position.y = 0.8; g.add(baseChafariz);
  const pilarChafariz = new THREE.Mesh(new THREE.BoxGeometry(3, 3.5, 3), new THREE.MeshStandardMaterial({ color: 0x334155 }));
  pilarChafariz.position.y = 2.5; g.add(pilarChafariz);
  const aguaTopo = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 4.5), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
  aguaTopo.position.y = 4.4; g.add(aguaTopo);

  function criarBancoPraca(bx, bz, rotY) {
    const bg = new THREE.Group(); const matM = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const assento = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 1.2), matM); assento.position.y = 0.7; bg.add(assento);
    const encosto = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.3), matM); encosto.position.set(0, 1.3, -0.5); bg.add(encosto);
    bg.position.set(bx, 0, bz); bg.rotation.y = rotY; g.add(bg);
  }
  criarBancoPraca(0, 12, 0); criarBancoPraca(0, -12, Math.PI);
  criarBancoPraca(12, 0, -Math.PI / 2); criarBancoPraca(-12, 0, Math.PI / 2);
  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 5, x + 5, z - 5, z + 5);
}

criarPracaCentral(0, -90);

function criarIgrejaMatrizGrande(x, z) {
  const g = new THREE.Group();
  const matParede = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.4 });
  const matPedra = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
  const matMadeira = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
  const matCruz = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

  const pisoNave = new THREE.Mesh(new THREE.BoxGeometry(22, 0.05, 28), matPedra); pisoNave.position.set(0, 0.02, -1); g.add(pisoNave);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 0.8), matParede); pFundo.position.set(0, 5, -14.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 28), matParede); pEsq.position.set(-10.6, 5, -0.6); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 10, 28), matParede); pDir.position.set(10.6, 5, -0.6); g.add(pDir);

  for (let jz = -8; jz <= 6; jz += 7) {
    const janEsq = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.0, 2.5), matVidro); janEsq.position.set(-10.6, 5.5, jz); g.add(janEsq);
    const janDir = new THREE.Mesh(new THREE.BoxGeometry(1.0, 4.0, 2.5), matVidro); janDir.position.set(10.6, 5.5, jz); g.add(janDir);
  }

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(8.5, 10, 0.8), matParede); pFrenteEsq.position.set(-6.8, 5, 13.0); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(8.5, 10, 0.8), matParede); pFrenteDir.position.set(6.8, 5, 13.0); g.add(pFrenteDir);
  const pFrenteTopo = new THREE.Mesh(new THREE.BoxGeometry(5.0, 5.5, 0.8), matParede); pFrenteTopo.position.set(0, 7.25, 13.0); g.add(pFrenteTopo);

  const telhadoMain = new THREE.Mesh(new THREE.ConeGeometry(17, 7, 4), matTelhado); telhadoMain.position.set(0, 13.5, -1); telhadoMain.rotation.y = Math.PI / 4; g.add(telhadoMain);
  const torreBase = new THREE.Mesh(new THREE.BoxGeometry(6, 18, 6), matParede); torreBase.position.set(0, 9, 13); g.add(torreBase);
  const topoTorre = new THREE.Mesh(new THREE.ConeGeometry(5, 7, 4), matTelhado); topoTorre.position.set(0, 21.5, 13); topoTorre.rotation.y = Math.PI / 4; g.add(topoTorre);

  const cruzH = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.5), matCruz); cruzH.position.set(0, 25.5, 13); g.add(cruzH);
  const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3.2, 0.5), matCruz); cruzV.position.set(0, 25.5, 13); g.add(cruzV);

  for (let bz = -8; bz <= 4; bz += 3.5) {
    const bEsq = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 1.2), matMadeira); bEsq.position.set(-5, 0.4, bz); g.add(bEsq);
    const bDir = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.8, 1.2), matMadeira); bDir.position.set(5, 0.4, bz); g.add(bDir);
  }

  const baseAltar = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 5), matPedra); baseAltar.position.set(0, 0.15, -11); g.add(baseAltar);
  const mesaAltar = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.2, 2.2), matMadeira); mesaAltar.position.set(0, 0.8, -11); g.add(mesaAltar);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 11, x + 11, z - 15, z - 14);
  registrarObjetoSolido(x - 11, x - 10, z - 15, z + 13);
  registrarObjetoSolido(x + 10, x + 11, z - 15, z + 13);
  registrarObjetoSolido(x - 11, x - 2.6, z + 12, z + 14);
  registrarObjetoSolido(x + 2.6, x + 11, z + 12, z + 14);

  criarPortaInterativa(x - 1.2, z + 13.0, 0);
}

function criarCasaCompletaEntravel(x, z, corParede, corTelhado, rotY = 0) {
  const g = new THREE.Group();
  const matP = new THREE.MeshStandardMaterial({ color: corParede, roughness: 0.6 });
  const matT = new THREE.MeshStandardMaterial({ color: corTelhado, roughness: 0.4 });
  const matPiso = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 11), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 0.8), matP); pFundo.position.set(0, 3, -5.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 12), matP); pEsq.position.set(-5.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 12), matP); pDir.position.set(5.6, 3, 0); g.add(pDir);

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6, 0.8), matP); pFrenteEsq.position.set(-3.7, 3, 5.6); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6, 0.8), matP); pFrenteDir.position.set(3.7, 3, 5.6); g.add(pFrenteDir);
  const pFrenteTopo = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2, 0.8), matP); pFrenteTopo.position.set(0, 5, 5.6); g.add(pFrenteTopo);

  const telhado = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4), matT); telhado.position.y = 8.2; telhado.rotation.y = Math.PI / 4; g.add(telhado);

  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);
  registrarObjetoSolido(x - 6, x + 6, z - 6, z - 5);
  registrarObjetoSolido(x - 6, x - 5, z - 6, z + 6);
  registrarObjetoSolido(x + 5, x + 6, z - 6, z + 6);
  registrarObjetoSolido(x - 6, x - 1.8, z + 5, z + 6);
  registrarObjetoSolido(x + 1.8, x + 6, z + 5, z + 6);

  criarPortaInterativa(x - 1.2, z + 5.6, rotY);
  criarCercaAoRedor(x, z, 18, 18, true, rotY);
}

function criarPadariaDetalhada(x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.4 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
  const matBalcao = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 13), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.8), matParede); pFundo.position.set(0, 3, -6.1); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pEsq.position.set(-7.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pDir.position.set(7.6, 3, 0); g.add(pDir);

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteEsq.position.set(-6.2, 3, 6.1); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteDir.position.set(6.2, 3, 6.1); g.add(pFrenteDir);

  const vitrine1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrine1.position.set(-3.5, 2.4, 6.1); g.add(vitrine1);
  const vitrine2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrine2.position.set(3.5, 2.4, 6.1); g.add(vitrine2);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 14.5), matTelhado); telhado.position.y = 6.6; g.add(telhado);
  const balcao = new THREE.Mesh(new THREE.BoxGeometry(8, 2.0, 1.8), matBalcao); balcao.position.set(0, 1.0, 1.5); g.add(balcao);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8, x + 8, z - 6.5, z - 5.5);
  registrarObjetoSolido(x - 8, x - 7, z - 6.5, z + 6.5);
  registrarObjetoSolido(x + 7, x + 8, z - 6.5, z + 6.5);
  registrarObjetoSolido(x - 8, x - 1.8, z + 5.5, z + 6.5);
  registrarObjetoSolido(x + 1.8, x + 8, z + 5.5, z + 6.5);

  criarPortaInterativa(x - 1.6, z + 6.1, 0);
}

function criarFarmaciaDetalhada(x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.4 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
  const matBalcao = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
  const matCruz = new THREE.MeshBasicMaterial({ color: 0x22c55e });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(16, 0.1, 14), matPiso); piso.position.y = 0.05; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.8), matParede); pFundo.position.set(0, 3, -6.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pEsq.position.set(-7.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pDir.position.set(7.6, 3, 0); g.add(pDir);

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteEsq.position.set(-6.2, 3, 6.6); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteDir.position.set(6.2, 3, 6.6); g.add(pFrenteDir);
  const pFrenteTopo = new THREE.Mesh(new THREE.BoxGeometry(15, 1.8, 0.8), matParede); pFrenteTopo.position.set(0, 5.1, 6.6); g.add(pFrenteTopo);

  const vitrineEsq = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrineEsq.position.set(-3.5, 2.4, 6.6); g.add(vitrineEsq);
  const vitrineDir = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrineDir.position.set(3.5, 2.4, 6.6); g.add(vitrineDir);

  const cruzH = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.4), matCruz); cruzH.position.set(0, 5.2, 7.1); g.add(cruzH);
  const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.4), matCruz); cruzV.position.set(0, 5.2, 7.1); g.add(cruzV);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(17, 1.0, 15), matTelhado); telhado.position.y = 6.5; g.add(telhado);
  const balcaoAtendimento = new THREE.Mesh(new THREE.BoxGeometry(9.0, 1.8, 1.5), matBalcao); balcaoAtendimento.position.set(0, 0.9, 2.0); g.add(balcaoAtendimento);

  const matEstante = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
  const estante = new THREE.Mesh(new THREE.BoxGeometry(12, 4.5, 0.8), matEstante); estante.position.set(0, 2.25, -5.8); g.add(estante);

  const coresRemedios = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b];
  for (let rx = -5; rx <= 5; rx += 1.8) {
    for (let ry = 1.2; ry <= 3.8; ry += 1.2) {
      const corItem = coresRemedios[Math.floor(Math.random() * coresRemedios.length)];
      const cx = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: corItem }));
      cx.position.set(rx, ry, -5.2); g.add(cx);
    }
  }

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8, x + 8, z - 7.0, z - 6.0);
  registrarObjetoSolido(x - 8, x - 7, z - 7.0, z + 7.0);
  registrarObjetoSolido(x + 7, x + 8, z - 7.0, z + 7.0);
  registrarObjetoSolido(x - 8, x - 1.8, z + 6.0, z + 7.0);
  registrarObjetoSolido(x + 1.8, x + 8, z + 6.0, z + 7.0);

  criarPortaInterativa(x - 1.2, z + 6.6, 0);
}

function criarBotecoDetalhado(x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 14), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(17, 6, 0.8), matParede); pFundo.position.set(0, 3, 6.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pEsq.position.set(-8.1, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pDir.position.set(8.1, 3, 0); g.add(pDir);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 15.5), matTelhado); telhado.position.y = 6.6; g.add(telhado);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8.5, x + 8.5, z + 6.0, z + 7.0);
  registrarObjetoSolido(x - 8.5, x - 7.5, z - 7.0, z + 7.0);
  registrarObjetoSolido(x + 7.5, x + 8.5, z - 7.0, z + 7.0);
  registrarObjetoSolido(x - 8.5, x - 1.8, z - 7.0, z - 6.0);
  registrarObjetoSolido(x + 1.8, x + 8.5, z - 7.0, z - 6.0);

  criarPortaInterativa(x - 1.6, z - 6.6, 0);
}

function criarArvoreVoxel(x, z) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 }));
  tronco.position.y = 2; g.add(tronco);
  const folhaMat = new THREE.MeshStandardMaterial({ color: 0x1e5128, roughness: 0.7 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 3.5), folhaMat); f1.position.y = 4; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), folhaMat); f2.position.y = 5.5; g.add(f2);
  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
}

[[-140, -45], [-70, -45], [70, -45], [140, -45], [-140, 45], [70, 45], [140, 45]].forEach(p => criarArvoreVoxel(p[0], p[1]));

const pontos3D = {
  padaria: { x: -80, z: -22 },
  igreja: { x: 0, z: -145 },
  farmacia: { x: 80, z: -22 },
  boteco: { x: -80, z: 22 },
  minhaCasa: { x: -30, z: 25 },
  casaRoxa: { x: 60, z: 22 },
  praca: { x: 0, z: -90 }
};

function criarCarroVoxel(x, z) {
  const g = new THREE.Group();
  const matCarro = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6 });
  const matRoda = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

  const chassi = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 5.5), matCarro); chassi.position.y = 0.8; g.add(chassi);
  const cabine = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 3.0), matVidro); cabine.position.set(0, 1.85, -0.2); g.add(cabine);

  const geoRoda = new THREE.BoxGeometry(0.6, 0.8, 0.8);
  const r1 = new THREE.Mesh(geoRoda, matRoda); r1.position.set(-1.6, 0.4, 1.8); g.add(r1);
  const r2 = new THREE.Mesh(geoRoda, matRoda); r2.position.set(1.6, 0.4, 1.8); g.add(r2);
  const r3 = new THREE.Mesh(geoRoda, matRoda); r3.position.set(-1.6, 0.4, -1.8); g.add(r3);
  const r4 = new THREE.Mesh(geoRoda, matRoda); r4.position.set(1.6, 0.4, -1.8); g.add(r4);

  g.position.set(x, 0, z); scene.add(g);
  return g;
}

carroGroup = criarCarroVoxel(-25, 0);

criarPadariaDetalhada(pontos3D.padaria.x, pontos3D.padaria.z);
criarBotecoDetalhado(pontos3D.boteco.x, pontos3D.boteco.z);
criarFarmaciaDetalhada(pontos3D.farmacia.x, pontos3D.farmacia.z);
criarCasaCompletaEntravel(pontos3D.casaRoxa.x, pontos3D.casaRoxa.z, 0x4f46e5, 0x991b1b, Math.PI);
criarCasaCompletaEntravel(pontos3D.minhaCasa.x, pontos3D.minhaCasa.z, 0x0284c7, 0xb91c1c, Math.PI);
criarIgrejaMatrizGrande(pontos3D.igreja.x, pontos3D.igreja.z);

function criarBalaoFala3D(texto) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = 512; canvas.height = 128;
  ctx.fillStyle = "rgba(15, 23, 42, 0.85)"; ctx.roundRect(10, 10, 492, 108, 20); ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = "#38bdf8"; ctx.stroke();
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 24px Arial"; ctx.textAlign = "center";
  ctx.fillText(texto.substring(0, 32), 256, 68);
  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMat); sprite.scale.set(10, 2.5, 1); sprite.position.y = 4.8;
  return sprite;
}

function criarPersonagemArticuladoHD(corCamisa, corCalca, acessorio) {
  const g = new THREE.Group();
  const matPele = new THREE.MeshStandardMaterial({ color: 0xfcb37c, roughness: 0.6 });
  const matCamisa = new THREE.MeshStandardMaterial({ color: corCamisa, roughness: 0.5 });
  const matCalca = new THREE.MeshStandardMaterial({ color: corCalca, roughness: 0.6 });

  const tronco = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.6), matCamisa); tronco.position.y = 1.8; g.add(tronco);
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), matPele); cabeca.position.y = 3.0; g.add(cabeca);

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
  chap.position.y = 3.6; chap.visible = (acessorio === "chapeu"); g.add(chap);

  const caixaEntrega = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 }));
  caixaEntrega.position.set(0, 1.9, 0.75); caixaEntrega.visible = false; g.add(caixaEntrega);

  const lanternaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  lanternaMesh.rotation.x = Math.PI / 2; lanternaMesh.position.set(0, -0.4, 0.3); lanternaMesh.visible = false; pivotBracoDir.add(lanternaMesh);

  g.userData = { pivotBracoEsq, pivotBracoDir, pivotPernaEsq, pivotPernaDir, matCamisa, matCalca, chapeuMesh: chap, caixaEntrega, lanternaMesh };
  return g;
}

const npcs = {
  seu_ze: { name: "Seu Zé", group: criarPersonagemArticuladoHD(0xef4444, 0x1e293b, "chapeu"), spriteBalao: null },
  dona_maria: { name: "Dona Maria", group: criarPersonagemArticuladoHD(0xec4899, 0x831843, null), spriteBalao: null },
  tiao_bar: { name: "Tião do Bar", group: criarPersonagemArticuladoHD(0xf59e0b, 0x1e3a8a, null), spriteBalao: null }
};

const seuZeGroup = npcs.seu_ze.group; seuZeGroup.position.set(pontos3D.padaria.x, 0, pontos3D.padaria.z + 9); scene.add(seuZeGroup);
const donaMariaGroup = npcs.dona_maria.group; donaMariaGroup.position.set(pontos3D.farmacia.x, 0, pontos3D.farmacia.z + 9); scene.add(donaMariaGroup);
const tiaoGroup = npcs.tiao_bar.group; tiaoGroup.position.set(pontos3D.boteco.x, 0, pontos3D.boteco.z - 9); scene.add(tiaoGroup);

const playerGroup = criarPersonagemArticuladoHD(0x0284c7, 0x0f172a, null);
playerGroup.position.set(-30, 0, 15); scene.add(playerGroup);

controls.target.set(playerGroup.position.x, playerGroup.position.y + 2, playerGroup.position.z); controls.update();

let moveInput = { x: 0, z: 0 }; const keysPressed = {};
const joystickZone = document.getElementById("joystick-zone");
const joystickKnob = document.getElementById("joystick-knob");
let joystickTouchId = null; let joystickCenter = { x: 0, y: 0 };

if (joystickZone && joystickKnob) {
  joystickZone.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (joystickTouchId === null) {
      const touch = e.changedTouches[0]; joystickTouchId = touch.identifier;
      const rect = joystickZone.getBoundingClientRect();
      joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      updateJoystickTouch(touch);
    }
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    if (joystickTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) { updateJoystickTouch(e.changedTouches[i]); break; }
      }
    }
  }, { passive: false });

  const finalizaJoystick = (e) => {
    if (joystickTouchId !== null) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
          joystickTouchId = null; joystickKnob.style.top = "35px"; joystickKnob.style.left = "35px";
          moveInput = { x: 0, z: 0 }; break;
        }
      }
    }
  };
  window.addEventListener("touchend", finalizaJoystick); window.addEventListener("touchcancel", finalizaJoystick);
}

function updateJoystickTouch(touch) {
  const dx = touch.clientX - joystickCenter.x; const dy = touch.clientY - joystickCenter.y;
  const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 40); const angle = Math.atan2(dy, dx);
  if (joystickKnob) {
    joystickKnob.style.left = (Math.cos(angle) * dist + 35) + "px";
    joystickKnob.style.top = (Math.sin(angle) * dist + 35) + "px";
  }
  moveInput.x = (Math.cos(angle) * (dist / 40)); moveInput.z = (Math.sin(angle) * (dist / 40));
}

function executarPulo() { if (!emPulo && !noVeiculo) { emPulo = true; velocidadeY = forcaPulo; tocarSomPulo(); } }

window.addEventListener("keydown", (e) => {
  if (document.activeElement.tagName === "INPUT") return;
  keysPressed[e.key.toLowerCase()] = true;
  if (e.key === "b" || e.key === "B") toggleBuildMode();
  if (e.key === " ") executarPulo();
  if (e.key === "f" || e.key === "F") toggleEntrarVeiculo();
  if (e.key === "e" || e.key === "E") checarEAlternarPortasProximas(playerGroup.position);
});

window.addEventListener("keyup", (e) => { keysPressed[e.key.toLowerCase()] = false; });

function processarMovimentoTeclado() {
  let kx = 0; let kz = 0;
  if (keysPressed["w"] || keysPressed["arrowup"]) kz -= 1;
  if (keysPressed["s"] || keysPressed["arrowdown"]) kz += 1;
  if (keysPressed["a"] || keysPressed["arrowleft"]) kx -= 1;
  if (keysPressed["d"] || keysPressed["arrowright"]) kx += 1;
  if (kx !== 0 || kz !== 0) {
    const len = Math.sqrt(kx * kx + kz * kz); moveInput.x = kx / len; moveInput.z = kz / len;
  } else if (joystickTouchId === null) { moveInput.x = 0; moveInput.z = 0; }
}

const raycaster = new THREE.Raycaster(); const mouse = new THREE.Vector2();
const blocosConstruidos = []; const dadosBlocosSalvos = [];

function salvarBlocosNoNavegador() { localStorage.setItem("vila3d_blocos", JSON.stringify(dadosBlocosSalvos)); }

function carregarBlocosSalvos() {
  const salvos = localStorage.getItem("vila3d_blocos");
  if (salvos) {
    const lista = JSON.parse(salvos);
    lista.forEach(item => {
      const mat = new THREE.MeshStandardMaterial({ color: item.cor, roughness: 0.3 });
      const bloco = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), mat);
      bloco.position.set(item.x, item.y, item.z); scene.add(bloco);
      blocosConstruidos.push(bloco); dadosBlocosSalvos.push(item);
      registrarObjetoSolido(item.x - 1, item.x + 1, item.z - 1, item.z + 1);
    });
  }
}

function removerBloco(bloco) {
  scene.remove(bloco);
  const idx = blocosConstruidos.indexOf(bloco);
  if (idx !== -1) {
    blocosConstruidos.splice(idx, 1); dadosBlocosSalvos.splice(idx, 1);
    salvarBlocosNoNavegador(); tocarSomQuebrarBloco();
  }
}

window.addEventListener("pointerdown", (e) => {
  if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
  if (e.target.closest("#chat-wrapper") || e.target.closest("#joystick-zone") || e.target.closest("#action-tools") || e.target.closest("#color-palette") || e.target.closest("#skin-modal") || e.target.closest("#missions-modal") || e.target.closest("#shop-modal") || e.target.closest("#top-bar")) return;

  if (!modoConstrucao) { checarEAlternarPortasProximas(playerGroup.position); return; }

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1; mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  if (modoApagarAtivo) {
    const intersects = raycaster.intersectObjects(blocosConstruidos);
    if (intersects.length > 0) removerBloco(intersects[0].object);
    return;
  }

  if (!modoApagarAtivo) {
    const intersects = raycaster.intersectObjects([floor, ...blocosConstruidos]);
    if (intersects.length > 0) {
      const intersect = intersects[0];
      const matBloco = new THREE.MeshStandardMaterial({ color: corBlocoAtual, roughness: 0.3 });
      const bloco = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), matBloco);
      const p = intersect.point.clone().add(intersect.face.normal);
      const bx = Math.floor(p.x / 2) * 2 + 1; const by = Math.floor(p.y / 2) * 2 + 1; const bz = Math.floor(p.z / 2) * 2 + 1;
      bloco.position.set(bx, by, bz); scene.add(bloco);
      blocosConstruidos.push(bloco); dadosBlocosSalvos.push({ x: bx, y: by, z: bz, cor: corBlocoAtual });
      salvarBlocosNoNavegador(); registrarObjetoSolido(bx - 1, bx + 1, bz - 1, bz + 1);
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
    if (dist < menorDistancia) { menorDistancia = dist; if (dist <= 12) npcMaisProximo = key; }
  });

  const statusBox = document.getElementById("statusBox");
  const statusTexto = document.getElementById("statusTexto");
  const selectNpc = document.getElementById("selectNpc");

  if (statusBox && statusTexto && selectNpc) {
    if (npcMaisProximo) {
      selectNpc.value = npcMaisProximo; selectNpc.disabled = true;
      statusBox.className = "status-conexao status-presencial";
      statusTexto.innerText = "📍 Presencial (" + npcs[npcMaisProximo].name + ")";
    } else {
      selectNpc.disabled = false;
      statusBox.className = "status-conexao status-ligacao";
      statusTexto.innerText = "📞 Ligação Telefônica";
    }
  }

  const btnCar = document.getElementById("car-btn");
  if (btnCar) {
    const distCarro = playerGroup.position.distanceTo(carroGroup.position);
    btnCar.style.display = (distCarro <= 8 || noVeiculo) ? "block" : "none";
  }
}

function checarConclusaoMissao() {
  if (!missaoAtiva) return;
  const pontoDestino = pontos3D[missaoAtiva.destino]; if (!pontoDestino) return;
  const posChecagem = noVeiculo ? carroGroup.position : playerGroup.position;
  const dist = posChecagem.distanceTo(new THREE.Vector3(pontoDestino.x, 0, pontoDestino.z));
  if (dist <= 10) {
    moedas += missaoAtiva.recompensa; atualizarHud(); tocarSomMoeda();
    adicionarMensagemChat("voce", "Entreguei a encomenda no destino! Ganhei " + missaoAtiva.recompensa + " moedas!");
    missaoAtiva = null; playerGroup.userData.caixaEntrega.visible = false;
    const hud = document.getElementById("active-mission-hud"); if (hud) hud.style.display = "none";
  }
}

let alvoZe = { x: seuZeGroup.position.x, z: seuZeGroup.position.z };
let alvoMaria = { x: donaMariaGroup.position.x, z: donaMariaGroup.position.z };
let alvoTiao = { x: tiaoGroup.position.x, z: tiaoGroup.position.z };
let estadoRotinaAtual = "";

function atualizarRotinaAutomaticaNpcs(hora) {
  let novoEstado = (hora >= 6 && hora < 17) ? "trabalho" : (hora >= 17 && hora < 21) ? "fofoca_boteco" : "descanso";
  if (novoEstado !== estadoRotinaAtual) {
    estadoRotinaAtual = novoEstado;
    if (novoEstado === "trabalho") {
      alvoZe = { x: pontos3D.padaria.x, z: pontos3D.padaria.z + 9 };
      alvoMaria = { x: pontos3D.farmacia.x, z: pontos3D.farmacia.z + 9 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z - 9 };
    } else if (novoEstado === "fofoca_boteco") {
      alvoZe = { x: pontos3D.boteco.x + 2, z: pontos3D.boteco.z - 5 };
      alvoMaria = { x: pontos3D.boteco.x - 2, z: pontos3D.boteco.z - 5 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z - 8 };
    } else if (novoEstado === "descanso") {
      alvoZe = { x: pontos3D.casaRoxa.x, z: pontos3D.casaRoxa.z - 5 };
      alvoMaria = { x: pontos3D.farmacia.x, z: pontos3D.farmacia.z - 5 };
      alvoTiao = { x: pontos3D.boteco.x, z: pontos3D.boteco.z + 5 };
    }
  }
}

const qtdChuva = 500; const geoChuva = new THREE.BufferGeometry(); const posChuva = new Float32Array(qtdChuva * 3);
for (let i = 0; i < qtdChuva * 3; i += 3) {
  posChuva[i] = (Math.random() - 0.5) * 350; posChuva[i+1] = Math.random() * 50; posChuva[i+2] = (Math.random() - 0.5) * 350;
}
geoChuva.setAttribute("position", new THREE.BufferAttribute(posChuva, 3));
const sistemaChuva = new THREE.Points(geoChuva, new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.25, transparent: true, opacity: 0.7 }));
sistemaChuva.visible = false; scene.add(sistemaChuva);

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

let tempoGlobal = 0; let horaSimulada = 10;
function animate() {
  requestAnimationFrame(animate);
  tempoGlobal += 0.05;
  processarMovimentoTeclado();

  if (lagoMesh) lagoMesh.rotation.z = Math.sin(tempoGlobal * 0.5) * 0.05;

  portasInterativas.forEach(p => {
    p.anguloAtual = THREE.MathUtils.lerp(p.anguloAtual, p.anguloAlvo, 0.1);
    p.group.rotation.y = p.anguloAtual;
  });

  if (noVeiculo) {
    if (moveInput.z !== 0) velocidadeCarro = THREE.MathUtils.lerp(velocidadeCarro, -moveInput.z * 0.55, 0.05);
    else velocidadeCarro = THREE.MathUtils.lerp(velocidadeCarro, 0, 0.08);

    if (Math.abs(velocidadeCarro) > 0.02) anguloDirecaoCarro -= moveInput.x * 0.05 * Math.sign(velocidadeCarro);
    carroGroup.rotation.y = anguloDirecaoCarro;

    const proximoX = carroGroup.position.x + Math.sin(anguloDirecaoCarro) * velocidadeCarro;
    const proximoZ = carroGroup.position.z + Math.cos(anguloDirecaoCarro) * velocidadeCarro;

    if (!checarColisao(proximoX, proximoZ, 1.8)) {
      carroGroup.position.x = proximoX; carroGroup.position.z = proximoZ;
    } else velocidadeCarro = 0;

    playerGroup.position.copy(carroGroup.position);
    camera.position.x += (carroGroup.position.x - controls.target.x);
    camera.position.z += (carroGroup.position.z - controls.target.z);
    controls.target.copy(carroGroup.position);
  } else {
    if (emPulo) {
      playerGroup.position.y += velocidadeY; velocidadeY += gravidade;
      if (playerGroup.position.y <= 0) { playerGroup.position.y = 0; emPulo = false; velocidadeY = 0; }
    }

    if (moveInput.x !== 0 || moveInput.z !== 0) {
      const cameraAngle = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
      const moveX = moveInput.x * Math.cos(cameraAngle) + moveInput.z * Math.sin(cameraAngle);
      const moveZ = -moveInput.x * Math.sin(cameraAngle) + moveInput.z * Math.cos(cameraAngle);

      const proxX = playerGroup.position.x + moveX * velocidadeBaseJogador;
      const proxZ = playerGroup.position.z + moveZ * velocidadeBaseJogador;

      const deltaX = (checarColisao(proxX, playerGroup.position.z, 0.6) ? playerGroup.position.x : proxX) - playerGroup.position.x;
      const deltaZ = (checarColisao(playerGroup.position.x, proxZ, 0.6) ? playerGroup.position.z : proxZ) - playerGroup.position.z;

      playerGroup.position.x += deltaX; playerGroup.position.z += deltaZ;
      if (deltaX !== 0 || deltaZ !== 0) playerGroup.rotation.y = Math.atan2(deltaX, deltaZ);

      camera.position.x += deltaX; camera.position.z += deltaZ;
      controls.target.x += deltaX; controls.target.z += deltaZ;

      animarPassos(playerGroup, true, tempoGlobal);
      if (Math.floor(tempoGlobal * 10) % 4 === 0) tocarSomPasso();
    } else animarPassos(playerGroup, false, tempoGlobal);
  }

  checarAproximacaoNpcs(); checarConclusaoMissao();

  horaSimulada = (horaSimulada + 0.005) % 24;
  const horaFormatada = Math.floor(horaSimulada);
  const eNoite = horaSimulada >= 18 || horaSimulada < 6;
  const rHud = document.getElementById("relogioHud");
  if (rHud) rHud.innerText = "🕒 " + String(horaFormatada).padStart(2, "0") + ":00 - " + (eNoite ? "Noite 🌙" : "Dia ☀️");

  atualizarRotinaAutomaticaNpcs(horaFormatada);
  scene.background.lerp(eNoite ? corNoite : corDia, 0.02);

  if (chovendo) {
    const pos = sistemaChuva.geometry.attributes.position.array;
    for (let i = 1; i < qtdChuva * 3; i += 3) { pos[i] -= 2.0; if (pos[i] < 0) pos[i] = 50; }
    sistemaChuva.geometry.attributes.position.needsUpdate = true;
  }

  const velocidadeNpc = 0.015;
  const dxZe = alvoZe.x - seuZeGroup.position.x; const dzZe = alvoZe.z - seuZeGroup.position.z;
  if (Math.sqrt(dxZe * dxZe + dzZe * dzZe) > 0.2) {
    seuZeGroup.position.x += dxZe * velocidadeNpc; seuZeGroup.position.z += dzZe * velocidadeNpc;
    seuZeGroup.rotation.y = Math.atan2(dxZe, dzZe); animarPassos(seuZeGroup, true, tempoGlobal);
  } else animarPassos(seuZeGroup, false, tempoGlobal);

  const dxMaria = alvoMaria.x - donaMariaGroup.position.x; const dzMaria = alvoMaria.z - donaMariaGroup.position.z;
  if (Math.sqrt(dxMaria * dxMaria + dzMaria * dzMaria) > 0.2) {
    donaMariaGroup.position.x += dxMaria * velocidadeNpc; donaMariaGroup.position.z += dzMaria * velocidadeNpc;
    donaMariaGroup.rotation.y = Math.atan2(dxMaria, dzMaria); animarPassos(donaMariaGroup, true, tempoGlobal);
  } else animarPassos(donaMariaGroup, false, tempoGlobal);

  const dxTiao = alvoTiao.x - tiaoGroup.position.x; const dzTiao = alvoTiao.z - tiaoGroup.position.z;
  if (Math.sqrt(dxTiao * dxTiao + dzTiao * dzTiao) > 0.2) {
    tiaoGroup.position.x += dxTiao * velocidadeNpc; tiaoGroup.position.z += dzTiao * velocidadeNpc;
    tiaoGroup.rotation.y = Math.atan2(dxTiao, dzTiao); animarPassos(tiaoGroup, true, tempoGlobal);
  } else animarPassos(tiaoGroup, false, tempoGlobal);

  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

socket.on("resposta_npc", (data) => {
  const { npcId, decisao } = data;
  adicionarMensagemChat(npcId, decisao.fala);
  falarVozNavegador(decisao.fala);
  atualizarMovimentoNpc(npcId, decisao.destino);
  exibirBalaoNpc(npcId, decisao.fala);
});

socket.on("conversa_entre_npcs", (data) => {
  adicionarMensagemChat(data.falante, data.fala);
  falarVozNavegador(data.fala);
  atualizarMovimentoNpc(data.falante, data.decisao.destino);
  exibirBalaoNpc(data.falante, data.fala);
});

function exibirBalaoNpc(npcId, texto) {
  if (npcs[npcId]) {
    if (npcs[npcId].spriteBalao) npcs[npcId].group.remove(npcs[npcId].spriteBalao);
    const sprite = criarBalaoFala3D(texto);
    npcs[npcId].group.add(sprite); npcs[npcId].spriteBalao = sprite;
    setTimeout(() => {
      if (npcs[npcId].spriteBalao) { npcs[npcId].group.remove(npcs[npcId].spriteBalao); npcs[npcId].spriteBalao = null; }
    }, 6000);
  }
}

function atualizarHud() {
  const m = document.getElementById("moedasHud");
  if (m) m.innerText = "🪙 " + moedas + " Moedas";
}

function adicionarMensagemChat(npcId, texto) {
  const log = document.getElementById("chatLog");
  if (!log) return;
  let nome = "Você"; let cssClass = "voce";
  if (npcId === "seu_ze") { nome = "Seu Zé"; cssClass = "seu_ze"; }
  else if (npcId === "dona_maria") { nome = "Dona Maria"; cssClass = "dona_maria"; }
  else if (npcId === "tiao_bar") { nome = "Tião do Bar"; cssClass = "tiao_bar"; }
  
  log.innerHTML += '<div class="msg ' + cssClass + '"><strong>' + nome + ':</strong> ' + texto + '</div>';
  log.scrollTop = log.scrollHeight;
}

const offsetsIniciais = { seu_ze: { x: 0, z: 2.0 }, dona_maria: { x: 0, z: 2.0 }, tiao_bar: { x: 0, z: -2.0 } };

function atualizarMovimentoNpc(npcId, destino) {
  if (!destino) return;
  const destLimpo = String(destino).toLowerCase();
  let chave = null;
  if (destLimpo.includes("casa")) chave = "casaRoxa";
  else if (destLimpo.includes("padaria")) chave = "padaria";
  else if (destLimpo.includes("praca") || destLimpo.includes("praça")) chave = "praca";
  else if (destLimpo.includes("farmacia") || destLimpo.includes("farmácia")) chave = "farmacia";
  else if (destLimpo.includes("boteco") || destLimpo.includes("bar")) chave = "boteco";
  else if (destLimpo.includes("igreja")) chave = "igreja";

  if (chave && pontos3D[chave]) {
    const d = pontos3D[chave];
    const offset = offsetsIniciais[npcId] || { x: 0, z: 0 };
    const xFinal = d.x + offset.x; const zFinal = d.z + offset.z;
    if (npcId === "seu_ze") { alvoZe.x = xFinal; alvoZe.z = zFinal; }
    else if (npcId === "dona_maria") { alvoMaria.x = xFinal; alvoMaria.z = zFinal; }
    else if (npcId === "tiao_bar") { alvoTiao.x = xFinal; alvoTiao.z = zFinal; }
  }
}