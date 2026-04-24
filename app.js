const SUPABASE_URL = 'https://gbcywubyovaxsezycdim.supabase.co';
const SUPABASE_KEY = 'sb_publishable_FDLC2zLQ1tRQI6YeL06-hg_qlK3nEWH';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

// --- Base de datos ---

async function dbGet(tabla) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?select=*&order=created_at.desc`, { headers: HEADERS });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbInsert(tabla, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function dbDelete(tabla, id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?id=eq.${id}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(await res.text());
}

// --- Navegación ---

function showSection(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

// --- Modales ---

function openModal(id) {
  const today = new Date().toISOString().split('T')[0];
  if (id === 'modal-pago') document.getElementById('pago-fecha').value = today;
  if (id === 'modal-gasto') document.getElementById('gasto-fecha').value = today;
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeModalOutside(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

// =============================================================
// PAGOS — Moneda
// =============================================================

function toggleMoneda(valor) {
  const camposBs = document.getElementById('campos-bs');
  const labelMonto = document.getElementById('label-monto');
  if (valor === 'Bolívares') {
    camposBs.style.display = 'block';
    labelMonto.textContent = 'Monto base (USD)';
  } else {
    camposBs.style.display = 'none';
    labelMonto.textContent = 'Monto (USD)';
    document.getElementById('resultado-bs').textContent = 'Bs 0,00';
  }
  calcularBs();
}

function calcularBs() {
  const monto = parseFloat(document.getElementById('pago-monto').value) || 0;
  const tasa  = parseFloat(document.getElementById('pago-tasa').value)  || 0;
  const total = monto * tasa;
  document.getElementById('resultado-bs').textContent =
    'Bs ' + total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onTipoTasaChange(valor) {
  const inputTasa = document.getElementById('pago-tasa');
  if (valor === 'Tasa personalizada') {
    inputTasa.value = '';
    inputTasa.focus();
  }
}

// =============================================================
// PAGOS — CRUD
// =============================================================

async function registrarPago(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const editId      = e.target.dataset.editId;
  const estadoRadio = document.querySelector('input[name="pago-estado"]:checked');
  const tipoMoneda  = document.querySelector('input[name="tipo-moneda"]:checked')?.value || 'Dólares';
  const monto       = parseFloat(document.getElementById('pago-monto').value);
  const tasa        = parseFloat(document.getElementById('pago-tasa').value) || null;
  const tipoTasa    = tipoMoneda === 'Bolívares' ? document.getElementById('pago-tipo-tasa').value : null;
  const montoBs     = tipoMoneda === 'Bolívares' && tasa ? monto * tasa : null;

  if (tipoMoneda === 'Bolívares' && !tasa) {
    alert('Debes ingresar la tasa de cambio para pagos en bolívares.');
    btn.disabled = false;
    btn.textContent = editId ? 'Actualizar' : 'Guardar';
    return;
  }

  const data = {
    inquilino:   document.getElementById('pago-inquilino').value.trim(),
    telefono:    document.getElementById('pago-telefono').value.trim(),
    inmueble:    document.getElementById('pago-inmueble').value,
    monto,
    fecha:       document.getElementById('pago-fecha').value,
    estado:      estadoRadio ? estadoRadio.value : 'No pagado',
    notas:       document.getElementById('pago-notas').value.trim(),
    tipo_moneda: tipoMoneda,
    tasa,
    tipo_tasa:   tipoTasa,
    monto_bs:    montoBs,
  };

  try {
    if (editId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/pagos?id=eq.${editId}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
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
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

function abrirEdicion(id) {
  cargarPagoParaEditar(id);
}

async function cargarPagoParaEditar(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pagos?id=eq.${id}&select=*`, { headers: HEADERS });
    const [p] = await res.json();

    document.getElementById('pago-inquilino').value = p.inquilino;
    document.getElementById('pago-telefono').value  = p.telefono || '';
    document.getElementById('pago-inmueble').value  = p.inmueble;
    document.getElementById('pago-monto').value     = p.monto;
    document.getElementById('pago-fecha').value     = p.fecha;
    document.getElementById('pago-notas').value     = p.notas || '';

    const radioMoneda = document.querySelector(`input[name="tipo-moneda"][value="${p.tipo_moneda || 'Dólares'}"]`);
    if (radioMoneda) { radioMoneda.checked = true; toggleMoneda(p.tipo_moneda || 'Dólares'); }

    if (p.tipo_moneda === 'Bolívares') {
      document.getElementById('pago-tasa').value      = p.tasa || '';
      document.getElementById('pago-tipo-tasa').value = p.tipo_tasa || 'BCV dólar';
      calcularBs();
    }

    const radioEstado = document.querySelector(`input[name="pago-estado"][value="${p.estado}"]`);
    if (radioEstado) radioEstado.checked = true;

    document.getElementById('form-pago').dataset.editId = id;
    document.querySelector('#modal-pago .modal-header h3').textContent = 'Editar Pago';
    document.querySelector('#form-pago button[type="submit"]').textContent = 'Actualizar';

    openModal('modal-pago');
  } catch (err) {
    alert('Error al cargar el pago: ' + err.message);
  }
}

async function eliminarPago(id) {
  if (!confirm('¿Eliminar este pago?')) return;
  try {
    await dbDelete('pagos', id);
    await cargarPagos();
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

// Cache de pagos y gastos para filtros
let _pagos = [];
let _gastos = [];

async function cargarPagos() {
  const tbody = document.getElementById('tabla-pagos');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="13">Cargando...</td></tr>';
  try {
    _pagos = await dbGet('pagos');
    actualizarResumenPagos(_pagos);
    filtrarPagos();
  } catch (err) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="13">Error al cargar datos.</td></tr>';
    console.error(err);
  }
}

function filtrarPagos() {
  const busqueda  = document.getElementById('filtro-pago-busqueda')?.value.toLowerCase() || '';
  const inmueble  = document.getElementById('filtro-pago-inmueble')?.value || '';
  const estado    = document.getElementById('filtro-pago-estado')?.value || '';
  const moneda    = document.getElementById('filtro-pago-moneda')?.value || '';
  const fecha     = document.getElementById('filtro-pago-fecha')?.value || '';

  const filtrados = _pagos.filter(p => {
    if (busqueda && !p.inquilino.toLowerCase().includes(busqueda)) return false;
    if (inmueble && p.inmueble !== inmueble) return false;
    if (estado && p.estado !== estado) return false;
    if (moneda && (p.tipo_moneda || 'Dólares') !== moneda) return false;
    if (fecha && p.fecha !== fecha) return false;
    return true;
  });

  renderPagos(filtrados);
}

function renderPagos(pagos) {
  const tbody = document.getElementById('tabla-pagos');
  if (pagos.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="13">No hay pagos registrados aún.</td></tr>';
  } else {
    tbody.innerHTML = pagos.map(p => `
      <tr>
        <td>${p.inquilino}</td>
        <td>${p.telefono || '-'}</td>
        <td>${p.inmueble}</td>
        <td>${formatMoney(p.monto)}</td>
        <td>${p.tipo_moneda || 'Dólares'}</td>
        <td>${p.tasa ? p.tasa.toLocaleString('es-VE') : '-'}</td>
        <td>${p.tipo_tasa || '-'}</td>
        <td>${p.monto_bs ? 'Bs ' + Number(p.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-'}</td>
        <td>${formatDate(p.fecha)}</td>
        <td>${p.notas || '-'}</td>
        <td>${badgePago(p.estado)}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirEdicion(${p.id})">Editar</button>
          <button class="btn-accion btn-eliminar" onclick="eliminarPago(${p.id})">Eliminar</button>
        </td>
      </tr>
    `).join('');
  }
}

function actualizarResumenPagos(pagos) {
  const pagosUSD   = pagos.filter(p => p.estado === 'Pagado' && p.tipo_moneda !== 'Bolívares');
  const pagosBs    = pagos.filter(p => p.estado === 'Pagado' && p.tipo_moneda === 'Bolívares');
  const totalUSD   = pagosUSD.reduce((s, p) => s + p.monto, 0);
  const totalBs    = pagosBs.reduce((s, p) => s + (p.monto_bs || 0), 0);
  const pagados    = pagos.filter(p => p.estado === 'Pagado').length;
  const pendientes = pagos.filter(p => p.estado === 'No pagado').length;

  document.getElementById('total-usd').textContent        = formatMoney(totalUSD);
  document.getElementById('total-bs').textContent         = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('count-pagos').textContent      = pagos.length;
  document.getElementById('count-pagados').textContent    = pagados;
  document.getElementById('count-pendientes').textContent = pendientes;
}

function badgePago(estado) {
  if (!estado) return '<span class="badge badge-red">No pagado</span>';
  const clases = { 'Pagado': 'badge-green', 'No pagado': 'badge-red' };
  return `<span class="badge ${clases[estado] || 'badge-red'}">${estado}</span>`;
}

// =============================================================
// GASTOS — Moneda
// =============================================================

function toggleMonedaGasto(valor) {
  const camposBs   = document.getElementById('campos-bs-gasto');
  const labelMonto = document.getElementById('label-monto-gasto');
  if (valor === 'Bolívares') {
    camposBs.style.display = 'block';
    labelMonto.textContent = 'Monto base (USD)';
  } else {
    camposBs.style.display = 'none';
    labelMonto.textContent = 'Monto (USD)';
    document.getElementById('resultado-bs-gasto').textContent = 'Bs 0,00';
  }
  calcularBsGasto();
}

function calcularBsGasto() {
  const monto = parseFloat(document.getElementById('gasto-monto').value) || 0;
  const tasa  = parseFloat(document.getElementById('gasto-tasa').value)  || 0;
  const total = monto * tasa;
  document.getElementById('resultado-bs-gasto').textContent =
    'Bs ' + total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function onTipoTasaChangeGasto(valor) {
  const inputTasa = document.getElementById('gasto-tasa');
  if (valor === 'Tasa personalizada') {
    inputTasa.value = '';
    inputTasa.focus();
  }
}

// =============================================================
// GASTOS — CRUD
// =============================================================

async function registrarGasto(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const editId      = e.target.dataset.editId;
  const tipoMoneda  = document.querySelector('input[name="gasto-moneda"]:checked')?.value || 'Dólares';
  const monto       = parseFloat(document.getElementById('gasto-monto').value);
  const tasa        = parseFloat(document.getElementById('gasto-tasa').value) || null;
  const tipoTasa    = tipoMoneda === 'Bolívares' ? document.getElementById('gasto-tipo-tasa').value : null;
  const montoBs     = tipoMoneda === 'Bolívares' && tasa ? monto * tasa : null;
  const estadoRadio = document.querySelector('input[name="gasto-estado"]:checked');

  if (tipoMoneda === 'Bolívares' && !tasa) {
    alert('Debes ingresar la tasa de cambio para gastos en bolívares.');
    btn.disabled = false;
    btn.textContent = editId ? 'Actualizar' : 'Guardar';
    return;
  }

  const data = {
    nombre:      document.getElementById('gasto-nombre').value.trim(),
    descripcion: document.getElementById('gasto-descripcion').value.trim(),
    categoria:   document.getElementById('gasto-categoria').value,
    monto,
    fecha:       document.getElementById('gasto-fecha').value,
    tipo_moneda: tipoMoneda,
    tasa,
    tipo_tasa:   tipoTasa,
    monto_bs:    montoBs,
    estado:      estadoRadio ? estadoRadio.value : 'No pagado',
    notas:       document.getElementById('gasto-notas').value.trim(),
  };

  try {
    if (editId) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${editId}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      delete e.target.dataset.editId;
      document.querySelector('#modal-gasto .modal-header h3').textContent = 'Registrar Gasto';
    } else {
      await dbInsert('gastos', data);
    }

    e.target.reset();
    closeModal('modal-gasto');
    await cargarGastos();
  } catch (err) {
    alert('Error al guardar: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

async function abrirEdicionGasto(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos?id=eq.${id}&select=*`, { headers: HEADERS });
    const [g] = await res.json();

    document.getElementById('gasto-nombre').value      = g.nombre || '';
    document.getElementById('gasto-descripcion').value = g.descripcion || '';
    document.getElementById('gasto-categoria').value   = g.categoria;
    document.getElementById('gasto-monto').value       = g.monto;
    document.getElementById('gasto-fecha').value       = g.fecha;
    document.getElementById('gasto-notas').value       = g.notas || '';

    const radioMoneda = document.querySelector(`input[name="gasto-moneda"][value="${g.tipo_moneda || 'Dólares'}"]`);
    if (radioMoneda) { radioMoneda.checked = true; toggleMonedaGasto(g.tipo_moneda || 'Dólares'); }

    if (g.tipo_moneda === 'Bolívares') {
      document.getElementById('gasto-tasa').value      = g.tasa || '';
      document.getElementById('gasto-tipo-tasa').value = g.tipo_tasa || 'BCV dólar';
      calcularBsGasto();
    }

    const radioEstado = document.querySelector(`input[name="gasto-estado"][value="${g.estado}"]`);
    if (radioEstado) radioEstado.checked = true;

    document.getElementById('form-gasto').dataset.editId = id;
    document.querySelector('#modal-gasto .modal-header h3').textContent = 'Editar Gasto';
    document.querySelector('#form-gasto button[type="submit"]').textContent = 'Actualizar';

    openModal('modal-gasto');
  } catch (err) {
    alert('Error al cargar el gasto: ' + err.message);
  }
}

async function eliminarGasto(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  try {
    await dbDelete('gastos', id);
    await cargarGastos();
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
}

async function cargarGastos() {
  const tbody = document.getElementById('tabla-gastos');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="13">Cargando...</td></tr>';
  try {
    _gastos = await dbGet('gastos');
    actualizarResumenGastos(_gastos);
    filtrarGastos();
  } catch (err) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="13">Error al cargar datos.</td></tr>';
    console.error(err);
  }
}

function filtrarGastos() {
  const busqueda = document.getElementById('filtro-gasto-busqueda')?.value.toLowerCase() || '';
  const categoria = document.getElementById('filtro-gasto-categoria')?.value || '';
  const estado    = document.getElementById('filtro-gasto-estado')?.value || '';
  const moneda    = document.getElementById('filtro-gasto-moneda')?.value || '';
  const fecha     = document.getElementById('filtro-gasto-fecha')?.value || '';

  const filtrados = _gastos.filter(g => {
    if (busqueda && !(g.nombre || '').toLowerCase().includes(busqueda)) return false;
    if (categoria && g.categoria !== categoria) return false;
    if (estado && g.estado !== estado) return false;
    if (moneda && (g.tipo_moneda || 'Dólares') !== moneda) return false;
    if (fecha && g.fecha !== fecha) return false;
    return true;
  });

  renderGastos(filtrados);
}

function renderGastos(gastos) {
  const tbody = document.getElementById('tabla-gastos');
  if (gastos.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="13">No hay gastos registrados aún.</td></tr>';
  } else {
    tbody.innerHTML = gastos.map(g => `
      <tr>
        <td>${g.nombre || '-'}</td>
        <td>${g.descripcion || '-'}</td>
        <td><span class="badge badge-blue">${g.categoria}</span></td>
        <td>${g.tipo_moneda !== 'Bolívares' ? formatMoney(g.monto) : formatMoney(g.monto)}</td>
        <td>${g.tipo_moneda || 'Dólares'}</td>
        <td>${g.tasa ? g.tasa.toLocaleString('es-VE') : '-'}</td>
        <td>${g.tipo_tasa || '-'}</td>
        <td>${g.monto_bs ? 'Bs ' + Number(g.monto_bs).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '-'}</td>
        <td>${formatDate(g.fecha)}</td>
        <td>${g.notas || '-'}</td>
        <td>${badgePago(g.estado)}</td>
        <td>
          <button class="btn-accion btn-editar" onclick="abrirEdicionGasto(${g.id})">Editar</button>
          <button class="btn-accion btn-eliminar" onclick="eliminarGasto(${g.id})">Eliminar</button>
        </td>
      </tr>
    `).join('');
  }
}

function actualizarResumenGastos(gastos) {
  const gastosUSD  = gastos.filter(g => g.tipo_moneda !== 'Bolívares');
  const gastosBs   = gastos.filter(g => g.tipo_moneda === 'Bolívares');
  const totalUSD   = gastosUSD.reduce((s, g) => s + g.monto, 0);
  const totalBs    = gastosBs.reduce((s, g) => s + (g.monto_bs || g.monto), 0);
  const realizados = gastos.filter(g => g.estado === 'Pagado').length;
  const pendientes = gastos.filter(g => g.estado === 'No pagado').length;

  document.getElementById('total-gastado-usd').textContent       = formatMoney(totalUSD);
  document.getElementById('total-gastado-bs').textContent        = 'Bs ' + totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('count-gastos').textContent            = gastos.length;
  document.getElementById('count-gastos-pagados').textContent    = realizados;
  document.getElementById('count-gastos-pendientes').textContent = pendientes;
}

// =============================================================
// Utilidades
// =============================================================

function formatMoney(amount) {
  return '$' + Number(amount).toLocaleString('es-CO', { minimumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function limpiarFiltrosPagos() {
  document.getElementById('filtro-pago-busqueda').value = '';
  document.getElementById('filtro-pago-inmueble').value = '';
  document.getElementById('filtro-pago-estado').value   = '';
  document.getElementById('filtro-pago-moneda').value   = '';
  document.getElementById('filtro-pago-fecha').value    = '';
  filtrarPagos();
}

function limpiarFiltrosGastos() {
  document.getElementById('filtro-gasto-busqueda').value  = '';
  document.getElementById('filtro-gasto-categoria').value = '';
  document.getElementById('filtro-gasto-estado').value    = '';
  document.getElementById('filtro-gasto-moneda').value    = '';
  document.getElementById('filtro-gasto-fecha').value     = '';
  filtrarGastos();
}

// --- Init ---

cargarPagos();
cargarGastos();