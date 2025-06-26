const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');

// Pastikan folder database ada
const dbPath = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath);

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "bot" }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🤖 WA-B siap digunakan'));
client.on('authenticated', () => console.log('✅ WhatsApp authenticated!'));
client.on('auth_failure', msg => console.error('❌ WhatsApp authentication failure!', msg));
client.on('disconnected', reason => console.log('🔌 WhatsApp disconnected!', reason));

module.exports = client;