/**
 * Main Application Controller (SIMP-TBS Kelapa Sawit)
 * UI routing, event handlers, CRUD controllers, modal managers, filtering, and role checks
 */

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.harvestFilter = {
      search: '',
      dateStart: '',
      dateEnd: '',
      afdelingId: '',
      blokId: '',
      pemanenId: ''
    };
    this.activeHarvestIdToEdit = null;
    this.activeBlockIdToEdit = null;
    this.activeHarvesterIdToEdit = null;
  }

  init() {
    this.bindEvents();
    this.updateRoleUI();
    this.renderHeaderInfo();
    this.navigateTo('dashboard');

    // Real-time clock in header
    this.startClock();
  }

  // --- CLOCK & HEADER INFO ---
  startClock() {
    const clockEl = document.getElementById('header-clock');
    const update = () => {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
      if (clockEl) {
        clockEl.textContent = now.toLocaleDateString('id-ID', options);
      }
    };
    update();
    setInterval(update, 1000);
  }

  renderHeaderInfo() {
    const estate = window.simpStore.getEstateInfo();
    const estateNameEl = document.getElementById('header-estate-name');
    if (estateNameEl) {
      estateNameEl.textContent = `${estate.name} - ${estate.estateName}`;
    }
  }

  // --- ROLE MANAGEMENT & PERMISSIONS ---
  updateRoleUI() {
    const role = window.simpStore.getActiveRole();
    const roleBadge = document.getElementById('current-role-badge');
    const roleSelect = document.getElementById('role-selector');

    if (roleSelect) {
      roleSelect.value = role;
    }

    if (roleBadge) {
      let label = 'Administrator (Full Akses)';
      let cls = 'bg-emerald-100 text-emerald-800 border-emerald-300';

      if (role === 'mandor') {
        label = 'Mandor Lapangan (Input & Kelola Panen)';
        cls = 'bg-amber-100 text-amber-800 border-amber-300';
      } else if (role === 'manajer') {
        label = 'Manajer Kebun (Eksekutif & Laporan)';
        cls = 'bg-blue-100 text-blue-800 border-blue-300';
      }

      roleBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cls}`;
      roleBadge.innerHTML = `<i class="fa-solid fa-user-shield"></i> ${label}`;
    }

    // Role banner notification
    const bannerDesc = document.getElementById('role-banner-desc');
    if (bannerDesc) {
      if (role === 'admin') {
        bannerDesc.textContent = 'Mode Administrator: Anda memiliki hak akses penuh untuk mengelola data panen, data master, target, serta ekspor laporan.';
      } else if (role === 'mandor') {
        bannerDesc.textContent = 'Mode Mandor: Anda difokuskan untuk pencatatan aktivitas panen harian TBS, input brondolan, pengecekan janjang, dan pemantauan ancak blok.';
      } else if (role === 'manajer') {
        bannerDesc.textContent = 'Mode Manajer: Akses analitik eksekutif untuk meninjau dashboard produksi, produktivitas ton/ha, perbandingan target vs realisasi, dan evaluasi kinerja karyawan.';
      }
    }

    // Role element visibility checks
    document.querySelectorAll('[data-role-perm]').forEach(el => {
      const allowedRoles = el.getAttribute('data-role-perm').split(',');
      if (allowedRoles.includes(role)) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
  }

  // --- NAVIGATION (SPA ROUTING) ---
  navigateTo(viewName) {
    this.currentView = viewName;

    // Update active nav links
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 1024) {
      sidebar.classList.add('-translate-x-full');
    }

    // Render corresponding view
    switch (viewName) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'panen':
        this.renderPanenView();
        break;
      case 'produktivitas':
        this.renderProduktivitasView();
        break;
      case 'kinerja':
        this.renderKinerjaView();
        break;
      case 'target':
        this.renderTargetView();
        break;
      case 'analisis':
        this.renderAnalisisView();
        break;
      case 'laporan':
        this.renderLaporanView();
        break;
      case 'master':
        this.renderMasterView();
        break;
      default:
        this.renderDashboard();
    }

    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- BIND ALL EVENT LISTENERS ---
  bindEvents() {
    // Navigation clicks
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // Mobile sidebar toggles
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnCloseSidebar = document.getElementById('btn-close-sidebar');
    const sidebar = document.getElementById('sidebar');

    if (btnToggleSidebar && sidebar) {
      btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
      });
    }

    if (btnCloseSidebar && sidebar) {
      btnCloseSidebar.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
      });
    }

    // Role selector change
    const roleSelect = document.getElementById('role-selector');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        const newRole = e.target.value;
        window.simpStore.setActiveRole(newRole);
        this.updateRoleUI();
        this.showToast(`Mode pengguna beralih ke: ${newRole.toUpperCase()}`, 'info');
        // Re-render current view to reflect role rules
        this.navigateTo(this.currentView);
      });
    }

    // Quick action "Input Panen" in header
    const btnQuickInputPanen = document.getElementById('btn-quick-input-panen');
    if (btnQuickInputPanen) {
      btnQuickInputPanen.addEventListener('click', () => {
        this.openHarvestModal();
      });
    }

    // Harvest form submit
    const harvestForm = document.getElementById('harvest-form');
    if (harvestForm) {
      harvestForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveHarvest();
      });
    }

    // Auto-calculate BJR & Total Weight when inputs change in Harvest Form
    const inputJanjang = document.getElementById('input-harvest-janjang');
    const inputBeratTbs = document.getElementById('input-harvest-berat');
    const inputBrondolan = document.getElementById('input-harvest-brondolan');
    const selectBlok = document.getElementById('input-harvest-blok');

    const updateFormCalculations = () => {
      const janjang = Number(inputJanjang?.value) || 0;
      const beratTbs = Number(inputBeratTbs?.value) || 0;
      const brondolan = Number(inputBrondolan?.value) || 0;

      const bjr = janjang > 0 ? (beratTbs / janjang).toFixed(2) : '0.00';
      const totalKg = beratTbs + brondolan;
      const totalTon = (totalKg / 1000).toFixed(3);

      const bjrDisplay = document.getElementById('display-calc-bjr');
      const totalKgDisplay = document.getElementById('display-calc-totalkg');
      const totalTonDisplay = document.getElementById('display-calc-totalton');

      if (bjrDisplay) bjrDisplay.textContent = `${bjr} kg/janjang`;
      if (totalKgDisplay) totalKgDisplay.textContent = `${totalKg.toLocaleString('id-ID')} kg`;
      if (totalTonDisplay) totalTonDisplay.textContent = `${totalTon} ton`;
    };

    if (inputJanjang) inputJanjang.addEventListener('input', updateFormCalculations);
    if (inputBeratTbs) inputBeratTbs.addEventListener('input', updateFormCalculations);
    if (inputBrondolan) inputBrondolan.addEventListener('input', updateFormCalculations);

    // Auto load Block Ha when block is selected
    if (selectBlok) {
      selectBlok.addEventListener('change', (e) => {
        const blockId = e.target.value;
        const block = window.simpStore.getBlockById(blockId);
        const luasHaDisplay = document.getElementById('display-block-luasha');
        if (luasHaDisplay) {
          luasHaDisplay.textContent = block ? `${block.luasHa} Ha` : '-';
        }
        // Also auto select corresponding afdeling
        if (block) {
          const afdSelect = document.getElementById('input-harvest-afdeling');
          if (afdSelect) afdSelect.value = block.afdelingId;
        }
      });
    }

    // Target form submit
    const targetForm = document.getElementById('target-form');
    if (targetForm) {
      targetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveTarget();
      });
    }

    // Master Blok form submit
    const blockForm = document.getElementById('block-form');
    if (blockForm) {
      blockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveBlock();
      });
    }

    // Master Harvester form submit
    const harvesterForm = document.getElementById('harvester-form');
    if (harvesterForm) {
      harvesterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveHarvester();
      });
    }
  }

  // --- TOAST SYSTEM ---
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const bgColors = {
      success: 'bg-emerald-800 text-white border-l-4 border-emerald-400',
      error: 'bg-rose-800 text-white border-l-4 border-rose-400',
      info: 'bg-slate-800 text-white border-l-4 border-emerald-400',
      warning: 'bg-amber-800 text-white border-l-4 border-amber-400'
    };
    const icons = {
      success: 'fa-check-circle text-emerald-300',
      error: 'fa-triangle-exclamation text-rose-300',
      info: 'fa-circle-info text-emerald-300',
      warning: 'fa-circle-exclamation text-amber-300'
    };

    toast.className = `toast flex items-center justify-between p-3.5 rounded-lg shadow-lg text-sm ${bgColors[type] || bgColors.success}`;
    toast.innerHTML = `
      <div class="flex items-center gap-2.5">
        <i class="fa-solid ${icons[type] || icons.success} text-base"></i>
        <span>${message}</span>
      </div>
      <button class="text-white/70 hover:text-white ml-3 text-sm focus:outline-none" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-300');
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // --- HELPER: FORMAT ANGKA & BADGE STATUS TARGET ---
  formatNumber(num, digits = 0) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return Number(num).toLocaleString('id-ID', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  getTargetBadge(achievementPercent) {
    if (achievementPercent >= 100) {
      return `<span class="badge-tercapai px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
        <i class="fa-solid fa-circle-check text-emerald-600"></i> Tercapai (${achievementPercent}%)
      </span>`;
    } else if (achievementPercent >= 80) {
      return `<span class="badge-mendekati px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
        <i class="fa-solid fa-clock-rotate-left text-amber-600"></i> Mendekati (${achievementPercent}%)
      </span>`;
    } else {
      return `<span class="badge-belum px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
        <i class="fa-solid fa-triangle-exclamation text-rose-600"></i> Belum Tercapai (${achievementPercent}%)
      </span>`;
    }
  }

  // =========================================================================
  // 1. DASHBOARD VIEW
  // =========================================================================
  renderDashboard() {
    const main = document.getElementById('view-content');
    const todayStats = window.simpStore.getTodayStats();
    const monthStats = window.simpStore.getMonthStats();
    const recentLogs = window.simpStore.getHarvestLogs().slice(0, 5);
    const afdelings = window.simpStore.getAfdelings();
    const bloks = window.simpStore.getBloks();
    const pemanens = window.simpStore.getHarvesters();

    // Progress bar width clamped to 100
    const progressWidth = Math.min(100, Math.max(0, monthStats.achievementPercent));

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Top Estate Banner -->
        <div class="card-sawit brand-gradient text-white p-6 rounded-2xl relative overflow-hidden shadow-lg">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-medium text-emerald-200 mb-2">
                <i class="fa-solid fa-leaf"></i> Sistem Monitoring Terpadu Kelapa Sawit
              </div>
              <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Dashboard Produksi & Panen TBS</h1>
              <p class="text-emerald-100 text-sm mt-1">Ringkasan kondisi panen harian, capaian produktivitas, dan kinerja pemanen secara real-time.</p>
            </div>
            <div class="flex items-center gap-3">
              <button onclick="window.simpApp.openHarvestModal()" class="bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow-md transition flex items-center gap-2 text-sm">
                <i class="fa-solid fa-circle-plus"></i> Input Panen Baru
              </button>
              <button onclick="window.simpExport.triggerPrint()" class="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
                <i class="fa-solid fa-print"></i> Cetak Ringkasan
              </button>
            </div>
          </div>
          <!-- Decorative Background Elements -->
          <div class="absolute -right-8 -bottom-12 text-white/5 text-9xl pointer-events-none select-none">
            <i class="fa-solid fa-tractor"></i>
          </div>
        </div>

        <!-- 8 Key Metrics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <!-- Card 1: Hari Ini Ton -->
          <div class="card-sawit p-5 border-l-4 border-emerald-600">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produksi TBS Hari Ini</span>
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-weight-scale"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-800">${todayStats.totalTon}</span>
              <span class="text-xs font-medium text-slate-500">Ton (${this.formatNumber(todayStats.totalJanjang)} Janjang)</span>
            </div>
            <div class="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span class="font-semibold text-emerald-700">Target Harian:</span> ${todayStats.targetHarianTon} Ton
              <span class="ml-auto font-bold ${todayStats.achievementPercent >= 100 ? 'text-emerald-700' : 'text-amber-700'}">${todayStats.achievementPercent}%</span>
            </div>
          </div>

          <!-- Card 2: Bulan Ini Ton -->
          <div class="card-sawit p-5 border-l-4 border-teal-600">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Produksi Bulan Ini (MTD)</span>
              <div class="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-chart-line"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-800">${monthStats.totalTon}</span>
              <span class="text-xs font-medium text-slate-500">Ton</span>
            </div>
            <div class="mt-2">
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>Target: ${monthStats.targetBulananTon} Ton</span>
                <span class="font-bold text-teal-700">${monthStats.achievementPercent}%</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div class="bg-teal-600 h-1.5 rounded-full transition-all duration-500" style="width: ${progressWidth}%"></div>
              </div>
            </div>
          </div>

          <!-- Card 3: Status Blok Kebun -->
          <div class="card-sawit p-5 border-l-4 border-amber-500">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status Blok Panen</span>
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-base">
                <i class="fa-solid fa-map-location-dot"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-800">${todayStats.harvestedBlocksCount}</span>
              <span class="text-xs font-medium text-slate-500">/ ${todayStats.totalBlocks} Blok Panen Hari Ini</span>
            </div>
            <div class="mt-2 flex items-center gap-3 text-xs">
              <span class="text-emerald-700 font-semibold"><i class="fa-solid fa-circle text-[8px]"></i> ${todayStats.harvestedBlocksCount} Selesai/Proses</span>
              <span class="text-slate-400 font-medium"><i class="fa-solid fa-circle text-[8px]"></i> ${todayStats.unharvestedBlocksCount} Belum</span>
            </div>
          </div>

          <!-- Card 4: Karyawan Pemanen & Produktivitas -->
          <div class="card-sawit p-5 border-l-4 border-emerald-700">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pemanen & Rata-rata</span>
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center text-base">
                <i class="fa-solid fa-users"></i>
              </div>
            </div>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-slate-800">${todayStats.activeHarvestersCount}</span>
              <span class="text-xs font-medium text-slate-500">Pemanen Aktif Hari Ini</span>
            </div>
            <div class="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Produktivitas Rata-rata:</span>
              <span class="font-bold text-emerald-700">${this.formatNumber(todayStats.avgProductivityPerHarvesterKg)} kg/orang</span>
            </div>
          </div>
        </div>

        <!-- 2 Main Interactive Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Chart 1: Daily/Weekly Production Trend (2 cols) -->
          <div class="card-sawit p-5 lg:col-span-2">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-chart-area text-emerald-600"></i> Perkembangan Produksi TBS (Ton)
                </h2>
                <p class="text-xs text-slate-500">Grafik tren harian realisasi panen buah sawit</p>
              </div>
              <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
                <button id="btn-chart-7d" onclick="window.simpCharts.renderProductionTrendChart('chart-production-trend', '7days'); this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-emerald-800')); this.classList.add('bg-white', 'shadow-sm', 'text-emerald-800')" class="px-2.5 py-1 rounded-md bg-white shadow-sm text-emerald-800">7 Hari</button>
                <button id="btn-chart-30d" onclick="window.simpCharts.renderProductionTrendChart('chart-production-trend', '30days'); this.parentElement.querySelectorAll('button').forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-emerald-800')); this.classList.add('bg-white', 'shadow-sm', 'text-emerald-800')" class="px-2.5 py-1 rounded-md text-slate-600 hover:text-slate-900">30 Hari</button>
              </div>
            </div>
            <div class="mt-4 relative h-64">
              <canvas id="chart-production-trend"></canvas>
            </div>
          </div>

          <!-- Chart 2: Target vs Realisasi per Afdeling (1 col) -->
          <div class="card-sawit p-5">
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-bullseye text-amber-500"></i> Target vs Realisasi
              </h2>
              <p class="text-xs text-slate-500">Perbandingan per Afdeling / Divisi</p>
            </div>
            <div class="mt-4 relative h-64">
              <canvas id="chart-target-vs-realisasi"></canvas>
            </div>
          </div>
        </div>

        <!-- Recent Harvest Activity Table & Afdeling Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Left: Recent Harvest Logs (2 cols) -->
          <div class="card-sawit p-5 lg:col-span-2">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-clock-rotate-left text-emerald-600"></i> Aktivitas Panen Terkini
                </h2>
                <p class="text-xs text-slate-500">Catatan timbang TBS terbaru dari lapangan</p>
              </div>
              <button onclick="window.simpApp.navigateTo('panen')" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                Lihat Semua <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
            <div class="mt-3 overflow-x-auto">
              <table class="w-full text-left text-xs table-sawit">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Afdeling / Blok</th>
                    <th>Pemanen</th>
                    <th>Janjang</th>
                    <th>Berat (Kg / Ton)</th>
                    <th>BJR</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentLogs.map(log => {
                    const afd = afdelings.find(a => a.id === log.afdelingId);
                    const blk = bloks.find(b => b.id === log.blokId);
                    const pmn = pemanens.find(p => p.id === log.pemanenId);
                    return `
                      <tr>
                        <td class="font-medium text-slate-700">${log.tanggal}</td>
                        <td>
                          <span class="font-semibold text-emerald-900">${afd ? afd.kode : log.afdelingId}</span> - Blok ${blk ? blk.kode : log.blokId}
                        </td>
                        <td class="font-semibold text-slate-800">${pmn ? pmn.nama : '-'}</td>
                        <td><span class="font-semibold">${log.janjang}</span> jjg</td>
                        <td>
                          <div class="font-bold text-slate-800">${this.formatNumber(log.totalKg)} kg</div>
                          <div class="text-[10px] text-slate-400">(${log.totalTon} Ton)</div>
                        </td>
                        <td><span class="bg-slate-100 px-2 py-0.5 rounded font-medium">${log.bjr} kg</span></td>
                        <td>
                          <button onclick="window.simpApp.openDetailHarvestModal('${log.id}')" class="text-emerald-700 hover:text-emerald-900 font-semibold p-1" title="Lihat Detail">
                            <i class="fa-solid fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right: Afdeling Quick Status Cards (1 col) -->
          <div class="card-sawit p-5 flex flex-col justify-between">
            <div>
              <div class="pb-3 border-b border-slate-100">
                <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                  <i class="fa-solid fa-layer-group text-emerald-600"></i> Produktivitas Afdeling
                </h2>
                <p class="text-xs text-slate-500">Realisasi produksi vs target per divisi</p>
              </div>
              <div class="mt-4 space-y-3.5">
                ${window.simpStore.getAfdelingProductivityList().map(afd => {
                  const pct = afd.pencapaianPercent;
                  const barColor = pct >= 100 ? 'bg-emerald-600' : (pct >= 80 ? 'bg-amber-500' : 'bg-rose-500');
                  return `
                    <div class="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200/60 transition">
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-bold text-sm text-slate-800">${afd.kode} - ${afd.nama.split(' ')[1]}</span>
                        ${this.getTargetBadge(pct)}
                      </div>
                      <div class="flex justify-between text-xs text-slate-500 mt-2">
                        <span>Realisasi: <b>${afd.totalTon} Ton</b></span>
                        <span>Target: ${afd.targetTon} Ton</span>
                      </div>
                      <div class="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div class="${barColor} h-1.5 rounded-full" style="width: ${Math.min(100, pct)}%"></div>
                      </div>
                      <div class="flex justify-between text-[11px] text-slate-400 mt-1.5">
                        <span>BJR Rata: <b>${afd.bjr} kg</b></span>
                        <span>Luas: ${afd.luasHa} Ha (${afd.tonPerHa} Ton/Ha)</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <span class="text-slate-500">Estimasi BJR Kebun: <b>${todayStats.overallBjr} Kg</b></span>
              <button onclick="window.simpApp.navigateTo('produktivitas')" class="text-emerald-700 font-semibold hover:underline">
                Analisis Lengkap &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render charts
    setTimeout(() => {
      window.simpCharts.renderProductionTrendChart('chart-production-trend', '7days');
      window.simpCharts.renderTargetVsRealisasiChart('chart-target-vs-realisasi');
    }, 50);
  }

  // =========================================================================
  // 2. MONITORING AKTIVITAS PANEN (CRUD, FILTER & SEARCH)
  // =========================================================================
  renderPanenView() {
    const main = document.getElementById('view-content');
    const afdelings = window.simpStore.getAfdelings();
    const bloks = window.simpStore.getBloks();
    const pemanens = window.simpStore.getHarvesters();
    const mandors = window.simpStore.getMandors();
    const role = window.simpStore.getActiveRole();

    // Apply active filter
    let logs = window.simpStore.getHarvestLogs();

    if (this.harvestFilter.search) {
      const q = this.harvestFilter.search.toLowerCase();
      logs = logs.filter(l => {
        const pmn = pemanens.find(p => p.id === l.pemanenId);
        const mdr = mandors.find(m => m.id === l.mandorId);
        const blk = bloks.find(b => b.id === l.blokId);
        return (
          l.id.toLowerCase().includes(q) ||
          (pmn && pmn.nama.toLowerCase().includes(q)) ||
          (mdr && mdr.nama.toLowerCase().includes(q)) ||
          (blk && blk.kode.toLowerCase().includes(q)) ||
          (l.kondisiLapangan && l.kondisiLapangan.toLowerCase().includes(q))
        );
      });
    }

    if (this.harvestFilter.afdelingId) {
      logs = logs.filter(l => l.afdelingId === this.harvestFilter.afdelingId);
    }

    if (this.harvestFilter.blokId) {
      logs = logs.filter(l => l.blokId === this.harvestFilter.blokId);
    }

    if (this.harvestFilter.pemanenId) {
      logs = logs.filter(l => l.pemanenId === this.harvestFilter.pemanenId);
    }

    if (this.harvestFilter.dateStart) {
      logs = logs.filter(l => l.tanggal >= this.harvestFilter.dateStart);
    }

    if (this.harvestFilter.dateEnd) {
      logs = logs.filter(l => l.tanggal <= this.harvestFilter.dateEnd);
    }

    // Filter summary
    const filteredTotalJanjang = logs.reduce((a, c) => a + (c.janjang || 0), 0);
    const filteredTotalKg = logs.reduce((a, c) => a + (c.totalKg || 0), 0);
    const filteredTotalTon = Number((filteredTotalKg / 1000).toFixed(3));
    const filteredTotalBrondolan = logs.reduce((a, c) => a + (c.brondolanKg || 0), 0);

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Title & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-clipboard-list text-emerald-700"></i> Monitoring Aktivitas Panen TBS
            </h1>
            <p class="text-sm text-slate-500">Pencatatan dan pemantauan data panen harian per blok, afdeling, dan pemanen.</p>
          </div>
          <div class="flex items-center gap-2.5">
            ${role !== 'manajer' ? `
              <button onclick="window.simpApp.openHarvestModal()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm">
                <i class="fa-solid fa-circle-plus"></i> Tambah Data Panen
              </button>
            ` : ''}
            <button onclick="window.simpExport.exportHarvestToExcel(window.simpStore.getHarvestLogs())" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 text-sm">
              <i class="fa-solid fa-file-excel text-emerald-700"></i> Export Excel
            </button>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="card-sawit p-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <!-- Search Input -->
            <div class="lg:col-span-2">
              <label class="block text-xs font-semibold text-slate-600 mb-1">Pencarian</label>
              <div class="relative">
                <input type="text" id="filter-panen-search" value="${this.harvestFilter.search}" placeholder="Cari pemanen, blok, kondisi..." class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <i class="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-400 text-xs"></i>
              </div>
            </div>

            <!-- Filter Afdeling -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Afdeling</label>
              <select id="filter-panen-afdeling" class="w-full text-xs py-2 px-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Semua Afdeling</option>
                ${afdelings.map(a => `<option value="${a.id}" ${this.harvestFilter.afdelingId === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
              </select>
            </div>

            <!-- Filter Blok -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Nomor Blok</label>
              <select id="filter-panen-blok" class="w-full text-xs py-2 px-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Semua Blok</option>
                ${bloks.map(b => `<option value="${b.id}" ${this.harvestFilter.blokId === b.id ? 'selected' : ''}>Blok ${b.kode}</option>`).join('')}
              </select>
            </div>

            <!-- Filter Pemanen -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Pemanen</label>
              <select id="filter-panen-pemanen" class="w-full text-xs py-2 px-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                <option value="">Semua Pemanen</option>
                ${pemanens.map(p => `<option value="${p.id}" ${this.harvestFilter.pemanenId === p.id ? 'selected' : ''}>${p.nama}</option>`).join('')}
              </select>
            </div>

            <!-- Date Range / Reset -->
            <div class="flex items-end gap-2">
              <button onclick="window.simpApp.resetHarvestFilters()" class="w-full text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-rotate-left"></i> Reset Filter
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Quick Summary Bar -->
        <div class="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2 text-emerald-900 font-semibold">
            <i class="fa-solid fa-calculator text-emerald-700"></i>
            <span>Hasil Filter: <b>${logs.length}</b> Catatan Panen</span>
          </div>
          <div class="flex items-center gap-4 text-slate-700">
            <span>Total Janjang: <b class="text-emerald-900">${this.formatNumber(filteredTotalJanjang)} jjg</b></span>
            <span>Total Brondolan: <b class="text-emerald-900">${this.formatNumber(filteredTotalBrondolan)} kg</b></span>
            <span>Total Produksi: <b class="text-emerald-900 text-sm">${filteredTotalTon} Ton</b> (${this.formatNumber(filteredTotalKg)} kg)</span>
          </div>
        </div>

        <!-- Harvest Table -->
        <div class="card-sawit overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Tanggal</th>
                  <th>Afdeling / Blok</th>
                  <th>Mandor</th>
                  <th>Pemanen</th>
                  <th>Janjang</th>
                  <th>Berat TBS</th>
                  <th>Brondolan</th>
                  <th>Total (Kg / Ton)</th>
                  <th>BJR</th>
                  <th>Kondisi Lapangan</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${logs.length === 0 ? `
                  <tr>
                    <td colspan="12" class="text-center py-10 text-slate-400">
                      <i class="fa-solid fa-inbox text-3xl mb-2 block"></i>
                      Tidak ada catatan panen yang sesuai dengan filter.
                    </td>
                  </tr>
                ` : logs.map((log, index) => {
                  const afd = afdelings.find(a => a.id === log.afdelingId);
                  const blk = bloks.find(b => b.id === log.blokId);
                  const mdr = mandors.find(m => m.id === log.mandorId);
                  const pmn = pemanens.find(p => p.id === log.pemanenId);
                  return `
                    <tr>
                      <td class="text-slate-400 font-mono">${index + 1}</td>
                      <td class="font-medium text-slate-700 whitespace-nowrap">${log.tanggal}</td>
                      <td>
                        <div class="font-bold text-slate-800">${afd ? afd.kode : log.afdelingId} - Blok ${blk ? blk.kode : log.blokId}</div>
                        <div class="text-[10px] text-slate-400">${blk ? blk.luasHa + ' Ha' : ''}</div>
                      </td>
                      <td class="text-slate-600">${mdr ? mdr.nama : '-'}</td>
                      <td class="font-semibold text-emerald-900">${pmn ? pmn.nama : '-'}</td>
                      <td class="font-bold text-slate-800">${log.janjang}</td>
                      <td>${this.formatNumber(log.beratTbsKg)} kg</td>
                      <td>${this.formatNumber(log.brondolanKg)} kg</td>
                      <td>
                        <div class="font-extrabold text-slate-900">${this.formatNumber(log.totalKg)} kg</div>
                        <div class="text-[10px] font-semibold text-emerald-700">(${log.totalTon} Ton)</div>
                      </td>
                      <td>
                        <span class="inline-block bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                          ${log.bjr} kg
                        </span>
                      </td>
                      <td class="max-w-xs truncate text-slate-500" title="${log.kondisiLapangan || ''}">
                        ${log.kondisiLapangan || '-'}
                      </td>
                      <td class="text-center whitespace-nowrap">
                        <button onclick="window.simpApp.openDetailHarvestModal('${log.id}')" class="p-1.5 text-slate-500 hover:text-emerald-700 transition" title="Lihat Detail">
                          <i class="fa-solid fa-eye"></i>
                        </button>
                        ${role !== 'manajer' ? `
                          <button onclick="window.simpApp.openHarvestModal('${log.id}')" class="p-1.5 text-slate-500 hover:text-amber-600 transition" title="Edit Data">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button onclick="window.simpApp.handleDeleteHarvest('${log.id}')" class="p-1.5 text-slate-500 hover:text-rose-600 transition" title="Hapus Data">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Bind filter input changes
    const searchInput = document.getElementById('filter-panen-search');
    const afdSelect = document.getElementById('filter-panen-afdeling');
    const blokSelect = document.getElementById('filter-panen-blok');
    const pmnSelect = document.getElementById('filter-panen-pemanen');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.harvestFilter.search = e.target.value;
        this.renderPanenView();
      });
    }

    if (afdSelect) {
      afdSelect.addEventListener('change', (e) => {
        this.harvestFilter.afdelingId = e.target.value;
        this.renderPanenView();
      });
    }

    if (blokSelect) {
      blokSelect.addEventListener('change', (e) => {
        this.harvestFilter.blokId = e.target.value;
        this.renderPanenView();
      });
    }

    if (pmnSelect) {
      pmnSelect.addEventListener('change', (e) => {
        this.harvestFilter.pemanenId = e.target.value;
        this.renderPanenView();
      });
    }
  }

  resetHarvestFilters() {
    this.harvestFilter = {
      search: '',
      dateStart: '',
      dateEnd: '',
      afdelingId: '',
      blokId: '',
      pemanenId: ''
    };
    this.renderPanenView();
  }

  // --- HARVEST MODAL: ADD / EDIT ---
  openHarvestModal(idToEdit = null) {
    this.activeHarvestIdToEdit = idToEdit;
    const modal = document.getElementById('modal-harvest');
    const modalTitle = document.getElementById('modal-harvest-title');
    const form = document.getElementById('harvest-form');
    if (!modal || !form) return;

    // Populate dropdown options
    const afdSelect = document.getElementById('input-harvest-afdeling');
    const blokSelect = document.getElementById('input-harvest-blok');
    const pmnSelect = document.getElementById('input-harvest-pemanen');
    const mdrSelect = document.getElementById('input-harvest-mandor');

    const afdelings = window.simpStore.getAfdelings();
    const bloks = window.simpStore.getBloks();
    const pemanens = window.simpStore.getHarvesters();
    const mandors = window.simpStore.getMandors();

    if (afdSelect) {
      afdSelect.innerHTML = afdelings.map(a => `<option value="${a.id}">${a.nama}</option>`).join('');
    }
    if (blokSelect) {
      blokSelect.innerHTML = bloks.map(b => `<option value="${b.id}" data-afdeling="${b.afdelingId}">Blok ${b.kode} (${b.luasHa} Ha)</option>`).join('');
    }
    if (pmnSelect) {
      pmnSelect.innerHTML = pemanens.map(p => `<option value="${p.id}">${p.nama} (${p.nik})</option>`).join('');
    }
    if (mdrSelect) {
      mdrSelect.innerHTML = mandors.map(m => `<option value="${m.id}">${m.nama} (${m.nik})</option>`).join('');
    }

    if (idToEdit) {
      const log = window.simpStore.getHarvestById(idToEdit);
      if (!log) return;
      modalTitle.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-500"></i> Edit Data Panen (${log.id})`;
      document.getElementById('input-harvest-tanggal').value = log.tanggal;
      document.getElementById('input-harvest-afdeling').value = log.afdelingId;
      document.getElementById('input-harvest-blok').value = log.blokId;
      document.getElementById('input-harvest-mandor').value = log.mandorId;
      document.getElementById('input-harvest-pemanen').value = log.pemanenId;
      document.getElementById('input-harvest-janjang').value = log.janjang;
      document.getElementById('input-harvest-berat').value = log.beratTbsKg;
      document.getElementById('input-harvest-brondolan').value = log.brondolanKg;
      document.getElementById('input-harvest-jammulai').value = log.jamMulai || '06:30';
      document.getElementById('input-harvest-jamselesai').value = log.jamSelesai || '13:30';
      document.getElementById('input-harvest-kondisi').value = log.kondisiLapangan || '';
      document.getElementById('input-harvest-losses').value = log.lossesKg || 0;
    } else {
      modalTitle.innerHTML = `<i class="fa-solid fa-circle-plus text-emerald-600"></i> Tambah Data Panen Baru`;
      form.reset();
      document.getElementById('input-harvest-tanggal').value = window.simpStore.getTodayString();
      document.getElementById('input-harvest-jammulai').value = '06:30';
      document.getElementById('input-harvest-jamselesai').value = '13:30';
      document.getElementById('input-harvest-losses').value = '5';
    }

    // Trigger auto calc
    const triggerEvent = new Event('input');
    document.getElementById('input-harvest-janjang').dispatchEvent(triggerEvent);
    const triggerBlock = new Event('change');
    document.getElementById('input-harvest-blok').dispatchEvent(triggerBlock);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeHarvestModal() {
    const modal = document.getElementById('modal-harvest');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.activeHarvestIdToEdit = null;
  }

  handleSaveHarvest() {
    const tanggal = document.getElementById('input-harvest-tanggal').value;
    const afdelingId = document.getElementById('input-harvest-afdeling').value;
    const blokId = document.getElementById('input-harvest-blok').value;
    const mandorId = document.getElementById('input-harvest-mandor').value;
    const pemanentId = document.getElementById('input-harvest-pemanen').value;
    const janjang = Number(document.getElementById('input-harvest-janjang').value);
    const beratTbsKg = Number(document.getElementById('input-harvest-berat').value);
    const brondolanKg = Number(document.getElementById('input-harvest-brondolan').value);
    const jamMulai = document.getElementById('input-harvest-jammulai').value;
    const jamSelesai = document.getElementById('input-harvest-jamselesai').value;
    const kondisiLapangan = document.getElementById('input-harvest-kondisi').value;
    const lossesKg = Number(document.getElementById('input-harvest-losses').value) || 0;

    if (!tanggal || !blokId || !pemanentId || janjang <= 0 || beratTbsKg <= 0) {
      alert('Harap lengkapi semua kolom wajib dengan data yang valid!');
      return;
    }

    const payload = {
      tanggal,
      afdelingId,
      blokId,
      mandorId,
      pemanenId: pemanentId,
      janjang,
      beratTbsKg,
      brondolanKg,
      jamMulai,
      jamSelesai,
      kondisiLapangan,
      lossesKg,
      statusBuah: { matang: Math.max(0, janjang - 2), mentah: 1, lewatMatang: 1 }
    };

    if (this.activeHarvestIdToEdit) {
      payload.id = this.activeHarvestIdToEdit;
      window.simpStore.updateHarvest(payload);
      this.showToast(`Data panen ${payload.id} berhasil diperbarui!`, 'success');
    } else {
      const created = window.simpStore.addHarvest(payload);
      this.showToast(`Data panen baru ${created.id} berhasil dicatat!`, 'success');
    }

    this.closeHarvestModal();

    // Refresh view
    if (this.currentView === 'panen') {
      this.renderPanenView();
    } else if (this.currentView === 'dashboard') {
      this.renderDashboard();
    } else {
      this.navigateTo(this.currentView);
    }
  }

  handleDeleteHarvest(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus data panen tiket ${id}?`)) {
      window.simpStore.deleteHarvest(id);
      this.showToast(`Data panen ${id} berhasil dihapus.`, 'warning');
      this.renderPanenView();
    }
  }

  // --- HARVEST DETAIL MODAL ---
  openDetailHarvestModal(id) {
    const log = window.simpStore.getHarvestById(id);
    if (!log) return;

    const afd = window.simpStore.getAfdelingById(log.afdelingId);
    const blk = window.simpStore.getBlockById(log.blokId);
    const mdr = window.simpStore.getMandorById(log.mandorId);
    const pmn = window.simpStore.getHarvesterById(log.pemanenId);

    const modal = document.getElementById('modal-harvest-detail');
    const content = document.getElementById('modal-harvest-detail-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="space-y-4">
        <!-- Header Info -->
        <div class="flex justify-between items-start pb-3 border-b border-slate-200">
          <div>
            <span class="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">${log.id}</span>
            <h3 class="text-lg font-bold text-slate-800 mt-1">Laporan Timbang TPH</h3>
            <p class="text-xs text-slate-500">${log.tanggal} | Jam Kerja: ${log.jamMulai || '-'} s/d ${log.jamSelesai || '-'}</p>
          </div>
          <div class="text-right">
            <span class="text-2xl font-black text-emerald-700">${log.totalTon} Ton</span>
            <div class="text-xs text-slate-500 font-medium">${log.totalKg.toLocaleString('id-ID')} Kg Total</div>
          </div>
        </div>

        <!-- Two Column Details -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-medium">Afdeling / Divisi:</span>
            <span class="font-bold text-slate-800 text-sm">${afd ? afd.nama : log.afdelingId}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-medium">Blok & Luas:</span>
            <span class="font-bold text-slate-800 text-sm">Blok ${blk ? blk.kode : log.blokId} (${blk ? blk.luasHa + ' Ha' : '-'})</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-medium">Mandor Panen:</span>
            <span class="font-bold text-slate-800 text-sm">${mdr ? mdr.nama : '-'}</span>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span class="text-slate-400 block font-medium">Pemanen:</span>
            <span class="font-bold text-emerald-800 text-sm">${pmn ? pmn.nama + ' (' + pmn.nik + ')' : '-'}</span>
          </div>
        </div>

        <!-- Breakdown Numbers -->
        <div class="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 grid grid-cols-3 gap-2 text-center">
          <div>
            <span class="text-[11px] text-emerald-800 font-medium block">Jumlah Janjang</span>
            <span class="text-lg font-bold text-emerald-950">${log.janjang} jjg</span>
          </div>
          <div>
            <span class="text-[11px] text-emerald-800 font-medium block">Berat TBS</span>
            <span class="text-lg font-bold text-emerald-950">${log.beratTbsKg} kg</span>
          </div>
          <div>
            <span class="text-[11px] text-emerald-800 font-medium block">Brondolan</span>
            <span class="text-lg font-bold text-emerald-950">${log.brondolanKg} kg</span>
          </div>
        </div>

        <!-- BJR & Losses Metrics -->
        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="border border-slate-200 p-2.5 rounded-lg">
            <span class="text-slate-400 block">BJR (Berat Janjang Rata-rata)</span>
            <span class="text-base font-extrabold text-slate-800">${log.bjr} kg/janjang</span>
            <span class="text-[10px] text-slate-400 block">Kategori TBS Matang Standar Pabrik</span>
          </div>
          <div class="border border-slate-200 p-2.5 rounded-lg">
            <span class="text-slate-400 block">Losses (Brondolan Tertinggal)</span>
            <span class="text-base font-extrabold text-slate-800">${log.lossesKg || 0} kg</span>
            <span class="text-[10px] text-slate-400 block">Estimasi losses lapangan</span>
          </div>
        </div>

        <!-- Kondisi Lapangan -->
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
          <span class="font-semibold text-slate-700 block mb-1">Catatan Kondisi Lapangan:</span>
          <p class="text-slate-600">${log.kondisiLapangan || 'Tidak ada catatan khusus.'}</p>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeDetailHarvestModal() {
    const modal = document.getElementById('modal-harvest-detail');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  // =========================================================================
  // 3. MONITORING PRODUKTIVITAS TBS (AUTO-ANALYTICS)
  // =========================================================================
  renderProduktivitasView() {
    const main = document.getElementById('view-content');
    const blockList = window.simpStore.getBlockProductivityList();
    const afdList = window.simpStore.getAfdelingProductivityList();
    const estate = window.simpStore.getEstateInfo();

    // Summary calculations
    const totalTonEstate = blockList.reduce((a, c) => a + c.totalTon, 0);
    const totalHaEstate = blockList.reduce((a, c) => a + c.luasHa, 0);
    const avgTonPerHaEstate = totalHaEstate > 0 ? (totalTonEstate / totalHaEstate).toFixed(2) : 0;
    const totalJanjangEstate = blockList.reduce((a, c) => a + c.totalJanjang, 0);
    const overallBjr = totalJanjangEstate > 0 ? (blockList.reduce((a, c) => a + c.totalKg, 0) / totalJanjangEstate).toFixed(2) : 0;

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-seedling text-emerald-700"></i> Monitoring Produktivitas TBS
            </h1>
            <p class="text-sm text-slate-500">Analisis produktivitas ton/hektare, rata-rata berat janjang (BJR), dan capaian per blok kebun.</p>
          </div>
          <button onclick="window.simpExport.exportFullReportToExcel()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm">
            <i class="fa-solid fa-file-excel"></i> Export Rekap Produktivitas
          </button>
        </div>

        <!-- 4 Key Productivity KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="card-sawit p-5 border-l-4 border-emerald-600">
            <span class="text-xs font-semibold text-slate-500 uppercase">Produktivitas Rata-rata Kebun</span>
            <div class="mt-2 text-2xl font-black text-slate-800">${avgTonPerHaEstate} <span class="text-sm font-normal text-slate-500">Ton / Ha</span></div>
            <p class="mt-1 text-xs text-slate-400">Total Luas Produktif: ${totalHaEstate} Ha</p>
          </div>

          <div class="card-sawit p-5 border-l-4 border-teal-600">
            <span class="text-xs font-semibold text-slate-500 uppercase">Rata-rata Berat Janjang (BJR)</span>
            <div class="mt-2 text-2xl font-black text-slate-800">${overallBjr} <span class="text-sm font-normal text-slate-500">Kg / Janjang</span></div>
            <p class="mt-1 text-xs text-emerald-700 font-semibold"><i class="fa-solid fa-check-circle"></i> Standar Fraksi Buah Matang Baik</p>
          </div>

          <div class="card-sawit p-5 border-l-4 border-amber-500">
            <span class="text-xs font-semibold text-slate-500 uppercase">Total Janjang Dihasilkan</span>
            <div class="mt-2 text-2xl font-black text-slate-800">${this.formatNumber(totalJanjangEstate)} <span class="text-sm font-normal text-slate-500">Janjang</span></div>
            <p class="mt-1 text-xs text-slate-400">Dari ${blockList.length} Blok Tertanam</p>
          </div>

          <div class="card-sawit p-5 border-l-4 border-emerald-800">
            <span class="text-xs font-semibold text-slate-500 uppercase">Akumulasi Produksi TBS</span>
            <div class="mt-2 text-2xl font-black text-emerald-800">${totalTonEstate.toFixed(2)} <span class="text-sm font-normal text-slate-500">Ton</span></div>
            <p class="mt-1 text-xs text-slate-400">Target Estate: ${estate.targetBulananTon} Ton</p>
          </div>
        </div>

        <!-- Produktivitas per Afdeling Cards -->
        <div>
          <h2 class="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            <i class="fa-solid fa-chart-pie text-emerald-600"></i> Produktivitas Setiap Afdeling (Divisi)
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${afdList.map(afd => `
              <div class="card-sawit p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <h3 class="font-bold text-slate-800">${afd.nama}</h3>
                    <p class="text-xs text-slate-500">Mandor: ${afd.mandorUtama}</p>
                  </div>
                  ${this.getTargetBadge(afd.pencapaianPercent)}
                </div>
                <div class="grid grid-cols-2 gap-2 my-3 text-xs bg-slate-50 p-3 rounded-lg">
                  <div>
                    <span class="text-slate-400 block">Produksi:</span>
                    <b class="text-slate-800 text-sm">${afd.totalTon} Ton</b>
                  </div>
                  <div>
                    <span class="text-slate-400 block">Produktivitas:</span>
                    <b class="text-emerald-700 text-sm">${afd.tonPerHa} Ton/Ha</b>
                  </div>
                  <div class="mt-1">
                    <span class="text-slate-400 block">BJR Rata-rata:</span>
                    <b class="text-slate-800">${afd.bjr} kg</b>
                  </div>
                  <div class="mt-1">
                    <span class="text-slate-400 block">Total Janjang:</span>
                    <b class="text-slate-800">${this.formatNumber(afd.totalJanjang)}</b>
                  </div>
                </div>
                <div class="text-[11px] text-slate-500 flex justify-between">
                  <span>Luas Areal: ${afd.luasHa} Ha</span>
                  <span>Target: ${afd.targetTon} Ton</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Tabel Detail Produktivitas Setiap Blok -->
        <div class="card-sawit p-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-cubes-stacked text-emerald-600"></i> Analisis Produktivitas Seluruh Blok Kebun
              </h2>
              <p class="text-xs text-slate-500">Perhitungan otomatis produktivitas (Ton/Ha) dan rata-rata berat janjang (BJR)</p>
            </div>
            <span class="text-xs text-slate-500 font-medium">Diurutkan dari produktivitas tertinggi</span>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kode Blok</th>
                  <th>Afdeling</th>
                  <th>Luas (Ha)</th>
                  <th>Tahun Tanam</th>
                  <th>Varietas</th>
                  <th>Jumlah Pokok</th>
                  <th>Total Janjang</th>
                  <th>Total TBS (Ton)</th>
                  <th>Produktivitas (Ton/Ha)</th>
                  <th>BJR (Kg)</th>
                  <th>Status Panen</th>
                </tr>
              </thead>
              <tbody>
                ${blockList.map((blk, idx) => `
                  <tr>
                    <td class="text-slate-400 font-mono">${idx + 1}</td>
                    <td class="font-bold text-slate-800">Blok ${blk.kode}</td>
                    <td><span class="font-semibold text-emerald-800">${blk.afdelingKode}</span></td>
                    <td>${blk.luasHa} Ha</td>
                    <td>${blk.tahunTanam}</td>
                    <td><span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium">${blk.varietas}</span></td>
                    <td>${this.formatNumber(blk.jumlahPokok)}</td>
                    <td class="font-semibold">${this.formatNumber(blk.totalJanjang)}</td>
                    <td class="font-bold text-emerald-900">${blk.totalTon} Ton</td>
                    <td>
                      <span class="font-extrabold text-sm ${blk.tonPerHa >= 0.15 ? 'text-emerald-700' : (blk.tonPerHa >= 0.10 ? 'text-slate-800' : 'text-amber-600')}">
                        ${blk.tonPerHa} Ton/Ha
                      </span>
                    </td>
                    <td>
                      <span class="font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                        ${blk.bjr} kg
                      </span>
                    </td>
                    <td>
                      <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold ${blk.statusPanen === 'Selesai' ? 'bg-emerald-100 text-emerald-800' : (blk.statusPanen === 'Sedang Berjalan' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600')}">
                        ${blk.statusPanen}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 4. MONITORING KINERJA KARYAWAN PANEN (LEADERBOARD)
  // =========================================================================
  renderKinerjaView() {
    const main = document.getElementById('view-content');
    const harvesters = window.simpStore.getHarvesterPerformanceList();

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-medal text-amber-500"></i> Monitoring Kinerja Karyawan Pemanen
            </h1>
            <p class="text-sm text-slate-500">Evaluasi produktivitas, kedisiplinan, kualitas buah, dan tingkat kehilangan hasil (losses).</p>
          </div>
          <button onclick="window.simpExport.exportFullReportToExcel()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm">
            <i class="fa-solid fa-file-excel"></i> Export Laporan Kinerja
          </button>
        </div>

        <!-- Top 3 Harvesters (Podium) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          ${harvesters.slice(0, 3).map((p, idx) => {
            const medals = [
              { label: 'Peringkat 1 (Top Harvester)', color: 'border-amber-400 bg-amber-50/70', badge: 'bg-amber-500 text-white', icon: 'fa-trophy text-amber-500' },
              { label: 'Peringkat 2', color: 'border-slate-300 bg-slate-50', badge: 'bg-slate-400 text-white', icon: 'fa-medal text-slate-400' },
              { label: 'Peringkat 3', color: 'border-amber-700 bg-orange-50/50', badge: 'bg-amber-700 text-white', icon: 'fa-award text-amber-700' }
            ];
            const medal = medals[idx];
            return `
              <div class="card-sawit p-5 border-2 ${medal.color} relative overflow-hidden">
                <div class="flex justify-between items-start">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${medal.badge}">
                    <i class="fa-solid ${medal.icon}"></i> ${medal.label}
                  </span>
                  <span class="text-xs font-bold text-slate-400 font-mono">${p.nik}</span>
                </div>
                <div class="mt-3">
                  <h3 class="text-xl font-black text-slate-800">${p.nama}</h3>
                  <p class="text-xs text-slate-500">Afdeling: <b>${p.afdelingNama}</b></p>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200/80 text-xs">
                  <div>
                    <span class="text-slate-400 block">Total Panen:</span>
                    <b class="text-base text-emerald-800 font-black">${this.formatNumber(p.totalKg)} kg</b>
                    <span class="text-[10px] text-slate-500 font-medium">(${p.totalTon} Ton)</span>
                  </div>
                  <div>
                    <span class="text-slate-400 block">Capaian Target:</span>
                    <b class="text-base ${p.targetAchievementPercent >= 100 ? 'text-emerald-700' : 'text-amber-600'} font-black">${p.targetAchievementPercent}%</b>
                    <span class="text-[10px] text-slate-500 block">Avg ${this.formatNumber(p.avgKgPerDay)} kg/hari</span>
                  </div>
                  <div class="mt-2">
                    <span class="text-slate-400 block">Kualitas Buah:</span>
                    <b class="text-slate-800 font-bold">${p.ratingKualitas}% Prima</b>
                  </div>
                  <div class="mt-2">
                    <span class="text-slate-400 block">Tingkat Losses:</span>
                    <b class="${p.lossesPersen < 1.5 ? 'text-emerald-700' : 'text-rose-600'} font-bold">${p.lossesPersen}% (Rendah)</b>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Leaderboard Table -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-ranking-star text-emerald-600"></i> Tabel Peringkat & Evaluasi Karyawan
              </h2>
              <p class="text-xs text-slate-500">Metrik produktivitas harian, kedisiplinan kehadiran, dan rasio brondolan</p>
            </div>
            <span class="text-xs text-slate-500 font-medium">Total: ${harvesters.length} Pemanen</span>
          </div>

          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>Peringkat</th>
                  <th>Pemanen</th>
                  <th>Afdeling</th>
                  <th>Total Janjang</th>
                  <th>Total TBS (Kg / Ton)</th>
                  <th>Brondolan (Kg)</th>
                  <th>Avg Kg/Hari</th>
                  <th>Pencapaian Target</th>
                  <th>Kehadiran</th>
                  <th>Kualitas Buah</th>
                  <th>Losses</th>
                </tr>
              </thead>
              <tbody>
                ${harvesters.map((p, idx) => `
                  <tr>
                    <td>
                      <span class="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-400 text-slate-900 font-black' : (idx === 1 ? 'bg-slate-300 text-slate-800' : (idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'))}">
                        ${idx + 1}
                      </span>
                    </td>
                    <td>
                      <div class="font-bold text-slate-800">${p.nama}</div>
                      <div class="text-[10px] text-slate-400">${p.nik}</div>
                    </td>
                    <td><span class="font-semibold text-emerald-800">${p.afdelingNama}</span></td>
                    <td class="font-semibold">${this.formatNumber(p.totalJanjang)} jjg</td>
                    <td>
                      <div class="font-bold text-slate-800">${this.formatNumber(p.totalKg)} kg</div>
                      <div class="text-[10px] text-emerald-700 font-semibold">${p.totalTon} Ton</div>
                    </td>
                    <td>${this.formatNumber(p.totalBrondolanKg)} kg</td>
                    <td class="font-bold">${this.formatNumber(p.avgKgPerDay)} kg</td>
                    <td>
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold ${p.targetAchievementPercent >= 100 ? 'text-emerald-700' : 'text-amber-700'}">${p.targetAchievementPercent}%</span>
                        <div class="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div class="${p.targetAchievementPercent >= 100 ? 'bg-emerald-600' : 'bg-amber-500'} h-1.5" style="width: ${Math.min(100, p.targetAchievementPercent)}%"></div>
                        </div>
                      </div>
                    </td>
                    <td><span class="font-semibold text-slate-700">${p.kehadiranPercent}%</span> (${p.hadirHari}/${p.totalHariKerja} hari)</td>
                    <td><span class="text-emerald-700 font-bold">${p.ratingKualitas}%</span> Prima</td>
                    <td>
                      <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${p.lossesPersen <= 1.2 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                        ${p.lossesPersen}%
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 5. MONITORING TARGET DAN REALISASI
  // =========================================================================
  renderTargetView() {
    const main = document.getElementById('view-content');
    const targets = window.simpStore.getTargets();
    const todayStats = window.simpStore.getTodayStats();
    const monthStats = window.simpStore.getMonthStats();
    const afdProductivity = window.simpStore.getAfdelingProductivityList();
    const role = window.simpStore.getActiveRole();

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-bullseye text-amber-500"></i> Monitoring Target & Realisasi Produksi
            </h1>
            <p class="text-sm text-slate-500">Pemantauan target produksi harian, bulanan, dan indikator warna pencapaian.</p>
          </div>
          ${role === 'admin' ? `
            <button onclick="window.simpApp.openTargetModal()" class="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm">
              <i class="fa-solid fa-sliders"></i> Atur Target Kebun
            </button>
          ` : ''}
        </div>

        <!-- 3 Target Summary Cards with Color Coding -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Harian -->
          <div class="card-sawit p-6">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-800">Target vs Realisasi Harian</h3>
                <p class="text-xs text-slate-500">Tanggal Operasional: ${todayStats.todayStr}</p>
              </div>
              ${this.getTargetBadge(todayStats.achievementPercent)}
            </div>
            <div class="grid grid-cols-2 gap-4 my-5">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="text-xs text-slate-400 block font-medium">Realisasi Hari Ini</span>
                <span class="text-2xl font-black text-slate-800">${todayStats.totalTon} <span class="text-sm font-normal text-slate-500">Ton</span></span>
              </div>
              <div class="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <span class="text-xs text-amber-800 block font-medium">Target Harian Kebun</span>
                <span class="text-2xl font-black text-amber-900">${todayStats.targetHarianTon} <span class="text-sm font-normal text-amber-700">Ton</span></span>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress Capaian Hari Ini</span>
                <span class="font-bold text-slate-800">${todayStats.achievementPercent}%</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div class="${todayStats.achievementPercent >= 100 ? 'bg-emerald-600' : (todayStats.achievementPercent >= 80 ? 'bg-amber-500' : 'bg-rose-500')} h-2.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, todayStats.achievementPercent)}%"></div>
              </div>
            </div>
          </div>

          <!-- Bulanan -->
          <div class="card-sawit p-6">
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 class="text-base font-bold text-slate-800">Target vs Realisasi Bulanan (MTD)</h3>
                <p class="text-xs text-slate-500">Periode: ${monthStats.currentMonthPrefix}</p>
              </div>
              ${this.getTargetBadge(monthStats.achievementPercent)}
            </div>
            <div class="grid grid-cols-2 gap-4 my-5">
              <div class="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span class="text-xs text-slate-400 block font-medium">Realisasi Akumulasi</span>
                <span class="text-2xl font-black text-slate-800">${monthStats.totalTon} <span class="text-sm font-normal text-slate-500">Ton</span></span>
              </div>
              <div class="bg-teal-50 p-4 rounded-xl border border-teal-200">
                <span class="text-xs text-teal-800 block font-medium">Target Bulanan Kebun</span>
                <span class="text-2xl font-black text-teal-900">${monthStats.targetBulananTon} <span class="text-sm font-normal text-teal-700">Ton</span></span>
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progress Capaian Bulanan</span>
                <span class="font-bold text-slate-800">${monthStats.achievementPercent}%</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div class="${monthStats.achievementPercent >= 100 ? 'bg-emerald-600' : (monthStats.achievementPercent >= 80 ? 'bg-amber-500' : 'bg-rose-500')} h-2.5 rounded-full transition-all duration-500" style="width: ${Math.min(100, monthStats.achievementPercent)}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabel Perbandingan Target & Realisasi per Afdeling -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-table-cells text-emerald-600"></i> Rincian Target vs Realisasi per Divisi (Afdeling)
            </h2>
            <p class="text-xs text-slate-500">Evaluasi pencapaian target dan status indikator warna</p>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>Kode Afdeling</th>
                  <th>Nama Divisi</th>
                  <th>Mandor Utama</th>
                  <th>Luas (Ha)</th>
                  <th>Realisasi (Ton)</th>
                  <th>Target (Ton)</th>
                  <th>Selisih (Ton)</th>
                  <th>Pencapaian (%)</th>
                  <th>Status Indikator</th>
                </tr>
              </thead>
              <tbody>
                ${afdProductivity.map(afd => {
                  const selisih = Number((afd.totalTon - afd.targetTon).toFixed(2));
                  return `
                    <tr>
                      <td class="font-bold text-emerald-800">${afd.kode}</td>
                      <td class="font-medium text-slate-800">${afd.nama}</td>
                      <td>${afd.mandorUtama}</td>
                      <td>${afd.luasHa} Ha</td>
                      <td class="font-bold text-slate-900">${afd.totalTon} Ton</td>
                      <td class="font-semibold text-slate-600">${afd.targetTon} Ton</td>
                      <td class="font-bold ${selisih >= 0 ? 'text-emerald-700' : 'text-rose-600'}">
                        ${selisih > 0 ? '+' : ''}${selisih} Ton
                      </td>
                      <td class="font-bold text-sm">${afd.pencapaianPercent}%</td>
                      <td>
                        ${this.getTargetBadge(afd.pencapaianPercent)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  openTargetModal() {
    const modal = document.getElementById('modal-target');
    const targets = window.simpStore.getTargets();
    if (!modal) return;

    document.getElementById('input-target-harian-kebun').value = targets.kebun.targetHarianTon;
    document.getElementById('input-target-bulanan-kebun').value = targets.kebun.targetBulananTon;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeTargetModal() {
    const modal = document.getElementById('modal-target');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  handleSaveTarget() {
    const harian = Number(document.getElementById('input-target-harian-kebun').value);
    const bulanan = Number(document.getElementById('input-target-bulanan-kebun').value);

    if (harian <= 0 || bulanan <= 0) {
      alert('Nilai target harus lebih besar dari 0!');
      return;
    }

    const currentTargets = window.simpStore.getTargets();
    currentTargets.kebun.targetHarianTon = harian;
    currentTargets.kebun.targetBulananTon = bulanan;

    window.simpStore.updateTargets(currentTargets);
    this.showToast('Target produksi kebun berhasil diperbarui!', 'success');
    this.closeTargetModal();
    this.renderTargetView();
  }

  // =========================================================================
  // 6. GRAFIK DAN ANALISIS DATA
  // =========================================================================
  renderAnalisisView() {
    const main = document.getElementById('view-content');

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-chart-pie text-emerald-700"></i> Visualisasi & Analisis Data Panen
            </h1>
            <p class="text-sm text-slate-500">Eksplorasi grafik interaktif tren produksi, produktivitas per blok, dan performa pemanen.</p>
          </div>
        </div>

        <!-- 4 Visual Analytics Charts Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Chart A: Produktivitas per Blok (Ton/Ha) -->
          <div class="card-sawit p-5">
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-chart-column text-emerald-600"></i> Peringkat Produktivitas per Blok (Ton/Ha)
              </h2>
              <p class="text-xs text-slate-500">Perbandingan efisiensi hasil panen tiap hektare areal</p>
            </div>
            <div class="mt-4 relative h-72">
              <canvas id="chart-analisis-blok"></canvas>
            </div>
          </div>

          <!-- Chart B: Produktivitas Top Pemanen -->
          <div class="card-sawit p-5">
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-users text-teal-600"></i> Top Produktivitas Pemanen (Kg TBS)
              </h2>
              <p class="text-xs text-slate-500">Total berat tandan yang dikumpulkan para pemanen terbaik</p>
            </div>
            <div class="mt-4 relative h-72">
              <canvas id="chart-analisis-pemanen"></canvas>
            </div>
          </div>

          <!-- Chart C: Komposisi Produksi per Afdeling (Donut) -->
          <div class="card-sawit p-5">
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-chart-pie text-emerald-700"></i> Proporsi Hasil Panen per Afdeling
              </h2>
              <p class="text-xs text-slate-500">Persentase kontribusi tonase tiap divisi perkebunan</p>
            </div>
            <div class="mt-4 relative h-72 flex items-center justify-center">
              <canvas id="chart-analisis-donut"></canvas>
            </div>
          </div>

          <!-- Chart D: Tren BJR (Berat Janjang Rata-rata) -->
          <div class="card-sawit p-5">
            <div class="pb-3 border-b border-slate-100">
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-wave-square text-amber-600"></i> Tren Berat Janjang Rata-rata (BJR)
              </h2>
              <p class="text-xs text-slate-500">Stabilitas bobot janjang (kg/janjang) dari waktu ke waktu</p>
            </div>
            <div class="mt-4 relative h-72">
              <canvas id="chart-analisis-bjr"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    // Render 4 charts
    setTimeout(() => {
      window.simpCharts.renderBlockProductivityChart('chart-analisis-blok');
      window.simpCharts.renderHarvesterProductivityChart('chart-analisis-pemanen');
      window.simpCharts.renderAfdelingShareDonut('chart-analisis-donut');
      window.simpCharts.renderBjrTrendChart('chart-analisis-bjr');
    }, 50);
  }

  // =========================================================================
  // 7. LAPORAN DAN EKSPOR DATA (EXCEL / PDF / CETAK)
  // =========================================================================
  renderLaporanView() {
    const main = document.getElementById('view-content');
    const logs = window.simpStore.getHarvestLogs();
    const todayStats = window.simpStore.getTodayStats();
    const monthStats = window.simpStore.getMonthStats();
    const estate = window.simpStore.getEstateInfo();

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-file-invoice text-emerald-700"></i> Pusat Laporan & Ekspor Data
            </h1>
            <p class="text-sm text-slate-500">Cetak laporan resmi operasional perkebunan, ekspor ke format Excel (.xlsx), atau simpan ke PDF.</p>
          </div>
          <div class="flex items-center gap-2.5">
            <button onclick="window.simpExport.triggerPrint()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition flex items-center gap-2 text-sm">
              <i class="fa-solid fa-print"></i> Cetak Dokumen Resmi
            </button>
            <button onclick="window.simpExport.exportFullReportToExcel()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2 text-sm">
              <i class="fa-solid fa-file-excel text-emerald-700"></i> Unduh Semua Excel
            </button>
          </div>
        </div>

        <!-- 3 Ready-to-Download Report Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div class="card-sawit p-5 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-calendar-day"></i>
              </div>
              <h3 class="font-bold text-slate-800 text-base">Laporan Produksi TBS Harian</h3>
              <p class="text-xs text-slate-500 mt-1">Rekap data timbangan, jumlah janjang, brondolan, dan kondisi ancak per pemanen hari ini.</p>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <button onclick="window.simpExport.exportHarvestToExcel(window.simpStore.getHarvestLogs().filter(h => h.tanggal === '${todayStats.todayStr}'), 'Laporan_Panen_Harian_${todayStats.todayStr}.xlsx')" class="w-full bg-slate-100 hover:bg-emerald-50 text-emerald-800 font-semibold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-download"></i> Unduh Excel
              </button>
            </div>
          </div>

          <div class="card-sawit p-5 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-chart-simple"></i>
              </div>
              <h3 class="font-bold text-slate-800 text-base">Laporan Produktivitas Blok & Afdeling</h3>
              <p class="text-xs text-slate-500 mt-1">Analisis hasil per hektare (Ton/Ha), status blok, BJR rata-rata, dan pemenuhan target.</p>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <button onclick="window.simpExport.exportFullReportToExcel('Laporan_Produktivitas_Blok_Afdeling.xlsx')" class="w-full bg-slate-100 hover:bg-teal-50 text-teal-800 font-semibold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-download"></i> Unduh Excel
              </button>
            </div>
          </div>

          <div class="card-sawit p-5 flex flex-col justify-between">
            <div>
              <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg mb-3">
                <i class="fa-solid fa-id-card-clip"></i>
              </div>
              <h3 class="font-bold text-slate-800 text-base">Laporan Kinerja & Premi Pemanen</h3>
              <p class="text-xs text-slate-500 mt-1">Daftar rekapitulasi kehadiran, total janjang, capaian target, dan evaluasi losses pemanen.</p>
            </div>
            <div class="mt-5 pt-4 border-t border-slate-100 flex items-center gap-2">
              <button onclick="window.simpExport.exportFullReportToExcel('Laporan_Kinerja_Pemanen.xlsx')" class="w-full bg-slate-100 hover:bg-amber-50 text-amber-800 font-semibold py-2 rounded-lg text-xs transition flex items-center justify-center gap-1.5">
                <i class="fa-solid fa-download"></i> Unduh Excel
              </button>
            </div>
          </div>
        </div>

        <!-- Official Report Preview (Print Layout Ready) -->
        <div class="card-sawit p-8 print-preview-container bg-white">
          <!-- Kop Surat Resmi Perkebunan -->
          <div class="border-b-2 border-slate-800 pb-4 mb-6 text-center">
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-wide">${estate.name}</h2>
            <h3 class="text-sm font-bold text-emerald-800">${estate.estateName} - DIVISI OPERASIONAL KEBUN</h3>
            <p class="text-xs text-slate-500 mt-0.5">${estate.lokasi} | Total Areal Terkelola: ${estate.totalArealHa} Ha</p>
            <div class="mt-3 inline-block bg-slate-100 text-slate-800 font-bold px-4 py-1 rounded text-xs uppercase tracking-wider">
              REKAPITULASI RESMI AKTIVITAS PANEN & PRODUKTIVITAS TBS
            </div>
          </div>

          <!-- Metadata Header -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs mb-5 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span class="text-slate-400 block font-medium">Tanggal Cetak:</span>
              <b class="text-slate-800 font-mono">${new Date().toISOString().split('T')[0]}</b>
            </div>
            <div>
              <span class="text-slate-400 block font-medium">Total Realisasi MTD:</span>
              <b class="text-emerald-800 font-bold">${monthStats.totalTon} Ton</b>
            </div>
            <div>
              <span class="text-slate-400 block font-medium">Pencapaian Target:</span>
              <b class="text-slate-800 font-bold">${monthStats.achievementPercent}%</b>
            </div>
            <div>
              <span class="text-slate-400 block font-medium">BJR Rata-rata Kebun:</span>
              <b class="text-slate-800 font-bold">${todayStats.overallBjr} Kg/Janjang</b>
            </div>
          </div>

          <!-- Printable Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>No</th>
                  <th>ID Tiket</th>
                  <th>Tanggal</th>
                  <th>Afdeling / Blok</th>
                  <th>Pemanen</th>
                  <th>Mandor</th>
                  <th>Janjang</th>
                  <th>Berat TBS</th>
                  <th>Total (Ton)</th>
                  <th>BJR</th>
                </tr>
              </thead>
              <tbody>
                ${logs.slice(0, 15).map((log, i) => {
                  const afd = window.simpStore.getAfdelingById(log.afdelingId);
                  const blk = window.simpStore.getBlockById(log.blokId);
                  const pmn = window.simpStore.getHarvesterById(log.pemanenId);
                  const mdr = window.simpStore.getMandorById(log.mandorId);
                  return `
                    <tr>
                      <td class="font-mono text-slate-400">${i + 1}</td>
                      <td class="font-mono font-medium">${log.id}</td>
                      <td>${log.tanggal}</td>
                      <td class="font-bold">${afd ? afd.kode : ''} - Blok ${blk ? blk.kode : ''}</td>
                      <td class="font-semibold">${pmn ? pmn.nama : '-'}</td>
                      <td>${mdr ? mdr.nama : '-'}</td>
                      <td class="font-bold">${log.janjang}</td>
                      <td>${this.formatNumber(log.totalKg)} kg</td>
                      <td class="font-black text-emerald-900">${log.totalTon} T</td>
                      <td>${log.bjr} kg</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Official Signatures for Plantation Operations -->
          <div class="mt-12 pt-6 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p class="text-slate-500 mb-14">Dibuat Oleh,<br><b class="text-slate-800">Kerani Timbang / Mandor 1</b></p>
              <div class="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold text-slate-700">Wawan Setiawan</div>
            </div>
            <div>
              <p class="text-slate-500 mb-14">Diperiksa Oleh,<br><b class="text-slate-800">Kepala Afdeling / Asisten</b></p>
              <div class="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold text-slate-700">Ir. Bambang Hermanto</div>
            </div>
            <div>
              <p class="text-slate-500 mb-14">Disetujui Oleh,<br><b class="text-slate-800">Estate Manager Kebun</b></p>
              <div class="border-t border-slate-400 w-36 mx-auto pt-1 font-semibold text-slate-700">Ir. H. Siregar, M.M.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 8. MANAJEMEN DATA MASTER (AFDELING, BLOK, KARYAWAN, MANDOR, RESET)
  // =========================================================================
  renderMasterView() {
    const main = document.getElementById('view-content');
    const afdelings = window.simpStore.getAfdelings();
    const bloks = window.simpStore.getBloks();
    const pemanens = window.simpStore.getHarvesters();
    const mandors = window.simpStore.getMandors();
    const role = window.simpStore.getActiveRole();

    main.innerHTML = `
      <div class="space-y-6 animate-fade-in">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-database text-emerald-700"></i> Manajemen Data Master Kebun
            </h1>
            <p class="text-sm text-slate-500">Kelola master data afdeling, blok tanam, pemanen, mandor, dan reset data simulasi demo.</p>
          </div>
          <div class="flex items-center gap-2.5">
            ${role === 'admin' ? `
              <button onclick="window.simpApp.openBlockModal()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-2 text-xs">
                <i class="fa-solid fa-plus"></i> Tambah Blok
              </button>
              <button onclick="window.simpApp.openHarvesterModal()" class="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-3.5 py-2 rounded-xl shadow transition flex items-center gap-2 text-xs">
                <i class="fa-solid fa-user-plus"></i> Tambah Pemanen
              </button>
              <button onclick="window.simpApp.handleResetDemoData()" class="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-2 text-xs">
                <i class="fa-solid fa-rotate-left"></i> Reset Demo
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 1. Data Afdeling (Divisi) -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-sitemap text-emerald-600"></i> Data Afdeling (Divisi Kebun)
              </h2>
              <p class="text-xs text-slate-500">Master unit operasional dan luas areal</p>
            </div>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Afdeling</th>
                  <th>Luas Areal (Ha)</th>
                  <th>Mandor Utama</th>
                  <th>Jumlah Blok</th>
                </tr>
              </thead>
              <tbody>
                ${afdelings.map(afd => {
                  const blockCount = bloks.filter(b => b.afdelingId === afd.id).length;
                  return `
                    <tr>
                      <td class="font-bold text-emerald-800 font-mono">${afd.kode}</td>
                      <td class="font-semibold text-slate-800">${afd.nama}</td>
                      <td><b>${afd.luasHa}</b> Ha</td>
                      <td>${afd.mandorUtama}</td>
                      <td><span class="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">${blockCount} Blok</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 2. Data Blok Tanam -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-cubes text-emerald-600"></i> Data Blok Tanam Kelapa Sawit
              </h2>
              <p class="text-xs text-slate-500">Katalog blok, luas, tahun tanam, jenis bibit, dan populasi pokok</p>
            </div>
            ${role === 'admin' ? `
              <button onclick="window.simpApp.openBlockModal()" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                <i class="fa-solid fa-circle-plus"></i> Tambah Blok Baru
              </button>
            ` : ''}
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kode Blok</th>
                  <th>Afdeling</th>
                  <th>Luas (Ha)</th>
                  <th>Tahun Tanam</th>
                  <th>Varietas Bibit</th>
                  <th>Jumlah Pokok</th>
                  <th>Kerapatan (Pkk/Ha)</th>
                  ${role === 'admin' ? '<th class="text-center">Aksi</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${bloks.map((b, idx) => {
                  const afd = afdelings.find(a => a.id === b.afdelingId);
                  const sph = b.luasHa > 0 ? Math.round(b.jumlahPokok / b.luasHa) : 0;
                  return `
                    <tr>
                      <td class="text-slate-400 font-mono">${idx + 1}</td>
                      <td class="font-bold text-slate-800">Blok ${b.kode}</td>
                      <td><span class="font-semibold text-emerald-800">${afd ? afd.kode : b.afdelingId}</span></td>
                      <td class="font-bold">${b.luasHa} Ha</td>
                      <td>${b.tahunTanam}</td>
                      <td><span class="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">${b.varietas}</span></td>
                      <td>${this.formatNumber(b.jumlahPokok)} Pokok</td>
                      <td class="text-slate-500">${sph} pkk/ha</td>
                      ${role === 'admin' ? `
                        <td class="text-center">
                          <button onclick="window.simpApp.openBlockModal('${b.id}')" class="p-1 text-slate-500 hover:text-amber-600" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button onclick="window.simpApp.handleDeleteBlock('${b.id}')" class="p-1 text-slate-500 hover:text-rose-600" title="Hapus">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 3. Data Karyawan Pemanen -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                <i class="fa-solid fa-users-gear text-emerald-600"></i> Data Karyawan Pemanen
              </h2>
              <p class="text-xs text-slate-500">Master pemanen dan target kerja harian individu</p>
            </div>
            ${role === 'admin' ? `
              <button onclick="window.simpApp.openHarvesterModal()" class="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                <i class="fa-solid fa-user-plus"></i> Tambah Pemanen Baru
              </button>
            ` : ''}
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>No</th>
                  <th>NIK</th>
                  <th>Nama Pemanen</th>
                  <th>Afdeling</th>
                  <th>Target Harian (Kg)</th>
                  <th>Kehadiran Terakhir</th>
                  <th>Rating Kualitas</th>
                  <th>Tingkat Losses</th>
                  ${role === 'admin' ? '<th class="text-center">Aksi</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${pemanens.map((p, idx) => {
                  const afd = afdelings.find(a => a.id === p.afdelingId);
                  return `
                    <tr>
                      <td class="text-slate-400 font-mono">${idx + 1}</td>
                      <td class="font-mono font-semibold text-slate-600">${p.nik}</td>
                      <td class="font-bold text-slate-800">${p.nama}</td>
                      <td><span class="font-semibold text-emerald-800">${afd ? afd.kode : p.afdelingId}</span></td>
                      <td class="font-bold text-emerald-900">${this.formatNumber(p.targetHarianKg)} kg</td>
                      <td>${p.hadirHari} / ${p.totalHariKerja} Hari</td>
                      <td><span class="text-emerald-700 font-bold">${p.ratingKualitas}%</span></td>
                      <td><span class="text-slate-700 font-semibold">${p.lossesPersen}%</span></td>
                      ${role === 'admin' ? `
                        <td class="text-center">
                          <button onclick="window.simpApp.openHarvesterModal('${p.id}')" class="p-1 text-slate-500 hover:text-amber-600" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button onclick="window.simpApp.handleDeleteHarvester('${p.id}')" class="p-1 text-slate-500 hover:text-rose-600" title="Hapus">
                            <i class="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      ` : ''}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- 4. Data Mandor -->
        <div class="card-sawit p-5">
          <div class="pb-3 border-b border-slate-100">
            <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <i class="fa-solid fa-user-tie text-emerald-600"></i> Data Mandor Panen Lapangan
            </h2>
            <p class="text-xs text-slate-500">Penanggung jawab ancak dan pengawasan kualitas panen</p>
          </div>
          <div class="mt-4 overflow-x-auto">
            <table class="w-full text-left text-xs table-sawit">
              <thead>
                <tr>
                  <th>NIK Mandor</th>
                  <th>Nama Lengkap</th>
                  <th>Wilayah Afdeling</th>
                  <th>No Telepon</th>
                  <th>Pengalaman</th>
                </tr>
              </thead>
              <tbody>
                ${mandors.map(m => {
                  const afd = afdelings.find(a => a.id === m.afdelingId);
                  return `
                    <tr>
                      <td class="font-mono font-bold text-slate-700">${m.nik}</td>
                      <td class="font-bold text-slate-900">${m.nama}</td>
                      <td><span class="font-semibold text-emerald-800">${afd ? afd.nama : m.afdelingId}</span></td>
                      <td>${m.telepon}</td>
                      <td><b>${m.pengalamanTahun}</b> Tahun Kerja</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // --- MASTER BLOK MODAL ---
  openBlockModal(idToEdit = null) {
    this.activeBlockIdToEdit = idToEdit;
    const modal = document.getElementById('modal-block');
    const title = document.getElementById('modal-block-title');
    const form = document.getElementById('block-form');
    const afdSelect = document.getElementById('input-block-afdeling');
    if (!modal || !form) return;

    const afdelings = window.simpStore.getAfdelings();
    if (afdSelect) {
      afdSelect.innerHTML = afdelings.map(a => `<option value="${a.id}">${a.nama}</option>`).join('');
    }

    if (idToEdit) {
      const blk = window.simpStore.getBlockById(idToEdit);
      if (!blk) return;
      title.innerHTML = `<i class="fa-solid fa-pen-to-square text-amber-500"></i> Edit Data Blok (${blk.kode})`;
      document.getElementById('input-block-kode').value = blk.kode;
      document.getElementById('input-block-afdeling').value = blk.afdelingId;
      document.getElementById('input-block-luas').value = blk.luasHa;
      document.getElementById('input-block-tahun').value = blk.tahunTanam;
      document.getElementById('input-block-varietas').value = blk.varietas;
      document.getElementById('input-block-pokok').value = blk.jumlahPokok;
      document.getElementById('input-block-status').value = blk.statusPanen || 'Belum Panen';
    } else {
      title.innerHTML = `<i class="fa-solid fa-circle-plus text-emerald-600"></i> Tambah Blok Tanam Baru`;
      form.reset();
      document.getElementById('input-block-luas').value = '28.0';
      document.getElementById('input-block-tahun').value = '2016';
      document.getElementById('input-block-varietas').value = 'Marihat';
      document.getElementById('input-block-pokok').value = '3920';
      document.getElementById('input-block-status').value = 'Belum Panen';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeBlockModal() {
    const modal = document.getElementById('modal-block');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.activeBlockIdToEdit = null;
  }

  handleSaveBlock() {
    const kode = document.getElementById('input-block-kode').value.trim();
    const afdelingId = document.getElementById('input-block-afdeling').value;
    const luasHa = Number(document.getElementById('input-block-luas').value);
    const tahunTanam = Number(document.getElementById('input-block-tahun').value);
    const varietas = document.getElementById('input-block-varietas').value.trim();
    const jumlahPokok = Number(document.getElementById('input-block-pokok').value);
    const statusPanen = document.getElementById('input-block-status').value;

    if (!kode || luasHa <= 0) {
      alert('Mohon isi kode blok dan luas areal yang valid!');
      return;
    }

    const payload = {
      kode,
      afdelingId,
      luasHa,
      tahunTanam,
      varietas,
      jumlahPokok,
      statusPanen
    };

    if (this.activeBlockIdToEdit) {
      payload.id = this.activeBlockIdToEdit;
      window.simpStore.updateBlock(payload);
      this.showToast(`Data Blok ${kode} berhasil diperbarui!`, 'success');
    } else {
      window.simpStore.addBlock(payload);
      this.showToast(`Blok baru ${kode} berhasil ditambahkan!`, 'success');
    }

    this.closeBlockModal();
    this.renderMasterView();
  }

  handleDeleteBlock(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus Blok ini?`)) {
      window.simpStore.deleteBlock(id);
      this.showToast('Data blok berhasil dihapus.', 'warning');
      this.renderMasterView();
    }
  }

  // --- MASTER HARVESTER MODAL ---
  openHarvesterModal(idToEdit = null) {
    this.activeHarvesterIdToEdit = idToEdit;
    const modal = document.getElementById('modal-harvester');
    const title = document.getElementById('modal-harvester-title');
    const form = document.getElementById('harvester-form');
    const afdSelect = document.getElementById('input-harvester-afdeling');
    if (!modal || !form) return;

    const afdelings = window.simpStore.getAfdelings();
    if (afdSelect) {
      afdSelect.innerHTML = afdelings.map(a => `<option value="${a.id}">${a.nama}</option>`).join('');
    }

    if (idToEdit) {
      const pmn = window.simpStore.getHarvesterById(idToEdit);
      if (!pmn) return;
      title.innerHTML = `<i class="fa-solid fa-user-pen text-amber-500"></i> Edit Data Pemanen (${pmn.nama})`;
      document.getElementById('input-harvester-nik').value = pmn.nik;
      document.getElementById('input-harvester-nama').value = pmn.nama;
      document.getElementById('input-harvester-afdeling').value = pmn.afdelingId;
      document.getElementById('input-harvester-target').value = pmn.targetHarianKg;
      document.getElementById('input-harvester-hadir').value = pmn.hadirHari;
      document.getElementById('input-harvester-totalhari').value = pmn.totalHariKerja;
      document.getElementById('input-harvester-kualitas').value = pmn.ratingKualitas;
      document.getElementById('input-harvester-losses').value = pmn.lossesPersen;
    } else {
      title.innerHTML = `<i class="fa-solid fa-user-plus text-emerald-600"></i> Tambah Pemanen Baru`;
      form.reset();
      document.getElementById('input-harvester-nik').value = 'PMN-' + Math.floor(100 + Math.random() * 900);
      document.getElementById('input-harvester-target').value = '1200';
      document.getElementById('input-harvester-hadir').value = '25';
      document.getElementById('input-harvester-totalhari').value = '26';
      document.getElementById('input-harvester-kualitas').value = '95';
      document.getElementById('input-harvester-losses').value = '1.2';
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeHarvesterModal() {
    const modal = document.getElementById('modal-harvester');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.activeHarvesterIdToEdit = null;
  }

  handleSaveHarvester() {
    const nik = document.getElementById('input-harvester-nik').value.trim();
    const nama = document.getElementById('input-harvester-nama').value.trim();
    const afdelingId = document.getElementById('input-harvester-afdeling').value;
    const targetHarianKg = Number(document.getElementById('input-harvester-target').value);
    const hadirHari = Number(document.getElementById('input-harvester-hadir').value);
    const totalHariKerja = Number(document.getElementById('input-harvester-totalhari').value);
    const ratingKualitas = Number(document.getElementById('input-harvester-kualitas').value);
    const lossesPersen = Number(document.getElementById('input-harvester-losses').value);

    if (!nik || !nama || targetHarianKg <= 0) {
      alert('Mohon isi NIK, Nama, dan Target Pemanen!');
      return;
    }

    const payload = {
      nik,
      nama,
      afdelingId,
      targetHarianKg,
      hadirHari,
      totalHariKerja,
      ratingKualitas,
      lossesPersen
    };

    if (this.activeHarvesterIdToEdit) {
      payload.id = this.activeHarvesterIdToEdit;
      window.simpStore.updateHarvester(payload);
      this.showToast(`Data Pemanen ${nama} berhasil diperbarui!`, 'success');
    } else {
      window.simpStore.addHarvester(payload);
      this.showToast(`Pemanen baru ${nama} berhasil didaftarkan!`, 'success');
    }

    this.closeHarvesterModal();
    this.renderMasterView();
  }

  handleDeleteHarvester(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus data pemanen ini?`)) {
      window.simpStore.deleteHarvester(id);
      this.showToast('Data pemanen berhasil dihapus.', 'warning');
      this.renderMasterView();
    }
  }

  handleResetDemoData() {
    if (confirm('Apakah Anda yakin ingin mengembalikan seluruh data perkebunan ke kondisi awal (demo seed)? Semua perubahan akan direset.')) {
      window.simpStore.resetToDefault();
      this.showToast('Data simulasi perkebunan berhasil direset ke setelan awal!', 'info');
      this.renderMasterView();
    }
  }
}

// Global App Initialization
document.addEventListener('DOMContentLoaded', () => {
  window.simpApp = new App();
  window.simpApp.init();
});
