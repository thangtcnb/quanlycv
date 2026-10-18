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
let deptChartInstance = null;
let typeChartInstance = null;

// DOM Elements
const form = document.getElementById("dispatchForm");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const dispatchIdInput = document.getElementById("dispatchId");
const soKyHieuInput = document.getElementById("soKyHieu");
const loaiCongVanInput = document.getElementById("loaiCongVan");
const loaiVanBanInput = document.getElementById("loaiVanBan");
const phongBanInput = document.getElementById("phongBan");
const ngayBanHanhInput = document.getElementById("ngayBanHanh");
const trichYeuInput = document.getElementById("trichYeu");
const driveLinkInput = document.getElementById("driveLink");

const searchInput = document.getElementById("searchInput");
const filterLoaiCongVan = document.getElementById("filterLoaiCongVan");
const filterPhongBan = document.getElementById("filterPhongBan");

const dispatchTableBody = document.getElementById("dispatchTableBody");
const totalItemsBadge = document.getElementById("totalItemsBadge");

// Statistics Inputs
const statStartDate = document.getElementById("statStartDate");
const statEndDate = document.getElementById("statEndDate");
const btnStatFilter = document.getElementById("btnStatFilter");
const btnStatReset = document.getElementById("btnStatReset");

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
    <span class="text-sm font-medium">${message}</span>
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

// Set Today default on date input if empty
function setDefaultDate() {
  if (!ngayBanHanhInput.value) {
    const today = new Date().toISOString().split("T")[0];
    ngayBanHanhInput.value = today;
  }
}

// Listen to Realtime Database changes
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

// Form Submission Handler
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const so_ky_hieu = soKyHieuInput.value.trim();
  const loai_cong_van = loaiCongVanInput.value;
  const loai_van_ban = loaiVanBanInput.value.trim();
  const phong_ban = phongBanInput.value;
  const ngay_ban_hanh = ngayBanHanhInput.value;
  const trich_yeu = trichYeuInput.value.trim();
  const drive_link = driveLinkInput.value.trim();

  if (!so_ky_hieu || !loai_cong_van || !loai_van_ban || !phong_ban || !ngay_ban_hanh || !trich_yeu) {
    showNotification("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
    return;
  }

  const dispatchData = {
    so_ky_hieu,
    loai_cong_van,
    loai_van_ban,
    phong_ban,
    ngay_ban_hanh,
    trich_yeu,
    drive_link,
    created_at: currentEditId ? (allDispatches.find(item => item.id === currentEditId)?.created_at || Date.now()) : Date.now()
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang lưu...`;

  try {
    if (currentEditId) {
      // Update existing record
      const itemRef = ref(database, `cong_van/${currentEditId}`);
      await update(itemRef, dispatchData);
      showNotification("Cập nhật công văn thành công!");
      resetForm();
    } else {
      // Create new record
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
    submitBtn.innerHTML = currentEditId ? `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật` : `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
  }
});

// Reset Form State
function resetForm() {
  form.reset();
  currentEditId = null;
  dispatchIdInput.value = "";
  formTitle.textContent = "Nhập Công Văn Mới";
  submitBtn.className = "w-full md:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition flex items-center justify-center cursor-pointer";
  submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
  cancelEditBtn.classList.add("hidden");
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
  loaiVanBanInput.value = item.loai_van_ban || "";
  phongBanInput.value = item.phong_ban || "Phòng Hành chính - Tài vụ";
  ngayBanHanhInput.value = item.ngay_ban_hanh || "";
  trichYeuInput.value = item.trich_yeu || "";
  driveLinkInput.value = item.drive_link || "";

  formTitle.textContent = "Chỉnh Sửa Công Văn";
  submitBtn.className = "w-full md:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg shadow transition flex items-center justify-center cursor-pointer";
  submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật`;
  cancelEditBtn.classList.remove("hidden");

  // Scroll smooth to form
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

// Render Dispatch Table
function renderDispatchList() {
  const query = (searchInput.value || "").trim().toLowerCase();
  const selectedLoai = filterLoaiCongVan.value;
  const selectedDept = filterPhongBan.value;

  const filtered = allDispatches.filter((item) => {
    const matchSearch =
      !query ||
      (item.so_ky_hieu && item.so_ky_hieu.toLowerCase().includes(query)) ||
      (item.trich_yeu && item.trich_yeu.toLowerCase().includes(query)) ||
      (item.loai_van_ban && item.loai_van_ban.toLowerCase().includes(query));

    const matchLoai = !selectedLoai || item.loai_cong_van === selectedLoai;
    const matchDept = !selectedDept || item.phong_ban === selectedDept;

    return matchSearch && matchLoai && matchDept;
  });

  totalItemsBadge.textContent = `${filtered.length} / ${allDispatches.length} văn bản`;

  if (filtered.length === 0) {
    dispatchTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-12 text-center text-slate-400">
          <i class="fa-regular fa-folder-open text-4xl mb-3 block"></i>
          Không tìm thấy công văn nào phù hợp.
        </td>
      </tr>
    `;
    return;
  }

  dispatchTableBody.innerHTML = filtered.map((item, index) => {
    const isDen = item.loai_cong_van === "Công văn Đến";
    const badgeClass = isDen
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-purple-100 text-purple-800 border-purple-200";

    const hasDriveLink = item.drive_link && item.drive_link.trim() !== "";

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-sm">
        <td class="px-4 py-3 font-medium text-slate-500 text-center">${index + 1}</td>
        <td class="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
          ${escapeHtml(item.so_ky_hieu)}
        </td>
        <td class="px-4 py-3 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}">
            <i class="fa-solid ${isDen ? 'fa-inbox' : 'fa-paper-plane'} mr-1.5"></i>
            ${escapeHtml(item.loai_cong_van)}
          </span>
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-slate-700">
          <span class="inline-block bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs border border-slate-200">
            ${escapeHtml(item.loai_van_ban)}
          </span>
        </td>
        <td class="px-4 py-3 text-slate-700 whitespace-nowrap text-xs">
          ${escapeHtml(item.phong_ban)}
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-slate-600">
          <i class="fa-regular fa-calendar-check text-slate-400 mr-1"></i>
          ${formatDate(item.ngay_ban_hanh)}
        </td>
        <td class="px-4 py-3 text-slate-800 max-w-xs md:max-w-md">
          <p class="line-clamp-2" title="${escapeHtml(item.trich_yeu)}">
            ${escapeHtml(item.trich_yeu)}
          </p>
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-center">
          ${hasDriveLink ? `
            <a href="${escapeHtml(item.drive_link)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-md text-xs font-medium transition"
               title="Mở Drive Link">
              <i class="fa-brands fa-google-drive text-emerald-600 mr-1.5 text-sm"></i>
              Xem File
            </a>
          ` : `
            <span class="text-slate-400 text-xs italic">Không có</span>
          `}
        </td>
        <td class="px-4 py-3 whitespace-nowrap text-center">
          <div class="inline-flex items-center space-x-1">
            <button onclick="editDispatch('${item.id}')"
                    class="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition"
                    title="Chỉnh sửa">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="deleteDispatch('${item.id}')"
                    class="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition"
                    title="Xóa">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
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

// Event Listeners for Filters
searchInput.addEventListener("input", renderDispatchList);
filterLoaiCongVan.addEventListener("change", renderDispatchList);
filterPhongBan.addEventListener("change", renderDispatchList);

// Statistics Calculation & Rendering
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

  // General Metrics
  const totalCount = filtered.length;
  const denCount = filtered.filter(i => i.loai_cong_van === "Công văn Đến").length;
  const diCount = filtered.filter(i => i.loai_cong_van === "Công văn Đi").length;

  document.getElementById("statTotalCount").textContent = totalCount;
  document.getElementById("statDenCount").textContent = denCount;
  document.getElementById("statDiCount").textContent = diCount;

  // Breakdown by 2 Departments
  const deptList = [
    "Phòng Hành chính - Tài vụ",
    "Phòng Đào tạo - Khoa học và QLSV"
  ];

  const deptCounts = {};
  deptList.forEach(dept => {
    deptCounts[dept] = {
      total: 0,
      den: 0,
      di: 0
    };
  });

  // Breakdown by Document Types (Loại văn bản)
  const typeCounts = {};

  filtered.forEach(item => {
    const dept = item.phong_ban;
    if (deptCounts[dept]) {
      deptCounts[dept].total++;
      if (item.loai_cong_van === "Công văn Đến") deptCounts[dept].den++;
      if (item.loai_cong_van === "Công văn Đi") deptCounts[dept].di++;
    } else if (dept) {
      deptCounts[dept] = {
        total: 1,
        den: item.loai_cong_van === "Công văn Đến" ? 1 : 0,
        di: item.loai_cong_van === "Công văn Đi" ? 1 : 0
      };
    }

    const typeName = (item.loai_van_ban || "Chưa phân loại").trim();
    if (!typeCounts[typeName]) {
      typeCounts[typeName] = { total: 0, den: 0, di: 0 };
    }
    typeCounts[typeName].total++;
    if (item.loai_cong_van === "Công văn Đến") typeCounts[typeName].den++;
    if (item.loai_cong_van === "Công văn Đi") typeCounts[typeName].di++;
  });

  renderDeptTable(deptCounts);
  renderTypeTable(typeCounts);
  renderCharts(deptCounts, typeCounts);
}

// Render Department Breakdown Table
function renderDeptTable(deptCounts) {
  const container = document.getElementById("statDeptTableBody");
  if (!container) return;

  const rows = Object.keys(deptCounts).map(dept => {
    const data = deptCounts[dept];
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-sm">
        <td class="px-4 py-2.5 font-medium text-slate-800">${escapeHtml(dept)}</td>
        <td class="px-4 py-2.5 text-center font-bold text-blue-600">${data.total}</td>
        <td class="px-4 py-2.5 text-center text-emerald-600">${data.den}</td>
        <td class="px-4 py-2.5 text-center text-purple-600">${data.di}</td>
      </tr>
    `;
  });

  container.innerHTML = rows.join("");
}

// Render Type Breakdown Table
function renderTypeTable(typeCounts) {
  const container = document.getElementById("statTypeTableBody");
  if (!container) return;

  const types = Object.keys(typeCounts).sort((a, b) => typeCounts[b].total - typeCounts[a].total);

  if (types.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="4" class="px-4 py-6 text-center text-slate-400 text-sm">
          Chưa có dữ liệu loại văn bản.
        </td>
      </tr>
    `;
    return;
  }

  const rows = types.map(t => {
    const data = typeCounts[t];
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 text-sm">
        <td class="px-4 py-2.5 font-medium text-slate-800">${escapeHtml(t)}</td>
        <td class="px-4 py-2.5 text-center font-bold text-blue-600">${data.total}</td>
        <td class="px-4 py-2.5 text-center text-emerald-600">${data.den}</td>
        <td class="px-4 py-2.5 text-center text-purple-600">${data.di}</td>
      </tr>
    `;
  });

  container.innerHTML = rows.join("");
}

// Render Chart.js Visuals
function renderCharts(deptCounts, typeCounts) {
  if (typeof Chart === "undefined") return;

  // 1. Department Chart
  const deptCtx = document.getElementById("deptChart");
  if (deptCtx) {
    if (deptChartInstance) deptChartInstance.destroy();

    const deptLabels = Object.keys(deptCounts);
    const denData = deptLabels.map(d => deptCounts[d].den);
    const diData = deptLabels.map(d => deptCounts[d].di);

    deptChartInstance = new Chart(deptCtx, {
      type: 'bar',
      data: {
        labels: deptLabels.map(label => label.length > 20 ? label.substring(0, 20) + "..." : label),
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
          legend: { position: 'bottom' },
          title: { display: false }
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
          legend: { position: 'bottom', labels: { boxWidth: 12 } }
        }
      }
    });
  }
}

// Statistics Filters Event Listeners
btnStatFilter.addEventListener("click", runStatistics);
btnStatReset.addEventListener("click", () => {
  statStartDate.value = "";
  statEndDate.value = "";
  runStatistics();
  showNotification("Đã đặt lại bộ lọc thống kê", "info");
});

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
  setDefaultDate();
  initFirebaseListener();
});
