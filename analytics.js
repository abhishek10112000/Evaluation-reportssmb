/* ═══════════════════════════════════════════════
   EPIC Cars — analytics.js
   - Overall dashboard (existing)
   - User performance with monthly/yearly targets
   - Individual user drill-down (admin only)
   - PDF filename based on Registration No.
   ═══════════════════════════════════════════════ */

var RECORDS_KEY = 'epic_records_v2';
var TARGETS_KEY = 'epic_targets_v2';

/* ── Month names ── */
var MONTH_NAMES = ['','January','February','March','April','May','June',
                   'July','August','September','October','November','December'];

/* ══════════════════════════════
   FILTER HELPERS
══════════════════════════════ */
function getFilterMonth(prefix) {
  var el = document.getElementById(prefix+'-month');
  return el ? Number(el.value) : 0;
}
function getFilterYear(prefix) {
  var el = document.getElementById(prefix+'-year');
  return el ? Number(el.value) : 0;
}

function resetAnalyticsFilter() {
  var m = document.getElementById('analytics-month');
  var y = document.getElementById('analytics-year');
  if (m) m.value = '0';
  if (y) y.value = '0';
  renderAnalytics();
}
function resetPerfFilter() {
  var m = document.getElementById('perf-month');
  var y = document.getElementById('perf-year');
  if (m) m.value = '0';
  if (y) y.value = '0';
  renderUserPerformance();
}

/* Populate year dropdowns from existing record data */
function populateYearDropdowns(allRecs) {
  /* Always show years from 2020 up to current year + 1 */
  var curYear = new Date().getFullYear();
  var startYear = 2020;

  /* Also include any years found in actual records */
  var yearsFromData = {};
  allRecs.forEach(function(r){
    if (r.year) yearsFromData[r.year] = true;
    else if (r.savedAt) yearsFromData[new Date(r.savedAt).getFullYear()] = true;
  });

  /* Merge: fixed range + data years, sorted */
  var allYears = {};
  for (var y = startYear; y <= curYear + 1; y++) allYears[y] = true;
  Object.keys(yearsFromData).forEach(function(y){ allYears[y] = true; });
  var sortedYears = Object.keys(allYears).map(Number).sort();

  ['analytics-year', 'perf-year'].forEach(function(id){
    var sel = document.getElementById(id);
    if (!sel) return;
    var cur = sel.value; /* remember current selection */

    /* Rebuild options — keep "All Years" as index 0 */
    while (sel.options.length > 1) sel.remove(1);

    sortedYears.forEach(function(yr){
      var opt = document.createElement('option');
      opt.value       = yr;
      opt.textContent = yr === curYear ? yr + ' (Current)' : yr;
      sel.appendChild(opt);
    });

    /* Restore previous selection if still valid, else keep "All" */
    if (cur && cur !== '0' && sel.querySelector('option[value="'+cur+'"]')) {
      sel.value = cur;
    }
  });
}

/* Apply month/year filter to a record array */
function applyFilter(records, prefix) {
  var mon = getFilterMonth(prefix);
  var yr  = getFilterYear(prefix);
  return records.filter(function(r){
    var rMonth = r.month || (r.savedAt ? new Date(r.savedAt).getMonth()+1 : 0);
    var rYear  = r.year  || (r.savedAt ? new Date(r.savedAt).getFullYear() : 0);
    if (mon && rMonth !== mon) return false;
    if (yr  && rYear  !== yr)  return false;
    return true;
  });
}

/* Show the filter badge e.g. "Showing: March 2025 — 12 records" */
function updateFilterBadge(badgeId, filtered, mon, yr) {
  var el = document.getElementById(badgeId);
  if (!el) return;
  if (!mon && !yr) { el.textContent = ''; return; }
  var label = (mon ? MONTH_NAMES[mon]+' ' : '') + (yr || '');
  el.textContent = 'Showing: ' + label.trim() + ' — ' + filtered + ' record' + (filtered!==1?'s':'');
}

/* ── Chart colour palette ── */
var CHART_COLORS = {
  red:'#e8333a', blue:'#3b82f6', green:'#22c55e',
  yellow:'#f59e0b', purple:'#a855f7', cyan:'#06b6d4',
  orange:'#f97316', pink:'#ec4899'
};
var PALETTE = Object.values(CHART_COLORS);

/* Keep chart instances so we can destroy before redraw */
var chartInst = {};

/* ══════════════════════════════
   CHART HELPERS
══════════════════════════════ */
function cDefaults(type) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ labels:{color:'#aaa',boxWidth:12,padding:12}, position: type==='bar'?'top':'right' },
      tooltip:{ backgroundColor:'#1e1e1e', borderColor:'#3a3a3a', borderWidth:1,
                titleColor:'#f0f0f0', bodyColor:'#aaa', padding:10 }
    }
  };
}

function destroyChart(id) {
  if (chartInst[id]) { chartInst[id].destroy(); delete chartInst[id]; }
}

function drawDonut(cid, labels, data, colors) {
  destroyChart(cid);
  var canvas = document.getElementById(cid); if (!canvas) return;
  if (!data.length || data.every(function(d){return d===0;})) { noData(canvas); return; }
  chartInst[cid] = new Chart(canvas, {
    type:'doughnut',
    data:{ labels:labels, datasets:[{ data:data, backgroundColor:colors||PALETTE, borderWidth:2, borderColor:'#181818' }] },
    options: Object.assign({}, cDefaults('doughnut'), { cutout:'60%' })
  });
}

function drawBar(cid, labels, datasets, stacked) {
  destroyChart(cid);
  var canvas = document.getElementById(cid); if (!canvas) return;
  if (!labels.length) { noData(canvas); return; }
  var opts = Object.assign({}, cDefaults('bar'), {
    plugins: Object.assign({}, cDefaults('bar').plugins, {
      legend:{ display: datasets.length>1, labels:{color:'#aaa'} }
    }),
    scales:{
      x:{ ticks:{color:'#888',maxRotation:30}, grid:{color:'#2e2e2e'}, stacked:!!stacked },
      y:{ ticks:{color:'#888'}, grid:{color:'#2e2e2e'}, beginAtZero:true, stacked:!!stacked }
    }
  });
  chartInst[cid] = new Chart(canvas, { type:'bar', data:{ labels:labels, datasets:datasets }, options:opts });
}

function drawLine(cid, labels, datasets) {
  destroyChart(cid);
  var canvas = document.getElementById(cid); if (!canvas) return;
  if (!labels.length) { noData(canvas); return; }
  chartInst[cid] = new Chart(canvas, {
    type:'line',
    data:{ labels:labels, datasets:datasets },
    options: Object.assign({}, cDefaults('line'), {
      scales:{
        x:{ ticks:{color:'#888'}, grid:{color:'#2e2e2e'} },
        y:{ ticks:{color:'#888'}, grid:{color:'#2e2e2e'}, beginAtZero:true }
      },
      elements:{ line:{tension:0.4}, point:{radius:4, hoverRadius:6} }
    })
  });
}

function noData(canvas) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#444'; ctx.font='13px DM Sans,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('No data yet', canvas.width/2, canvas.height/2);
}

/* ══════════════════════════════
   RECORDS STORAGE
══════════════════════════════ */
function getAllRecords() {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || []; } catch(e) { return []; }
}

function getVisibleRecords() {
  var all = getAllRecords();
  if (typeof can==='function' && !can('viewAll')) {
    var u = typeof currentUser==='function' ? currentUser() : null;
    if (u) return all.filter(function(r){ return r.savedById===u.id; });
  }
  return all;
}

function saveAllRecords(arr) {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(arr));
}

/* ══════════════════════════════
   TARGETS STORAGE
   { userId: { monthly: N, yearly: N }, ... }
══════════════════════════════ */
function getTargets() {
  try { return JSON.parse(localStorage.getItem(TARGETS_KEY)) || {}; } catch(e) { return {}; }
}

function saveTargets(obj) {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(obj));
}

function getUserTarget(userId) {
  var t = getTargets();
  return t[userId] || { monthly:0, yearly:0 };
}

function setUserTarget(userId, monthly, yearly) {
  var t = getTargets();
  t[userId] = { monthly: Number(monthly)||0, yearly: Number(yearly)||0 };
  saveTargets(t);
}

/* ══════════════════════════════
   SAVE / UPDATE ANALYTICS RECORD
   silent=true  → no confirm dialogs, no toast (called from saveDraft)
   silent=false → normal manual save with prompts
══════════════════════════════ */
function saveToRecords(silent) {
  var brand    = (document.getElementById('f-brand') ? document.getElementById('f-brand').value : '').trim();
  var model    = (document.getElementById('f-model') ? document.getElementById('f-model').value : '').trim();
  var variant  = (document.getElementById('f-variant') ? document.getElementById('f-variant').value : '').trim();
  var regno    = (document.getElementById('f-regno') ? document.getElementById('f-regno').value : '').trim();
  var km       = document.getElementById('f-km') ? document.getElementById('f-km').value : '0';
  var fuel     = document.getElementById('f-fuel') ? document.getElementById('f-fuel').value : '';
  var trans    = document.getElementById('f-trans') ? document.getElementById('f-trans').value : '';
  var color    = document.getElementById('f-color') ? document.getElementById('f-color').value : '';
  var bodytype = document.getElementById('f-bodytype') ? document.getElementById('f-bodytype').value : '';
  var condition= document.getElementById('f-condition') ? document.getElementById('f-condition').value : '';
  var inspdate = document.getElementById('f-inspdate') ? document.getElementById('f-inspdate').value : '';
  var makeyear = document.getElementById('f-makeyear') ? document.getElementById('f-makeyear').value : '';
  var minoracc = document.getElementById('f-minoracc') ? document.getElementById('f-minoracc').value : 'No';
  var majoracc = document.getElementById('f-majoracc') ? document.getElementById('f-majoracc').value : 'No';
  var owners   = document.getElementById('f-owners') ? document.getElementById('f-owners').value : '';

  /* Need at least brand or model or regno to save */
  if (!brand && !model && !regno) {
    if (!silent) showToast('Fill in at least Brand, Model or Reg No first!');
    return;
  }

  var tyreIds = ['t-fr','t-fl','t-rr','t-rl'];
  var tyreSum = 0;
  tyreIds.forEach(function(id){
    var el = document.getElementById(id);
    tyreSum += Number(el ? el.value : 0);
  });
  var tyreAvg = Math.round(tyreSum / tyreIds.length);

  var mechGood = 0;
  if (typeof mechanicalItems !== 'undefined' && typeof conditionValues !== 'undefined') {
    mechanicalItems.forEach(function(item){
      if (conditionValues[toKey('mec',item)] === 'Good') mechGood++;
    });
  }

  var user = typeof currentUser === 'function' ? currentUser() : null;
  var now  = new Date();

  var record = {
    brand:brand, model:model, variant:variant, regno:regno,
    km:Number(km), fuel:fuel, trans:trans, color:color,
    bodytype:bodytype, condition:condition, inspdate:inspdate,
    makeyear:makeyear, owners:Number(owners)||0,
    accident:  minoracc==='Yes' || majoracc==='Yes',
    tyreAvg:tyreAvg, mechGood:mechGood,
    mechTotal: typeof mechanicalItems!=='undefined' ? mechanicalItems.length : 20,
    savedById: user ? user.id   : 0,
    savedBy:   user ? user.name : 'Unknown',
    month:     now.getMonth()+1,
    year:      now.getFullYear()
  };

  var all    = getAllRecords();
  var dupIdx = -1;

  /* Match by regno if available, otherwise by brand+model+variant */
  if (regno) {
    dupIdx = all.findIndex(function(r){ return r.regno && r.regno === regno; });
  } else if (brand && model) {
    dupIdx = all.findIndex(function(r){
      return r.brand === brand && r.model === model && r.variant === variant && !r.regno;
    });
  }

  if (dupIdx > -1) {
    /* UPDATE existing record — keep original id and savedAt */
    record.id      = all[dupIdx].id;
    record.savedAt = all[dupIdx].savedAt || Date.now();
    record.updatedAt = Date.now();
    all[dupIdx]    = record;
    if (!silent) showToast('Analytics record updated!');
  } else {
    /* NEW record */
    record.id      = Date.now();
    record.savedAt = Date.now();
    all.push(record);
    if (!silent) showToast('Record saved to analytics!');
  }

  saveAllRecords(all);

  /* Re-render analytics if currently visible */
  var analyticsSection = document.getElementById('s-analytics');
  var perfSection      = document.getElementById('s-performance');
  if (analyticsSection && analyticsSection.classList.contains('active')) renderAnalytics();
  if (perfSection      && perfSection.classList.contains('active'))      renderUserPerformance();
}

function clearAllRecords() {
  if (!confirm('Delete ALL records? This cannot be undone.')) return;
  localStorage.removeItem(RECORDS_KEY);
  renderAnalytics();
  showToast('All records cleared');
}

function deleteRecord(id) {
  if (!confirm('Delete this record?')) return;
  saveAllRecords(getAllRecords().filter(function(r){ return r.id!==id; }));
  renderAnalytics();
  showToast('Record deleted');
}

function loadRecordIntoForm(id) {
  var r = getAllRecords().find(function(x){ return x.id===id; });
  if (!r) return;
  var map = {
    'f-brand':r.brand,'f-model':r.model,'f-variant':r.variant,
    'f-regno':r.regno,'f-km':r.km,'f-fuel':r.fuel,
    'f-trans':r.trans,'f-color':r.color,'f-bodytype':r.bodytype,
    'f-condition':r.condition,'f-inspdate':r.inspdate,
    'f-makeyear':r.makeyear,'f-owners':r.owners
  };
  Object.entries(map).forEach(function([fid,val]){
    var el = document.getElementById(fid);
    if (el && val!==undefined) el.value = val;
  });
  if (typeof updateOverview==='function') updateOverview();
  var firstNav = document.querySelector('.nav-item');
  if (typeof showSection==='function' && firstNav) showSection('overview', firstNav);
  showToast('Record loaded into form');
}

/* ══════════════════════════════
   RENDER FULL ANALYTICS
══════════════════════════════ */
function renderAnalytics() {
  var allVisible = getVisibleRecords();
  populateYearDropdowns(getAllRecords());

  var mon      = getFilterMonth('analytics');
  var yr       = getFilterYear('analytics');
  var filtered = applyFilter(allVisible, 'analytics');

  updateFilterBadge('analytics-filter-badge', filtered.length, mon, yr);
  renderKPIs(filtered);
  renderOverallCharts(filtered);
  renderTable(filtered);
}

/* ── KPI Cards ── */
function renderKPIs(records) {
  var total   = records.length;
  var diesel  = records.filter(function(r){ return (r.fuel||'').toLowerCase()==='diesel'; }).length;
  var petrol  = records.filter(function(r){ return (r.fuel||'').toLowerCase()==='petrol'; }).length;
  var avgKm   = total ? Math.round(records.reduce(function(s,r){ return s+(r.km||0); },0)/total) : 0;
  var good    = records.filter(function(r){ return ['good','excellent'].includes((r.condition||'').toLowerCase()); }).length;
  var acc     = records.filter(function(r){ return r.accident; }).length;

  function set(id,v){ var el=document.getElementById(id); if(el) el.textContent=v; }
  set('kpi-total',  total);
  set('kpi-diesel', diesel);
  set('kpi-petrol', petrol);
  set('kpi-avgkm',  total ? avgKm.toLocaleString() : '—');
  set('kpi-good',   good);
  set('kpi-accident', acc);
}

/* ── Overall Charts ── */
function renderOverallCharts(records) {
  /* Fuel donut */
  var fuelCounts = {};
  records.forEach(function(r){ var k=r.fuel||'Unknown'; fuelCounts[k]=(fuelCounts[k]||0)+1; });
  drawDonut('chart-fuel', Object.keys(fuelCounts), Object.values(fuelCounts),
    [CHART_COLORS.blue,CHART_COLORS.red,CHART_COLORS.green,CHART_COLORS.yellow,CHART_COLORS.purple]);

  /* Transmission donut */
  var transCounts = {};
  records.forEach(function(r){ var k=r.trans||'Unknown'; transCounts[k]=(transCounts[k]||0)+1; });
  drawDonut('chart-trans', Object.keys(transCounts), Object.values(transCounts),
    [CHART_COLORS.cyan,CHART_COLORS.orange,CHART_COLORS.pink,CHART_COLORS.purple]);

  /* Condition donut */
  var condMap = { Excellent:CHART_COLORS.green, Good:'#4ade80', Average:CHART_COLORS.yellow, Poor:CHART_COLORS.red };
  var condCounts = {};
  records.forEach(function(r){ var k=r.condition||'Unknown'; condCounts[k]=(condCounts[k]||0)+1; });
  drawDonut('chart-condition', Object.keys(condCounts), Object.values(condCounts),
    Object.keys(condCounts).map(function(k){ return condMap[k]||CHART_COLORS.blue; }));

  /* KM bar */
  var sorted = records.slice().sort(function(a,b){ return b.km-a.km; }).slice(0,12);
  drawBar('chart-km',
    sorted.map(function(r){ return (r.brand+' '+r.model).trim()||r.regno||'Vehicle'; }),
    [{ label:'KM Driven', data:sorted.map(function(r){ return r.km||0; }),
       backgroundColor: sorted.map(function(_,i){ return i===0?CHART_COLORS.red:CHART_COLORS.blue+'99'; }),
       borderRadius:4 }]);

  /* Body type donut */
  var bodyCounts = {};
  records.forEach(function(r){ var k=r.bodytype||'Unknown'; bodyCounts[k]=(bodyCounts[k]||0)+1; });
  drawDonut('chart-body', Object.keys(bodyCounts), Object.values(bodyCounts), PALETTE);

  /* Accident donut */
  var accYes = records.filter(function(r){ return r.accident; }).length;
  drawDonut('chart-accident',['No Accident','Has Accident'],[records.length-accYes,accYes],
    [CHART_COLORS.green,CHART_COLORS.red]);

  /* Tyre bar */
  if (records.length) {
    drawBar('chart-tyre',
      records.map(function(r){ return (r.brand+' '+r.model).trim()||r.regno||'Vehicle'; }),
      [{ label:'Avg Tyre %',
         data:records.map(function(r){ return r.tyreAvg||0; }),
         backgroundColor:records.map(function(r){
           return r.tyreAvg>=80?CHART_COLORS.green+'cc':r.tyreAvg>=50?CHART_COLORS.yellow+'cc':CHART_COLORS.red+'cc';
         }), borderRadius:4 }]);
  }

  /* Monthly trend line */
  var monthMap = {};
  records.forEach(function(r){
    if (!r.savedAt) return;
    var d  = new Date(r.savedAt);
    var key= d.getFullYear()+'-'+(String(d.getMonth()+1).padStart(2,'0'));
    monthMap[key]=(monthMap[key]||0)+1;
  });
  var monthKeys = Object.keys(monthMap).sort();
  drawLine('chart-monthly', monthKeys,
    [{ label:'Evaluations', data:monthKeys.map(function(k){ return monthMap[k]; }),
       borderColor:CHART_COLORS.red, backgroundColor:CHART_COLORS.red+'22',
       fill:true, borderWidth:2 }]);
}

/* ── Records Table ── */
function renderTable(records) {
  var tbody = document.getElementById('records-tbody');
  if (!tbody) return;
  if (!records.length) {
    tbody.innerHTML='<tr><td colspan="10" style="text-align:center;color:var(--muted);padding:24px;">No records yet. Fill the form and click "Save to Records".</td></tr>';
    return;
  }
  var html='';
  records.forEach(function(r,i){
    var condColor = ['excellent','good'].includes((r.condition||'').toLowerCase()) ? '#22c55e'
                  : (r.condition||'').toLowerCase()==='average' ? '#f59e0b'
                  : r.condition ? '#ef4444' : '#888';
    var accBadge = r.accident
      ? '<span style="color:#ef4444;font-weight:700;">Yes</span>'
      : '<span style="color:#22c55e;">No</span>';
    var delBtn = (typeof can==='function' && can('delete'))
      ? '<button class="btn btn-ghost" style="padding:4px 8px;font-size:11px;color:#ef4444;border-color:#ef444440;" onclick="deleteRecord('+r.id+')">✕</button>'
      : '';
    html+='<tr>'
      +'<td>'+(i+1)+'</td>'
      +'<td><strong>'+(r.brand||'')+' '+(r.model||'')+'</strong><br>'
      +'<span style="font-size:11px;color:var(--muted)">'+(r.variant||'')+'</span></td>'
      +'<td>'+(r.regno||'—')+'</td>'
      +'<td>'+(r.km?Number(r.km).toLocaleString()+' km':'—')+'</td>'
      +'<td>'+(r.fuel||'—')+'</td>'
      +'<td>'+(r.trans||'—')+'</td>'
      +'<td><span style="color:'+condColor+';font-weight:600;">'+(r.condition||'—')+'</span></td>'
      +'<td>'+accBadge+'</td>'
      +'<td>'+(r.inspdate?formatDate(r.inspdate):'—')+'</td>'
      +'<td style="display:flex;gap:4px;">'
      +'<button class="btn btn-secondary" style="padding:4px 8px;font-size:11px;" onclick="loadRecordIntoForm('+r.id+')">Load</button>'
      +delBtn+'</td></tr>';
  });
  tbody.innerHTML = html;
}

/* ══════════════════════════════
   USER PERFORMANCE
══════════════════════════════ */
function renderUserPerformance() {
  var isAdmin   = typeof can==='function' && can('manageUsers');
  var allRecs   = getAllRecords();
  var users     = typeof epicGetUsers==='function' ? epicGetUsers() : [];
  var curUser   = typeof currentUser==='function' ? currentUser() : null;
  var showUsers = isAdmin ? users : users.filter(function(u){ return u.id===curUser?.id; });

  var mon = getFilterMonth('perf');
  var yr  = getFilterYear('perf');
  var now = new Date();
  var cMon = now.getMonth()+1, cYear = now.getFullYear();

  /* Update column header */
  var thMon = document.getElementById('perf-th-month');
  if (thMon) thMon.textContent = mon ? MONTH_NAMES[mon] : 'Month Filter';

  var lbTbody = document.getElementById('perf-leaderboard-tbody');
  if (!lbTbody) return;

  if (!showUsers.length) {
    lbTbody.innerHTML='<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:24px;">No users found.</td></tr>';
    return;
  }

  var userStats = showUsers.map(function(u){
    var uRecs    = allRecs.filter(function(r){ return r.savedById===u.id; });
    var fRecs    = applyFilter(uRecs,'perf');
    var monRecs  = uRecs.filter(function(r){ return r.month===cMon  && r.year===cYear; });
    var yrRecs   = uRecs.filter(function(r){ return r.year===cYear; });
    var target   = getUserTarget(u.id);
    var mPct     = target.monthly ? Math.round((monRecs.length/target.monthly)*100) : null;
    var yPct     = target.yearly  ? Math.round((yrRecs.length/target.yearly)*100)   : null;
    return { u:u, total:uRecs.length, filtered:fRecs.length,
             monthly:monRecs.length, yearly:yrRecs.length,
             target:target, mPct:mPct, yPct:yPct };
  }).sort(function(a,b){ return b.total-a.total; });

  /* Filter badge */
  var tf = userStats.reduce(function(s,x){ return s+x.filtered; },0);
  updateFilterBadge('perf-filter-badge', tf, mon, yr);

  function mkBar(pct,col){ return pct!==null
    ? '<div class="perf-bar-wrap"><div class="perf-bar" style="width:'+Math.min(pct,100)+'%;background:'+col+'"></div></div>'
      +'<span style="font-size:10px;color:'+col+'">'+pct+'%</span>'
    : '<span style="color:var(--muted);font-size:11px;">No target</span>'; }

  var html='';
  userStats.forEach(function(s,idx){
    var medal = idx===0?'\uD83E\uDD47':idx===1?'\uD83E\uDD48':idx===2?'\uD83E\uDD49':'';
    var mCol  = s.mPct>=100?'#22c55e':s.mPct>=70?'#f59e0b':'#e8333a';
    var yCol  = s.yPct>=100?'#22c55e':s.yPct>=70?'#f59e0b':'#e8333a';
    var periodCell = (mon||yr)
      ? '<td style="text-align:center"><strong style="color:var(--accent);font-size:16px;">'+s.filtered+'</strong></td>'
      : '<td style="text-align:center;color:var(--muted);font-size:12px;">—</td>';
    var viewBtn   = isAdmin ? '<button class="btn btn-secondary" style="padding:3px 8px;font-size:11px;" onclick="openUserDrilldown('+s.u.id+')">\uD83D\uDC41 View</button>' : '';
    var targetBtn = isAdmin ? '<button class="btn btn-ghost" style="padding:3px 8px;font-size:11px;" onclick="openSetTarget('+s.u.id+',\''+s.u.name+'\')">\uD83C\uDFAF Target</button>' : '';
    html+='<tr>'
      +'<td>'+medal+(idx+1)+'</td>'
      +'<td><strong>'+s.u.name+'</strong><br><span style="font-size:10px;color:var(--muted)">'+s.u.username+'</span></td>'
      +'<td><span class="role-badge role-'+s.u.role+'">'+s.u.role.toUpperCase()+'</span></td>'
      +'<td style="text-align:center;font-family:\'Bebas Neue\',sans-serif;font-size:18px;color:var(--accent)">'+s.total+'</td>'
      +periodCell
      +'<td style="text-align:center"><strong>'+s.monthly+'</strong>'+(s.target.monthly?' / <span style="color:var(--muted)">'+s.target.monthly+'</span>':'')+'</td>'
      +'<td style="text-align:center"><strong>'+s.yearly+'</strong>'+(s.target.yearly?' / <span style="color:var(--muted)">'+s.target.yearly+'</span>':'')+'</td>'
      +'<td><div style="display:flex;flex-direction:column;gap:4px;">'+mkBar(s.mPct,mCol)+mkBar(s.yPct,yCol)+'</div></td>'
      +'<td style="display:flex;gap:4px;flex-wrap:wrap;">'+viewBtn+targetBtn+'</td>'
      +'</tr>';
  });
  lbTbody.innerHTML = html;

  var cData = (mon||yr) ? userStats.map(function(s){ return s.filtered; }) : userStats.map(function(s){ return s.total; });
  var cLabel = (mon||yr) ? ((MONTH_NAMES[mon]||'')+' '+(yr||'')).trim() : 'All Time';
  drawBar('chart-user-comparison',
    userStats.map(function(s){ return s.u.name; }),
    [
      { label:cLabel, data:cData, backgroundColor:CHART_COLORS.red+'cc', borderRadius:4 },
      { label:'This Month', data:userStats.map(function(s){ return s.monthly; }),
        backgroundColor:CHART_COLORS.blue+'99', borderRadius:4 }
    ]);

  if (isAdmin) {
    var ht = userStats.filter(function(s){ return s.target.monthly>0; });
    if (ht.length) {
      drawBar('chart-target-actual',
        ht.map(function(s){ return s.u.name; }),
        [
          { label:'Monthly Target', data:ht.map(function(s){ return s.target.monthly; }),
            backgroundColor:CHART_COLORS.yellow+'99', borderRadius:4 },
          { label:'This Month Actual', data:ht.map(function(s){ return s.monthly; }),
            backgroundColor:CHART_COLORS.green+'cc', borderRadius:4 }
        ]);
    }
  }
}

/* ══════════════════════════════
   SET TARGET MODAL (Admin)
══════════════════════════════ */
function openSetTarget(userId, userName) {
  var t = getUserTarget(userId);
  document.getElementById('modal-target-title').textContent = '🎯 Set Target for ' + userName;
  document.getElementById('modal-target-userid').value  = userId;
  document.getElementById('modal-target-monthly').value = t.monthly || '';
  document.getElementById('modal-target-yearly').value  = t.yearly  || '';
  document.getElementById('target-modal').style.display = 'flex';
}

function closeTargetModal() {
  document.getElementById('target-modal').style.display = 'none';
}

function saveTarget() {
  var uid = Number(document.getElementById('modal-target-userid').value);
  var mon = Number(document.getElementById('modal-target-monthly').value) || 0;
  var yr  = Number(document.getElementById('modal-target-yearly').value)  || 0;
  setUserTarget(uid, mon, yr);
  closeTargetModal();
  renderUserPerformance();
  showToast('Target saved!');
}

/* ══════════════════════════════
   USER DRILLDOWN MODAL (Admin)
══════════════════════════════ */
function openUserDrilldown(userId) {
  var users   = typeof epicGetUsers==='function' ? epicGetUsers() : [];
  var user    = users.find(function(u){ return u.id===userId; });
  if (!user) return;

  var allRecs = getAllRecords();
  var uRecs   = allRecs.filter(function(r){ return r.savedById===userId; });
  var now     = new Date();
  var curMon  = now.getMonth()+1, curYear = now.getFullYear();
  var monRecs = uRecs.filter(function(r){ return r.month===curMon && r.year===curYear; });
  var target  = getUserTarget(userId);

  /* Header */
  document.getElementById('drilldown-name').textContent  = user.name;
  document.getElementById('drilldown-role').textContent  = user.role.toUpperCase();
  document.getElementById('drilldown-role').className    = 'role-badge role-'+user.role;
  document.getElementById('drilldown-total').textContent = uRecs.length;
  document.getElementById('drilldown-month').textContent = monRecs.length
    + (target.monthly ? ' / '+target.monthly : '');
  document.getElementById('drilldown-year').textContent  = uRecs.filter(function(r){ return r.year===curYear; }).length
    + (target.yearly ? ' / '+target.yearly : '');

  /* Fuel breakdown mini chart */
  var fuelMap={};
  uRecs.forEach(function(r){ var k=r.fuel||'Unknown'; fuelMap[k]=(fuelMap[k]||0)+1; });
  drawDonut('dd-chart-fuel', Object.keys(fuelMap), Object.values(fuelMap),
    [CHART_COLORS.blue,CHART_COLORS.red,CHART_COLORS.green,CHART_COLORS.yellow]);

  /* Monthly trend for this user */
  var mTrend={};
  uRecs.forEach(function(r){
    if (!r.savedAt) return;
    var d=new Date(r.savedAt);
    var k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    mTrend[k]=(mTrend[k]||0)+1;
  });
  var mKeys=Object.keys(mTrend).sort();
  drawLine('dd-chart-trend', mKeys,
    [{ label:'Evaluations', data:mKeys.map(function(k){ return mTrend[k]; }),
       borderColor:CHART_COLORS.red, backgroundColor:CHART_COLORS.red+'22',
       fill:true, borderWidth:2 }]);

  /* Condition donut */
  var condMap={};
  uRecs.forEach(function(r){ var k=r.condition||'Unknown'; condMap[k]=(condMap[k]||0)+1; });
  drawDonut('dd-chart-condition', Object.keys(condMap), Object.values(condMap),
    [CHART_COLORS.green,'#4ade80',CHART_COLORS.yellow,CHART_COLORS.red,'#555']);

  /* Evaluation list */
  var listEl = document.getElementById('dd-eval-list');
  if (listEl) {
    if (!uRecs.length) {
      listEl.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px;">No evaluations yet.</td></tr>';
    } else {
      var sorted = uRecs.slice().sort(function(a,b){ return (b.savedAt||0)-(a.savedAt||0); });
      listEl.innerHTML = sorted.map(function(r,i){
        var condCol = ['good','excellent'].includes((r.condition||'').toLowerCase())
          ? '#22c55e' : (r.condition||'').toLowerCase()==='average' ? '#f59e0b' : r.condition ? '#ef4444' : '#888';
        return '<tr>'
          +'<td>'+(i+1)+'</td>'
          +'<td><strong>'+(r.brand||'')+' '+(r.model||'')+' '+(r.variant||'')+'</strong></td>'
          +'<td><code style="color:var(--accent)">'+(r.regno||'—')+'</code></td>'
          +'<td><span style="color:'+condCol+';font-weight:600;">'+(r.condition||'—')+'</span></td>'
          +'<td>'+(r.inspdate?formatDate(r.inspdate):'—')+'</td>'
          +'<td>'+(r.savedAt?new Date(r.savedAt).toLocaleDateString('en-IN'):'—')+'</td>'
          +'</tr>';
      }).join('');
    }
  }

  document.getElementById('drilldown-modal').style.display='flex';
}

function closeUserDrilldown() {
  document.getElementById('drilldown-modal').style.display='none';
  ['dd-chart-fuel','dd-chart-trend','dd-chart-condition'].forEach(destroyChart);
}

/* ══════════════════════════════
   OVERRIDE showSection
══════════════════════════════ */
var _origShow = typeof showSection !== 'undefined' ? showSection : null;
window.showSection = function(id, el) {
  if (_origShow) _origShow(id, el);
  else {
    document.querySelectorAll('.section').forEach(function(s){ s.classList.remove('active'); });
    var sec = document.getElementById('s-'+id);
    if (sec) sec.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(function(n){ n.classList.remove('active'); });
    if (el) el.classList.add('active');
    document.getElementById('main-content')?.scrollTo({top:0,behavior:'smooth'});
    if (window.innerWidth<1024 && typeof closeSidebar==='function') closeSidebar();
  }
  if (id==='analytics') {
    setTimeout(function(){ populateYearDropdowns(getAllRecords()); renderAnalytics(); }, 60);
  }
  if (id==='performance') {
    setTimeout(function(){ populateYearDropdowns(getAllRecords()); renderUserPerformance(); }, 60);
  }
  if (id==='savedpdfs') {
    setTimeout(function(){ if (typeof renderPDFList==='function') renderPDFList(); }, 60);
  }
};

/* ══════════════════════════════
   INIT
══════════════════════════════ */
window.addEventListener('DOMContentLoaded', function(){
  populateYearDropdowns(getAllRecords());
  renderAnalytics();
});
