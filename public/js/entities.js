import { pontos3D } from './buildings.js';

export function criarBalaoFala3D(texto) {
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

export function criarPersonagemArticuladoHD(corCamisa, corCalca, acessorio) {
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
  chap.position.y = 3.6; chap.visible = (acessorio === 'chapeu'); g.add(chap);

  const caixaEntrega = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
  );
  caixaEntrega.position.set(0, 1.9, 0.75); caixaEntrega.visible = false; g.add(caixaEntrega);

  const lanternaMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
  lanternaMesh.rotation.x = Math.PI / 2; lanternaMesh.position.set(0, -0.4, 0.3); lanternaMesh.visible = false; pivotBracoDir.add(lanternaMesh);

  g.userData = { 
    pivotBracoEsq, pivotBracoDir, pivotPernaEsq, pivotPernaDir, 
    matCamisa, matCalca, chapeuMesh: chap, caixaEntrega, lanternaMesh
  };
  return g;
}

export function criarCarroVoxel(scene, x, z) {
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

export function animarPassos(group, andando, tempo) {
  const u = group.userData;
  if (!u || !u.pivotBracoEsq) return;
  if (andando) {
    const angulo = Math.sin(tempo * 10) * 0.7;
    u.pivotBracoEsq.rotation.x = angulo; u.pivotBracoDir.rotation.x = -angulo;
    u.pivotPernaEsq.rotation.x = -angulo; u.pivotPernaDir.rotation.x = angulo;
  } else {
    u.pivotBracoEsq.rotation.x = 0; u.pivotBracoDir.rotation.x = 0;
    u.pivotPernaEsq.rotation.x = 0; u.pivotPernaDir.rotation.x = 0;
  }
}
