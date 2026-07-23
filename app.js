// =====================================================
// SPMS — App Logic
// =====================================================

// ---- State ----
const API_URL = "https://sheetdb.io/api/v1/foet3yghxpc6n";
let items = [];

async function fetchItems() {
  const t = document.getElementById("header-page-title");
  const oldT = t && !t.textContent.includes("Mengambil") ? t.textContent : "Beranda";
  if (t) t.textContent = "Mengambil data...";
  
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    items = data.map(item => ({
      id: parseInt(item["ID"]) || 0,
      name: item["NAMA BARANG"] || "",
      dept: item["DEPARTERMENT"] || "",
      qty: parseInt(item["JUMLAH"]) || 0,
      price: parseFloat(item["HARGA"]) || 0,
      urgency: item["URGENSI"] || "Normal",
      minStock: parseInt(item["MIN STOCK"]) || 0,
      pengaju: item["PENGAJU"] || "",
      signature: item["TANDA TANGAN"] || "",
      adminSignature: (item["PERSETUJUAN "] || "").split("|")[1] || item["TTD ADMIN"] || "",
      approval: (item["PERSETUJUAN "] || "Pending").split("|")[0],
      pembelian: (item["PERSETUJUAN "] || "").split("|")[2] || item["PEMBELIAN"] || "Belum Dibeli",
      tanggal: item["TANGGAL"] || ""
    }));
  } catch (err) {
    console.error("Gagal mengambil data dari SheetDB", err);
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
  try {
    const btn = document.querySelector(`button[data-purchase-id="${id}"]`);
    if (btn) { btn.innerHTML = "⏳.."; btn.disabled = true; }
    const newApprovalStr = `${item.approval}|${item.adminSignature}|Sudah Dibeli`;
    await fetch(`${API_URL}/ID/${id}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({data: {"PERSETUJUAN ": newApprovalStr}}) });
    showToast(`✅ "${item.name}" berhasil ditandai sudah dibeli.`);
    await fetchItems();
  } catch(e) { showToast("❌ Gagal update status pembelian!"); }
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
      <td><span style="color: var(--clr-muted); font-size: 13px;">${i.pengaju || '-'}</span></td>
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
  initSignaturePad("signature-canvas", "signature-wrapper", "sig-status", "btn-clear-signature");
  
  // Reset signature canvas & status
  const canvas = document.getElementById("signature-canvas");
  const wrapper = document.getElementById("signature-wrapper");
  const sigStatus = document.getElementById("sig-status");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  if (wrapper) wrapper.classList.remove("has-signature");
  if (sigStatus) {
    sigStatus.className = "signature-status empty";
    sigStatus.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Belum ada tanda tangan`;
  }
  initSignaturePad();
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

// Add more items logic
const btnAddMoreItem = document.getElementById("btn-add-more-item");
if (btnAddMoreItem) {
  btnAddMoreItem.addEventListener("click", () => {
    const itemsContainer = document.getElementById("items-container");
    const entries = itemsContainer.querySelectorAll(".item-entry-group");
    const newEntry = entries[0].cloneNode(true);
    
    // Clear inputs in cloned node
    newEntry.querySelectorAll("input").forEach(input => {
      if (input.type === "number" && input.className.includes("min-stock")) {
        input.value = 5;
      } else {
        input.value = "";
      }
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
    const signatureData = canvas ? canvas.toDataURL() : "";
    
    const entries = document.querySelectorAll(".item-entry-group");
    let addedCount = 0;
    const newItems = [];
    
    entries.forEach(entry => {
      const name = entry.querySelector(".input-item-name").value.trim();
      const dept = entry.querySelector(".input-item-dept").value;
      const qty = parseInt(entry.querySelector(".input-item-qty").value) || 0;
      const price = parseFloat(entry.querySelector(".input-item-price").value) || 0;
      const urgency = entry.querySelector(".input-item-urgency").value;
      const minStock = parseInt(entry.querySelector(".input-item-min-stock").value) || 0;
      
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
          "TANDA TANGAN": signatureData,
          "PERSETUJUAN ": "Pending",
          "TANGGAL": today
        });
        addedCount++;
      }
    });

    try {
      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newItems })
      });
      await fetchItems();
      closeModal();
      showToast(`✅ ${addedCount} barang berhasil didaftarkan!`);
    } catch(err) {
      console.error(err);
      showToast("❌ Gagal menyimpan data ke internet!");
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
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  return !data.some(channel => channel !== 0);
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
    "Disetujui": { cls: "approval-badge--approved", icon: "✓" },
    "Pending":   { cls: "approval-badge--pending",  icon: "⏳" },
    "Ditolak":   { cls: "approval-badge--rejected", icon: "✕" }
  };

  filtered.forEach(item => {
    const tr = document.createElement("tr");
    const total = item.price * item.qty;
    const isLow = item.qty < item.minStock;
    let meta = approvalMeta[item.approval || "Pending"];
    let label = item.approval || "Pending";
    if (item.approval === "Disetujui" && item.pembelian === "Sudah Dibeli") {
      meta = { cls: "approval-badge--approved", icon: "✓" };
      label = "Sudah Dibeli";
    } else if (item.approval === "Disetujui") {
      meta = { cls: "approval-badge--pending", icon: "⏳" };
      label = "Disetujui (Blm Beli)";
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
    const matchApproval = approvalF === "all" || (item.approval || "Pending") === approvalF;
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

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:600; color:var(--clr-muted); text-align:center;">${idx + 1}</td>
      <td style="font-weight:700;">${item.name}</td>
      <td><span class="dept-badge ${dept.cls}">${dept.label}</span></td>
      <td style="font-weight:600;">${item.qty} Pcs</td>
      <td style="font-weight:700;">Rp ${total.toLocaleString("id-ID")}</td>
      <td style="font-weight:500; color:var(--clr-muted);">${pengaju}</td>
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
        <div class="approval-actions">
          ${approval !== "Disetujui" ? `<button class="btn-approve" data-id="${item.id}" title="Setujui">✓ Setujui</button>` : ""}
          ${approval !== "Ditolak"   ? `<button class="btn-reject"  data-id="${item.id}" title="Tolak">✕ Tolak</button>`   : ""}
          ${approval !== "Pending"   ? `<button class="btn-pending" data-id="${item.id}" title="Pending">⏳ Pending</button>` : ""}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  let currentApprovalId = null;
  let currentApprovalAction = null;

  function openAdminSignatureModal(id, action) {
    currentApprovalId = id;
    currentApprovalAction = action;
    const item = items.find(i => i.id === id);
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
      // Reset canvas for modal open
      const canvas = document.getElementById("admin-signature-canvas");
      if (canvas) canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      const sigStatus = document.getElementById("admin-sig-status");
      if (sigStatus) {
        sigStatus.className = "signature-status empty";
        sigStatus.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Belum ada tanda tangan`;
      }
      initSignaturePad("admin-signature-canvas", "admin-signature-wrapper", "admin-sig-status", "btn-clear-admin-signature");
    }
  }

  // Admin Signature Submit
  const formAdminSig = document.getElementById("form-admin-signature");
  if (formAdminSig) {
    // Clone to remove old listener in case renderSubmissionTable is called multiple times
    const newForm = formAdminSig.cloneNode(true);
    formAdminSig.parentNode.replaceChild(newForm, formAdminSig);
    document.getElementById("form-admin-signature").addEventListener("submit", async (e) => {
      e.preventDefault();
      const canvas = document.getElementById("admin-signature-canvas");
      if (canvas && isCanvasBlank(canvas)) {
        showToast("⚠️ Harap isi tanda tangan admin!");
        return;
      }
      const adminSignatureData = canvas ? canvas.toDataURL() : "";
      const btnSubmit = e.target.querySelector("button[type='submit']");
      const origText = btnSubmit.innerHTML;
      btnSubmit.innerHTML = "⏳..";
      btnSubmit.disabled = true;

      try {
        const itemToApprove = items.find(i => i.id === currentApprovalId);
        const currentPembelian = itemToApprove ? itemToApprove.pembelian : "Belum Dibeli";
        await fetch(`${API_URL}/ID/${currentApprovalId}`, { 
          method: 'PATCH', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({
            data: {
              "PERSETUJUAN ": `${currentApprovalAction}|${adminSignatureData}|${currentPembelian}`
            }
          }) 
        });
        document.getElementById("modal-admin-signature").classList.remove("open");
        await fetchItems();
        showToast(`✅ Status berhasil diperbarui menjadi ${currentApprovalAction}!`);
      } catch(err) {
        showToast("❌ Gagal mengupdate data!");
      } finally {
        btnSubmit.innerHTML = origText;
        btnSubmit.disabled = false;
      }
    });
  }

  // Modal close handlers for admin signature
  document.getElementById("btn-close-admin-modal")?.addEventListener("click", () => {
    document.getElementById("modal-admin-signature").classList.remove("open");
  });
  document.getElementById("btn-cancel-admin-modal")?.addEventListener("click", () => {
    document.getElementById("modal-admin-signature").classList.remove("open");
  });

  // Approval action handlers
  tbody.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", () => openAdminSignatureModal(parseInt(btn.dataset.id), "Disetujui"));
  });
  tbody.querySelectorAll(".btn-reject").forEach(btn => {
    btn.addEventListener("click", () => openAdminSignatureModal(parseInt(btn.dataset.id), "Ditolak"));
  });
  tbody.querySelectorAll(".btn-pending").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.dataset.id);
      const item = items.find(i => i.id === id);
      if (item) {
        btn.innerHTML = "⏳..";
        try {
          await fetch(`${API_URL}/ID/${id}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({data: {"PERSETUJUAN ": "Pending||Belum Dibeli"}}) });
          await fetchItems();
          showToast(`⏳ "${item.name}" dikembalikan ke Pending.`);
        } catch(e) { showToast("❌ Gagal mengupdate data!"); }
      }
    });
  });
}

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
// INIT
// =====================================================
window.addEventListener("DOMContentLoaded", () => {
  fetchItems();

  // --- Load session user info into header ---
  try {
    const session = JSON.parse(sessionStorage.getItem("spms_user") || "{}");
    if (session && session.name) {
      const displayName = document.getElementById("user-display-name");
      const displayRole = document.getElementById("user-display-role");
      const avatarLetter = document.getElementById("user-avatar-letter");

      if (displayName) displayName.textContent = session.name;
      if (displayRole) displayRole.textContent  = session.role || "Staff";
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

      // Direktur specific restrictions: Hide Admin specific tabs
      if (session.role === 'direktur') {
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

      if (session.role === "direktur") {
        newNotifs = items.filter(i => i.approval === "Pending").map(i => ({
          id: i.id,
          title: "Pengajuan Baru",
          desc: `Inventaris mengajukan ${i.qty} Pcs ${i.name}`,
          icon: "⏳", cls: "notif-icon--pending",
          isRead: readNotifs.includes(i.id)
        }));
      } else if (session.role === "admin") {
        newNotifs = items.filter(i => i.approval === "Disetujui" && i.pembelian !== "Sudah Dibeli").map(i => ({
          id: i.id,
          title: "Siap Dibeli",
          desc: `Direktur menyetujui pembelian ${i.qty} Pcs ${i.name}`,
          icon: "🛒", cls: "notif-icon--approved",
          isRead: readNotifs.includes(i.id)
        }));
      } else {
        // Inventaris
        newNotifs = items.filter(i => i.approval !== "Pending").map(i => ({
          id: i.id,
          title: i.pembelian === "Sudah Dibeli" ? "Sudah Dibeli!" : "Respon Direktur",
          desc: i.pembelian === "Sudah Dibeli" ? `${i.name} telah selesai dibelikan Admin.` : `Pengajuan ${i.name} Anda ${i.approval}.`,
          icon: i.pembelian === "Sudah Dibeli" ? "✅" : (i.approval === "Disetujui" ? "✔️" : "❌"),
          cls: i.approval === "Disetujui" ? "notif-icon--approved" : "notif-icon--pending",
          isRead: readNotifs.includes(i.id)
        }));
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

});
