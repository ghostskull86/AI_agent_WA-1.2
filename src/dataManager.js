const fs = require('fs');
const path = require('path');
const { parseTimeFromText } = require('./utils');

// === Path file JSON ===
const dbPath = path.join(__dirname, '..', 'database'); // Kembali satu direktori dari src
const jadwalPath = path.join(dbPath, 'jadwal.json');
const catatanPath = path.join(dbPath, 'catatan.json');

// === Fungsi bantu untuk membaca & menyimpan JSON ===
function loadJSON(file) {
    try {
        if (!fs.existsSync(file)) {
            console.log(`DEBUG: File tidak ditemukan: ${file}. Membuat file baru.`);
            fs.writeFileSync(file, '[]', 'utf-8');
            return [];
        }
        const raw = fs.readFileSync(file, 'utf-8').trim();
        console.log(`DEBUG: Membaca file ${file}. Konten mentah: '${raw}'`);

        if (raw === '' || raw === 'null' || raw === 'undefined') {
            console.log(`DEBUG: File ${file} kosong atau tidak valid. Menulis ulang dengan '[]'.`);
            fs.writeFileSync(file, '[]', 'utf-8');
            return [];
        }

        const parsedData = JSON.parse(raw);
        if (!Array.isArray(parsedData)) {
            console.error(`❌ Gagal parsing ${file}: Konten bukan array. Menulis ulang dengan '[]'.`);
            fs.writeFileSync(file, '[]', 'utf-8');
            return [];
        }
        return parsedData;
    } catch (err) {
        console.error(`❌ Gagal parsing ${file}: ${err.message}. Mencoba memperbaiki file dengan menulis ulang '[]'.`);
        try {
            fs.writeFileSync(file, '[]', 'utf-8');
        } catch (writeErr) {
            console.error(`❌ Gagal menulis ulang ${file} setelah error parsing: ${writeErr.message}`);
        }
        return [];
    }
}

function saveJSON(file, data) {
    if (!Array.isArray(data)) {
        console.error(`❌ ERROR: Mencoba menyimpan data non-array ke ${file}. Data tidak disimpan.`);
        return;
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`DEBUG: Data berhasil disimpan ke ${file}.`);
}

// === Jadwal ===
function addJadwal(deskripsiLengkap) {
    const waktuISO = parseTimeFromText(deskripsiLengkap);
    let data = loadJSON(jadwalPath);
    if (!Array.isArray(data)) {
        console.error("❌ addJadwal: Data jadwal bukan array. Menginisialisasi ulang.");
        data = [];
    }
    data.push({
        id: Date.now(),
        waktu: waktuISO,
        deskripsi: deskripsiLengkap
    });
    saveJSON(jadwalPath, data);
}

function updateJadwal(id, newDescription) {
    let data = loadJSON(jadwalPath);
    if (!Array.isArray(data)) {
        console.error("❌ updateJadwal: Data jadwal bukan array. Tidak dapat memperbarui.");
        return false;
    }
    const index = data.findIndex(j => j.id === id);
    if (index !== -1) {
        const waktuISO = parseTimeFromText(newDescription);
        data[index].deskripsi = newDescription;
        data[index].waktu = waktuISO;
        saveJSON(jadwalPath, data);
        return true;
    }
    return false;
}

function getJadwalAktif() {
    const now = new Date();
    const loadedJadwal = loadJSON(jadwalPath);
    if (!Array.isArray(loadedJadwal)) {
        console.error("❌ getJadwalAktif: Data jadwal bukan array. Mengembalikan array kosong.");
        return [];
    }

    let activeJadwal = loadedJadwal.filter(j => new Date(j.waktu) > now);
    activeJadwal.sort((a, b) => new Date(a.waktu) - new Date(b.waktu));

    let updatedJadwal = activeJadwal.filter(j => new Date(j.waktu) > now);
    if (updatedJadwal.length !== loadedJadwal.length) {
        saveJSON(jadwalPath, updatedJadwal);
    }
    return updatedJadwal;
}

function deleteJadwal(id) {
    let data = loadJSON(jadwalPath);
    if (!Array.isArray(data)) {
        console.error("❌ deleteJadwal: Data jadwal bukan array. Tidak dapat menghapus.");
        return false;
    }
    const initialLength = data.length;
    data = data.filter(j => j.id !== id);
    if (data.length < initialLength) {
        saveJSON(jadwalPath, data);
        return true;
    }
    return false;
}

function clearAllJadwal() {
    saveJSON(jadwalPath, []);
}

function checkAndRemind() {
    const now = new Date();
    let reminderMessage = null;
    let updatedJadwal = [];

    const jadwalData = loadJSON(jadwalPath);
    if (!Array.isArray(jadwalData)) {
        console.error("❌ checkAndRemind: Data jadwal bukan array. Tidak dapat memeriksa pengingat.");
        return null;
    }

    for (const j of jadwalData) {
        const jadwalTime = new Date(j.waktu);
        // Cek apakah waktu jadwal sama dengan waktu sekarang (dalam menit)
        if (jadwalTime.getFullYear() === now.getFullYear() &&
            jadwalTime.getMonth() === now.getMonth() &&
            jadwalTime.getDate() === now.getDate() &&
            jadwalTime.getHours() === now.getHours() &&
            jadwalTime.getMinutes() === now.getMinutes()) {
            reminderMessage = `🔔 PENGINGAT, Tuan: Jadwal Anda *${j.deskripsi}* SEKARANG!`;
        } else if (jadwalTime > now) {
            updatedJadwal.push(j);
        }
    }
    saveJSON(jadwalPath, updatedJadwal);
    return reminderMessage;
}

// === Catatan ===
function addCatatan(teks) {
    let data = loadJSON(catatanPath);
    if (!Array.isArray(data)) {
        console.error("❌ addCatatan: Data catatan bukan array. Menginisialisasi ulang.");
        data = [];
    }
    const waktu = new Date().toISOString();
    data.push({ waktu, isi: teks });
    saveJSON(catatanPath, data);
}

function clearAllCatatan() {
    saveJSON(catatanPath, []);
}

module.exports = {
    addJadwal,
    updateJadwal,
    getJadwalAktif,
    deleteJadwal,
    clearAllJadwal,
    checkAndRemind,
    addCatatan,
    clearAllCatatan,
    loadJSON, // Diekspor juga jika ada kebutuhan di luar module ini
    catatanPath, // Diekspor untuk akses langsung jika diperlukan di prompt
    jadwalPath // Diekspor untuk akses langsung jika diperlukan di prompt
};