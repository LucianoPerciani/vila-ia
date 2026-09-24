import Groq from 'groq-sdk';
import 'dotenv/config';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listarModelos() {
  try {
    const modelos = await groq.models.list();
    console.log("\n--- SEUS MODELOS DISPONÍVEIS NO GROQ ---");
    modelos.data.forEach(m => console.log(`• ${m.id}`));
    console.log("----------------------------------------\n");
  } catch (err) {
    console.error("Erro ao listar modelos:", err.message);
  }
}

listarModelos();
