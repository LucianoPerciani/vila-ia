// Configurações Globais e Estado do Jogo
export const state = {
  moedas: 50,
  inventario: [],
  audioAtivo: false,
  chovendo: false,
  modoConstrucao: false,
  modoApagarAtivo: false,
  chatVisivel: true,
  modoEntradaVoz: false,
  corBlocoAtual: 0x38bdf8,
  velocidadeBaseJogador: 0.28,

  // Veículo
  noVeiculo: false,
  velocidadeCarro: 0,
  anguloDirecaoCarro: 0,

  // Loja & Missões
  temLanterna: false,
  missaoAtiva: null,

  // Física
  emPulo: false,
  velocidadeY: 0,
  gravidade: -0.018,
  forcaPulo: 0.38
};

// Colisões do Mapa
export const caixasColisao = [];

export function registrarObjetoSolido(xMin, xMax, zMin, zMax) {
  caixasColisao.push({ xMin, xMax, zMin, zMax });
}

export function checarColisao(novoX, novoZ, raio = 0.8) {
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
