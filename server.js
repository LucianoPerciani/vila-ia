import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Groq from 'groq-sdk';
import { JSONFilePreset } from 'lowdb/node';
import 'dotenv/config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- BANCO PERSISTENTE ---
const defaultData = { memorias: [] };
const db = await JSONFilePreset('db.json', defaultData);

function buscarHistoricoNPC(npcId, limite = 6) {
  const mensagens = db.data.memorias
    .filter(m => m.npc_id === npcId)
    .slice(-limite);
  return mensagens.map(m => `${m.autor}: "${m.mensagem}"`).join('\n');
}

async function salvarMemoria(npcId, autor, mensagem) {
  db.data.memorias.push({
    npc_id: npcId,
    autor: autor,
    mensagem: mensagem,
    timestamp: new Date().toISOString()
  });
  await db.write();
}

// --- PERSONAGENS ---
const personagens = {
  seu_ze: {
    nome: "Seu Zé",
    prompt: `Você é o "Seu Zé", padeiro simpático. Vende Pão Quentinho por 5 moedas.`
  },
  dona_maria: {
    nome: "Dona Maria",
    prompt: `Você é a "Dona Maria", farmacêutica e herbalista. Vende Chá de Camomila por 8 moedas.`
  },
  tiao_bar: {
    nome: "Tião",
    prompt: `Você é o "Tião", dono do boteco da vila. Amigável, conhece todas as fofocas da cidade e adora bater papo. Vende "Guaraná trincando" por 6 moedas.`
  }
};

// --- IA GROQ ---
async function processarAcaoPersonagem(npcKey, mensagem, contexto, historico) {
  const npcInfo = personagens[npcKey] || personagens.seu_ze;

  const promptSistema = `
${npcInfo.prompt}
Você se lembra de conversas passadas.

IMPORTANTE: Responda obrigatoriamente e exclusivamente em formato json com a seguinte estrutura válida:
{
  "fala": "Sua resposta falada em português",
  "proximaAcao": "MOVER_PARA" | "CONTINUAR_PARADO",
  "destino": "padaria" | "praca" | "casa" | "farmacia" | "boteco" | null,
  "venda": {
    "item": "Pão Quentinho" | "Chá de Camomila" | "Guaraná Gelado" | null,
    "preco": 5 | 8 | 6 | 0
  }
}
`.trim();

  const promptTurno = `
[ESTADO DA VILA]
- Horário: ${contexto.horario || 'Dia'}

[HISTÓRICO DE ${npcInfo.nome.toUpperCase()}]
${historico || "Nenhuma conversa anterior registrada."}

[INTERAÇÃO]: "${mensagem}"
`.trim();

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: promptSistema },
        { role: 'user', content: promptTurno }
      ],
      model: 'openai/gpt-oss-20b',
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    return JSON.parse(chatCompletion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Erro no Groq:", err.message);
    return {
      fala: "Eita, me perdi nas contas...",
      proximaAcao: "CONTINUAR_PARADO",
      destino: null,
      venda: { item: null, preco: 0 }
    };
  }
}

// --- RELÓGIO DA VILA ---
let horaJogo = 10;
setInterval(() => {
  horaJogo = (horaJogo + 1) % 24;
  let faseDia = 'manha';
  if (horaJogo >= 12 && horaJogo < 18) faseDia = 'tarde';
  else if (horaJogo >= 18 || horaJogo < 6) faseDia = 'noite';

  io.emit('atualizar_horario', { hora: horaJogo, fase: faseDia });
}, 15000);

// --- WEBSOCKETS ---
io.on('connection', (socket) => {
  socket.on('falar_com_npc', async (dados) => {
    const { mensagem, npcId, contextoMundo } = dados;

    await salvarMemoria(npcId, "Jogador", mensagem);
    const historico = buscarHistoricoNPC(npcId, 6);
    const decisao = await processarAcaoPersonagem(npcId, mensagem, contextoMundo, historico);

    const nomeAutor = personagens[npcId] ? personagens[npcId].nome : "NPC";
    await salvarMemoria(npcId, nomeAutor, decisao.fala);

    socket.emit('resposta_npc', { npcId, decisao });
  });

  socket.on('npc_conversar_npc', async (dados) => {
    const { npcOrigem, npcDestino, falaInicial } = dados;
    const historicoDestino = buscarHistoricoNPC(npcDestino, 4);
    const autorNome = personagens[npcOrigem] ? personagens[npcOrigem].nome : "Morador";
    
    const decisaoResposta = await processarAcaoPersonagem(
      npcDestino, 
      `${autorNome} disse: "${falaInicial}"`, 
      { horario: "Dia" }, 
      historicoDestino
    );

    await salvarMemoria(npcOrigem, personagens[npcOrigem].nome, falaInicial);
    await salvarMemoria(npcDestino, personagens[npcDestino].nome, decisaoResposta.fala);

    io.emit('conversa_entre_npcs', {
      falante: npcDestino,
      fala: decisaoResposta.fala,
      decisao: decisaoResposta
    });
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
