import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

// Seed default users if /users node in Firebase RTDB is empty
async function ensureInitialUsersSeeded() {
  try {
    const usersRef = ref(database, "users");
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) {
      const initialUsers = {
        "quantri": { password: "quantri", role: "quantri", created_at: Date.now() },
        "vanthu": { password: "vanthu123", role: "vanthu", created_at: Date.now() },
        "quanly": { password: "qlcv", role: "quanly", created_at: Date.now() }
      };
      await set(usersRef, initialUsers);
    }
  } catch (error) {
    console.error("Error seeding initial users:", error);
  }
}

// Dynamic users fetched from Firebase /users node (only accessible when role is 'quantri')
let customUsers = {};

// State Management
let currentUser = null;
let currentRole = null;
let allDispatches = []; // Raw list from Firebase
let currentEditId = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

// DOM Elements - Auth & Screens
const loginScreen = document.getElementById("loginScreen");
const mainAppScreen = document.getElementById("mainAppScreen");
const loginForm = document.getElementById("loginForm");
const loginUsernameInput = document.getElementById("loginUsername");
const loginPasswordInput = document.getElementById("loginPassword");
const loginErrorMsg = document.getElementById("loginErrorMsg");
const loginErrorText = document.getElementById("loginErrorText");
const currentUserDisplay = document.getElementById("currentUserDisplay");
const btnLogout = document.getElementById("btnLogout");

// DOM Elements - Navigation Tabs
const tabHomeBtn = document.getElementById("tabHomeBtn");
const tabUfmBtn = document.getElementById("tabUfmBtn");
const tabStatsBtn = document.getElementById("tabStatsBtn");
const tabUsersBtn = document.getElementById("tabUsersBtn");
const tabHomeContent = document.getElementById("tabHomeContent");
const tabUfmContent = document.getElementById("tabUfmContent");
const tabStatsContent = document.getElementById("tabStatsContent");
const tabUsersContent = document.getElementById("tabUsersContent");

// DOM Elements - Layout Containers
const formColumnContainer = document.getElementById("formColumnContainer");
const tableColumnContainer = document.getElementById("tableColumnContainer");

// DOM Elements - Backup & Export
const headerBackupContainer = document.getElementById("headerBackupContainer");
const backupSection = document.getElementById("backupSection");
const btnExportExcel = document.getElementById("btnExportExcel");
const btnExportJSON = document.getElementById("btnExportJSON");
const headerBtnExportExcel = document.getElementById("headerBtnExportExcel");
const headerBtnExportJSON = document.getElementById("headerBtnExportJSON");
const excelFileInput = document.getElementById("excelFileInput");
const btnImportExcel = document.getElementById("btnImportExcel");
const headerBtnImportExcel = document.getElementById("headerBtnImportExcel");

// DOM Elements - Form
const form = document.getElementById("dispatchForm");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const dispatchIdInput = document.getElementById("dispatchId");
const ngayDenContainer = document.getElementById("ngayDenContainer");
const ngayDenInput = document.getElementById("ngay_den");
const soKyHieuInput = document.getElementById("soKyHieu");
const loaiCongVanInput = document.getElementById("loaiCongVan");

const nguonCongVanContainer = document.getElementById("nguonCongVanContainer");
const nguonCongVanSelect = document.getElementById("nguonCongVan");
const donViUfmContainer = document.getElementById("donViUfmContainer");
const donViUfmSelectBox = document.getElementById("don_vi_ufm_co_so_chinh");

const unitLabel = document.getElementById("unitLabel");
const unitTextContainer = document.getElementById("unitTextContainer");
const unitInputText = document.getElementById("unitInputText");
const unitSelectContainer = document.getElementById("unitSelectContainer");
const unitSelectBox = document.getElementById("co_quan_ban_hanh") || document.getElementById("unitSelectBox");
const subUnitContainer = document.getElementById("subUnitContainer");
const subUnitSelectBox = document.getElementById("don_vi_chi_tiet");

const loaiVanBanInput = document.getElementById("loaiVanBan");
const ngayBanHanhInput = document.getElementById("ngayBanHanh");
const driveLinkInput = document.getElementById("driveLink");
const trichYeuInput = document.getElementById("trichYeu");

// DOM Elements - Response Document Form
const hasResponseCheckboxContainer = document.getElementById("hasResponseCheckboxContainer");
const hasResponseDocInput = document.getElementById("hasResponseDoc");
const responseDocSection = document.getElementById("responseDocSection");
const responseSoKyHieuInput = document.getElementById("responseSoKyHieu");
const responseNgayBanHanhInput = document.getElementById("responseNgayBanHanh");
const responseCoQuanBanHanhInput = document.getElementById("responseCoQuanBanHanh");
const responseTrichYeuInput = document.getElementById("responseTrichYeu");
const responseDriveLinkInput = document.getElementById("responseDriveLink");

// DOM Elements - Response Document Detail Modal
const responseDetailModal = document.getElementById("responseDetailModal");
const closeResponseModalBtn = document.getElementById("closeResponseModalBtn");
const modalBtnClose = document.getElementById("modalBtnClose");
const modalBtnJumpToDoc = document.getElementById("modalBtnJumpToDoc");
const modalResponseSoKyHieu = document.getElementById("modalResponseSoKyHieu");
const modalResponseNgayBanHanh = document.getElementById("modalResponseNgayBanHanh");
const modalResponseCoQuan = document.getElementById("modalResponseCoQuan");
const modalResponseTrichYeu = document.getElementById("modalResponseTrichYeu");
const modalResponseDriveContainer = document.getElementById("modalResponseDriveContainer");

// DOM Elements - Table & Search
const searchInput = document.getElementById("searchInput");
const filterLoaiCongVan = document.getElementById("filterLoaiCongVan");
const dispatchTableBody = document.getElementById("dispatchTableBody");
const totalItemsBadge = document.getElementById("totalItemsBadge");
const paginationInfo = document.getElementById("paginationInfo");
const paginationControls = document.getElementById("paginationControls");

// DOM Elements - Batch Action Toolbar
const batchActionToolbar = document.getElementById("batchActionToolbar");
const selectedCountText = document.getElementById("selectedCountText");
const btnBatchDelete = document.getElementById("btnBatchDelete");

const statBatchActionToolbar = document.getElementById("statBatchActionToolbar");
const statSelectedCountText = document.getElementById("statSelectedCountText");
const btnStatBatchDelete = document.getElementById("btnStatBatchDelete");

// DOM Elements - Tab UFM
const ufmFilterFromDate = document.getElementById("ufm_filter_from_date");
const ufmFilterToDate = document.getElementById("ufm_filter_to_date");
const ufmFilterDonVi = document.getElementById("ufm_filter_don_vi");
const btnUfmFilter = document.getElementById("btnUfmFilter");
const btnUfmReset = document.getElementById("btnUfmReset");
const ufmDetailTableBody = document.getElementById("ufmDetailTableBody");
const ufmDetailBadge = document.getElementById("ufmDetailBadge");
const ufmPaginationInfo = document.getElementById("ufmPaginationInfo");
const ufmPaginationControls = document.getElementById("ufmPaginationControls");

// Tab UFM State
let ufmCurrentPage = 1;
let ufmItemsPerPage = 20;
let currentFilteredUfmItems = [];

// DOM Elements - Statistics
const statStartDate = document.getElementById("statStartDate");
const statEndDate = document.getElementById("statEndDate");
const statLoaiCongVan = document.getElementById("statLoaiCongVan");
const statNguonDenFilterContainer = document.getElementById("statNguonDenFilterContainer");
const statNguonDenSelect = document.getElementById("statNguonDen");
const statDeptFilterContainer = document.getElementById("statDeptFilterContainer");
const statPhongBan = document.getElementById("statPhongBan");
const statSubDeptFilterContainer = document.getElementById("statSubDeptFilterContainer");
const statDonViChiTiet = document.getElementById("statDonViChiTiet");
const btnStatFilter = document.getElementById("btnStatFilter");
const btnStatReset = document.getElementById("btnStatReset");
const statDetailTableBody = document.getElementById("statDetailTableBody");
const statDetailBadge = document.getElementById("statDetailBadge");
const statPaginationInfo = document.getElementById("statPaginationInfo");
const statPaginationControls = document.getElementById("statPaginationControls");
const statPageSizeSelect = document.getElementById("statPageSize");

// Statistics State
let statCurrentPage = 1;
let statItemsPerPage = 20;
let currentFilteredStatItems = [];

// DOM Elements - User Management
const addUserForm = document.getElementById("addUserForm");
const newUsernameInput = document.getElementById("newUsername");
const newPasswordInput = document.getElementById("newPassword");
const newUserRoleSelect = document.getElementById("newUserRole");
const userTableBody = document.getElementById("userTableBody");

// Helper to normalize and display document classification
function isCongVanDi(loai) {
  return loai === "CongVanDi" || loai === "Công văn Đi";
}

function isCongVanDen(loai) {
  return loai === "CongVanDen" || loai === "Công văn Đến";
}

function getDisplayLoaiCongVan(loai) {
  if (isCongVanDi(loai)) return "Công văn Đi";
  if (isCongVanDen(loai)) return "Công văn Đến";
  return loai || "";
}

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

// Helper to render Đơn vị ban hành with Badge for Đơn vị chi tiết / UFM unit
function renderDonViBanHanh(item) {
  const donViChinh = item.co_quan_ban_hanh || item.don_vi_ban_hanh || item.phong_ban || '--';
  const donViCon = item.don_vi_ufm_co_so_chinh || item.don_vi_chi_tiet || item.sub_unit || '';

  let html = `<div><strong>${escapeHtml(donViChinh)}</strong></div>`;
  if (donViCon && String(donViCon).trim() !== '') {
    html += `<span class="badge bg-info text-dark mt-1" style="font-size: 0.75rem; display: inline-block; padding: 3px 8px; border-radius: 4px;">${escapeHtml(donViCon)}</span>`;
  }
  return html;
}

// Format Date Utility (YYYY-MM-DD, Timestamp, or ISO String to DD/MM/YYYY)
function formatDateToVN(dateValue) {
  if (!dateValue) return "";
  if (typeof dateValue === "number" || (!isNaN(dateValue) && !String(dateValue).includes("-") && !String(dateValue).includes("/"))) {
    const d = new Date(Number(dateValue));
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const str = String(dateValue).trim();
  if (str.includes("T")) {
    const isoDatePart = str.split("T")[0];
    const parts = isoDatePart.split("-");
    if (parts.length === 3) {
      return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
    }
  }
  const parts = str.split("-");
  if (parts.length === 3) {
    return `${parts[2].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[0]}`;
  }
  return str;
}

// Backward compatibility wrapper
function formatDate(dateStr) {
  return formatDateToVN(dateStr);
}

// Convert Excel date or string to YYYY-MM-DD
function formatDateToYYYYMMDD(val) {
  if (!val) return "";
  if (typeof val === "number") {
    if (typeof XLSX !== "undefined" && XLSX.SSF && XLSX.SSF.parse_date_code) {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, "0");
        const d = String(dateObj.d).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }
  let str = String(val).trim();
  str = str.split(/[\r\n]+/)[0].trim();
  str = str.replace(/[^\d\/\-]/g, "").trim();
  str = str.replace(/\/+/g, "/").replace(/\-+/g, "-");

  if (str.includes("/")) {
    const parts = str.split("/");
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2];
      return `${year}-${month}-${day}`;
    } else if (parts.length === 2 && parts[1].length === 5) {
      const day = parts[0].padStart(2, "0");
      const month = parts[1][0].padStart(2, "0");
      const year = parts[1].slice(1);
      return `${year}-${month}-${day}`;
    }
  } else if (str.includes("-")) {
    const parts = str.split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        const day = parts[0].padStart(2, "0");
        const month = parts[1].padStart(2, "0");
        const year = parts[2];
        return `${year}-${month}-${day}`;
      }
    }
  }
  return str;
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
  const today = new Date().toISOString().split("T")[0];
  if (ngayBanHanhInput && !ngayBanHanhInput.value) {
    ngayBanHanhInput.value = today;
  }
  if (ngayDenInput && !ngayDenInput.value) {
    ngayDenInput.value = today;
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & ROLE PERMISSIONS LOGIC
// -------------------------------------------------------------
async function checkAuthStatus() {
  const savedUser = sessionStorage.getItem("qlcv_user") || localStorage.getItem("qlcv_user");
  let savedRole = sessionStorage.getItem("qlcv_role") || localStorage.getItem("qlcv_role");

  if (savedUser) {
    if (!savedRole) {
      try {
        const userSnap = await get(ref(database, `users/${savedUser}`));
        if (userSnap.exists()) {
          savedRole = userSnap.val().role || "vanthu";
          sessionStorage.setItem("qlcv_role", savedRole);
          localStorage.setItem("qlcv_role", savedRole);
        } else {
          logoutUser();
          return;
        }
      } catch (err) {
        console.error("Error fetching user role on checkAuthStatus:", err);
      }
    }

    currentUser = savedUser;
    currentRole = savedRole || "vanthu";
    currentUserDisplay.textContent = `${currentUser} (${getRoleBadgeText(currentRole)})`;

    loginScreen.classList.add("hidden");
    mainAppScreen.classList.remove("hidden");
    mainAppScreen.classList.add("flex");

    applyRolePermissions();
    initFirebaseListener();

    if (currentRole === "quantri") {
      initUsersListener();
    } else {
      customUsers = {};
    }
  } else {
    currentUser = null;
    currentRole = null;
    customUsers = {};
    loginScreen.classList.remove("hidden");
    mainAppScreen.classList.add("hidden");
    mainAppScreen.classList.remove("flex");
  }
}

function getRoleBadgeText(role) {
  if (role === "quantri") return "Quản trị";
  if (role === "quanly") return "Quản lý";
  return "Văn thư";
}

function applyRolePermissions() {
  if (currentRole === "quanly") {
    // Hide Form column, Expand list column to full width
    if (formColumnContainer) formColumnContainer.classList.add("hidden");
    if (tableColumnContainer) {
      tableColumnContainer.classList.remove("lg:col-span-8");
      tableColumnContainer.classList.add("lg:col-span-12");
    }
    // Hide User Management tab
    if (tabUsersBtn) tabUsersBtn.classList.add("hidden");
    // Hide Backup elements
    if (headerBackupContainer) headerBackupContainer.classList.add("hidden");
    if (backupSection) backupSection.classList.add("hidden");
    // Hide Batch Action Toolbars
    if (batchActionToolbar) batchActionToolbar.classList.add("hidden");
    if (statBatchActionToolbar) statBatchActionToolbar.classList.add("hidden");
  } else if (currentRole === "quantri") {
    // Show Form column
    if (formColumnContainer) formColumnContainer.classList.remove("hidden");
    if (tableColumnContainer) {
      tableColumnContainer.classList.remove("lg:col-span-12");
      tableColumnContainer.classList.add("lg:col-span-8");
    }
    // Show User Management tab for quantri
    if (tabUsersBtn) tabUsersBtn.classList.remove("hidden");
    // Show Backup elements for quantri
    if (headerBackupContainer) headerBackupContainer.classList.remove("hidden");
    if (backupSection) backupSection.classList.remove("hidden");
    // Show Batch Action Toolbars for quantri
    if (batchActionToolbar) batchActionToolbar.classList.remove("hidden");
    if (statBatchActionToolbar) statBatchActionToolbar.classList.remove("hidden");
  } else {
    // Default vanthu role: Show Form column, Hide User Management tab
    if (formColumnContainer) formColumnContainer.classList.remove("hidden");
    if (tableColumnContainer) {
      tableColumnContainer.classList.remove("lg:col-span-12");
      tableColumnContainer.classList.add("lg:col-span-8");
    }
    if (tabUsersBtn) tabUsersBtn.classList.add("hidden");
    // Hide Backup elements
    if (headerBackupContainer) headerBackupContainer.classList.add("hidden");
    if (backupSection) backupSection.classList.add("hidden");
    // Hide Batch Action Toolbars
    if (batchActionToolbar) batchActionToolbar.classList.add("hidden");
    if (statBatchActionToolbar) statBatchActionToolbar.classList.add("hidden");
  }

  renderDispatchList();
}

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = loginUsernameInput ? loginUsernameInput.value.trim() : "";
    const password = loginPasswordInput ? loginPasswordInput.value.trim() : "";

    if (!username || !password) {
      if (loginErrorText) loginErrorText.textContent = "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!";
      if (loginErrorMsg) loginErrorMsg.classList.remove("hidden");
      return;
    }

    // Ensure initial default users are seeded on Firebase RTDB if empty
    await ensureInitialUsersSeeded();

    try {
      const userSnap = await get(ref(database, `users/${username}`));
      if (userSnap.exists()) {
        const userData = userSnap.val();
        if (userData && userData.password === password) {
          if (loginErrorMsg) loginErrorMsg.classList.add("hidden");
          const role = userData.role || "vanthu";
          sessionStorage.setItem("qlcv_user", username);
          sessionStorage.setItem("qlcv_role", role);
          localStorage.setItem("qlcv_user", username);
          localStorage.setItem("qlcv_role", role);
          showNotification(`Đăng nhập thành công! Chào mừng ${username}`);
          await checkAuthStatus();
          return;
        }
      }

      if (loginErrorText) loginErrorText.textContent = "Tên đăng nhập hoặc mật khẩu không chính xác!";
      if (loginErrorMsg) loginErrorMsg.classList.remove("hidden");
    } catch (error) {
      console.error("Login error:", error);
      if (loginErrorText) loginErrorText.textContent = "Lỗi khi kết nối hệ thống. Vui lòng thử lại!";
      if (loginErrorMsg) loginErrorMsg.classList.remove("hidden");
    }
  });
}

function logoutUser() {
  sessionStorage.removeItem("qlcv_user");
  sessionStorage.removeItem("qlcv_role");
  localStorage.removeItem("qlcv_user");
  localStorage.removeItem("qlcv_role");
  if (loginUsernameInput) loginUsernameInput.value = "";
  if (loginPasswordInput) loginPasswordInput.value = "";
  if (loginErrorMsg) loginErrorMsg.classList.add("hidden");
  customUsers = {};
  checkAuthStatus();
}

btnLogout.addEventListener("click", () => {
  logoutUser();
  showNotification("Đã đăng xuất khỏi hệ thống.", "info");
});

// -------------------------------------------------------------
// 2. NAVIGATION TABS
// -------------------------------------------------------------
function setupNavigationTabs() {
  function activateTab(activeBtn, contentToShow) {
    [tabHomeBtn, tabUfmBtn, tabStatsBtn, tabUsersBtn].forEach(btn => {
      if (btn) {
        btn.classList.remove("active", "text-white", "bg-white/10");
        btn.classList.add("text-indigo-200");
      }
    });

    [tabHomeContent, tabUfmContent, tabStatsContent, tabUsersContent].forEach(content => {
      if (content) content.classList.add("hidden");
    });

    if (activeBtn) {
      activeBtn.classList.add("active", "text-white", "bg-white/10");
      activeBtn.classList.remove("text-indigo-200");
    }

    if (contentToShow) {
      contentToShow.classList.remove("hidden");
    }
  }

  if (tabHomeBtn) {
    tabHomeBtn.addEventListener("click", () => {
      activateTab(tabHomeBtn, tabHomeContent);
    });
  }

  if (tabUfmBtn) {
    tabUfmBtn.addEventListener("click", () => {
      activateTab(tabUfmBtn, tabUfmContent);
      loadCongVanUFM();
    });
  }

  if (tabStatsBtn) {
    tabStatsBtn.addEventListener("click", () => {
      activateTab(tabStatsBtn, tabStatsContent);
      runStatistics();
    });
  }

  if (tabUsersBtn) {
    tabUsersBtn.addEventListener("click", () => {
      activateTab(tabUsersBtn, tabUsersContent);
      renderUserList();
    });
  }
}

// -------------------------------------------------------------
// 3. HOME TAB & DISPATCH FORM LOGIC
// -------------------------------------------------------------
function updateSubUnitOptions() {
  if (!unitSelectBox || !subUnitSelectBox || !subUnitContainer) return;
  const mainDept = unitSelectBox.value;
  subUnitSelectBox.innerHTML = "";

  if (mainDept === "Phòng Hành chính - Tài vụ") {
    subUnitContainer.classList.remove("hidden");
    const options = ["Hành chính", "Tài vụ", "Quản trị"];
    options.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      subUnitSelectBox.appendChild(optionEl);
    });
  } else if (mainDept === "Phòng Đào tạo - Khoa học và QLSV") {
    subUnitContainer.classList.remove("hidden");
    const options = ["Đào tạo", "Khoa học", "Quản lý Sinh viên"];
    options.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      subUnitSelectBox.appendChild(optionEl);
    });
  } else {
    subUnitContainer.classList.add("hidden");
  }
}

function updateDynamicUnitField() {
  if (!loaiCongVanInput) return;
  const isDen = loaiCongVanInput.value === "Công văn Đến";

  // Ô "Thời gian CV đến" LUÔN HIỂN THỊ cả khi nhập mới và chỉnh sửa
  if (ngayDenContainer) ngayDenContainer.classList.remove("hidden");

  if (isDen) {
    if (nguonCongVanContainer) nguonCongVanContainer.classList.remove("hidden");
    if (unitSelectContainer) unitSelectContainer.classList.add("hidden");
    if (unitSelectBox) unitSelectBox.removeAttribute("required");
    if (subUnitContainer) subUnitContainer.classList.add("hidden");

    const isUFM = nguonCongVanSelect && nguonCongVanSelect.value === "UFM Cơ sở chính";

    if (isUFM) {
      if (donViUfmContainer) donViUfmContainer.classList.remove("hidden");
      unitLabel.innerHTML = `Đơn vị ban hành <span class="text-rose-500">*</span>`;
      unitTextContainer.classList.add("hidden");
      unitInputText.value = "UFM Cơ sở chính";
      unitInputText.removeAttribute("required");
    } else {
      if (donViUfmContainer) donViUfmContainer.classList.add("hidden");
      unitLabel.innerHTML = `Đơn vị ban hành <span class="text-rose-500">*</span>`;
      unitTextContainer.classList.remove("hidden");
      if (unitInputText.value === "UFM Cơ sở chính") {
        unitInputText.value = "";
      }
      unitInputText.setAttribute("required", "true");
    }

    // Hide response section for incoming documents
    if (hasResponseCheckboxContainer) hasResponseCheckboxContainer.classList.add("hidden");
    if (responseDocSection) responseDocSection.classList.add("hidden");
    if (hasResponseDocInput) hasResponseDocInput.checked = false;
    toggleResponseDocFields(false);
  } else {
    if (donViUfmContainer) donViUfmContainer.classList.add("hidden");
    if (nguonCongVanContainer) nguonCongVanContainer.classList.add("hidden");
    unitLabel.innerHTML = `Phòng ban ban hành <span class="text-rose-500">*</span>`;
    unitTextContainer.classList.add("hidden");
    if (unitSelectContainer) unitSelectContainer.classList.remove("hidden");

    unitInputText.removeAttribute("required");
    if (unitSelectBox) unitSelectBox.setAttribute("required", "true");

    updateSubUnitOptions();

    // Show response checkbox container for outgoing documents
    if (hasResponseCheckboxContainer) hasResponseCheckboxContainer.classList.remove("hidden");
    toggleResponseDocFields(hasResponseDocInput ? hasResponseDocInput.checked : false);
  }
}

if (unitSelectBox) {
  unitSelectBox.addEventListener("change", () => {
    if (loaiCongVanInput && loaiCongVanInput.value === "Công văn Đi") {
      updateSubUnitOptions();
    }
  });
}

function toggleResponseDocFields(show) {
  if (!responseDocSection) return;
  if (show) {
    responseDocSection.classList.remove("hidden");
    if (responseSoKyHieuInput) responseSoKyHieuInput.setAttribute("required", "true");
    if (responseNgayBanHanhInput) responseNgayBanHanhInput.setAttribute("required", "true");
    if (responseCoQuanBanHanhInput) responseCoQuanBanHanhInput.setAttribute("required", "true");
    if (responseTrichYeuInput) responseTrichYeuInput.setAttribute("required", "true");

    if (responseNgayBanHanhInput && !responseNgayBanHanhInput.value) {
      responseNgayBanHanhInput.value = new Date().toISOString().split("T")[0];
    }
  } else {
    responseDocSection.classList.add("hidden");
    if (responseSoKyHieuInput) responseSoKyHieuInput.removeAttribute("required");
    if (responseNgayBanHanhInput) responseNgayBanHanhInput.removeAttribute("required");
    if (responseCoQuanBanHanhInput) responseCoQuanBanHanhInput.removeAttribute("required");
    if (responseTrichYeuInput) responseTrichYeuInput.removeAttribute("required");
  }
}

if (hasResponseDocInput) {
  hasResponseDocInput.addEventListener("change", (e) => {
    toggleResponseDocFields(e.target.checked);
  });
}

if (loaiCongVanInput) {
  loaiCongVanInput.addEventListener("change", updateDynamicUnitField);
}

if (nguonCongVanSelect) {
  nguonCongVanSelect.addEventListener("change", updateDynamicUnitField);
}

// Get Unit value according to document type
function getUnitValue() {
  if (loaiCongVanInput.value === "Công văn Đến") {
    if (nguonCongVanSelect && nguonCongVanSelect.value === "UFM Cơ sở chính") {
      return "UFM Cơ sở chính";
    }
    return unitInputText.value.trim();
  } else {
    return unitSelectBox.value;
  }
}

// Form Submission Handler
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const so_ky_hieu = soKyHieuInput ? soKyHieuInput.value.trim() : "";
      const loai_cong_van = loaiCongVanInput ? loaiCongVanInput.value : "";
      const isDen = isCongVanDen(loai_cong_van);
      const unitVal = getUnitValue();
      const loai_van_ban = loaiVanBanInput ? loaiVanBanInput.value.trim() : "";
      const ngay_ban_hanh = ngayBanHanhInput ? ngayBanHanhInput.value : "";
      const trich_yeu = trichYeuInput ? trichYeuInput.value.trim() : "";
      const drive_link = driveLinkInput ? driveLinkInput.value.trim() : "";

      const ngayDen = document.getElementById('ngay_den') ? document.getElementById('ngay_den').value : '';
      const donViChiTiet = document.getElementById('don_vi_chi_tiet') ? document.getElementById('don_vi_chi_tiet').value : '';

      if (!so_ky_hieu || !loai_cong_van || !unitVal || !loai_van_ban || !ngay_ban_hanh || !trich_yeu) {
        showNotification("Vui lòng điền đầy đủ các thông tin bắt buộc!", "error");
        alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
        return;
      }

      const hasResponse = loai_cong_van === "Công văn Đi" && hasResponseDocInput && hasResponseDocInput.checked;

      if (hasResponse) {
        const respSoKyHieu = responseSoKyHieuInput ? responseSoKyHieuInput.value.trim() : "";
        const respNgayBH = responseNgayBanHanhInput ? responseNgayBanHanhInput.value : "";
        const respCoQuan = responseCoQuanBanHanhInput ? responseCoQuanBanHanhInput.value.trim() : "";
        const respTrichYeu = responseTrichYeuInput ? responseTrichYeuInput.value.trim() : "";

        if (!respSoKyHieu || !respNgayBH || !respCoQuan || !respTrichYeu) {
          showNotification("Vui lòng nhập đầy đủ thông tin Công văn phản hồi!", "error");
          alert("Vui lòng nhập đầy đủ thông tin Công văn phản hồi!");
          return;
        }
      }

      const currentDoc = currentEditId ? allDispatches.find(item => item.id === currentEditId) : null;

      const dispatchData = {
        so_ky_hieu,
        loai_cong_van,
        phong_ban: unitVal,
        co_quan_ban_hanh: unitVal,
        loai_van_ban,
        ngay_ban_hanh,
        trich_yeu,
        drive_link,
        link_google_drive: drive_link,
        created_at: currentDoc ? (currentDoc.created_at || Date.now()) : Date.now()
      };

      if (ngayDen) {
        dispatchData.ngay_den = ngayDen;
      }

      if (isDen) {
        dispatchData.nguon_cong_van = nguonCongVanSelect ? nguonCongVanSelect.value : "Khác";
        if (dispatchData.nguon_cong_van === "UFM Cơ sở chính" && donViUfmSelectBox) {
          dispatchData.don_vi_ufm_co_so_chinh = donViUfmSelectBox.value;
          dispatchData.don_vi_chi_tiet = donViUfmSelectBox.value;
        }
      } else {
        if (donViChiTiet) {
          dispatchData.don_vi_chi_tiet = donViChiTiet;
        }
      }

    if (currentDoc && currentDoc.response_doc_id) {
      dispatchData.response_doc_id = currentDoc.response_doc_id;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang lưu...`;

    try {
      let mainDocId = currentEditId;

      const isDen = loai_cong_van === "Công văn Đến";
      const targetSubnode = isDen ? "cong_van/cong_van_den" : "cong_van/cong_van_di";

      if (mainDocId) {
        if (currentDoc && currentDoc.is_subnode_den) {
          const itemRef = ref(database, `cong_van/cong_van_den/${mainDocId}`);
          await update(itemRef, dispatchData);
        } else if (currentDoc && currentDoc.is_subnode_di) {
          const itemRef = ref(database, `cong_van/cong_van_di/${mainDocId}`);
          await update(itemRef, dispatchData);
        } else {
          const itemRef = ref(database, `${targetSubnode}/${mainDocId}`);
          await update(itemRef, dispatchData);
        }
      } else {
        const listRef = ref(database, targetSubnode);
        const newRef = push(listRef);
        mainDocId = newRef.key;
        await set(newRef, dispatchData);
      }

      // Logic xử lý Công văn phản hồi (đồng thời ghi nhận vào Công văn Đến tại node /cong_van/cong_van_den/)
      if (hasResponse) {
        const respSoKyHieu = responseSoKyHieuInput.value.trim();
        const respNgayBH = responseNgayBanHanhInput.value;
        const respCoQuan = responseCoQuanBanHanhInput.value.trim();
        const respTrichYeu = responseTrichYeuInput.value.trim();
        const respDriveLink = responseDriveLinkInput ? responseDriveLinkInput.value.trim() : "";

        const responseRecordData = {
          so_ky_hieu: respSoKyHieu,
          loai_cong_van: "Công văn Đến",
          nguon_cong_van: respCoQuan === "UFM Cơ sở chính" ? "UFM Cơ sở chính" : "Khác",
          loai_van_ban: "Công văn phản hồi",
          phong_ban: respCoQuan,
          ngay_ban_hanh: respNgayBH,
          trich_yeu: respTrichYeu,
          drive_link: respDriveLink,
          lien_ket_cong_van_di_id: mainDocId,
          created_at: Date.now()
        };

        let responseDocId = (currentDoc && currentDoc.response_doc_id) ? currentDoc.response_doc_id : null;

        if (responseDocId) {
          const respRef = ref(database, `cong_van/cong_van_den/${responseDocId}`);
          await update(respRef, responseRecordData);
        } else {
          const respListRef = ref(database, "cong_van/cong_van_den");
          const newRespRef = push(respListRef);
          responseDocId = newRespRef.key;
          await set(newRespRef, responseRecordData);
        }

        // Lưu mã ID liên kết giữa Công văn đi (response_doc_id)
        await update(ref(database, `cong_van/cong_van_di/${mainDocId}`), {
          response_doc_id: responseDocId
        });
      } else if (currentDoc && currentDoc.response_doc_id && loai_cong_van === "Công văn Đi") {
        // Nếu trước đó có công văn phản hồi nhưng người dùng bỏ chọn checkbox
        try {
          await remove(ref(database, `cong_van/cong_van_den/${currentDoc.response_doc_id}`));
          await update(ref(database, `cong_van/cong_van_di/${mainDocId}`), {
            response_doc_id: null
          });
        } catch (e) {
          console.error("Error removing linked response doc:", e);
        }
      }

      showNotification(currentEditId ? "Cập nhật công văn thành công!" : "Thêm công văn mới thành công!");
      resetForm();
    } catch (error) {
      console.error("Save error:", error);
      showNotification("Lỗi khi lưu công văn: " + error.message, "error");
      alert("Lỗi khi lưu công văn: " + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = currentEditId
        ? `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật`
        : `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
    }
    } catch (outerError) {
      console.error("Outer Form Submit error:", outerError);
      showNotification("Lỗi hệ thống: " + outerError.message, "error");
      alert("Lỗi hệ thống: " + outerError.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = currentEditId
          ? `<i class="fa-solid fa-floppy-disk mr-2"></i> Cập nhật`
          : `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
      }
    }
  });
}

// Reset Form State
function resetForm() {
  if (!form) return;
  form.reset();
  currentEditId = null;
  dispatchIdInput.value = "";
  formTitle.textContent = "Nhập Công Văn Mới";
  submitBtn.className = "w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow transition flex items-center justify-center cursor-pointer";
  submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-2"></i> Lưu Công Văn`;
  cancelEditBtn.classList.add("hidden");

  loaiCongVanInput.value = "Công văn Đến";
  if (nguonCongVanSelect) nguonCongVanSelect.value = "UFM Cơ sở chính";
  if (hasResponseDocInput) hasResponseDocInput.checked = false;
  if (responseSoKyHieuInput) responseSoKyHieuInput.value = "";
  if (responseNgayBanHanhInput) responseNgayBanHanhInput.value = "";
  if (responseCoQuanBanHanhInput) responseCoQuanBanHanhInput.value = "";
  if (responseTrichYeuInput) responseTrichYeuInput.value = "";
  if (responseDriveLinkInput) responseDriveLinkInput.value = "";

  updateDynamicUnitField();
  setDefaultDate();
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    resetForm();
    showNotification("Đã hủy chế độ chỉnh sửa", "info");
  });
}

// Populate Form for Editing
window.editDispatch = function(id) {
  const item = allDispatches.find(d => d.id === id);
  if (!item) return;

  currentEditId = id;
  dispatchIdInput.value = id;
  soKyHieuInput.value = item.so_ky_hieu || "";
  loaiCongVanInput.value = item.loai_cong_van || "Công văn Đến";

  updateDynamicUnitField();

  const ngayDenEl = document.getElementById("ngay_den");
  const ngayDenContainerEl = document.getElementById("ngayDenContainer");
  if (ngayDenContainerEl) {
    ngayDenContainerEl.classList.remove("hidden");
  }
  if (ngayDenEl) {
    ngayDenEl.value = item.ngay_den || "";
  }

  if (isCongVanDen(item.loai_cong_van)) {
    const nguon = item.nguon_cong_van || (item.phong_ban === "UFM Cơ sở chính" ? "UFM Cơ sở chính" : "Khác");
    if (nguonCongVanSelect) nguonCongVanSelect.value = nguon;
    updateDynamicUnitField();
    if (nguon === "Khác") {
      unitInputText.value = item.phong_ban || item.co_quan_ban_hanh || "";
    } else {
      unitInputText.value = "UFM Cơ sở chính";
      if (donViUfmSelectBox && (item.don_vi_ufm_co_so_chinh || item.don_vi_chi_tiet)) {
        donViUfmSelectBox.value = item.don_vi_ufm_co_so_chinh || item.don_vi_chi_tiet;
      }
    }
  } else {
    if (unitSelectBox) {
      unitSelectBox.value = item.phong_ban || item.co_quan_ban_hanh || "Phòng Hành chính - Tài vụ";
    }
    updateSubUnitOptions();
    if (subUnitSelectBox && item.don_vi_chi_tiet) {
      subUnitSelectBox.value = item.don_vi_chi_tiet;
    }
  }

  loaiVanBanInput.value = item.loai_van_ban || "";
  ngayBanHanhInput.value = item.ngay_ban_hanh || "";
  trichYeuInput.value = item.trich_yeu || "";
  driveLinkInput.value = item.drive_link || item.link_google_drive || "";

  // Load linked response document data if exists
  if (isCongVanDi(item.loai_cong_van) && item.response_doc_id) {
    const respItem = allDispatches.find(d => d.id === item.response_doc_id);
    if (respItem) {
      if (hasResponseDocInput) hasResponseDocInput.checked = true;
      toggleResponseDocFields(true);
      if (responseSoKyHieuInput) responseSoKyHieuInput.value = respItem.so_ky_hieu || "";
      if (responseNgayBanHanhInput) responseNgayBanHanhInput.value = respItem.ngay_ban_hanh || "";
      if (responseCoQuanBanHanhInput) responseCoQuanBanHanhInput.value = respItem.phong_ban || "";
      if (responseTrichYeuInput) responseTrichYeuInput.value = respItem.trich_yeu || "";
      if (responseDriveLinkInput) responseDriveLinkInput.value = respItem.drive_link || "";
    } else {
      if (hasResponseDocInput) hasResponseDocInput.checked = false;
      toggleResponseDocFields(false);
    }
  } else {
    if (hasResponseDocInput) hasResponseDocInput.checked = false;
    toggleResponseDocFields(false);
  }

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
      const isDen = isCongVanDen(item.loai_cong_van);
      const subpath = isDen ? "cong_van/cong_van_den" : "cong_van/cong_van_di";
      const itemRef = ref(database, `${subpath}/${id}`);
      await remove(itemRef);

      // Clean up linked response document if exists
      if (item.response_doc_id) {
        try {
          await remove(ref(database, `cong_van/cong_van_den/${item.response_doc_id}`));
        } catch (err) {
          console.error("Error removing linked response doc on delete:", err);
        }
      }
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

// Auto Seed Data Function
async function autoSeedData() {
  console.log("=== BẮT ĐẦU KIỂM TRA AUTO SEED ===");
  try {
    if (typeof firebase !== 'undefined' && firebase.apps && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    const dbRef = firebase.database().ref('cong_van/cong_van_di');
    const snapshot = await dbRef.once('value');
    console.log("Dữ liệu hiện tại trên Firebase:", snapshot.val());

    if (!snapshot.exists() || !snapshot.val()) {
      console.log("Database rỗng! Đang tải file cong_van_data.json...");
      const res = await fetch('./cong_van_data.json');
      if (!res.ok) throw new Error("Không thể tải file cong_van_data.json (Mã lỗi: " + res.status + ")");
      const data = await res.json();
      console.log(`Đã đọc ${data.length} bản ghi từ JSON. Đang đẩy lên Firebase...`);

      // Đẩy dữ liệu lên Firebase
      await dbRef.set(data);
      console.log("=== THÀNH CÔNG: Đã đẩy dữ liệu lên Firebase! ===");
      alert("Đã tự động nạp thành công " + data.length + " công văn vào hệ thống!");
      if (typeof loadDanhSachCongVan === 'function') loadDanhSachCongVan();
    } else {
      console.log("Database đã có dữ liệu, bỏ qua bước Seed.");
    }
  } catch (err) {
    console.error("=== LỖI TRONG QUÁ TRÌNH SEED ===", err);
    alert("Lỗi nạp dữ liệu: " + err.message);
  }
}

// Listen to Realtime Database Dispatches
let isFirebaseListenerSet = false;
async function initFirebaseListener() {
  if (isFirebaseListenerSet) return;
  isFirebaseListenerSet = true;

  const congVanRef = ref(database, "cong_van");

  onValue(congVanRef, (snapshot) => {
    const data = snapshot.val();
    allDispatches = [];

    if (data) {
      Object.keys(data).forEach((key) => {
        if (key === "cong_van_den") {
          // Flatten records from subnode /cong_van/cong_van_den/
          const denSubnodeData = data[key];
          if (denSubnodeData && typeof denSubnodeData === "object") {
            Object.keys(denSubnodeData).forEach((subKey) => {
              allDispatches.push({
                id: subKey,
                is_subnode_den: true,
                ...denSubnodeData[subKey]
              });
            });
          }
        } else if (key === "cong_van_di") {
          // Flatten records from subnode /cong_van/cong_van_di/
          const diSubnodeData = data[key];
          if (diSubnodeData && typeof diSubnodeData === "object") {
            Object.keys(diSubnodeData).forEach((subKey) => {
              allDispatches.push({
                id: subKey,
                is_subnode_di: true,
                ...diSubnodeData[subKey]
              });
            });
          }
        } else {
          allDispatches.push({
            id: key,
            ...data[key]
          });
        }
      });
    }

    // Sort newest first
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

// Listen to Realtime Database Users (quantri ONLY)
let isUsersListenerSet = false;
function initUsersListener() {
  if (currentRole !== "quantri") return;
  if (isUsersListenerSet) return;
  isUsersListenerSet = true;

  const usersRef = ref(database, "users");

  onValue(usersRef, (snapshot) => {
    const data = snapshot.val();
    customUsers = {};

    if (data) {
      Object.keys(data).forEach((key) => {
        const u = data[key];
        if (u) {
          const username = u.username || key;
          customUsers[username] = {
            id: key,
            password: u.password,
            role: u.role || "vanthu"
          };
        }
      });
    }

    if (currentRole === "quantri") {
      renderUserList();
    }
  }, (error) => {
    console.error("Firebase Users Listener Error:", error);
  });
}

// Get Filtered Dispatches
function getFilteredDispatches() {
  const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
  const selectedLoai = filterLoaiCongVan ? filterLoaiCongVan.value : "";

  return allDispatches.filter((item) => {
    const matchSearch =
      !query ||
      (item.so_ky_hieu && item.so_ky_hieu.toLowerCase().includes(query)) ||
      (item.trich_yeu && item.trich_yeu.toLowerCase().includes(query)) ||
      (item.loai_van_ban && item.loai_van_ban.toLowerCase().includes(query)) ||
      (item.phong_ban && item.phong_ban.toLowerCase().includes(query));

    const matchLoai = !selectedLoai ||
      (selectedLoai === "Công văn Đi" && isCongVanDi(item.loai_cong_van)) ||
      (selectedLoai === "Công văn Đến" && isCongVanDen(item.loai_cong_van)) ||
      item.loai_cong_van === selectedLoai;

    return matchSearch && matchLoai;
  });
}

// Helper functions requested
window.loadDanhSachCongVan = function() {
  renderDispatchList();
};

window.updateThongKe = function() {
  runStatistics();
};

window.loadCongVanUFM = function() {
  runUfmFilter();
};

// -------------------------------------------------------------
// TAB CÔNG VĂN UFM LOGIC & FILTER
// -------------------------------------------------------------
function runUfmFilter() {
  const fromDate = ufmFilterFromDate ? ufmFilterFromDate.value : "";
  const toDate = ufmFilterToDate ? ufmFilterToDate.value : "";
  const selectedDonVi = ufmFilterDonVi ? ufmFilterDonVi.value : "Tất cả các đơn vị";

  let filtered = allDispatches.filter(item => {
    // Only incoming documents from "UFM Cơ sở chính"
    const isDen = isCongVanDen(item.loai_cong_van);
    if (!isDen) return false;

    const nguon = item.nguon_cong_van || (item.phong_ban === "UFM Cơ sở chính" ? "UFM Cơ sở chính" : "Khác");
    if (nguon !== "UFM Cơ sở chính") return false;

    return true;
  });

  if (fromDate) {
    filtered = filtered.filter(item => {
      const d = item.ngay_den || item.ngay_ban_hanh;
      return d >= fromDate;
    });
  }

  if (toDate) {
    filtered = filtered.filter(item => {
      const d = item.ngay_den || item.ngay_ban_hanh;
      return d <= toDate;
    });
  }

  if (selectedDonVi !== "Tất cả các đơn vị") {
    filtered = filtered.filter(item => {
      const ufmUnit = item.don_vi_ufm_co_so_chinh || item.don_vi_chi_tiet || "";
      return ufmUnit === selectedDonVi;
    });
  }

  currentFilteredUfmItems = filtered;
  ufmCurrentPage = 1;
  renderUfmDetailTable();
}

function renderUfmDetailTable() {
  if (!ufmDetailTableBody) return;

  const filteredItems = currentFilteredUfmItems || [];

  if (ufmDetailBadge) {
    ufmDetailBadge.textContent = `${filteredItems.length} kết quả`;
  }

  const totalPages = Math.ceil(filteredItems.length / ufmItemsPerPage) || 1;
  if (ufmCurrentPage > totalPages) {
    ufmCurrentPage = totalPages;
  }

  const startIndex = (ufmCurrentPage - 1) * ufmItemsPerPage;
  const endIndex = Math.min(startIndex + ufmItemsPerPage, filteredItems.length);
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const canEdit = currentRole !== "quanly";
  const colSpanCount = 9;

  if (filteredItems.length === 0) {
    ufmDetailTableBody.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="px-4 py-8 text-center text-slate-400">
          Không tìm thấy công văn UFM nào phù hợp với bộ lọc.
        </td>
      </tr>
    `;
    if (ufmPaginationInfo) ufmPaginationInfo.textContent = "Hiển thị 0 - 0 trong tổng số 0 bản ghi";
    if (ufmPaginationControls) ufmPaginationControls.innerHTML = "";
    return;
  }

  ufmDetailTableBody.innerHTML = currentItems.map((item, index) => {
    const driveUrl = item.drive_link || item.link_google_drive || "";
    const hasDriveLink = driveUrl && driveUrl.trim() !== "";
    const thoiGianDisplay = item.ngay_den || item.created_at || item.ngay_ban_hanh || item.ngay_nhan;

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        <td class="px-3 py-2.5 font-medium text-slate-500 text-center">${startIndex + index + 1}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-slate-600">
          ${formatDateToVN(thoiGianDisplay) || '--'}
        </td>
        <td class="px-3 py-2.5 font-semibold text-slate-900 break-words">
          ${escapeHtml(item.so_ky_hieu)}
        </td>
        <td class="px-3 py-2.5 text-slate-700 font-medium">${escapeHtml(item.loai_van_ban)}</td>
        <td class="px-3 py-2.5 text-slate-700 break-words">
          ${renderDonViBanHanh(item)}
        </td>
        <td class="px-3 py-2.5 text-slate-600 whitespace-nowrap">${formatDateToVN(item.ngay_ban_hanh)}</td>
        <td class="px-3 py-2.5 text-slate-800 leading-relaxed">
          <div class="line-clamp-3 font-normal" title="${escapeHtml(item.trich_yeu)}">
            ${escapeHtml(item.trich_yeu)}
          </div>
        </td>
        <td class="px-3 py-2.5 text-center whitespace-nowrap">
          ${hasDriveLink ? `
            <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition">
              <i class="fa-brands fa-google-drive text-emerald-600 mr-1 text-xs"></i>
              Xem
            </a>
          ` : `
            <span class="text-slate-300 italic">Không</span>
          `}
        </td>
        <td class="px-3 py-2.5 text-center whitespace-nowrap">
          ${canEdit ? `
            <div class="flex items-center justify-center space-x-2">
              <button onclick="editDispatch('${item.id}')" class="text-amber-600 hover:text-amber-700 hover:underline text-[11px] font-medium inline-flex items-center">
                <i class="fa-solid fa-pen-to-square mr-1"></i> Sửa
              </button>
              <span class="text-slate-300">|</span>
              <button onclick="deleteDispatch('${item.id}')" class="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-medium inline-flex items-center">
                <i class="fa-solid fa-trash-can mr-1"></i> Xóa
              </button>
            </div>
          ` : `
            <span class="text-slate-300 text-[11px] italic">--</span>
          `}
        </td>
      </tr>
    `;
  }).join("");

  if (ufmPaginationInfo) {
    ufmPaginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${filteredItems.length} bản ghi`;
  }

  renderUfmPaginationControls(totalPages);
}

function renderUfmPaginationControls(totalPages) {
  if (!ufmPaginationControls) return;
  let html = "";

  const prevDisabled = ufmCurrentPage === 1 ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToUfmPage(${ufmCurrentPage - 1})" class="pagination-btn pagination-btn-default ${prevDisabled}" title="Trang trước">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
    </button>
  `;

  for (let page = 1; page <= totalPages; page++) {
    if (page === 1 || page === totalPages || (page >= ufmCurrentPage - 1 && page <= ufmCurrentPage + 1)) {
      const activeClass = page === ufmCurrentPage ? "pagination-btn-active" : "pagination-btn-default";
      html += `
        <button onclick="goToUfmPage(${page})" class="pagination-btn ${activeClass}">
          ${page}
        </button>
      `;
    } else if (page === ufmCurrentPage - 2 || page === ufmCurrentPage + 2) {
      html += `<span class="px-1 text-slate-400">...</span>`;
    }
  }

  const nextDisabled = ufmCurrentPage === totalPages ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToUfmPage(${ufmCurrentPage + 1})" class="pagination-btn pagination-btn-default ${nextDisabled}" title="Trang sau">
      <i class="fa-solid fa-chevron-right text-[10px]"></i>
    </button>
  `;

  ufmPaginationControls.innerHTML = html;
}

window.goToUfmPage = function(page) {
  ufmCurrentPage = page;
  renderUfmDetailTable();
};

if (btnUfmFilter) btnUfmFilter.addEventListener("click", runUfmFilter);
if (btnUfmReset) {
  btnUfmReset.addEventListener("click", () => {
    if (ufmFilterFromDate) ufmFilterFromDate.value = "";
    if (ufmFilterToDate) ufmFilterToDate.value = "";
    if (ufmFilterDonVi) ufmFilterDonVi.value = "Tất cả các đơn vị";
    runUfmFilter();
    showNotification("Đã xóa bộ lọc công văn UFM", "info");
  });
}

// Render Table Header according to role
function updateTableHeaders() {
  const tableHeaderRow = document.querySelector("#dispatchTableBody")?.parentElement?.querySelector("thead tr");
  if (tableHeaderRow) {
    if (currentRole === "quantri") {
      tableHeaderRow.innerHTML = `
        <th class="px-2 py-3 text-center w-[3%]"><input type="checkbox" id="selectAllCongVan" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"></th>
        <th class="px-2.5 py-3 text-center w-[3%]">#</th>
        <th class="px-2.5 py-3 w-[11%]">Thời gian CV đến</th>
        <th class="px-2.5 py-3 w-[12%]">Số / Ký hiệu</th>
        <th class="px-2.5 py-3 w-[10%]">Loại CV</th>
        <th class="px-2.5 py-3 w-[10%]">Loại VB</th>
        <th class="px-2.5 py-3 w-[15%]">Đơn vị ban hành</th>
        <th class="px-2.5 py-3 w-[9%]">Ngày BH</th>
        <th class="px-2.5 py-3 w-[21%]">Trích yếu nội dung</th>
        <th class="px-2.5 py-3 text-center w-[6%]">File</th>
      `;
    } else {
      tableHeaderRow.innerHTML = `
        <th class="px-2.5 py-3 text-center w-[3%]">#</th>
        <th class="px-2.5 py-3 w-[11%]">Thời gian CV đến</th>
        <th class="px-2.5 py-3 w-[12%]">Số / Ký hiệu</th>
        <th class="px-2.5 py-3 w-[10%]">Loại CV</th>
        <th class="px-2.5 py-3 w-[10%]">Loại VB</th>
        <th class="px-2.5 py-3 w-[15%]">Đơn vị ban hành</th>
        <th class="px-2.5 py-3 w-[9%]">Ngày BH</th>
        <th class="px-2.5 py-3 w-[24%]">Trích yếu nội dung</th>
        <th class="px-2.5 py-3 text-center w-[6%]">File</th>
      `;
    }
  }

  const statHeaderRow = document.querySelector("#statDetailTableBody")?.parentElement?.querySelector("thead tr");
  if (statHeaderRow) {
    if (currentRole === "quantri") {
      statHeaderRow.innerHTML = `
        <th class="px-2 py-3 text-center w-[3%]"><input type="checkbox" id="statSelectAllCongVan" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"></th>
        <th class="px-3 py-3 text-center w-[3%]">#</th>
        <th class="px-3 py-3 w-[11%]">Thời gian CV đến</th>
        <th class="px-3 py-3 w-[12%]">Số / Ký hiệu</th>
        <th class="px-3 py-3 w-[10%]">Phân loại</th>
        <th class="px-3 py-3 w-[10%]">Loại VB</th>
        <th class="px-3 py-3 w-[15%]">Đơn vị ban hành</th>
        <th class="px-3 py-3 w-[9%]">Ngày ban hành</th>
        <th class="px-3 py-3 w-[21%]">Trích yếu nội dung</th>
        <th class="px-3 py-3 text-center w-[6%]">Link Drive</th>
      `;
    } else {
      statHeaderRow.innerHTML = `
        <th class="px-3 py-3 text-center w-[3%]">#</th>
        <th class="px-3 py-3 w-[11%]">Thời gian CV đến</th>
        <th class="px-3 py-3 w-[12%]">Số / Ký hiệu</th>
        <th class="px-3 py-3 w-[10%]">Phân loại</th>
        <th class="px-3 py-3 w-[10%]">Loại VB</th>
        <th class="px-3 py-3 w-[15%]">Đơn vị ban hành</th>
        <th class="px-3 py-3 w-[9%]">Ngày ban hành</th>
        <th class="px-3 py-3 w-[24%]">Trích yếu nội dung</th>
        <th class="px-3 py-3 text-center w-[6%]">Link Drive</th>
      `;
    }
  }
}

// Render Table with Pagination (Max 20 per page)
function renderDispatchList() {
  if (!dispatchTableBody) return;
  updateTableHeaders();

  const filtered = getFilteredDispatches();
  if (totalItemsBadge) {
    totalItemsBadge.textContent = `${filtered.length} / ${allDispatches.length} văn bản`;
  }

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filtered.length);
  const currentItems = filtered.slice(startIndex, endIndex);

  const colSpanCount = currentRole === "quantri" ? 10 : 9;

  if (filtered.length === 0) {
    dispatchTableBody.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="px-4 py-12 text-center text-slate-400">
          <i class="fa-regular fa-folder-open text-3xl mb-2 block"></i>
          Không tìm thấy công văn nào phù hợp.
        </td>
      </tr>
    `;
    if (paginationInfo) paginationInfo.textContent = "Hiển thị 0 - 0 trong tổng số 0 văn bản";
    if (paginationControls) paginationControls.innerHTML = "";
    updateBatchDeleteToolbarState();
    return;
  }

  dispatchTableBody.innerHTML = currentItems.map((item, index) => {
    const isDen = isCongVanDen(item.loai_cong_van);
    const badgeClass = isDen
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-purple-100 text-purple-800 border-purple-200";

    const rowNum = startIndex + index + 1;
    const driveUrl = item.drive_link || item.link_google_drive || "";
    const hasDriveLink = driveUrl && driveUrl.trim() !== "";
    const canEdit = currentRole !== "quanly";
    const hasResponse = isCongVanDi(item.loai_cong_van) && item.response_doc_id;

    const thoiGianDisplay = item.ngay_den || item.created_at || item.ngay_ban_hanh || item.ngay_nhan;

    const checkboxCell = currentRole === "quantri" ? `
      <td class="px-2 py-3 text-center">
        <input type="checkbox" class="select-cv-item w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" data-id="${item.id}" data-type="${escapeHtml(item.loai_cong_van)}">
      </td>
    ` : "";

    return `
      <tr id="row-${item.id}" class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        ${checkboxCell}
        <td class="px-2.5 py-3 font-medium text-slate-500 text-center">${rowNum}</td>
        <td class="px-2.5 py-3 whitespace-nowrap text-slate-600">
          ${formatDateToVN(thoiGianDisplay) || '--'}
        </td>
        <td class="px-2.5 py-3 font-semibold text-slate-900 break-words">
          ${escapeHtml(item.so_ky_hieu)}
          ${hasResponse ? `
            <div class="mt-1">
              <span onclick="window.viewLinkedResponseDoc('${item.response_doc_id}')" class="response-badge" title="Nhấp để xem chi tiết Công văn phản hồi">
                <i class="fa-solid fa-reply mr-1"></i> Có CV phản hồi
              </span>
            </div>
          ` : ""}
        </td>
        <td class="px-2.5 py-3">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${badgeClass}">
            <i class="fa-solid ${isDen ? 'fa-inbox' : 'fa-paper-plane'} mr-1"></i>
            ${escapeHtml(getDisplayLoaiCongVan(item.loai_cong_van))}
          </span>
        </td>
        <td class="px-2.5 py-3 text-slate-700 font-medium break-words">
          ${escapeHtml(item.loai_van_ban)}
        </td>
        <td class="px-2.5 py-3 text-slate-700 break-words">
          ${renderDonViBanHanh(item)}
        </td>
        <td class="px-2.5 py-3 whitespace-nowrap text-slate-600">
          ${formatDateToVN(item.ngay_ban_hanh)}
        </td>
        <td class="px-2.5 py-3 text-slate-800 leading-relaxed">
          <div class="line-clamp-3 font-normal" title="${escapeHtml(item.trich_yeu)}">
            ${escapeHtml(item.trich_yeu)}
          </div>
          ${canEdit ? `
            <div class="mt-1 flex items-center space-x-2">
              <button onclick="editDispatch('${item.id}')" class="text-amber-600 hover:text-amber-700 hover:underline text-[11px] font-medium inline-flex items-center">
                <i class="fa-solid fa-pen-to-square mr-1"></i> Sửa
              </button>
              <span class="text-slate-300">|</span>
              <button onclick="deleteDispatch('${item.id}')" class="text-rose-600 hover:text-rose-700 hover:underline text-[11px] font-medium inline-flex items-center">
                <i class="fa-solid fa-trash-can mr-1"></i> Xóa
              </button>
            </div>
          ` : ""}
        </td>
        <td class="px-2.5 py-3 text-center whitespace-nowrap">
          ${hasDriveLink ? `
            <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition"
               title="Mở Google Drive Link trong tab mới">
              <i class="fa-brands fa-google-drive text-emerald-600 mr-1 text-xs"></i>
              Xem
            </a>
          ` : `
            <span class="text-slate-300 text-[11px] italic">Không</span>
          `}
        </td>
      </tr>
    `;
  }).join("");

  if (paginationInfo) {
    paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${filtered.length} văn bản`;
  }

  // Reset selectAll checkbox state when re-rendering table
  const selectAllCb = document.getElementById("selectAllCongVan");
  if (selectAllCb) selectAllCb.checked = false;

  updateBatchDeleteToolbarState();
  renderPaginationControls(totalPages);
}

// Pagination Controls Renderer
function renderPaginationControls(totalPages) {
  if (!paginationControls) return;
  let html = "";

  const prevDisabled = currentPage === 1 ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToPage(${currentPage - 1})" class="pagination-btn pagination-btn-default ${prevDisabled}" title="Trang trước">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
    </button>
  `;

  for (let page = 1; page <= totalPages; page++) {
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

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderDispatchList();
  });
}

if (filterLoaiCongVan) {
  filterLoaiCongVan.addEventListener("change", () => {
    currentPage = 1;
    renderDispatchList();
  });
}

// -------------------------------------------------------------
// BATCH DELETE & CHECKBOX HANDLING LOGIC (quantri ONLY)
// -------------------------------------------------------------
function updateBatchDeleteToolbarState() {
  if (currentRole !== "quantri") return;

  // Active tab check: Home list table vs Stat detail table
  const homeTabActive = tabHomeContent && !tabHomeContent.classList.contains("hidden");

  if (homeTabActive) {
    const tableBody = document.getElementById("dispatchTableBody");
    if (!tableBody) return;
    const checkboxes = Array.from(tableBody.querySelectorAll(".select-cv-item"));
    const selectedBoxes = checkboxes.filter(cb => cb.checked);
    const count = selectedBoxes.length;

    if (selectedCountText) {
      selectedCountText.textContent = `Đã chọn: ${count} văn bản`;
    }

    if (btnBatchDelete) {
      btnBatchDelete.disabled = count === 0;
    }

    const selectAllCb = document.getElementById("selectAllCongVan");
    if (selectAllCb) {
      selectAllCb.checked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
    }
  } else {
    const statTableBody = document.getElementById("statDetailTableBody");
    if (!statTableBody) return;
    const checkboxes = Array.from(statTableBody.querySelectorAll(".select-cv-item"));
    const selectedBoxes = checkboxes.filter(cb => cb.checked);
    const count = selectedBoxes.length;

    if (statSelectedCountText) {
      statSelectedCountText.textContent = `Đã chọn: ${count} văn bản`;
    }

    if (btnStatBatchDelete) {
      btnStatBatchDelete.disabled = count === 0;
    }

    const statSelectAllCb = document.getElementById("statSelectAllCongVan");
    if (statSelectAllCb) {
      statSelectAllCb.checked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
    }
  }
}

// Global Event Listeners for Select All and Checkbox Changes (Delegated)
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "selectAllCongVan") {
    const isChecked = e.target.checked;
    const tableBody = document.getElementById("dispatchTableBody");
    if (tableBody) {
      const checkboxes = tableBody.querySelectorAll(".select-cv-item");
      checkboxes.forEach(cb => { cb.checked = isChecked; });
    }
    updateBatchDeleteToolbarState();
  } else if (e.target && e.target.id === "statSelectAllCongVan") {
    const isChecked = e.target.checked;
    const statTableBody = document.getElementById("statDetailTableBody");
    if (statTableBody) {
      const checkboxes = statTableBody.querySelectorAll(".select-cv-item");
      checkboxes.forEach(cb => { cb.checked = isChecked; });
    }
    updateBatchDeleteToolbarState();
  } else if (e.target && e.target.classList && e.target.classList.contains("select-cv-item")) {
    updateBatchDeleteToolbarState();
  }
});

async function executeBatchDelete(tableBodyId, selectAllId) {
  if (currentRole !== "quantri") {
    alert("Bạn không có quyền thực hiện thao tác xóa!");
    return;
  }

  const tableBody = document.getElementById(tableBodyId);
  if (!tableBody) return;

  const selectedCheckboxes = Array.from(tableBody.querySelectorAll(".select-cv-item:checked"));
  const count = selectedCheckboxes.length;

  if (count === 0) {
    alert("Vui lòng chọn ít nhất 1 công văn để xóa!");
    return;
  }

  const isConfirmed = confirm(`Bạn có chắc chắn muốn xóa ${count} công văn đã chọn không? Hành động này không thể hoàn tác!`);
  if (!isConfirmed) return;

  try {
    const deletePromises = selectedCheckboxes.map(async (cb) => {
      const id = cb.getAttribute("data-id");
      const loai = cb.getAttribute("data-type");

      const item = allDispatches.find(d => d.id === id);

      const isDen = isCongVanDen(loai) || (item && isCongVanDen(item.loai_cong_van));
      const subpath = isDen ? "cong_van/cong_van_den" : "cong_van/cong_van_di";

      const itemRef = ref(database, `${subpath}/${id}`);
      await remove(itemRef);

      // Clean up linked response document if exists
      if (item && item.response_doc_id) {
        try {
          await remove(ref(database, `cong_van/cong_van_den/${item.response_doc_id}`));
        } catch (err) {
          console.error("Error removing linked response doc on batch delete:", err);
        }
      }
    });

    await Promise.all(deletePromises);

    alert(`Đã xóa thành công ${count} công văn!`);

    const selectAllCb = document.getElementById(selectAllId);
    if (selectAllCb) selectAllCb.checked = false;

    // Call loadDanhSachCongVan and updateThongKe
    if (typeof window.loadDanhSachCongVan === "function") {
      window.loadDanhSachCongVan();
    }
    if (typeof window.updateThongKe === "function") {
      window.updateThongKe();
    }
  } catch (error) {
    console.error("Batch Delete Error:", error);
    alert("Lỗi khi xóa hàng loạt công văn: " + error.message);
  }
}

if (btnBatchDelete) {
  btnBatchDelete.addEventListener("click", () => {
    executeBatchDelete("dispatchTableBody", "selectAllCongVan");
  });
}

if (btnStatBatchDelete) {
  btnStatBatchDelete.addEventListener("click", () => {
    executeBatchDelete("statDetailTableBody", "statSelectAllCongVan");
  });
}

// -------------------------------------------------------------
// 4. TAB THỐNG KÊ & BẢNG CHI TIẾT CÔNG VĂN
// -------------------------------------------------------------
function updateStatSubDeptFilter() {
  if (!statPhongBan || !statDonViChiTiet || !statSubDeptFilterContainer) return;
  const mainDept = statPhongBan.value;
  statDonViChiTiet.innerHTML = `<option value="Tất cả đơn vị chi tiết">Tất cả đơn vị chi tiết</option>`;

  if (mainDept === "Phòng Hành chính - Tài vụ") {
    statSubDeptFilterContainer.classList.remove("hidden");
    const options = ["Hành chính", "Tài vụ", "Quản trị"];
    options.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      statDonViChiTiet.appendChild(optionEl);
    });
  } else if (mainDept === "Phòng Đào tạo - Khoa học và QLSV") {
    statSubDeptFilterContainer.classList.remove("hidden");
    const options = ["Đào tạo", "Khoa học", "Quản lý Sinh viên"];
    options.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt;
      optionEl.textContent = opt;
      statDonViChiTiet.appendChild(optionEl);
    });
  } else {
    statSubDeptFilterContainer.classList.add("hidden");
  }
}

function updateStatDeptFilterVisibility() {
  if (!statLoaiCongVan) return;

  if (statLoaiCongVan.value === "Công văn Đi") {
    if (statNguonDenFilterContainer) statNguonDenFilterContainer.classList.add("hidden");
    if (statDeptFilterContainer) statDeptFilterContainer.classList.remove("hidden");
    if (statNguonDenSelect) statNguonDenSelect.value = "Tất cả nguồn";
    updateStatSubDeptFilter();
  } else if (statLoaiCongVan.value === "Công văn Đến") {
    if (statNguonDenFilterContainer) statNguonDenFilterContainer.classList.remove("hidden");
    if (statDeptFilterContainer) statDeptFilterContainer.classList.add("hidden");
    if (statSubDeptFilterContainer) statSubDeptFilterContainer.classList.add("hidden");
    if (statPhongBan) statPhongBan.value = "Tất cả phòng ban";
  } else {
    // Tất cả
    if (statNguonDenFilterContainer) statNguonDenFilterContainer.classList.remove("hidden");
    if (statDeptFilterContainer) statDeptFilterContainer.classList.add("hidden");
    if (statSubDeptFilterContainer) statSubDeptFilterContainer.classList.add("hidden");
    if (statPhongBan) statPhongBan.value = "Tất cả phòng ban";
  }
}

if (statLoaiCongVan) {
  statLoaiCongVan.addEventListener("change", updateStatDeptFilterVisibility);
}

if (statPhongBan) {
  statPhongBan.addEventListener("change", updateStatSubDeptFilter);
}

function runStatistics() {
  const startDate = statStartDate ? statStartDate.value : "";
  const endDate = statEndDate ? statEndDate.value : "";
  const selectedLoai = statLoaiCongVan ? statLoaiCongVan.value : "Tất cả";
  const selectedNguonDen = statNguonDenSelect ? statNguonDenSelect.value : "Tất cả nguồn";
  const selectedDept = statPhongBan ? statPhongBan.value : "Tất cả phòng ban";
  const selectedSubDept = statDonViChiTiet ? statDonViChiTiet.value : "Tất cả đơn vị chi tiết";

  let filtered = [...allDispatches];

  if (startDate) {
    filtered = filtered.filter(item => item.ngay_ban_hanh >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(item => item.ngay_ban_hanh <= endDate);
  }
  if (selectedLoai !== "Tất cả") {
    filtered = filtered.filter(item => {
      if (selectedLoai === "Công văn Đi") return isCongVanDi(item.loai_cong_van);
      if (selectedLoai === "Công văn Đến") return isCongVanDen(item.loai_cong_van);
      return item.loai_cong_van === selectedLoai;
    });
  }
  if (selectedNguonDen !== "Tất cả nguồn") {
    filtered = filtered.filter(item => {
      if (!isCongVanDen(item.loai_cong_van)) return false;
      const itemNguon = item.nguon_cong_van || (item.phong_ban === "UFM Cơ sở chính" ? "UFM Cơ sở chính" : "Khác");
      return itemNguon === selectedNguonDen;
    });
  }
  if (selectedLoai === "Công văn Đi" && selectedDept !== "Tất cả phòng ban") {
    filtered = filtered.filter(item => item.phong_ban === selectedDept);
  }
  if (selectedSubDept !== "Tất cả đơn vị chi tiết") {
    filtered = filtered.filter(item => item.don_vi_chi_tiet === selectedSubDept);
  }

  const totalCount = filtered.length;
  const denCount = filtered.filter(i => isCongVanDen(i.loai_cong_van)).length;
  const diCount = filtered.filter(i => isCongVanDi(i.loai_cong_van)).length;

  const statTotal = document.getElementById("statTotalCount");
  const statDen = document.getElementById("statDenCount");
  const statDi = document.getElementById("statDiCount");

  if (statTotal) statTotal.textContent = totalCount;
  if (statDen) statDen.textContent = denCount;
  if (statDi) statDi.textContent = diCount;

  currentFilteredStatItems = filtered;
  statCurrentPage = 1;

  // Render Bảng chi tiết công văn thỏa điều kiện lọc trong Tab Thống kê
  renderStatDetailTable();
}

function renderStatDetailTable() {
  if (!statDetailTableBody) return;

  const filteredItems = currentFilteredStatItems || [];

  if (statDetailBadge) {
    statDetailBadge.textContent = `${filteredItems.length} kết quả`;
  }

  const totalPages = Math.ceil(filteredItems.length / statItemsPerPage) || 1;
  if (statCurrentPage > totalPages) {
    statCurrentPage = totalPages;
  }

  const startIndex = (statCurrentPage - 1) * statItemsPerPage;
  const endIndex = Math.min(startIndex + statItemsPerPage, filteredItems.length);
  const currentItems = filteredItems.slice(startIndex, endIndex);

  const colSpanCount = currentRole === "quantri" ? 10 : 9;

  if (filteredItems.length === 0) {
    statDetailTableBody.innerHTML = `
      <tr>
        <td colspan="${colSpanCount}" class="px-4 py-8 text-center text-slate-400">
          Không có công văn nào phù hợp với bộ lọc thống kê.
        </td>
      </tr>
    `;
    if (statPaginationInfo) statPaginationInfo.textContent = "Hiển thị 0 - 0 trong tổng số 0 bản ghi";
    if (statPaginationControls) statPaginationControls.innerHTML = "";
    updateBatchDeleteToolbarState();
    return;
  }

  statDetailTableBody.innerHTML = currentItems.map((item, index) => {
    const isDen = isCongVanDen(item.loai_cong_van);
    const badgeClass = isDen
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-purple-100 text-purple-800 border-purple-200";
    const driveUrl = item.drive_link || item.link_google_drive || "";
    const hasDriveLink = driveUrl && driveUrl.trim() !== "";
    const hasResponse = isCongVanDi(item.loai_cong_van) && item.response_doc_id;

    const thoiGianDisplay = item.ngay_den || item.created_at || item.ngay_ban_hanh || item.ngay_nhan;

    const checkboxCell = currentRole === "quantri" ? `
      <td class="px-2 py-3 text-center">
        <input type="checkbox" class="select-cv-item w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer" data-id="${item.id}" data-type="${escapeHtml(item.loai_cong_van)}">
      </td>
    ` : "";

    return `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100 text-xs">
        ${checkboxCell}
        <td class="px-3 py-2.5 font-medium text-slate-500 text-center">${startIndex + index + 1}</td>
        <td class="px-3 py-2.5 whitespace-nowrap text-slate-600">
          ${formatDateToVN(thoiGianDisplay) || '--'}
        </td>
        <td class="px-3 py-2.5 font-semibold text-slate-900 break-words">
          ${escapeHtml(item.so_ky_hieu)}
          ${hasResponse ? `
            <div class="mt-1">
              <span onclick="window.viewLinkedResponseDoc('${item.response_doc_id}')" class="response-badge" title="Nhấp để xem chi tiết Công văn phản hồi">
                <i class="fa-solid fa-reply mr-1"></i> Có CV phản hồi
              </span>
            </div>
          ` : ""}
        </td>
        <td class="px-3 py-2.5">
          <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}">
            ${escapeHtml(getDisplayLoaiCongVan(item.loai_cong_van))}
          </span>
        </td>
        <td class="px-3 py-2.5 text-slate-700 font-medium">${escapeHtml(item.loai_van_ban)}</td>
        <td class="px-3 py-2.5 text-slate-700 break-words">
          ${renderDonViBanHanh(item)}
        </td>
        <td class="px-3 py-2.5 text-slate-600 whitespace-nowrap">${formatDateToVN(item.ngay_ban_hanh)}</td>
        <td class="px-3 py-2.5 text-slate-800 leading-relaxed">
          <div class="line-clamp-3 font-normal" title="${escapeHtml(item.trich_yeu)}">
            ${escapeHtml(item.trich_yeu)}
          </div>
        </td>
        <td class="px-3 py-2.5 text-center whitespace-nowrap">
          ${hasDriveLink ? `
            <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-medium transition">
              <i class="fa-brands fa-google-drive text-emerald-600 mr-1 text-xs"></i>
              Xem
            </a>
          ` : `
            <span class="text-slate-300 italic">Không</span>
          `}
        </td>
      </tr>
    `;
  }).join("");

  if (statPaginationInfo) {
    statPaginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${filteredItems.length} bản ghi`;
  }

  // Reset stat selectAll checkbox state when re-rendering table
  const statSelectAllCb = document.getElementById("statSelectAllCongVan");
  if (statSelectAllCb) statSelectAllCb.checked = false;

  updateBatchDeleteToolbarState();
  renderStatPaginationControls(totalPages);
}

function renderStatPaginationControls(totalPages) {
  if (!statPaginationControls) return;
  let html = "";

  const prevDisabled = statCurrentPage === 1 ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToStatPage(${statCurrentPage - 1})" class="pagination-btn pagination-btn-default ${prevDisabled}" title="Trang trước">
      <i class="fa-solid fa-chevron-left text-[10px]"></i>
    </button>
  `;

  for (let page = 1; page <= totalPages; page++) {
    if (page === 1 || page === totalPages || (page >= statCurrentPage - 1 && page <= statCurrentPage + 1)) {
      const activeClass = page === statCurrentPage ? "pagination-btn-active" : "pagination-btn-default";
      html += `
        <button onclick="goToStatPage(${page})" class="pagination-btn ${activeClass}">
          ${page}
        </button>
      `;
    } else if (page === statCurrentPage - 2 || page === statCurrentPage + 2) {
      html += `<span class="px-1 text-slate-400">...</span>`;
    }
  }

  const nextDisabled = statCurrentPage === totalPages ? "pagination-btn-disabled" : "";
  html += `
    <button onclick="goToStatPage(${statCurrentPage + 1})" class="pagination-btn pagination-btn-default ${nextDisabled}" title="Trang sau">
      <i class="fa-solid fa-chevron-right text-[10px]"></i>
    </button>
  `;

  statPaginationControls.innerHTML = html;
}

window.goToStatPage = function(page) {
  statCurrentPage = page;
  renderStatDetailTable();
};

if (statPageSizeSelect) {
  statPageSizeSelect.addEventListener("change", (e) => {
    statItemsPerPage = parseInt(e.target.value, 10) || 20;
    statCurrentPage = 1;
    renderStatDetailTable();
  });
}

if (btnStatFilter) btnStatFilter.addEventListener("click", runStatistics);
if (btnStatReset) {
  btnStatReset.addEventListener("click", () => {
    if (statStartDate) statStartDate.value = "";
    if (statEndDate) statEndDate.value = "";
    if (statLoaiCongVan) statLoaiCongVan.value = "Tất cả";
    if (statNguonDenSelect) statNguonDenSelect.value = "Tất cả nguồn";
    if (statPhongBan) statPhongBan.value = "Tất cả phòng ban";
    if (statDonViChiTiet) statDonViChiTiet.value = "Tất cả đơn vị chi tiết";
    updateStatDeptFilterVisibility();
    runStatistics();
    showNotification("Đã đặt lại bộ lọc thống kê", "info");
  });
}

// -------------------------------------------------------------
// 5. BACKUP & EXPORT DATA LOGIC (quantri ONLY)
// -------------------------------------------------------------
function exportToExcel() {
  if (currentRole !== "quantri") {
    showNotification("Bạn không có quyền thực hiện chức năng này!", "error");
    return;
  }

  if (!allDispatches || allDispatches.length === 0) {
    showNotification("Không có dữ liệu công văn để xuất Excel!", "error");
    return;
  }

  try {
    if (typeof XLSX === "undefined") {
      showNotification("Thư viện SheetJS chưa sẵn sàng!", "error");
      return;
    }

    const headers = [
      "Thời gian CV đến",
      "Số / Ký hiệu",
      "Phân loại",
      "Loại văn bản",
      "Đơn vị ban hành / Chi tiết",
      "Ngày ban hành",
      "Trích yếu nội dung",
      "Link đính kèm"
    ];

    const exportData = allDispatches.map((item) => {
      const isDen = isCongVanDen(item.loai_cong_van);
      let displayLoai = isDen ? "CV đến" : "CV đi";

      let coQuan = item.co_quan_ban_hanh || item.phong_ban || "";
      if (!isDen && item.don_vi_chi_tiet) {
        coQuan = `${coQuan} (${item.don_vi_chi_tiet})`;
      }

      const linkDrive = item.link_google_drive || item.drive_link || "";

      return {
        "Thời gian CV đến": isDen ? formatDateToVN(item.ngay_den) : "",
        "Số / Ký hiệu": item.so_ky_hieu || "",
        "Phân loại": displayLoai,
        "Loại văn bản": item.loai_van_ban || "",
        "Đơn vị ban hành / Chi tiết": coQuan,
        "Ngày ban hành": formatDateToVN(item.ngay_ban_hanh),
        "Trích yếu nội dung": item.trich_yeu || "",
        "Link đính kèm": linkDrive
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData, { header: headers });

    // Header row styling / prominence
    worksheet["!rows"] = [{ hpt: 26 }];

    // Auto-fit column widths
    const colWidths = headers.map(header => ({ wch: Math.max(header.length + 4, 15) }));

    exportData.forEach((row, idx) => {
      const rowNum = idx + 2;
      headers.forEach((header, colIdx) => {
        const val = row[header] ? String(row[header]) : "";
        if (val.length + 3 > colWidths[colIdx].wch) {
          colWidths[colIdx].wch = Math.min(val.length + 3, 60);
        }
      });

      // Hyperlink for 'Link đính kèm' (Column H)
      const linkUrl = row["Link đính kèm"];
      if (linkUrl && (linkUrl.startsWith("http://") || linkUrl.startsWith("https://"))) {
        const cellRef = "H" + rowNum;
        if (worksheet[cellRef]) {
          worksheet[cellRef].l = { Target: linkUrl, Tooltip: linkUrl };
        }
      }
    });

    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách Công văn");

    const todayStr = new Date().toISOString().split("T")[0];
    const fileName = `Danh_sach_cong_van_${todayStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    showNotification(`Đã xuất file Excel "${fileName}" thành công!`);
  } catch (error) {
    console.error("Export Excel Error:", error);
    showNotification("Lỗi khi xuất file Excel: " + error.message, "error");
  }
}

function exportToJSON() {
  if (currentRole !== "quantri") {
    showNotification("Bạn không có quyền thực hiện chức năng này!", "error");
    return;
  }

  if (!allDispatches || allDispatches.length === 0) {
    showNotification("Không có dữ liệu công văn để xuất JSON!", "error");
    return;
  }

  try {
    // Structure standard Firebase RTDB dump format for cong_van
    const jsonDump = {};
    allDispatches.forEach(item => {
      const { id, ...data } = item;
      jsonDump[id] = data;
    });

    const jsonString = JSON.stringify(jsonDump, null, 2);
    const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const todayStr = new Date().toISOString().split("T")[0];
    const fileName = `Backup_CongVan_UFM_${todayStr}.json`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(`Đã xuất file Backup JSON "${fileName}" thành công!`);
  } catch (error) {
    console.error("Export JSON Error:", error);
    showNotification("Lỗi khi xuất file JSON: " + error.message, "error");
  }
}

// -------------------------------------------------------------
// 6. USER MANAGEMENT LOGIC (ADMIN / quantri ONLY)
// -------------------------------------------------------------
if (addUserForm) {
  addUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = newUsernameInput.value.trim();
    const password = newPasswordInput.value.trim();
    const role = newUserRoleSelect.value;

    if (!username || !password || !role) {
      showNotification("Vui lòng điền đầy đủ tên đăng nhập, mật khẩu và vai trò!", "error");
      return;
    }

    try {
      const existingSnap = await get(ref(database, `users/${username}`));
      if (existingSnap.exists() || customUsers[username]) {
        showNotification(`Tên đăng nhập "${username}" đã tồn tại trên hệ thống!`, "error");
        return;
      }

      const userRef = ref(database, `users/${username}`);
      await set(userRef, {
        password,
        role,
        created_at: Date.now()
      });

      showNotification(`Đã tạo tài khoản "${username}" thành công!`);
      addUserForm.reset();
    } catch (error) {
      console.error("Add user error:", error);
      showNotification("Lỗi khi tạo user: " + error.message, "error");
    }
  });
}

function renderUserList() {
  if (!userTableBody || currentRole !== "quantri") return;

  const userKeys = Object.keys(customUsers);

  if (userKeys.length === 0) {
    userTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-3 py-4 text-center text-slate-400">Chưa có dữ liệu tài khoản.</td>
      </tr>
    `;
    return;
  }

  let html = "";
  let index = 1;

  userKeys.forEach(u => {
    const acc = customUsers[u];
    html += `
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-3 py-2.5 text-center font-medium text-slate-500">${index++}</td>
        <td class="px-3 py-2.5 font-bold text-slate-800">${escapeHtml(u)}</td>
        <td class="px-3 py-2.5 text-slate-600 font-mono">••••••••</td>
        <td class="px-3 py-2.5">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
            ${escapeHtml(getRoleBadgeText(acc.role))}
          </span>
        </td>
        <td class="px-3 py-2.5 text-center">
          <button onclick="deleteCustomUser('${acc.id}', '${escapeHtml(u)}')" class="text-rose-600 hover:text-rose-800 font-semibold text-xs inline-flex items-center">
            <i class="fa-solid fa-trash-can mr-1"></i> Xóa
          </button>
        </td>
      </tr>
    `;
  });

  userTableBody.innerHTML = html;
}

window.deleteCustomUser = async function(id, username) {
  if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"?`)) {
    try {
      const userRef = ref(database, `users/${id}`);
      await remove(userRef);
      showNotification(`Đã xóa tài khoản "${username}" thành công!`);
    } catch (error) {
      console.error("Delete user error:", error);
      showNotification("Lỗi khi xóa tài khoản: " + error.message, "error");
    }
  }
};

// -------------------------------------------------------------
// 7. RESPONSE DOCUMENT DETAIL MODAL LOGIC
// -------------------------------------------------------------
let currentActiveResponseDocId = null;

window.viewLinkedResponseDoc = function(responseDocId) {
  const respItem = allDispatches.find(d => d.id === responseDocId);
  currentActiveResponseDocId = responseDocId;

  if (respItem) {
    if (modalResponseSoKyHieu) modalResponseSoKyHieu.textContent = respItem.so_ky_hieu || "Không có";
    if (modalResponseNgayBanHanh) modalResponseNgayBanHanh.textContent = formatDate(respItem.ngay_ban_hanh);
    if (modalResponseCoQuan) modalResponseCoQuan.textContent = respItem.phong_ban || "Không có";
    if (modalResponseTrichYeu) modalResponseTrichYeu.textContent = respItem.trich_yeu || "Không có";
    if (modalResponseDriveContainer) {
      if (respItem.drive_link && respItem.drive_link.trim() !== "") {
        modalResponseDriveContainer.innerHTML = `
          <a href="${escapeHtml(respItem.drive_link)}" target="_blank" rel="noopener noreferrer"
             class="inline-flex items-center px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold transition">
            <i class="fa-brands fa-google-drive text-emerald-600 mr-1.5 text-sm"></i>
            Xem file Google Drive
          </a>
        `;
      } else {
        modalResponseDriveContainer.innerHTML = `<span class="text-slate-400 italic">Không có file đính kèm</span>`;
      }
    }
  } else {
    if (modalResponseSoKyHieu) modalResponseSoKyHieu.textContent = "Chưa tìm thấy bản ghi";
    if (modalResponseNgayBanHanh) modalResponseNgayBanHanh.textContent = "--";
    if (modalResponseCoQuan) modalResponseCoQuan.textContent = "--";
    if (modalResponseTrichYeu) modalResponseTrichYeu.textContent = "Thông tin công văn phản hồi đang được cập nhật...";
    if (modalResponseDriveContainer) modalResponseDriveContainer.innerHTML = `<span class="text-slate-400 italic">--</span>`;
  }

  if (responseDetailModal) {
    responseDetailModal.classList.remove("hidden");
  }
};

function closeResponseModal() {
  if (responseDetailModal) {
    responseDetailModal.classList.add("hidden");
  }
}

if (closeResponseModalBtn) closeResponseModalBtn.addEventListener("click", closeResponseModal);
if (modalBtnClose) modalBtnClose.addEventListener("click", closeResponseModal);

if (modalBtnJumpToDoc) {
  modalBtnJumpToDoc.addEventListener("click", () => {
    closeResponseModal();

    if (filterLoaiCongVan) {
      filterLoaiCongVan.value = "Công văn Đến";
    }
    if (searchInput) {
      searchInput.value = "";
    }

    currentPage = 1;
    renderDispatchList();

    if (currentActiveResponseDocId) {
      setTimeout(() => {
        const targetRow = document.getElementById(`row-${currentActiveResponseDocId}`);
        if (targetRow) {
          targetRow.scrollIntoView({ behavior: "smooth", block: "center" });
          targetRow.classList.add("bg-amber-100/80");
          setTimeout(() => {
            targetRow.classList.remove("bg-amber-100/80");
          }, 2500);
        }
      }, 100);
    }
  });
}

// Excel Import Logic (quantri ONLY)
async function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (currentRole !== "quantri") {
    alert("Bạn không có quyền thực hiện chức năng này!");
    e.target.value = "";
    return;
  }

  try {
    const dataObj = await file.arrayBuffer();
    const workbook = XLSX.read(dataObj, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    let headerRowIndex = matrix.findIndex(r => Array.isArray(r) && (r.includes("Số / Ký hiệu") || r.includes("So / Ky hieu")));
    if (headerRowIndex === -1) headerRowIndex = 0;

    const rawJsonArray = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });

    if (!rawJsonArray || rawJsonArray.length === 0) {
      alert("Tệp Excel không có dữ liệu!");
      e.target.value = "";
      return;
    }

    const mappedData = rawJsonArray.map(row => {
      const rawLoai = String(row["Phân loại"] || row["Loại CV"] || "").trim();
      let loai_cong_van = "Công văn Đi";
      if (rawLoai.toLowerCase().includes("đến") || rawLoai.toLowerCase().includes("den") || rawLoai === "CongVanDen") {
        loai_cong_van = "Công văn Đến";
      } else if (rawLoai.toLowerCase().includes("đi") || rawLoai.toLowerCase().includes("di") || rawLoai === "CongVanDi") {
        loai_cong_van = "Công văn Đi";
      }

      let coQuanRaw = String(row["Đơn vị ban hành / Chi tiết"] || row["Đơn vị ban hành"] || row["Đơn vị / Phòng ban"] || "").trim();
      let mainCoQuan = coQuanRaw;
      let donViChiTiet = "";

      if (coQuanRaw.includes("(") && coQuanRaw.endsWith(")")) {
        const match = coQuanRaw.match(/^(.*?)\s*\((.*?)\)$/);
        if (match) {
          mainCoQuan = match[1].trim();
          donViChiTiet = match[2].trim();
        }
      }

      const linkDrive = row["Link đính kèm"] || row["Link đính kèm (Drive)"] || row["Link Google Drive"] || "";
      const rawNgayDen = row["Thời gian CV đến"] || row["Ngày đến"] || "";

      const record = {
        so_ky_hieu: String(row["Số / Ký hiệu"] || "").trim(),
        loai_cong_van: loai_cong_van,
        loai_van_ban: String(row["Loại văn bản"] || "").trim(),
        co_quan_ban_hanh: mainCoQuan,
        phong_ban: mainCoQuan,
        ngay_ban_hanh: formatDateToYYYYMMDD(row["Ngày ban hành"] || row["Ngày tháng văn bản"]),
        trich_yeu: String(row["Trích yếu nội dung"] || row["Trích yếu nội dung văn bản"] || "").trim(),
        link_google_drive: String(linkDrive).trim(),
        drive_link: String(linkDrive).trim(),
        created_at: Date.now()
      };

      if (isCongVanDen(loai_cong_van)) {
        record.ngay_den = formatDateToYYYYMMDD(rawNgayDen);
        record.nguon_cong_van = mainCoQuan === "UFM Cơ sở chính" ? "UFM Cơ sở chính" : "Khác";
      } else {
        if (donViChiTiet) {
          record.don_vi_chi_tiet = donViChiTiet;
        }
      }

      return record;
    });

    for (const item of mappedData) {
      if (isCongVanDen(item.loai_cong_van)) {
        const denListRef = ref(database, "cong_van/cong_van_den");
        const newRef = push(denListRef);
        await set(newRef, item);
      } else {
        const diListRef = ref(database, "cong_van/cong_van_di");
        const newRef = push(diListRef);
        await set(newRef, item);
      }
    }

    alert("Import thành công!");

    if (typeof renderDispatchList === "function") {
      renderDispatchList();
    }
    if (typeof runStatistics === "function") {
      runStatistics();
    }
  } catch (error) {
    console.error("Import Excel Error:", error);
    alert("Lỗi khi đọc hoặc import tệp Excel: " + error.message);
  } finally {
    e.target.value = "";
  }
}

// Bind Import & Backup Click Events
if (btnImportExcel) {
  btnImportExcel.addEventListener("click", () => {
    if (excelFileInput) excelFileInput.click();
  });
}
if (headerBtnImportExcel) {
  headerBtnImportExcel.addEventListener("click", () => {
    if (excelFileInput) excelFileInput.click();
  });
}
if (excelFileInput) {
  excelFileInput.addEventListener("change", handleExcelImport);
}

if (btnExportExcel) btnExportExcel.addEventListener("click", exportToExcel);
if (btnExportJSON) btnExportJSON.addEventListener("click", exportToJSON);
if (headerBtnExportExcel) headerBtnExportExcel.addEventListener("click", exportToExcel);
if (headerBtnExportJSON) headerBtnExportJSON.addEventListener("click", exportToJSON);

// -------------------------------------------------------------
// AUTO REFRESH (MỖI 5 PHÚT / 300.000 ms)
// -------------------------------------------------------------
setInterval(() => {
  console.log("Tự động làm mới dữ liệu...");
  if (typeof loadDanhSachCongVan === 'function') loadDanhSachCongVan();
  if (typeof updateThongKe === 'function') updateThongKe();
}, 300000);

// -------------------------------------------------------------
// APP INITIALIZATION
// -------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupNavigationTabs();
  updateDynamicUnitField();
  updateStatDeptFilterVisibility();
  setDefaultDate();
  autoSeedData();
  checkAuthStatus();
});
