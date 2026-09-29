import { registrarObjetoSolido } from './config.js';
import { tocarSomPorta } from './audio.js';

export const portasInterativas = [];

export const pontos3D = {
  padaria: { x: -80, z: -22 },
  igreja: { x: 0, z: -28 },
  farmacia: { x: 80, z: -22 },
  boteco: { x: -80, z: 22 },
  minhaCasa: { x: -30, z: 25 },
  casaRoxa: { x: 60, z: 22 },
  praca: { x: 0, z: -90 }
};

export function criarPortaInterativa(scene, x, z, rotY = 0) {
  const gPorta = new THREE.Group();
  const matPorta = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  const meshPorta = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.0, 0.3), matPorta);
  meshPorta.position.set(1.1, 2.0, 0);

  gPorta.add(meshPorta);
  gPorta.position.set(x, 0, z);
  gPorta.rotation.y = rotY;
  scene.add(gPorta);

  portasInterativas.push({ group: gPorta, aberta: false, anguloAlvo: 0, anguloAtual: 0 });
}

export function checarEAlternarPortasProximas(pos) {
  portasInterativas.forEach(p => {
    const dist = pos.distanceTo(p.group.position);
    if (dist <= 4.5) {
      p.aberta = !p.aberta;
      p.anguloAlvo = p.aberta ? Math.PI / 2 : 0;
      tocarSomPorta();
    }
  });
}

export function criarCercaAoRedor(scene, x, z, largura = 20, profundidade = 18, temPortaoFrente = true, rotY = 0) {
  const g = new THREE.Group();
  const matMadeira = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  function criarPalanque(px, pz) {
    const palanque = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.4), matMadeira);
    palanque.position.set(px, 0.8, pz);
    g.add(palanque);
  }

  function criarRipa(rx, rz, tamX, tamZ) {
    const ripa1 = new THREE.Mesh(new THREE.BoxGeometry(tamX, 0.2, tamZ), matMadeira);
    ripa1.position.set(rx, 0.6, rz);
    g.add(ripa1);

    const ripa2 = new THREE.Mesh(new THREE.BoxGeometry(tamX, 0.2, tamZ), matMadeira);
    ripa2.position.set(rx, 1.2, rz);
    g.add(ripa2);
  }

  const medioL = largura / 2;
  const medioP = profundidade / 2;

  for (let p = -medioP; p <= medioP; p += 3) {
    criarPalanque(-medioL, p);
    criarPalanque(medioL, p);
    if (p + 3 <= medioP) {
      criarRipa(-medioL, p + 1.5, 0.2, 3);
      criarRipa(medioL, p + 1.5, 0.2, 3);
    }
  }

  for (let l = -medioL; l <= medioL; l += 3) {
    criarPalanque(l, -medioP);
    if (l + 3 <= medioL) {
      criarRipa(l + 1.5, -medioP, 3, 0.2);
    }
  }

  for (let l = -medioL; l <= medioL; l += 3) {
    if (temPortaoFrente && Math.abs(l) < 3) continue;
    criarPalanque(l, medioP);
    if (l + 3 <= medioL && (!temPortaoFrente || Math.abs(l + 1.5) >= 3)) {
      criarRipa(l + 1.5, medioP, 3, 0.2);
    }
  }

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);

  registrarObjetoSolido(x - medioL, x + medioL, z - medioP - 0.2, z - medioP + 0.2);
  registrarObjetoSolido(x - medioL - 0.2, x - medioL + 0.2, z - medioP, z + medioP);
  registrarObjetoSolido(x + medioL - 0.2, x + medioL + 0.2, z - medioP, z + medioP);
}

export function criarCasaCompletaEntravel(scene, x, z, corParede, corTelhado, rotY = 0) {
  const g = new THREE.Group();
  const matP = new THREE.MeshStandardMaterial({ color: corParede, roughness: 0.6 });
  const matT = new THREE.MeshStandardMaterial({ color: corTelhado, roughness: 0.4 });
  const matPiso = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(11, 0.2, 11), matPiso);
  piso.position.y = 0.1; g.add(piso);

  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 0.8), matP); pFundo.position.set(0, 3, -5.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 12), matP); pEsq.position.set(-5.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 12), matP); pDir.position.set(5.6, 3, 0); g.add(pDir);

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6, 0.8), matP); pFrenteEsq.position.set(-3.7, 3, 5.6); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6, 0.8), matP); pFrenteDir.position.set(3.7, 3, 5.6); g.add(pFrenteDir);
  const pFrenteTopo = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2, 0.8), matP); pFrenteTopo.position.set(0, 5, 5.6); g.add(pFrenteTopo);

  const telhado = new THREE.Mesh(new THREE.ConeGeometry(9.5, 4.5, 4), matT);
  telhado.position.y = 8.2; telhado.rotation.y = Math.PI / 4; g.add(telhado);

  g.position.set(x, 0, z); g.rotation.y = rotY; scene.add(g);

  registrarObjetoSolido(x - 6, x + 6, z - 6, z - 5);
  registrarObjetoSolido(x - 6, x - 5, z - 6, z + 6);
  registrarObjetoSolido(x + 5, x + 6, z - 6, z + 6);

  criarPortaInterativa(scene, x - 1.2, z + 5.6, rotY);
  criarCercaAoRedor(scene, x, z, 18, 18, true, rotY);
}

export function criarPadariaDetalhada(scene, x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.4 });
  const matVidro = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4 });
  const matToldo = new THREE.MeshStandardMaterial({ color: 0xb91c1c });
  const matBalcao = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
  const matPao = new THREE.MeshStandardMaterial({ color: 0xf59e0b });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 13), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.8), matParede); pFundo.position.set(0, 3, -6.1); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pEsq.position.set(-7.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pDir.position.set(7.6, 3, 0); g.add(pDir);

  const pFrenteEsq = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteEsq.position.set(-6.2, 3, 6.1); g.add(pFrenteEsq);
  const pFrenteDir = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 0.8), matParede); pFrenteDir.position.set(6.2, 3, 6.1); g.add(pFrenteDir);
  const pFrenteTopo = new THREE.Mesh(new THREE.BoxGeometry(15, 1.8, 0.8), matParede); pFrenteTopo.position.set(0, 5.1, 6.1); g.add(pFrenteTopo);

  const vitrine1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrine1.position.set(-3.5, 2.4, 6.1); g.add(vitrine1);
  const vitrine2 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.2, 0.2), matVidro); vitrine2.position.set(3.5, 2.4, 6.1); g.add(vitrine2);

  const toldo = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 3), matToldo); toldo.position.set(0, 4.3, 7.2); toldo.rotation.x = 0.2; g.add(toldo);
  const placa = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xfef08a })); placa.position.set(0, 5.6, 6.4); g.add(placa);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 14.5), matTelhado); telhado.position.y = 6.6; g.add(telhado);
  const balcao = new THREE.Mesh(new THREE.BoxGeometry(8, 2.0, 1.8), matBalcao); balcao.position.set(0, 1.0, 1.5); g.add(balcao);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8, x + 8, z - 6.5, z + 6.5);
  criarPortaInterativa(scene, x - 1.6, z + 6.1, 0);
}

export function criarFarmaciaDetalhada(scene, x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.5 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
  const matCruz = new THREE.MeshBasicMaterial({ color: 0x22c55e });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 13), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 0.8), matParede); pFundo.position.set(0, 3, -6.1); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pEsq.position.set(-7.6, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 13), matParede); pDir.position.set(7.6, 3, 0); g.add(pDir);

  const cruzH = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.4), matCruz); cruzH.position.set(0, 5.4, 6.4); g.add(cruzH);
  const cruzV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6, 0.4), matCruz); cruzV.position.set(0, 5.4, 6.4); g.add(cruzV);

  const telhado = new THREE.Mesh(new THREE.BoxGeometry(17, 1.2, 14.5), matTelhado); telhado.position.y = 6.6; g.add(telhado);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8, x + 8, z - 6.5, z + 6.5);
  criarPortaInterativa(scene, x - 1.6, z + 6.1, 0);
}

export function criarBotecoDetalhado(scene, x, z) {
  const g = new THREE.Group();
  const matPiso = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const matParede = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
  const matTelhado = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
  const matSinuca = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7 });
  const matMadeiraEscura = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });

  const piso = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 14), matPiso); piso.position.y = 0.1; g.add(piso);
  const pFundo = new THREE.Mesh(new THREE.BoxGeometry(17, 6, 0.8), matParede); pFundo.position.set(0, 3, 6.6); g.add(pFundo);
  const pEsq = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pEsq.position.set(-8.1, 3, 0); g.add(pEsq);
  const pDir = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6, 14), matParede); pDir.position.set(8.1, 3, 0); g.add(pDir);

  const placa = new THREE.Mesh(new THREE.BoxGeometry(10, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xf59e0b })); placa.position.set(0, 5.6, -6.9); g.add(placa);
  const telhado = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 15.5), matTelhado); telhado.position.y = 6.6; g.add(telhado);

  // Mesa de Sinuca
  const gSinuca = new THREE.Group();
  const bordaSinuca = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 6.2), matMadeiraEscura); bordaSinuca.position.y = 0.85; gSinuca.add(bordaSinuca);
  const panoVerde = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 5.6), matSinuca); panoVerde.position.y = 1.45; gSinuca.add(panoVerde);
  gSinuca.position.set(2.5, 0, 0); g.add(gSinuca);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 8.5, x + 8.5, z - 7.0, z + 7.0);
  criarPortaInterativa(scene, x - 1.6, z - 6.6, 0);
}
