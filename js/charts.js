/**
 * Chart Visualizations Layer (Chart.js)
 * SIMP-TBS Kelapa Sawit
 */

class ChartManager {
  constructor() {
    this.instances = {};
  }

  destroyChart(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  }

  // --- 1. DASHBOARD: TREN PRODUKSI HARIAN / MINGGUAN ---
  renderProductionTrendChart(canvasId, filterType = '7days') {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const logs = window.simpStore.getHarvestLogs();
    
    // Group logs by date
    const dateMap = {};
    logs.forEach(log => {
      dateMap[log.tanggal] = (dateMap[log.tanggal] || 0) + (log.totalTon || 0);
    });

    const sortedDates = Object.keys(dateMap).sort();
    let displayDates = sortedDates;

    if (filterType === '7days') {
      displayDates = sortedDates.slice(-7);
    } else if (filterType === '30days') {
      displayDates = sortedDates.slice(-30);
    }

    const dataPoints = displayDates.map(d => Number(dateMap[d].toFixed(2)));
    const labels = displayDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(45, 106, 79, 0.45)');
    gradient.addColorStop(1, 'rgba(82, 183, 136, 0.02)');

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Hari Ini'],
        datasets: [{
          label: 'Produksi TBS (Ton)',
          data: dataPoints.length ? dataPoints : [0],
          borderColor: '#1b4332',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: '#52b788',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4.5,
          pointHoverRadius: 6.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.parsed.y} Ton TBS`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (val) => `${val} T`
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- 2. DASHBOARD: TARGET VS REALISASI PER AFDELING ---
  renderTargetVsRealisasiChart(canvasId) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const afdProductivity = window.simpStore.getAfdelingProductivityList();
    const labels = afdProductivity.map(a => a.kode + ' (' + a.nama.split(' ')[1] + ')');
    const targetData = afdProductivity.map(a => a.targetTon);
    const realisasiData = afdProductivity.map(a => a.totalTon);

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Target (Ton)',
            data: targetData,
            backgroundColor: '#e9c46a',
            borderRadius: 6,
            barPercentage: 0.6
          },
          {
            label: 'Realisasi (Ton)',
            data: realisasiData,
            backgroundColor: '#2d6a4f',
            borderRadius: 6,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { boxWidth: 12, font: { size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Ton`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (val) => `${val} T`
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- 3. ANALISIS: PRODUKTIVITAS PER BLOK (TON/HA) ---
  renderBlockProductivityChart(canvasId) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const blockList = window.simpStore.getBlockProductivityList().slice(0, 10);
    const labels = blockList.map(b => `Blok ${b.kode} (${b.afdelingKode})`);
    const values = blockList.map(b => b.tonPerHa);

    // Color gradient based on productivity
    const colors = values.map(v => {
      if (v >= 0.15) return '#2d6a4f';
      if (v >= 0.10) return '#52b788';
      return '#f4a261';
    });

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Produktivitas (Ton/Ha)',
          data: values,
          backgroundColor: colors,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.x} Ton/Ha`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (v) => `${v} T/Ha`
            }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- 4. ANALISIS: TOP PRODUKTIVITAS PEMANEN ---
  renderHarvesterProductivityChart(canvasId) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const list = window.simpStore.getHarvesterPerformanceList().slice(0, 8);
    const labels = list.map(p => p.nama);
    const values = list.map(p => p.totalKg);

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total Panen (Kg)',
          data: values,
          backgroundColor: '#40916c',
          hoverBackgroundColor: '#1b4332',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.parsed.y.toLocaleString('id-ID')} Kg TBS`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (v) => `${(v/1000).toFixed(1)}k`
            }
          },
          x: {
            grid: { display: false },
            ticks: { maxRotation: 45, minRotation: 45 }
          }
        }
      }
    });
  }

  // --- 5. ANALISIS: DONUT KOMPOSISI PRODUKSI PER AFDELING ---
  renderAfdelingShareDonut(canvasId) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const afdList = window.simpStore.getAfdelingProductivityList();
    const labels = afdList.map(a => a.nama);
    const values = afdList.map(a => a.totalTon);

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: ['#1b4332', '#52b788', '#e9c46a'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} Ton (${ctx.formattedValue}%)`
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // --- 6. ANALISIS: TREN BJR HARIAN (KG/JANJANG) ---
  renderBjrTrendChart(canvasId) {
    this.destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const logs = window.simpStore.getHarvestLogs();
    const dateMap = {};
    logs.forEach(l => {
      if (!dateMap[l.tanggal]) {
        dateMap[l.tanggal] = { totalBerat: 0, totalJanjang: 0 };
      }
      dateMap[l.tanggal].totalBerat += (l.beratTbsKg || 0);
      dateMap[l.tanggal].totalJanjang += (l.janjang || 0);
    });

    const dates = Object.keys(dateMap).sort().slice(-14);
    const labels = dates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const bjrValues = dates.map(d => {
      const item = dateMap[d];
      return item.totalJanjang > 0 ? Number((item.totalBerat / item.totalJanjang).toFixed(2)) : 0;
    });

    const ctx = canvas.getContext('2d');
    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'BJR Rata-rata (Kg/Janjang)',
          data: bjrValues,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.08)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#d97706'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` BJR: ${ctx.parsed.y} Kg/Janjang`
            }
          }
        },
        scales: {
          y: {
            min: 14,
            max: 24,
            grid: { color: '#f1f5f9' },
            ticks: {
              callback: (v) => `${v} kg`
            }
          },
          x: {
            grid: { display: false }
          }
        }
      }
    });
  }
}

// Global ChartManager
window.simpCharts = new ChartManager();
