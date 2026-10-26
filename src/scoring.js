// ============================================================================
// Mesin scoring 13 KPI untuk klien INTERIOR (bobot persis dari Work Flow CS).
// Tiap kriteria bersifat biner: terpenuhi => dapat bobot penuh, tidak => 0.
// Total maksimum = 100%. (Contoh di tabel menghasilkan 79,31%.)
// ============================================================================

const CRITERIA = [
  {
    no: 1,
    key: 'identitas_customer',
    label: 'Identitas customer (status)',
    weight: 2.0,
    media: 'Chat',
    // "met" = terpenuhi / lolos syarat
    condition:
      'Identitas & status customer sudah diketahui (nama dan konteks kebutuhannya, mis. butuh renovasi ruang kerja).',
  },
  {
    no: 2,
    key: 'alamat_project',
    label: 'Alamat Project',
    weight: 2.0,
    media: 'Chat',
    condition: 'Alamat lokasi project sudah disebutkan (jalan/kelurahan/kota).',
  },
  {
    no: 3,
    key: 'segment',
    label: 'Segment',
    weight: 7.69,
    media: 'Gmaps',
    condition:
      'Segmen/nilai aset lokasi tergolong layak, yaitu perkiraan nilai aset DI ATAS Rp 1,5 Milyar (dicek via Gmaps/lokasi).',
  },
  {
    no: 4,
    key: 'layout_foto_existing',
    label: 'Layout dan Foto Existing',
    weight: 7.69,
    media: 'Chat',
    condition:
      'Customer sudah mengirim layout DAN foto kondisi existing ruangan (lampiran foto benar-benar diterima).',
  },
  {
    no: 5,
    key: 'estimasi_anggaran',
    label: 'Estimasi Anggaran',
    weight: 15.0,
    media: 'Chat',
    condition: 'Customer sudah menyebutkan estimasi anggaran/budget (mis. sekitar 500 juta, bisa nego).',
  },
  {
    no: 6,
    key: 'pengalaman_interior',
    label: 'Pengalaman Pertama atau nggak bikin interior',
    weight: 3.0,
    media: 'Chat',
    condition:
      'Customer SUDAH PERNAH membuat interior sebelumnya (bukan pertama kali). Jika baru pertama kali, kriteria TIDAK terpenuhi.',
  },
  {
    no: 7,
    key: 'bersedia_cf',
    label: 'Bersedia membayar CF (Consultation Fee)',
    weight: 20.0,
    media: 'Chat',
    condition: 'Customer menyatakan BERSEDIA membayar Consultation Fee (CF).',
  },
  {
    no: 8,
    key: 'paham_alur_kerja',
    label: 'Sudah memahami alur kerja',
    weight: 5.0,
    media: 'Video',
    condition: 'Customer sudah menonton/memahami penjelasan alur kerja Mowy.',
  },
  {
    no: 9,
    key: 'detail_interior',
    label: 'Detail Interior yang akan dibuat',
    weight: 10.0,
    media: 'Chat',
    condition:
      'Ruangan/detail interior yang akan dikerjakan sudah jelas (mis. ruang tamu, dapur, ruang kerja).',
  },
  {
    no: 10,
    key: 'tema_konsep',
    label: 'Tema atau konsep yang diinginkan',
    weight: 2.0,
    media: 'Katalog Konsep',
    condition: 'Tema/konsep yang diinginkan sudah diketahui atau sudah dikirimi opsi konsep dan dipilih.',
  },
  {
    no: 11,
    key: 'pic_owner',
    label: 'PIC nya owner langsung atau dengan assistant',
    weight: 10.0,
    media: 'Chat',
    condition:
      'PIC yang akan ditemui saat survey jelas (owner langsung atau asisten yang mewakili owner).',
  },
  {
    no: 12,
    key: 'kunjungan_kantor',
    label: 'Setelah Survey mau berkunjung atau tidak ke kantor',
    weight: 10.0,
    media: 'Chat',
    condition:
      'Customer bersedia berkunjung ke kantor dalam waktu dekat setelah survey. Jika menolak atau menunda lama (mis. baru 2 bulan ke depan), kriteria TIDAK terpenuhi.',
  },
  {
    no: 13,
    key: 'validasi_rekap',
    label: 'Validasi (Rekapan berupa .pdf hasil wawancara di chat)',
    weight: 5.62,
    media: 'Chat atau Telp',
    condition:
      'Customer sudah menerima rekap .pdf hasil wawancara DAN mengonfirmasi bahwa isinya benar.',
  },
];

const TOTAL_WEIGHT = CRITERIA.reduce((s, c) => s + c.weight, 0); // = 100.00

// Hitung skor dari map evaluasi: { key: { met: bool, value: string } }
function computeScore(evaluations = {}) {
  const breakdown = CRITERIA.map((c) => {
    const ev = evaluations[c.key] || {};
    const met = ev.met === true;
    return {
      no: c.no,
      key: c.key,
      label: c.label,
      media: c.media,
      weight: round2(c.weight),
      met,
      earned: round2(met ? c.weight : 0),
      value: ev.value || '',
    };
  });

  const total = round2(breakdown.reduce((s, b) => s + b.earned, 0));
  return { total, max: round2(TOTAL_WEIGHT), breakdown };
}

// Label suhu lead berdasarkan total skor (ambang bisa Anda sesuaikan).
function temperature(total) {
  if (total >= 70) return 'Hot';
  if (total >= 40) return 'Warm';
  return 'Cold';
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

module.exports = { CRITERIA, TOTAL_WEIGHT, computeScore, temperature };
