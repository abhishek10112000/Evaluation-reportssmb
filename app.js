/* ═══════════════════════════════════════════════
   EPIC Cars — Vehicle Evaluation Brochure
   app.js
   ═══════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════
   IMAGE STORE
══════════════════════════════ */
const images = {};

/**
 * Read a file input and store the base64 result.
 * Updates the slot preview and the overview thumbnail if it's the front image.
 */
function loadImage(input, key) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    images[key] = e.target.result;

    const slot = document.getElementById('slot-' + key);
    let img = slot.querySelector('.preview-img');
    if (!img) {
      img = document.createElement('img');
      img.className = 'preview-img';
      slot.appendChild(img);
    }
    img.src = e.target.result;
    slot.querySelector('.placeholder').style.opacity = '0';

    // Mirror front-side image into the overview card thumbnail
    if (key === 'frontside') {
      const thumbWrap = document.getElementById('ov-thumb-wrap');
      thumbWrap.innerHTML = `<img src="${e.target.result}"
        style="width:140px;height:96px;border-radius:8px;object-fit:cover;border:1px solid var(--border)"/>`;
    }
  };
  reader.readAsDataURL(file);
}

/**
 * Remove an uploaded image from store and clear the slot preview.
 */
function removeImage(e, key) {
  e.preventDefault();
  e.stopPropagation();
  delete images[key];

  const slot = document.getElementById('slot-' + key);
  const img = slot.querySelector('.preview-img');
  if (img) img.remove();
  slot.querySelector('.placeholder').style.opacity = '1';
  slot.querySelector('input[type="file"]').value = '';
}

/* ══════════════════════════════
   CONDITION BUTTON BUILDER
══════════════════════════════ */
const CONDITIONS = ['Good', 'Average', 'Poor', 'NA'];
const FEATURE_CONDITIONS = ['Present', 'Not Present', 'NA'];
const condColors = { Good: 'good', Average: 'average', Poor: 'poor', NA: '' };
const conditionValues = {};   // key → selected condition string

/**
 * Build a Good/Average/Poor/NA toggle row for inspection fields.
 */
function buildConditionField(label, key, container) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:16px;';
  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--muted);
         text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
    <div class="condition-group" data-key="${key}">
      ${CONDITIONS.map(c =>
        `<button class="cond-btn ${condColors[c]}"
           onclick="setCondition('${key}','${c}',this)">${c}</button>`
      ).join('')}
    </div>`;
  container.appendChild(wrap);
}

/**
 * Build a Present/Not Present/NA toggle row for feature fields.
 */
function buildFeaturesField(label, key, container) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'margin-bottom:16px;';
  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:600;color:var(--muted);
         text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
    <div class="condition-group" data-key="${key}">
      ${FEATURE_CONDITIONS.map(c =>
        `<button class="cond-btn ${c === 'Present' ? 'good' : c === 'Not Present' ? 'poor' : ''}"
           onclick="setCondition('${key}','${c}',this)">${c}</button>`
      ).join('')}
    </div>`;
  container.appendChild(wrap);
}

/**
 * Toggle active state on a condition button group.
 */
function setCondition(key, val, btn) {
  conditionValues[key] = val;
  const group = btn.closest('.condition-group');
  group.querySelectorAll('.cond-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

/* ── Inspection item lists ── */
const interiorItems = ['Dashboard', 'Hand Brake'];

const mechanicalItems = [
  'Self Starter Motor', 'Steering - Gearbox/Damper',
  'Engine Oil Level', 'Engine Oil Quality',
  'Radiator', 'Engine Sound',
  'Engine Exhaust Emission', 'Engine Mountings',
  'Manifold Catalytic Converter/Silencer Mitti', 'Radiator Fan',
  'Gear Shifting Mechanism Performance', 'Brake - Fluid Level',
  'Brake - Leakage', 'Brake - Brake Pads',
  'Suspension - Noise', 'Suspension - Rubber Parts',
  'Suspension - Bushes', 'Suspension - Rear Shock Absorbers (L)',
  'Suspension - Rear Shock Absorbers (R)', 'Electricals - Battery Condition',
];

const bodyItems = [
  'Quarter Panel (R)', 'Front Fender (R)', 'A Pillar (R)', 'Running Board (R)',
  'B Pillar (R)', 'C Pillar (R)', 'Roof Panel', 'Rear Tailgate Light (L)',
  'Rear Tailgate Light (R)', 'Rear Bumper', 'Trunk/Dicky Door', 'C Pillar (L)',
  'Quarter Panel (L)', 'B Pillar (L)', 'Front Fender (L)', 'Running Board (L)',
  'A Pillar (L)', 'Front Panel (Crossmember)',
];

const lightsItems = [
  'Light Headlight (L)', 'Light Headlight (R)',
  'Tail Light (L)', 'Tail Light (R)',
];

const featuresItems = [
  'Rear Defogger', 'Reverse Camera', 'Parking Sensor', 'Air Conditioner',
  'Climate Control', 'Duplicate Key', 'Central Lock System', 'Sunroof',
  'Steering Mounted Control', 'Cruise Control',
];

const exteriorItems = ['Front Bumper', 'Hood Panel', 'Front Windshield', 'Rear View Mirror'];

/**
 * Sanitise a label into a JS-safe key string.
 */
function toKey(prefix, label) {
  return prefix + '_' + label.replace(/[\s\/()]/g, '_');
}

/**
 * Initialise all dynamic condition-field sections.
 */
function initConditionSections() {
  const ic = document.getElementById('interior-fields');
  const mc = document.getElementById('mechanical-fields');
  const bc = document.getElementById('body-fields');
  const lc = document.getElementById('lights-fields');
  const fc = document.getElementById('features-fields');
  const ec = document.getElementById('exterior-fields');

  interiorItems.forEach(i  => buildConditionField(i, toKey('int', i), ic));
  mechanicalItems.forEach(i => buildConditionField(i, toKey('mec', i), mc));
  bodyItems.forEach(i      => buildConditionField(i, toKey('bod', i), bc));
  lightsItems.forEach(i    => buildConditionField(i, toKey('lig', i), lc));
  featuresItems.forEach(i  => buildFeaturesField(i,  toKey('fea', i), fc));
  exteriorItems.forEach(i  => buildConditionField(i, toKey('ext', i), ec));
}

/* ══════════════════════════════
   SIDEBAR TOGGLE (Mobile/Tablet)
══════════════════════════════ */
function toggleSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
  hamburger.classList.toggle('open');
}

function closeSidebar() {
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.getElementById('sidebar-overlay');
  const hamburger = document.getElementById('hamburger-btn');
  sidebar.classList.remove('open');
  overlay.classList.remove('active');
  hamburger.classList.remove('open');
}

/* ══════════════════════════════
   NAVIGATION
══════════════════════════════ */
function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
  // Auto-close sidebar on mobile/tablet
  if (window.innerWidth < 1024) closeSidebar();
}

/* ══════════════════════════════
   LIVE OVERVIEW UPDATE
══════════════════════════════ */
function updateOverview() {
  const brand   = document.getElementById('f-brand').value   || '—';
  const model   = document.getElementById('f-model').value   || '—';
  const variant = document.getElementById('f-variant').value || '';
  const km      = document.getElementById('f-km').value      || '—';
  const fuel    = document.getElementById('f-fuel').value    || '—';
  const trans   = document.getElementById('f-trans').value   || '—';
  const color   = document.getElementById('f-color').value   || '—';
  const regdate = document.getElementById('f-regdate').value || '';
  const owners  = document.getElementById('f-owners').value  || '—';
  const rto     = document.getElementById('f-rto').value     || '—';

  document.getElementById('ov-title').textContent =
    `${brand} ${model} ${variant}`.trim();

  document.getElementById('ov-sub').textContent =
    regdate ? `Registered: ${formatDate(regdate)}` : 'Fill in the details below';

  // Icon stat values
  document.getElementById('ov-km').textContent =
    km !== '—' ? `${Number(km).toLocaleString()} KM` : '— KM';
  document.getElementById('ov-fuel').textContent        = `Fuel Type: ${fuel}`;
  document.getElementById('ov-trans').textContent       = `Transmission: ${trans}`;
  document.getElementById('ov-owners').textContent      = `Number of Owners: ${owners}`;
  document.getElementById('ov-rto').textContent         = `RTO: ${rto}`;
}

/* ══════════════════════════════
   UTILITY HELPERS
══════════════════════════════ */

/** Convert YYYY-MM-DD → DD-MM-YYYY for display/PDF. */
function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}-${m}-${y}`;
}

/** Get a field value by id, with fallback. */
function fv(id, fallback = '') {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}

/* ══════════════════════════════
   SAVE / LOAD DRAFT
══════════════════════════════ */
function saveDraft() {
  const data = {};
  document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    if (el.id) data[el.id] = el.value;
  });
  data._conditions = { ...conditionValues };
  data._images     = Object.keys(images);
  data._savedAt    = Date.now();
  localStorage.setItem('epicVehicleDraft', JSON.stringify(data));

  // ── Auto-save to analytics records too ──
  autoSaveToAnalytics();

  showToast('Draft saved & analytics updated!');
  updateActionBar(true);
}

/* Automatically push draft data into analytics records.
   If a record with same regno already exists → update it.
   Otherwise → add as new record. */
function autoSaveToAnalytics() {
  try {
    if (typeof saveToRecords !== 'function') return;
    saveToRecords(true); // pass silent=true so no confirm dialog / toast from analytics
  } catch(e) {
    console.warn('Auto analytics save failed:', e);
  }
}

/* ── Action Bar State ── */
function updateActionBar(saved) {
  const statusEl = document.getElementById('sticky-status');
  const pdfBtns  = [
    document.getElementById('sab-pdf-btn'),
    document.getElementById('hdr-pdf-btn')
  ];

  if (saved) {
    const brand  = document.getElementById('f-brand')?.value  || '';
    const model  = document.getElementById('f-model')?.value  || '';
    const regno  = document.getElementById('f-regno')?.value  || '';
    const label  = regno || ((brand + ' ' + model).trim()) || 'Vehicle';
    if (statusEl) {
      statusEl.innerHTML = '✅ Draft saved — <strong>' + label + '</strong>';
      statusEl.style.color = '#22c55e';
    }
    pdfBtns.forEach(btn => {
      if (btn) { btn.removeAttribute('disabled'); btn.style.opacity = '1'; }
    });
  } else {
    if (statusEl) {
      statusEl.textContent = '📝 Save draft first to enable PDF';
      statusEl.style.color = 'var(--muted)';
    }
    pdfBtns.forEach(btn => {
      if (btn) { btn.setAttribute('disabled', true); btn.style.opacity = '0.45'; }
    });
  }
}

function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem('epicVehicleDraft'));
    if (!d) { updateActionBar(false); return; }

    Object.entries(d).forEach(([k, v]) => {
      const el = document.getElementById(k);
      if (el && k !== '_conditions' && k !== '_images' && k !== '_savedAt') el.value = v;
    });

    if (d._conditions) {
      Object.entries(d._conditions).forEach(([k, v]) => {
        conditionValues[k] = v;
        const group = document.querySelector(`[data-key="${k}"]`);
        if (group) {
          group.querySelectorAll('.cond-btn').forEach(b => {
            if (b.textContent === v) b.classList.add('active');
          });
        }
      });
    }

    updateOverview();
    updateActionBar(true);   // draft exists → enable PDF
  } catch (e) {
    console.warn('Could not load draft:', e);
    updateActionBar(false);
  }
}

/* ══════════════════════════════
   RESET
══════════════════════════════ */
function resetForm() {
  if (!confirm('Reset all fields? This cannot be undone.')) return;

  document.querySelectorAll('input[id], select[id], textarea[id]').forEach(el => {
    el.value = el.defaultValue || '';
  });

  Object.keys(conditionValues).forEach(k => delete conditionValues[k]);
  document.querySelectorAll('.cond-btn').forEach(b => b.classList.remove('active'));

  Object.keys(images).forEach(k => delete images[k]);
  document.querySelectorAll('.preview-img').forEach(img => img.remove());
  document.querySelectorAll('.placeholder').forEach(p => p.style.opacity = '1');

  document.getElementById('ov-thumb-wrap').innerHTML = `
    <svg width="32" height="32" fill="none" stroke="#555" stroke-width="1.5" viewBox="0 0 24 24">
      <rect x="2" y="6" width="20" height="12" rx="2"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
      <path d="M2 12h20"/>
    </svg>`;

  localStorage.removeItem('epicVehicleDraft');
  updateOverview();
  updateActionBar(false);
  showToast('Form reset');
}

/* ══════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════ */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = '✓ ' + msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ══════════════════════════════
   PDF GENERATION
══════════════════════════════ */
async function generatePDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, H = 297, margin = 14;
  let y = 0;

  // ── Read all form values once ──
  const brand    = fv('f-brand', '');
  const model    = fv('f-model', '');
  const variant  = fv('f-variant', '');
  const km       = fv('f-km', '0');
  const fuel     = fv('f-fuel', 'Diesel');
  const trans    = fv('f-trans', 'Automatic');
  const color    = fv('f-color', '');
  const regno    = fv('f-regno', '');
  const regdate  = fv('f-regdate');
  const regvalid = fv('f-regvalid');
  const location = fv('f-location', '');
  const inspdate = fv('f-inspdate');
  const seats    = fv('f-seats', '');
  const owners   = fv('f-owners');
  const bodytype = fv('f-bodytype');

  // ── Colour palette ──
  const RED    = [232, 51, 58];
  const DARK   = [15, 15, 15];
  const WHITE  = [255, 255, 255];
  const MID    = [100, 100, 100];
  const SURFACE = [230, 230, 230];

  /* ── PDF helpers ── */

  function addPage() {
    doc.addPage();
    y = 0;
    drawHeader();
  }

  function checkY(needed) {
    if (y + needed > H - 16) addPage();
  }

  function drawHeader() {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, 18, 'F');

    // EPIC red box
    doc.setFillColor(...RED);
    doc.rect(W - 28, 2, 24, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text('EPIC', W - 16, 11, { align: 'center' });

    // Brochure title
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text('Vehicle Evaluation Brochure', margin, 9);

    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(`${brand} ${model}`, margin, 15);

    // Red underline
    doc.setFillColor(...RED);
    doc.rect(0, 18, W, 1, 'F');
    y = 22;
  }

  function drawSectionTitle(title) {
    checkY(12);
    doc.setFillColor(...RED);
    doc.rect(margin, y, 3, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.text(title, margin + 6, y + 6);
    y += 12;
  }

  function drawSubTitle(title) {
    checkY(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(title, margin, y + 6);
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 8, W - margin, y + 8);
    y += 12;
  }

  function drawTable(rows, cols = 2) {
    const colW = (W - margin * 2) / cols / 2;
    rows.forEach(row => {
      if (!Array.isArray(row)) return;
      checkY(8);
      doc.setFillColor(248, 248, 248);
      doc.rect(margin, y, W - margin * 2, 8, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.rect(margin, y, W - margin * 2, 8);

      for (let i = 0; i < cols; i++) {
        const field = row[i * 2]     || '';
        const val   = row[i * 2 + 1] || '';
        const x = margin + i * (W - margin * 2) / cols;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        doc.text(String(field), x + 2, y + 5.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.text(String(val), x + colW + 2, y + 5.5);
      }
      y += 8;
    });
    y += 3;
  }

  function drawImage2Up(left, right, labelL, labelR) {
    checkY(55);
    const imgW = (W - margin * 2 - 6) / 2;
    const imgH = 40;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);

    if (left) {
      doc.addImage(left, 'JPEG', margin, y, imgW, imgH);
      doc.rect(margin, y, imgW, imgH);
    } else {
      doc.setFillColor(...SURFACE);
      doc.rect(margin, y, imgW, imgH, 'F');
    }

    if (right) {
      doc.addImage(right, 'JPEG', margin + imgW + 6, y, imgW, imgH);
      doc.rect(margin + imgW + 6, y, imgW, imgH);
    } else {
      doc.setFillColor(...SURFACE);
      doc.rect(margin + imgW + 6, y, imgW, imgH, 'F');
    }

    y += imgH + 1;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    if (labelL) doc.text(labelL, margin, y + 4);
    if (labelR) doc.text(labelR, margin + imgW + 6, y + 4);
    y += 7;
  }

  /* ── PAGE 1: Cover ── */
  drawHeader();

  // Hero title band
  doc.setFillColor(248, 246, 246);
  doc.rect(0, y, W, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...RED);
  doc.text(`${brand} ${model}`, margin, y + 10);
  doc.setFontSize(14);
  doc.setTextColor(50, 50, 50);
  doc.text(variant, margin, y + 18);
  y += 26;

  // Stats bar with icons
  const statsData = [
    { icon: 'icon-km.svg',           label: 'KM Driven',    value: `${Number(km).toLocaleString()} KM` },
    { icon: 'icon-fuel.svg',          label: 'Fuel Type',    value: fuel },
    { icon: 'icon-transmission.svg',  label: 'Transmission', value: trans },
    { icon: 'icon-owners.svg',        label: 'No. of Owners',value: owners || '—' },
    { icon: 'icon-rto.svg',           label: 'RTO',          value: fv('f-rto', '—') },
  ];
  const statW = (W - margin * 2) / statsData.length;
  const barH = 22;
  doc.setFillColor(...DARK);
  doc.rect(0, y, W, barH, 'F');

  // Helper: load SVG as image into PDF
  async function drawStatIcon(src, x, cy) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 48; canvas.height = 48;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 48, 48);
          const dataUrl = canvas.toDataURL('image/png');
          doc.addImage(dataUrl, 'PNG', x - 3, cy - 3.5, 7, 7);
        } catch(e) {}
        resolve();
      };
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  const iconPromises = statsData.map((s, i) => {
    const sx = margin + i * statW;
    return drawStatIcon(s.icon, sx + statW / 2 - 1.5, y + 7);
  });
  await Promise.all(iconPromises);

  statsData.forEach((s, i) => {
    const sx = margin + i * statW;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.text(s.label, sx + statW / 2, y + 14, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text(s.value, sx + statW / 2, y + 20, { align: 'center' });
    if (i < statsData.length - 1) {
      doc.setDrawColor(50, 50, 50);
      doc.line(sx + statW, y + 2, sx + statW, y + barH - 2);
    }
  });
  y += barH + 2;

  // Info pills
  const pills = [
    ['Make Year',          fv('f-makeyear', '—')],
    ['Registration Date',  formatDate(regdate)],
    ['Vehicle Location',   location],
    ['Insurance Validity', formatDate(fv('f-insto'))],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  pills.forEach((p, i) => {
    const px = margin + (i % 2) * ((W - margin * 2) / 2);
    if (i % 2 === 0 && i > 0) y += 8;
    doc.setFillColor(...RED);
    doc.triangle(px, y + 2, px + 4, y + 5, px, y + 8, 'F');
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'bold');
    doc.text(p[0] + ':', px + 7, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(p[1], px + 7 + doc.getTextWidth(p[0] + ':') + 2, y + 6);
    if (i === 1) y += 8;
  });
  y += 12;

  drawImage2Up(images.frontside, images.backside, 'Front Side Image', 'Back Side Image');
  drawImage2Up(images.rightside, images.leftside, 'Right Side Image', 'Left Side Image');
  drawImage2Up(images.chassis, images.speedometer, 'Chassis', 'Speedo Meter');

  // Page 1 footer
  doc.setFillColor(...DARK);
  doc.rect(0, H - 8, W, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(160, 160, 160);
  doc.text('Page 1 of 8', W / 2, H - 3, { align: 'center' });

  /* ── PAGE 2: Inspection Report ── */
  addPage();
  drawSectionTitle('Detailed Vehicle Inspection Report');
  drawSubTitle('Interior Details');
  drawTable([['Dashboard', conditionValues[toKey('int','Dashboard')] || '',
              'Hand Brake', conditionValues[toKey('int','Hand Brake')] || '']]);

  drawSubTitle('Mechanical Evaluation');
  const mechRows = [];
  for (let i = 0; i < mechanicalItems.length; i += 2) {
    const a = mechanicalItems[i], b = mechanicalItems[i + 1] || '';
    mechRows.push([
      a, conditionValues[toKey('mec', a)] || '',
      b, b ? conditionValues[toKey('mec', b)] || '' : '',
    ]);
  }
  drawTable(mechRows);

  /* ── PAGE 3: Body, Lights, Features, Exterior ── */
  addPage();
  drawSectionTitle('Detailed Vehicle Inspection Report');

  drawSubTitle('Body and Frame');
  const bodyRows = [];
  for (let i = 0; i < bodyItems.length; i += 2) {
    const a = bodyItems[i], b = bodyItems[i + 1] || '';
    bodyRows.push([a, conditionValues[toKey('bod', a)] || '', b, b ? conditionValues[toKey('bod', b)] || '' : '']);
  }
  drawTable(bodyRows);

  drawSubTitle('Lights');
  const lightRows = [];
  for (let i = 0; i < lightsItems.length; i += 2) {
    const a = lightsItems[i], b = lightsItems[i + 1] || '';
    lightRows.push([a, conditionValues[toKey('lig', a)] || '', b, b ? conditionValues[toKey('lig', b)] || '' : '']);
  }
  drawTable(lightRows);

  drawSubTitle('Features Details');
  const featRows = [];
  for (let i = 0; i < featuresItems.length; i += 2) {
    const a = featuresItems[i], b = featuresItems[i + 1] || '';
    featRows.push([a, conditionValues[toKey('fea', a)] || '', b, b ? conditionValues[toKey('fea', b)] || '' : '']);
  }
  drawTable(featRows);

  drawSubTitle('Exterior Details');
  const extRows = [];
  for (let i = 0; i < exteriorItems.length; i += 2) {
    const a = exteriorItems[i], b = exteriorItems[i + 1] || '';
    extRows.push([a, conditionValues[toKey('ext', a)] || '', b, b ? conditionValues[toKey('ext', b)] || '' : '']);
  }
  drawTable(extRows);

  /* ── PAGE 4: Vehicle Images ── */
  addPage();
  drawSectionTitle('Vehicle Images');
  drawImage2Up(images.frontside,    images.backside,     'Frontside',    'Backside');
  drawImage2Up(images.leftside,     images.rightside,    'Leftside',     'Rightside');
  drawImage2Up(images.speedometer,  images.chassis,      'Speedometer',  'Chassis');
  drawImage2Up(images.interiorfront,images.interiorback, 'Interiorfront','Interiorback');

  /* ── PAGE 5: Extra Fitment + Disclaimer ── */
  addPage();
  drawImage2Up(images.extrafitment, images.functions, 'Extra Fitment', 'Functions');
  y += 4;

  const disclaimer = `This inspection summary report is compiled based on the information provided to us, including title documents, MMV, year, condition, odometer reading, and an external examination of the vehicle/components. The report does not reveal hidden defects or issues that cannot be identified through a visual inspection. It reflects the observed condition of the vehicle as of the inspection date: ${formatDate(inspdate)}`;
  doc.setFillColor(248, 248, 248);
  doc.rect(margin, y, W - margin * 2, 22, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, W - margin * 2, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(60, 60, 60);
  doc.text('Disclaimer:', margin + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  const dLines = doc.splitTextToSize(disclaimer, W - margin * 2 - 6);
  doc.text(dLines, margin + 3, y + 10);
  y += 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('Note:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text('# The odometer reading is at the time of inspection of the car, the actual odometer reading might vary.', margin + 10, y);

  /* ── PAGE 6: Detailed Record ── */
  addPage();
  drawSectionTitle('Detailed Vehicle Inspection Report');
  const regRows = [
    ['RC Number/Registration Number', regno,            'Brand/Make',               brand],
    ['Model',                         model,            'Variant',                  variant],
    ['Color',                         color,            'Fuel Type',                fuel],
    ['Transmission Type',             trans,            'Chassis Number/VIN',       fv('f-chassis','—')],
    ['Engine Number',                 fv('f-engno'),    'Engine CC',                fv('f-engcc')],
    ['Seating Capacity',              seats,            'Registration Date',        formatDate(regdate)],
    ['Registration Validity',         formatDate(regvalid), 'Registration Pincode', fv('f-pincode')],
    ['Registration State',            fv('f-regstate'), 'Registration City',        fv('f-regcity')],
    ['Emission',                      fv('f-emission'), 'Vehicle Type',             bodytype],
    ["KM's driven",                   Number(km).toLocaleString(), 'Number of Owners', owners],
    ['Number of Challans Pending',    fv('f-challans'), 'Number of Keys',           fv('f-keys')],
    ['Fuel Efficiency',               fv('f-mileage') ? fv('f-mileage') + ' KMPL' : '', 'Vehicle Condition', fv('f-condition')],
    ['Source',                        fv('f-source'),   'Sub Source',               fv('f-subsource')],
    ['Last Service KM',               fv('f-lastserv'), 'Last Service Date',        formatDate(fv('f-lastservdate'))],
    ['Meter Tampered',                fv('f-tampered'), 'RC Original Available',    fv('f-rcavail')],
    ['Park & Sale',                   fv('f-parksale'), 'Challans Pending Amount',  fv('f-challanamt', '0')],
  ];
  drawTable(regRows);

  // Contact footer strip
  checkY(20);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.4);
  doc.line(margin, y, W - margin, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text('See details on website', margin, y + 5);
  doc.text('Call Us',  W / 2, y + 5, { align: 'center' });
  doc.text('Email us', W - margin, y + 5, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...RED);
  doc.text('https://epiccars.in/',  margin, y + 5);
  doc.text('+917653264536', W / 2,  y + 5, { align: 'center' });
  doc.text('ramgroup@gmail.com', W - margin, y + 5, { align: 'right' });

  /* ── PAGE 7: Specs + Tyres + Insurance + Warranty ── */
  addPage();
  drawSectionTitle('Detailed Vehicle Inspection Report');
  drawSubTitle(`${brand} ${model} ${variant} Specifications`);
  drawTable([
    ['Fuel Type',    fuel,  'Engine CC',      fv('f-engcc')],
    ['Transmission', trans, 'Mileage (ARAI)', fv('f-mileage') ? fv('f-mileage') + ' KMPL' : ''],
  ]);

  drawSubTitle('Tyre Conditions');
  const getTyre = id => document.getElementById(id).value + '%';
  drawTable([
    ['Front Right Wheel',  getTyre('t-fr'), 'Front Left Wheel',  getTyre('t-fl')],
    ['Rear Right Wheel',   getTyre('t-rr'), 'Rear Left Wheel',   getTyre('t-rl')],
    ['Spare Disk Wheel',   getTyre('t-sd'), 'Spare Alloy Wheel', getTyre('t-sa')],
    ['Any Minor Accident', fv('f-minoracc'), 'Any Major Accident', fv('f-majoracc')],
  ]);

  drawSubTitle('Insurance');
  drawTable([
    ['Insurance Type',    fv('f-instype'),   'Insurance Company', fv('f-insco')],
    ['Policy',            fv('f-inspolicy'), '',                  ''],
    ['Insurance From Date', formatDate(fv('f-insfrom')), 'Insurance To Date', formatDate(fv('f-insto'))],
    ['No Claim Bonus',    fv('f-ncb'),       'No Claim Bonus %',  fv('f-ncbpct')],
  ]);

  drawSubTitle('Warranty');
  drawTable([
    ['Warranty Name',       fv('f-warname'), '',                   ''],
    ['Warranty Start Date', formatDate(fv('f-warfrom')), 'Warranty To Date', formatDate(fv('f-warto'))],
  ]);

  /* ── PAGE 8: AMC & RSA ── */
  addPage();
  drawSectionTitle('Annual Maintenance Contract (AMC)');
  drawTable([
    ['AMC',           fv('f-amc'), '',              ''],
    ['AMC Start Date', formatDate(fv('f-amcfrom')), 'AMC To Date', formatDate(fv('f-amcto'))],
  ]);

  drawSubTitle('Road Side Assistance (RSA)');
  drawTable([
    ['RSA',           fv('f-rsa'), '',              ''],
    ['RSA Start Date', formatDate(fv('f-rsafrom')), 'RSA To Date', formatDate(fv('f-rsato'))],
  ]);

  /* ── Add page numbers to all pages ── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...DARK);
    doc.rect(0, H - 8, W, 8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 160, 160);
    doc.text(`Page ${i} of ${totalPages}`, W / 2, H - 3, { align: 'center' });
  }

  // Filename based on Registration Number (with fallback to brand_model)
  var filenameBase = regno
    ? regno.replace(/\s+/g,'_').toUpperCase()
    : (brand+'_'+model+'_'+variant).replace(/\s+/g,'_');
  var filename = filenameBase + '_Evaluation.pdf';

  // Download the PDF to device
  doc.save(filename);

  // Save record to browser storage (Saved PDFs panel)
  try {
    if (typeof storePDF === 'function') {
      var pdfUser   = (typeof currentUser === 'function') ? currentUser() : null;
      var pdfUserId = pdfUser ? pdfUser.id   : 0;
      var pdfByName = pdfUser ? pdfUser.name : 'Unknown';
      var pdfB64    = doc.output('datauristring').split(',')[1];

      storePDF({
        id:       Date.now(),
        name:     (brand + ' ' + model + ' ' + variant).trim() || 'Unknown Vehicle',
        regno:    regno || '',
        filename: filename,
        by:       pdfByName,
        uid:      pdfUserId,
        at:       Date.now(),
        data:     pdfB64,
      });

      showToast('PDF saved & downloaded!');
      // Update status bar
      var st = document.getElementById('sticky-status');
      if (st) { st.innerHTML = '✅ PDF downloaded — <strong>' + filename + '</strong>'; st.style.color = '#22c55e'; }
    } else {
      showToast('PDF downloaded!');
    }
  } catch(saveErr) {
    console.error('PDF save error:', saveErr);
    showToast('PDF downloaded! (Could not save to list)');
  }
}

/* ══════════════════════════════
   INITIALISE ON DOM READY
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initConditionSections();
  loadDraft();           // also calls updateActionBar(true/false)
  updateOverview();
});
