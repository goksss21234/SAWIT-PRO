/**
 * Storage & Data Management Layer (LocalStorage)
 * SIMP-TBS Kelapa Sawit
 */

const STORAGE_KEY = 'SIMP_TBS_DATA_V1';
const ROLE_KEY = 'SIMP_TBS_ACTIVE_ROLE';

class Store {
  constructor() {
    this.data = this.loadData();
    this.activeRole = localStorage.getItem(ROLE_KEY) || 'admin';
  }

  loadData() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading data from localStorage, falling back to seed data', e);
    }
    // Inisialisasi awal dari SEED_DATA
    const initial = JSON.parse(JSON.stringify(SEED_DATA));
    this.saveData(initial);
    return initial;
  }

  saveData(dataToSave) {
    try {
      this.data = dataToSave || this.data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving data to localStorage', e);
    }
  }

  resetToDefault() {
    const initial = JSON.parse(JSON.stringify(SEED_DATA));
    this.saveData(initial);
    return this.data;
  }

  // --- ROLE MANAGEMENT ---
  getActiveRole() {
    return this.activeRole;
  }

  setActiveRole(role) {
    if (['admin', 'mandor', 'manajer'].includes(role)) {
      this.activeRole = role;
      localStorage.setItem(ROLE_KEY, role);
      window.dispatchEvent(new CustomEvent('simp:roleChanged', { detail: { role } }));
    }
  }

  // --- ESTATE INFO ---
  getEstateInfo() {
    return this.data.estateInfo || SEED_DATA.estateInfo;
  }

  updateEstateInfo(info) {
    this.data.estateInfo = { ...this.data.estateInfo, ...info };
    this.saveData();
  }

  // --- AFDELINGS ---
  getAfdelings() {
    return this.data.afdelings || [];
  }

  getAfdelingById(id) {
    return this.getAfdelings().find(a => a.id === id);
  }

  // --- BLOKS ---
  getBloks() {
    return this.data.bloks || [];
  }

  getBlockById(id) {
    return this.getBloks().find(b => b.id === id);
  }

  addBlock(block) {
    if (!block.id) {
      block.id = 'BLK-' + (block.kode || Date.now());
    }
    this.data.bloks.push(block);
    this.saveData();
    return block;
  }

  updateBlock(updatedBlock) {
    const idx = this.data.bloks.findIndex(b => b.id === updatedBlock.id);
    if (idx !== -1) {
      this.data.bloks[idx] = { ...this.data.bloks[idx], ...updatedBlock };
      this.saveData();
      return this.data.bloks[idx];
    }
    return null;
  }

  deleteBlock(id) {
    this.data.bloks = this.data.bloks.filter(b => b.id !== id);
    this.saveData();
  }

  // --- MANDORS ---
  getMandors() {
    return this.data.mandors || [];
  }

  getMandorById(id) {
    return this.getMandors().find(m => m.id === id);
  }

  // --- PEMANEN ---
  getHarvesters() {
    return this.data.pemanen || [];
  }

  getHarvesterById(id) {
    return this.getHarvesters().find(p => p.id === id);
  }

  addHarvester(harvester) {
    if (!harvester.id) {
      harvester.id = 'PMN-' + Date.now().toString().slice(-4);
    }
    this.data.pemanen.push(harvester);
    this.saveData();
    return harvester;
  }

  updateHarvester(updatedHarvester) {
    const idx = this.data.pemanen.findIndex(p => p.id === updatedHarvester.id);
    if (idx !== -1) {
      this.data.pemanen[idx] = { ...this.data.pemanen[idx], ...updatedHarvester };
      this.saveData();
      return this.data.pemanen[idx];
    }
    return null;
  }

  deleteHarvester(id) {
    this.data.pemanen = this.data.pemanen.filter(p => p.id !== id);
    this.saveData();
  }

  // --- TARGETS ---
  getTargets() {
    return this.data.targets || SEED_DATA.targets;
  }

  updateTargets(targets) {
    this.data.targets = targets;
    this.saveData();
  }

  // --- HARVEST LOGS (AKTIVITAS PANEN) ---
  getHarvestLogs() {
    return this.data.harvestLogs || [];
  }

  getHarvestById(id) {
    return this.getHarvestLogs().find(h => h.id === id);
  }

  addHarvest(log) {
    if (!log.id) {
      log.id = 'HVT-' + Date.now().toString().slice(-5);
    }

    // Auto-kalkulasi
    const janjang = Number(log.janjang) || 0;
    const beratTbsKg = Number(log.beratTbsKg) || 0;
    const brondolanKg = Number(log.brondolanKg) || 0;

    log.bjr = janjang > 0 ? Number((beratTbsKg / janjang).toFixed(2)) : 0;
    log.totalKg = beratTbsKg + brondolanKg;
    log.totalTon = Number((log.totalKg / 1000).toFixed(3));

    this.data.harvestLogs.unshift(log);
    this.saveData();
    return log;
  }

  updateHarvest(updatedLog) {
    const idx = this.data.harvestLogs.findIndex(h => h.id === updatedLog.id);
    if (idx !== -1) {
      const janjang = Number(updatedLog.janjang) || 0;
      const beratTbsKg = Number(updatedLog.beratTbsKg) || 0;
      const brondolanKg = Number(updatedLog.brondolanKg) || 0;

      updatedLog.bjr = janjang > 0 ? Number((beratTbsKg / janjang).toFixed(2)) : 0;
      updatedLog.totalKg = beratTbsKg + brondolanKg;
      updatedLog.totalTon = Number((updatedLog.totalKg / 1000).toFixed(3));

      this.data.harvestLogs[idx] = { ...this.data.harvestLogs[idx], ...updatedLog };
      this.saveData();
      return this.data.harvestLogs[idx];
    }
    return null;
  }

  deleteHarvest(id) {
    this.data.harvestLogs = this.data.harvestLogs.filter(h => h.id !== id);
    this.saveData();
  }

  // --- CALCULATION & ANALYTICS ENGINE ---

  // Helper tanggal lokal YYYY-MM-DD
  getTodayString() {
    // Gunakan tanggal data demo terkini jika ada, atau tanggal sistem
    const logs = this.getHarvestLogs();
    if (logs.length > 0) {
      const dates = logs.map(l => l.tanggal).sort().reverse();
      return dates[0]; // Tanggal data terbaru
    }
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  getTodayStats() {
    const todayStr = this.getTodayString();
    const todayLogs = this.getHarvestLogs().filter(h => h.tanggal === todayStr);

    const totalKg = todayLogs.reduce((acc, cur) => acc + (cur.totalKg || 0), 0);
    const totalTon = Number((totalKg / 1000).toFixed(3));
    const totalJanjang = todayLogs.reduce((acc, cur) => acc + (cur.janjang || 0), 0);
    const totalBrondolan = todayLogs.reduce((acc, cur) => acc + (cur.brondolanKg || 0), 0);

    const activeHarvestersCount = new Set(todayLogs.map(h => h.pemanenId)).size;
    const harvestedBlockIds = new Set(todayLogs.map(h => h.blokId));
    const totalBlocks = this.getBloks().length;
    const harvestedBlocksCount = harvestedBlockIds.size;
    const unharvestedBlocksCount = Math.max(0, totalBlocks - harvestedBlocksCount);

    const targetHarianTon = this.getTargets().kebun.targetHarianTon || 45;
    const achievementPercent = targetHarianTon > 0 ? Number(((totalTon / targetHarianTon) * 100).toFixed(1)) : 0;

    const avgProductivityPerHarvesterKg = activeHarvestersCount > 0 ? Math.round(totalKg / activeHarvestersCount) : 0;
    const overallBjr = totalJanjang > 0 ? Number(((totalKg - totalBrondolan) / totalJanjang).toFixed(2)) : 0;

    return {
      todayStr,
      totalKg,
      totalTon,
      totalJanjang,
      totalBrondolan,
      activeHarvestersCount,
      totalBlocks,
      harvestedBlocksCount,
      unharvestedBlocksCount,
      targetHarianTon,
      achievementPercent,
      avgProductivityPerHarvesterKg,
      overallBjr
    };
  }

  getMonthStats() {
    const todayStr = this.getTodayString();
    const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"

    const monthLogs = this.getHarvestLogs().filter(h => h.tanggal.startsWith(currentMonthPrefix));
    const totalKg = monthLogs.reduce((acc, cur) => acc + (cur.totalKg || 0), 0);
    const totalTon = Number((totalKg / 1000).toFixed(3));
    const totalJanjang = monthLogs.reduce((acc, cur) => acc + (cur.janjang || 0), 0);

    const targetBulananTon = this.getTargets().kebun.targetBulananTon || 1250;
    const achievementPercent = targetBulananTon > 0 ? Number(((totalTon / targetBulananTon) * 100).toFixed(1)) : 0;

    return {
      currentMonthPrefix,
      totalKg,
      totalTon,
      totalJanjang,
      targetBulananTon,
      achievementPercent,
      logsCount: monthLogs.length
    };
  }

  // Produktivitas per Blok
  getBlockProductivityList() {
    const bloks = this.getBloks();
    const logs = this.getHarvestLogs();

    return bloks.map(blok => {
      const blokLogs = logs.filter(h => h.blokId === blok.id);
      const totalKg = blokLogs.reduce((acc, cur) => acc + (cur.totalKg || 0), 0);
      const totalTon = Number((totalKg / 1000).toFixed(3));
      const totalJanjang = blokLogs.reduce((acc, cur) => acc + (cur.janjang || 0), 0);
      const bjr = totalJanjang > 0 ? Number((blokLogs.reduce((a, c) => a + (c.beratTbsKg || 0), 0) / totalJanjang).toFixed(2)) : 0;
      const tonPerHa = blok.luasHa > 0 ? Number((totalTon / blok.luasHa).toFixed(2)) : 0;
      const afdeling = this.getAfdelingById(blok.afdelingId);

      return {
        ...blok,
        afdelingNama: afdeling ? afdeling.nama : blok.afdelingId,
        afdelingKode: afdeling ? afdeling.kode : '',
        totalPanenKali: blokLogs.length,
        totalJanjang,
        totalTon,
        totalKg,
        bjr,
        tonPerHa
      };
    }).sort((a, b) => b.tonPerHa - a.tonPerHa);
  }

  // Produktivitas per Afdeling
  getAfdelingProductivityList() {
    const afdelings = this.getAfdelings();
    const logs = this.getHarvestLogs();
    const targets = this.getTargets().afdeling || {};

    return afdelings.map(afd => {
      const afdLogs = logs.filter(h => h.afdelingId === afd.id);
      const totalKg = afdLogs.reduce((acc, cur) => acc + (cur.totalKg || 0), 0);
      const totalTon = Number((totalKg / 1000).toFixed(3));
      const totalJanjang = afdLogs.reduce((acc, cur) => acc + (cur.janjang || 0), 0);
      const bjr = totalJanjang > 0 ? Number((afdLogs.reduce((a, c) => a + (c.beratTbsKg || 0), 0) / totalJanjang).toFixed(2)) : 0;
      const tonPerHa = afd.luasHa > 0 ? Number((totalTon / afd.luasHa).toFixed(2)) : 0;
      const targetTon = targets[afd.id] ? targets[afd.id].targetBulananTon : 400;
      const pencapaianPercent = targetTon > 0 ? Number(((totalTon / targetTon) * 100).toFixed(1)) : 0;

      return {
        ...afd,
        totalJanjang,
        totalTon,
        totalKg,
        bjr,
        tonPerHa,
        targetTon,
        pencapaianPercent
      };
    });
  }

  // Leaderboard & Kinerja Karyawan Pemanen
  getHarvesterPerformanceList() {
    const harvesters = this.getHarvesters();
    const logs = this.getHarvestLogs();

    return harvesters.map(pmn => {
      const pmnLogs = logs.filter(h => h.pemanenId === pmn.id);
      const totalKg = pmnLogs.reduce((acc, cur) => acc + (cur.totalKg || 0), 0);
      const totalTon = Number((totalKg / 1000).toFixed(3));
      const totalJanjang = pmnLogs.reduce((acc, cur) => acc + (cur.janjang || 0), 0);
      const totalBrondolanKg = pmnLogs.reduce((acc, cur) => acc + (cur.brondolanKg || 0), 0);
      const daysWorked = new Set(pmnLogs.map(l => l.tanggal)).size || 1;
      const avgKgPerDay = Math.round(totalKg / daysWorked);
      const targetKgPerDay = pmn.targetHarianKg || 1200;
      const targetAchievementPercent = Number(((avgKgPerDay / targetKgPerDay) * 100).toFixed(1));

      const kehadiranPercent = pmn.totalHariKerja > 0 ? Number(((pmn.hadirHari / pmn.totalHariKerja) * 100).toFixed(1)) : 90;
      const afdeling = this.getAfdelingById(pmn.afdelingId);

      return {
        ...pmn,
        afdelingNama: afdeling ? afdeling.kode : pmn.afdelingId,
        daysWorked,
        totalKg,
        totalTon,
        totalJanjang,
        totalBrondolanKg,
        avgKgPerDay,
        targetAchievementPercent,
        kehadiranPercent,
        ratingKualitas: pmn.ratingKualitas || 95,
        lossesPersen: pmn.lossesPersen || 1.2
      };
    }).sort((a, b) => b.totalKg - a.totalKg);
  }
}

// Global Store Instance
window.simpStore = new Store();
