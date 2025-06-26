// --- Fungsi untuk parsing waktu dari teks ---
function parseTimeFromText(text) {
    const timeRegex = /(?:pada|di|jam|pukul)\s*(\d{1,2}(?:\.\d{2})?)(?:\s*(siang|malam|pagi|sore|subuh|dini hari))?/i;
    const dateKeywordRegex = /(hari ini|besok|lusa|minggu depan|hari (senin|selasa|rabu|kamis|jumat|sabtu|minggu))/i;

    const timeMatch = text.match(timeRegex);
    const dateKeywordMatch = text.match(dateKeywordRegex);

    let date = new Date(); // Default hari ini

    if (dateKeywordMatch) {
        const keyword = dateKeywordMatch[1].toLowerCase();
        const todayDay = date.getDay(); // 0=Minggu, 1=Senin...

        if (keyword === 'besok') {
            date.setDate(date.getDate() + 1);
        } else if (keyword === 'lusa') {
            date.setDate(date.getDate() + 2);
        } else if (keyword === 'minggu depan') {
            date.setDate(date.getDate() + 7);
        } else if (dateKeywordMatch[2]) { // If a specific day of the week is mentioned
            const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
            const mentionedDay = dayNames.indexOf(dateKeywordMatch[2].toLowerCase());
            if (mentionedDay !== -1) {
                let diff = mentionedDay - todayDay;
                if (diff < 0) { // If the day has already passed this week, target next week
                    diff += 7;
                }
                date.setDate(date.getDate() + diff);
            }
        }
    }

    if (timeMatch) {
        let hour = parseInt(timeMatch[1].split('.')[0], 10);
        let minute = timeMatch[1].includes('.') ? parseInt(timeMatch[1].split('.')[1], 10) : 0;
        const period = timeMatch[2]?.toLowerCase();

        if (period === 'siang' && hour < 12) hour += 12;
        else if (period === 'malam' && hour < 12) hour += 12;
        else if (period === 'sore' && hour < 12) hour += 12;
        else if (period === 'pagi' && hour === 12) hour = 0; // 12 pagi adalah 00:xx

        date.setHours(hour, minute, 0, 0);

        const now = new Date();
        // Jika waktu yang di-parse sudah lewat pada hari yang sama, asumsikan besok
        if (date < now && !dateKeywordMatch) { // Hanya jika tidak ada keyword hari (hari ini, besok, lusa, dll.)
            date.setDate(date.getDate() + 1);
        }
        return date.toISOString();
    }
    // Jika tidak ada waktu spesifik, default 1 jam dari sekarang
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

module.exports = { parseTimeFromText };