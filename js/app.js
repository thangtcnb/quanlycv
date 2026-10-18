import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBDuk8MGrZxHi9Q9cVWSa8KyX2fze3TTzI",
  authDomain: "qlcvph.firebaseapp.com",
  databaseURL: "https://qlcvph-default-rtdb.firebaseio.com",
  projectId: "qlcvph",
  storageBucket: "qlcvph.firebasestorage.app",
  messagingSenderId: "730585971673",
  appId: "1:730585971673:web:bad0d1fd8bf672153b37c8",
  measurementId: "G-4PEN2B2Q3E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// State Management
let allDispatches = []; // Raw list from Firebase
let currentEditId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

let deptChartInstance = null;
let typeChartInstance = null;

// DOM Elements - Tabs
const tabHomeBtn = document.getElementById("tabHomeBtn");
const tabStatsBtn = document.getElementById("tabStatsBtn");
const tabHomeContent = document.getElementById("tabHomeContent");
const tabStatsContent = document.getElementById("tabStatsContent");

// DOM Elements - Form
const form = document.getElementById("dispatchForm");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const dispatchIdInput = document.getElementById("dispatchId");
const soKyHieuInput = document.getElementById("soKyHieu");
const loaiCongVanInput = document.getElementById("loaiCongVan");

const unitLabel = document.getElementById("unitLabel");
const unitTextContainer = document.getElementById("unitTextContainer");
const unitInputText = document.getElementById("unitInputText");
const unitSelectContainer = document.getElementById("unitSelectContainer");
const unitSelectBox = document.getElementById("unitSelectBox");

const loaiVanBanInput = document.getElementById("loaiVanBan");
const ngayBanHanhInput = document.getElementById("ngayBanHanh");
const driveLinkInput = document.getElementById("driveLink");
const trichYeuInput = document.getElementById("trichYeu");

// DOM Elements - Table & Search
const searchInput = document.getElementById("searchInput");
const filterLoaiCongVan = document.getElementById("filterLoaiCongVan");
const dispatchTableBody = document.getElementById("dispatchTableBody");
const totalItemsBadge = document.getElementById("totalItemsBadge");
const paginationInfo = document.getElementById("paginationInfo");
const paginationControls = document.getElementById("paginationControls");

// DOM Elements - Statistics
const statStartDate = document.getElementById("statStartDate");
const statEndDate = document.getElementById("statEndDate");
const btnStatFilter = document.getElementById("btnStatFilter");
const btnStatReset = document.getElementById("btnStatReset");
const btnGenerateSampleData = document.getElementById("btnGenerateSampleData");

// Toast Notification Function
function showNotification(message, type = "success") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  const bgColor = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-rose-600" : "bg-blue-600";
  const icon = type === "success" ? "fa-circle-check" : type === "error" ? "fa-circle-xmark" : "fa-circle-info";

  toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 transition-all duration-300 transform translate-y-2 opacity-0 fade-in z-50`;
  toast.innerHTML = `
    <i class="fa-solid ${icon} text-lg"></i>
    <span class="text-xs font-semibold">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-2", "opacity-0");
  }, 10);

  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-y-2");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format Date Utility (YYYY-MM-DD to DD/MM/YYYY)
function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Escape HTML Helper
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Set Today default on date input
function setDefaultDate() {
  if (!ngayBanHanhInput.value) {
    const today = new Date().toISOString().split("T")[0];
    ngayBanHanhInput.value = today;
  }
}

// Switch Navigation Tabs
function setupNavigationTabs() {
  tabHomeBtn.addEventListener("click", () => {
    tabHomeBtn.classList.add("active");
    tabHomeBtn.classList.remove("text-indigo-200");
    tabHomeBtn.classList.add("text-white", "bg-white/10");

    tabStatsBtn.classList.remove("active", "text-white", "bg-white/10");
    tabStatsBtn.classList.add("text-indigo-200");

    tabHomeContent.classList.remove("hidden");
    tabStatsContent.classList.add("hidden");
  });

  tabStatsBtn.addEventListener("click", () => {
    tabStatsBtn.classList.add("active");
    tabStatsBtn.classList.remove("text-indigo-200");
    tabStatsBtn.classList.add("text-white", "bg-white/10");

    tabHomeBtn.classList.remove("active", "text-white", "bg-white/10");
    tabHomeBtn.classList.add("text-indigo-200");

    tabStatsContent.classList.remove("hidden");
    tabHomeContent.classList.add("hidden");

    runStatistics();
  });
}

// Dynamic Field Logic for "Công văn Đến" vs "Công văn Đi"
function updateDynamicUnitField() {
  const isDen = loaiCongVanInput.value === "Công văn Đến";

  if (isDen) {
    unitLabel.innerHTML = `Nơi ban hành công văn <span class="text-rose-500">*</span>`;
    unitTextContainer.classList.remove("hidden");
    unitSelectContainer.classList.add("hidden");

    unitInputText.setAttribute("required", "true");
    unitSelectBox.removeAttribute("required");
  } else {
    unitLabel.innerHTML = `Phòng ban ban hành <span class="text-rose-500">*</span>`;
    unitTextContainer.classList.add("hidden");
    unitSelectContainer.classList.remove("hidden");

    unitInputText.removeAttribute("required");
    unitSelectBox.setAttribute("required", "true");
  }
}

loaiCongVanInput.addEventListener("change", updateDynamicUnitField);

// Listen to Realtime Database
function initFirebaseListener() {
  const congVanRef = ref(database, "cong_van");

  onValue(congVanRef, (snapshot) => {
    const data = snapshot.val();
    allDispatches = [];

    if (data) {
      Object.keys(data).forEach((key) => {
        allDispatches.push({
          id: key,
          ...data[key]
        });
      });
    }

    // Sort newest first (by ngay_ban_hanh descending, then created_at descending)
    allDispatches.sort((a, b) => {
      if (b.ngay_ban_hanh !== a.ngay_ban_hanh) {
        return (b.ngay_ban_hanh || "").localeCompare(a.ngay_ban_hanh || "");
      }
      return (b.created_at || 0) - (a.created_at || 0);
    });

    renderDispatchList();
    runStatistics();
  }, (error) => {
    console.error("Firebase Read Error:", error);
    showNotification("Lỗi kết nối Firebase: " + error.message, "error");
  });
}

// Get Unit value according to document type
function getUnitValue() {
  if (loaiCongVanInput.value === "Công văn Đến") {
    return unitInputText.value.trim();
  } else {
    return unitSelectBox.value;
  }
}

// Form Submission Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const so_ky_hieu = soKyHieuInput.value.trim();
  const loai_cong_van = loaiCongVanInput.value;
  const unitVal = getUnitValue();
  const loai_van_ban = loaiVanBanInput.value.trim();
  const ngay_ban_hanh = ngayBanHanhInput.value;
  const trich_yeu = trichYeuInput.value.trim();
  const drive_link = driveLinkInput.value.trim();

  if (!so_ky_hieu || !loai_cong_van || !unitVal || !loai_van_ban || !ngay_ban_hanh || !trich_yeu) {
    showNotification("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
    return;
  }

  const dispatchData = {
    so_ky_hieu,
    loai_cong_van,
    phong_ban: unitVal,
    loai_van_ban,
    ngay_ban_hanh,
    trich_yeu,
    drive_link,
    created_at: currentEditId ? (allDispatches.find(item => item.id === currentEditId)?.created_at || Date.now()) : Date.now()
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang lưu...`;

  try {
    if (currentEditId) {
      const itemRef = ref(database, `cong_van/${currentEditId}`);
      await update(itemRef, dispatchData);
      showNotification("Cập nhật công văn thành công!");
      resetForm();
    } else {
      const congVanRef = ref(database, "cong_van");
      const newRef = push(congVanRef);
      await set(newRef, dispatchData);
      showNotification("Thêm công văn mới thành công!");
      resetForm();
    }
  } catch (error) {
    console.error("Save error:", error);
    showNotification("Lỗi khi lưu công văn: " + error.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = currentEditId
      ? `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật`
      : `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
  }
});

// Reset Form State
function resetForm() {
  form.reset();
  currentEditId = null;
  dispatchIdInput.value = "";
  formTitle.textContent = "Nhập Công Văn Mới";
  submitBtn.className = "w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center cursor-pointer";
  submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
  cancelEditBtn.classList.add("hidden");

  loaiCongVanInput.value = "Công văn Đến";
  updateDynamicUnitField();
  setDefaultDate();
}

cancelEditBtn.addEventListener("click", () => {
  resetForm();
  showNotification("Đã hủy chế độ chỉnh sửa", "info");
});

// Populate Form for Editing
window.editDispatch = function(id) {
  const item = allDispatches.find(d => d.id === id);
  if (!item) return;

  currentEditId = id;
  dispatchIdInput.value = id;
  soKyHieuInput.value = item.so_ky_hieu || "";
  loaiCongVanInput.value = item.loai_cong_van || "Công văn Đến";

  updateDynamicUnitField();

  if (item.loai_cong_van === "Công văn Đến") {
    unitInputText.value = item.phong_ban || "";
  } else {
    unitSelectBox.value = item.phong_ban || "Phòng Hành chính - Tài vụ";
  }

  loaiVanBanInput.value = item.loai_van_ban || "";
  ngayBanHanhInput.value = item.ngay_ban_hanh || "";
  trichYeuInput.value = item.trich_yeu || "";
  driveLinkInput.value = item.drive_link || "";

  formTitle.textContent = "Chỉnh Sửa Công Văn";
  submitBtn.className = "w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center cursor-pointer";
  submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật`;
  cancelEditBtn.classList.remove("hidden");

  document.getElementById("formSection").scrollIntoView({ behavior: "smooth" });
};

// Delete Dispatch
window.deleteDispatch = async function(id) {
  const item = allDispatches.find(d => d.id === id);
  if (!item) return;

  if (confirm(`Bạn có chắc chắn muốn xóa công văn số "${item.so_ky_hieu}"?`)) {
    try {
      const itemRef = ref(database, `cong_van/${id}`);
      await remove(itemRef);
      showNotification("Xóa công văn thành công!");
      if (currentEditId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Delete error:", error);
      showNotification("Lỗi khi xóa công văn: " + error.message, "error");
    }
  }
};

// Get Filtered Dispatches
function getFilteredDispatches() {
  const query = (searchInput.value || "").trim().toLowerCase();
  const selectedLoai = filterLoaiCongVan.value;

  return allDispatches.filter((item) => {
    const matchSearch =
      !query ||
      (item.so_ky_hieu && item.so_ky_hieu.toLowerCase().includes(query)) ||
      (item.trich_yeu && item.trich_yeu.toLowerCase().includes(query)) ||
      (item.loai_van_ban && item.loai_van_ban.toLowerCase().includes(query)) ||
      (item.phong_ban && item.phong_ban.toLowerCase().includes(query));

    const matchLoai = !selectedLoai || item.loai_cong_van === selectedLoai;

    return matchSearch && matchLoai;
  });
}

// Render Table with Pagination (Max 20 per page)
function renderDispatchList() {
  const filtered = getFilteredDispatches();
  totalItemsBadge.textContent = `${filtered.length} / ${allDispatches.length} văn bản`;

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const currentItems = filtered.slice(startIndex, endIndex);

  if (filtered.length === 0) {
    dispatchTableBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-12 text-center text-slate-400">
          <i class="fa-regular fa-folder-open text-3xl mb-2 block"></i>
          Không tìm thấy công văn nào phù hợp.
        </td>
      </tr>
    `;
    paginationInfo.textContent = "Hiển thị 0 - 0 trong tổng số 0 văn bản";
    paginationControls.innerHTML = "";
    return;
  }

  dispatchTableBody.innerHTML = currentItems.map((item, index) => {
    const isDen = item.loai_cong_van === "Công văn Đến";
    const badgeClass = isDen
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-purple-100 text-purple-800 border-purple-200";

    const rowNum = startIndex + index + 1;
    const hasDriveLink = item.drive_link && item.drive_link.trim() !== "";

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <td class="px-3 py-3 font-medium text-slate-500 text-center">${rowNum}</td>
        <td class="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
          ${escapeHtml(item.so_ky_hieu)}
        </td>
        <td class="px-3 py-3 whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeClass}">
            <i class="fa-solid ${isDen ? 'fa-inbox' : 'fa-paper-plane'} mr-1"></i>
            ${escapeHtml(item.loai_cong_van)}
          </span>
        </td>
        <td class="px-3 py-3 text-slate-700 max-w-[150px] truncate" title="${escapeHtml(item.phong_ban)}">
          ${escapeHtml(item.phong_ban)}
        </td>
        <td class="px-3 py-3 whitespace-nowrap text-slate-600">
          ${formatDate(item.ngay_ban_hanh)}
        </td>
        <td class="px-3 py-3 text-slate-800 max-w-[200px]">
          <p class="line-clamp-2" title="${escapeHtml(item.trich_yeu)}">
            ${escapeHtml(item.trich_yeu)}
          </p>
        </td>
        <td class="px-3 py-3 whitespace-nowrap text-center">
          ${hasDriveLink ? `
            <a href="${escapeHtml(item.drive_link)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition"
               title="Mở Google Drive Link">
              <i class="fa-brands fa-google-drive text-emerald-600 mr-1 text-xs"></i>
              Xem
            </a>
          ` : `
            <span class="text-slate-300 text-[11px] italic">Không</span>
          `}
        </td>
        <td class="px-3 py-3 whitespace-nowrap text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="editDispatch('${item.id}')"
                    class="p-1 text-amber-600 hover:bg-amber-50 rounded transition"
                    title="Sửa">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteDispatch('${item.id}')"
                    class="p-1 text-rose-600 hover:bg-rose-50 rounded transition"
                    title="Xóa">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Update Pagination Info
  paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${filtered.length} văn bản`;

  // Render Pagination Buttons
  renderPaginationControls(totalPages);
}

// Pagination Controls Renderer
function renderPaginationControls(totalPages) {
  let html = "";

  // Prev Button
  const prevDisabled = currentPage === 1 ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToPage(${currentPage - 1})" class="pagination-btn pagination-btn-default ${prevDisabled}" title="Trang trước">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
    </button>
  `;

  // Page Numbers
  for (let page = 1; page <= totalPages; page++) {
    // Show first page, last page, current page, and pages around current
    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
      const activeClass = page === currentPage ? "pagination-btn-active" : "pagination-btn-default";
      html += `
        <button onclick="goToPage(${page})" class="pagination-btn ${activeClass}">
          ${page}
        </button>
      `;
    } else if (page === currentPage - 2 || page === currentPage + 2) {
      html += `<span class="px-1 text-slate-400">...</span>`;
    }
  }

  // Next Button
  const nextDisabled = currentPage === totalPages ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToPage(${currentPage + 1})" class="pagination-btn pagination-btn-default ${nextDisabled}" title="Trang sau">
      <i class="fa-solid fa-chevron-right text-[10px]"></i>
    </button>
  `;

  paginationControls.innerHTML = html;
}

window.goToPage = function(page) {
  currentPage = page;
  renderDispatchList();
};

// Event Listeners for Filters
searchInput.addEventListener("input", () => {
  currentPage = 1;
  renderDispatchList();
});

filterLoaiCongVan.addEventListener("change", () => {
  currentPage = 1;
  renderDispatchList();
});

// Statistics Logic
function runStatistics() {
  const startDate = statStartDate.value;
  const endDate = statEndDate.value;

  let filtered = allDispatches;

  if (startDate) {
    filtered = filtered.filter(item => item.ngay_ban_hanh >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(item => item.ngay_ban_hanh <= endDate);
  }

  const totalCount = filtered.length;
  const denCount = filtered.filter(i => i.loai_cong_van === "Công văn Đến").length;
  const diCount = filtered.filter(i => i.loai_cong_van === "Công văn Đi").length;

  document.getElementById("statTotalCount").textContent = totalCount;
  document.getElementById("statDenCount").textContent = denCount;
  document.getElementById("statDiCount").textContent = diCount;

  // Breakdown by Units/Departments
  const unitCounts = {};

  filtered.forEach(item => {
    const unitName = (item.phong_ban || "Chưa rõ").trim();
    if (!unitCounts[unitName]) {
      unitCounts[unitName] = { total: 0, den: 0, di: 0 };
    }
    unitCounts[unitName].total++;
    if (item.loai_cong_van === "Công văn Đến") unitCounts[unitName].den++;
    if (item.loai_cong_van === "Công văn Đi") unitCounts[unitName].di++;
  });

  // Breakdown by Document Types
  const typeCounts = {};

  filtered.forEach(item => {
    const typeName = (item.loai_van_ban || "Chưa phân loại").trim();
    if (!typeCounts[typeName]) {
      typeCounts[typeName] = { total: 0, den: 0, di: 0 };
    }
    typeCounts[typeName].total++;
    if (item.loai_cong_van === "Công văn Đến") typeCounts[typeName].den++;
    if (item.loai_cong_van === "Công văn Đi") typeCounts[typeName].di++;
  });

  renderDeptTable(unitCounts);
  renderTypeTable(typeCounts);
  renderCharts(unitCounts, typeCounts);
}

function renderDeptTable(unitCounts) {
  const container = document.getElementById("statDeptTableBody");
  if (!container) return;

  const units = Object.keys(unitCounts).sort((a, b) => unitCounts[b].total - unitCounts[a].total);

  if (units.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-6 text-center text-slate-400 text-xs">
          Không có dữ liệu trong khoảng thời gian đã chọn.
        </td>
      </tr>
    `;
    return;
  }

  const rows = units.map(u => {
    const data = unitCounts[u];
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
        <td class="px-3 py-2 font-medium text-slate-800">${escapeHtml(u)}</td>
        <td class="px-3 py-2 text-center font-bold text-blue-600">${data.total}</td>
        <td class="px-3 py-2 text-center text-emerald-600">${data.den}</td>
        <td class="px-3 py-2 text-center text-purple-600">${data.di}</td>
      </tr>
    `;
  });

  container.innerHTML = rows.join("");
}

function renderTypeTable(typeCounts) {
  const container = document.getElementById("statTypeTableBody");
  if (!container) return;

  const types = Object.keys(typeCounts).sort((a, b) => typeCounts[b].total - typeCounts[a].total);

  if (types.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="px-3 py-6 text-center text-slate-400 text-xs">
          Không có dữ liệu loại văn bản.
        </td>
      </tr>
    `;
    return;
  }

  const rows = types.map(t => {
    const data = typeCounts[t];
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-xs">
        <td class="px-3 py-2 font-medium text-slate-800">${escapeHtml(t)}</td>
        <td class="px-3 py-2 text-center font-bold text-blue-600">${data.total}</td>
        <td class="px-3 py-2 text-center text-emerald-600">${data.den}</td>
        <td class="px-3 py-2 text-center text-purple-600">${data.di}</td>
      </tr>
    `;
  });

  container.innerHTML = rows.join("");
}

function renderCharts(unitCounts, typeCounts) {
  if (typeof Chart === "undefined") return;

  // 1. Department / Unit Chart
  const deptCtx = document.getElementById("deptChart");
  if (deptCtx) {
    if (deptChartInstance) deptChartInstance.destroy();

    const labels = Object.keys(unitCounts);
    const denData = labels.map(l => unitCounts[l].den);
    const diData = labels.map(l => unitCounts[l].di);

    deptChartInstance = new Chart(deptCtx, {
      type: 'bar',
      data: {
        labels: labels.map(l => l.length > 18 ? l.substring(0, 18) + "..." : l),
        datasets: [
          {
            label: 'Công văn Đến',
            data: denData,
            backgroundColor: '#3b82f6',
            borderRadius: 6
          },
          {
            label: 'Công văn Đi',
            data: diData,
            backgroundColor: '#a855f7',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  // 2. Type Chart
  const typeCtx = document.getElementById("typeChart");
  if (typeCtx) {
    if (typeChartInstance) typeChartInstance.destroy();

    const typeLabels = Object.keys(typeCounts);
    const typeTotals = typeLabels.map(t => typeCounts[t].total);

    const bgColors = [
      '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
      '#14b8a6', '#f97316', '#6366f1', '#06b6d4', '#84cc16'
    ];

    typeChartInstance = new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: typeLabels,
        datasets: [{
          data: typeTotals,
          backgroundColor: bgColors.slice(0, typeLabels.length)
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }
        }
      }
    });
  }
}

// Statistics Event Handlers
btnStatFilter.addEventListener("click", runStatistics);
btnStatReset.addEventListener("click", () => {
  statStartDate.value = "";
  statEndDate.value = "";
  runStatistics();
  showNotification("Đã đặt lại bộ lọc thống kê", "info");
});

// Helper Function: Generate 30 Random Sample Dispatches
async function generate30SampleData() {
  if (!confirm("Bạn có chắc chắn muốn tạo 30 dữ liệu công văn mẫu ngẫu nhiên lên Firebase không?")) {
    return;
  }

  btnGenerateSampleData.disabled = true;
  btnGenerateSampleData.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-sm mr-2"></i> Đang tạo 30 mẫu...`;

  const denAuthorities = [
    "Bộ Giáo dục và Đào tạo",
    "Bộ Khoa học và Công nghệ",
    "Bộ Tài chính",
    "UBND Thành phố",
    "Sở Giáo dục và Đào tạo",
    "Đại học Quốc gia",
    "Thành ủy",
    "Bảo hiểm Xã hội Tỉnh"
  ];

  const diDepartments = [
    "Phòng Hành chính - Tài vụ",
    "Phòng Đào tạo - Khoa học và QLSV"
  ];

  const docTypes = [
    "Quyết định",
    "Thông báo",
    "Tờ trình",
    "Kế hoạch",
    "Công văn",
    "Báo cáo",
    "Hướng dẫn"
  ];

  const sampleSummaries = [
    "Về việc ban hành quy định đào tạo và chuẩn đầu ra ngoại ngữ cho sinh viên",
    "Thông báo về kế hoạch tổ chức hội nghị khoa học sinh viên cấp Phân hiệu năm 2025",
    "Tờ trình phê duyệt dự toán kinh phí mua sắm thiết bị công nghệ thông tin phục vụ giảng dạy",
    "Về việc khen thưởng các cá nhân và tập thể có thành tích xuất sắc trong công tác tuyển sinh",
    "Hướng dẫn thực hiện kê khai và quyết toán thuế thu nhập cá nhân năm 2024",
    "Báo cáo tổng kết công tác quản lý sinh viên và đảm bảo an ninh trật tự học đường",
    "Kế hoạch triển khai đợt thực tập tốt nghiệp và kiểm tra tay nghề cho sinh viên khóa cuối",
    "Về việc tăng cường công tác phòng chống dịch bệnh và vệ sinh an toàn thực phẩm trong trường",
    "Thông báo lịch nghỉ lễ và phân công trực ca bảo vệ tài sản cơ quan",
    "Quyết định thành lập Hội đồng đánh giá luận văn thạc sĩ đợt 1 năm 2025"
  ];

  const driveLinks = [
    "https://drive.google.com/file/d/1vA_sample_drive_link_01/view",
    "https://drive.google.com/file/d/1vB_sample_drive_link_02/view",
    "https://drive.google.com/file/d/1vC_sample_drive_link_03/view",
    ""
  ];

  const congVanRef = ref(database, "cong_van");
  let createdCount = 0;

  try {
    for (let i = 1; i <= 30; i++) {
      const isDen = Math.random() > 0.4; // 60% Đến, 40% Đi
      const loai_cong_van = isDen ? "Công văn Đến" : "Công văn Đi";

      const unit = isDen
        ? denAuthorities[Math.floor(Math.random() * denAuthorities.length)]
        : diDepartments[Math.floor(Math.random() * diDepartments.length)];

      const loai_van_ban = docTypes[Math.floor(Math.random() * docTypes.length)];
      const trich_yeu = sampleSummaries[Math.floor(Math.random() * sampleSummaries.length)];
      const drive_link = driveLinks[Math.floor(Math.random() * driveLinks.length)];

      // Generate random date between Jan 2025 and Mar 2025
      const randomDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
      const randomMonth = String(Math.floor(Math.random() * 3) + 1).padStart(2, "0");
      const ngay_ban_hanh = `2025-${randomMonth}-${randomDay}`;

      const soNum = Math.floor(Math.random() * 300) + 1;
      const so_ky_hieu = isDen ? `${soNum}/CV-${unit.substring(0, 3).toUpperCase()}` : `${soNum}/QĐ-PH`;

      const record = {
        so_ky_hieu,
        loai_cong_van,
        phong_ban: unit,
        loai_van_ban,
        ngay_ban_hanh,
        trich_yeu: `${trich_yeu} (Mẫu #${i})`,
        drive_link,
        created_at: Date.now() - (30 - i) * 60000
      };

      const newRef = push(congVanRef);
      await set(newRef, record);
      createdCount++;
    }

    showNotification(`Đã tự động tạo thành công 30 công văn mẫu!`, "success");
  } catch (err) {
    console.error("Error generating sample data:", err);
    showNotification("Lỗi khi tạo dữ liệu mẫu: " + err.message, "error");
  } finally {
    btnGenerateSampleData.disabled = false;
    btnGenerateSampleData.innerHTML = `
      <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
      <span>Tạo 30 dữ liệu mẫu</span>
    `;
  }
}

btnGenerateSampleData.addEventListener("click", generate30SampleData);

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  setupNavigationTabs();
  updateDynamicUnitField();
  setDefaultDate();
  initFirebaseListener();
});
