// ============================================================
// GLI Email Prospector - Dashboard JavaScript
// ============================================================

let currentPage = 1;
const ITEMS_PER_PAGE = 50;

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateDate();
  setupNavigation();
  setupSearch();
  refreshStats();
  loadLeads();
  loadLogs();
  updateWarmupIndicator();
  
  // Auto-refresh cada 30 segundos
  setInterval(refreshStats, 30000);
});

// ==========================================
// NAVEGACIÓN
// ==========================================
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Obtener el tab del texto o un atributo si lo añadimos
      const tabText = item.textContent.trim().toLowerCase();
      let tab = 'dashboard';
      if (tabText.includes('leads')) tab = 'leads';
      if (tabText.includes('campaña')) tab = 'campaign';
      if (tabText.includes('prospector')) tab = 'prospector';
      
      showTab(tab);
    });
  });
}

function showTab(tab) {
  // Actualizar nav activo
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    const text = item.textContent.trim().toLowerCase();
    item.classList.remove('active');
    if (text.includes(tab)) item.classList.add('active');
  });
  
  // Mostrar tab correspondiente
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  const targetTab = document.getElementById(`tab-${tab}`);
  if (targetTab) targetTab.classList.add('active');
  
  if (tab === 'campaign') {
    loadEmailPreview();
  }
}
// ==========================================
// BUSQUEDA Y FILTROS
// ==========================================
function setupSearch() {
  let searchTimeout;
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage = 1;
        loadLeads();
      }, 500);
    });
  }
  
  const filterGiro = document.getElementById('filter-giro');
  if (filterGiro) {
    filterGiro.addEventListener('change', () => {
      currentPage = 1;
      loadLeads();
    });
  }
  
  const filterPremium = document.getElementById('filter-premium');
  if (filterPremium) {
    filterPremium.addEventListener('change', () => {
      currentPage = 1;
      loadLeads();
    });
  }
}

// ==========================================
// CARGAR ESTADÍSTICAS
// ==========================================
let statsCharts = {};

async function refreshStats() {
  try {
    const response = await fetch('/api/stats');
    const data = await response.json();
    
    if (!data.success) return;
    
    const { leads, campaign, meta } = data;
    
    // KPI Cards
    if (document.getElementById('totalLeads')) animateNumber('totalLeads', leads.total);
    if (document.getElementById('leadsConEmail')) animateNumber('leadsConEmail', leads.conEmail);
    if (document.getElementById('leadsPremium')) animateNumber('leadsPremium', leads.premium || 0);
    if (document.getElementById('emailsEnviados')) animateNumber('emailsEnviados', campaign.enviados);
    if (document.getElementById('enviadosHoy')) animateNumber('enviadosHoy', campaign.enviadosHoy);
    if (document.getElementById('tasaEnvio')) document.getElementById('tasaEnvio').textContent = (campaign.tasaEnvio || 0) + '%';
    if (document.getElementById('pendientes')) animateNumber('pendientes', campaign.pendientes || 0);
    
    // Meta Progress
    const emailPct = Math.min((campaign.enviados / meta.objetivo_emails) * 100, 100);
    document.getElementById('metaEmails').textContent = `${campaign.enviados.toLocaleString()} / ${meta.objetivo_emails.toLocaleString()}`;
    document.getElementById('barEmails').style.width = emailPct + '%';
    
    // Contactos y ventas
    const respondidos = leads.porEstado?.find(e => e._id === 'respondido')?.count || 0;
    const interesados = leads.porEstado?.find(e => e._id === 'interesado')?.count || 0;
    const clientes = leads.porEstado?.find(e => e._id === 'cliente')?.count || 0;
    const contactos = respondidos + interesados + clientes;
    
    const contactPct = Math.min((contactos / meta.objetivo_contactos) * 100, 100);
    document.getElementById('metaContactos').textContent = `${contactos} / ${meta.objetivo_contactos}`;
    document.getElementById('barContactos').style.width = contactPct + '%';
    
    const ventasPct = Math.min((clientes / meta.objetivo_ventas) * 100, 100);
    document.getElementById('metaVentas').textContent = `${clientes} / ${meta.objetivo_ventas}`;
    document.getElementById('barVentas').style.width = ventasPct + '%';
    
    // Charts with Chart.js
    if (document.getElementById('statusChart')) updateChart('statusChart', leads.porEstado || [], 'Doughnut');
    if (document.getElementById('chartFuentes')) updateChart('chartFuentes', leads.porFuente || [], 'Pie');
    
    // Campaign stats
    if (document.getElementById('cTotal')) document.getElementById('cTotal').textContent = campaign.total || 0;
    if (document.getElementById('cEnviados')) document.getElementById('cEnviados').textContent = campaign.enviados || 0;
    if (document.getElementById('cPendientes')) document.getElementById('cPendientes').textContent = campaign.pendientes || 0;
    if (document.getElementById('cRebotados')) document.getElementById('cRebotados').textContent = campaign.rebotados || 0;
    if (document.getElementById('cBajas')) document.getElementById('cBajas').textContent = campaign.bajas || 0;
    
    // Daily limit
    document.getElementById('currentLimit').textContent = campaign.dailyLimit || 0;
    
  } catch (error) {
    console.error('Error cargando stats:', error);
  }
}

function updateChart(id, data, type) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  const labels = data.map(d => d._id || 'Desconocido');
  const values = data.map(d => d.count);
  const colors = labels.map(l => id === 'statusChart' ? getStatusColor(l) : getSourceColor(l));

  if (statsCharts[id]) {
    statsCharts[id].data.labels = labels;
    statsCharts[id].data.datasets[0].data = values;
    statsCharts[id].data.datasets[0].backgroundColor = colors;
    statsCharts[id].update();
  } else {
    statsCharts[id] = new Chart(ctx, {
      type: type.toLowerCase(),
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#a0a3bd',
              font: { size: 10, family: 'Inter' },
              padding: 10,
              usePointStyle: true
            }
          }
        },
        cutout: type === 'Doughnut' ? '70%' : '0%'
      }
    });
  }
}

// ==========================================
// CHARTS (Barras horizontales simples)
// ==========================================
// Chart.js now used instead of manual bar rendering.

function getStatusColor(status) {
  const colors = {
    nuevo: '#4facfe',
    email_encontrado: '#a18cd1',
    email_enviado: '#e4a948',
    abierto: '#7c3aed',
    respondido: '#43e97b',
    interesado: '#2dd06e',
    cliente: '#00d68f',
    no_interesado: '#888',
    dado_de_baja: '#f5576c'
  };
  return colors[status] || '#666';
}

function getSourceColor(source) {
  const hue = Math.abs(hashCode(source || '')) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

// ==========================================
// CARGAR LEADS
// ==========================================
async function loadLeads() {
  try {
    // Usar IDs nuevos del CRM con fallback a los viejos por si acaso
    const searchEl = document.getElementById('searchInput') || document.getElementById('searchLeads');
    const giroEl = document.getElementById('filter-giro');
    const premiumEl = document.getElementById('filter-premium');
    const estadoEl = document.getElementById('filterEstado'); // Este es opcional ahora

    const search = searchEl ? searchEl.value : '';
    const giro = giroEl ? giroEl.value : '';
    const premium = premiumEl ? premiumEl.value : '';
    const estado = estadoEl ? estadoEl.value : '';
    
    let url = `/api/leads?page=${currentPage}&limit=${ITEMS_PER_PAGE}`;
    if (search) url += `&buscar=${encodeURIComponent(search)}`;
    if (estado) url += `&estado=${estado}`;
    if (giro) url += `&giro=${giro}`;
    if (premium) url += `&premium=${premium}`;

    console.log('📡 Fetching leads with URL:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.success) return;
    
    const tbody = document.getElementById('leadsBody');
    
    if (data.leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color: var(--text-muted);">No se encontraron leads</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.leads.map(lead => `
      <tr class="${lead.es_premium ? 'premium-row' : ''}">
        <td>
          <strong style="color: var(--text-primary);">
            ${lead.es_premium ? '<span title="Ingreso > $100k/mes">💎 </span>' : ''}
            ${lead.nombre_negocio || '-'}
          </strong>
          ${lead.razon_social ? `<br><small style="color: var(--text-muted);">${lead.razon_social}</small>` : ''}
        </td>
        <td>${lead.email ? `<a href="mailto:${lead.email}" style="color: var(--gold);">${lead.email}</a>` : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td>${lead.telefono || '-'}</td>
        <td>${lead.giro || lead.clase_actividad || '-'}</td>
        <td>${lead.tamano_empresa || '-'}</td>
        <td>
          <div class="score-badge" style="background: ${getScoreColor(lead.calificacion)};">
            ${lead.calificacion || 0}
          </div>
        </td>
        <td><span class="status-badge status-${lead.estado}">${formatStatus(lead.estado)}</span></td>
        <td>
          <a href="https://wa.me/${formatWhatsAppNumber(lead.telefono)}?text=${encodeURIComponent(`Hola, le contacto de GLI Inmobiliaria respecto a ${lead.nombre_negocio}.`)}" 
             target="_blank" 
             class="btn-whatsapp-small" 
             style="${!lead.telefono ? 'opacity: 0.2; pointer-events: none;' : ''}"
             title="${lead.telefono ? 'Contactar a ' + lead.telefono : 'Sin teléfono'}">
             <span>💬</span>
          </a>
        </td>
      </tr>
    `).join('');
    
    // Paginación
    renderPagination(data.pagination);
    
  } catch (error) {
    console.error('Error cargando leads:', error);
  }
}

function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  // Si tiene 10 dígitos (número local MX), añadir 52
  if (cleaned.length === 10) {
    return '52' + cleaned;
  }
  return cleaned;
}

function formatStatus(status) {
  const labels = {
    nuevo: 'Nuevo',
    email_encontrado: 'Con Email',
    email_enviado: 'Enviado',
    abierto: 'Abierto',
    respondido: 'Respondido',
    interesado: 'Interesado',
    cliente: 'Cliente',
    no_interesado: 'No Interesado',
    dado_de_baja: 'Baja'
  };
  return labels[status] || status;
}

function getScoreColor(score) {
  if (score >= 80) return 'linear-gradient(135deg, #b8955a 0%, #e4a948 100%)'; 
  if (score >= 60) return '#20bd5c'; 
  if (score >= 40) return '#e4a948'; 
  return '#666'; 
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (pagination.totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  
  if (currentPage > 1) {
    html += `<button onclick="goToPage(${currentPage - 1})">← Anterior</button>`;
  }
  
  for (let i = Math.max(1, currentPage - 2); i <= Math.min(pagination.totalPages, currentPage + 2); i++) {
    html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  
  if (currentPage < pagination.totalPages) {
    html += `<button onclick="goToPage(${currentPage + 1})">Siguiente →</button>`;
  }
  
  html += `<span style="color: var(--text-muted); padding: 8px; font-size: 12px;">${pagination.total} leads total</span>`;
  
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  loadLeads();
  window.scrollTo(0, 0);
}

// ==========================================
// ACCIONES
// ==========================================
async function startProspection(tipo = 'denue') {
  const btnId = tipo === 'especializada' ? 'btnProspectSpecial' : 'btnProspectDenue';
  const btn = document.getElementById(btnId);
  if (!btn) return;
  
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Procesando...';
  
  try {
    const response = await fetch('/api/prospect', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo })
    });
    const data = await response.json();
    
    if (data.success) {
      showToast(`🔍 Prospección ${tipo} iniciada en segundo plano.`, 'success');
    } else {
      showToast(`❌ Error: ${data.error || 'No se pudo iniciar'}`, 'error');
    }
  } catch (error) {
    showToast('❌ Error de conexión al servidor', 'error');
  }
  
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalText;
    loadLogs();
  }, 5000);
}

async function sendCampaign() {
  const btn = document.getElementById('btnSendCampaign');
  btn.disabled = true;
  btn.textContent = '⏳ Enviando...';
  
  try {
    const response = await fetch('/api/send-campaign', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showToast('📧 Campaña de envío iniciada en segundo plano', 'success');
    }
  } catch (error) {
    showToast('❌ Error al iniciar campaña', 'error');
  }
  
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Iniciar Envío';
    refreshStats();
  }, 5000);
}

async function enrichLeads() {
  const btn = document.getElementById('btnEnrich');
  btn.disabled = true;
  btn.textContent = '⏳ Enriqueciendo...';
  
  try {
    const response = await fetch('/api/enrich', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showToast('🌐 Enriquecimiento de leads iniciado en segundo plano', 'info');
    }
  } catch (error) {
    showToast('❌ Error al iniciar enriquecimiento', 'error');
  }
  
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Iniciar Enriquecimiento';
  }, 5000);
}

async function enrichNames() {
  const btn = document.getElementById('btnAIExtract');
  btn.disabled = true;
  btn.textContent = '⏳ Extrayendo con IA...';
  
  try {
    const response = await fetch('/api/enrich-names', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showToast('🧠 Investigación con Google Gemini AI iniciada', 'info');
    }
  } catch (error) {
    showToast('❌ Error al iniciar AI Scraping', 'error');
  }
  
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Extraer Directivos con IA';
  }, 5000);
}

async function personalizeIA() {
  const btn = document.getElementById('btnPersonalize');
  btn.disabled = true;
  btn.textContent = '⏳ Generando...';
  
  try {
    const response = await fetch('/api/personalize', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showToast('✨ Generación de párrafos personalizados iniciada en segundo plano', 'success');
    }
  } catch (error) {
    showToast('❌ Error al iniciar personalización', 'error');
  }
  
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Generar Personalización';
  }, 5000);
}

async function syncSheets() {
  const btn = event.currentTarget;
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '⏳ Sincronizando...';
  
  try {
    const response = await fetch('/api/sync-sheets', { method: 'POST' });
    const data = await response.json();
    
    if (data.success) {
      showToast('✅ Google Sheets actualizado correctamente', 'success');
    } else {
      showToast('❌ Error: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('❌ Error de conexión con el servidor', 'error');
  }
  
  btn.disabled = false;
  btn.innerHTML = originalText;
}

// ==========================================
// LOGS
// ==========================================
async function loadLogs() {
  try {
    const response = await fetch('/api/logs');
    const data = await response.json();
    
    const container = document.getElementById('logsContainer');
    
    if (!data.success || !data.logs || data.logs.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Sin registros de prospección aún</p>';
      return;
    }
    
    container.innerHTML = data.logs.map(log => `
      <div class="log-item">
        <span class="log-date">${new Date(log.createdAt || log.fecha_captura || log.fecha).toLocaleString('es-MX')}</span>
        <div class="log-details">
          <p><strong>${log.fuente}</strong> - ${log.tipo}</p>
          <div class="log-stats">
            <span>📊 Encontrados: ${log.total_encontrados}</span>
            <span>📧 Con email: ${log.total_con_email}</span>
            <span>✅ Nuevos: ${log.total_nuevos}</span>
            <span>🔄 Duplicados: ${log.total_duplicados}</span>
          </div>
        </div>
      </div>
    `).join('');
    
  } catch (error) {
    console.error('Error cargando logs:', error);
  }
}

// ==========================================
// EMAIL PREVIEW
// ==========================================
function loadEmailPreview() {
  const iframe = document.getElementById('emailPreview');
  // Crear preview con datos de ejemplo
  const html = getEmailPreviewHTML();
  iframe.srcdoc = html;
}

function getEmailPreviewHTML() {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:sans-serif;color:#333;">
<table role="presentation" width="100%" style="background:#fff;padding:0;">
<tr><td align="center">
<table role="presentation" width="600" style="background:#fff;border:none;">
<tr><td style="background:#fff;padding:25px 30px;text-align:center;border-bottom:2px solid #b8955a;">
<img src="/assets/gli_logo_hd.png" alt="GLI" width="220" style="max-width:220px;display:inline-block;">
</td></tr>
<tr><td style="background-color:#b8955a;padding:14px 30px;text-align:center;">
<p style="margin:0;color:#fff;font-size:14px;font-weight:700;">¿Ya identificó lo que está cambiando en el mercado inmobiliario de Culiacán?</p>
</td></tr>
<tr><td style="padding:0;"><img src="https://www.sinaloa360.com/wp-content/uploads/2020/03/country02.jpg" alt="Culiacán" width="600" style="width:100%;display:block;"></td></tr>
<tr><td style="padding:40px 30px;">
<p style="font-size:18px;margin:0 0 20px;">Estimado Juan,</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px;">En Culiacán, algunas propiedades están empezando a destacar por razones que no son tan evidentes.</p>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px;">Quienes logran identificarlas a tiempo suelen tomar mejores decisiones.</p>
<div style="margin:30px 0;"><a href="#" style="background:#b8955a;color:#fff;padding:15px 25px;text-decoration:none;font-weight:bold;border-radius:4px;">Ver qué está marcando la diferencia</a></div>
<p style="font-size:16px;line-height:1.6;margin:0 0 20px;">Contamos con más de 15 años de experiencia y un equipo respaldado en lo legal, fiscal y financiero...</p>
<div style="margin:30px 0;"><a href="#" style="background:#fff;color:#b8955a;padding:15px 25px;text-decoration:none;font-weight:bold;border-radius:4px;border:2px solid #b8955a;">Explorar opciones con mayor claridad</a></div>
<div style="margin:20px 0;"><a href="#" style="background:#25D366;color:#fff;padding:10px 20px;text-decoration:none;border-radius:30px;font-size:14px;">📱 WhatsApp: 6672366555</a></div>
<p style="font-weight:bold;margin-top:40px;">GLI Grupo Líder Inmobiliario</p>
</td></tr></table></td></tr></table></body></html>`;
}

// ==========================================
// WARMUP INDICATOR
// ==========================================
function updateWarmupIndicator() {
  const startDate = new Date('2026-04-01');
  const today = new Date();
  const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
  const week = Math.max(1, Math.floor(daysDiff / 7) + 1);
  
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`week${i}`);
    if (i < week) {
      el.classList.add('completed');
    } else if (i === week) {
      el.classList.add('active');
    }
  }
}

// ==========================================
// UTILIDADES
// ==========================================
function updateDate() {
  const now = new Date();
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  const current = parseInt(el.textContent.replace(/,/g, '')) || 0;
  const diff = target - current;
  const duration = 800;
  const steps = 30;
  const stepTime = duration / steps;
  
  if (diff === 0) return;
  
  let step = 0;
  const timer = setInterval(() => {
    step++;
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
    const value = Math.round(current + diff * eased);
    el.textContent = value.toLocaleString();
    
    if (step >= steps) {
      clearInterval(timer);
      el.textContent = target.toLocaleString();
    }
  }, stepTime);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ==========================================
// ACCIONES DE CAMPAÑA Y PROSPECCIÓN
// ==========================================
async function loadEmailPreview() {
  const previewBox = document.getElementById('emailPreview');
  if (!previewBox) return;
  
  previewBox.innerHTML = '<div style="padding:40px; text-align:center; color:#999;">Cargando diseño de correo...</div>';
  
  try {
    const response = await fetch('/api/campaign-preview');
    const html = await response.text();
    
    // Usar un iframe para aislar el estilo del email del dashboard
    previewBox.innerHTML = `<iframe srcdoc="${html.replace(/"/g, '&quot;')}" style="width:100%; height:100%; border:none;"></iframe>`;
  } catch (error) {
    previewBox.innerHTML = '<div style="padding:40px; text-align:center; color:red;">Error al cargar previsualización</div>';
  }
}

async function startProspection() {
  if (!confirm('¿Seguro que quieres iniciar una nueva prospección? Esto buscará nuevos leads en la zona.')) return;
  
  try {
    const response = await fetch('/api/prospect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'normal' })
    });
    
    const data = await response.json();
    if (data.success) {
      showToast('🚀 Prospección iniciada con éxito', 'success');
      showTab('dashboard');
    } else {
      showToast('❌ Error: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('❌ Error de conexión', 'error');
  }
}

async function syncSheets() {
  console.log('☁️ Iniciando sincronización manual...');
  showToast('☁️ Sincronizando con Google Sheets...', 'info');
  try {
    const response = await fetch('/api/sync-sheets', { method: 'POST' });
    console.log('📡 Respuesta del servidor recibida:', response.status);
    const data = await response.json();
    console.log('📦 Datos recibidos:', data);
    
    if (data.success) {
      showToast('✅ Sincronización completada', 'success');
    } else {
      console.error('❌ Error devuelto por API:', data.error);
      showToast('❌ Error: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('❌ Fallo crítico en fetch:', error);
    showToast('❌ Error de red', 'error');
  }
}
