const SUPABASE_URL = 'https://gbcywubyovaxsezycdim.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FDLC2zLQ1tRQI6YeL06-hg_qlK3nEWH';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// =============================================================
// BASE DE DATOS
// =============================================================

async function dbGet(tabla) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*&order=created_at.desc`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbInsert(tabla, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
    method: 'POST', headers: HEADERS, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbUpdate(tabla, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
    method: 'PATCH', headers: HEADERS, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
}

async function dbDelete(tabla, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
    method: 'DELETE', headers: HEADERS,
  });
  if (!res.ok) throw new Error(await res.text());
}

// =============================================================
// NAVEGACIÓN Y MODALES
// =============================================================

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function openModal(id) {
  const today = new Date().toISOString().split('T')[0];
  const fechaFields = ['pago-fecha','gasto-fecha','nonna-fecha'];
  fechaFields.forEach(f => { const el = document.getElementById(f); if(el) el.value = today; });
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  // Reset edit state
  const forms = { 'modal-pago': 'form-pago', 'modal-gasto': 'form-gasto', 'modal-nonna': 'form-nonna' };
  const formId = forms[id];
  if (formId) {
    const form = document.getElementById(formId);
    if (form) {
      delete form.dataset.editId;
      form.reset();
    }
  }
  const headers = {
    'modal-pago': ['Registrar Pago', 'form-pago'],
    'modal-gasto': ['Registrar Gasto', 'form-gasto'],
    'modal-nonna': ['Registrar Gasto — Casa Nonna', 'form-nonna'],
  };
  if (headers[id]) {
    const h = document.querySelector(`#${id} .modal-header h3`);
    const btn = document.querySelector(`#${headers[id][1]} button[type="submit"]`);
    if (h) h.textContent = headers[id][0];
    if (btn) btn.textContent = 'Guardar';
  }
}

function closeModalOutside(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

// =============================================================
// HELPERS DE MONEDA
// =============================================================

function toggleMetodoPago(valor, prefix) {
  const bsFields   = document.getElementById(`${prefix}-campos-bs`);
  const mixFields  = document.getElementById(`${prefix}-campos-mix`);
  if (bsFields)  bsFields.style.display  = valor === 'Bolívares' ? 'block' : 'none';
  if (mixFields) mixFields.style.display = valor === 'Mixto'     ? 'block' : 'none';
  calcularBsGeneric(prefix);
}

function calcularBsGeneric(prefix) {
  const monto = parseFloat(document.getElementById(`${prefix}-monto`)?.value) || 0;
  const tasa  = parseFloat(document.getElementById(`${prefix}-tasa`)?.value)  || 0;
  const resEl = document.getElementById(`${prefix}-resultado-bs`);
  if (resEl) resEl.textContent = 'Bs ' + (monto * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Mixto
  const montoMixBs = parseFloat(document.getElementById(`${prefix}-mix-monto-bs`)?.value) || 0;
  const tasaMix    = parseFloat(document.getElementById(`${prefix}-mix-tasa`)?.value)      || 0;
  const resMixEl   = document.getElementById(`${prefix}-mix-resultado`);
  if (resMixEl) resMixEl.textContent = 'Bs ' + (montoMixBs * tasaMix).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onTipoTasaChangeGeneric(valor, prefix) {
  const inputTasa = document.getElementById(`${prefix}-tasa`);
  if (valor === 'Tasa personalizada' && inputTasa) { inputTasa.value = ''; inputTasa.focus(); }
}

function getMetodoData(prefix) {
  const metodo = document.querySelector(`input[name="${prefix}-metodo"]:checked`)?.value || 'Zelle';
  let monto = parseFloat(document.getElementById(`${prefix}-monto`)?.value) || 0;
  let tasa = null, tipoTasa = null, montoBs = null;
  let montoMixUsd = null, montoMixBs = null, tasaMix = null, montoBsConvertido = null;

  if (metodo === 'Bolívares') {
    tasa     = parseFloat(document.getElementById(`${prefix}-tasa`)?.value) || null;
    tipoTasa = document.getElementById(`${prefix}-tipo-tasa`)?.value || null;
    montoBs  = tasa ? monto * tasa : null;
  } else if (metodo === 'Mixto') {
    montoMixUsd      = parseFloat(document.getElementById(`${prefix}-mix-monto-usd`)?.value) || 0;
    montoMixBs       = parseFloat(document.getElementById(`${prefix}-mix-monto-bs`)?.value)  || 0;
    tasaMix          = parseFloat(document.getElementById(`${prefix}-mix-tasa`)?.value)       || null;
    montoBsConvertido = tasaMix ? montoMixBs * tasaMix : null;
    monto = montoMixUsd;
  }

  return { metodo, monto, tasa, tipo_tasa: tipoTasa, monto_bs: montoBs, monto_mix_usd: montoMixUsd, monto_mix_bs: montoMixBs, tasa_mix: tasaMix, monto_bs_convertido: montoBsConvertido };
}

function formatMoney(amount) {
  if (!amount && amount !== 0) return '-';
  return '$' + Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function badgeEstado(estado) {
  if (!estado) return '<span class="badge badge-red">No pagado</span>';
  const clases = { 'Pagado': 'badge-green', 'No pagado': 'badge-red' };
  return `<span class="badge ${clases[estado] || 'badge-red'}">${estado}</span>`;
}

function badgeMetodo(metodo) {
  const clases = { 'Zelle': 'badge-blue', 'Bolívares': 'badge-yellow', 'Mixto': 'badge-purple' };
  return `<span class="badge ${clases[metodo] || 'badge-blue'}">${metodo || 'Zelle'}</span>`;
}

function formatMontoTabla(row) {
  if (row.metodo === 'Bolívares') {
    return `${formatMoney(row.monto)}<br><small style="color:#64748b">Bs ${Number(row.monto_bs||0).toLocaleString('es-VE',{minimumFractionDigits:2})} · Tasa ${row.tasa||''}</small>`;
  }
  if (row.metodo === 'Mixto') {
    const bsConv = row.monto_bs_convertido ? Number(row.monto_bs_convertido).toLocaleString('es-VE',{minimumFractionDigits:2}) : '0,00';
    return `${formatMoney(row.monto_mix_usd)} + <br><small style="color:#64748b">Bs ${Number(row.monto_mix_bs||0).toLocaleString('es-VE',{minimumFractionDigits:2})} = Bs ${bsConv} · Tasa ${row.tasa_mix||''}</small>`;
  }
  return formatMoney(row.monto);
}

// =============================================================
// CUIDADORAS (Casa Nonna)
// =============================================================

let cuidadoras = ['Ángela'];

function renderCuidadoras() {
  const lista = document.getElementById('lista-cuidadoras');
  if (!lista) return;
  lista.innerHTML = cuidadoras.map((c, i) => `
    <div class="cuidadora-item">
      <input type="text" value="${c}" onchange="cuidadoras[${i}] = this.value" class="cuidadora-input" />
      <button type="button" class="btn-eliminar-cuidadora" onclick="eliminarCuidadora(${i})">✕</button>
    </div>
  `).join('');
}

function agregarCuidadora() {
  cuidadoras.push('');
  renderCuidadoras();
  const inputs = document.querySelectorAll('.cuidadora-input');
  if (inputs.length) inputs[inputs.length - 1].focus();
}

function eliminarCuidadora(i) {
  cuidadoras.splice(i, 1);
  renderCuidadoras();
}

// =============================================================
// PAGOS DE INQUILINOS
// =============================================================

let _pagos = [];

async function cargarPagos() {
  const tbody = document.getElementById('tabla-pagos');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="15">Cargando...</td></tr>';
  try {
    _pagos = await dbGet('pagos');
    actualizarResumenPagos(_pagos);
    filtrarPagos();
  } catch (err) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">Error al cargar datos.</td></tr>';
    console.error(err);
  }
}

function filtrarPagos() {
  const busqueda = document.getElementById('filtro-pago-busqueda')?.value.toLowerCase() || '';
  const inmueble = document.getElementById('filtro-pago-inmueble')?.value || '';
  const estado   = document.getElementById('filtro-pago-estado')?.value || '';
  const metodo   = document.getElementById('filtro-pago-metodo')?.value || '';
  const mes      = document.getElementById('filtro-pago-mes')?.value || '';
  const fecha    = document.getElementById('filtro-pago-fecha')?.value || '';

  const filtrados = _pagos.filter(p => {
    if (busqueda && !(p.inquilino||'').toLowerCase().includes(busqueda)) return false;
    if (inmueble && p.inmueble !== inmueble) return false;
    if (estado && p.estado !== estado) return false;
    if (metodo && p.metodo !== metodo) return false;
    if (mes && p.mes !== mes) return false;
    if (fecha && p.fecha !== fecha) return false;
    return true;
  });
  renderPagos(filtrados);
}

function renderPagos(pagos) {
  const tbody = document.getElementById('tabla-pagos');
  if (pagos.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="15">No hay pagos registrados aún.</td></tr>';
    return;
  }
  tbody.innerHTML = pagos.map(p => `
    <tr>
      <td>${p.mes || '-'} ${p.anio || ''}</td>
      <td>${p.inquilino}</td>
      <td>${p.telefono || '-'}</td>
      <td>${p.inmueble}</td>
      <td>${p.canon ? formatMoney(p.canon) : '-'}</td>
      <td>${p.acuerdo_pago || '-'}</td>
      <td>${formatMontoTabla(p)}</td>
      <td>${badgeMetodo(p.metodo)}</td>
      <td>${formatDate(p.fecha)}</td>
      <td>${p.notas || '-'}</td>
      <td>${badgeEstado(p.estado)}</td>
      <td>
        <button class="btn-accion btn-editar" onclick="editarPago(${p.id})">Editar</button>
        <button class="btn-accion btn-eliminar" onclick="eliminarPago(${p.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function actualizarResumenPagos(pagos) {
  const pagosZelle  = pagos.filter(p => p.estado === 'Pagado' && p.metodo !== 'Bolívares');
  const pagosBs     = pagos.filter(p => p.estado === 'Pagado' && p.metodo === 'Bolívares');
  const totalUSD    = pagosZelle.reduce((s, p) => s + (p.monto || 0), 0);
  const totalBs     = pagosBs.reduce((s, p) => s + (p.monto_bs || 0), 0);
  const pagados     = pagos.filter(p => p.estado === 'Pagado').length;
  const pendientes  = pagos.filter(p => p.estado === 'No pagado').length;

  document.getElementById('total-usd').textContent        = formatMoney(totalUSD);
  document.getElementById('total-bs').textContent         = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  document.getElementById('count-pagos').textContent      = pagos.length;
  document.getElementById('count-pagados').textContent    = pagados;
  document.getElementById('count-pendientes').textContent = pendientes;
}

async function registrarPago(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const editId      = e.target.dataset.editId;
  const estadoRadio = document.querySelector('input[name="pago-estado"]:checked');
  const metodoData  = getMetodoData('pago');

  if (metodoData.metodo === 'Bolívares' && !metodoData.tasa) {
    alert('Debes ingresar la tasa de cambio.');
    btn.disabled = false; btn.textContent = editId ? 'Actualizar' : 'Guardar';
    return;
  }

  const data = {
    mes:          document.getElementById('pago-mes').value,
    anio:         document.getElementById('pago-anio').value,
    inquilino:    document.getElementById('pago-inquilino').value.trim(),
    telefono:     document.getElementById('pago-telefono').value.trim(),
    inmueble:     document.getElementById('pago-inmueble').value,
    canon:        parseFloat(document.getElementById('pago-canon').value) || null,
    acuerdo_pago: document.getElementById('pago-acuerdo').value,
    fecha:        document.getElementById('pago-fecha').value,
    estado:       estadoRadio ? estadoRadio.value : 'No pagado',
    notas:        document.getElementById('pago-notas').value.trim(),
    ...metodoData,
  };

  try {
    if (editId) {
      await dbUpdate('pagos', editId, data);
      delete e.target.dataset.editId;
      document.querySelector('#modal-pago .modal-header h3').textContent = 'Registrar Pago';
    } else {
      await dbInsert('pagos', data);
    }
    e.target.reset();
    closeModal('modal-pago');
    await cargarPagos();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

async function editarPago(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pagos?id=eq.${id}&select=*`, { headers: HEADERS });
    const [p] = await res.json();

    document.getElementById('pago-mes').value       = p.mes || '';
    document.getElementById('pago-anio').value      = p.anio || new Date().getFullYear();
    document.getElementById('pago-inquilino').value = p.inquilino;
    document.getElementById('pago-telefono').value  = p.telefono || '';
    document.getElementById('pago-inmueble').value  = p.inmueble;
    document.getElementById('pago-canon').value     = p.canon || '';
    document.getElementById('pago-acuerdo').value   = p.acuerdo_pago || 'Mensual';
    document.getElementById('pago-fecha').value     = p.fecha;
    document.getElementById('pago-notas').value     = p.notas || '';

    const radioMetodo = document.querySelector(`input[name="pago-metodo"][value="${p.metodo || 'Zelle'}"]`);
    if (radioMetodo) { radioMetodo.checked = true; toggleMetodoPago(p.metodo, 'pago'); }

    if (p.metodo === 'Bolívares') {
      document.getElementById('pago-monto').value     = p.monto || '';
      document.getElementById('pago-tasa').value      = p.tasa || '';
      document.getElementById('pago-tipo-tasa').value = p.tipo_tasa || 'BCV dólar';
      calcularBsGeneric('pago');
    } else if (p.metodo === 'Mixto') {
      document.getElementById('pago-mix-monto-usd').value = p.monto_mix_usd || '';
      document.getElementById('pago-mix-monto-bs').value  = p.monto_mix_bs || '';
      document.getElementById('pago-mix-tasa').value      = p.tasa_mix || '';
      calcularBsGeneric('pago');
    } else {
      document.getElementById('pago-monto').value = p.monto || '';
    }

    const radioEstado = document.querySelector(`input[name="pago-estado"][value="${p.estado}"]`);
    if (radioEstado) radioEstado.checked = true;

    document.getElementById('form-pago').dataset.editId = id;
    document.querySelector('#modal-pago .modal-header h3').textContent = 'Editar Pago';
    document.querySelector('#form-pago button[type="submit"]').textContent = 'Actualizar';
    openModal('modal-pago');
  } catch (err) { alert('Error: ' + err.message); }
}

async function eliminarPago(id) {
  if (!confirm('¿Eliminar este pago?')) return;
  try { await dbDelete('pagos', id); await cargarPagos(); }
  catch (err) { alert('Error: ' + err.message); }
}

function limpiarFiltrosPagos() {
  ['filtro-pago-busqueda','filtro-pago-inmueble','filtro-pago-estado','filtro-pago-metodo','filtro-pago-mes','filtro-pago-fecha']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  filtrarPagos();
}

// =============================================================
// GASTOS GENERALES
// =============================================================

let _gastos = [];

async function cargarGastos() {
  const tbody = document.getElementById('tabla-gastos');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Cargando...</td></tr>';
  try {
    _gastos = await dbGet('gastos');
    actualizarResumenGastos(_gastos);
    filtrarGastos();
  } catch (err) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Error al cargar datos.</td></tr>';
    console.error(err);
  }
}

function filtrarGastos() {
  const busqueda  = document.getElementById('filtro-gasto-busqueda')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filtro-gasto-categoria')?.value || '';
  const estado    = document.getElementById('filtro-gasto-estado')?.value || '';
  const metodo    = document.getElementById('filtro-gasto-metodo')?.value || '';
  const mes       = document.getElementById('filtro-gasto-mes')?.value || '';
  const fecha     = document.getElementById('filtro-gasto-fecha')?.value || '';

  const filtrados = _gastos.filter(g => {
    if (busqueda && !(g.nombre||'').toLowerCase().includes(busqueda)) return false;
    if (categoria && g.categoria !== categoria) return false;
    if (estado && g.estado !== estado) return false;
    if (metodo && g.metodo !== metodo) return false;
    if (mes && g.mes !== mes) return false;
    if (fecha && g.fecha !== fecha) return false;
    return true;
  });
  renderGastos(filtrados);
}

function renderGastos(gastos) {
  const tbody = document.getElementById('tabla-gastos');
  if (gastos.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No hay gastos registrados aún.</td></tr>';
    return;
  }
  tbody.innerHTML = gastos.map(g => `
    <tr>
      <td>${g.mes || '-'} ${g.anio || ''}</td>
      <td>${g.nombre || '-'}</td>
      <td>${g.descripcion || '-'}</td>
      <td><span class="badge badge-blue">${g.categoria}</span></td>
      <td>${formatMontoTabla(g)}</td>
      <td>${badgeMetodo(g.metodo)}</td>
      <td>${formatDate(g.fecha)}</td>
      <td>${g.notas || '-'}</td>
      <td>${badgeEstado(g.estado)}</td>
      <td>
        <button class="btn-accion btn-editar" onclick="editarGasto(${g.id})">Editar</button>
        <button class="btn-accion btn-eliminar" onclick="eliminarGasto(${g.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function actualizarResumenGastos(gastos) {
  const gastosUSD  = gastos.filter(g => g.metodo !== 'Bolívares');
  const gastosBs   = gastos.filter(g => g.metodo === 'Bolívares');
  const totalUSD   = gastosUSD.reduce((s, g) => s + (g.monto || 0), 0);
  const totalBs    = gastosBs.reduce((s, g) => s + (g.monto_bs || 0), 0);
  const realizados = gastos.filter(g => g.estado === 'Pagado').length;
  const pendientes = gastos.filter(g => g.estado === 'No pagado').length;

  document.getElementById('total-gastado-usd').textContent       = formatMoney(totalUSD);
  document.getElementById('total-gastado-bs').textContent        = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  document.getElementById('count-gastos').textContent            = gastos.length;
  document.getElementById('count-gastos-pagados').textContent    = realizados;
  document.getElementById('count-gastos-pendientes').textContent = pendientes;
}

async function registrarGasto(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const editId     = e.target.dataset.editId;
  const estadoRadio = document.querySelector('input[name="gasto-estado"]:checked');
  const metodoData  = getMetodoData('gasto');

  if (metodoData.metodo === 'Bolívares' && !metodoData.tasa) {
    alert('Debes ingresar la tasa de cambio.');
    btn.disabled = false; btn.textContent = editId ? 'Actualizar' : 'Guardar';
    return;
  }

  const data = {
    mes:         document.getElementById('gasto-mes').value,
    anio:        document.getElementById('gasto-anio').value,
    nombre:      document.getElementById('gasto-nombre').value.trim(),
    descripcion: document.getElementById('gasto-descripcion').value.trim(),
    categoria:   document.getElementById('gasto-categoria').value,
    fecha:       document.getElementById('gasto-fecha').value,
    estado:      estadoRadio ? estadoRadio.value : 'No pagado',
    notas:       document.getElementById('gasto-notas').value.trim(),
    ...metodoData,
  };

  try {
    if (editId) {
      await dbUpdate('gastos', editId, data);
      delete e.target.dataset.editId;
    } else {
      await dbInsert('gastos', data);
    }
    e.target.reset();
    closeModal('modal-gasto');
    await cargarGastos();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

async function editarGasto(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}&select=*`, { headers: HEADERS });
    const [g] = await res.json();

    document.getElementById('gasto-mes').value         = g.mes || '';
    document.getElementById('gasto-anio').value        = g.anio || new Date().getFullYear();
    document.getElementById('gasto-nombre').value      = g.nombre || '';
    document.getElementById('gasto-descripcion').value = g.descripcion || '';
    document.getElementById('gasto-categoria').value   = g.categoria;
    document.getElementById('gasto-fecha').value       = g.fecha;
    document.getElementById('gasto-notas').value       = g.notas || '';

    const radioMetodo = document.querySelector(`input[name="gasto-metodo"][value="${g.metodo || 'Zelle'}"]`);
    if (radioMetodo) { radioMetodo.checked = true; toggleMetodoPago(g.metodo, 'gasto'); }

    if (g.metodo === 'Bolívares') {
      document.getElementById('gasto-monto').value     = g.monto || '';
      document.getElementById('gasto-tasa').value      = g.tasa || '';
      document.getElementById('gasto-tipo-tasa').value = g.tipo_tasa || 'BCV dólar';
    } else if (g.metodo === 'Mixto') {
      document.getElementById('gasto-mix-monto-usd').value = g.monto_mix_usd || '';
      document.getElementById('gasto-mix-monto-bs').value  = g.monto_mix_bs || '';
      document.getElementById('gasto-mix-tasa').value      = g.tasa_mix || '';
    } else {
      document.getElementById('gasto-monto').value = g.monto || '';
    }

    const radioEstado = document.querySelector(`input[name="gasto-estado"][value="${g.estado}"]`);
    if (radioEstado) radioEstado.checked = true;

    document.getElementById('form-gasto').dataset.editId = id;
    document.querySelector('#modal-gasto .modal-header h3').textContent = 'Editar Gasto';
    document.querySelector('#form-gasto button[type="submit"]').textContent = 'Actualizar';
    openModal('modal-gasto');
  } catch (err) { alert('Error: ' + err.message); }
}

async function eliminarGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try { await dbDelete('gastos', id); await cargarGastos(); }
  catch (err) { alert('Error: ' + err.message); }
}

function limpiarFiltrosGastos() {
  ['filtro-gasto-busqueda','filtro-gasto-categoria','filtro-gasto-estado','filtro-gasto-metodo','filtro-gasto-mes','filtro-gasto-fecha']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  filtrarGastos();
}

// =============================================================
// CASA NONNA
// =============================================================

let _nonna = [];

async function cargarNonna() {
  const tbody = document.getElementById('tabla-nonna');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Cargando...</td></tr>';
  try {
    _nonna = await dbGet('gastos_nonna');
    actualizarResumenNonna(_nonna);
    filtrarNonna();
  } catch (err) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">Error al cargar datos.</td></tr>';
    console.error(err);
  }
}

function filtrarNonna() {
  const busqueda  = document.getElementById('filtro-nonna-busqueda')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filtro-nonna-categoria')?.value || '';
  const estado    = document.getElementById('filtro-nonna-estado')?.value || '';
  const metodo    = document.getElementById('filtro-nonna-metodo')?.value || '';
  const mes       = document.getElementById('filtro-nonna-mes')?.value || '';
  const fecha     = document.getElementById('filtro-nonna-fecha')?.value || '';

  const filtrados = _nonna.filter(n => {
    if (busqueda && !(n.nombre||'').toLowerCase().includes(busqueda)) return false;
    if (categoria && n.categoria !== categoria) return false;
    if (estado && n.estado !== estado) return false;
    if (metodo && n.metodo !== metodo) return false;
    if (mes && n.mes !== mes) return false;
    if (fecha && n.fecha !== fecha) return false;
    return true;
  });
  renderNonna(filtrados);
}

function renderNonna(items) {
  const tbody = document.getElementById('tabla-nonna');
  if (items.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No hay gastos registrados aún.</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(n => `
    <tr>
      <td>${n.mes || '-'} ${n.anio || ''}</td>
      <td>${n.nombre || '-'}</td>
      <td>${n.descripcion || '-'}</td>
      <td><span class="badge badge-purple">${n.categoria}</span></td>
      <td>${formatMontoTabla(n)}</td>
      <td>${badgeMetodo(n.metodo)}</td>
      <td>${formatDate(n.fecha)}</td>
      <td>${n.notas || '-'}</td>
      <td>${badgeEstado(n.estado)}</td>
      <td>
        <button class="btn-accion btn-editar" onclick="editarNonna(${n.id})">Editar</button>
        <button class="btn-accion btn-eliminar" onclick="eliminarNonna(${n.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function actualizarResumenNonna(items) {
  const usd      = items.filter(n => n.metodo !== 'Bolívares');
  const bs       = items.filter(n => n.metodo === 'Bolívares');
  const totalUSD = usd.reduce((s, n) => s + (n.monto || 0), 0);
  const totalBs  = bs.reduce((s, n) => s + (n.monto_bs || 0), 0);
  const realizados = items.filter(n => n.estado === 'Pagado').length;
  const pendientes = items.filter(n => n.estado === 'No pagado').length;

  document.getElementById('total-nonna-usd').textContent        = formatMoney(totalUSD);
  document.getElementById('total-nonna-bs').textContent         = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 });
  document.getElementById('count-nonna').textContent            = items.length;
  document.getElementById('count-nonna-pagados').textContent    = realizados;
  document.getElementById('count-nonna-pendientes').textContent = pendientes;
}

async function registrarNonna(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Guardando...';

  const editId      = e.target.dataset.editId;
  const estadoRadio = document.querySelector('input[name="nonna-estado"]:checked');
  const metodoData  = getMetodoData('nonna');

  if (metodoData.metodo === 'Bolívares' && !metodoData.tasa) {
    alert('Debes ingresar la tasa de cambio.');
    btn.disabled = false; btn.textContent = editId ? 'Actualizar' : 'Guardar';
    return;
  }

  const data = {
    mes:         document.getElementById('nonna-mes').value,
    anio:        document.getElementById('nonna-anio').value,
    nombre:      document.getElementById('nonna-nombre').value.trim(),
    descripcion: document.getElementById('nonna-descripcion').value.trim(),
    categoria:   document.getElementById('nonna-categoria').value,
    fecha:       document.getElementById('nonna-fecha').value,
    estado:      estadoRadio ? estadoRadio.value : 'No pagado',
    notas:       document.getElementById('nonna-notas').value.trim(),
    ...metodoData,
  };

  try {
    if (editId) {
      await dbUpdate('gastos_nonna', editId, data);
      delete e.target.dataset.editId;
    } else {
      await dbInsert('gastos_nonna', data);
    }
    e.target.reset();
    closeModal('modal-nonna');
    await cargarNonna();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar';
  }
}

async function editarNonna(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos_nonna?id=eq.${id}&select=*`, { headers: HEADERS });
    const [n] = await res.json();

    document.getElementById('nonna-mes').value         = n.mes || '';
    document.getElementById('nonna-anio').value        = n.anio || new Date().getFullYear();
    document.getElementById('nonna-nombre').value      = n.nombre || '';
    document.getElementById('nonna-descripcion').value = n.descripcion || '';
    document.getElementById('nonna-categoria').value   = n.categoria;
    document.getElementById('nonna-fecha').value       = n.fecha;
    document.getElementById('nonna-notas').value       = n.notas || '';

    const radioMetodo = document.querySelector(`input[name="nonna-metodo"][value="${n.metodo || 'Zelle'}"]`);
    if (radioMetodo) { radioMetodo.checked = true; toggleMetodoPago(n.metodo, 'nonna'); }

    if (n.metodo === 'Bolívares') {
      document.getElementById('nonna-monto').value     = n.monto || '';
      document.getElementById('nonna-tasa').value      = n.tasa || '';
      document.getElementById('nonna-tipo-tasa').value = n.tipo_tasa || 'BCV dólar';
    } else if (n.metodo === 'Mixto') {
      document.getElementById('nonna-mix-monto-usd').value = n.monto_mix_usd || '';
      document.getElementById('nonna-mix-monto-bs').value  = n.monto_mix_bs || '';
      document.getElementById('nonna-mix-tasa').value      = n.tasa_mix || '';
    } else {
      document.getElementById('nonna-monto').value = n.monto || '';
    }

    const radioEstado = document.querySelector(`input[name="nonna-estado"][value="${n.estado}"]`);
    if (radioEstado) radioEstado.checked = true;

    document.getElementById('form-nonna').dataset.editId = id;
    document.querySelector('#modal-nonna .modal-header h3').textContent = 'Editar Gasto — Casa Nonna';
    document.querySelector('#form-nonna button[type="submit"]').textContent = 'Actualizar';
    openModal('modal-nonna');
  } catch (err) { alert('Error: ' + err.message); }
}

async function eliminarNonna(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try { await dbDelete('gastos_nonna', id); await cargarNonna(); }
  catch (err) { alert('Error: ' + err.message); }
}

function limpiarFiltrosNonna() {
  ['filtro-nonna-busqueda','filtro-nonna-categoria','filtro-nonna-estado','filtro-nonna-metodo','filtro-nonna-mes','filtro-nonna-fecha']
    .forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
  filtrarNonna();
}

// =============================================================
// INIT
// =============================================================

cargarPagos();
cargarGastos();
cargarNonna();