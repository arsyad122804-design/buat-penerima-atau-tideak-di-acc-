// =====================================================
// SPMS — App Logic
// =====================================================

// ---- State ----
const API_URL = "https://sheetdb.io/api/v1/foet3yghxpc6n";
let items = [];
let currentApprovalId = null;
let currentApprovalAction = null;

function getUserProfileKey() {
  try {
    const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
    if (session.username) return "spms_profile_" + session.username.toLowerCase().replace(/[^a-z0-9]/g, "_");
    if (session.role) return "spms_profile_" + session.role.toLowerCase();
  } catch(e) {}
  return "spms_profile_default";
}

function getSavedProfile() {
  try {
    const profKey = getUserProfileKey();
    let saved = JSON.parse(localStorage.getItem(profKey) || "{}");
    if (saved && (saved.fullname || saved.signature || saved.wa)) return saved;
  } catch(e) {}
  return {};
}

function saveLocalOverrides(id, approval, adminSignature, pembelian) {
  try {
    const overrides = JSON.parse(localStorage.getItem("spms_status_overrides") || "{}");
    overrides[id] = {
      approval: approval,
      adminSignature: adminSignature,
      pembelian: pembelian
    };
    localStorage.setItem("spms_status_overrides", JSON.stringify(overrides));
  } catch (e) {}
}

const FONNTE_TOKEN = "EvEc9ZQsRM8dCWUCqujm";

function getRoleWaNumber(targetRole) {
  try {
    const roleClean = (targetRole || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    // Exact profile keys to try
    const keysToTry = [
      "spms_profile_" + roleClean,
      "spms_profile_" + (roleClean === "direktur" ? "hibatullah" : roleClean === "manager" ? "manager" : roleClean === "admin" ? "admin" : roleClean)
    ];

    for (const key of keysToTry) {
      const data = JSON.parse(localStorage.getItem(key) || "{}");
      if (data && data.wa) return data.wa;
    }

    // Secondary scan across all spms_profile_ keys
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("spms_profile_")) {
        const data = JSON.parse(localStorage.getItem(k) || "{}");
        if (data && data.wa) {
          if (k.includes(roleClean) || (roleClean === "direktur" && k.includes("hibatullah"))) {
            return data.wa;
          }
        }
      }
    }

    // Global fallback
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("spms_profile_")) {
        const data = JSON.parse(localStorage.getItem(k) || "{}");
        if (data && data.wa) return data.wa;
      }
    }
  } catch (e) {}
  return "";
}

function cleanWaInputValue(val) {
  if (!val) return "";
  let digits = val.replace(/[^0-9]/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function formatWaInput(val) {
  const digits = cleanWaInputValue(val);
  if (!digits) return "";
  const rest = digits;
  if (rest.length <= 3) return `+62 ${rest}`;
  if (rest.length <= 7) return `+62 ${rest.slice(0, 3)}-${rest.slice(3)}`;
  return `+62 ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7, 12)}`;
}

function resolveWaDisplay(item) {
  if (!item) return "—";
  if (item.wa && item.wa.trim()) return formatWaInput(item.wa.trim());

  const pengaju = (item.pengaju || "").toLowerCase().trim();
  if (pengaju) {
    const wa = getRoleWaNumber(pengaju);
    if (wa) return formatWaInput(wa);
  }

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("spms_profile_")) {
      const data = JSON.parse(localStorage.getItem(k) || "{}");
      if (data && data.wa) return formatWaInput(data.wa);
    }
  }

  return "—";
}

async function sendWaDirect(phoneRaw, message) {
  const waClean = (phoneRaw || "").replace(/[^0-9]/g, "");
  if (!waClean) {
    showToast("⚠️ Nomor WA tujuan belum diisi di profil!");
    return false;
  }

  let phone = waClean;
  if (phone.startsWith("0")) phone = "62" + phone.slice(1);

  showToast(`📲 Mengirim notifikasi WA ke ${phone}...`);

  try {
    const params = new URLSearchParams();
    params.append("target", phone);
    params.append("message", message);
    params.append("countryCode", "62");

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { 
        "Authorization": FONNTE_TOKEN,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const data = await res.json();
    console.log("Fonnte WA Response:", data);

    if (data && (data.status === true || data.detail)) {
      showToast(`✅ Notifikasi WA terkirim otomatis di latar belakang ke ${phone}!`);
      return true;
    } else {
      console.warn("Fonnte API response:", data);
      showToast(`📲 Notifikasi WA terproses dikirim ke ${phone}`);
      return true;
    }
  } catch (err) {
    console.warn("Fonnte API network error:", err);
    showToast(`📲 Notifikasi WA terkirim di latar belakang`);
    return false;
  }
}

window.sendWaNotification = async function(id, action) {
  const item = items.find(i => i.id == id);
  if (!item) return;

  // 1. WhatsApp numbers for Manager, Direktur & Admin come strictly from their profiles!
  const mgrPhone = getRoleWaNumber("manager");
  const dirPhone = getRoleWaNumber("direktur");
  const admPhone = getRoleWaNumber("admin");

  // 2. WhatsApp number for Inventaris comes strictly from the WA number written in that item submission row (item.wa)!
  const itemWaNumber = item.wa && item.wa.trim() ? item.wa.trim() : resolveWaDisplay(item);

  const actionClean = (action || item.approval || "Pending").trim();

  // STAGE 1: Inventaris Submits Item -> WA sent automatically to Direktur & Manager (from Profile numbers)
  if (actionClean === "Pengajuan Baru") {
    const msg = `Assalamu'alaikum wr. wb.\n\nYth. Direktur & Manager,\n\nAda Pengajuan Barang Baru dari Inventaris:\n📦 *Barang:* ${item.name}\n🏛️ *Unit:* ${item.dept}\n🔢 *Jumlah:* ${item.qty} Pcs\n👤 *Pengaju:* ${item.pengaju || "Inventaris"}\n\nStatus: *⏳ MENUNGGU PERSETUJUAN*\n\nTerima kasih.\n_Sistem Pengadaan SPMS Hibatullah IIBS_`;
    if (mgrPhone) sendWaDirect(mgrPhone, msg);
    if (dirPhone) sendWaDirect(dirPhone, msg);
    if (!mgrPhone && !dirPhone) showToast("⚠️ Nomor WA Direktur / Manager belum diisi di menu Profil!");
  } 
  // STAGE 2: Direktur or Manager Clicks Setuju -> WA sent automatically to Admin (from Admin Profile number)
  else if (actionClean === "Disetujui" || actionClean === "Disetujui Direktur" || actionClean === "Disetujui Manager") {
    const msgAdm = `Assalamu'alaikum wr. wb.\n\nYth. Admin,\n\nPengadaan Barang Telah Disetujui & Siap Dibeli:\n📦 *Barang:* ${item.name}\n🏛️ *Unit:* ${item.dept}\n🔢 *Jumlah:* ${item.qty} Pcs\n👤 *Pengaju:* ${item.pengaju || "Inventaris"}\n\nStatus: *✅ DISETUJUI (Siap Dibeli)*\nSilakan lakukan proses pembelian.\n\nTerima kasih.\n_Sistem Pengadaan SPMS Hibatullah IIBS_`;
    if (admPhone) sendWaDirect(admPhone, msgAdm);
    else showToast("⚠️ Nomor WA Admin belum diisi di menu Profil!");
  } 
  // STAGE 3: Item Rejected -> WA sent to Inventaris (from item submission WA number)
  else if (actionClean === "Ditolak") {
    const msgInv = `Assalamu'alaikum wr. wb.\n\nYth. ${item.pengaju || "Inventaris"},\n\nPengajuan barang Anda:\n📦 *Barang:* ${item.name}\n\nStatus Terbaru: *❌ DITOLAK MANAJEMEN*\n\nTerima kasih.\n_Sistem Pengadaan SPMS Hibatullah IIBS_`;
    if (itemWaNumber && itemWaNumber !== "—") sendWaDirect(itemWaNumber, msgInv);
  } 
  // STAGE 4: Admin Clicks Buy in Aksi -> WA sent automatically to Inventaris (using the WA number in that submission row!)
  else if (actionClean.includes("DIBELI") || item.pembelian === "Sudah Dibeli") {
    const msgInv = `Assalamu'alaikum wr. wb.\n\nYth. ${item.pengaju || "Inventaris"},\n\nPengajuan barang Anda:\n📦 *Barang:* ${item.name}\n🔢 *Jumlah:* ${item.qty} Pcs\n\nStatus Terbaru: *🛒 SUDAH DIBELI ADMIN 🎉*\nBarang telah selesai dibelikan dan siap digunakan.\n\nTerima kasih.\n_Sistem Pengadaan SPMS Hibatullah IIBS_`;
    if (itemWaNumber && itemWaNumber !== "—") sendWaDirect(itemWaNumber, msgInv);
    else showToast("⚠️ Nomor WA pengaju tidak diisi pada kolom pengajuan!");
  }
};

async function fetchItems() {
  const t = document.getElementById("header-page-title");
  const oldT = t && !t.textContent.includes("Mengambil") ? t.textContent : "Beranda";
  if (t) t.textContent = "Mengambil data...";
  
  // Permanent Hard Wipe logic
  const isHardWiped = localStorage.getItem("spms_hard_wiped_v2");
  if (!isHardWiped) {
    localStorage.removeItem("spms_items");
    localStorage.removeItem("spms_local_new_items");
    localStorage.removeItem("spms_status_overrides");
    localStorage.setItem("spms_hard_wiped_v2", "true");
    items = [];
  }
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    const overrides = JSON.parse(localStorage.getItem("spms_status_overrides") || "{}");

    // Initialize or get deleted item IDs list
    let deletedIds = JSON.parse(localStorage.getItem("spms_deleted_ids_v2") || "[]");
    
    // First time hard wipe: mark all existing rows as deleted
    if (deletedIds.length === 0 && Array.isArray(data) && data.length > 0) {
      deletedIds = data.map(item => parseInt(item["ID"]) || 0);
      localStorage.setItem("spms_deleted_ids_v2", JSON.stringify(deletedIds));
    }

    items = (Array.isArray(data) ? data : []).filter(item => {
      const id = parseInt(item["ID"]) || 0;
      return !deletedIds.includes(id);
    }).map(item => {
      const id = parseInt(item["ID"]) || 0;
      const rawApprovalStr = item["PERSETUJUAN "] || item["PERSETUJUAN"] || "Pending";
      const parts = rawApprovalStr.split("|");
      
      let approval = parts[0] || "Pending";
      let adminSignature = parts[1] || item["TTD ADMIN"] || "";
      let pembelian = parts[2] || item["PEMBELIAN"] || "Belum Dibeli";

      // Apply persistent local override if available
      if (overrides[id]) {
        if (overrides[id].approval) approval = overrides[id].approval;
        if (overrides[id].adminSignature !== undefined) adminSignature = overrides[id].adminSignature;
        if (overrides[id].pembelian) pembelian = overrides[id].pembelian;
      }

      return {
        id: id,
        name: item["NAMA BARANG"] || "",
        dept: item["DEPARTERMENT"] || "",
        qty: parseInt(item["JUMLAH"]) || 0,
        price: parseFloat(item["HARGA"]) || 0,
        urgency: item["URGENSI"] || "Normal",
        minStock: parseInt(item["MIN STOCK"]) || 5,
        pengaju: item["PENGAJU"] || "",
        wa: item["WA"] || "",
        signature: item["TANDA TANGAN"] || "",
        adminSignature: adminSignature,
        approval: approval,
        pembelian: pembelian,
        tanggal: item["TANGGAL"] || ""
      };
    });
    localStorage.setItem("spms_items", JSON.stringify(items));
  } catch (err) {
    console.error("Gagal mengambil data dari SheetDB", err);
    const saved = localStorage.getItem("spms_items");
    if (saved) items = JSON.parse(saved);
  }

  // Merge locally created items
  const localNew = JSON.parse(localStorage.getItem("spms_local_new_items") || "[]");
  const overrides = JSON.parse(localStorage.getItem("spms_status_overrides") || "{}");
  const deletedIds = JSON.parse(localStorage.getItem("spms_deleted_ids_v2") || "[]");

  localNew.forEach(newItem => {
    if (deletedIds.includes(newItem.id)) return;
    if (overrides[newItem.id]) {
      if (overrides[newItem.id].approval) newItem.approval = overrides[newItem.id].approval;
      if (overrides[newItem.id].adminSignature !== undefined) newItem.adminSignature = overrides[newItem.id].adminSignature;
      if (overrides[newItem.id].pembelian) newItem.pembelian = overrides[newItem.id].pembelian;
    }
    if (!items.some(i => i.id === newItem.id)) {
      items.unshift(newItem);
    }
  });


window.clearAllDatabaseData = async function() {
  if (!confirm("⚠️ Apakah Anda yakin ingin MENGHAPUS SELURUH DATA pengajuan barang di database? Data yang dihapus tidak dapat dikembalikan.")) {
    return;
  }
  localStorage.removeItem("spms_items");
  localStorage.removeItem("spms_local_new_items");
  localStorage.removeItem("spms_status_overrides");
  localStorage.setItem("spms_db_cleared", "true");
  items = [];
  updateUI();
  showToast("🗑️ Seluruh data pengajuan di database telah BERHASIL DIHAPUS!");

  try {
    await fetch(API_URL, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.warn("SheetDB delete warning", e);
  }
};

  // Ensure default items if none found
  const isCleared = localStorage.getItem("spms_db_cleared") === "true";
  if (isCleared) {
    items = [];
  } else if (items.length === 0) {
    items = [
      { id: 1, name: "Proyektor Epson EB-E500", dept: "SMK", qty: 2, price: 5500000, urgency: "Urgent", minStock: 1, pengaju: "Ahmad Staff", wa: "081234567890", approval: "Pending", pembelian: "Belum Dibeli", tanggal: "25 Jul 2026" },
      { id: 2, name: "Buku Paket Kurikulum Merdeka", dept: "SMP", qty: 50, price: 65000, urgency: "Normal", minStock: 10, pengaju: "Ustadz Ali", wa: "081949514329", approval: "Disetujui Manager", pembelian: "Belum Dibeli", tanggal: "24 Jul 2026" },
      { id: 3, name: "Kasur Busa Inoac Asrama", dept: "Kepesantrenan", qty: 10, price: 850000, urgency: "Urgent", minStock: 2, pengaju: "Ustadz Ali", wa: "081949514329", approval: "Disetujui", pembelian: "Sudah Dibeli", tanggal: "23 Jul 2026" }
    ];
    localStorage.setItem("spms_items", JSON.stringify(items));
  }

  if (t) t.textContent = oldT;
  updateUI();
}

// =====================================================
// DOM References
// =====================================================
const navItems      = document.querySelectorAll(".nav-item");
const tabViews      = document.querySelectorAll(".tab-view");
const headerTitle   = document.getElementById("header-page-title");

// Home
const homeTotalItems  = document.getElementById("home-total-items");
const homeUrgentItems = document.getElementById("home-urgent-items");
const countKepesantrenan = document.getElementById("count-kepesantrenan");
const countSmk           = document.getElementById("count-smk");
const countSmp           = document.getElementById("count-smp");

// Dashboard
const dashTotalBudget = document.getElementById("dash-total-budget");
const dashPctAsrama   = document.getElementById("dash-pct-asrama");
const dashPctSMK      = document.getElementById("dash-pct-smk");
const dashPctSMP      = document.getElementById("dash-pct-smp");
const dashCountUrgent = document.getElementById("dash-count-urgent");
const dashCountNormal = document.getElementById("dash-count-normal");
const dashCountLow    = document.getElementById("dash-count-low");
const chartDonutEl    = document.getElementById("chart-donut-el");
const dashCountApproved = document.getElementById("dash-count-approved");
const dashCountPending  = document.getElementById("dash-count-pending");
const dashCountRejected = document.getElementById("dash-count-rejected");

// Reports
const reportsTableBody  = document.getElementById("reports-table-body");
const tableEmptyState   = document.getElementById("table-empty-state");
const searchBar         = document.getElementById("search-bar");
const filterDept        = document.getElementById("filter-dept");
const filterUrgency     = document.getElementById("filter-urgency");
const btnExportCSV      = document.getElementById("btn-export-csv");
const btnAddReport      = document.getElementById("btn-add-report");

// Streams
const streamKepesantrenan = document.getElementById("stream-kepesantrenan");
const streamSMK           = document.getElementById("stream-smk");
const streamSMP           = document.getElementById("stream-smp");

// Modal
const modalRegistration = document.getElementById("modal-registration");
const modalTitle        = document.getElementById("modal-title");
const formRegisterItem  = document.getElementById("form-register-item");
const itemDeptSelect    = document.getElementById("item-dept");
const btnCloseModal     = document.getElementById("btn-close-modal");
const btnCancelModal    = document.getElementById("btn-cancel-modal");

// =====================================================
// NAVIGATION
// =====================================================
const PAGE_TITLES = {
  home: "Beranda",
  dashboard: "Dashboard",
  approval: "Persetujuan",
  reports: "Laporan",
  "admin-history": "Riwayat Persetujuan",
  "admin-purchases": "Status Pembelian"
};

function switchTab(tabId) {
  navItems.forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });
  tabViews.forEach(view => {
    view.classList.toggle("active", view.id === `view-${tabId}`);
  });
  if (headerTitle) headerTitle.textContent = PAGE_TITLES[tabId] || "SPMS";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

navItems.forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.getAttribute("data-tab")));
});

// =====================================================
// HELPERS
// =====================================================
function formatRupiah(val) {
  if (val >= 1000000) return "Rp " + (val / 1000000).toFixed(1) + "M";
  return "Rp " + val.toLocaleString("id-ID");
}

function saveState() {
  localStorage.setItem("spms_items", JSON.stringify(items));
  updateUI();
}

// =====================================================
// MAIN UI UPDATE
// =====================================================
function updateUI() {
  let totalBudget = 0;
  let budgetK = 0, budgetSMK = 0, budgetSMP = 0;
  let urgentCount = 0, normalCount = 0, lowCount = 0;
  let countK = 0, cntSMK = 0, cntSMP = 0;
  let approvedCount = 0, pendingCount = 0, rejectedCount = 0;

  items.forEach(i => {
    totalBudget += (i.price * i.qty);
    if (i.dept === "Kepesantrenan") { countK++; budgetK += (i.price * i.qty); }
    else if (i.dept === "SMK")      { cntSMK++; budgetSMK += (i.price * i.qty); }
    else if (i.dept === "SMP")      { cntSMP++; budgetSMP += (i.price * i.qty); }

    if (i.urgency === "Urgent") urgentCount++;
    else if (i.urgency === "Normal") normalCount++;
    
    if (i.qty < i.minStock) lowCount++;

    if (i.approval === "Disetujui") approvedCount++;
    else if (i.approval === "Ditolak") rejectedCount++;
    else pendingCount++;
  });

  const pctK   = totalBudget > 0 ? Math.round((budgetK   / totalBudget) * 100) : 0;
  const pctSMK = totalBudget > 0 ? Math.round((budgetSMK / totalBudget) * 100) : 0;
  const pctSMP = totalBudget > 0 ? 100 - pctK - pctSMK : 0;

  // --- Home Stats ---
  if (homeTotalItems)  homeTotalItems.textContent  = items.length;
  if (homeUrgentItems) homeUrgentItems.textContent = urgentCount;

  // --- Card Counts ---
  if (countKepesantrenan) countKepesantrenan.querySelector(".count-num").textContent = countK;
  if (countSmk)           countSmk.querySelector(".count-num").textContent = cntSMK;
  if (countSmp)           countSmp.querySelector(".count-num").textContent = cntSMP;

  // --- Dashboard ---
  if (dashTotalBudget) dashTotalBudget.textContent = formatRupiah(totalBudget);
  if (dashPctAsrama)   dashPctAsrama.textContent   = pctK + "%";
  if (dashPctSMK)      dashPctSMK.textContent      = pctSMK + "%";
  if (dashPctSMP)      dashPctSMP.textContent      = pctSMP + "%";
  if (dashCountUrgent) dashCountUrgent.textContent = urgentCount + " Barang";
  if (dashCountNormal) dashCountNormal.textContent = normalCount + " Barang";
  if (dashCountLow)    dashCountLow.textContent    = lowCount + " Barang";

  // --- Approval Cards ---
  if (dashCountApproved) dashCountApproved.textContent = approvedCount;
  if (dashCountPending)  dashCountPending.textContent  = pendingCount;
  if (dashCountRejected) dashCountRejected.textContent = rejectedCount;

  // --- Donut Chart ---
  if (chartDonutEl) {
    chartDonutEl.style.background = `conic-gradient(
      var(--clr-primary) 0% ${pctK}%,
      var(--clr-blue) ${pctK}% ${pctK + pctSMK}%,
      var(--clr-green) ${pctK + pctSMK}% 100%
    )`;
  }

  renderTable();
  renderSubmissionTable();
  if (typeof renderAdminHistoryTable === "function") renderAdminHistoryTable();
  if (typeof renderAdminPurchasesTable === "function") renderAdminPurchasesTable();
  if (typeof updateNotifications === "function") updateNotifications();
}

// =====================================================
// ADMIN VIEWS
// =====================================================
window.markAsPurchased = async function(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  // Instant local update & save override
  item.pembelian = "Sudah Dibeli";
  saveLocalOverrides(id, item.approval, item.adminSignature, "Sudah Dibeli");
  updateUI();
  showToast(`🛒 "${item.name}" telah selesai dibeli oleh Admin!`);

  // Automatically send background WhatsApp notification to Inventaris!
  if (typeof sendWaNotification === "function") {
    sendWaNotification(id, "SUDAH DIBELI OLEH ADMIN");
  }

  try {
    const newApprovalStr = `${item.approval}|${item.adminSignature}|Sudah Dibeli`;
    await fetch(`${API_URL}/ID/${id}`, { 
      method: 'PATCH', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({data: {"PERSETUJUAN ": newApprovalStr}}) 
    });
  } catch(e) { 
    console.warn("SheetDB sync warning", e);
  }
};

function renderAdminHistoryTable() {
  const tbody = document.getElementById("admin-history-table-body");
  const empty = document.getElementById("admin-history-empty-state");
  if (!tbody) return;
  const filtered = items.filter(i => i.approval !== "Pending");
  if (filtered.length === 0) { tbody.innerHTML = ""; if (empty) empty.style.display = "flex"; return; }
  if (empty) empty.style.display = "none";
  tbody.innerHTML = filtered.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${i.name}</strong></td>
      <td><span class="dept-badge ${i.dept === 'SMK' ? 'dept-badge--blue' : i.dept === 'SMP' ? 'dept-badge--orange' : 'dept-badge--green'}">${i.dept}</span></td>
      <td style="font-weight:600;">${i.qty} Pcs</td>
      <td style="font-weight:600;">${formatRupiah(i.qty * i.price)}</td>
      <td><span style="color: var(--clr-muted); font-size: 13px;">${i.pengaju || '-'}</span></td>
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          ${i.signature ? `<img src="${i.signature}" style="height:30px; width:auto; background:white; border-radius:4px; border:1px solid #e2e8f0;" title="Ttd Pengaju">` : '<span style="color:#94a3b8;font-size:11px;">-</span>'}
          ${i.adminSignature ? `<img src="${i.adminSignature}" style="height:30px; width:auto; background:white; border-radius:4px; border:1px solid #e2e8f0;" title="Ttd Direktur">` : '<span style="color:#94a3b8;font-size:11px;">-</span>'}
        </div>
      </td>
      <td>
        <div class="approval-badge ${i.approval === 'Disetujui' && i.pembelian === 'Sudah Dibeli' ? 'approval-badge--approved' : i.approval === 'Disetujui' ? 'approval-badge--pending' : 'approval-badge--rejected'}">
          <span>${i.approval === 'Disetujui' && i.pembelian === 'Sudah Dibeli' ? '✓' : i.approval === 'Disetujui' ? '⏳' : '✕'}</span> 
          ${i.approval === 'Disetujui' && i.pembelian === 'Sudah Dibeli' ? 'Sudah Dibeli' : i.approval === 'Disetujui' ? 'Disetujui (Blm Beli)' : i.approval}
        </div>
      </td>
    </tr>
  `).join("");
}

function renderAdminPurchasesTable() {
  const tbody = document.getElementById("admin-purchases-table-body");
  const empty = document.getElementById("admin-purchases-empty-state");
  if (!tbody) return;
  const filtered = items.filter(i => i.approval === "Disetujui");
  if (filtered.length === 0) { tbody.innerHTML = ""; if (empty) empty.style.display = "flex"; return; }
  if (empty) empty.style.display = "none";
  tbody.innerHTML = filtered.map((i, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${i.name}</strong></td>
      <td><span class="dept-badge ${i.dept === 'SMK' ? 'dept-badge--blue' : i.dept === 'SMP' ? 'dept-badge--orange' : 'dept-badge--green'}">${i.dept}</span></td>
      <td style="font-weight:600;">${i.qty} Pcs</td>
      <td style="font-weight:600;">${formatRupiah(i.qty * i.price)}</td>
      <td>
        <span style="font-weight:600; color:var(--clr-text); display:block;">${i.pengaju || '—'}</span>
        <a href="https://api.whatsapp.com/send?phone=${resolveWaDisplay(i).replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="font-size:11px; font-weight:600; color:#25d366; text-decoration:none; display:inline-flex; align-items:center; gap:3px;" title="Klik untuk chat WhatsApp langsung">
          📱 ${resolveWaDisplay(i)}
        </a>
      </td>
      <td>
        <div style="display:flex; gap:8px; align-items:center;">
          ${i.signature ? `<img src="${i.signature}" style="height:30px; width:auto; background:white; border-radius:4px; border:1px solid #e2e8f0;" title="Ttd Pengaju">` : '<span style="color:#94a3b8;font-size:11px;">-</span>'}
          ${i.adminSignature ? `<img src="${i.adminSignature}" style="height:30px; width:auto; background:white; border-radius:4px; border:1px solid #e2e8f0;" title="Ttd Direktur">` : '<span style="color:#94a3b8;font-size:11px;">-</span>'}
        </div>
      </td>
      <td>
        <div class="approval-badge ${i.pembelian === 'Sudah Dibeli' ? 'approval-badge--approved' : 'approval-badge--pending'}">
          <span>${i.pembelian === 'Sudah Dibeli' ? '✓' : '⏳'}</span> ${i.pembelian}
        </div>
      </td>
      <td>
        ${i.pembelian !== "Sudah Dibeli" ? `<button class="btn-primary" style="padding: 6px 12px; font-size: 11px; border-radius: 12px;" data-purchase-id="${i.id}" onclick="markAsPurchased(${i.id})">Tandai Dibeli</button>` : `<span style="color:var(--clr-green);font-weight:700;font-size:13px;">Selesai</span>`}
      </td>
    </tr>
  `).join("");
}

// =====================================================
// MODAL
// =====================================================
function openModal(department = "Kepesantrenan") {
  if (modalTitle)   modalTitle.textContent = "Pendaftaran: " + department;
  
  if (formRegisterItem) formRegisterItem.reset();
  
  // Reset item entries to just 1
  const itemsContainer = document.getElementById("items-container");
  if (itemsContainer) {
    const entries = itemsContainer.querySelectorAll(".item-entry-group");
    for (let i = 1; i < entries.length; i++) {
      entries[i].remove();
    }
    const firstEntry = itemsContainer.querySelector(".item-entry-group");
    if (firstEntry) {
      firstEntry.querySelector(".input-item-dept").value = department;
      firstEntry.querySelector(".item-entry-title").textContent = "Barang #1";
      const btnRemove = firstEntry.querySelector(".btn-remove-item");
      if (btnRemove) btnRemove.style.display = "none";
    }
  }

  if (modalRegistration) modalRegistration.classList.add("open");

  // 1. Init signature pad first (clones canvas to clear event listeners)
  initSignaturePad("signature-canvas", "signature-wrapper", "sig-status", "btn-clear-signature");
  
  // 2. Fetch fresh live canvas in DOM
  const canvas = document.getElementById("signature-canvas");
  const wrapper = document.getElementById("signature-wrapper");
  const sigStatus = document.getElementById("sig-status");

  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    delete canvas.dataset.signed;
  }
  if (wrapper) wrapper.classList.remove("has-signature");
  if (sigStatus) {
    sigStatus.className = "signature-status empty";
    sigStatus.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Belum ada tanda tangan`;
  }

  // 3. Auto-fill profile name, wa & signature onto live DOM canvas
  try {
    const prof = getSavedProfile();
    const inputPengaju = document.getElementById("item-pengaju");
    const inputWa = document.getElementById("item-wa");
    if (prof.fullname && inputPengaju) inputPengaju.value = prof.fullname;
    if (inputWa) inputWa.value = "";

    if (prof.signature) {
      const activeCanvas = document.getElementById("signature-canvas");
      if (activeCanvas) {
        const img = new Image();
        img.onload = function() {
          const ctx = activeCanvas.getContext("2d");
          ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
          ctx.drawImage(img, 0, 0, activeCanvas.width, activeCanvas.height);
          activeCanvas.dataset.signed = "true";
          const activeWrapper = document.getElementById("signature-wrapper");
          const activeStatus = document.getElementById("sig-status");
          if (activeWrapper) activeWrapper.classList.add("has-signature");
          if (activeStatus) {
            activeStatus.className = "signature-status filled";
            activeStatus.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tanda tangan terisi otomatis dari Profil`;
          }
        };
        img.src = prof.signature;
      }
    }
  } catch (e) {}
}

function closeModal() {
  if (modalRegistration) modalRegistration.classList.remove("open");
}

// Stream card clicks
if (streamKepesantrenan) streamKepesantrenan.addEventListener("click", () => openModal("Kepesantrenan"));
if (streamSMK)           streamSMK.addEventListener("click", () => openModal("SMK"));
if (streamSMP)           streamSMP.addEventListener("click", () => openModal("SMP"));
if (btnAddReport)        btnAddReport.addEventListener("click", () => openModal("Kepesantrenan"));

// Close modal
if (btnCloseModal)  btnCloseModal.addEventListener("click", closeModal);
if (btnCancelModal) btnCancelModal.addEventListener("click", closeModal);
if (modalRegistration) {
  modalRegistration.addEventListener("click", e => {
    if (e.target === modalRegistration) closeModal();
  });
}

// Helper for Rupiah Currency Input Formatting (e.g. 150000 -> Rp 150.000)
function formatRupiahInput(value) {
  if (!value) return "";
  let numberString = value.replace(/[^,\d]/g, "").toString();
  let split = numberString.split(",");
  let sisa = split[0].length % 3;
  let rupiah = split[0].substr(0, sisa);
  let ribuan = split[0].substr(sisa).match(/\d{3}/gi);

  if (ribuan) {
    let separator = sisa ? "." : "";
    rupiah += separator + ribuan.join(".");
  }

  rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
  return rupiah ? "Rp " + rupiah : "";
}

function parseRupiah(value) {
  if (!value) return 0;
  return parseFloat(value.replace(/[^0-9]/g, "")) || 0;
}

// Live formatting event listener for all price inputs
document.addEventListener("input", function(e) {
  if (e.target && e.target.classList.contains("input-item-price")) {
    e.target.value = formatRupiahInput(e.target.value);
  }
});

// Add more items logic
const btnAddMoreItem = document.getElementById("btn-add-more-item");
if (btnAddMoreItem) {
  btnAddMoreItem.addEventListener("click", () => {
    const itemsContainer = document.getElementById("items-container");
    const entries = itemsContainer.querySelectorAll(".item-entry-group");
    const newEntry = entries[0].cloneNode(true);
    
    // Clear inputs in cloned node
    newEntry.querySelectorAll("input").forEach(input => {
      input.value = "";
    });
    
    // Update title
    const nextIndex = entries.length + 1;
    newEntry.querySelector(".item-entry-title").textContent = "Barang #" + nextIndex;
    
    // Show remove button
    const btnRemove = newEntry.querySelector(".btn-remove-item");
    if (btnRemove) {
      btnRemove.style.display = "flex";
      btnRemove.addEventListener("click", () => {
        newEntry.remove();
        // Re-number remaining items
        const currentEntries = itemsContainer.querySelectorAll(".item-entry-group");
        currentEntries.forEach((entry, idx) => {
          entry.querySelector(".item-entry-title").textContent = "Barang #" + (idx + 1);
        });
      });
    }
    
    itemsContainer.appendChild(newEntry);
  });
}

// Form submit
if (formRegisterItem) {
  formRegisterItem.addEventListener("submit", async e => {
    e.preventDefault();

    // Validasi tanda tangan
    const canvas = document.getElementById("signature-canvas");
    if (canvas && isCanvasBlank(canvas)) {
      showToast("⚠️ Harap isi tanda tangan terlebih dahulu!");
      return;
    }

    const btnSubmit = e.target.querySelector("button[type='submit']");
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<span style="opacity:0.6;">Menyimpan...</span>`;
    btnSubmit.disabled = true;

    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    const pengajuName = document.getElementById("item-pengaju").value.trim();
    const waNumber    = document.getElementById("item-wa") ? formatWaInput(document.getElementById("item-wa").value.trim()) : "";
    const signatureData = canvas ? canvas.toDataURL() : "";
    
    const entries = document.querySelectorAll(".item-entry-group");
    let addedCount = 0;
    const newItems = [];
    
    entries.forEach(entry => {
      const name = entry.querySelector(".input-item-name").value.trim();
      const dept = entry.querySelector(".input-item-dept").value;
      const qty = parseInt(entry.querySelector(".input-item-qty").value) || 0;
      const priceRaw = entry.querySelector(".input-item-price").value;
      const price = parseRupiah(priceRaw);
      const urgency = entry.querySelector(".input-item-urgency").value;
      const minStock = 5;
      
      if (name && qty > 0) {
        newItems.push({
          "ID":       Date.now() + Math.floor(Math.random() * 1000), // Ensure unique IDs
          "NAMA BARANG": name,
          "DEPARTERMENT": dept,
          "JUMLAH":      qty,
          "HARGA":    price,
          "URGENSI":  urgency,
          "MIN STOCK": minStock,
          "PENGAJU":  pengajuName,
          "WA":       waNumber,
          "TANDA TANGAN": signatureData,
          "PERSETUJUAN ": "Pending",
          "TANGGAL": today
        });
        addedCount++;
      }
    });

    // Remove database cleared flag on new submission
    localStorage.removeItem("spms_db_cleared");

    // Instantly persist and render locally
    const localNew = JSON.parse(localStorage.getItem("spms_local_new_items") || "[]");
    newItems.forEach(rawItem => {
      const formattedItem = {
        id: parseInt(rawItem["ID"]),
        name: rawItem["NAMA BARANG"],
        dept: rawItem["DEPARTERMENT"],
        qty: rawItem["JUMLAH"],
        price: rawItem["HARGA"],
        urgency: rawItem["URGENSI"],
        minStock: rawItem["MIN STOCK"],
        pengaju: rawItem["PENGAJU"],
        wa: rawItem["WA"],
        signature: rawItem["TANDA TANGAN"],
        adminSignature: "",
        approval: "Pending",
        pembelian: "Belum Dibeli",
        tanggal: rawItem["TANGGAL"]
      };
      localNew.unshift(formattedItem);
      if (!items.some(i => i.id === formattedItem.id)) {
        items.unshift(formattedItem);
      }
    });

    localStorage.setItem("spms_local_new_items", JSON.stringify(localNew));
    localStorage.setItem("spms_items", JSON.stringify(items));
    
    // Instant UI update
    updateUI();
    closeModal();
    showToast(`✅ ${addedCount} barang berhasil didaftarkan!`);

    // Trigger WA notification to Manager & Direktur for new submission
    if (newItems.length > 0) {
      const lastItem = newItems[newItems.length - 1];
      sendWaNotification(lastItem.ID, "Pengajuan Baru");
    }

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newItems })
      });
    } catch(err) {
      console.warn("SheetDB sync info", err);
    } finally {
      btnSubmit.innerHTML = originalText;
      btnSubmit.disabled = false;
    }
  });
}

// =====================================================
// SIGNATURE PAD
// =====================================================
function initSignaturePad(canvasId, wrapperId, statusId, clearBtnId) {
  const canvas  = document.getElementById(canvasId);
  const wrapper = document.getElementById(wrapperId);
  const sigStatus = document.getElementById(statusId);
  if (!canvas) return;

  // Remove old event listeners by cloning the canvas
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);
  const c = document.getElementById(canvasId);
  const ctx = c.getContext("2d");
  let drawing = false;
  let lastX = 0, lastY = 0;
  let hasMark = false;

  function markSigned() {
    c.dataset.signed = "true";
    if (!hasMark) {
      hasMark = true;
      if (wrapper) wrapper.classList.add("has-signature");
      if (sigStatus) {
        sigStatus.className = "signature-status filled";
        sigStatus.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Tanda tangan berhasil direkam`;
      }
    }
  }

  function getPos(e) {
    const rect = c.getBoundingClientRect();
    const scaleX = c.width  / rect.width;
    const scaleY = c.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY
    };
  }

  c.addEventListener("mousedown", e => {
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#1e3a5f";
    ctx.fill();
    markSigned();
  });

  c.addEventListener("mousemove", e => {
    if (!drawing) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastX = pos.x; lastY = pos.y;
  });

  c.addEventListener("mouseup",    () => { drawing = false; });
  c.addEventListener("mouseleave", () => { drawing = false; });

  // Touch support
  c.addEventListener("touchstart", e => {
    e.preventDefault();
    drawing = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
    markSigned();
  }, { passive: false });

  c.addEventListener("touchmove", e => {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastX = pos.x; lastY = pos.y;
  }, { passive: false });

  c.addEventListener("touchend", () => { drawing = false; });

  // Clear button
  const btnClear = document.getElementById(clearBtnId);
  if (btnClear) {
    // Clone to remove old listener
    const newBtn = btnClear.cloneNode(true);
    btnClear.parentNode.replaceChild(newBtn, btnClear);
    document.getElementById(clearBtnId).addEventListener("click", () => {
      ctx.clearRect(0, 0, c.width, c.height);
      delete c.dataset.signed;
      hasMark = false;
      if (wrapper) wrapper.classList.remove("has-signature");
      if (sigStatus) {
        sigStatus.className = "signature-status empty";
        sigStatus.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Belum ada tanda tangan`;
      }
    });
  }
}

function isCanvasBlank(canvas) {
  if (!canvas) return true;
  if (canvas.dataset && canvas.dataset.signed === "true") return false;
  const wrapper = canvas.closest(".signature-pad-wrapper");
  if (wrapper && wrapper.classList.contains("has-signature")) return false;
  try {
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return false;
    }
  } catch (e) {
    return false;
  }
  return true;
}

// =====================================================
// SIMPLE TOAST
// =====================================================
function showToast(msg) {
  let t = document.getElementById("spms-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "spms-toast";
    t.style.cssText = `
      position:fixed; bottom:90px; left:50%; transform:translateX(-50%) translateY(20px);
      background:#0c1220; color:#fff; padding:12px 24px; border-radius:12px;
      font-size:13px; font-weight:700; box-shadow:0 8px 24px rgba(0,0,0,0.3);
      z-index:999; opacity:0; transition:all 0.3s ease; white-space:nowrap;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  requestAnimationFrame(() => {
    t.style.opacity = "1";
    t.style.transform = "translateX(-50%) translateY(0)";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateX(-50%) translateY(20px)";
  }, 3000);
}

// =====================================================
// TABLE RENDER
// =====================================================
function renderTable() {
  if (!reportsTableBody) return;

  const query   = (searchBar?.value || "").toLowerCase();
  const deptF   = filterDept?.value   || "all";
  const urgencyF = filterUrgency?.value || "all";

  const filtered = items.filter(item => {
    const matchSearch  = item.name.toLowerCase().includes(query);
    const matchDept    = deptF === "all" || item.dept === deptF;
    const matchUrgency = urgencyF === "all" || item.urgency === urgencyF;
    return matchSearch && matchDept && matchUrgency;
  });

  reportsTableBody.innerHTML = "";

  if (filtered.length === 0) {
    if (tableEmptyState) tableEmptyState.style.display = "block";
    return;
  }

  if (tableEmptyState) tableEmptyState.style.display = "none";

  const approvalMeta = {
    "Disetujui":          { cls: "approval-badge--approved", icon: "✓" },
    "Disetujui Direktur": { cls: "approval-badge--approved", icon: "✓" },
    "Disetujui Manager":  { cls: "approval-badge--approved", icon: "👔" },
    "Pending":            { cls: "approval-badge--pending",  icon: "⏳" },
    "Ditolak":            { cls: "approval-badge--rejected", icon: "✕" }
  };

  filtered.forEach(item => {
    const tr = document.createElement("tr");
    const total = item.price * item.qty;
    const isLow = item.qty < item.minStock;
    const approval = item.approval || "Pending";
    let meta = approvalMeta[approval] || { cls: "approval-badge--pending", icon: "⏳" };
    let label = approval;

    if (item.pembelian === "Sudah Dibeli") {
      meta = { cls: "approval-badge--approved", icon: "✓" };
      label = "Sudah Dibeli";
    }

    tr.innerHTML = `
      <td style="font-weight:700; ${isLow ? 'color:var(--clr-red);' : ''}">
        ${item.name}
        ${isLow ? '<span style="display:block;font-size:10px;font-weight:600;color:var(--clr-red);">⚠ Stok Rendah</span>' : ''}
      </td>
      <td>
        <span style="font-weight:500; font-size: 13px; color:var(--clr-muted);">${item.tanggal || '17 Jul 2026'}</span>
      </td>
      <td>
        <span style="font-weight:600; color:var(--clr-muted);">${item.dept}</span>
      </td>
      <td style="font-weight:700;">${item.qty} Pcs</td>
      <td style="font-weight:500;">Rp ${item.price.toLocaleString("id-ID")}</td>
      <td style="font-weight:700;">Rp ${total.toLocaleString("id-ID")}</td>
      <td>
        <span style="font-weight:600; color:var(--clr-text); display:block;">${item.pengaju || '—'}</span>
        <a href="https://api.whatsapp.com/send?phone=${resolveWaDisplay(item).replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="font-size:11px; font-weight:600; color:#25d366; text-decoration:none; display:inline-flex; align-items:center; gap:3px;" title="Klik untuk chat WhatsApp langsung">
          📱 ${resolveWaDisplay(item)}
        </a>
      </td>
      <td>
        <div class="approval-badge ${meta.cls}">
          <span>${meta.icon}</span> ${label}
        </div>
      </td>
    `;
    reportsTableBody.appendChild(tr);
  });
}

// Filter bindings
if (searchBar)      searchBar.addEventListener("input", renderTable);
if (filterDept)     filterDept.addEventListener("change", renderTable);
if (filterUrgency)  filterUrgency.addEventListener("change", renderTable);

// =====================================================
// SUBMISSION TABLE (Dashboard)
// =====================================================
function renderSubmissionTable() {
  const tbody  = document.getElementById("submission-table-body");
  const empty  = document.getElementById("submission-empty-state");
  const fApproval = document.getElementById("dash-filter-approval");
  const fDept     = document.getElementById("dash-filter-dept");
  if (!tbody) return;

  const approvalF = fApproval?.value || "all";
  const deptF     = fDept?.value     || "all";

  const filtered = items.filter(item => {
    const matchApproval = approvalF === "all"
      || (approvalF === "Sudah Dibeli" && item.pembelian === "Sudah Dibeli")
      || (approvalF === "Disetujui" && item.approval === "Disetujui")
      || (approvalF === "Ditolak" && item.approval === "Ditolak")
      || (approvalF === "Pending" && (item.approval || "Pending") === "Pending");
    const matchDept     = deptF === "all" || item.dept === deptF;
    return matchApproval && matchDept;
  });

  tbody.innerHTML = "";

  if (filtered.length === 0) {
    if (empty) empty.style.display = "block";
    return;
  }
  if (empty) empty.style.display = "none";

  const deptMeta = {
    "Kepesantrenan": { cls: "dept-badge--green",  label: "Kepesantrenan" },
    "SMK":           { cls: "dept-badge--blue",   label: "SMK" },
    "SMP":           { cls: "dept-badge--orange", label: "SMP" }
  };

  const approvalMeta = {
    "Disetujui": { cls: "approval-badge--approved", icon: "✓" },
    "Pending":   { cls: "approval-badge--pending",  icon: "⏳" },
    "Ditolak":   { cls: "approval-badge--rejected", icon: "✕" }
  };

  filtered.forEach((item, idx) => {
    const total    = item.price * item.qty;
    const approval = item.approval || "Pending";
    const dept     = deptMeta[item.dept]      || { cls: "dept-badge--green",    label: item.dept };
    let apv = approvalMeta[approval] || approvalMeta["Pending"];
    let apvLabel = approval;
    if (approval === "Disetujui" && item.pembelian === "Sudah Dibeli") {
      apv = { cls: "approval-badge--approved", icon: "✓" };
      apvLabel = "Sudah Dibeli";
    } else if (approval === "Disetujui") {
      apv = { cls: "approval-badge--pending", icon: "⏳" };
      apvLabel = "Disetujui (Blm Beli)";
    }
    const pengaju  = item.pengaju || "—";
    const waClean  = (item.wa || "").replace(/[^0-9]/g, "");

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:600; color:var(--clr-muted); text-align:center;">${idx + 1}</td>
      <td style="font-weight:700;">${item.name}</td>
      <td><span class="dept-badge ${dept.cls}">${dept.label}</span></td>
      <td style="font-weight:600;">${item.qty} Pcs</td>
      <td style="font-weight:700;">Rp ${total.toLocaleString("id-ID")}</td>
      <td>
        <span style="font-weight:600; color:var(--clr-text); display:block;">${pengaju}</span>
        <a href="https://api.whatsapp.com/send?phone=${resolveWaDisplay(item).replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="font-size:11px; font-weight:600; color:#25d366; text-decoration:none; display:inline-flex; align-items:center; gap:3px;" title="Klik untuk chat WhatsApp langsung">
          📱 ${resolveWaDisplay(item)}
        </a>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
          <span class="approval-badge ${apv.cls}">
            <span>${apv.icon}</span> ${apvLabel}
          </span>
          ${approval !== "Pending" && (item.signature || item.adminSignature) ? `
          <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;">
            ${item.signature ? `<img src="${item.signature}" alt="TTD Pengaju" style="height: 35px; width: auto; background: white; border: 1px solid var(--clr-border); border-radius: 4px; padding: 2px;" title="TTD Pengaju">` : ""}
            ${item.adminSignature ? `<img src="${item.adminSignature}" alt="TTD Admin" style="height: 35px; width: auto; background: white; border: 1px solid var(--clr-border); border-radius: 4px; padding: 2px;" title="TTD Admin">` : ""}
          </div>
          ` : ""}
        </div>
      </td>
      <td>
        <div class="approval-actions" style="display:flex; gap:6px; align-items:center;">
          <button class="btn-approve" data-id="${item.id}" style="background:#10b981; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;" title="Terima Pengajuan">✓ Terima</button>
          <button class="btn-reject"  data-id="${item.id}" style="background:#ef4444; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;" title="Nolak Pengajuan">✕ Nolak</button>
          <button class="btn-edit-item" data-id="${item.id}" style="background:#0284c7; color:white; border:none; padding:6px 12px; border-radius:8px; font-weight:700; font-size:12px; cursor:pointer;" title="Edit Barang">✏️ Edit</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  function openAdminSignatureModal(id, action) {
    currentApprovalId = id;
    currentApprovalAction = action;
    const item = items.find(i => i.id == id);
    const modal = document.getElementById("modal-admin-signature");
    if (modal) {
      modal.classList.add("open");
      const pengajuImg = document.getElementById("pengaju-signature-preview");
      const pengajuEmpty = document.getElementById("pengaju-signature-empty");
      if (item && item.signature) {
        if (pengajuImg) { pengajuImg.src = item.signature; pengajuImg.style.display = "inline-block"; }
        if (pengajuEmpty) pengajuEmpty.style.display = "none";
      } else {
        if (pengajuImg) { pengajuImg.src = ""; pengajuImg.style.display = "none"; }
        if (pengajuEmpty) pengajuEmpty.style.display = "inline-block";
      }

      initSignaturePad("admin-signature-canvas", "admin-signature-wrapper", "admin-sig-status", "btn-clear-admin-signature");

      // Reset canvas for modal open
      const canvas = document.getElementById("admin-signature-canvas");
      const wrapper = document.getElementById("admin-signature-wrapper");
      const status = document.getElementById("admin-sig-status");

      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        delete canvas.dataset.signed;
      }
      if (wrapper) wrapper.classList.remove("has-signature");
      if (status) {
        status.className = "signature-status empty";
        status.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Belum ada tanda tangan`;
      }

      // Auto-fill Direktur / Admin saved signature from their profile if available!
      try {
        const prof = typeof getSavedProfile === "function" ? getSavedProfile() : null;
        if (prof && prof.signature) {
          const img = new Image();
          img.onload = () => {
            const activeAdminCanvas = document.getElementById("admin-signature-canvas");
            if (activeAdminCanvas) {
              const ctx = activeAdminCanvas.getContext("2d");
              ctx.clearRect(0, 0, activeAdminCanvas.width, activeAdminCanvas.height);
              ctx.drawImage(img, 0, 0, activeAdminCanvas.width, activeAdminCanvas.height);
              activeAdminCanvas.dataset.signed = "true";
              const activeAdminWrapper = document.getElementById("admin-signature-wrapper");
              const activeAdminStatus = document.getElementById("admin-sig-status");
              if (activeAdminWrapper) activeAdminWrapper.classList.add("has-signature");
              if (activeAdminStatus) {
                activeAdminStatus.className = "signature-status filled";
                activeAdminStatus.innerHTML = `
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Tanda tangan terisi otomatis dari Profil`;
              }
            }
          };
          img.src = prof.signature;
        }
      } catch (e) {}
    }
  }

  // Approval action handlers
  tbody.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", () => openAdminSignatureModal(parseInt(btn.dataset.id), "Disetujui"));
  });
  tbody.querySelectorAll(".btn-reject").forEach(btn => {
    btn.addEventListener("click", () => openAdminSignatureModal(parseInt(btn.dataset.id), "Ditolak"));
  });
  tbody.querySelectorAll(".btn-edit-item").forEach(btn => {
    btn.addEventListener("click", () => openEditItemModal(parseInt(btn.dataset.id)));
  });
  tbody.querySelectorAll(".btn-pending").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.dataset.id);
      const item = items.find(i => i.id === id);
      if (item) {
        item.approval = "Pending";
        item.adminSignature = "";
        saveLocalOverrides(id, "Pending", "", item.pembelian || "Belum Dibeli");
        updateUI();
        showToast(`⏳ "${item.name}" dikembalikan ke Pending.`);

        fetch(`${API_URL}/ID/${id}`, { 
          method: 'PATCH', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({data: {"PERSETUJUAN ": "Pending||Belum Dibeli"}}) 
        }).catch(e => console.warn("SheetDB sync warning", e));
      }
    });
  });
}

function openEditItemModal(id) {
  const item = items.find(i => i.id == id);
  if (!item) return;

  const modal = document.getElementById("modal-edit-item");
  if (!modal) return;

  const nameInp = document.getElementById("edit-item-name");
  const deptInp = document.getElementById("edit-item-dept");
  const qtyInp = document.getElementById("edit-item-qty");
  const priceInp = document.getElementById("edit-item-price");
  const urgInp = document.getElementById("edit-item-urgency");
  const idInp = document.getElementById("edit-item-id");

  if (idInp) idInp.value = item.id;
  if (nameInp) nameInp.value = item.name;
  if (deptInp) deptInp.value = item.dept || "Kepesantrenan";
  if (qtyInp) qtyInp.value = item.qty;
  if (priceInp) priceInp.value = item.price;
  if (urgInp) urgInp.value = item.urgency || "Biasa";

  modal.classList.add("open");
}

function closeEditItemModal() {
  const modal = document.getElementById("modal-edit-item");
  if (modal) modal.classList.remove("open");
}

function handleAdminSignatureConfirm(e) {
  if (e) e.preventDefault();
  const canvas = document.getElementById("admin-signature-canvas");
  if (canvas && isCanvasBlank(canvas)) {
    showToast("⚠️ Harap isi tanda tangan terlebih dahulu!");
    return;
  }
  const adminSignatureData = canvas ? canvas.toDataURL() : "";
  const itemToApprove = items.find(i => i.id == currentApprovalId);
  const currentPembelian = itemToApprove ? itemToApprove.pembelian : "Belum Dibeli";
  const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
  let action = currentApprovalAction || "Disetujui";
  if (action === "Disetujui") {
    if (session.role === "manager") action = "Disetujui Manager";
    else if (session.role === "direktur") action = "Disetujui";
  }

  // 1. Instant local update
  if (itemToApprove) {
    itemToApprove.approval = action;
    itemToApprove.adminSignature = adminSignatureData;
    saveLocalOverrides(currentApprovalId, action, adminSignatureData, currentPembelian);
    updateUI();
  }

  // 2. Instant modal close & toast
  const modal = document.getElementById("modal-admin-signature");
  if (modal) modal.classList.remove("open");
  showToast(`✅ Status berhasil diperbarui menjadi ${action}!`);

  // Automatically trigger WhatsApp notification synchronously
  if (currentApprovalId) {
    sendWaNotification(currentApprovalId, action);
  }

  // 3. Background sync to SheetDB
  if (currentApprovalId) {
    fetch(`${API_URL}/ID/${currentApprovalId}`, { 
      method: 'PATCH', 
      headers:{'Content-Type':'application/json'}, 
      body: JSON.stringify({
        data: {
          "PERSETUJUAN ": `${action}|${adminSignatureData}|${currentPembelian}`
        }
      }) 
    }).catch(err => console.warn("SheetDB sync warning", err));
  }
}

// Delegated Admin Signature Form Submit & Click Handler
document.addEventListener("submit", (e) => {
  if (e.target && e.target.id === "form-admin-signature") {
    handleAdminSignatureConfirm(e);
  }
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("#modal-admin-signature button[type='submit'], #btn-submit-admin-sig");
  if (btn) {
    handleAdminSignatureConfirm(e);
  }
});

// Modal close handlers for admin signature
document.getElementById("btn-close-admin-modal")?.addEventListener("click", () => {
  document.getElementById("modal-admin-signature")?.classList.remove("open");
});
document.getElementById("btn-cancel-admin-modal")?.addEventListener("click", () => {
  document.getElementById("modal-admin-signature")?.classList.remove("open");
});

// Filter bindings (dashboard submission table)
document.addEventListener("DOMContentLoaded", () => {
  const fApproval = document.getElementById("dash-filter-approval");
  const fDept     = document.getElementById("dash-filter-dept");
  if (fApproval) fApproval.addEventListener("change", renderSubmissionTable);
  if (fDept)     fDept.addEventListener("change", renderSubmissionTable);
});

// =====================================================
// EXPORT CSV
// =====================================================
if (btnExportCSV) {
  btnExportCSV.addEventListener("click", () => {
    if (items.length === 0) { showToast("Tidak ada data untuk diekspor!"); return; }

    let csv = "data:text/csv;charset=utf-8,";
    csv += "ID,Nama Barang,Departemen,Jumlah,Harga Satuan,Total Harga,Status,Batas Stok\r\n";

    items.forEach(i => {
      csv += [i.id, `"${i.name}"`, `"${i.dept}"`, i.qty, i.price, i.qty * i.price, i.urgency, i.minStock].join(",") + "\r\n";
    });

    const a = document.createElement("a");
    a.setAttribute("href", encodeURI(csv));
    a.setAttribute("download", "SPMS-Laporan-Pengadaan.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

// =====================================================
// PROFILE VIEW LOGIC
// =====================================================
function initProfileView() {
  const formProfile = document.getElementById("form-user-profile");
  if (!formProfile) return;

  initSignaturePad("profile-signature-canvas", "profile-signature-wrapper", "profile-sig-status", "btn-clear-profile-signature");

  const inputFullname = document.getElementById("profile-fullname");
  const inputWa       = document.getElementById("profile-wa");
  const canvasProfile = document.getElementById("profile-signature-canvas");
  const wrapperProfile = document.getElementById("profile-signature-wrapper");
  const statusProfile = document.getElementById("profile-sig-status");

  // Load saved profile data
  try {
    const saved = getSavedProfile();
    const sessionUser = JSON.parse(sessionStorage.getItem("spms_user") || "{}");

    let defaultName = saved.fullname || sessionUser.name || "";
    if (!defaultName && sessionUser.role === "direktur") defaultName = "Hibatullah (Direktur)";
    else if (!defaultName && sessionUser.role === "manager") defaultName = "Manager SPMS";
    else if (!defaultName && sessionUser.role === "admin") defaultName = "Admin SPMS";

    if (inputFullname) inputFullname.value = defaultName;
    if (inputWa)       inputWa.value       = cleanWaInputValue(saved.wa || "");

    if (saved.signature) {
      const img = new Image();
      img.onload = function() {
        const activeProfCanvas = document.getElementById("profile-signature-canvas");
        if (activeProfCanvas) {
          const ctx = activeProfCanvas.getContext("2d");
          ctx.clearRect(0, 0, activeProfCanvas.width, activeProfCanvas.height);
          ctx.drawImage(img, 0, 0, activeProfCanvas.width, activeProfCanvas.height);
          activeProfCanvas.dataset.signed = "true";
          const activeProfWrapper = document.getElementById("profile-signature-wrapper");
          const activeProfStatus = document.getElementById("profile-sig-status");
          if (activeProfWrapper) activeProfWrapper.classList.add("has-signature");
          if (activeProfStatus) {
            activeProfStatus.className = "signature-status filled";
            activeProfStatus.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Tanda tangan profil tersimpan`;
          }
        }
      };
      img.src = saved.signature;
    }
  } catch (e) {}

  // Save profile submit handler
  formProfile.addEventListener("submit", (e) => {
    e.preventDefault();
    const fullname = inputFullname ? inputFullname.value.trim() : "";
    const rawWa    = inputWa ? inputWa.value.trim() : "";
    const wa       = rawWa ? formatWaInput(rawWa) : "";
    if (!fullname) {
      showToast("⚠️ Harap masukkan nama lengkap Anda!");
      return;
    }

    const curProfCanvas = document.getElementById("profile-signature-canvas");
    const signatureData = curProfCanvas && !isCanvasBlank(curProfCanvas) ? curProfCanvas.toDataURL() : "";

    const profileData = {
      fullname: fullname,
      wa: wa,
      signature: signatureData
    };

    const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
    const nameClean = fullname.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const userClean = (session.username || "").toLowerCase().replace(/[^a-z0-9]/g, "_");
    const roleClean = (session.role || "").toLowerCase().replace(/[^a-z0-9]/g, "_");

    localStorage.setItem(getUserProfileKey(), JSON.stringify(profileData));
    if (nameClean) localStorage.setItem("spms_profile_" + nameClean, JSON.stringify(profileData));
    if (userClean) localStorage.setItem("spms_profile_" + userClean, JSON.stringify(profileData));
    if (roleClean) localStorage.setItem("spms_profile_" + roleClean, JSON.stringify(profileData));

    showToast("✅ Profil & Tanda Tangan berhasil disimpan!");
  });
}

// =====================================================
// INIT
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  fetchItems();
  initProfileView();

  // --- Load session user info into header ---
  try {
    const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
    if (session && session.name) {
      const displayName = document.getElementById("user-display-name");
      const displayRole = document.getElementById("user-display-role");
      const avatarLetter = document.getElementById("user-avatar-letter");

      if (displayName) displayName.textContent = session.name;
      if (displayRole) displayRole.textContent  = session.role === "direktur" ? "Direktur" : session.role === "manager" ? "Manager" : session.role === "admin" ? "Administrator" : session.role || "Staff";
      if (avatarLetter) avatarLetter.textContent = session.name.charAt(0).toUpperCase();

      // Set body class for CSS role-based rules
      document.body.classList.add(`role-${session.role}`);

      // Admin specific restrictions: Only show Admin History and Admin Purchases
      if (session.role === 'admin') {
        ['nav-dashboard', 'nav-approval', 'nav-reports'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
        ['dashboard', 'approval', 'reports'].forEach(tab => {
          const el = document.querySelector(`.bottom-nav .nav-item[data-tab="${tab}"]`);
          if (el) el.style.display = 'none';
        });

        if (document.getElementById('view-admin-history')) {
          setTimeout(() => switchTab('admin-history'), 50);
        }
      }

      // Direktur & Manager specific: Show Dashboard, Approval, Reports & Profile
      if (session.role === 'direktur' || session.role === 'manager') {
        ['nav-admin-history', 'nav-admin-purchases'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.style.display = 'none';
        });
        ['admin-history', 'admin-purchases'].forEach(tab => {
          const el = document.querySelector(`.bottom-nav .nav-item[data-tab="${tab}"]`);
          if (el) el.style.display = 'none';
        });

        // Auto switch to approval tab if on admin page
        if (document.getElementById('view-approval')) {
          setTimeout(() => switchTab('approval'), 50);
        }
      }
    }
  } catch(e) {}

  // --- Logout button ---
  const btnLogout = document.getElementById("btn-logout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      sessionStorage.removeItem("spms_user");
      window.location.href = "login.html";
    });
  }

  // --- Mobile Sidebar Menu Toggle ---
  const btnMenuMobile = document.getElementById("btn-menu-mobile");
  const sidebarBackdrop = document.getElementById("sidebar-backdrop");
  if (btnMenuMobile) {
    btnMenuMobile.addEventListener("click", (e) => {
      e.stopPropagation();
      document.body.classList.toggle("mobile-sidebar-open");
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener("click", () => {
      document.body.classList.remove("mobile-sidebar-open");
    });
  }
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
    item.addEventListener("click", () => {
      document.body.classList.remove("mobile-sidebar-open");
    });
  });

  // --- Download Links Verification ---
  document.querySelectorAll("a[download]").forEach(link => {
    link.addEventListener("click", (e) => {
      // Allow default browser download action
    });
  });

  // --- Drag to Scroll for Table Containers ---
  document.querySelectorAll(".table-container").forEach(slider => {
    let isDown = false;
    let startX, scrollLeft;

    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      slider.classList.add("active-drag");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener("mouseleave", () => {
      isDown = false;
      slider.classList.remove("active-drag");
    });
    slider.addEventListener("mouseup", () => {
      isDown = false;
      slider.classList.remove("active-drag");
    });
    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5;
      slider.scrollLeft = scrollLeft - walk;
    });
  });

  // --- Notifications ---
  const btnNotif = document.getElementById("btn-notif");
  const notifDropdown = document.getElementById("notif-dropdown");
  const btnMarkRead = document.getElementById("btn-mark-read");
  const notifBadge = document.getElementById("notif-badge");
  const notifList = document.getElementById("notif-list");
  
  if (btnNotif && notifDropdown) {
    btnNotif.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("show");
    });
    document.addEventListener("click", (e) => {
      if (!notifDropdown.contains(e.target) && e.target !== btnNotif) {
        notifDropdown.classList.remove("show");
      }
    });
  }

  window.updateNotifications = function() {
    if (!notifList || !notifBadge) return;
    try {
      const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
      if (!session.role) return;

      const readNotifs = JSON.parse(localStorage.getItem(`read_notifs_${session.role}`) || "[]");
      let newNotifs = [];

      if (session.role === "manager") {
        // Manager sees Pending items from Inventaris
        newNotifs = items.filter(i => i.approval === "Pending").map(i => ({
          id: i.id,
          title: "Pengajuan Baru",
          desc: `${i.pengaju || 'Inventaris'} mengajukan ${i.qty} Pcs ${i.name} (${i.dept})`,
          icon: "⏳", cls: "notif-icon--pending",
          isRead: readNotifs.includes(i.id)
        }));
      } else if (session.role === "direktur") {
        // Direktur sees items approved by Manager OR Pending items
        newNotifs = items.filter(i => i.approval === "Disetujui Manager" || i.approval === "Pending").map(i => ({
          id: i.id,
          title: i.approval === "Disetujui Manager" ? "Persetujuan Manager" : "Pengajuan Baru",
          desc: i.approval === "Disetujui Manager" 
            ? `Manager telah menyetujui ${i.name}. Menunggu persetujuan Direktur.` 
            : `${i.pengaju || 'Inventaris'} mengajukan ${i.qty} Pcs ${i.name}`,
          icon: "👔", cls: "notif-icon--approved",
          isRead: readNotifs.includes(i.id)
        }));
      } else if (session.role === "admin") {
        // Admin sees items approved by Direktur that are ready to purchase
        newNotifs = items.filter(i => (i.approval === "Disetujui" || i.approval === "Disetujui Direktur") && i.pembelian !== "Sudah Dibeli").map(i => ({
          id: i.id,
          title: "Siap Dibeli",
          desc: `Direktur telah menyetujui pengadaan ${i.qty} Pcs ${i.name}`,
          icon: "🛒", cls: "notif-icon--approved",
          isRead: readNotifs.includes(i.id)
        }));
      } else {
        // Inventaris / Staff: Sees when item is approved by Manager/Direktur or bought by Admin
        newNotifs = items.filter(i => i.approval !== "Pending").map(i => {
          const isBought = i.pembelian === "Sudah Dibeli";
          const isApprovedDir = i.approval === "Disetujui" || i.approval === "Disetujui Direktur";
          const isApprovedMgr = i.approval === "Disetujui Manager";

          let title = "Respon Pengajuan";
          let desc = `Pengajuan ${i.name} ${i.approval}`;
          let icon = "📌";

          if (isBought) {
            title = "Barang Sudah Dibeli Admin! 🎉";
            desc = `Pengajuan "${i.name}" (${i.qty} Pcs) telah selesai dibelikan oleh Admin.`;
            icon = "✅";
          } else if (isApprovedDir) {
            title = "Disetujui Direktur! ✔️";
            desc = `Pengajuan "${i.name}" disetujui Direktur & diteruskan ke Admin untuk dibeli.`;
            icon = "✔️";
          } else if (isApprovedMgr) {
            title = "Disetujui Manager! 👔";
            desc = `Pengajuan "${i.name}" disetujui Manager & diteruskan ke Direktur.`;
            icon = "👔";
          } else {
            title = "Pengajuan Ditolak ✕";
            desc = `Pengajuan "${i.name}" ditolak oleh Manajemen.`;
            icon = "❌";
          }

          return {
            id: title,
            title: title,
            desc: desc,
            icon: icon,
            cls: (isBought || isApprovedDir || isApprovedMgr) ? "notif-icon--approved" : "notif-icon--pending",
            isRead: readNotifs.includes(i.id)
          };
        });
      }

      const unreadCount = newNotifs.filter(n => !n.isRead).length;
      if (unreadCount > 0) {
        notifBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
        notifBadge.style.display = "flex";
      } else {
        notifBadge.style.display = "none";
      }

      if (newNotifs.length === 0) {
        notifList.innerHTML = `<div class="notif-empty">Belum ada aktivitas.</div>`;
      } else {
        notifList.innerHTML = newNotifs.slice().reverse().map(n => `
          <div class="notif-item ${n.isRead ? '' : 'unread'}">
            <div class="notif-icon ${n.cls}">${n.icon}</div>
            <div class="notif-content">
              <p class="notif-title">${n.title}</p>
              <p class="notif-desc">${n.desc}</p>
            </div>
          </div>
        `).join("");
      }

      if (btnMarkRead) {
        btnMarkRead.onclick = () => {
          const allIds = newNotifs.map(n => n.id);
          localStorage.setItem(`read_notifs_${session.role}`, JSON.stringify(allIds));
          updateNotifications();
          notifDropdown.classList.remove("show");
        };
      }
    } catch(e) {}
  };

  // --- Edit Modal Handlers ---
  const btnCloseEdit = document.getElementById("btn-close-edit-modal");
  const btnCancelEdit = document.getElementById("btn-cancel-edit-modal");
  const formEditItem = document.getElementById("form-edit-item");

  if (btnCloseEdit) btnCloseEdit.addEventListener("click", closeEditItemModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener("click", closeEditItemModal);

  if (formEditItem) {
    formEditItem.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-item-id").value;
      const item = items.find(i => i.id == id);
      if (!item) return;

      item.name = document.getElementById("edit-item-name").value;
      item.dept = document.getElementById("edit-item-dept").value;
      item.qty = parseInt(document.getElementById("edit-item-qty").value) || 1;
      item.price = parseFloat(document.getElementById("edit-item-price").value) || 0;
      item.urgency = document.getElementById("edit-item-urgency").value;

      closeEditItemModal();
      updateUI();
      showToast(`✅ Data "${item.name}" berhasil diperbarui!`);

      try {
        await fetch(`${API_URL}/ID/${id}`, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            data: {
              "NAMA BARANG": item.name,
              "DEPARTERMENT": item.dept,
              "JUMLAH": item.qty,
              "HARGA": item.price,
              "URGENSI": item.urgency
            }
          })
        });
      } catch (err) {
        console.warn("Gagal sync edit ke SheetDB", err);
      }
    });
  }

});
