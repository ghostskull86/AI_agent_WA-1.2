const client = require('./whatsappClient');
const { handleIncomingMessage } = require('./messageHandler');
const { checkAndRemind } = require('./dataManager');
const cron = require('node-cron');
require('dotenv').config();

const ADMIN_NUMBER_RAW = process.env.ADMIN_NUMBER;

if (!ADMIN_NUMBER_RAW) {
    console.error("❌ Error: ADMIN_NUMBER tidak ditemukan di file .env. Pastikan Anda telah mengaturnya.");
    process.exit(1);
}

const ADMIN_JID = `${ADMIN_NUMBER_RAW.replace(/\D/g, '')}@c.us`;
console.log(`✅ Admin JID diatur ke: ${ADMIN_JID}`);

// Event listener untuk pesan masuk
client.on('message', (msg) => handleIncomingMessage(msg, ADMIN_JID, client));

// Pengingat terjadwal setiap menit
cron.schedule('* * * * *', async () => {
    console.log('Running scheduled reminder check...');
    const notif = checkAndRemind();
    if (notif) {
        console.log(`Sending reminder to admin: ${notif}`);
        try {
            await client.sendMessage(ADMIN_JID, notif);
        } catch (error) {
            console.error('❌ Gagal mengirim pengingat ke admin:', error.message);
        }
    }
});

// Inisialisasi WhatsApp Client
client.initialize();