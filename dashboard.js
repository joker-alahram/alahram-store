const CONFIG = {
  baseUrl: 'https://upzuslyqfcvpbkqyzyxp.supabase.co/rest/v1',
  apiKey: 'sb_publishable_vpqJxVuMbYbm0y3VvVhuJw_FBQkLvYg',
  whatsapp: localStorage.getItem('support_whatsapp') || '201552670465',
};

const DEFAULT_USERS = [
  { username: 'admin', name: 'مدير النظام', password: 'admin123', role: 'admin', active: true },
  { username: 'manager', name: 'المدير', password: 'manager123', role: 'manager', active: true },
  { username: 'viewer', name: 'المراقب', password: 'viewer123', role: 'viewer', active: true },
];

const STATUSES = ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'paid'];

const state = {
  session: loadJSON('dashboard_session', null),
  dashUsers: loadJSON('dashboard_users_v1', null),
  section: 'home',
  tab: 'customers',
  search: '',
  reportStart: '',
  reportEnd: '',
  edit: null,
  records: {
    companies: [], products: [], pricesCarton: [], pricesPack: [], customers: [], salesReps: [], orders: [], orderItems: [], vProducts: [], dailyDeals: [], flashOffers: [],
  },
  orders: [],
  topProducts: [],
  topCompanies: [],
  topCustomers: [],
  repsPerformance: [],
  dailySales: [],
  statusBreakdown: [],
};

const els = {};
[
  'sidebar','backdrop','menuBtn','refreshBtn','pageTitle','pageSub','globalSearch','clearSearch',
  'roleBadge','userBadge','logoutBtn','loginModal','loginUser','loginPass','loginBtn',
  'editModal','editTitle','editSub','editForm','saveEdit',
  'detailsModal','detailsTitle','detailsSub','detailsBody',
  'dashUserModal','dashUserForm','createDashUser','addDashUser',
  'toast','waInput','saveWa',
  'statOrders','statSales','statCustomers','statProducts',
  'latestOrders','latestCount','topProducts','topCompanies',
  'ordersBody','statusFilter',
  'usersBody','dashUsersBody','productsBody','companiesBody',
  'startDate','endDate','applyFilter','salesRange','statusTotal','dailySales','statusBreakdown','topCustomers','repPerformance'
].forEach(id => els[id] = document.getElementById(id));

function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function fmt(n, digits = 2) {
  const x = Number(n ?? 0);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: x % 1 === 0 ? 0 : Math.min(2, digits) }).format(x);
}
function money(n) { return `${fmt(n)} EGP`; }
function int(n) { return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(n ?? 0)); }
function esc(v) { return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => els.toast.classList.add('hidden'), 2200);
}
function dateStr(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
}
function svgPlaceholder(label) {
  const init = String(label || 'A').trim().slice(0,2).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" rx="120" fill="#111"/><circle cx="400" cy="400" r="250" fill="#d8b35a" opacity="0.16"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#d8b35a" font-size="220" font-family="Arial" font-weight="700">${init}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
function api(path, { method='GET', query={}, body=null } = {}) {
  const url = new URL(`${CONFIG.baseUrl}/${path}`);
  Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v); });
  return fetch(url.toString(), {
    method,
    headers: {
      apikey: CONFIG.apiKey,
      Authorization: `Bearer ${CONFIG.apiKey}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json', Prefer: 'return=representation' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async res => {
    if (!res.ok) throw new Error(await res.text());
    if (res.status === 204) return [];
    const txt = await res.text();
    return txt ? JSON.parse(txt) : [];
  });
}
function seedUsers() {
  if (!Array.isArray(state.dashUsers) || !state.dashUsers.length) {
    state.dashUsers = DEFAULT_USERS.slice();
    saveJSON('dashboard_users_v1', state.dashUsers);
  }
}
function currentRole() { return state.session?.role || ''; }
function canEditAll() { return currentRole() === 'admin'; }
function canChangeStatus() { return currentRole() === 'admin' || currentRole() === 'manager'; }
function showModal(id, show) { els[id].classList.toggle('hidden', !show); }
function setSection(section) {
  state.section = section;
  document.querySelectorAll('.section').forEach(sec => sec.classList.toggle('active', sec.dataset.sec === section));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.sec === section));
  const titles = { home:['الرئيسية','مراقبة وإدارة كاملة للنظام'], orders:['الطلبات','عرض الطلبات وتغيير الحالة'], users:['المستخدمون','العملاء والمناديب'], products:['المنتجات','تعديل الاسم والسعر والحالة'], companies:['الشركات','تعديل الشركات والظهور'], reports:['التقارير','تحليلات ومؤشرات تشغيلية'], settings:['الإعدادات','التحكم المحلي والاتصال'] };
  els.pageTitle.textContent = titles[section][0];
  els.pageSub.textContent = titles[section][1];
}
function setSidebarState() { document.body.classList.toggle('sidebar-open', false); }
function renderAuth() {
  els.roleBadge.textContent = state.session?.role || '-';
  els.userBadge.textContent = state.session?.name || state.session?.username || '-';
  if (!state.session) showModal('loginModal', true); else showModal('loginModal', false);
  document.querySelectorAll('.admin-only').forEach(el => el.dataset.hidden = canEditAll() ? '0' : '1');
}
function login() {
  const username = els.loginUser.value.trim();
  const pass = els.loginPass.value.trim();
  const found = state.dashUsers.find(u => u.active !== false && u.username === username && u.password === pass);
  if (!found) return toast('بيانات الدخول غير صحيحة');
  state.session = { username: found.username, name: found.name, role: found.role };
  saveJSON('dashboard_session', state.session);
  renderAuth();
  toast(`مرحبًا ${found.name}`);
}
function logout() { localStorage.removeItem('dashboard_session'); state.session = null; renderAuth(); }
function buildIndex() {
  state.maps = {
    company: new Map(state.records.companies.map(x => [x.company_id, x])),
    product: new Map(state.records.products.map(x => [x.product_id, x])),
    customer: new Map(state.records.customers.map(x => [x.id, x])),
    rep: new Map(state.records.salesReps.map(x => [x.id, x])),
  };
  state.maps.carton = new Map(state.records.pricesCarton.map(x => [`${x.product_id}::${x.tier_name}`, x]));
  state.maps.pack = new Map(state.records.pricesPack.map(x => [`${x.product_id}::${x.tier_name}`, x]));
}
function groupBy(arr, key) { return arr.reduce((m, x) => { const k = x[key] ?? ''; (m[k] ||= []).push(x); return m; }, {}); }
function enrich() {
  const itemsByOrder = groupBy(state.records.orderItems, 'order_id');
  state.orders = state.records.orders.map(o => {
    const customer = o.customer_id ? state.maps.customer.get(o.customer_id) : null;
    const rep = o.user_id ? state.maps.rep.get(o.user_id) : null;
    const person = o.user_type === 'customer' ? customer : (rep || customer);
    const items = (itemsByOrder[o.id] || []).map(it => {
      const p = state.maps.product.get(it.product_id);
      const c = p ? state.maps.company.get(p.company_id) : null;
      return { ...it, title: it.type === 'product' ? (p?.product_name || it.product_id) : it.type === 'deal' ? `صفقة ${it.product_id}` : `عرض ${it.product_id}`, companyName: c?.company_name || '' };
    });
    return { ...o, customerName: person?.name || '—', customerPhone: person?.phone || '—', customerAddress: person?.address || person?.region || '—', customerLocation: person?.location || '—', items };
  });
  state.topProducts = calcTopProducts();
  state.topCompanies = calcTopCompanies();
  state.topCustomers = calcTopCustomers();
  state.repsPerformance = calcRepsPerformance();
  state.dailySales = calcDailySales();
  state.statusBreakdown = calcStatusBreakdown();
}
function calcTopProducts() {
  const map = new Map();
  state.records.orderItems.filter(x => x.type === 'product').forEach(x => map.set(x.product_id, (map.get(x.product_id) || 0) + Number(x.qty || 0)));
  return [...map.entries()].map(([id, qty]) => {
    const p = state.maps.product.get(id); const c = p ? state.maps.company.get(p.company_id) : null;
    return { id, qty, name: p?.product_name || id, companyName: c?.company_name || '' };
  }).sort((a,b)=>b.qty-a.qty).slice(0,8);
}
function calcTopCompanies() {
  const map = new Map();
  state.records.orderItems.forEach(x => {
    const p = state.maps.product.get(x.product_id); if (!p) return;
    const key = p.company_id; const val = Number(x.price || 0) * Number(x.qty || 0);
    const row = map.get(key) || { companyId:key, name: state.maps.company.get(key)?.company_name || key, value:0, items:0 };
    row.value += val; row.items += Number(x.qty || 0); map.set(key, row);
  });
  return [...map.values()].sort((a,b)=>b.value-a.value).slice(0,8);
}
function calcTopCustomers() {
  const map = new Map();
  state.orders.forEach(o => {
    const key = o.customer_id || o.user_id || o.id;
    const row = map.get(key) || { name:o.customerName, phone:o.customerPhone, total:0, orders:0 };
    row.total += Number(o.total_amount || 0); row.orders += 1; map.set(key, row);
  });
  return [...map.values()].sort((a,b)=>b.total-a.total).slice(0,8);
}
function calcRepsPerformance() {
  const map = new Map();
  state.orders.filter(o => o.user_type === 'rep').forEach(o => {
    const rep = o.user_id ? state.maps.rep.get(o.user_id) : null; const key = o.user_id || o.id;
    const row = map.get(key) || { name: rep?.name || '—', region: rep?.region || '—', total:0, orders:0 };
    row.total += Number(o.total_amount || 0); row.orders += 1; map.set(key, row);
  });
  return [...map.values()].sort((a,b)=>b.total-a.total).slice(0,8);
}
function calcDailySales() {
  const start = state.reportStart ? new Date(state.reportStart) : null;
  const end = state.reportEnd ? new Date(new Date(state.reportEnd).getTime() + 24*60*60*1000 - 1) : null;
  const map = new Map();
  state.orders.forEach(o => {
    const d = new Date(o.created_at); if (start && d < start) return; if (end && d > end) return;
    const key = d.toLocaleDateString('en-GB');
    const row = map.get(key) || { date:key, total:0, orders:0 };
    row.total += Number(o.total_amount || 0); row.orders += 1; map.set(key, row);
  });
  return [...map.values()].sort((a,b)=>new Date(a.date.split('/').reverse().join('-')) - new Date(b.date.split('/').reverse().join('-')));
}
function calcStatusBreakdown() {
  const map = new Map();
  state.orders.forEach(o => {
    const s = o.status || 'draft'; const row = map.get(s) || { status:s, count:0, total:0 };
    row.count += 1; row.total += Number(o.total_amount || 0); map.set(s, row);
  });
  return STATUSES.map(s => map.get(s) || { status:s, count:0, total:0 }).filter(x => x.count > 0 || x.status === 'draft');
}
function apiQuery(name, params={}) { return api(name, { query: params }); }
async function loadData() {
  try {
    const [companies, products, pricesCarton, pricesPack, customers, salesReps, orders, orderItems, vProducts, dailyDeals, flashOffers] = await Promise.all([
      apiQuery('companies', { select:'*', order:'company_name.asc' }),
      apiQuery('products', { select:'*', order:'product_name.asc' }),
      apiQuery('prices_carton', { select:'*', order:'product_id.asc' }),
      apiQuery('prices_pack', { select:'*', order:'product_id.asc' }),
      apiQuery('customers', { select:'id,name,phone,address,location,username,password,created_at', order:'created_at.desc', limit:'500' }),
      apiQuery('sales_reps', { select:'id,name,phone,region,username,password,created_at', order:'created_at.desc', limit:'500' }),
      apiQuery('orders', { select:'*', order:'created_at.desc', limit:'1000' }),
      apiQuery('order_items', { select:'*', order:'created_at.desc', limit:'2000' }),
      apiQuery('v_products', { select:'*', order:'product_name.asc', limit:'1000' }),
      apiQuery('v_daily_deals', { select:'*', order:'id.desc' }),
      apiQuery('v_flash_offers', { select:'*', order:'start_time.desc' }),
    ]);
    state.records = { companies, products, pricesCarton, pricesPack, customers, salesReps, orders, orderItems, vProducts, dailyDeals, flashOffers };
    buildIndex(); enrich(); renderAll(); toast('تم تحميل البيانات');
  } catch (e) { console.error(e); toast('تعذر تحميل البيانات من قاعدة البيانات'); }
}
function renderAll() { renderHome(); renderOrders(); renderUsers(); renderDashUsers(); renderProducts(); renderCompanies(); renderReports(); renderSettings(); renderAuth(); renderSectionText(); }
function renderSectionText() {
  const map = { home:['الرئيسية','مراقبة وإدارة كاملة للنظام'], orders:['الطلبات','عرض الطلبات وتغيير الحالة'], users:['المستخدمون','العملاء والمناديب'], products:['المنتجات','تعديل الاسم والسعر والحالة'], companies:['الشركات','تعديل الشركات والظهور'], reports:['التقارير','تحليلات ومؤشرات تشغيلية'], settings:['الإعدادات','التحكم المحلي والاتصال'] };
  els.pageTitle.textContent = map[state.section][0]; els.pageSub.textContent = map[state.section][1];
  document.querySelectorAll('.section').forEach(sec => sec.classList.toggle('active', sec.dataset.sec === state.section));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.sec === state.section));
}
function activeSearch() { return (state.search || '').trim().toLowerCase(); }
function match(v) { const q = activeSearch(); return !q || String(v ?? '').toLowerCase().includes(q); }
function renderHome() {
  els.statOrders.textContent = int(state.orders.length);
  els.statSales.textContent = money(state.orders.reduce((s,o)=>s+Number(o.total_amount||0),0));
  els.statCustomers.textContent = int(state.records.customers.length);
  els.statProducts.textContent = int(state.records.products.length);
  const latest = state.orders.slice(0,8); els.latestCount.textContent = int(latest.length);
  els.latestOrders.innerHTML = latest.map(o => `<tr><td>${esc(o.order_number)}</td><td>${esc(o.customerName)}</td><td>${money(o.total_amount)}</td><td><span class="status ${statusClass(o.status)}">${esc(o.status || 'draft')}</span></td></tr>`).join('') || `<tr><td colspan="4" class="muted">لا توجد طلبات</td></tr>`;
  els.topProducts.innerHTML = state.topProducts.map(x => `<div class="item"><div><strong>${esc(x.name)}</strong><span>${esc(x.companyName)}</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, x.qty / Math.max(1, state.topProducts[0]?.qty || 1) * 100))}%"></span></div></div><strong>${int(x.qty)}</strong></div>`).join('') || empty();
  els.topCompanies.innerHTML = state.topCompanies.map(x => `<div class="item"><div><strong>${esc(x.name)}</strong><span>${int(x.items)} قطعة</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, x.value / Math.max(1, state.topCompanies[0]?.value || 1) * 100))}%"></span></div></div><strong>${money(x.value)}</strong></div>`).join('') || empty();
  document.getElementById('latestCount').textContent = int(latest.length);
}
function renderOrders() {
  const filter = els.statusFilter.value;
  const rows = state.orders.filter(o => (!filter || o.status === filter) && (match(o.order_number) || match(o.customerName) || match(o.customerPhone)));
  els.ordersBody.innerHTML = rows.map(o => `<tr><td>${esc(o.order_number)}</td><td>${esc(o.customerName)}</td><td>${esc(o.customerPhone)}</td><td>${money(o.total_amount)}</td><td><span class="status ${statusClass(o.status)}">${esc(o.status || 'draft')}</span></td><td>${dateStr(o.created_at)}</td><td><div class="actions"><button class="ghost" data-act="view-order" data-id="${esc(o.id)}">تفاصيل</button>${canChangeStatus() ? `<button class="primary" data-act="order-status" data-id="${esc(o.id)}">تغيير الحالة</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="7" class="muted">لا توجد طلبات مطابقة</td></tr>`;
}
function renderUsers() {
  const source = state.tab === 'customers' ? state.records.customers : state.records.salesReps;
  const rows = source.filter(u => match(u.name) || match(u.phone) || match(u.username) || match(u.address) || match(u.region) || match(u.location));
  els.usersBody.innerHTML = rows.map(u => `<tr><td>${esc(u.name || '')}</td><td>${esc(u.phone || '')}</td><td>${esc(u.address || u.region || '')}</td><td>${esc(u.location || '')}</td><td>${esc(u.username || '')}</td><td><div class="actions"><button class="ghost" data-act="view-user" data-type="${state.tab}" data-id="${esc(u.id)}">عرض</button>${canEditAll() ? `<button class="primary" data-act="edit-user" data-type="${state.tab}" data-id="${esc(u.id)}">تعديل</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="6" class="muted">لا توجد بيانات مطابقة</td></tr>`;
}
function renderDashUsers() {
  els.dashUsersBody.innerHTML = state.dashUsers.map((u,i)=>`<tr><td>${esc(u.username)}</td><td>${esc(u.role)}</td><td><span class="status ${u.active ? 'good' : 'bad'}">${u.active ? 'active' : 'disabled'}</span></td><td><div class="actions"><button class="ghost" data-act="toggle-dash-user" data-i="${i}">${u.active ? 'تعطيل' : 'تفعيل'}</button>${canEditAll() ? `<button class="primary" data-act="delete-dash-user" data-i="${i}">حذف</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="4" class="muted">لا توجد حسابات</td></tr>`;
  document.querySelectorAll('.admin-only').forEach(el => el.dataset.hidden = canEditAll() ? '0' : '1');
}
function renderProducts() {
  const rows = state.records.vProducts.filter(p => match(p.product_name) || match(p.company_id) || match(state.maps.company.get(p.company_id)?.company_name) || match(p.product_id));
  els.productsBody.innerHTML = rows.map(p => `<tr><td>${esc(p.product_name)}</td><td>${esc(state.maps.company.get(p.company_id)?.company_name || '—')}</td><td>${money(p.carton_price)}</td><td>${money(p.pack_price)}</td><td><span class="status ${p.status === 'active' ? 'good' : 'bad'}">${esc(p.status || '')}</span></td><td><span class="status ${p.visible ? 'good' : 'bad'}">${p.visible ? 'visible' : 'hidden'}</span></td><td><div class="actions">${canEditAll() ? `<button class="primary" data-act="edit-product" data-id="${esc(p.product_id)}">تعديل</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="7" class="muted">لا توجد منتجات مطابقة</td></tr>`;
}
function renderCompanies() {
  const rows = state.records.companies.filter(c => match(c.company_name) || match(c.company_id));
  els.companiesBody.innerHTML = rows.map(c => `<tr><td>${esc(c.company_name)}</td><td><img class="company-thumb" src="${esc(c.company_logo || svgPlaceholder(c.company_name))}" alt="${esc(c.company_name)}" /></td><td><span class="status ${c.visible ? 'good' : 'bad'}">${c.visible ? 'visible' : 'hidden'}</span></td><td><span class="status ${c.allow_discount ? 'good' : 'bad'}">${c.allow_discount ? 'allow' : 'no'}</span></td><td><div class="actions">${canEditAll() ? `<button class="primary" data-act="edit-company" data-id="${esc(c.company_id)}">تعديل</button>` : ''}</div></td></tr>`).join('') || `<tr><td colspan="5" class="muted">لا توجد شركات مطابقة</td></tr>`;
}
function renderReports() {
  const totalSales = state.orders.reduce((s,o)=>s+Number(o.total_amount||0),0);
  els.salesRange.textContent = money(totalSales);
  els.statusTotal.textContent = int(state.orders.length);
  els.dailySales.innerHTML = state.dailySales.map(r => `<div class="item"><div><strong>${esc(r.date)}</strong><span>${int(r.orders)} طلب</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, r.total / Math.max(1, totalSales || 1) * 100))}%"></span></div></div><strong>${money(r.total)}</strong></div>`).join('') || empty('لا يوجد نطاق بيانات');
  els.statusBreakdown.innerHTML = state.statusBreakdown.map(r => `<div class="item"><div><strong>${esc(r.status)}</strong><span>${int(r.count)} طلب</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, r.count / Math.max(1, state.orders.length || 1) * 100))}%"></span></div></div><strong>${money(r.total)}</strong></div>`).join('') || empty('لا توجد حالات');
  els.topCustomers.innerHTML = state.topCustomers.map(r => `<div class="item"><div><strong>${esc(r.name)}</strong><span>${esc(r.phone || '')} · ${int(r.orders)} طلب</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, r.total / Math.max(1, state.topCustomers[0]?.total || 1) * 100))}%"></span></div></div><strong>${money(r.total)}</strong></div>`).join('') || empty('لا توجد بيانات');
  els.repPerformance.innerHTML = state.repsPerformance.map(r => `<div class="item"><div><strong>${esc(r.name)}</strong><span>${esc(r.region)} · ${int(r.orders)} طلب</span><div class="progress"><span style="width:${Math.min(100, Math.max(10, r.total / Math.max(1, state.repsPerformance[0]?.total || 1) * 100))}%"></span></div></div><strong>${money(r.total)}</strong></div>`).join('') || empty('لا توجد بيانات');
}
function renderSettings() { els.waInput.value = localStorage.getItem('support_whatsapp') || CONFIG.whatsapp || ''; }
function empty(msg='لا توجد بيانات') { return `<div class="item"><div><strong>${esc(msg)}</strong><span>—</span></div><strong>—</strong></div>`; }
function statusClass(s) { if (['paid','delivered','confirmed'].includes(s)) return 'good'; if (['processing','shipped'].includes(s)) return 'warn'; return 'bad'; }
function openOrder(order) {
  els.detailsTitle.textContent = `تفاصيل الطلب ${order.order_number}`;
  els.detailsSub.textContent = `${order.customerName} · ${dateStr(order.created_at)}`;
  const statusHtml = canChangeStatus() ? `<label class="field"><span>تغيير الحالة</span><select id="orderStatusSel">${STATUSES.map(s => `<option value="${s}" ${s === (order.status || 'draft') ? 'selected' : ''}>${s}</option>`).join('')}</select></label><button id="saveOrderStatus" class="primary">حفظ الحالة</button>` : `<div class="card"><strong>صلاحية قراءة فقط</strong><div class="muted">هذا الدور لا يسمح بتغيير الحالة</div></div>`;
  els.detailsBody.innerHTML = `<div class="card"><div class="row"><strong>رقم الطلب</strong><span>${esc(order.order_number)}</span></div><div class="row"><strong>العميل</strong><span>${esc(order.customerName)}</span></div><div class="row"><strong>الهاتف</strong><span>${esc(order.customerPhone)}</span></div><div class="row"><strong>العنوان</strong><span>${esc(order.customerAddress)}</span></div><div class="row"><strong>القيمة</strong><span>${money(order.total_amount)}</span></div><div class="row"><strong>الحالة</strong><span class="status ${statusClass(order.status)}">${esc(order.status || 'draft')}</span></div></div><div class="card"><strong>العناصر</strong><div class="list" style="margin-top:10px">${order.items.map(it => `<div class="row"><div><strong>${esc(it.title)}</strong><span>${esc(it.type)} · ${esc(it.unit || 'single')}</span></div><div>${int(it.qty)} × ${money(it.price)}</div></div>`).join('') || '<div class="muted">لا توجد عناصر</div>'}</div></div><div class="card">${statusHtml}</div>`;
  showModal('detailsModal', true);
  const btn = document.getElementById('saveOrderStatus');
  if (btn) btn.onclick = async () => {
    try { await api(`orders?id=eq.${encodeURIComponent(order.id)}`, { method:'PATCH', body:{ status: document.getElementById('orderStatusSel').value } }); toast('تم تحديث حالة الطلب'); showModal('detailsModal', false); await loadData(); } catch (e) { console.error(e); toast('تعذر تحديث الحالة'); }
  };
}
function openUser(kind, row) {
  els.detailsTitle.textContent = kind === 'customers' ? 'تفاصيل العميل' : 'تفاصيل المندوب';
  els.detailsSub.textContent = row.name || '';
  els.detailsBody.innerHTML = `<div class="card"><div class="row"><strong>الاسم</strong><span>${esc(row.name || '')}</span></div><div class="row"><strong>الهاتف</strong><span>${esc(row.phone || '')}</span></div><div class="row"><strong>العنوان</strong><span>${esc(row.address || row.region || '')}</span></div><div class="row"><strong>اللوكيشن</strong><span>${esc(row.location || '—')}</span></div><div class="row"><strong>اسم المستخدم</strong><span>${esc(row.username || '—')}</span></div></div>`;
  showModal('detailsModal', true);
}
function openEdit(kind, row) {
  if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط');
  state.edit = { kind, row };
  els.editTitle.textContent = kind === 'customer' ? 'تعديل عميل' : kind === 'sales_rep' ? 'تعديل مندوب' : kind === 'product' ? 'تعديل منتج' : 'تعديل شركة';
  els.editSub.textContent = row.name || row.company_name || row.product_name || row.username || '';
  els.editForm.innerHTML = '';
  const fields = [];
  if (kind === 'customer') fields.push(['name','الاسم',row.name||''],['phone','رقم الهاتف',row.phone||''],['address','العنوان',row.address||''],['location','اللوكيشن',row.location||''],['password','كلمة المرور',row.password||'']);
  if (kind === 'sales_rep') fields.push(['name','الاسم',row.name||''],['phone','رقم الهاتف',row.phone||''],['region','المنطقة / العنوان',row.region||''],['username','اسم المستخدم',row.username||''],['password','كلمة المرور',row.password||'']);
  if (kind === 'product') {
    const cp = state.maps.carton.get(`${row.product_id}::base`); const pp = state.maps.pack.get(`${row.product_id}::base`);
    fields.push(['product_name','اسم المنتج',row.product_name||''],['status','الحالة',row.status||'active',['active','inactive']],['visible','الظهور',String(!!row.visible),['true','false']],['carton_price','سعر الكرتون',cp?.price ?? row.carton_price ?? 0],['pack_price','سعر القطعة',pp?.price ?? row.pack_price ?? 0]);
  }
  if (kind === 'company') fields.push(['company_name','اسم الشركة',row.company_name||''],['company_logo','رابط اللوجو',row.company_logo||''],['visible','الظهور',String(!!row.visible),['true','false']],['allow_discount','تفعيل الخصم',String(!!row.allow_discount),['true','false']]);
  fields.forEach(f => {
    const [name,label,val,opts] = f; const wrap = document.createElement('label'); wrap.className = 'field'; wrap.innerHTML = `<span>${label}</span>`;
    let input;
    if (Array.isArray(opts)) { input = document.createElement('select'); input.name = name; opts.forEach(o => { const op = document.createElement('option'); op.value = o; op.textContent = o; if (o === String(val)) op.selected = true; input.appendChild(op); }); }
    else { input = document.createElement('input'); input.name = name; input.value = val ?? ''; input.type = name.includes('price') ? 'number' : 'text'; if (name.includes('price')) input.step = '0.01'; }
    wrap.appendChild(input); els.editForm.appendChild(wrap);
  });
  showModal('editModal', true);
}
async function saveEdit() {
  if (!state.edit) return;
  if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط');
  const fd = new FormData(els.editForm); const d = Object.fromEntries(fd.entries()); const { kind, row } = state.edit;
  try {
    if (kind === 'customer') {
      await api(`customers?id=eq.${encodeURIComponent(row.id)}`, { method:'PATCH', body:{ name:d.name?.trim(), phone:d.phone?.trim(), address:d.address?.trim(), location:d.location?.trim(), password:d.password?.trim() } });
    } else if (kind === 'sales_rep') {
      await api(`sales_reps?id=eq.${encodeURIComponent(row.id)}`, { method:'PATCH', body:{ name:d.name?.trim(), phone:d.phone?.trim(), region:d.region?.trim(), username:d.username?.trim(), password:d.password?.trim() } });
    } else if (kind === 'product') {
      await api(`products?product_id=eq.${encodeURIComponent(row.product_id)}`, { method:'PATCH', body:{ product_name:d.product_name?.trim(), status:d.status, visible:d.visible === 'true' } });
      await api(`prices_carton?product_id=eq.${encodeURIComponent(row.product_id)}&tier_name=eq.base`, { method:'PATCH', body:{ price:Number(d.carton_price || 0), visible:true } }).catch(()=>{});
      await api(`prices_pack?product_id=eq.${encodeURIComponent(row.product_id)}&tier_name=eq.base`, { method:'PATCH', body:{ price:Number(d.pack_price || 0), visible:true } }).catch(()=>{});
    } else if (kind === 'company') {
      await api(`companies?company_id=eq.${encodeURIComponent(row.company_id)}`, { method:'PATCH', body:{ company_name:d.company_name?.trim(), company_logo:d.company_logo?.trim(), visible:d.visible === 'true', allow_discount:d.allow_discount === 'true' } });
    }
    showModal('editModal', false); state.edit = null; toast('تم الحفظ'); await loadData();
  } catch (e) { console.error(e); toast('تعذر الحفظ'); }
}
function renderSettings() { els.waInput.value = localStorage.getItem('support_whatsapp') || CONFIG.whatsapp; }
function saveWa() { localStorage.setItem('support_whatsapp', els.waInput.value.trim()); CONFIG.whatsapp = localStorage.getItem('support_whatsapp') || CONFIG.whatsapp; toast('تم حفظ الرقم'); }
function addDashUser() { if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط'); showModal('dashUserModal', true); els.dashUserForm.reset(); }
function createDashUser() { if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط'); const fd = new FormData(els.dashUserForm); const d = Object.fromEntries(fd.entries()); const username = String(d.username || '').trim(); if (!username || !d.name || !d.password) return toast('أكمل البيانات'); if (state.dashUsers.some(u => u.username === username)) return toast('اسم المستخدم موجود'); state.dashUsers.push({ username, name: String(d.name).trim(), password: String(d.password).trim(), role: String(d.role || 'viewer'), active: true }); saveJSON('dashboard_users_v1', state.dashUsers); renderDashUsers(); showModal('dashUserModal', false); toast('تمت الإضافة'); }
function toggleDashUser(i) { if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط'); const u = state.dashUsers[i]; if (!u) return; u.active = !u.active; saveJSON('dashboard_users_v1', state.dashUsers); renderDashUsers(); }
function deleteDashUser(i) { if (!canEditAll()) return toast('هذه الصلاحية للـ admin فقط'); const u = state.dashUsers[i]; if (!u) return; if (!confirm(`حذف ${u.username}؟`)) return; state.dashUsers.splice(i,1); saveJSON('dashboard_users_v1', state.dashUsers); renderDashUsers(); }
function bind() {
  document.addEventListener('click', (e) => {
    const close = e.target.closest('[data-close]')?.dataset.close; if (close) showModal(close, false);
    const nav = e.target.closest('.nav-btn'); if (nav) { setSection(nav.dataset.sec); if (window.innerWidth <= 900) document.body.classList.remove('sidebar-open'); }
    const tab = e.target.closest('.tab'); if (tab) { state.tab = tab.dataset.tab; document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.tab)); renderUsers(); }
    const act = e.target.closest('[data-act]'); if (!act) return;
    const a = act.dataset.act;
    const id = act.dataset.id; const type = act.dataset.type; const i = Number(act.dataset.i);
    if (a === 'view-order' || a === 'order-status') { const o = state.orders.find(x => x.id === id); if (o) openOrder(o); }
    else if (a === 'view-user') { const row = type === 'customers' ? state.records.customers.find(x => x.id === id) : state.records.salesReps.find(x => x.id === id); if (row) openUser(type, row); }
    else if (a === 'edit-user') openEdit(type === 'customers' ? 'customer' : 'sales_rep', type === 'customers' ? state.records.customers.find(x => x.id === id) : state.records.salesReps.find(x => x.id === id));
    else if (a === 'edit-product') openEdit('product', state.records.vProducts.find(x => x.product_id === id));
    else if (a === 'edit-company') openEdit('company', state.records.companies.find(x => x.company_id === id));
    else if (a === 'toggle-dash-user') toggleDashUser(i);
    else if (a === 'delete-dash-user') deleteDashUser(i);
  });
  els.menuBtn.onclick = () => document.body.classList.toggle('sidebar-open');
  els.backdrop.onclick = () => document.body.classList.remove('sidebar-open');
  els.logoutBtn.onclick = logout;
  els.refreshBtn.onclick = loadData;
  els.globalSearch.oninput = () => { state.search = els.globalSearch.value.trim(); renderAll(); };
  els.clearSearch.onclick = () => { els.globalSearch.value = ''; state.search = ''; renderAll(); };
  els.loginBtn.onclick = login;
  els.loginPass.onkeydown = e => { if (e.key === 'Enter') login(); };
  els.statusFilter.onchange = renderOrders;
  els.applyFilter.onclick = () => { state.reportStart = els.startDate.value; state.reportEnd = els.endDate.value; enrich(); renderReports(); };
  els.saveWa.onclick = saveWa;
  els.addDashUser.onclick = addDashUser;
  els.createDashUser.onclick = createDashUser;
  els.saveEdit.onclick = saveEdit;
}
function renderSectionText() {
  setSection(state.section);
}
function initDates() {
  const now = new Date(); const week = new Date(now.getTime() - 6*24*60*60*1000);
  els.endDate.value = now.toISOString().slice(0,10); els.startDate.value = week.toISOString().slice(0,10); state.reportStart = els.startDate.value; state.reportEnd = els.endDate.value;
}
function init() {
  seedUsers(); bind(); initDates(); renderAuth(); renderSettings(); renderDashUsers(); setSection('home');
  loadData();
}
window.addEventListener('keydown', e => { if (e.key === 'Escape') { showModal('editModal', false); showModal('detailsModal', false); showModal('dashUserModal', false); document.body.classList.remove('sidebar-open'); } });
window.addEventListener('hashchange', () => {});
init();
