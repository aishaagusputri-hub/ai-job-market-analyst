/**
 * AI Job Market Analyst - Core Dashboard Logic (Tahap 3, 4 & 5)
 * Menggunakan Vanilla JavaScript (ES6+ Modular), Chart.js & Gemini API (Multi-Model Fallback)
 * Seluruh metrik dihitung 100% dari data aktual di data/jobs.json
 */

// State global aplikasi
const state = {
  rawJobs: [],
  filteredJobs: [],
  charts: {
    jobDemand: null,
    skillsDemand: null,
    salary: null,
    location: null,
    employment: null,
    experience: null
  }
};

// Palet warna konsisten dan modern
const CHART_COLORS = {
  indigo: '#4f46e5',
  indigoLight: 'rgba(79, 70, 229, 0.15)',
  cyan: '#06b6d4',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
  slate: '#64748b',
  palette: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#f43f5e', '#ec4899', '#14b8a6']
};

/**
 * Inisialisasi aplikasi saat DOM selesai dimuat
 */
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupFilterListeners();
  setupAIInsightsListener();
  loadDataset();
});

/**
 * Mengatur navigasi sidebar mobile dan highlight menu aktif
 */
function setupNavigation() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const menuBtn = document.getElementById('mobileMenuBtn');
  const navLinks = document.querySelectorAll('.nav-link');

  const toggleSidebar = (show) => {
    if (show) {
      sidebar.classList.remove('-translate-x-full');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      overlay.classList.add('hidden');
    }
  };

  menuBtn?.addEventListener('click', () => toggleSidebar(true));
  overlay?.addEventListener('click', () => toggleSidebar(false));

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      if (window.innerWidth < 1024) toggleSidebar(false);
    });
  });
}

/**
 * Memuat data dari file lokal data/jobs.json
 */
async function loadDataset() {
  const statusBadge = document.getElementById('datasetStatusBadge');
  try {
    const response = await fetch('data/jobs.json');
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Dataset kosong atau format tidak valid.');
    }

    state.rawJobs = data;
    state.filteredJobs = [...data];

    statusBadge.textContent = `${data.length.toLocaleString('id-ID')} baris aktif`;
    statusBadge.className = 'text-emerald-400 font-medium';

    populateFilterOptions(data);
    updateDashboard();
  } catch (error) {
    console.error('Gagal memuat dataset:', error);
    statusBadge.textContent = 'Gagal memuat JSON';
    statusBadge.className = 'text-rose-400 font-medium';
    alert('Gagal memuat data/jobs.json. Pastikan Anda menjalankan project menggunakan Local Server (seperti Live Server VS Code atau python -m http.server), bukan membuka file HTML secara langsung (file://).');
  }
}

/**
 * Mengisi dropdown filter secara dinamis dari nilai unik dataset
 */
function populateFilterOptions(jobs) {
  const jobTitleSelect = document.getElementById('filterJobTitle');
  const locationSelect = document.getElementById('filterLocation');
  const empTypeSelect = document.getElementById('filterEmploymentType');
  const expLevelSelect = document.getElementById('filterExperienceLevel');

  // Ambil Top 100 Job Title terbanyak agar dropdown tetap rapi dan responsif
  const titleCounts = countFrequency(jobs, (j) => j.job_title);
  const topTitles = Object.entries(titleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([title]) => title);

  // Ambil seluruh negara unik (country) yang diurutkan berdasarkan jumlah lowongan
  const countryCounts = countFrequency(jobs, (j) => j.country || j.location);
  const sortedCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([country]) => country);

  const uniqueEmpTypes = [...new Set(jobs.map((j) => j.employment_type).filter(Boolean))].sort();
  const uniqueExpLevels = [...new Set(jobs.map((j) => j.experience_level).filter(Boolean))].sort();

  appendOptions(jobTitleSelect, topTitles);
  appendOptions(locationSelect, sortedCountries);
  appendOptions(empTypeSelect, uniqueEmpTypes);
  appendOptions(expLevelSelect, uniqueExpLevels);
}

function appendOptions(selectEl, items) {
  items.forEach((item) => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    selectEl.appendChild(option);
  });
}

/**
 * Mengatur event listener untuk seluruh filter dan tombol reset
 */
function setupFilterListeners() {
  const filterIds = [
    'filterJobTitle',
    'filterLocation',
    'filterEmploymentType',
    'filterExperienceLevel'
  ];

  filterIds.forEach((id) => {
    document.getElementById(id)?.addEventListener('change', applyFilters);
  });

  document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
    filterIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = 'ALL';
    });
    applyFilters();
  });
}

/**
 * Menyaring data berdasarkan pilihan user dan memperbarui seluruh UI
 */
function applyFilters() {
  const selectedTitle = document.getElementById('filterJobTitle').value;
  const selectedLocation = document.getElementById('filterLocation').value;
  const selectedEmpType = document.getElementById('filterEmploymentType').value;
  const selectedExpLevel = document.getElementById('filterExperienceLevel').value;

  state.filteredJobs = state.rawJobs.filter((job) => {
    const matchTitle = selectedTitle === 'ALL' || job.job_title === selectedTitle;
    const jobLoc = job.country || job.location;
    const matchLocation = selectedLocation === 'ALL' || jobLoc === selectedLocation;
    const matchEmpType = selectedEmpType === 'ALL' || job.employment_type === selectedEmpType;
    const matchExpLevel = selectedExpLevel === 'ALL' || job.experience_level === selectedExpLevel;
    return matchTitle && matchLocation && matchEmpType && matchExpLevel;
  });

  // Update indikator filter aktif
  const activeCount = [selectedTitle, selectedLocation, selectedEmpType, selectedExpLevel].filter((v) => v !== 'ALL').length;
  const filterBadge = document.getElementById('activeFilterCount');
  filterBadge.textContent = activeCount > 0
    ? `${activeCount} filter aktif (${state.filteredJobs.length.toLocaleString('id-ID')} hasil)`
    : `Menampilkan seluruh data (${state.rawJobs.length.toLocaleString('id-ID')} lowongan)`;

  updateDashboard();
}

/**
 * Memperbarui KPI Cards dan seluruh 6 grafik Chart.js
 */
function updateDashboard() {
  const jobs = state.filteredJobs;
  updateKPICards(jobs);
  renderJobDemandChart(jobs);
  renderSkillsDemandChart(jobs);
  renderSalaryChart(jobs);
  renderLocationChart(jobs);
  renderEmploymentChart(jobs);
  renderExperienceChart(jobs);
}

/**
 * Menghitung dan menampilkan 4 metrik KPI utama dari data terfilter
 */
function updateKPICards(jobs) {
  // 1. Total Job Listings
  document.getElementById('kpiTotalJobs').textContent = jobs.length.toLocaleString('id-ID');

  // 2. Total Companies (unik)
  const uniqueCompanies = new Set(jobs.map((j) => j.company).filter(Boolean));
  document.getElementById('kpiTotalCompanies').textContent = uniqueCompanies.size.toLocaleString('id-ID');

  // 3. Most Demanded Skill
  const skillFreq = {};
  jobs.forEach((job) => {
    if (Array.isArray(job.skills)) {
      job.skills.forEach((skill) => {
        const cleanSkill = skill.trim();
        if (cleanSkill) {
          skillFreq[cleanSkill] = (skillFreq[cleanSkill] || 0) + 1;
        }
      });
    }
  });

  const sortedSkills = Object.entries(skillFreq).sort((a, b) => b[1] - a[1]);
  const topSkillEl = document.getElementById('kpiTopSkill');
  const topSkillSubEl = document.getElementById('kpiTopSkillSub');

  if (sortedSkills.length > 0) {
    const [topSkillName, topSkillCount] = sortedSkills[0];
    topSkillEl.textContent = topSkillName;
    topSkillEl.title = topSkillName;
    topSkillSubEl.textContent = `Muncul di ${topSkillCount.toLocaleString('id-ID')} lowongan`;
  } else {
    topSkillEl.textContent = 'Data tidak tersedia';
    topSkillEl.title = 'Data tidak tersedia';
    topSkillSubEl.textContent = 'Tidak ada data skill tercatat';
  }

  // 4. Average Salary (hanya dari data yang memiliki salary_usd valid)
  const validSalaries = jobs
    .map((j) => j.salary_usd)
    .filter((s) => typeof s === 'number' && !isNaN(s) && s > 0);

  const avgSalaryEl = document.getElementById('kpiAvgSalary');
  const avgSalarySubEl = document.getElementById('kpiAvgSalarySub');

  if (validSalaries.length > 0) {
    const sum = validSalaries.reduce((acc, val) => acc + val, 0);
    const avg = Math.round(sum / validSalaries.length);
    avgSalaryEl.textContent = `$${avg.toLocaleString('en-US')}`;
    avgSalarySubEl.textContent = `Berdasarkan ${validSalaries.length.toLocaleString('id-ID')} data gaji valid`;
  } else {
    avgSalaryEl.textContent = 'Data tidak tersedia';
    avgSalarySubEl.textContent = 'Tidak ada info gaji pada filter ini';
  }
}

/**
 * Chart 1: Job Demand Analysis (Horizontal Bar Chart - Top 10 Job Titles)
 */
function renderJobDemandChart(jobs) {
  const counts = countFrequency(jobs, (j) => j.job_title);
  const top10 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  toggleEmptyState('jobDemandEmpty', top10.length === 0);
  if (state.charts.jobDemand) state.charts.jobDemand.destroy();
  if (top10.length === 0) return;

  const ctx = document.getElementById('jobDemandChart').getContext('2d');
  state.charts.jobDemand = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10.map(([title]) => truncateLabel(title, 32)),
      datasets: [{
        label: 'Jumlah Lowongan',
        data: top10.map(([, count]) => count),
        backgroundColor: CHART_COLORS.indigo,
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
            title: (items) => top10[items[0].dataIndex][0]
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

/**
 * Chart 2: Skills Demand Analysis (Horizontal Bar Chart - Top 12 Skills)
 */
function renderSkillsDemandChart(jobs) {
  const skillCounts = {};
  jobs.forEach((job) => {
    if (Array.isArray(job.skills)) {
      job.skills.forEach((s) => {
        const key = s.trim();
        if (key) skillCounts[key] = (skillCounts[key] || 0) + 1;
      });
    }
  });

  const top12 = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 12);

  toggleEmptyState('skillsDemandEmpty', top12.length === 0);
  if (state.charts.skillsDemand) state.charts.skillsDemand.destroy();
  if (top12.length === 0) return;

  const ctx = document.getElementById('skillsDemandChart').getContext('2d');
  state.charts.skillsDemand = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top12.map(([skill]) => truncateLabel(skill, 26)),
      datasets: [{
        label: 'Permintaan Skill',
        data: top12.map(([, count]) => count),
        backgroundColor: CHART_COLORS.cyan,
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
            title: (items) => top12[items[0].dataIndex][0]
          }
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: '#f1f5f9' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

/**
 * Chart 3: Salary Analysis (Vertical Bar Chart - Rata-rata gaji per Top Role)
 */
function renderSalaryChart(jobs) {
  const salaryGroups = {};
  jobs.forEach((job) => {
    if (typeof job.salary_usd === 'number' && !isNaN(job.salary_usd) && job.salary_usd > 0) {
      const title = job.job_title;
      if (!salaryGroups[title]) {
        salaryGroups[title] = { sum: 0, count: 0 };
      }
      salaryGroups[title].sum += job.salary_usd;
      salaryGroups[title].count += 1;
    }
  });

  const roleAverages = Object.entries(salaryGroups)
    .map(([title, stat]) => ({
      title,
      avg: Math.round(stat.sum / stat.count),
      count: stat.count
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);

  toggleEmptyState('salaryEmpty', roleAverages.length === 0);
  if (state.charts.salary) state.charts.salary.destroy();
  if (roleAverages.length === 0) return;

  const ctx = document.getElementById('salaryChart').getContext('2d');
  state.charts.salary = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: roleAverages.map((r) => truncateLabel(r.title, 20)),
      datasets: [{
        label: 'Rata-rata Gaji (USD/Tahun)',
        data: roleAverages.map((r) => r.avg),
        backgroundColor: CHART_COLORS.emerald,
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
            title: (items) => roleAverages[items[0].dataIndex].title,
            label: (ctx) => {
              const item = roleAverages[ctx.dataIndex];
              return `Rata-rata: $${item.avg.toLocaleString('en-US')} (${item.count} data)`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: {
            callback: (val) => `$${(val / 1000).toFixed(0)}k`
          }
        }
      }
    }
  });
}

/**
 * Chart 4: Location Analysis (Bar Chart - Top 10 Locations)
 */
function renderLocationChart(jobs) {
  const locCounts = countFrequency(jobs, (j) => j.location);
  const top10Loc = Object.entries(locCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  toggleEmptyState('locationEmpty', top10Loc.length === 0);
  if (state.charts.location) state.charts.location.destroy();
  if (top10Loc.length === 0) return;

  const ctx = document.getElementById('locationChart').getContext('2d');
  state.charts.location = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top10Loc.map(([loc]) => truncateLabel(loc, 22)),
      datasets: [{
        label: 'Jumlah Lowongan',
        data: top10Loc.map(([, count]) => count),
        backgroundColor: CHART_COLORS.violet,
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
            title: (items) => top10Loc[items[0].dataIndex][0]
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: '#f1f5f9' } }
      }
    }
  });
}

/**
 * Chart 5: Employment Type Distribution (Doughnut Chart)
 */
function renderEmploymentChart(jobs) {
  const counts = countFrequency(jobs, (j) => j.employment_type);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  toggleEmptyState('employmentEmpty', entries.length === 0);
  if (state.charts.employment) state.charts.employment.destroy();
  if (entries.length === 0) return;

  const ctx = document.getElementById('employmentChart').getContext('2d');
  state.charts.employment =
  state.charts.employment = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: entries.map(([type]) => type),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: CHART_COLORS.palette,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, padding: 14, font: { size: 11 } }
        }
      }
    }
  });
}

/**
- Chart 6: Experience Level Distribution (Pie / Doughnut Chart)
 */
function renderExperienceChart(jobs) {
  const counts = countFrequency(jobs, (j) => j.experience_level);
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  toggleEmptyState('experienceEmpty', entries.length === 0);
  if (state.charts.experience) state.charts.experience.destroy();
  if (entries.length === 0) return;

  const ctx = document.getElementById('experienceChart').getContext('2d');
  state.charts.experience = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: entries.map(([level]) => level),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: CHART_COLORS.palette.slice().reverse(),
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
          labels: { boxWidth: 12, padding: 14, font: { size: 11 } }
        }
      }
    }
  });
}

/**
- Helper: Menghitung frekuensi kemunculan nilai
 */
function countFrequency(items, getter) {
  const counts = {};
  items.forEach((item) => {
    const key = getter(item);
    if (key) {
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return counts;
}

/**
- Helper: Memotong teks label yang terlalu panjang di grafik
 */
function truncateLabel(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
}

/**
- Helper: Menampilkan/menyembunyikan pesan data kosong pada grafik
 */
function toggleEmptyState(elementId, isEmpty) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isEmpty) {
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

/**
- Setup Listener untuk Tombol Generate AI Insights
 */
function setupAIInsightsListener() {
  const generateBtn = document.getElementById('generateAiBtn');
  generateBtn?.addEventListener('click', generateAIInsights);
}

/**
- Mengirim ringkasan data ke Gemini API dengan sistem Multi-Model Fallback
 */
async function generateAIInsights() {
  const apiKeyInput = document.getElementById('geminiApiKey');
  const outputContainer = document.getElementById('aiInsightPreview');
  const btn = document.getElementById('generateAiBtn');

  const apiKey = apiKeyInput?.value.trim();
  if (!apiKey) {
    alert('Masukkan Gemini API Key Anda terlebih dahulu.');
    apiKeyInput?.focus();
    return;
  }

  if (state.filteredJobs.length === 0) {
    alert('Tidak ada data lowongan pada filter saat ini untuk dianalisis.');
    return;
  }

// Ambil model yang tersedia dari API Key atau gunakan default terbaru
  let fallbackModels = [
    'gemini-3.8-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash'
  ];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const dynamicModels = (listData.models || [])
        .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('flash'))
        .map((m) => m.name.replace('models/', ''))
        .reverse();
      if (dynamicModels.length > 0) {
        fallbackModels = [...new Set([...fallbackModels, ...dynamicModels])];
      }
    }
  } catch (e) {
    console.warn('Menggunakan daftar model default:', e);
  }

  btn.disabled = true;
  btn.classList.add('opacity-60', 'cursor-not-allowed');
  btn.textContent = '⏳ Menganalisis...';
  outputContainer.innerHTML = `<p class="text-cyan-300 animate-pulse">Menganalisis ${state.filteredJobs.length.toLocaleString('id-ID')} data lowongan dengan Gemini AI...</p>`;

const summaryPayload = buildDatasetSummary(state.filteredJobs);

  // LAYER 1, LAYER 2 & LAYER 4: System Instruction (Persona, Guardrails, & Format)
  const systemInstructionText = `# LAYER 1: PERSONA & ROLE DEFINITION
Anda adalah Senior AI Job Market Analyst yang objektif, analitis, dan berbasis data.

# LAYER 2: STATISTICAL GUARDRAILS & BIAS DETECTION
- Sample Size Awareness: Perhatikan jumlah sampel (total_filtered_jobs). Jika sampel kecil (< 50 lowongan), hindari klaim mutlak yang menggeneralisasi pasar global dan nyatakan bahwa temuan bersifat spesifik pada sampel/filter aktif.
- Bias Detection: Identifikasi potensi bias geografis, distribusi gaji, atau ketimpangan senioritas.
- Data Integrity: Jangan mengarang statistik di luar data yang diberikan.

# LAYER 4: OUTPUT FORMATTING
Sajikan analisis dalam Bahasa Indonesia yang lugas dan terstruktur ke dalam 4 bagian baku:
1. Tren Permintaan Utama
2. Kesenjangan & Prioritas Skill
3. Insight Kompensasi & Senioritas
4. Rekomendasi Strategis`;

  // LAYER 3: Dynamic Context Injection (User Prompt)
  const userPromptText = `Analisis ringkasan statistik dataset aktif berikut berdasarkan filter yang dipilih pengguna:
${JSON.stringify(summaryPayload, null, 2)}`;

  let successResponse = null;
  let usedModel = '';
  let lastError = null;

  for (const model of fallbackModels) {
    try {
      outputContainer.innerHTML = `<p class="text-cyan-300 animate-pulse">Menghubungi model <strong>${model}</strong> untuk menganalisis ${state.filteredJobs.length.toLocaleString('id-ID')} data lowongan...</p>`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          contents: [{ parts: [{ text: userPromptText }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 2500 }
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Respons model kosong.');

      successResponse = text;
      usedModel = model;
      break;
    } catch (err) {
      console.warn(`Model ${model} gagal, beralih ke fallback berikutnya:`, err.message);
      lastError = err;
    }
  }


  btn.disabled = false;
  btn.classList.remove('opacity-60', 'cursor-not-allowed');
  btn.textContent = '✨ Generate AI Insights';

  if (successResponse) {
    outputContainer.innerHTML = `
      <div class="flex items-center justify-between text-xs text-cyan-300 border-b border-slate-700/80 pb-2 mb-3">
        <span>✅ Analisis selesai (${state.filteredJobs.length.toLocaleString('id-ID')} lowongan)</span>
        <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">Model: ${usedModel}</span>
      </div>
      <div class="space-y-1 text-slate-200">${formatMarkdownToHTML(successResponse)}</div>
    `;
  } else {
    outputContainer.innerHTML = `<div class="p-3.5 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 text-sm">
      <strong>Gagal menghasilkan analisis AI:</strong> ${lastError?.message || 'Terjadi kesalahan jaringan/API.'}
    </div>`;
  }
/**
- Meringkas dataset terfilter menjadi statistik ringkas agar hemat token API
 */
function buildDatasetSummary(jobs) {
  const topRoles = Object.entries(countFrequency(jobs, (j) => j.job_title))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const skillCounts = {};
  jobs.forEach((j) => {
    if (Array.isArray(j.skills)) {
      j.skills.forEach((s) => {
        const k = String(s).trim();
        if (k) skillCounts[k] = (skillCounts[k] || 0) + 1;
      });
    }
  });
  const topSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const salaries = jobs.map((j) => j.salary_usd).filter((s) => typeof s === 'number' && !isNaN(s) && s > 0);
  const avgSalary = salaries.length ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null;

  return {
    total_filtered_jobs: jobs.length,
    top_roles: topRoles,
    top_skills: topSkills,
    average_salary_usd: avgSalary,
    experience_distribution: countFrequency(jobs, (j) => j.experience_level),
    employment_distribution: countFrequency(jobs, (j) => j.employment_type)
  };
}

/**
- Konversi sederhana Markdown dasar (bold & list) ke HTML aman
 */
function formatMarkdownToHTML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^###\s+(.*)$/gm, '<h4 class="text-base font-bold text-cyan-300 mt-4 mb-1.5">$1</h4>')
    .replace(/^##\s+(.*)$/gm, '<h3 class="text-lg font-bold text-white mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-slate-300 italic">$1</em>')
    .replace(/^\d+\.\s+(.*)$/gm, '<li class="ml-5 list-decimal mb-1.5">$1</li>')
    .replace(/^[-*]\s+(.*)$/gm, '<li class="ml-5 list-disc mb-1.5">$1</li>')
    .replace(/\n{2,}/g, '<br>')
    .replace(/\n/g, '<br>');
}
}
