// app.js - main application logic for CSV -> .htaccess generator
import { initDB, addRedirect, getAllRedirects, updateRedirect, clearAllRedirects, getActiveRedirects } from './db.js';

const $ = id => document.getElementById(id);

// Simple CSV line parser that handles quoted values
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const rows = lines.map(line => {
    const res = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i+1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        res.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    res.push(cur);
    return res.map(s => s.trim());
  });
  // If first row looks like header, return as { headers, data }
  const first = rows[0] || [];
  const headers = first.map(h => h.toLowerCase());
  const hasHeader = headers.some(h => h.includes('origin') || h.includes('destination') || h.includes('status'));
  if (hasHeader) {
    return { headers: rows[0], data: rows.slice(1) };
  }
  // fallback: positional
  return { headers: [], data: rows };
}

function normalizeUrl(u) {
  try {
    return new URL(u);
  } catch (e) {
    // try to add protocol if missing
    try {
      return new URL('https://' + u);
    } catch (e2) {
      return null;
    }
  }
}

function escapeForRegex(s) {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\$&');
}

function showStatus(msg) {
  const el = $('statusBadge');
  if (el) el.textContent = msg;
}

async function loadAndRender() {
  const rows = await getAllRedirects();
  renderRows(rows);
}

function createActionsForRow(r) {
  const wrap = document.createElement('div');

  const editBtn = document.createElement('button');
  editBtn.className = 'px-2 py-1 bg-yellow-500 text-white rounded mr-2';
  editBtn.textContent = 'Edit';
  editBtn.onclick = () => openEditModal(r);

  const delBtn = document.createElement('button');
  delBtn.className = 'px-2 py-1 bg-red-600 text-white rounded';
  delBtn.textContent = 'Disable';
  delBtn.onclick = async () => {
    const updated = Object.assign({}, r, { active: false });
    await updateRedirect(updated);
    await loadAndRender();
  };

  wrap.appendChild(editBtn);
  wrap.appendChild(delBtn);
  return wrap;
}

function renderRows(rows) {
  const tableBody = $('tableBody');
  const cards = $('cardsContainer');
  tableBody.innerHTML = '';
  cards.innerHTML = '';

  rows.forEach(r => {
    // Row only if active or show all? We'll show all but style disabled
    const tr = document.createElement('tr');
    tr.className = r.active ? 'hover:bg-gray-50' : 'opacity-50';

    const tdOrigin = document.createElement('td');
    tdOrigin.className = 'px-4 py-2 text-sm text-gray-700';
    tdOrigin.textContent = r.url_origin;

    const tdDest = document.createElement('td');
    tdDest.className = 'px-4 py-2 text-sm text-gray-700';
    tdDest.textContent = r.url_dest;

    const tdStatus = document.createElement('td');
    tdStatus.className = 'px-4 py-2 text-sm text-gray-700';
    tdStatus.textContent = r.http_status;

    const tdOptions = document.createElement('td');
    tdOptions.className = 'px-4 py-2 text-sm text-gray-700';
    tdOptions.textContent = (r.pathname_only ? 'pathname-only' : 'full') + (r.flag_qsd ? ' • QSD' : '');

    const tdActions = document.createElement('td');
    tdActions.className = 'px-4 py-2 text-right text-sm';
    tdActions.appendChild(createActionsForRow(r));

    tr.appendChild(tdOrigin);
    tr.appendChild(tdDest);
    tr.appendChild(tdStatus);
    tr.appendChild(tdOptions);
    tr.appendChild(tdActions);
    tableBody.appendChild(tr);

    // Card for mobile
    const card = document.createElement('div');
    card.className = 'bg-white p-3 rounded shadow ' + (r.active ? '' : 'opacity-50');
    const html = `\n      <div class="flex justify-between">\n        <div>\n          <div class="text-sm font-medium">Origin</div>\n          <div class="text-sm text-gray-700 break-words">${r.url_origin}</div>\n        </div>\n        <div class="text-sm">${r.http_status}</div>\n      </div>\n      <div class="mt-2">\n        <div class="text-sm font-medium">Destination</div>\n        <div class="text-sm text-gray-700 break-words">${r.url_dest}</div>\n      </div>\n      <div class="mt-2 text-xs text-gray-500">${r.pathname_only ? 'pathname-only' : 'full'} ${r.flag_qsd ? '• QSD' : ''}</div>\n    `;
    card.innerHTML = html;
    const actionsWrap = createActionsForRow(r);
    actionsWrap.className = 'mt-2';
    card.appendChild(actionsWrap);
    cards.appendChild(card);
  });
}

// Modal handling
function openAddModal() {
  $('modalTitle').textContent = 'Add Row';
  $('originInput').value = '';
  $('destInput').value = '';
  $('statusSelect').value = '301';
  $('pathnameOnlyInput').checked = true;
  $('flagQsdInput').checked = false;
  $('modalBackdrop').classList.remove('hidden');
  $('modalBackdrop').classList.add('flex');
  $('rowForm').dataset.editId = '';
}

function openEditModal(r) {
  $('modalTitle').textContent = 'Edit Row';
  $('originInput').value = r.url_origin || '';
  $('destInput').value = r.url_dest || '';
  $('statusSelect').value = r.http_status || '301';
  $('pathnameOnlyInput').checked = !!r.pathname_only;
  $('flagQsdInput').checked = !!r.flag_qsd;
  $('modalBackdrop').classList.remove('hidden');
  $('modalBackdrop').classList.add('flex');
  $('rowForm').dataset.editId = r.unique_id;
}

function closeModal() {
  $('modalBackdrop').classList.add('hidden');
  $('modalBackdrop').classList.remove('flex');
  delete $('rowForm').dataset.editId;
}

async function saveForm(e) {
  e.preventDefault();
  const origin = $('originInput').value.trim();
  const dest = $('destInput').value.trim();
  const status = $('statusSelect').value;
  const pathnameOnly = $('pathnameOnlyInput').checked;
  const flagQsd = $('flagQsdInput').checked;

  const validOrigin = normalizeUrl(origin);
  const validDest = normalizeUrl(dest);
  if (!validOrigin || !validDest) {
    alert('Origin or Destination URL non valido. Assicurati di includere schema (https://) o un URL valido.');
    return;
  }

  const id = $('rowForm').dataset.editId;
  const obj = {
    url_origin: validOrigin.href,
    url_dest: validDest.href,
    http_status: status,
    pathname_only: pathnameOnly,
    flag_qsd: flagQsd,
    active: true,
    duplicated: false,
    malformed: false
  };

  if (id) {
    // update existing
    obj.unique_id = id;
    await updateRedirect(obj);
  } else {
    await addRedirect(obj);
  }
  closeModal();
  await loadAndRender();
}

// CSV import handling
async function handleCsvFile(file) {
  const text = await file.text();
  const { headers, data } = parseCSV(text);
  // Map columns
  const headerMap = {};
  if (headers && headers.length > 0) {
    headers.forEach((h, i) => {
      const key = h.toLowerCase();
      if (key.includes('origin')) headerMap.origin = i;
      if (key.includes('destination') || key.includes('dest')) headerMap.dest = i;
      if (key.includes('status')) headerMap.status = i;
    });
  }
  // fallback positions
  const originIdx = headerMap.origin ?? 0;
  const destIdx = headerMap.dest ?? 1;
  const statusIdx = headerMap.status ?? 2;

  let added = 0;
  for (const row of data) {
    const origin = row[originIdx] || '';
    const dest = row[destIdx] || '';
    const status = row[statusIdx] || '301';
    const vOrigin = normalizeUrl(origin);
    const vDest = normalizeUrl(dest);
    if (!vOrigin || !vDest) continue;
    await addRedirect({
      url_origin: vOrigin.href,
      url_dest: vDest.href,
      http_status: String(status).trim() || '301',
      pathname_only: true,
      flag_qsd: false,
      active: true
    });
    added++;
  }
  showStatus(`Imported ${added} rows`);
  await loadAndRender();
}

function generateHtaccessRules(redirects) {
  if (!redirects.length) return '# No rules\n';
  const byHost = {};
  redirects.forEach(r => {
    try {
      const u = new URL(r.url_origin);
      const host = u.host;
      byHost[host] = byHost[host] || [];
      byHost[host].push({ r, originUrl: u });
    } catch (e) {
      // skip malformed
    }
  });

  let out = 'RewriteEngine On\n\n';
  for (const host of Object.keys(byHost)) {
    out += `# Rules for ${host}\n`;
    out += `RewriteCond %{HTTP_HOST} ^(www\.)?${escapeForRegex(host)}$ [NC]\n`;
    byHost[host].forEach(({ r, originUrl }) => {
      // path for pattern: in .htaccess usually without leading slash
      let pattern = originUrl.pathname || '/';
      if (r.pathname_only) {
        // remove leading slash
        pattern = pattern.replace(/^\/, '');
        if (pattern === '') pattern = '';
        else pattern = '^' + escapeForRegex(pattern) + '$';
      } else {
        // full match including possible query ignored (can't match query via RewriteRule),
        pattern = '^' + escapeForRegex((originUrl.pathname || '').replace(/^\/, '')) + '$';
      }
      // Destination
      const dest = r.url_dest;
      const flags = [`R=${r.http_status}`, 'L'];
      if (r.flag_qsd) flags.push('QSD');
      out += `RewriteRule ${pattern} ${dest} [${flags.join(',')}]\n`;
    });
    out += '\n';
  }
  return out;
}

async function handleGenerate() {
  const active = await getActiveRedirects();
  if (!active.length) {
    alert('No active redirects to generate.');
    return;
  }
  const txt = generateHtaccessRules(active);
  // Offer download
  const blob = new Blob([txt], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '.htaccess';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showStatus(`Generated ${active.length} rules`);
}

async function init() {
  await initDB();
  // Wire UI
  $('importCsvBtn').onclick = () => $('csvInput').click();
  $('csvInput').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      await handleCsvFile(f);
      e.target.value = '';
    }
  };
  $('addRowBtn').onclick = openAddModal;
  $('cancelModalBtn').onclick = (e) => { e.preventDefault(); closeModal(); };
  $('rowForm').onsubmit = saveForm;
  $('clearAllBtn').onclick = async () => {
    if (confirm('Clear all redirects? This cannot be undone.')) {
      await clearAllRedirects();
      await loadAndRender();
    }
  };
  $('generateBtn').onclick = handleGenerate;

  // initial load
  await loadAndRender();
}

document.addEventListener('DOMContentLoaded', init);