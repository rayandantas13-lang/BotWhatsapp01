const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { Groq } = require('groq-sdk');
const fs = require('fs');
const path = require('path');

// ⚠️ COLE SUA CHAVE DA API GROQ AQUI ⚠️
// Obtenha sua chave em: https://console.groq.com/keys
const GROQ_API_KEY = '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'; // Exemplo: 'sk_****************************'

// Configuração do cliente Groq
const groq = new Groq({
    apiKey: GROQ_API_KEY,
});

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './whatsapp_auth'
    }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: process.env.CHROMIUM_PATH || undefined
    }
});

// Carrega o prompt do sistema
let systemPrompt = "Você é um assistente virtual prestativo. Seja conciso e amigável em suas respostas.";
const promptPath = path.join(__dirname, 'system_prompt.txt');
if (fs.existsSync(promptPath)) {
    systemPrompt = fs.readFileSync(promptPath, 'utf8');
} else if (fs.existsSync(path.join(__dirname, 'system_prompt.txt'))) {
    systemPrompt = fs.readFileSync(path.join(__dirname, 'system_prompt.txt'), 'utf8');
}

client.on('qr', (qr) => {
    console.log('\n--- ESCANEIE O QR CODE ABAIXO NO WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n✅ Bot conectado ao WhatsApp com sucesso!');
});

client.on('message', async (msg) => {
    try {
        if (msg.from.includes('@g.us')) return;

        console.log(`📩 Nova mensagem de ${msg.from}: ${msg.body}`);

        // Verifica se a chave API foi configurada
        if (!GROQ_API_KEY || GROQ_API_KEY === 'COLE_SUA_CHAVE_GROQ_AQUI') {
            throw new Error('Chave da API Groq não configurada. Cole sua chave no código.');
        }

        const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile", // ⬅️ TROQUE AQUI
    messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: msg.body }
    ],
    temperature: 0.7,
    max_tokens: 500,
});

        const aiResponse = completion.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

        await msg.reply(aiResponse);
        console.log('🤖 Resposta enviada.');

    } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error.message);
        
        // Mensagens de erro mais específicas
        if (error.message.includes('Chave da API')) {
            await msg.reply("❌ Erro: Bot não configurado. O administrador precisa configurar a chave da API.");
        } else if (error.message.includes('429')) {
            await msg.reply("⚠️ Limite de requisições atingido. Tente novamente mais tarde.");
        } else if (error.message.includes('401') || error.message.includes('authentication')) {
            await msg.reply("🔒 Erro de autenticação. A chave da API pode estar inválida.");
        } else {
            await msg.reply("Ocorreu um erro ao processar sua mensagem. Tente novamente em instantes.");
        }
    }
});

client.initialize();