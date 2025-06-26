const { sendToGemini } = require('./geminiService');
const {
    addJadwal, updateJadwal, deleteJadwal, getJadwalAktif, clearAllJadwal,
    addCatatan, clearAllCatatan, loadJSON, catatanPath
} = require('./dataManager');
const { formatAdminPrompt, formatCustomerPrompt } = require('./promptManager');

async function handleIncomingMessage(msg, ADMIN_JID, client) {
    const from = msg.from;
    const body = msg.body.trim();
    const isAdmin = from === ADMIN_JID;

    console.log(`Pesan masuk dari: ${from}`);
    console.log(`Body pesan: "${body}"`);
    console.log(`Apakah dari Admin (${ADMIN_JID})? ${isAdmin}`);

    if (isAdmin) {
        const prompt = formatAdminPrompt(body);
        let geminiResponse = await sendToGemini(prompt);
        console.log("Respon mentah Gemini untuk admin:", geminiResponse);

        let commandParsed = null;
        let isJson = false;

        try {
            const cleanResponse = geminiResponse.replace(/```json\n?|```/g, '').trim();
            console.log("DEBUG: Respon Gemini bersih (setelah hapus markdown):", cleanResponse);

            commandParsed = JSON.parse(cleanResponse);
            isJson = true;
        } catch (e) {
            console.warn("DEBUG: Respons Gemini BUKAN JSON. Akan membalas sebagai teks biasa. Error:", e.message);
            isJson = false;
        }

        if (isJson) {
            if (commandParsed.action === "add_jadwal") {
                addJadwal(commandParsed.description);
                await msg.reply(`📅 Jadwal berhasil ditambahkan, Tuan: "${commandParsed.description}"`);
            } else if (commandParsed.action === "update_jadwal") {
                if (typeof commandParsed.id === 'number' && commandParsed.id > 0 && commandParsed.new_description) {
                    const updated = updateJadwal(commandParsed.id, commandParsed.new_description);
                    if (updated) {
                        await msg.reply(`✅ Jadwal dengan ID ${commandParsed.id} berhasil diperbarui, Tuan: "${commandParsed.new_description}".`);
                    } else {
                        await msg.reply(`❓ Maaf, Tuan. Jadwal dengan ID ${commandParsed.id} tidak ditemukan. Tidak ada perubahan.`);
                    }
                } else {
                    await msg.reply("❌ Perintah update jadwal tidak valid, Tuan. Pastikan ID dan deskripsi baru diberikan.");
                }
            } else if (commandParsed.action === "delete_jadwal") {
                if (typeof commandParsed.id === 'number' && commandParsed.id > 0) {
                    const deleted = deleteJadwal(commandParsed.id);
                    if (deleted) {
                        await msg.reply(`🗑️ Jadwal dengan ID ${commandParsed.id} berhasil dihapus, Tuan.`);
                    } else {
                        await msg.reply(`❓ Maaf, Tuan. Jadwal dengan ID ${commandParsed.id} tidak ditemukan.`);
                    }
                } else {
                    await msg.reply("❌ ID jadwal tidak valid, Tuan. Pastikan ID adalah angka positif.");
                }
            } else if (commandParsed.action === "view_jadwal") {
                const jadwal = getJadwalAktif();
                if (jadwal.length > 0) {
                    const responseText = `Daftar jadwal aktif Anda, Tuan:\n${jadwal.map(j => {
                        const jadwalTime = new Date(j.waktu);
                        return `- ID: ${j.id}, ${jadwalTime.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'short' })} pukul ${jadwalTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}: ${j.deskripsi}`;
                    }).join('\n')}\n\nApakah ada jadwal lain yang ingin Tuan kelola?`;
                    await msg.reply(responseText);
                } else {
                    await msg.reply("Tidak ada jadwal aktif saat ini, Tuan. Apakah ada yang bisa saya bantu jadwalkan?");
                }
            } else if (commandParsed.action === "clear_jadwal") {
                clearAllJadwal();
                await msg.reply("✅ Semua jadwal telah dihapus, Tuan.");
            } else if (commandParsed.action === "add_catatan") {
                addCatatan(commandParsed.content);
                await msg.reply(`📝 Catatan berhasil disimpan, Tuan: "${commandParsed.content}"`);
            } else if (commandParsed.action === "view_catatan") {
                const catatan = loadJSON(catatanPath);
                if (catatan.length > 0) {
                    const responseText = `Daftar catatan Anda, Tuan:\n${catatan.map(c => `- ${c.isi} (ditambahkan pada ${new Date(c.waktu).toLocaleDateString('id-ID')})`).join('\n')}\n\nApakah ada catatan lain yang ingin Tuan tambahkan?`;
                    await msg.reply(responseText);
                } else {
                    await msg.reply("Tidak ada catatan tersimpan saat ini, Tuan.");
                }
            } else if (commandParsed.action === "clear_catatan") {
                clearAllCatatan();
                await msg.reply("✅ Semua catatan telah dihapus, Tuan.");
            } else {
                await msg.reply("🤷‍♂️ Maaf, Tuan. Perintah yang Anda berikan tidak dikenali atau formatnya tidak sesuai.");
            }
        } else {
            await msg.reply(geminiResponse.replace(/```json\n?|```/g, '').trim());
        }
    } else {
        const jadwalAktif = getJadwalAktif();
        const isMekanikBusy = jadwalAktif.length > 0;
        const nextJadwal = isMekanikBusy ? jadwalAktif[0] : null;

        const prompt = formatCustomerPrompt(body, isMekanikBusy, nextJadwal);
        const customerResponse = await sendToGemini(prompt);
        await msg.reply(customerResponse.replace(/```json\n?|```/g, '').trim());

        let notificationToAdmin = `❗ *Permintaan Pelanggan Baru:*\nDari: ${from}\nPesan: "${body}"\n`;
        if (isMekanikBusy) {
            const jadwalTime = new Date(nextJadwal.waktu);
            notificationToAdmin += `*Status Mekanik:* Sedang sibuk dengan jadwal "${nextJadwal.deskripsi}" hingga pukul ${jadwalTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.\n`;
            notificationToAdmin += `*Balasan ke Pelanggan:* "${customerResponse.replace(/```json\n?|```/g, '').trim()}"\nMohon dicek ya, Tuan.`;
        } else {
            notificationToAdmin += `*Status Mekanik:* Sedang tidak ada jadwal aktif.\n`;
            notificationToAdmin += `*Balasan ke Pelanggan:* "${customerResponse.replace(/```json\n?|```/g, '').trim()}"\nPelanggan menunggu informasi lokasi dan kendala, Tuan.`;
        }

        try {
            await client.sendMessage(ADMIN_JID, notificationToAdmin);
            console.log(`✅ Notifikasi permintaan pelanggan dikirim ke admin: ${notificationToAdmin}`);
        } catch (error) {
            console.error('❌ Gagal mengirim notifikasi pelanggan ke admin:', error.message);
        }
    }
}

module.exports = { handleIncomingMessage };