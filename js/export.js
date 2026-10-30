/**
 * Export Engine (Excel XLSX & Print/PDF)
 * SIMP-TBS Kelapa Sawit
 */

class ExportManager {
  // Export Data Panen ke Excel (.xlsx)
  exportHarvestToExcel(logs, filename = 'Laporan_Panen_TBS_Kelapa_Sawit.xlsx') {
    if (typeof XLSX === 'undefined') {
      alert('Library SheetJS belum termuat. Pastikan koneksi internet aktif.');
      return;
    }

    const afdelings = window.simpStore.getAfdelings();
    const bloks = window.simpStore.getBloks();
    const mandors = window.simpStore.getMandors();
    const pemanens = window.simpStore.getHarvesters();

    // Map logs to clean table rows
    const rows = logs.map((log, idx) => {
      const afd = afdelings.find(a => a.id === log.afdelingId);
      const blk = bloks.find(b => b.id === log.blokId);
      const mdr = mandors.find(m => m.id === log.mandorId);
      const pmn = pemanens.find(p => p.id === log.pemanenId);

      return {
        'No': idx + 1,
        'ID Tiket': log.id,
        'Tanggal': log.tanggal,
        'Afdeling': afd ? afd.kode : log.afdelingId,
        'Blok': blk ? blk.kode : log.blokId,
        'Luas Blok (Ha)': blk ? blk.luasHa : '-',
        'Mandor': mdr ? mdr.nama : '-',
        'Pemanen': pmn ? pmn.nama : '-',
        'Janjang': log.janjang,
        'Berat TBS (Kg)': log.beratTbsKg,
        'Brondolan (Kg)': log.brondolanKg,
        'Total Berat (Kg)': log.totalKg,
        'Total Berat (Ton)': log.totalTon,
        'BJR (Kg/Janjang)': log.bjr,
        'Jam Kerja': `${log.jamMulai || '-'} s/d ${log.jamSelesai || '-'}`,
        'Kondisi Lapangan': log.kondisiLapangan || '-'
      };
    });

    // Summary calculation
    const totalJanjang = logs.reduce((a, c) => a + (c.janjang || 0), 0);
    const totalTbsKg = logs.reduce((a, c) => a + (c.beratTbsKg || 0), 0);
    const totalBrondolanKg = logs.reduce((a, c) => a + (c.brondolanKg || 0), 0);
    const totalKg = logs.reduce((a, c) => a + (c.totalKg || 0), 0);
    const totalTon = Number((totalKg / 1000).toFixed(3));
    const avgBjr = totalJanjang > 0 ? Number((totalTbsKg / totalJanjang).toFixed(2)) : 0;

    // Add empty row and summary row
    rows.push({});
    rows.push({
      'No': 'TOTAL / RATA-RATA',
      'ID Tiket': `${logs.length} Transaksi`,
      'Tanggal': '',
      'Afdeling': '',
      'Blok': '',
      'Luas Blok (Ha)': '',
      'Mandor': '',
      'Pemanen': '',
      'Janjang': totalJanjang,
      'Berat TBS (Kg)': totalTbsKg,
      'Brondolan (Kg)': totalBrondolanKg,
      'Total Berat (Kg)': totalKg,
      'Total Berat (Ton)': totalTon,
      'BJR (Kg/Janjang)': avgBjr,
      'Jam Kerja': '',
      'Kondisi Lapangan': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    
    // Auto column widths
    const colWidths = [
      { wch: 6 },  // No
      { wch: 12 }, // ID Tiket
      { wch: 12 }, // Tanggal
      { wch: 10 }, // Afdeling
      { wch: 10 }, // Blok
      { wch: 14 }, // Luas
      { wch: 18 }, // Mandor
      { wch: 18 }, // Pemanen
      { wch: 10 }, // Janjang
      { wch: 14 }, // TBS Kg
      { wch: 14 }, // Brondolan Kg
      { wch: 15 }, // Total Kg
      { wch: 15 }, // Total Ton
      { wch: 15 }, // BJR
      { wch: 18 }, // Jam Kerja
      { wch: 35 }  // Kondisi
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktivitas Panen TBS');
    XLSX.writeFile(workbook, filename);
  }

  // Export Komprehensif Produktivitas & Kinerja ke Excel
  exportFullReportToExcel(filename = 'Laporan_Produktivitas_dan_Kinerja_Sawit.xlsx') {
    if (typeof XLSX === 'undefined') {
      alert('Library SheetJS belum termuat. Pastikan koneksi internet aktif.');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sheet 1: Produktivitas Blok
    const blokData = window.simpStore.getBlockProductivityList().map((b, i) => ({
      'No': i + 1,
      'Kode Blok': b.kode,
      'Afdeling': b.afdelingKode,
      'Luas (Ha)': b.luasHa,
      'Tahun Tanam': b.tahunTanam,
      'Varietas Bibit': b.varietas,
      'Jumlah Pokok': b.jumlahPokok,
      'Total Janjang': b.totalJanjang,
      'Total Produksi (Ton)': b.totalTon,
      'Produktivitas (Ton/Ha)': b.tonPerHa,
      'BJR (Kg/Janjang)': b.bjr,
      'Status': b.statusPanen
    }));
    const wsBlok = XLSX.utils.json_to_sheet(blokData);
    XLSX.utils.book_append_sheet(workbook, wsBlok, 'Produktivitas Blok');

    // Sheet 2: Kinerja Pemanen
    const pemanenData = window.simpStore.getHarvesterPerformanceList().map((p, i) => ({
      'Peringkat': i + 1,
      'NIK': p.nik,
      'Nama Pemanen': p.nama,
      'Afdeling': p.afdelingNama,
      'Total Janjang': p.totalJanjang,
      'Total TBS (Kg)': p.totalKg,
      'Total TBS (Ton)': p.totalTon,
      'Brondolan (Kg)': p.totalBrondolanKg,
      'Rata-rata Kg/Hari': p.avgKgPerDay,
      'Target Kg/Hari': p.targetHarianKg,
      'Pencapaian Target (%)': p.targetAchievementPercent,
      'Kehadiran (%)': p.kehadiranPercent,
      'Rating Kualitas (%)': p.ratingKualitas,
      'Losses (%)': p.lossesPersen
    }));
    const wsPemanen = XLSX.utils.json_to_sheet(pemanenData);
    XLSX.utils.book_append_sheet(workbook, wsPemanen, 'Kinerja Pemanen');

    // Sheet 3: Produktivitas Afdeling
    const afdData = window.simpStore.getAfdelingProductivityList().map((a, i) => ({
      'No': i + 1,
      'Kode': a.kode,
      'Nama Divisi': a.nama,
      'Luas Areal (Ha)': a.luasHa,
      'Mandor Utama': a.mandorUtama,
      'Realisasi (Ton)': a.totalTon,
      'Target (Ton)': a.targetTon,
      'Pencapaian (%)': a.pencapaianPercent,
      'Produktivitas (Ton/Ha)': a.tonPerHa,
      'Rata-rata BJR (Kg)': a.bjr
    }));
    const wsAfd = XLSX.utils.json_to_sheet(afdData);
    XLSX.utils.book_append_sheet(workbook, wsAfd, 'Ringkasan Afdeling');

    XLSX.writeFile(workbook, filename);
  }

  // Cetak Dokumen Langsung (Native Print Preview)
  triggerPrint() {
    window.print();
  }
}

// Global ExportManager
window.simpExport = new ExportManager();
