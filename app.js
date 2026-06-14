// ═══════════════════════════════════════════════
//  HealthMate – Frontend Application
// ═══════════════════════════════════════════════

const COLORS = ['#2563EB','#10B981','#EF4444','#F59E0B','#7C3AED','#EC4899','#06B6D4','#84CC16'];
let currentMedId = null;
let charts = {};
let healthRecords = [];
let medications = [];

// ─── Navigation ───────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
    document.getElementById('sidebar').classList.remove('open');
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  document.getElementById(`page-${page}`).classList.add('active');
  if (page === 'tracking') loadTrackingCharts();
  if (page === 'appointments') loadAppointments();
  if (page === 'profile') loadProfile();
}

document.getElementById('menuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'history') loadLogs();
  });
});

// ─── Init ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Set today's date in header
  const now = new Date();
  document.getElementById('headerDate').textContent =
    now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  loadDashboard();
  loadMedications();
  setupColorPicker();

  // Default date for health modal
  document.getElementById('h_date').value = toLocalDate(now);

  // Browser notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => Notification.requestPermission(), 3000);
  }
  scheduleMedicationReminders();
});

function toLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Dashboard ─────────────────────────────────
async function loadDashboard() {
  const data = await api('/api/dashboard');
  if (!data) return;

  // Update profile name
  const profile = await api('/api/profile');
  if (profile) {
    document.getElementById('profileName').textContent = profile.name || 'Friend';
  }

  document.getElementById('statMeds').textContent = data.active_medications;
  document.getElementById('statAdherence').textContent = data.adherence + '%';
  document.getElementById('statAppts').textContent = data.upcoming_appointments;
  if (data.latest_health) {
    const h = data.latest_health;
    document.getElementById('statBP').textContent =
      (h.systolic && h.diastolic) ? `${h.systolic}/${h.diastolic}` : '–';
  }

  // Upcoming appointments on home
  const apptEl = document.getElementById('upcomingAppts');
  if (data.appointments.length === 0) {
    apptEl.innerHTML = emptyState('fa-calendar-xmark','No upcoming appointments');
  } else {
    apptEl.innerHTML = data.appointments.map(a => {
      const d = new Date(a.date + 'T00:00:00');
      return `<div class="appt-mini">
        <div class="appt-date-pill">
          <div class="day">${d.getDate()}</div>
          <div>${d.toLocaleString('default',{month:'short'})}</div>
        </div>
        <div class="appt-info">
          <strong>${a.title}</strong>
          <small>${a.doctor || ''} ${a.time ? '• '+fmt12(a.time) : ''}</small>
        </div>
      </div>`;
    }).join('');
  }
}

// ─── Medications ───────────────────────────────
async function loadMedications() {
  medications = await api('/api/medications') || [];
  const grid = document.getElementById('medsGrid');
  const todayMeds = document.getElementById('todayMeds');

  if (medications.length === 0) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1">${emptyState('fa-pills','No medications added yet')}</div>`;
    todayMeds.innerHTML = emptyState('fa-check-circle','All clear – no medications today');
    document.getElementById('reminderCount').textContent = '0';
    return;
  }

  // Full card grid
  grid.innerHTML = medications.map(m => `
    <div class="med-card" style="--med-color:${m.color}; border-left: 4px solid ${m.color}">
      <div class="med-card-header">
        <div>
          <div class="med-card-name">${m.name}</div>
          <div class="med-card-dosage">${m.dosage} • ${m.frequency}</div>
        </div>
        <span class="med-card-badge ${m.active ? '' : 'inactive'}">${m.active ? 'Active' : 'Inactive'}</span>
      </div>
      <div class="med-times">
        ${m.times.map(t => `<span class="time-chip"><i class="fa-solid fa-clock" style="font-size:10px"></i> ${fmt12(t)}</span>`).join('')}
      </div>
      ${m.notes ? `<div style="font-size:12px;color:var(--text-2);margin-top:4px"><i class="fa-solid fa-circle-info"></i> ${m.notes}</div>` : ''}
      <div class="med-card-footer">
        <button class="btn btn-outline btn-sm" onclick="logMed(${m.id},'${m.name}')">
          <i class="fa-solid fa-check"></i> Log Taken
        </button>
        <button class="btn btn-outline btn-sm" onclick="editMed(${m.id})">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteMed(${m.id})">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  // Today's schedule on home page
  const activeMeds = medications.filter(m => m.active);
  let allReminders = [];
  activeMeds.forEach(m => {
    m.times.forEach(t => allReminders.push({ med: m, time: t }));
  });
  allReminders.sort((a,b) => a.time.localeCompare(b.time));

  document.getElementById('reminderCount').textContent = allReminders.length;
  todayMeds.innerHTML = allReminders.slice(0,6).map(r => `
    <div class="med-reminder">
      <div class="med-dot" style="background:${r.med.color}"></div>
      <div class="med-info">
        <strong>${r.med.name}</strong>
        <small>${r.med.dosage}</small>
      </div>
      <span class="med-time-badge">${fmt12(r.time)}</span>
      <button class="log-btn" onclick="logMed(${r.med.id},'${r.med.name}','${r.time}',this)">
        <i class="fa-solid fa-check"></i> Taken
      </button>
    </div>
  `).join('');
}

async function logMed(id, name, time='', btn=null) {
  await api('/api/medications/log', 'POST', { medication_id: id, scheduled_time: time, status: 'taken' });
  showToast(`✓ ${name} logged as taken`, 'success');
  if (btn) { btn.textContent = '✓ Done'; btn.classList.add('taken'); btn.disabled = true; }
}

function openMedModal(id=null) {
  currentMedId = id;
  document.getElementById('medModalTitle').textContent = id ? 'Edit Medication' : 'Add Medication';
  if (!id) {
    document.getElementById('m_name').value = '';
    document.getElementById('m_dosage').value = '';
    document.getElementById('m_freq').value = 'Daily';
    document.getElementById('m_start').value = toLocalDate(new Date());
    document.getElementById('m_end').value = '';
    document.getElementById('m_notes').value = '';
    document.getElementById('timeSlots').innerHTML = '';
    addTimeSlot('08:00');
    selectColor(COLORS[0]);
  }
  openModal('medModal');
}

async function editMed(id) {
  const med = medications.find(m => m.id === id);
  if (!med) return;
  currentMedId = id;
  document.getElementById('medModalTitle').textContent = 'Edit Medication';
  document.getElementById('m_name').value = med.name;
  document.getElementById('m_dosage').value = med.dosage;
  document.getElementById('m_freq').value = med.frequency;
  document.getElementById('m_start').value = med.start_date;
  document.getElementById('m_end').value = med.end_date || '';
  document.getElementById('m_notes').value = med.notes || '';
  document.getElementById('timeSlots').innerHTML = '';
  med.times.forEach(t => addTimeSlot(t));
  selectColor(med.color);
  openModal('medModal');
}

async function saveMedication() {
  const name = document.getElementById('m_name').value.trim();
  if (!name) return showToast('Please enter a medication name', 'error');
  const times = [...document.querySelectorAll('.time-slot-wrap input[type="time"]')].map(i => i.value);
  const selectedColor = document.querySelector('.color-swatch.selected')?.dataset.color || COLORS[0];
  const payload = {
    name, dosage: document.getElementById('m_dosage').value,
    frequency: document.getElementById('m_freq').value,
    times, start_date: document.getElementById('m_start').value,
    end_date: document.getElementById('m_end').value || null,
    notes: document.getElementById('m_notes').value, color: selectedColor
  };
  if (currentMedId) {
    await api(`/api/medications/${currentMedId}`, 'PUT', payload);
    showToast('Medication updated!', 'success');
  } else {
    await api('/api/medications', 'POST', payload);
    showToast('Medication added!', 'success');
  }
  closeAllModals();
  loadMedications();
}

async function deleteMed(id) {
  if (!confirm('Delete this medication?')) return;
  await api(`/api/medications/${id}`, 'DELETE');
  showToast('Medication deleted');
  loadMedications();
}

function addTimeSlot(val='08:00') {
  const wrap = document.createElement('div');
  wrap.className = 'time-slot-wrap';
  wrap.innerHTML = `
    <input type="time" value="${val}"/>
    <button class="rm-time" onclick="this.parentElement.remove()"><i class="fa-solid fa-xmark"></i></button>
  `;
  document.getElementById('timeSlots').appendChild(wrap);
}

// ─── Appointments ──────────────────────────────
async function loadAppointments() {
  const appts = await api('/api/appointments') || [];
  const today = toLocalDate(new Date());
  const upcoming = appts.filter(a => a.date >= today && !a.completed);
  const past = appts.filter(a => a.date < today || a.completed);

  const renderCard = a => {
    const d = new Date(a.date + 'T00:00:00');
    return `<div class="appt-card ${a.completed ? 'completed' : ''}">
      <div class="appt-card-header">
        <div>
          <div class="appt-card-title">${a.title}</div>
          <div class="appt-card-meta">
            ${a.doctor ? `<span><i class="fa-solid fa-user-doctor"></i> ${a.doctor}</span>` : ''}
            ${a.location ? `<span><i class="fa-solid fa-location-dot"></i> ${a.location}</span>` : ''}
            ${a.time ? `<span><i class="fa-solid fa-clock"></i> ${fmt12(a.time)}</span>` : ''}
          </div>
        </div>
        <div class="appt-card-date">
          <div class="day">${d.getDate()}</div>
          <div class="month">${d.toLocaleString('default',{month:'short'})}</div>
        </div>
      </div>
      ${a.notes ? `<p style="font-size:13px;color:var(--text-2);margin-top:10px">${a.notes}</p>` : ''}
      <div class="appt-card-actions">
        ${!a.completed ? `<button class="btn btn-outline btn-sm" onclick="completeAppt(${a.id})"><i class="fa-solid fa-check"></i> Mark Done</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteAppt(${a.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>`;
  };

  document.getElementById('apptUpcoming').innerHTML = upcoming.length
    ? upcoming.map(renderCard).join('') : emptyState('fa-calendar-check','No upcoming appointments');
  document.getElementById('apptPast').innerHTML = past.length
    ? past.map(renderCard).join('') : emptyState('fa-history','No past appointments');
}

function openApptModal() {
  document.getElementById('a_title').value = '';
  document.getElementById('a_doctor').value = '';
  document.getElementById('a_loc').value = '';
  document.getElementById('a_date').value = '';
  document.getElementById('a_time').value = '';
  document.getElementById('a_notes').value = '';
  openModal('apptModal');
}

async function saveAppointment() {
  const title = document.getElementById('a_title').value.trim();
  const date = document.getElementById('a_date').value;
  if (!title || !date) return showToast('Title and date are required', 'error');
  await api('/api/appointments', 'POST', {
    title, doctor: document.getElementById('a_doctor').value,
    location: document.getElementById('a_loc').value,
    date, time: document.getElementById('a_time').value,
    notes: document.getElementById('a_notes').value
  });
  showToast('Appointment saved!', 'success');
  closeAllModals();
  loadAppointments();
}

async function completeAppt(id) {
  await api(`/api/appointments/${id}`, 'PUT', { completed: true });
  showToast('Appointment marked complete');
  loadAppointments();
}

async function deleteAppt(id) {
  if (!confirm('Delete this appointment?')) return;
  await api(`/api/appointments/${id}`, 'DELETE');
  showToast('Appointment deleted');
  loadAppointments();
}

// ─── Health Tracking ───────────────────────────
async function loadTrackingCharts() {
  healthRecords = await api('/api/health') || [];
  const records = [...healthRecords].reverse();

  const labels = records.map(r => {
    const d = new Date(r.record_date + 'T00:00:00');
    return `${d.getDate()}/${d.getMonth()+1}`;
  });

  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: '#F1F5F9' }, ticks: { font: { size: 11 } } }
    }
  };

  // BP Chart
  destroyChart('chartBP');
  charts['chartBP'] = new Chart(document.getElementById('chartBP'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Systolic', data: records.map(r => r.systolic),
          borderColor: '#EF4444', backgroundColor: '#FEE2E2',
          fill: false, tension: .4, pointRadius: 4, borderWidth: 2 },
        { label: 'Diastolic', data: records.map(r => r.diastolic),
          borderColor: '#F59E0B', backgroundColor: '#FEF3C7',
          fill: false, tension: .4, pointRadius: 4, borderWidth: 2 }
      ]
    },
    options: { ...chartDefaults, plugins: { legend: { display: true, position: 'top' } } }
  });

  // Weight Chart
  destroyChart('chartWeight');
  charts['chartWeight'] = new Chart(document.getElementById('chartWeight'), {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Weight (kg)', data: records.map(r => r.weight),
        borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,.08)',
        fill: true, tension: .4, pointRadius: 4, borderWidth: 2 }]
    },
    options: chartDefaults
  });

  // Steps Bar
  destroyChart('chartSteps');
  charts['chartSteps'] = new Chart(document.getElementById('chartSteps'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Steps', data: records.map(r => r.steps),
        backgroundColor: '#10B981', borderRadius: 6 }]
    },
    options: chartDefaults
  });

  // Sleep Chart
  destroyChart('chartSleep');
  charts['chartSleep'] = new Chart(document.getElementById('chartSleep'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ label: 'Sleep (hrs)', data: records.map(r => r.sleep_hours),
        backgroundColor: '#7C3AED', borderRadius: 6 }]
    },
    options: chartDefaults
  });

  // Table
  const moodEmoji = { great:'😊', good:'🙂', okay:'😐', bad:'😕', terrible:'😞' };
  document.getElementById('healthBody').innerHTML = healthRecords.map(r => `
    <tr>
      <td>${r.record_date}</td>
      <td>${r.weight ? r.weight+'kg' : '–'}</td>
      <td>${(r.systolic && r.diastolic) ? r.systolic+'/'+r.diastolic : '–'}</td>
      <td>${r.heart_rate ? r.heart_rate+' bpm' : '–'}</td>
      <td>${r.steps ? r.steps.toLocaleString() : '–'}</td>
      <td>${r.sleep_hours ? r.sleep_hours+'h' : '–'}</td>
      <td>${r.water_glasses ? r.water_glasses+' 💧' : '–'}</td>
      <td class="mood-emoji">${moodEmoji[r.mood] || '–'}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteHealth(${r.id})"><i class="fa-solid fa-trash"></i></button></td>
    </tr>
  `).join('');
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

function openHealthModal() {
  document.getElementById('h_date').value = toLocalDate(new Date());
  ['weight','sys','dia','hr','sugar','temp','steps','sleep','water'].forEach(f => {
    const el = document.getElementById(`h_${f}`);
    if (el) el.value = '';
  });
  document.getElementById('h_mood').value = '';
  document.getElementById('h_notes').value = '';
  openModal('healthModal');
}

async function saveHealth() {
  const data = {
    record_date: document.getElementById('h_date').value,
    weight: numOrNull('h_weight'), systolic: numOrNull('h_sys'),
    diastolic: numOrNull('h_dia'), heart_rate: numOrNull('h_hr'),
    blood_sugar: numOrNull('h_sugar'), temperature: numOrNull('h_temp'),
    steps: numOrNull('h_steps'), sleep_hours: numOrNull('h_sleep'),
    water_glasses: numOrNull('h_water'),
    mood: document.getElementById('h_mood').value,
    notes: document.getElementById('h_notes').value
  };
  await api('/api/health', 'POST', data);
  showToast('Health record saved!', 'success');
  closeAllModals();
  loadTrackingCharts();
}

async function deleteHealth(id) {
  if (!confirm('Delete this record?')) return;
  await api(`/api/health/${id}`, 'DELETE');
  showToast('Record deleted');
  loadTrackingCharts();
}

async function saveQuickLog() {
  const data = {
    record_date: toLocalDate(new Date()),
    weight: numOrNull('ql_weight'), systolic: numOrNull('ql_sys'),
    diastolic: numOrNull('ql_dia'), heart_rate: numOrNull('ql_hr'),
    steps: numOrNull('ql_steps'), sleep_hours: numOrNull('ql_sleep'),
    water_glasses: numOrNull('ql_water'),
    mood: document.getElementById('ql_mood').value
  };
  if (!Object.values(data).some(v => v !== null && v !== '' && v !== undefined)) {
    return showToast('Please fill in at least one field', 'error');
  }
  await api('/api/health', 'POST', data);
  showToast('Quick log saved!', 'success');
  loadDashboard();
}

// ─── Logs ──────────────────────────────────────
async function loadLogs() {
  const logs = await api('/api/medications/logs') || [];
  const tbody = document.getElementById('logsTable');
  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-3);padding:24px">No logs yet</td></tr>`;
    return;
  }
  tbody.innerHTML = logs.map(l => `
    <tr>
      <td>${l.medication_name}</td>
      <td><span class="status-badge status-${l.status}">${l.status}</span></td>
      <td>${l.scheduled_time || '–'}</td>
      <td>${l.taken_at}</td>
    </tr>
  `).join('');
}

// ─── Profile ───────────────────────────────────
async function loadProfile() {
  const p = await api('/api/profile');
  if (!p) return;
  document.getElementById('p_name').value = p.name || '';
  document.getElementById('p_age').value = p.age || '';
  document.getElementById('p_gender').value = p.gender || '';
  document.getElementById('p_blood').value = p.blood_type || '';
  document.getElementById('p_height').value = p.height || '';
  document.getElementById('p_allergies').value = p.allergies || '';
  document.getElementById('p_conditions').value = p.conditions || '';
  document.getElementById('p_ec_name').value = p.emergency_contact || '';
  document.getElementById('p_ec_phone').value = p.emergency_phone || '';
}

async function saveProfile() {
  const data = {
    name: document.getElementById('p_name').value,
    age: numOrNull('p_age'), gender: document.getElementById('p_gender').value,
    blood_type: document.getElementById('p_blood').value,
    height: numOrNull('p_height'),
    allergies: document.getElementById('p_allergies').value,
    conditions: document.getElementById('p_conditions').value,
    emergency_contact: document.getElementById('p_ec_name').value,
    emergency_phone: document.getElementById('p_ec_phone').value
  };
  await api('/api/profile', 'PUT', data);
  showToast('Profile saved!', 'success');
  document.getElementById('profileName').textContent = data.name || 'Friend';
}

// ─── Color Picker ──────────────────────────────
function setupColorPicker() {
  const picker = document.getElementById('colorPicker');
  COLORS.forEach(c => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch';
    sw.dataset.color = c;
    sw.style.background = c;
    sw.onclick = () => selectColor(c);
    picker.appendChild(sw);
  });
  selectColor(COLORS[0]);
}

function selectColor(color) {
  document.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });
}

// ─── Modals ────────────────────────────────────
function openModal(id) {
  document.getElementById('backdrop').classList.add('active');
  document.getElementById(id).classList.add('active');
}

function closeAllModals() {
  document.getElementById('backdrop').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

// ─── Medication Reminders ──────────────────────
function scheduleMedicationReminders() {
  if (!('Notification' in window)) return;
  setInterval(async () => {
    if (Notification.permission !== 'granted') return;
    const meds = await api('/api/medications') || [];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    meds.filter(m => m.active).forEach(m => {
      if (m.times.includes(currentTime)) {
        new Notification('HealthMate Reminder 💊', {
          body: `Time to take ${m.name} – ${m.dosage}`,
          icon: '/static/images/icon.png'
        });
      }
    });
  }, 60000); // check every minute
}

// ─── Helpers ───────────────────────────────────
async function api(url, method='GET', body=null) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch(e) {
    console.error('API error:', url, e);
    return null;
  }
}

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.classList.remove('show'), 3000);
}

function emptyState(icon, text) {
  return `<div class="empty-state"><i class="fa-solid ${icon}"></i><p>${text}</p></div>`;
}

function numOrNull(id) {
  const v = document.getElementById(id)?.value;
  return (v !== '' && v !== undefined && v !== null) ? parseFloat(v) : null;
}

function fmt12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${suffix}`;
}
