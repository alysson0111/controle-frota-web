function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `fleet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const seedVehicles = [
  {
    id: uid(),
    model: "Honda Civic EXL",
    year: 2022,
    plate: "RVD2A19",
    vin: "93HFC2680NZ100321",
    origin: "Compra direta",
    status: "Disponível",
    entryDate: "2026-05-06",
    mileage: 38400,
    purchaseCost: 118000,
    extraCost: 4200,
    salePrice: 136900,
    maintenanceDue: "2026-06-05",
    docs: { crlv: true, ipva: true, inspection: true, transfer: true },
    notes: "Polimento concluído. Pronto para vitrine."
  },
  {
    id: uid(),
    model: "Toyota Corolla XEi",
    year: 2021,
    plate: "QRT8F44",
    vin: "9BRB33BE1M2058840",
    origin: "Troca",
    status: "Preparação",
    entryDate: "2026-05-14",
    mileage: 51200,
    purchaseCost: 104500,
    extraCost: 6900,
    salePrice: 124900,
    maintenanceDue: "2026-05-29",
    docs: { crlv: true, ipva: false, inspection: true, transfer: false },
    notes: "Trocar pneus dianteiros e regularizar transferência."
  },
  {
    id: uid(),
    model: "Jeep Compass Limited",
    year: 2023,
    plate: "TCA5H02",
    vin: "988675126PK337710",
    origin: "Consignado",
    status: "Reservado",
    entryDate: "2026-05-18",
    mileage: 22100,
    purchaseCost: 149000,
    extraCost: 2100,
    salePrice: 165900,
    maintenanceDue: "2026-06-20",
    docs: { crlv: true, ipva: true, inspection: true, transfer: false },
    notes: "Cliente aguardando aprovação de financiamento."
  },
  {
    id: uid(),
    model: "Fiat Strada Volcano",
    year: 2024,
    plate: "SVA9C61",
    vin: "9BD281A2XRY667810",
    origin: "Leilão",
    status: "Preparação",
    entryDate: "2026-05-21",
    mileage: 13400,
    purchaseCost: 94000,
    extraCost: 9800,
    salePrice: 118900,
    maintenanceDue: "2026-05-28",
    docs: { crlv: false, ipva: true, inspection: false, transfer: false },
    notes: "Aguardando laudo cautelar e revisão de suspensão."
  }
];

let vehicles = [];
let currentView = "dashboard";
let currentReport = "stock";
let currentSession = null;
let cachedFirebase = null;
const moneyFieldIds = ["purchaseCost", "extraCost", "salePrice"];

const els = {
  authScreen: document.querySelector("#authScreen"),
  appShell: document.querySelector("#appShell"),
  loginForm: document.querySelector("#loginForm"),
  signupForm: document.querySelector("#signupForm"),
  forgotForm: document.querySelector("#forgotForm"),
  resetForm: document.querySelector("#resetForm"),
  authMessage: document.querySelector("#authMessage"),
  showSignup: document.querySelector("#showSignup"),
  showForgotPassword: document.querySelector("#showForgotPassword"),
  backToLoginFromSignup: document.querySelector("#backToLoginFromSignup"),
  backToLogin: document.querySelector("#backToLogin"),
  logoutBtn: document.querySelector("#logoutBtn"),
  navItems: document.querySelectorAll(".nav-item"),
  views: {
    dashboard: document.querySelector("#dashboardView"),
    vehicles: document.querySelector("#vehiclesView"),
    maintenance: document.querySelector("#maintenanceView"),
    documents: document.querySelector("#documentsView"),
    reports: document.querySelector("#reportsView")
  },
  searchInput: document.querySelector("#searchInput"),
  statusFilter: document.querySelector("#statusFilter"),
  originFilter: document.querySelector("#originFilter"),
  reportOptions: document.querySelectorAll(".report-option"),
  reportPeriod: document.querySelector("#reportPeriod"),
  reportStart: document.querySelector("#reportStart"),
  reportEnd: document.querySelector("#reportEnd"),
  modal: document.querySelector("#vehicleModal"),
  form: document.querySelector("#vehicleForm"),
  deleteVehicle: document.querySelector("#deleteVehicle"),
  exportBtn: document.querySelector("#exportBtn"),
  exportReportBtn: document.querySelector("#exportReportBtn")
};

function firebaseServices() {
  const config = window.APP_CONFIG || {};
  const hasConfig = config.FIREBASE_API_KEY && config.FIREBASE_AUTH_DOMAIN && config.FIREBASE_PROJECT_ID && config.FIREBASE_APP_ID;
  if (!hasConfig) {
    throw new Error("Firebase não configurado. Edite config.js e informe os dados do Firebase Web App.");
  }
  if (!window.firebase?.initializeApp) {
    throw new Error("Biblioteca do Firebase não carregou. Verifique a conexão com a internet.");
  }
  if (!cachedFirebase) {
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp({
      apiKey: config.FIREBASE_API_KEY,
      authDomain: config.FIREBASE_AUTH_DOMAIN,
      projectId: config.FIREBASE_PROJECT_ID,
      storageBucket: config.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: config.FIREBASE_MESSAGING_SENDER_ID,
      appId: config.FIREBASE_APP_ID
    });
    cachedFirebase = {
      app,
      auth: firebase.auth(),
      db: firebase.firestore()
    };
  }
  return cachedFirebase;
}

function setAuthMode(mode) {
  [els.loginForm, els.signupForm, els.forgotForm, els.resetForm].forEach((form) => form.classList.remove("active"));
  const form = {
    login: els.loginForm,
    signup: els.signupForm,
    forgot: els.forgotForm,
    reset: els.resetForm
  }[mode];
  form.classList.add("active");
}

function setAuthMessage(message = "", type = "") {
  els.authMessage.textContent = message;
  els.authMessage.className = `auth-message${message ? " active" : ""}${type ? ` ${type}` : ""}`;
}

function showLogin() {
  els.authScreen.hidden = false;
  els.appShell.hidden = true;
}

function showApp() {
  els.authScreen.hidden = true;
  els.appShell.hidden = false;
}

function toFirestoreDoc(vehicle) {
  return {
    id: vehicle.id,
    model: vehicle.model,
    year: vehicle.year,
    plate: vehicle.plate,
    vin: vehicle.vin,
    origin: vehicle.origin,
    status: vehicle.status,
    entryDate: vehicle.entryDate,
    saleDate: vehicle.saleDate || "",
    mileage: vehicle.mileage,
    purchaseCost: vehicle.purchaseCost,
    extraCost: vehicle.extraCost,
    salePrice: vehicle.salePrice,
    maintenanceDue: vehicle.maintenanceDue,
    docs: vehicle.docs,
    notes: vehicle.notes,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
}

function fromFirestoreDoc(doc) {
  const row = doc.data();
  return {
    id: row.id || doc.id,
    model: row.model,
    year: Number(row.year),
    plate: row.plate,
    vin: row.vin,
    origin: row.origin,
    status: row.status,
    entryDate: row.entryDate,
    saleDate: row.saleDate || "",
    mileage: Number(row.mileage),
    purchaseCost: Number(row.purchaseCost),
    extraCost: Number(row.extraCost),
    salePrice: Number(row.salePrice),
    maintenanceDue: row.maintenanceDue,
    docs: row.docs || { crlv: false, ipva: false, inspection: false, transfer: false },
    notes: row.notes || ""
  };
}

async function loadVehicles() {
  const { db } = firebaseServices();
  const snapshot = await db.collection("vehicles").orderBy("updatedAt", "desc").get();
  return snapshot.docs.map(fromFirestoreDoc);
}

async function saveVehicleRecord(vehicle) {
  const { db } = firebaseServices();
  await db.collection("vehicles").doc(vehicle.id).set(toFirestoreDoc(vehicle), { merge: true });
}

async function deleteVehicleRecord(id) {
  const { db } = firebaseServices();
  await db.collection("vehicles").doc(id).delete();
}

function currency(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function currencyInput(value) {
  const cents = String(value || "").replace(/\D/g, "");
  return currency(Number(cents) / 100);
}

function parseCurrencyInput(value) {
  const cents = String(value || "").replace(/\D/g, "");
  return Number(cents) / 100;
}

function setMoneyField(id, value) {
  document.querySelector(`#${id}`).value = currency(Number(value || 0));
}

function date(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    start: new Date(year, month, 1).toISOString().slice(0, 10),
    end: new Date(year, month + 1, 0).toISOString().slice(0, 10)
  };
}

function daysUntil(value) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${value}T00:00:00`);
  return Math.ceil((target - today) / 86400000);
}

function totalCost(vehicle) {
  return Number(vehicle.purchaseCost) + Number(vehicle.extraCost);
}

function profit(vehicle) {
  return Number(vehicle.salePrice) - totalCost(vehicle);
}

function docsReady(vehicle) {
  return Object.values(vehicle.docs).every(Boolean);
}

function preparationReady(vehicle) {
  return docsReady(vehicle) && daysUntil(vehicle.maintenanceDue) > 0 && vehicle.status !== "Preparação";
}

function vehicleSaleDate(vehicle) {
  return vehicle.saleDate || vehicle.entryDate;
}

function filteredVehicles() {
  const text = els.searchInput.value.trim().toLowerCase();
  const status = els.statusFilter.value;
  const origin = els.originFilter.value;
  return vehicles.filter((vehicle) => {
    const matchesText = [vehicle.model, vehicle.plate, vehicle.vin, vehicle.notes]
      .join(" ")
      .toLowerCase()
      .includes(text);
    const matchesStatus = status === "todos" || vehicle.status === status;
    const matchesOrigin = origin === "todos" || vehicle.origin === origin;
    return matchesText && matchesStatus && matchesOrigin;
  });
}

function render() {
  renderMetrics();
  renderChart();
  renderAlerts();
  renderVehicleRows();
  renderMaintenance();
  renderDocuments();
  renderReports();
}

function renderMetrics() {
  const stock = vehicles.filter((vehicle) => vehicle.status !== "Vendido");
  const sold = vehicles.filter((vehicle) => vehicle.status === "Vendido");
  const invested = stock.reduce((sum, vehicle) => sum + totalCost(vehicle), 0);
  const margin = stock.reduce((sum, vehicle) => sum + profit(vehicle), 0);
  const ready = stock.filter(preparationReady).length;
  const pending = stock.filter((vehicle) => !preparationReady(vehicle)).length;
  const avg = invested ? Math.round((margin / invested) * 100) : 0;

  document.querySelector("#stockCount").textContent = stock.length;
  document.querySelector("#stockValue").textContent = `${currency(invested)} investidos`;
  document.querySelector("#readyCount").textContent = ready;
  document.querySelector("#pendingCount").textContent = pending;
  document.querySelector("#soldCount").textContent = sold.length;
  document.querySelector("#profitValue").textContent = currency(margin);
  document.querySelector("#sidebarProfit").textContent = currency(margin);
  document.querySelector("#avgMargin").textContent = `${avg}% média`;
}

function renderChart() {
  const statuses = ["Disponível", "Preparação", "Reservado", "Vendido"];
  const max = Math.max(1, ...statuses.map((status) => vehicles.filter((vehicle) => vehicle.status === status).length));
  document.querySelector("#statusChart").innerHTML = statuses
    .map((status) => {
      const count = vehicles.filter((vehicle) => vehicle.status === status).length;
      const width = Math.max(5, (count / max) * 100);
      return `
        <div class="chart-row">
          <strong>${status}</strong>
          <div class="chart-track"><div class="chart-bar" style="width:${width}%"></div></div>
          <span>${count}</span>
        </div>
      `;
    })
    .join("");
}

function renderAlerts() {
  const alerts = vehicles
    .filter((vehicle) => vehicle.status !== "Vendido")
    .flatMap((vehicle) => {
      const items = [];
      const due = daysUntil(vehicle.maintenanceDue);
      if (due <= 7) {
        items.push({
          title: `${vehicle.model} tem manutenção próxima`,
          body: due < 0 ? `Vencida há ${Math.abs(due)} dia(s)` : `Vence em ${due} dia(s)`
        });
      }
      if (!docsReady(vehicle)) {
        items.push({
          title: `${vehicle.model} tem documentação pendente`,
          body: missingDocs(vehicle).join(", ")
        });
      }
      if (profit(vehicle) < 5000 && vehicle.status !== "Consignado") {
        items.push({
          title: `${vehicle.model} com margem apertada`,
          body: `Margem prevista de ${currency(profit(vehicle))}`
        });
      }
      return items;
    })
    .slice(0, 5);

  document.querySelector("#alertsList").innerHTML = alerts.length
    ? alerts.map((alert) => `<article class="alert"><strong>${alert.title}</strong><span>${alert.body}</span></article>`).join("")
    : `<div class="empty-state">Nenhum alerta prioritário no momento.</div>`;
}

function renderVehicleRows() {
  const rows = filteredVehicles();
  document.querySelector("#vehicleRows").innerHTML = rows.length
    ? rows.map(vehicleRow).join("")
    : `<tr><td colspan="8" class="empty-state">Nenhum veículo encontrado com os filtros atuais.</td></tr>`;
}

function vehicleRow(vehicle) {
  const badgeClass = vehicle.status === "Vendido" ? "sold" : preparationReady(vehicle) ? "ready" : "pending";
  return `
    <tr>
      <td class="vehicle-cell"><strong>${vehicle.model}</strong><span>${vehicle.year} • ${vehicle.mileage.toLocaleString("pt-BR")} km</span></td>
      <td>${vehicle.plate}</td>
      <td><span class="badge ${badgeClass}">${vehicle.status}</span></td>
      <td>${date(vehicle.entryDate)}</td>
      <td>${currency(totalCost(vehicle))}</td>
      <td>${currency(vehicle.salePrice)}</td>
      <td>${currency(profit(vehicle))}</td>
      <td>
        <div class="row-actions">
          <button class="small-btn" type="button" data-edit="${vehicle.id}">Editar</button>
          <button class="small-btn" type="button" data-sell="${vehicle.id}">Vender</button>
        </div>
      </td>
    </tr>
  `;
}

function renderMaintenance() {
  const lanes = [
    { title: "Vencidas", filter: (vehicle) => daysUntil(vehicle.maintenanceDue) < 0 },
    { title: "Próximos 7 dias", filter: (vehicle) => daysUntil(vehicle.maintenanceDue) >= 0 && daysUntil(vehicle.maintenanceDue) <= 7 },
    { title: "Agendadas", filter: (vehicle) => daysUntil(vehicle.maintenanceDue) > 7 }
  ];

  document.querySelector("#maintenanceBoard").innerHTML = lanes
    .map((lane) => {
      const cards = vehicles.filter((vehicle) => vehicle.status !== "Vendido").filter(lane.filter);
      return `
        <section class="lane">
          <h2>${lane.title}</h2>
          ${
            cards.length
              ? cards.map((vehicle) => `
                <article class="task">
                  <strong>${vehicle.model}</strong>
                  <span class="subtle">${vehicle.plate} • ${vehicle.mileage.toLocaleString("pt-BR")} km</span>
                  <footer><span>${date(vehicle.maintenanceDue)}</span><button class="small-btn" type="button" data-edit="${vehicle.id}">Abrir</button></footer>
                </article>
              `).join("")
              : `<div class="empty-state">Sem itens.</div>`
          }
        </section>
      `;
    })
    .join("");
}

function renderDocuments() {
  document.querySelector("#documentsGrid").innerHTML = filteredVehicles()
    .map((vehicle) => `
      <article class="doc-card">
        <div>
          <h2>${vehicle.model}</h2>
          <span class="subtle">${vehicle.plate} • ${vehicle.vin}</span>
        </div>
        <div class="doc-checks">
          ${docLine("CRLV", vehicle.docs.crlv)}
          ${docLine("IPVA/licenciamento", vehicle.docs.ipva)}
          ${docLine("Laudo cautelar", vehicle.docs.inspection)}
          ${docLine("Transferência", vehicle.docs.transfer)}
        </div>
        <button class="small-btn" type="button" data-edit="${vehicle.id}">Editar checklist</button>
      </article>
    `)
    .join("");
}

function reportVehicles() {
  if (currentReport === "stock") {
    return vehicles.filter((vehicle) => vehicle.status !== "Vendido");
  }

  const start = els.reportStart.value || "1900-01-01";
  const end = els.reportEnd.value || "2999-12-31";
  return vehicles.filter((vehicle) => {
    const soldDate = vehicleSaleDate(vehicle);
    return vehicle.status === "Vendido" && soldDate >= start && soldDate <= end;
  });
}

function renderReports() {
  const rows = reportVehicles();
  const isStock = currentReport === "stock";
  const invested = rows.reduce((sum, vehicle) => sum + totalCost(vehicle), 0);
  const sales = rows.reduce((sum, vehicle) => sum + Number(vehicle.salePrice), 0);
  const margin = rows.reduce((sum, vehicle) => sum + profit(vehicle), 0);

  els.reportPeriod.classList.toggle("active", !isStock);
  document.querySelector("#reportMetricOneLabel").textContent = isStock ? "Veículos em estoque" : "Veículos vendidos";
  document.querySelector("#reportMetricTwoLabel").textContent = isStock ? "Valor investido" : "Venda total";
  document.querySelector("#reportMetricThreeLabel").textContent = isStock ? "Preço total anunciado" : "Custo total";
  document.querySelector("#reportMetricFourLabel").textContent = isStock ? "Margem prevista" : "Margem realizada";
  document.querySelector("#reportMetricOne").textContent = rows.length;
  document.querySelector("#reportMetricTwo").textContent = currency(isStock ? invested : sales);
  document.querySelector("#reportMetricThree").textContent = currency(isStock ? sales : invested);
  document.querySelector("#reportMetricFour").textContent = currency(margin);

  document.querySelector("#reportHead").innerHTML = isStock
    ? `<tr><th>Veículo</th><th>Placa</th><th>Status</th><th>Entrada</th><th>Custo total</th><th>Preço venda</th><th>Margem</th></tr>`
    : `<tr><th>Veículo</th><th>Placa</th><th>Data da venda</th><th>Custo total</th><th>Preço venda</th><th>Margem</th></tr>`;

  document.querySelector("#reportRows").innerHTML = rows.length
    ? rows.map((vehicle) => isStock ? `
      <tr>
        <td class="vehicle-cell"><strong>${vehicle.model}</strong><span>${vehicle.year} • ${vehicle.mileage.toLocaleString("pt-BR")} km</span></td>
        <td>${vehicle.plate}</td>
        <td><span class="badge">${vehicle.status}</span></td>
        <td>${date(vehicle.entryDate)}</td>
        <td>${currency(totalCost(vehicle))}</td>
        <td>${currency(vehicle.salePrice)}</td>
        <td>${currency(profit(vehicle))}</td>
      </tr>
    ` : `
      <tr>
        <td class="vehicle-cell"><strong>${vehicle.model}</strong><span>${vehicle.year} • ${vehicle.mileage.toLocaleString("pt-BR")} km</span></td>
        <td>${vehicle.plate}</td>
        <td>${date(vehicleSaleDate(vehicle))}</td>
        <td>${currency(totalCost(vehicle))}</td>
        <td>${currency(vehicle.salePrice)}</td>
        <td>${currency(profit(vehicle))}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="7" class="empty-state">Nenhum veículo encontrado para este relatório.</td></tr>`;
}

function docLine(label, ok) {
  return `<div class="doc-check"><span>${label}</span><strong>${ok ? "Ok" : "Pendente"}</strong></div>`;
}

function missingDocs(vehicle) {
  const labels = {
    crlv: "CRLV",
    ipva: "IPVA/licenciamento",
    inspection: "laudo cautelar",
    transfer: "transferência"
  };
  return Object.entries(vehicle.docs).filter(([, ok]) => !ok).map(([key]) => labels[key]);
}

function openModal(vehicle = null) {
  document.querySelector("#modalTitle").textContent = vehicle ? "Editar veículo" : "Novo veículo";
  els.deleteVehicle.hidden = !vehicle;
  els.form.reset();

  if (vehicle) {
    document.querySelector("#vehicleId").value = vehicle.id;
    Object.entries(vehicle).forEach(([key, value]) => {
      if (key === "docs" || key === "id") return;
      const input = document.querySelector(`#${key}`);
      if (input) input.value = value;
    });
    moneyFieldIds.forEach((id) => setMoneyField(id, vehicle[id]));
    Object.entries(vehicle.docs).forEach(([key, value]) => {
      document.querySelector(`#${key}`).checked = value;
    });
  } else {
    document.querySelector("#vehicleId").value = "";
    document.querySelector("#entryDate").valueAsDate = new Date();
    document.querySelector("#saleDate").value = "";
    const due = new Date();
    due.setDate(due.getDate() + 15);
    document.querySelector("#maintenanceDue").valueAsDate = due;
    moneyFieldIds.forEach((id) => setMoneyField(id, 0));
  }

  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
}

async function saveVehicle(event) {
  event.preventDefault();
  const id = document.querySelector("#vehicleId").value || uid();
  const previousVehicles = [...vehicles];
  const vehicle = {
    id,
    model: document.querySelector("#model").value.trim(),
    year: Number(document.querySelector("#year").value),
    plate: document.querySelector("#plate").value.trim().toUpperCase(),
    vin: document.querySelector("#vin").value.trim().toUpperCase(),
    origin: document.querySelector("#origin").value,
    status: document.querySelector("#status").value,
    entryDate: document.querySelector("#entryDate").value,
    saleDate: document.querySelector("#saleDate").value,
    mileage: Number(document.querySelector("#mileage").value),
    purchaseCost: parseCurrencyInput(document.querySelector("#purchaseCost").value),
    extraCost: parseCurrencyInput(document.querySelector("#extraCost").value),
    salePrice: parseCurrencyInput(document.querySelector("#salePrice").value),
    maintenanceDue: document.querySelector("#maintenanceDue").value,
    docs: {
      crlv: document.querySelector("#crlv").checked,
      ipva: document.querySelector("#ipva").checked,
      inspection: document.querySelector("#inspection").checked,
      transfer: document.querySelector("#transfer").checked
    },
    notes: document.querySelector("#notes").value.trim()
  };

  if (vehicle.status === "Vendido" && !vehicle.saleDate) {
    vehicle.saleDate = todayIso();
  }
  if (vehicle.status !== "Vendido") {
    vehicle.saleDate = "";
  }

  vehicles = vehicles.some((item) => item.id === id)
    ? vehicles.map((item) => (item.id === id ? vehicle : item))
    : [vehicle, ...vehicles];

  try {
    await saveVehicleRecord(vehicle);
    closeModal();
    render();
  } catch (error) {
    vehicles = previousVehicles;
    render();
    alert("Não foi possível salvar no Firebase. Verifique a configuração do banco.");
    console.error(error);
  }
}

async function deleteCurrentVehicle() {
  const id = document.querySelector("#vehicleId").value;
  if (!id) return;
  const previousVehicles = [...vehicles];
  const vehicle = vehicles.find((item) => item.id === id);
  const message = vehicle
    ? `Tem certeza que deseja excluir o veículo ${vehicle.model} (${vehicle.plate})?`
    : "Tem certeza que deseja excluir este veículo?";
  if (!confirm(message)) return;
  vehicles = vehicles.filter((vehicle) => vehicle.id !== id);
  try {
    await deleteVehicleRecord(id);
    closeModal();
    render();
  } catch (error) {
    vehicles = previousVehicles;
    render();
    alert("Não foi possível excluir no Firebase. Verifique a configuração do banco.");
    console.error(error);
  }
}

async function sellVehicle(id) {
  const soldVehicle = vehicles.find((vehicle) => vehicle.id === id);
  if (!soldVehicle) return;
  const previousVehicles = [...vehicles];
  const updatedVehicle = { ...soldVehicle, status: "Vendido", saleDate: soldVehicle.saleDate || todayIso() };
  vehicles = vehicles.map((vehicle) => (vehicle.id === id ? updatedVehicle : vehicle));
  render();

  try {
    await saveVehicleRecord(updatedVehicle);
  } catch (error) {
    vehicles = previousVehicles;
    render();
    alert("Não foi possível registrar a venda no Firebase. Verifique a configuração do banco.");
    console.error(error);
  }
}

function exportReportCsv() {
  const rows = reportVehicles();
  const isStock = currentReport === "stock";
  const header = isStock
    ? ["Modelo", "Ano", "Placa", "Status", "Data de entrada", "Quilometragem", "Custo total", "Preço de venda", "Margem prevista"]
    : ["Modelo", "Ano", "Placa", "Data da venda", "Quilometragem", "Custo total", "Preço de venda", "Margem"];
  const lines = rows.map((vehicle) => isStock
    ? [vehicle.model, vehicle.year, vehicle.plate, vehicle.status, vehicle.entryDate, vehicle.mileage, currency(totalCost(vehicle)), currency(vehicle.salePrice), currency(profit(vehicle))]
    : [vehicle.model, vehicle.year, vehicle.plate, vehicleSaleDate(vehicle), vehicle.mileage, currency(totalCost(vehicle)), currency(vehicle.salePrice), currency(profit(vehicle))]
  );
  const csv = [header, ...lines].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = isStock ? "relatorio-estoque.csv" : "relatorio-veiculos-vendidos.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function exportCsv() {
  const header = ["Modelo", "Ano", "Placa", "Status", "Origem", "Data de entrada", "Quilometragem", "Custo total", "Preço de venda", "Margem prevista", "Pendências"];
  const lines = filteredVehicles().map((vehicle) => [
    vehicle.model,
    vehicle.year,
    vehicle.plate,
    vehicle.status,
    vehicle.origin,
    vehicle.entryDate,
    vehicle.mileage,
    currency(totalCost(vehicle)),
    currency(vehicle.salePrice),
    currency(profit(vehicle)),
    missingDocs(vehicle).join(" | ")
  ]);
  const csv = [header, ...lines].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "controle-frota-revendedora.csv";
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelector("#openVehicleModal").addEventListener("click", () => openModal());
document.querySelector("#closeVehicleModal").addEventListener("click", closeModal);
document.querySelector("#cancelVehicle").addEventListener("click", closeModal);
els.form.addEventListener("submit", saveVehicle);
els.deleteVehicle.addEventListener("click", deleteCurrentVehicle);
els.exportBtn.addEventListener("click", exportCsv);
els.exportReportBtn.addEventListener("click", exportReportCsv);
els.logoutBtn.addEventListener("click", async () => {
  try {
    await firebaseServices().auth.signOut();
  } finally {
    currentSession = null;
    vehicles = [];
    render();
    setAuthMode("login");
    setAuthMessage("");
    showLogin();
  }
});

els.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("Entrando...", "");
  try {
    const credential = await firebaseServices().auth.signInWithEmailAndPassword(
      document.querySelector("#loginEmail").value.trim(),
      document.querySelector("#loginPassword").value
    );
    currentSession = credential.user;
    setAuthMessage("");
    await initApp();
  } catch (error) {
    setAuthMessage(error.message || "Não foi possível entrar. Confira e-mail e senha.", "error");
  }
});

els.signupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#signupPassword").value;
  const confirmation = document.querySelector("#signupConfirmPassword").value;
  if (password !== confirmation) {
    setAuthMessage("As senhas não conferem.", "error");
    return;
  }

  setAuthMessage("Criando cadastro...", "");
  try {
    const credential = await firebaseServices().auth.createUserWithEmailAndPassword(
      document.querySelector("#signupEmail").value.trim(),
      password
    );
    await credential.user.updateProfile({
      displayName: document.querySelector("#signupName").value.trim()
    });
    currentSession = credential.user;
    setAuthMessage("");
    await initApp();
  } catch (error) {
    setAuthMessage(error.message || "Não foi possível criar o cadastro.", "error");
  }
});

els.forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setAuthMessage("Enviando link de recuperação...", "");
  try {
    await firebaseServices().auth.sendPasswordResetEmail(document.querySelector("#forgotEmail").value.trim());
    setAuthMessage("Enviamos um link para refazer a senha. Verifique seu e-mail.", "success");
  } catch (error) {
    setAuthMessage(error.message || "Não foi possível enviar o link de recuperação.", "error");
  }
});

els.resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = document.querySelector("#newPassword").value;
  const confirmation = document.querySelector("#confirmPassword").value;
  if (password !== confirmation) {
    setAuthMessage("As senhas não conferem.", "error");
    return;
  }

  setAuthMessage("Atualizando senha...", "");
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("oobCode");
    if (!code) throw new Error("Link de recuperação inválido ou expirado.");
    await firebaseServices().auth.confirmPasswordReset(code, password);
    setAuthMessage("Senha atualizada. Entre novamente com a nova senha.", "success");
    currentSession = null;
    setAuthMode("login");
    window.history.replaceState({}, document.title, window.location.pathname);
  } catch (error) {
    setAuthMessage(error.message || "Não foi possível atualizar a senha.", "error");
  }
});

els.showSignup.addEventListener("click", () => {
  setAuthMode("signup");
  setAuthMessage("");
});

els.showForgotPassword.addEventListener("click", () => {
  setAuthMode("forgot");
  setAuthMessage("");
});

els.backToLoginFromSignup.addEventListener("click", () => {
  setAuthMode("login");
  setAuthMessage("");
});

els.backToLogin.addEventListener("click", () => {
  setAuthMode("login");
  setAuthMessage("");
});

[els.searchInput, els.statusFilter, els.originFilter].forEach((element) => {
  element.addEventListener("input", render);
});

moneyFieldIds.forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("input", (event) => {
    event.target.value = currencyInput(event.target.value);
  });
});

els.reportOptions.forEach((option) => {
  option.addEventListener("click", () => {
    currentReport = option.dataset.report;
    els.reportOptions.forEach((item) => item.classList.toggle("active", item === option));
    renderReports();
  });
});

[els.reportStart, els.reportEnd].forEach((element) => {
  element.addEventListener("input", renderReports);
});

els.navItems.forEach((item) => {
  item.addEventListener("click", () => {
    currentView = item.dataset.view;
    els.navItems.forEach((nav) => nav.classList.toggle("active", nav === item));
    Object.entries(els.views).forEach(([key, view]) => view.classList.toggle("active", key === currentView));
  });
});

document.body.addEventListener("click", (event) => {
  const editId = event.target.closest("[data-edit]")?.dataset.edit;
  const sellId = event.target.closest("[data-sell]")?.dataset.sell;
  if (editId) openModal(vehicles.find((vehicle) => vehicle.id === editId));
  if (sellId) sellVehicle(sellId);
});

const reportRange = currentMonthRange();
els.reportStart.value = reportRange.start;
els.reportEnd.value = reportRange.end;

function showDataError(error) {
  vehicles = [];
  render();
  const message = error?.message || "Não foi possível conectar ao Firebase.";
  document.querySelector("#alertsList").innerHTML = `
    <article class="alert">
      <strong>Erro ao conectar no Firebase</strong>
      <span>${message}</span>
    </article>
  `;
  document.querySelector("#vehicleRows").innerHTML = `<tr><td colspan="8" class="empty-state">Configure o Firebase para carregar os veículos.</td></tr>`;
  document.querySelector("#reportRows").innerHTML = `<tr><td colspan="7" class="empty-state">Configure o Firebase para gerar relatórios.</td></tr>`;
  console.error(error);
}

async function initApp() {
  try {
    showApp();
    vehicles = await loadVehicles();
    render();
  } catch (error) {
    showDataError(error);
  }
}

async function initAuth() {
  try {
    const { auth } = firebaseServices();
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "resetPassword" && params.get("oobCode")) {
      showLogin();
      setAuthMode("reset");
      setAuthMessage("Digite a nova senha para concluir a recuperação.", "success");
      return;
    }

    auth.onAuthStateChanged(async (user) => {
      currentSession = user;
      if (user) {
        await initApp();
      } else {
        showLogin();
        setAuthMode("login");
        setAuthMessage("");
      }
    });
  } catch (error) {
    showLogin();
    setAuthMode("login");
    setAuthMessage(error.message || "Não foi possível conectar ao Firebase.", "error");
  }
}

initAuth();
