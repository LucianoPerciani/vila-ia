import { registrarObjetoSolido } from './config.js';

export let lagoMesh = null;

export function carregarMapa(scene) {
  // TERRENO PRINCIPAL
  const floorGeo = new THREE.PlaneGeometry(500, 500);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x48bb78, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // MALHA URBANA E CALÇADAS
  const ruaMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
  const calcadaMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });

  // Avenida Principal + Calçadas
  const avPrincipal = new THREE.Mesh(new THREE.PlaneGeometry(400, 14), ruaMat);
  avPrincipal.rotation.x = -Math.PI / 2; avPrincipal.position.set(0, 0.02, 0); scene.add(avPrincipal);

  const faixaCentral = new THREE.Mesh(new THREE.PlaneGeometry(400, 0.4), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
  faixaCentral.rotation.x = -Math.PI / 2; faixaCentral.position.set(0, 0.03, 0); scene.add(faixaCentral);

  const calcadaAvNorte = new THREE.Mesh(new THREE.PlaneGeometry(400, 3), calcadaMat);
  calcadaAvNorte.rotation.x = -Math.PI / 2; calcadaAvNorte.position.set(0, 0.04, -8.5); scene.add(calcadaAvNorte);

  const calcadaAvSul = new THREE.Mesh(new THREE.PlaneGeometry(400, 3), calcadaMat);
  calcadaAvSul.rotation.x = -Math.PI / 2; calcadaAvSul.position.set(0, 0.04, 8.5); scene.add(calcadaAvSul);

  // Ruas Verticais + Calçadas
  [0, 100, -100].forEach(posX => {
    const rua = new THREE.Mesh(new THREE.PlaneGeometry(14, 300), ruaMat);
    rua.rotation.x = -Math.PI / 2; rua.position.set(posX, 0.02, 0); scene.add(rua);

    const calcEsq = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), calcadaMat);
    calcEsq.rotation.x = -Math.PI / 2; calcEsq.position.set(posX - 8.5, 0.04, 0); scene.add(calcEsq);

    const calcDir = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), calcadaMat);
    calcDir.rotation.x = -Math.PI / 2; calcDir.position.set(posX + 8.5, 0.04, 0); scene.add(calcDir);
  });

  // Postes de Luz
  for (let x = -150; x <= 150; x += 40) {
    criarPosteLuz(scene, x, -11);
    criarPosteLuz(scene, x, 11);
  }

  // Praça e Lago
  criarPracaCentral(scene, 0, -90);
  criarLagoComPonte(scene, -140, 60);

  // Árvores Decorativas
  [
    [-140, -45], [-70, -45], [70, -45], [140, -45],
    [-140, 45], [70, 45], [140, 45]
  ].forEach(p => criarArvoreVoxel(scene, p[0], p[1]));

  return floor;
}

function criarPosteLuz(scene, x, z) {
  const g = new THREE.Group();
  const poste = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
  poste.position.y = 2.75; g.add(poste);

  const topo = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 1.0), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
  topo.position.y = 5.6; g.add(topo);

  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  bulb.position.y = 5.3; g.add(bulb);

  g.position.set(x, 0, z);
  scene.add(g);
  registrarObjetoSolido(x - 0.5, x + 0.5, z - 0.5, z + 0.5);
}

function criarPracaCentral(scene, x, z) {
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
    const bg = new THREE.Group();
    const matM = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const assento = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.3, 1.2), matM); assento.position.y = 0.7; bg.add(assento);
    const encosto = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.2, 0.3), matM); encosto.position.set(0, 1.3, -0.5); bg.add(encosto);
    bg.position.set(bx, 0, bz); bg.rotation.y = rotY; g.add(bg);
  }

  criarBancoPraca(0, 12, 0);
  criarBancoPraca(0, -12, Math.PI);
  criarBancoPraca(12, 0, -Math.PI / 2);
  criarBancoPraca(-12, 0, Math.PI / 2);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 5, x + 5, z - 5, z + 5);
}

function criarLagoComPonte(scene, x, z) {
  const g = new THREE.Group();
  
  const bordaGeo = new THREE.RingGeometry(18, 22, 24);
  const bordaMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9, side: THREE.DoubleSide });
  const borda = new THREE.Mesh(bordaGeo, bordaMat);
  borda.rotation.x = -Math.PI / 2; borda.position.y = 0.05; g.add(borda);

  const aguaGeo = new THREE.CircleGeometry(19, 24);
  const aguaMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, transparent: true, opacity: 0.85 });
  lagoMesh = new THREE.Mesh(aguaGeo, aguaMat);
  lagoMesh.rotation.x = -Math.PI / 2; lagoMesh.position.y = 0.08; g.add(lagoMesh);

  const ponteMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const ponteChao = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 42), ponteMat);
  ponteChao.position.set(0, 0.3, 0); g.add(ponteChao);

  const corrimaoEsq = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 42), ponteMat);
  corrimaoEsq.position.set(-2.8, 1.0, 0); g.add(corrimaoEsq);
  const corrimaoDir = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 42), ponteMat);
  corrimaoDir.position.set(2.8, 1.0, 0); g.add(corrimaoDir);

  g.position.set(x, 0, z);
  scene.add(g);

  registrarObjetoSolido(x - 22, x - 3, z - 22, z + 22);
  registrarObjetoSolido(x + 3, x + 22, z - 22, z + 22);
}

function criarArvoreVoxel(scene, x, z) {
  const g = new THREE.Group();
  const tronco = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), new THREE.MeshStandardMaterial({ color: 0x543310, roughness: 0.9 }));
  tronco.position.y = 2; g.add(tronco);

  const folhaMat = new THREE.MeshStandardMaterial({ color: 0x1e5128, roughness: 0.7 });
  const f1 = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2, 3.5), folhaMat); f1.position.y = 4; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), folhaMat); f2.position.y = 5.5; g.add(f2);

  g.position.set(x, 0, z); scene.add(g);
  registrarObjetoSolido(x - 0.6, x + 0.6, z - 0.6, z + 0.6);
}
