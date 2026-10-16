(() => {
  "use strict";

  const STORAGE_KEY = "finora-demo-state-v1";
  const VND = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2
  });
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  const categoryOptions = {
    chi: ["Ăn uống", "Di chuyển", "Mua sắm", "Hóa đơn", "Sức khỏe", "Khác"],
    thu: ["Lương", "Thưởng", "Đầu tư", "Thu nhập khác"]
  };

  const categoryStyle = {
    "Ăn uống": { icon: "☕", className: "food", pill: "food-pill" },
    "Lương": { icon: "↙", className: "salary", pill: "salary-pill" },
    "Thưởng": { icon: "✦", className: "salary", pill: "salary-pill" },
    "Thu nhập khác": { icon: "↙", className: "salary", pill: "salary-pill" },
    "Mua sắm": { icon: "◇", className: "shopping", pill: "shopping-pill" },
    "Di chuyển": { icon: "↗", className: "transport", pill: "transport-pill" },
    "Hóa đơn": { icon: "▤", className: "transport", pill: "transport-pill" },
    "Sức khỏe": { icon: "+", className: "food", pill: "food-pill" },
    "Khác": { icon: "•", className: "shopping", pill: "shopping-pill" }
  };

  const initialState = {
    balance: 28450000,
    income: 18500000,
    expense: 7250000,
    budgetSpent: 5420000,
    budgetLimit: 8000000,
    accounts: { bank: 22350000, cash: 3100000, wallet: 3000000 },
    categoryBudgets: {
      "Ăn uống": { spent: 1650000, limit: 2000000 },
      "Di chuyển": { spent: 720000, limit: 1200000 },
      "Mua sắm": { spent: 1350000, limit: 1500000 }
    },
    transactions: [
      { id: "sample-1", name: "Cà phê Highlands", account: "cash", kind: "chi", category: "Ăn uống", amount: 65000, date: "2026-10-13", description: "Cà phê Highlands" },
      { id: "sample-2", name: "Lương tháng 10", account: "bank", kind: "thu", category: "Lương", amount: 15000000, date: "2026-10-12", description: "Lương tháng 10" },
      { id: "sample-3", name: "Mua đồ gia dụng", account: "wallet", kind: "chi", category: "Mua sắm", amount: 450000, date: "2026-10-11", description: "Mua đồ gia dụng" },
      { id: "sample-4", name: "GrabBike", account: "cash", kind: "chi", category: "Di chuyển", amount: 32000, date: "2026-10-10", description: "GrabBike" }
    ]
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  let state = loadState();
  let toastTimer = null;
  let chartRangeIndex = 1;
  let activeApiToken = null;
  let activeApiUser = null;
  let activeApiAccounts = [];
  let activeApiCategories = [];
  let activeApiTransactions = [];
  let activeApiBudgets = [];
  let pendingTransferAttempt = null;
  let pendingTransactionAttempt = null;
  const chartRanges = [3, 6, 12];

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(initialState);
      const parsed = JSON.parse(saved);
      if (!parsed || !Array.isArray(parsed.transactions) || !parsed.accounts) {
        return clone(initialState);
      }
      return parsed;
    } catch {
      return clone(initialState);
    }
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      showToast("Trình duyệt không cho phép lưu dữ liệu cục bộ.");
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function money(value) {
    return `${VND.format(value)} ₫`;
  }

  function amountMarkup(value) {
    return `${VND.format(value)} <small>₫</small>`;
  }

  function dateLabel(isoDate) {
    if (!isoDate) return "—";
    const raw = String(isoDate);
    const date = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? escapeHtml(raw) : dateFormatter.format(date);
  }

  const historyDateFormatter = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  function dateTimeLabel(value) {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : historyDateFormatter.format(date);
  }

  function renderTransferHistory(transactions) {
    const tbody = $("#transferHistoryRows");
    const status = $("#transferHistoryStatus");
    if (!tbody || !status) return;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-row">Chưa có giao dịch chuyển tiền.</td></tr>';
      status.textContent = "Chưa có giao dịch chuyển tiền cho người dùng này.";
      status.className = "api-connection-status";
      return;
    }

    tbody.innerHTML = transactions.map(item => {
      const id = Number(item.chuyenKhoanId);
      const sourceId = Number(item.tkNguonId);
      const destinationId = Number(item.tkDichId);
      const amount = Number(item.soTien);
      const sourceName = item.tenTkNguon || `Tài khoản ${sourceId}`;
      const destinationName = item.tenTkDich || `Tài khoản ${destinationId}`;
      const description = item.moTa && String(item.moTa).trim()
        ? String(item.moTa).trim() : "—";
      return `<tr>
        <td>#${Number.isFinite(id) ? id : "—"}</td>
        <td class="date-cell">${escapeHtml(dateTimeLabel(item.ngayTao))}</td>
        <td>${escapeHtml(sourceName)} <small class="history-account-id">#${Number.isFinite(sourceId) ? sourceId : "—"}</small></td>
        <td>${escapeHtml(destinationName)} <small class="history-account-id">#${Number.isFinite(destinationId) ? destinationId : "—"}</small></td>
        <td class="align-right amount-out">${Number.isFinite(amount) ? escapeHtml(money(amount)) : "—"}</td>
        <td>${escapeHtml(description)}</td>
      </tr>`;
    }).join("");

    status.textContent = `Đã tải ${transactions.length} giao dịch chuyển tiền gần nhất.`;
    status.className = "api-connection-status is-success";
  }

  async function refreshTransferHistory() {
    const panel = $("#transferHistoryPanel");
    const status = $("#transferHistoryStatus");
    const button = $("#refreshTransferHistoryBtn");
    if (!panel || !status || !activeApiToken) return;

    panel.hidden = false;
    panel.removeAttribute("hidden");
    if (button) {
      button.disabled = true;
      button.textContent = "Đang tải...";
    }
    status.textContent = "Đang tải lịch sử chuyển tiền...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/chuyen-khoan`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = body && typeof body === "object"
          ? (body.detail || body.title || body.message)
          : null;
        throw new Error(`${response.status}: ${message || "Không thể tải lịch sử chuyển tiền."}`);
      }

      if (!Array.isArray(body)) {
        throw new Error("API lịch sử không trả về đúng định dạng danh sách.");
      }

      renderTransferHistory(body);
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API lịch sử. Kiểm tra Flask Gateway và kết nối mạng."
        : (error.message || "Không thể tải lịch sử chuyển tiền.");
      status.className = "api-connection-status is-error";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Tải lại lịch sử";
      }
    }
  }

  function renderApiCategories(categories) {
    const list = $("#apiCategoryList");
    if (!list) return;
    if (!Array.isArray(categories) || categories.length === 0) {
      list.innerHTML = '<div class="api-category-empty">Bạn chưa có danh mục. Hãy tạo danh mục thu nhập hoặc chi tiêu bên dưới.</div>';
      return;
    }
    list.innerHTML = categories.map(category => {
      const kind = String(category.loaiGd || "").toLowerCase();
      const isIncome = kind === "thu";
      return `<div class="api-category-item">
        <div><div class="api-category-name">${escapeHtml(category.tenDanhMuc || "Danh mục")}</div>
        <div class="api-category-meta">Mã danh mục #${Number(category.danhMucId)}</div></div>
        <span class="api-category-kind ${isIncome ? "income" : "expense"}">${isIncome ? "Thu nhập" : "Chi tiêu"}</span>
      </div>`;
    }).join("");
  }

  async function refreshCategoriesFromApi() {
    const panel = $("#categories");
    const status = $("#categoryApiStatus");
    const button = $("#refreshCategoriesBtn");
    if (!activeApiToken || !panel || !status) return;

    panel.hidden = false;
    panel.removeAttribute("hidden");
    if (button) {
      button.disabled = true;
      button.textContent = "Đang tải...";
    }
    status.textContent = "Đang tải danh mục...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/danh-muc`, {
        method: "GET",
        headers: { "Accept": "application/json", "Authorization": `Bearer ${activeApiToken}` },
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        const message = body && typeof body === "object" ? (body.detail || body.title || body.message) : null;
        throw new Error(`${response.status}: ${message || "Không thể tải danh mục."}`);
      }
      if (!Array.isArray(body)) throw new Error("API danh mục không trả về danh sách hợp lệ.");
      activeApiCategories = body;
      renderApiCategories(body);
      updateCategoryOptions();
      updateBudgetCategoryOptions();
      status.textContent = `Đã tải ${body.length} danh mục của bạn.`;
      status.className = "api-connection-status is-success";
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API danh mục. Kiểm tra Flask Gateway."
        : (error.message || "Không thể tải danh mục.");
      status.className = "api-connection-status is-error";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Tải lại danh mục";
      }
    }
  }

  function updateBudgetCategoryOptions() {
    const select = $("#newBudgetCategory");
    if (!select) return;
    const previous = select.value;
    const categories = activeApiCategories.filter(category =>
      String(category.loaiGd || "").toLowerCase() === "chi"
    );

    if (!activeApiToken) {
      select.innerHTML = '<option value="">Đăng nhập để tải danh mục</option>';
      return;
    }
    if (categories.length === 0) {
      select.innerHTML = '<option value="">Chưa có danh mục chi tiêu</option>';
      return;
    }

    select.innerHTML = '<option value="">Chọn danh mục chi tiêu</option>' + categories
      .map(category => `<option value="${Number(category.danhMucId)}">${escapeHtml(category.tenDanhMuc)}</option>`)
      .join("");
    if (categories.some(category => String(category.danhMucId) === previous)) {
      select.value = previous;
    }
  }

  function renderBudgets(budgets) {
    const list = $("#apiBudgetList");
    if (!list) return;
    if (!Array.isArray(budgets) || budgets.length === 0) {
      list.innerHTML = '<div class="api-budget-empty">Bạn chưa có ngân sách. Tạo ngân sách đầu tiên bằng biểu mẫu phía trên.</div>';
      return;
    }

    list.innerHTML = budgets.map(budget => {
      const limit = Number(budget.soTienGioiHan || 0);
      const spent = Number(budget.soTienDaChi || 0);
      const remaining = Number(budget.soTienConLai ?? (limit - spent));
      const percent = limit > 0 ? Math.round(spent / limit * 100) : 0;
      const width = Math.max(0, Math.min(percent, 100));
      const exceeded = Boolean(budget.vuotNganSach) || spent > limit;
      const start = dateLabel(budget.tuNgay);
      const end = dateLabel(budget.denNgay);
      return `<article class="api-budget-card">
        <div class="api-budget-card-top">
          <div><strong>${escapeHtml(budget.tenDanhMuc || `Danh mục #${Number(budget.danhMucId)}`)}</strong><span class="api-budget-period">${escapeHtml(start)} – ${escapeHtml(end)}</span></div>
          <span class="api-budget-percent ${exceeded ? "is-over" : ""}">${percent}%</span>
        </div>
        <div class="api-budget-progress"><span class="${exceeded ? "is-over" : ""}" style="width:${width}%"></span></div>
        <div class="api-budget-amounts"><span>Đã chi <strong>${escapeHtml(money(spent))}</strong></span><span>Giới hạn <strong>${escapeHtml(money(limit))}</strong></span></div>
        <div class="api-budget-card-foot"><span>${exceeded ? `Vượt ngân sách ${escapeHtml(money(Math.max(0, -remaining)))}` : `Còn lại ${escapeHtml(money(remaining))}`}</span><span>Mã #${Number(budget.nganSachId)}</span></div>
      </article>`;
    }).join("");
  }

  async function refreshBudgetsFromApi() {
    const panel = $("#apiBudgetsPanel");
    const status = $("#budgetApiStatus");
    const button = $("#refreshBudgetsBtn");
    if (!activeApiToken || !panel || !status) return;

    panel.hidden = false;
    panel.removeAttribute("hidden");
    const demoPanel = $("#demoBudgetsPanel");
    if (demoPanel) demoPanel.hidden = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Đang tải...";
    }
    status.textContent = "Đang tải ngân sách...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/ngan-sach`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        const message = body && typeof body === "object"
          ? (body.detail || body.title || body.message) : null;
        if (response.status === 401) {
          activeApiToken = null;
          activeApiUser = null;
          activeApiAccounts = [];
          activeApiCategories = [];
          activeApiTransactions = [];
          activeApiBudgets = [];
          panel.hidden = true;
          if (demoPanel) demoPanel.hidden = false;
          $("#loginForm").hidden = false;
          $("#apiSessionPanel").hidden = true;
          throw new Error("401: Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
        }
        throw new Error(`${response.status}: ${message || "Không thể tải ngân sách."}`);
      }
      if (!Array.isArray(body)) throw new Error("API ngân sách không trả về danh sách hợp lệ.");
      activeApiBudgets = body;
      renderBudgets(body);
      updateBudgetCategoryOptions();
      status.textContent = `Đã tải ${body.length} ngân sách của bạn.`;
      status.className = "api-connection-status is-success";
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API ngân sách. Kiểm tra Flask Gateway."
        : (error.message || "Không thể tải ngân sách.");
      status.className = "api-connection-status is-error";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Tải lại ngân sách";
      }
    }
  }

  async function createBudgetFromApi(event) {
    event.preventDefault();
    const status = $("#budgetApiStatus");
    const button = $("#createBudgetButton");
    if (!activeApiToken) {
      status.textContent = "Vui lòng đăng nhập trước.";
      status.className = "api-connection-status is-error";
      return;
    }

    const danhMucId = Number($("#newBudgetCategory").value);
    const amountText = $("#newBudgetLimit").value.trim();
    const soTienGioiHan = Number(amountText);
    const tuNgay = $("#newBudgetStart").value;
    const denNgay = $("#newBudgetEnd").value;

    if (!Number.isInteger(danhMucId) || danhMucId <= 0) {
      status.textContent = "Hãy chọn một danh mục chi tiêu hợp lệ.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(soTienGioiHan) || soTienGioiHan <= 0 || soTienGioiHan > 9999999999999999.99) {
      status.textContent = "Giới hạn ngân sách phải lớn hơn 0 và có tối đa 2 chữ số thập phân.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (!tuNgay || !denNgay || denNgay < tuNgay) {
      status.textContent = "Ngày kết thúc phải từ ngày bắt đầu trở đi.";
      status.className = "api-connection-status is-error";
      return;
    }

    button.disabled = true;
    button.textContent = "Đang tạo...";
    status.textContent = "Đang tạo ngân sách...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/ngan-sach`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        body: JSON.stringify({ danhMucId, soTienGioiHan, tuNgay, denNgay }),
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        const message = body && typeof body === "object"
          ? (body.detail || body.title || body.message) : null;
        throw new Error(`${response.status}: ${message || "Không thể tạo ngân sách."}`);
      }

      const date = new Date();
      const year = date.getFullYear();
      const month = date.getMonth();
      const localDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
      $("#createBudgetForm").reset();
      $("#newBudgetStart").value = localDate(new Date(year, month, 1));
      $("#newBudgetEnd").value = localDate(new Date(year, month + 1, 0));
      await refreshBudgetsFromApi();
      status.textContent = `Đã tạo ngân sách cho “${body.tenDanhMuc || "danh mục chi tiêu"}” với giới hạn ${money(Number(body.soTienGioiHan || soTienGioiHan))}.`;
      status.className = "api-connection-status is-success";
      showToast("Đã tạo ngân sách mới.");
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API ngân sách. Kiểm tra Flask Gateway."
        : (error.message || "Không thể tạo ngân sách.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Tạo ngân sách";
    }
  }

  async function refreshTransactionsFromApi() {
    const status = $("#transactionListStatus");
    if (!activeApiToken || !status) return;
    status.textContent = "Đang tải giao dịch thu/chi...";
    status.className = "api-connection-status";
    try {
      const response = await fetch(`${API_BASE_URL}/api/giao-dich`, {
        method: "GET",
        headers: { "Accept": "application/json", "Authorization": `Bearer ${activeApiToken}` },
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        const message = body && typeof body === "object" ? (body.detail || body.title || body.message) : null;
        throw new Error(`${response.status}: ${message || "Không thể tải lịch sử thu/chi."}`);
      }
      if (!Array.isArray(body)) throw new Error("API giao dịch không trả về danh sách hợp lệ.");
      activeApiTransactions = body;
      renderTransactions();
      updateApiSummary();
      await refreshOverviewFromApi();
      await refreshDailyChartFromApi();
      await updateCashflowChart();

      status.textContent =
        `Đã tải ${body.length} giao dịch thu/chi gần nhất từ API.`;
      status.className = "api-connection-status is-success";
      const subtitle = $("#transactionListSubtitle");
      if (subtitle) subtitle.textContent = "Lịch sử thu/chi thật của người dùng đang đăng nhập.";
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API giao dịch. Kiểm tra Flask Gateway."
        : (error.message || "Không thể tải lịch sử thu/chi.");
      status.className = "api-connection-status is-error";
    }
  }

  function updateApiSummary() {
  if (!activeApiToken) return;

  const totalBalance = activeApiAccounts.reduce(
    (sum, item) => sum + Number(item.soDuHienTai || 0),
    0
  );

  $("#balanceAmount").innerHTML = amountMarkup(totalBalance);
}


async function refreshOverviewFromApi() {
  if (!activeApiToken) return;

  const subtitle = $(".welcome-row .subtitle");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/thong-ke/tong-quan`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      }
    );

    const contentType = response.headers.get("content-type") || "";

    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = body && typeof body === "object"
        ? (body.detail || body.title || body.message)
        : null;

      throw new Error(
        `${response.status}: ${message || "Không thể tải thống kê."}`
      );
    }

    if (!body || typeof body !== "object") {
      throw new Error("API thống kê trả về dữ liệu không hợp lệ.");
    }

    $("#incomeAmount").innerHTML =
      amountMarkup(Number(body.tongThu || 0));

    $("#expenseAmount").innerHTML =
      amountMarkup(Number(body.tongChi || 0));

    if (subtitle) {
      subtitle.textContent =
        `Thống kê thực từ ${body.tuNgay} đến ${body.denNgay}` +
        ` · ${Number(body.soGiaoDich || 0)} giao dịch thu/chi.`;
    }
  } catch (error) {
    $("#incomeAmount").textContent = "—";
    $("#expenseAmount").textContent = "—";

    if (subtitle) {
      subtitle.textContent =
        error.message || "Không thể tải thống kê tài chính.";
    }
  }
}

async function refreshDailyChartFromApi() {
  const plot = document.getElementById("dailyChartPlot");
  const status = document.getElementById("dailyChartStatus");
  const period = document.getElementById("dailyChartPeriod");
  const button = document.getElementById("refreshDailyChartBtn");

  if (!plot || !status || !activeApiToken) return;

  if (button) button.disabled = true;

  status.textContent = "Đang tải dữ liệu biểu đồ...";
  status.className = "api-connection-status";

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/thong-ke/theo-ngay`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      }
    );

    const body = await response.json();

    if (!response.ok) {
      throw new Error(
        `${response.status}: ${
          body.detail || body.title || "Không thể tải biểu đồ."
        }`
      );
    }

    if (!Array.isArray(body)) {
      throw new Error("API không trả về danh sách thống kê hợp lệ.");
    }

    const money = value =>
      new Intl.NumberFormat("vi-VN", {
        maximumFractionDigits: 0
      }).format(Number(value) || 0) + " VND";

    const maxValue = Math.max(
      1,
      ...body.map(item =>
        Math.max(Number(item.tongThu) || 0, Number(item.tongChi) || 0)
      )
    );

    const barHeight = value => {
      const amount = Number(value) || 0;
      return amount <= 0
        ? 2
        : Math.max(4, Math.round(amount / maxValue * 160));
    };

    const fragment = document.createDocumentFragment();

    body.forEach((item, index) => {
      const day = document.createElement("div");
      day.className = "daily-chart-day";

      const thu = Number(item.tongThu) || 0;
      const chi = Number(item.tongChi) || 0;

      day.title =
        `${item.ngay} · Thu: ${money(thu)} · Chi: ${money(chi)}`;

      const bars = document.createElement("div");
      bars.className = "daily-chart-bars";

      const incomeBar = document.createElement("span");
      incomeBar.className = "daily-chart-bar income";
      incomeBar.style.height = `${barHeight(thu)}px`;
      incomeBar.setAttribute("aria-label", `Thu ${money(thu)}`);

      const expenseBar = document.createElement("span");
      expenseBar.className = "daily-chart-bar expense";
      expenseBar.style.height = `${barHeight(chi)}px`;
      expenseBar.setAttribute("aria-label", `Chi ${money(chi)}`);

      bars.append(incomeBar, expenseBar);

      const label = document.createElement("span");
      label.className = "daily-chart-day-label";

      const dayNumber = Number(item.ngay.slice(8, 10));
      label.textContent =
        index === 0 ||
        index === body.length - 1 ||
        dayNumber % 5 === 0 ||
        thu > 0 ||
        chi > 0
          ? String(dayNumber)
          : "";

      day.append(bars, label);
      fragment.appendChild(day);
    });

    plot.replaceChildren(fragment);

    if (body.length > 0) {
      period.textContent =
        `${body[0].ngay} đến ${body[body.length - 1].ngay}`;
    } else {
      period.textContent = "Không có dữ liệu trong khoảng ngày.";
    }

    status.textContent = `Đã tải ${body.length} ngày từ API.`;
    status.className = "api-connection-status is-success";
  } catch (error) {
    status.textContent =
      error.message || "Không thể tải biểu đồ thu nhập và chi tiêu.";

    status.className = "api-connection-status is-error";
  } finally {
    if (button) button.disabled = false;
  }
}

  async function createCategoryFromApi(event) {
    event.preventDefault();
    const status = $("#categoryApiStatus");
    const button = $("#createCategoryButton");
    if (!activeApiToken) {
      status.textContent = "Vui lòng đăng nhập trước.";
      status.className = "api-connection-status is-error";
      return;
    }
    const tenDanhMuc = $("#newCategoryName").value.trim();
    const loaiGd = $("#newCategoryKind").value;
    if (!tenDanhMuc || tenDanhMuc.length > 100) {
      status.textContent = "Tên danh mục phải có từ 1 đến 100 ký tự.";
      status.className = "api-connection-status is-error";
      return;
    }
    button.disabled = true;
    button.textContent = "Đang tạo...";
    status.textContent = "Đang tạo danh mục...";
    status.className = "api-connection-status";
    try {
      const response = await fetch(`${API_BASE_URL}/api/danh-muc`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        body: JSON.stringify({ tenDanhMuc, loaiGd }),
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        const message = body && typeof body === "object" ? (body.detail || body.title || body.message) : null;
        throw new Error(`${response.status}: ${message || "Không thể tạo danh mục."}`);
      }
      $("#createCategoryForm").reset();
      $("#newCategoryKind").value = loaiGd;
      await refreshCategoriesFromApi();
      updateCategoryOptions();
      status.textContent = `Đã tạo danh mục “${tenDanhMuc}” (${loaiGd === "thu" ? "thu nhập" : "chi tiêu"}).`;
      status.className = "api-connection-status is-success";
      showToast("Đã tạo danh mục mới.");
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API danh mục. Kiểm tra Flask Gateway."
        : (error.message || "Không thể tạo danh mục.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Tạo danh mục";
    }
  }

  function accountName(key) {
    const known = ({ cash: "Ví tiền mặt", bank: "Tài khoản ngân hàng", wallet: "Ví điện tử" })[key];
    if (known) return known;
    return typeof key === "string" && key.trim() ? key : "Tài khoản";
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function updateSummary() {
    $("#balanceAmount").innerHTML = amountMarkup(state.balance);
    $("#incomeAmount").innerHTML = amountMarkup(state.income);
    $("#expenseAmount").innerHTML = amountMarkup(state.expense);
    $("#bankBalance").innerHTML = amountMarkup(state.accounts.bank);
    $("#cashBalance").textContent = money(state.accounts.cash);
    $("#walletBalance").textContent = money(state.accounts.wallet);

    const budgetPercent = state.budgetLimit > 0
      ? Math.round((state.budgetSpent / state.budgetLimit) * 100)
      : 0;
    $("#budgetSpent").innerHTML = amountMarkup(state.budgetSpent);
    $("#budgetPercent").textContent = `${budgetPercent}%`;
    $("#budgetProgress").style.width = `${Math.min(budgetPercent, 100)}%`;
    $("#budgetFootSpent").textContent = `${(state.budgetSpent / 1000000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} triệu đã chi`;

    $$("[data-budget-category]").forEach(element => {
      const name = element.dataset.budgetCategory;
      const config = state.categoryBudgets[name];
      if (!config) return;
      const amount = $ ("[data-budget-amount]", element);
      const progress = $(".tiny-progress i", element);
      if (amount) amount.textContent = `${money(config.spent)} / ${money(config.limit)}`;
      if (progress) progress.style.width = `${Math.min(100, (config.spent / config.limit) * 100)}%`;
    });
  }

  function renderTransactions() {
    const tbody = $("#transactionRows");
    if (!tbody) return;
    const query = ($("#transactionSearch")?.value || $("#globalSearch")?.value || "").trim().toLocaleLowerCase("vi");
    const kind = $("#transactionTypeFilter")?.value || "all";
    const usingApi = Boolean(activeApiToken);
    const sourceRows = usingApi
      ? activeApiTransactions.map(item => ({
          id: item.giaoDichId,
          name: item.moTa && String(item.moTa).trim() ? item.moTa : item.tenDanhMuc,
          description: item.moTa || "",
          account: item.tenTk || `Tài khoản #${item.tkId}`,
          kind: String(item.loaiGd || "").toLowerCase(),
          category: item.tenDanhMuc || "Khác",
          amount: Number(item.soTien),
          date: item.ngayGd || ""
        }))
      : state.transactions;

    const rows = [...sourceRows]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .filter(item => {
        const searchable = `${item.name} ${accountName(item.account)} ${item.category} ${item.description}`.toLocaleLowerCase("vi");
        return (!query || searchable.includes(query)) && (kind === "all" || item.kind === kind);
      });

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-row">${usingApi ? "Chưa có giao dịch thu/chi phù hợp." : "Không tìm thấy giao dịch phù hợp."}</td></tr>`;
    } else {
      tbody.innerHTML = rows.map(item => {
        const style = categoryStyle[item.category] || categoryStyle["Khác"];
        const sign = item.kind === "thu" ? "+" : "−";
        const amountClass = item.kind === "thu" ? "amount-in" : "amount-out";
        return `<tr>
          <td><div class="transaction-title"><span class="transaction-icon ${style.className}">${style.icon}</span><span><strong>${escapeHtml(item.name || item.category || "Giao dịch")}</strong><small>${escapeHtml(accountName(item.account))}</small></span></div></td>
          <td class="date-cell">${dateLabel(item.date)}</td>
          <td><span class="category-pill ${style.pill}">${escapeHtml(item.category)}</span></td>
          <td class="align-right ${amountClass}">${sign} ${money(item.amount)}</td>
        </tr>`;
      }).join("");
    }

    const count = $(".nav-count");
    if (count) count.textContent = String(sourceRows.length);
  }

  function updateTransactionAccountOptions() {
    const select = $("#transactionAccount");
    if (!select) return;
    const previous = select.value;
    if (!activeApiToken) {
      select.innerHTML = '<option value="">Đăng nhập để tải tài khoản</option>';
      return;
    }
    if (!activeApiAccounts.length) {
      select.innerHTML = '<option value="">Bạn chưa có tài khoản</option>';
      return;
    }
    select.innerHTML = '<option value="">Chọn tài khoản</option>' + activeApiAccounts.map(account => {
      const id = Number(account.tkId);
      const balance = Number(account.soDuHienTai);
      const currency = account.donViTienTe || "VND";
      return `<option value="${id}">${escapeHtml(account.tenTk || `Tài khoản ${id}`)} (#${id}) — ${escapeHtml(VND.format(balance))} ${escapeHtml(currency)}</option>`;
    }).join("");
    if (activeApiAccounts.some(account => String(account.tkId) === previous)) {
      select.value = previous;
    } else if (activeApiAccounts.length === 1) {
      select.value = String(activeApiAccounts[0].tkId);
    }
  }

  function updateCategoryOptions() {
    const kind = $("#transactionKind").value;
    const select = $("#transactionCategory");
    const current = select.value;
    const matches = activeApiCategories.filter(category =>
      String(category.loaiGd || "").toLowerCase() === kind
    );

    if (!activeApiToken) {
      select.innerHTML = '<option value="">Đăng nhập để tải danh mục</option>';
      return;
    }

    if (!matches.length) {
      select.innerHTML = `<option value="">Chưa có danh mục ${kind === "thu" ? "thu nhập" : "chi tiêu"}</option>`;
      $("#transactionCategoryHint").innerHTML = '<span>ⓘ</span> Chưa có danh mục phù hợp. Hãy vào mục Danh mục để tạo trước khi ghi giao dịch.';
      return;
    }

    select.innerHTML = '<option value="">Chọn danh mục</option>' + matches
      .map(category => `<option value="${Number(category.danhMucId)}">${escapeHtml(category.tenDanhMuc)}</option>`)
      .join("");
    if (matches.some(category => String(category.danhMucId) === current)) {
      select.value = current;
    }
    $("#transactionCategoryHint").innerHTML = '<span>ⓘ</span> Giao dịch sẽ được lưu qua API. Nếu cần loại danh mục khác, hãy quản lý tại mục Danh mục.';
  }

  function openModal() {
    if (!activeApiToken) {
      showToast("Đăng nhập trước khi ghi nhận thu nhập hoặc chi tiêu.");
      $("#loginEmail").focus();
      return;
    }
    const modal = $("#transactionModal");
    $("#transactionForm").reset();
    $("#transactionDate").value = new Date().toLocaleDateString("en-CA");
    $("#transactionKind").value = "chi";
    updateTransactionAccountOptions();
    updateCategoryOptions();
    const status = $("#transactionApiStatus");
    status.textContent = "";
    status.className = "api-connection-status";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    setTimeout(() => $("#transactionAmount").focus(), 50);
  }

  function closeModal() {
    const modal = $("#transactionModal");
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    $("#addTransactionBtn").focus();
  }

  async function addTransaction(event) {
    event.preventDefault();
    const status = $("#transactionApiStatus");
    const button = $("#saveTransactionButton");
    if (!activeApiToken) {
      status.textContent = "Đăng nhập trước khi lưu giao dịch.";
      status.className = "api-connection-status is-error";
      return;
    }

    const kind = $("#transactionKind").value;
    const amountText = $("#transactionAmount").value.trim();
    const soTien = Number(amountText);
    const tkId = Number($("#transactionAccount").value);
    const danhMucId = Number($("#transactionCategory").value);
    const date = $("#transactionDate").value;
    const moTa = $("#transactionDescription").value.trim();
    const category = activeApiCategories.find(item => Number(item.danhMucId) === danhMucId);
    const account = activeApiAccounts.find(item => Number(item.tkId) === tkId);

    if (!account || !Number.isInteger(tkId)) {
      status.textContent = "Vui lòng chọn một tài khoản hợp lệ.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (!category || !Number.isInteger(danhMucId)) {
      status.textContent = "Vui lòng chọn danh mục hợp lệ. Nếu chưa có, hãy tạo trong mục Danh mục.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (String(category.loaiGd).toLowerCase() !== kind) {
      status.textContent = "Loại giao dịch phải khớp với loại danh mục.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(soTien) || soTien <= 0 || soTien > 9999999999999999.99) {
      status.textContent = "Số tiền phải lớn hơn 0 và có tối đa 2 chữ số thập phân.";
      status.className = "api-connection-status is-error";
      $("#transactionAmount").focus();
      return;
    }
    if (moTa.length > 250) {
      status.textContent = "Mô tả không được vượt quá 250 ký tự.";
      status.className = "api-connection-status is-error";
      return;
    }
    if (kind === "chi" && Number(account.soDuHienTai) < soTien) {
      status.textContent = "Số dư tài khoản hiện không đủ. Hãy tải lại tài khoản trước khi thử.";
      status.className = "api-connection-status is-error";
      return;
    }

    const ngayGd = date ? new Date(`${date}T12:00:00`).toISOString() : null;
    const payload = { tkId, danhMucId, loaiGd: kind, soTien, ngayGd, moTa: moTa || null };
    button.disabled = true;
    const signature = JSON.stringify(payload);
let idempotencyKey;

try {
  if (
    pendingTransactionAttempt &&
    pendingTransactionAttempt.signature === signature
  ) {
    idempotencyKey = pendingTransactionAttempt.key;
  } else {
    idempotencyKey = createIdempotencyKey();

    pendingTransactionAttempt = {
      signature,
      key: idempotencyKey
    };
  }
} catch (error) {
  status.textContent =
    error.message || "Không thể tạo mã yêu cầu giao dịch.";

  status.className = "api-connection-status is-error";
  return;
}
    button.textContent = "Đang lưu...";
    status.textContent = "Đang lưu giao dịch và cập nhật số dư...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/giao-dich`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiToken}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      });
      const body = (response.headers.get("content-type") || "").includes("application/json")
        ? await response.json() : await response.text();
      if (!response.ok) {
        let message = body && typeof body === "object" ? (body.detail || body.title || body.message) : null;
        if (response.status === 400) message = message || "Dữ liệu giao dịch không hợp lệ.";
        else if (response.status === 401) message = "Phiên đăng nhập hết hạn hoặc không hợp lệ. Hãy đăng nhập lại.";
        else if (response.status === 409) message = message || "Giao dịch bị từ chối. Kiểm tra số dư, tài khoản và danh mục.";
        else if (response.status === 429) message = "Bạn gửi yêu cầu quá nhanh. Hãy đợi một lát rồi thử lại.";
        else if (response.status === 502) message = "Flask Gateway không kết nối được backend C#.";
        else if (response.status === 503) message = "Gateway hoặc Redis đang gặp sự cố.";
        throw new Error(`${response.status}: ${message || "Không thể lưu giao dịch."}`);
      }

      pendingTransactionAttempt = null;
      const transactionId = body && typeof body === "object" ? body.giaoDichId : null;
      status.textContent = `Đã ghi nhận ${kind === "thu" ? "thu nhập" : "chi tiêu"}${transactionId != null ? ` (mã #${transactionId})` : ""}. Đang làm mới dữ liệu...`;
      status.className = "api-connection-status is-success";
      $("#transactionForm").reset();
      $("#transactionDate").value = new Date().toLocaleDateString("en-CA");
      closeModal();
      await refreshAccountsFromApi();
      showToast(`Đã ghi nhận ${kind === "thu" ? "thu nhập" : "chi tiêu"}${transactionId != null ? ` (#${transactionId})` : ""}.`);
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không nhận được phản hồi từ API. Hãy tải lại lịch sử trước khi gửi lại để tránh tạo giao dịch trùng."
        : (error.message || "Đã xảy ra lỗi khi lưu giao dịch.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Lưu giao dịch";
    }
  }

  async function updateCashflowChart() {
  const months = chartRanges[chartRangeIndex];
  const groups = document.querySelector(".bar-groups");
  const yLabels = document.querySelector(".y-labels");
  const button = document.getElementById("chartRangeButton");
  const subtitle = document.querySelector("#reports .panel-heading p");

  if (!groups || !yLabels) return;

  if (!activeApiToken) {
    groups.replaceChildren();
    yLabels.innerHTML =
      "<span>—</span><span>—</span><span>—</span><span>—</span><span>0</span>";
    return;
  }

  if (button) button.disabled = true;

  const formatDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const now = new Date();

  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - months + 1,
    1
  );

  const endDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const startText = formatDate(startDate);
  const endText = formatDate(endDate);

  if (button) {
    button.innerHTML = `${months} tháng gần đây <span>⌄</span>`;
  }

  if (subtitle) {
    subtitle.textContent = "Đang tải dữ liệu thu nhập và chi tiêu...";
  }

  try {
    const query = new URLSearchParams({
      tuNgay: startText,
      denNgay: endText
    });

    const response = await fetch(
      `${API_BASE_URL}/api/thong-ke/theo-ngay?${query}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      }
    );

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message =
        body && typeof body === "object"
          ? body.detail || body.title || body.message
          : null;

      throw new Error(
        `${response.status}: ${message || "Không thể tải biểu đồ."}`
      );
    }

    if (!Array.isArray(body)) {
      throw new Error("API thống kê không trả về danh sách hợp lệ.");
    }

    // Khởi tạo đủ các tháng trong khoảng đã chọn.
    const monthly = new Map();

    for (let i = 0; i < months; i++) {
      const date = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );

      const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      monthly.set(key, {
        label: `T${date.getMonth() + 1}`,
        income: 0,
        expense: 0
      });
    }

    // Cộng dữ liệu từng ngày thành tổng theo tháng.
    for (const item of body) {
      const key = item.ngay.slice(0, 7);
      const month = monthly.get(key);

      if (!month) continue;

      month.income += Number(item.tongThu) || 0;
      month.expense += Number(item.tongChi) || 0;
    }

    const values = [...monthly.values()];

    const largestValue = Math.max(
      0,
      ...values.map(item => Math.max(item.income, item.expense))
    );

    // Tạo trục dọc phù hợp với số liệu thật.
    const magnitude = largestValue > 0
      ? Math.pow(10, Math.floor(Math.log10(largestValue)))
      : 1;

    const normalized = largestValue / magnitude;

    const factor = normalized <= 1
      ? 1
      : normalized <= 2
        ? 2
        : normalized <= 5
          ? 5
          : 10;

    const axisMax = factor * magnitude;

    const formatAxis = value => {
      if (value >= 1000000) {
        return `${Number((value / 1000000).toFixed(1))} tr`;
      }

      if (value >= 1000) {
        return `${Number((value / 1000).toFixed(1))}k`;
      }

      return String(Math.round(value));
    };

    yLabels.replaceChildren(
      ...[1, 0.75, 0.5, 0.25, 0].map(ratio => {
        const label = document.createElement("span");
        label.textContent = formatAxis(axisMax * ratio);
        return label;
      })
    );

    const fragment = document.createDocumentFragment();

    values.forEach((item, index) => {
      const group = document.createElement("div");
      group.className =
        `bar-group${index === values.length - 1 ? " current" : ""}`;

      group.title =
        `${item.label} — Thu: ${item.income.toLocaleString("vi-VN")} VND; ` +
        `Chi: ${item.expense.toLocaleString("vi-VN")} VND`;

      const pair = document.createElement("div");
      pair.className = "bar-pair";

      const incomeBar = document.createElement("i");
      incomeBar.className = "bar income";
      incomeBar.style.height =
        `${axisMax > 0 ? item.income / axisMax * 100 : 0}%`;

      const expenseBar = document.createElement("i");
      expenseBar.className = "bar expense";
      expenseBar.style.height =
        `${axisMax > 0 ? item.expense / axisMax * 100 : 0}%`;

      pair.append(incomeBar, expenseBar);

      const label = document.createElement("span");
      label.textContent = item.label;

      group.append(pair, label);
      fragment.appendChild(group);
    });

    groups.replaceChildren(fragment);
    groups.style.gridTemplateColumns =
      `repeat(${months}, minmax(0, 1fr))`;

    if (subtitle) {
      subtitle.textContent =
        `Dữ liệu thực từ ${startText} đến ${endText}`;
    }
  } catch (error) {
    groups.replaceChildren();

    if (subtitle) {
      subtitle.textContent =
        error.message || "Không thể tải dữ liệu thu nhập và chi tiêu.";
    }
  } finally {
    if (button) button.disabled = false;
  }
}


  const API_BASE_URL = "http://127.0.0.1:8081";

  function accountTypeLabel(value) {
    const raw = String(value || "").trim();
    const normalized = raw.toLocaleLowerCase("vi");
    const labels = {
      cash: "Ví tiền mặt",
      bank: "Tài khoản ngân hàng",
      wallet: "Ví điện tử",
      tien_mat: "Ví tiền mặt",
      ngan_hang: "Tài khoản ngân hàng",
      vi_dien_tu: "Ví điện tử"
    };
    return labels[normalized] || raw || "Tài khoản";
  }

  function createIdempotencyKey() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    if (!globalThis.crypto?.getRandomValues) {
      throw new Error("Trình duyệt không hỗ trợ tạo Idempotency-Key an toàn.");
    }

    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(value => value.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  function renderTransferAccountOptions(accounts) {
    activeApiAccounts = Array.isArray(accounts) ? accounts : [];
    const source = $("#transferSourceId");
    const destination = $("#transferDestinationId");
    const button = $("#transferButton");
    const status = $("#transferStatus");
    if (!source || !destination || !button || !status) return;

    const previousSource = source.value;
    const previousDestination = destination.value;
    const accountOptions = activeApiAccounts.map(account => {
      const id = Number(account.tkId);
      const name = escapeHtml(account.tenTk || `Tài khoản ${id}`);
      const currency = escapeHtml(account.donViTienTe || "VND");
      const balance = Number(account.soDuHienTai);
      const balanceLabel = Number.isFinite(balance) ? VND.format(balance) : "—";
      return `<option value="${id}">${name} (#${id}) — ${balanceLabel} ${currency}</option>`;
    }).join("");

    source.innerHTML = `<option value="">Chọn tài khoản nguồn</option>${accountOptions}`;
    destination.innerHTML = `<option value="">Chọn tài khoản đích</option>${accountOptions}`;

    if (activeApiAccounts.some(account => String(account.tkId) === previousSource)) {
      source.value = previousSource;
    } else if (activeApiAccounts.length > 0) {
      source.value = String(activeApiAccounts[0].tkId);
    }

    if (activeApiAccounts.some(account => String(account.tkId) === previousDestination)) {
      destination.value = previousDestination;
    } else {
      const other = activeApiAccounts.find(account => String(account.tkId) !== source.value);
      if (other) destination.value = String(other.tkId);
    }

    if (source.value && source.value === destination.value) {
      const other = activeApiAccounts.find(account => String(account.tkId) !== source.value);
      destination.value = other ? String(other.tkId) : "";
    }

    button.disabled = activeApiAccounts.length < 2;
    if (activeApiAccounts.length < 2) {
      status.textContent = "Bạn cần ít nhất hai tài khoản đang hoạt động để chuyển tiền.";
      status.className = "api-connection-status";
    } else {
      status.textContent = "Chọn hai tài khoản khác nhau và nhập số tiền cần chuyển.";
      status.className = "api-connection-status";
    }
  }

  function renderApiAccounts(accounts) {
    renderTransferAccountOptions(accounts);
    const container = $("#apiAccountsContainer");
    const demo = $("#demoAccountsContainer");
    const subtitle = $("#accountsSubtitle");
    const badge = $("#apiBadge");

    demo.hidden = true;
    container.hidden = false;
    badge.textContent = "API LIVE";
    badge.classList.add("is-connected");
    subtitle.textContent = "Danh sách tài khoản được tải từ backend C# qua Flask Gateway.";

    if (!accounts.length) {
      container.innerHTML = '<div class="api-empty-state">Người dùng này chưa có tài khoản đang hoạt động.</div>';
      return;
    }

    container.innerHTML = accounts.map(account => {
      const id = Number(account.tkId);
      const name = escapeHtml(account.tenTk || `Tài khoản ${id}`);
      const type = escapeHtml(accountTypeLabel(account.loaiTk));
      const currency = escapeHtml(account.donViTienTe || "VND");
      const balance = Number(account.soDuHienTai);
      const balanceLabel = Number.isFinite(balance)
        ? `${VND.format(balance)} ${currency}`
        : `Không đọc được số dư (${currency})`;
      const icon = type.toLocaleLowerCase("vi").includes("ngân hàng") ? "▦" : "◈";
      return `<div class="api-account-card">
        <div class="api-account-icon" aria-hidden="true">${icon}</div>
        <div class="api-account-copy">
          <div class="api-account-name">${name}</div>
          <div class="api-account-meta">${type} · Mã tài khoản #${Number.isFinite(id) ? id : "—"}</div>
        </div>
        <div class="api-account-balance">${escapeHtml(balanceLabel)}</div>
      </div>`;
    }).join("");
  }

  async function loginToApi(event) {
    event.preventDefault();

    const emailInput = $("#loginEmail");
    const passwordInput = $("#loginPassword");
    const status = $("#apiConnectionStatus");
    const button = $("#loginBtn");

    button.disabled = true;
    button.textContent = "Đang đăng nhập...";
    status.className = "api-connection-status";
    status.textContent = "Đang xác thực thông tin đăng nhập...";

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          matKhau: passwordInput.value
        }),
        cache: "no-store"
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let message = "Không thể đăng nhập.";
        if (response.status === 400) {
          message = body?.detail || body?.title || "Vui lòng kiểm tra email và mật khẩu.";
        } else if (response.status === 401) {
          message = "Email hoặc mật khẩu không đúng.";
        } else if (response.status === 429) {
          message = "Bạn gửi yêu cầu quá nhanh. Hãy đợi một lát rồi thử lại.";
        } else if (response.status === 502) {
          message = "502: Flask không kết nối được backend C#; kiểm tra BACKEND_URL.";
        } else if (response.status === 503) {
          message = "503: Gateway hoặc Redis đang gặp sự cố.";
        } else if (body && typeof body === "object") {
          message = body.detail || body.title || body.message || message;
        }
        throw new Error(`${response.status}: ${message}`);
      }

      if (!body || typeof body.accessToken !== "string" || !body.accessToken) {
        throw new Error("API đăng nhập không trả về accessToken hợp lệ.");
      }

      activeApiToken = body.accessToken;
      activeApiCategories = [];
      activeApiTransactions = [];
      activeApiUser = {
        userId: body.userId,
        hoTen: body.hoTen || "Người dùng",
        email: body.email || emailInput.value.trim()
      };

      passwordInput.value = "";
      $("#loginForm").hidden = true;
      $("#apiSessionPanel").hidden = false;
      $("#apiSessionPanel").removeAttribute("hidden");
      $("#apiUserName").textContent = `${activeApiUser.hoTen} · User #${activeApiUser.userId}`;
      $("#apiUserEmail").textContent = activeApiUser.email;
      status.textContent = "Đăng nhập thành công. Đang tải danh sách tài khoản...";
      status.className = "api-connection-status is-success";

      await refreshAccountsFromApi();
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API. Kiểm tra Flask, CORS và địa chỉ http://localhost:8080."
        : (error.message || "Đã xảy ra lỗi khi đăng nhập.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Đăng nhập";
      // JWT chỉ được giữ trong bộ nhớ của trang, không lưu vào Web Storage.
    }
  }

  async function refreshAccountsFromApi() {
    const status = $("#apiConnectionStatus");
    const button = $("#refreshAccountsBtn");

    if (!activeApiToken) {
      status.textContent = "Vui lòng đăng nhập trước.";
      status.className = "api-connection-status is-error";
      return;
    }

    button.disabled = true;
    button.textContent = "Đang tải...";
    status.textContent = "Đang tải danh sách tài khoản...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let message = "Không thể tải tài khoản.";
        if (response.status === 401) {
          activeApiToken = null;
          activeApiUser = null;
          $("#loginForm").hidden = false;
          $("#apiSessionPanel").hidden = true;
          $("#createAccountForm").hidden = true;
          $("#apiTransferPanel").hidden = true;
          $("#transferHistoryPanel").hidden = true;
          $("#categories").hidden = true;
          $("#apiBudgetsPanel").hidden = true;
          $("#demoBudgetsPanel").hidden = false;
          activeApiBudgets = [];
          activeApiCategories = [];
          activeApiTransactions = [];
          message = "401: Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (response.status === 403) {
          message = "403: Bạn không có quyền xem danh sách tài khoản.";
        } else if (response.status === 502) {
          message = "502: Flask không kết nối được backend C#; kiểm tra BACKEND_URL.";
        } else if (response.status === 503) {
          message = "503: Gateway chưa kết nối được Redis hoặc dịch vụ bảo vệ đang lỗi.";
        } else if (body && typeof body === "object") {
          message = body.detail || body.title || body.message || message;
        }
        throw new Error(`${response.status}: ${message}`);
      }

      if (!Array.isArray(body)) {
        throw new Error("API phản hồi không đúng định dạng danh sách tài khoản.");
      }

      renderApiAccounts(body);
      $("#createAccountForm").hidden = false;
      $("#createAccountForm").removeAttribute("hidden");
      $("#apiTransferPanel").hidden = false;
      $("#apiTransferPanel").removeAttribute("hidden");
      $("#createAccountStatus").textContent = "Sẵn sàng tạo tài khoản bằng API.";
      $("#createAccountStatus").className = "api-connection-status";
      status.textContent = `Đăng nhập thành công. Đã tải ${body.length} tài khoản từ API.`;
      status.className = "api-connection-status is-success";
      showToast(`Đã tải ${body.length} tài khoản từ backend.`);
      await Promise.all([
        refreshTransferHistory(),
        refreshCategoriesFromApi(),
        refreshTransactionsFromApi(),
        refreshBudgetsFromApi()
      ]);
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API. Kiểm tra Flask, CORS và địa chỉ frontend."
        : (error.message || "Đã xảy ra lỗi khi tải tài khoản.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Tải lại tài khoản";
    }
  }

  function logoutFromApi() {
    activeApiToken = null;
    activeApiUser = null;
    activeApiAccounts = [];
    activeApiCategories = [];
    activeApiTransactions = [];
    activeApiBudgets = [];
    pendingTransferAttempt = null;
    $("#loginPassword").value = "";
    $("#loginForm").hidden = false;
    $("#apiSessionPanel").hidden = true;
    $("#createAccountForm").hidden = true;
    $("#apiTransferPanel").hidden = true;
    $("#transferHistoryPanel").hidden = true;
    $("#categories").hidden = true;
    $("#apiBudgetsPanel").hidden = true;
    $("#demoBudgetsPanel").hidden = false;
    $("#apiBudgetList").innerHTML = '<div class="api-budget-empty">Đăng nhập để tải ngân sách của bạn.</div>';
    $("#budgetApiStatus").textContent = "Đăng nhập để quản lý ngân sách.";
    $("#budgetApiStatus").className = "api-connection-status";
    $("#apiCategoryList").innerHTML = "";
    $("#transactionRows").innerHTML = "";
    $("#transactionListStatus").textContent = "Đang hiển thị giao dịch minh họa. Đăng nhập để tải dữ liệu thật.";
    $("#transactionListStatus").className = "api-connection-status";
    $("#transactionListSubtitle").textContent = "Các khoản thu chi mới nhất của bạn";
    $(".welcome-row .subtitle").textContent = "Đây là tình hình tài chính của bạn trong tháng này.";
    $("#transferHistoryRows").innerHTML = '<tr><td colspan="6" class="empty-row">Đăng nhập để xem lịch sử chuyển tiền.</td></tr>';
    $("#transferHistoryStatus").textContent = "Đăng nhập để tải lịch sử chuyển tiền.";
    $("#transferHistoryStatus").className = "api-connection-status";
    $("#apiAccountsContainer").hidden = true;
    $("#demoAccountsContainer").hidden = false;
    $("#apiBadge").textContent = "DEMO";
    $("#apiBadge").classList.remove("is-connected");
    $("#accountsSubtitle").textContent = "Dữ liệu đang là minh họa; đăng nhập để tải danh sách thật.";
    const status = $("#apiConnectionStatus");
    status.textContent = "Đã đăng xuất. JWT đã được xóa khỏi bộ nhớ của trang.";
    status.className = "api-connection-status";
    updateSummary();
    renderTransactions();
    showToast("Đã đăng xuất khỏi Finora.");
  }

  async function createAccountFromApi(event) {
    event.preventDefault();

    const status = $("#createAccountStatus");
    const button = $("#createAccountButton");

    if (!activeApiToken) {
      status.textContent = "Vui lòng kết nối API và tải danh sách tài khoản trước.";
      status.className = "api-connection-status is-error";
      return;
    }

    const tenTk = $("#newAccountName").value.trim();
    const loaiTk = $("#newAccountType").value;
    const soDuBanDau = Number($("#newAccountOpeningBalance").value);

    if (!tenTk || tenTk.length > 100) {
      status.textContent = "Tên tài khoản phải có từ 1 đến 100 ký tự.";
      status.className = "api-connection-status is-error";
      return;
    }

    if (!Number.isFinite(soDuBanDau) || soDuBanDau < 0 ||
        soDuBanDau > 9999999999999999.99 ||
        Math.round(soDuBanDau * 100) !== soDuBanDau * 100) {
      status.textContent = "Số dư phải không âm và có tối đa 2 chữ số thập phân.";
      status.className = "api-connection-status is-error";
      return;
    }

    button.disabled = true;
    button.textContent = "Đang tạo...";
    status.textContent = "Đang gửi yêu cầu tạo tài khoản...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        body: JSON.stringify({ tenTk, loaiTk, soDuBanDau }),
        cache: "no-store"
      });

      const contentType = response.headers.get("content-type") || "";
      const responseBody = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let message = "Không thể tạo tài khoản.";
        if (response.status === 400) {
          message = responseBody?.detail || responseBody?.title || "Dữ liệu tài khoản không hợp lệ.";
        } else if (response.status === 401) {
          message = "401: JWT hết hạn hoặc không hợp lệ. Hãy đăng nhập lại và tải danh sách tài khoản.";
          activeApiToken = null;
          activeApiUser = null;
          $("#loginForm").hidden = false;
          $("#apiSessionPanel").hidden = true;
          $("#createAccountForm").hidden = true;
          $("#apiTransferPanel").hidden = true;
          $("#transferHistoryPanel").hidden = true;
          $("#categories").hidden = true;
          $("#apiBudgetsPanel").hidden = true;
          $("#demoBudgetsPanel").hidden = false;
          activeApiBudgets = [];
          $("#apiConnectionStatus").textContent = message;
          $("#apiConnectionStatus").className = "api-connection-status is-error";
        } else if (response.status === 403) {
          message = "403: Bạn không có quyền tạo tài khoản.";
        } else if (response.status === 502) {
          message = "502: Flask không kết nối được backend C#.";
        } else if (response.status === 503) {
          message = "503: Gateway hoặc Redis đang gặp sự cố.";
        } else if (responseBody && typeof responseBody === "object") {
          message = responseBody.detail || responseBody.title || responseBody.message || message;
        }
        throw new Error(`${response.status}: ${message}`);
      }

      const createdId = responseBody && typeof responseBody === "object"
        ? responseBody.tkId
        : null;

      const listResponse = await fetch(`${API_BASE_URL}/api/tai-khoan`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${activeApiToken}`
        },
        cache: "no-store"
      });

      if (!listResponse.ok) {
        throw new Error(`Tài khoản đã được tạo nhưng không tải lại được danh sách (HTTP ${listResponse.status}). Nhấn Tải từ API để làm mới.`);
      }

      const accounts = await listResponse.json();
      if (!Array.isArray(accounts)) {
        throw new Error("Tài khoản đã được tạo nhưng API danh sách trả về sai định dạng.");
      }

      renderApiAccounts(accounts);
      status.textContent = `Tạo tài khoản thành công${createdId != null ? ` (mã #${createdId})` : ""}. Đã tải lại ${accounts.length} tài khoản.`;
      status.className = "api-connection-status is-success";
      $("#apiConnectionStatus").textContent = `Kết nối thành công. Đã tải ${accounts.length} tài khoản từ API.`;
      $("#apiConnectionStatus").className = "api-connection-status is-success";
      $("#createAccountForm").reset();
      $("#newAccountOpeningBalance").value = "0";
      await Promise.all([
        refreshTransferHistory(),
        refreshCategoriesFromApi(),
        refreshTransactionsFromApi(),
        refreshBudgetsFromApi()
      ]);
      showToast("Đã tạo tài khoản và tải lại danh sách từ API.");
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không thể gọi API. Kiểm tra Flask, CORS và địa chỉ frontend."
        : (error.message || "Đã xảy ra lỗi khi tạo tài khoản.");
      status.className = "api-connection-status is-error";
    } finally {
      button.disabled = false;
      button.textContent = "Tạo tài khoản";
    }
  }

  async function transferBetweenAccounts(event) {
    event.preventDefault();

    const status = $("#transferStatus");
    const button = $("#transferButton");

    if (!activeApiToken) {
      status.textContent = "Vui lòng đăng nhập trước khi chuyển tiền.";
      status.className = "api-connection-status is-error";
      return;
    }

    const tkNguonId = Number($("#transferSourceId").value);
    const tkDichId = Number($("#transferDestinationId").value);
    const amountText = $("#transferAmount").value.trim();
    const soTien = Number(amountText);
    const moTa = $("#transferDescription").value.trim();

    if (!tkNguonId || !tkDichId || !Number.isInteger(tkNguonId) || !Number.isInteger(tkDichId)) {
      status.textContent = "Vui lòng chọn tài khoản nguồn và tài khoản đích.";
      status.className = "api-connection-status is-error";
      return;
    }

    if (tkNguonId === tkDichId) {
      status.textContent = "Tài khoản nguồn và đích phải khác nhau.";
      status.className = "api-connection-status is-error";
      return;
    }

    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) ||
        !Number.isFinite(soTien) || soTien <= 0 ||
        soTien > 9999999999999999.99) {
      status.textContent = "Số tiền phải lớn hơn 0 và có tối đa 2 chữ số thập phân.";
      status.className = "api-connection-status is-error";
      return;
    }

    if (moTa.length > 250) {
      status.textContent = "Mô tả không được vượt quá 250 ký tự.";
      status.className = "api-connection-status is-error";
      return;
    }

    const sourceAccount = activeApiAccounts.find(account => Number(account.tkId) === tkNguonId);
    const destinationAccount = activeApiAccounts.find(account => Number(account.tkId) === tkDichId);
    if (!sourceAccount || !destinationAccount) {
      status.textContent = "Không tìm thấy tài khoản đã chọn. Hãy tải lại danh sách.";
      status.className = "api-connection-status is-error";
      return;
    }

    const sourceCurrency = String(sourceAccount.donViTienTe || "VND").toUpperCase();
    const destinationCurrency = String(destinationAccount.donViTienTe || "VND").toUpperCase();
    if (sourceCurrency !== destinationCurrency) {
      status.textContent = "Hai tài khoản phải cùng đơn vị tiền tệ.";
      status.className = "api-connection-status is-error";
      return;
    }

    const payload = {
      tkNguonId,
      tkDichId,
      soTien,
      moTa: moTa || null
    };
    const signature = JSON.stringify(payload);
    let idempotencyKey;

    try {
      if (pendingTransferAttempt && pendingTransferAttempt.signature === signature) {
        idempotencyKey = pendingTransferAttempt.key;
      } else {
        idempotencyKey = createIdempotencyKey();
        pendingTransferAttempt = { signature, key: idempotencyKey };
      }
    } catch (error) {
      status.textContent = error.message || "Không thể tạo mã yêu cầu giao dịch.";
      status.className = "api-connection-status is-error";
      return;
    }

    button.disabled = true;
    button.textContent = "Đang chuyển...";
    status.textContent = "Đang gửi giao dịch đến backend...";
    status.className = "api-connection-status";

    try {
      const response = await fetch(`${API_BASE_URL}/api/chuyen-khoan`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeApiToken}`,
          "Idempotency-Key": idempotencyKey
        },
        body: JSON.stringify(payload),
        cache: "no-store"
      });

      const contentType = response.headers.get("content-type") || "";
      const responseBody = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        let message = responseBody && typeof responseBody === "object"
          ? (responseBody.detail || responseBody.title || responseBody.message)
          : null;
        if (response.status === 400) {
          message = message || "Dữ liệu chuyển tiền không hợp lệ.";
          pendingTransferAttempt = null;
        } else if (response.status === 401) {
          message = "Phiên đăng nhập hết hạn hoặc không hợp lệ. Đăng nhập lại để tiếp tục.";
          activeApiToken = null;
          activeApiUser = null;
          activeApiAccounts = [];
          pendingTransferAttempt = null;
          $("#loginForm").hidden = false;
          $("#apiSessionPanel").hidden = true;
          $("#createAccountForm").hidden = true;
          $("#apiTransferPanel").hidden = true;
        } else if (response.status === 409) {
          message = message || "Giao dịch bị từ chối. Hãy kiểm tra số dư và thông tin tài khoản.";
          pendingTransferAttempt = null;
        } else if (response.status === 429) {
          message = "Bạn gửi yêu cầu quá nhanh. Hãy đợi một lát rồi thử lại.";
        } else if (response.status === 502) {
          message = "502: Flask không kết nối được backend C#. Nếu thử lại, hãy giữ nguyên thông tin giao dịch.";
        } else if (response.status === 503) {
          message = "503: Gateway hoặc Redis đang gặp sự cố. Giữ nguyên thông tin nếu cần thử lại.";
        } else {
          message = message || `Không thể hoàn tất giao dịch (HTTP ${response.status}). Giữ nguyên thông tin nếu cần thử lại.`;
        }
        throw new Error(`${response.status}: ${message}`);
      }

      const transactionId = responseBody && typeof responseBody === "object"
        ? responseBody.chuyenKhoanId
        : null;
      pendingTransferAttempt = null;
      $("#transferAmount").value = "";
      $("#transferDescription").value = "";

      await refreshAccountsFromApi();
      const accountsStatus = $("#apiConnectionStatus");
      if (accountsStatus.classList.contains("is-error")) {
        status.textContent = `Chuyển tiền thành công${transactionId != null ? ` (mã #${transactionId})` : ""}, nhưng chưa tải lại được số dư. Hãy nhấn Tải lại tài khoản.`;
        status.className = "api-connection-status is-error";
      } else {
        status.textContent = `Chuyển tiền thành công${transactionId != null ? ` (mã giao dịch #${transactionId})` : ""}. Số dư đã được tải lại.`;
        status.className = "api-connection-status is-success";
        showToast(`Đã chuyển tiền thành công${transactionId != null ? ` (#${transactionId})` : ""}.`);
      }
    } catch (error) {
      status.textContent = error instanceof TypeError
        ? "Không nhận được phản hồi từ API. Để tránh chuyển trùng, hãy giữ nguyên các trường và thử lại; cùng nội dung sẽ dùng lại Idempotency-Key."
        : (error.message || "Đã xảy ra lỗi khi chuyển tiền.");
      status.className = "api-connection-status is-error";
    } finally {
      button.textContent = "Chuyển tiền";
      button.disabled = activeApiAccounts.length < 2 || !activeApiToken;
    }
  }

  function initNavigation() {
    $$(".nav-item").forEach(link => {
      link.addEventListener("click", event => {
        const targetId = link.getAttribute("href")?.slice(1);
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) {
          event.preventDefault();
          showToast("Mục này sẽ được bổ sung ở bước tiếp theo.");
          return;
        }
        if (targetId === "apiTransferPanel" && target.hidden) {
          event.preventDefault();
          showToast("Đăng nhập và tải tài khoản trước khi chuyển tiền.");
          return;
        }
        if (targetId === "transferHistoryPanel" && target.hidden) {
          event.preventDefault();
          showToast("Đăng nhập để xem lịch sử chuyển tiền.");
          return;
        }
        if (targetId === "categories" && target.hidden) {
          event.preventDefault();
          showToast("Đăng nhập để quản lý danh mục.");
          return;
        }
        if (targetId === "apiBudgetsPanel" && target.hidden) {
          event.preventDefault();
          showToast("Đăng nhập để quản lý ngân sách.");
          return;
        }
        $$(".nav-item").forEach(item => item.classList.remove("active"));
        link.classList.add("active");
      });
    });
  }

  function init() {
    const today = new Date();
    $("#todayLabel").textContent = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(today).toLocaleUpperCase("vi");
    $("#transactionDate").value = today.toLocaleDateString("en-CA");
    const localDate = value => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    $("#newBudgetStart").value = localDate(new Date(today.getFullYear(), today.getMonth(), 1));
    $("#newBudgetEnd").value = localDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    $("#addTransactionBtn").addEventListener("click", openModal);
    $("#loginForm").addEventListener("submit", loginToApi);
    $("#refreshAccountsBtn").addEventListener("click", refreshAccountsFromApi);
    $("#refreshTransferHistoryBtn").addEventListener("click", refreshTransferHistory);
    $("#logoutBtn").addEventListener("click", logoutFromApi);
    $("#createAccountForm").addEventListener("submit", createAccountFromApi);
    $("#transferForm").addEventListener("submit", transferBetweenAccounts);
    $$("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
    $("#transactionModal").addEventListener("click", event => {
      if (event.target === $("#transactionModal")) closeModal();
    });
    $("#transactionKind").addEventListener("change", updateCategoryOptions);
    $("#transactionForm").addEventListener("submit", addTransaction);
    $("#createCategoryForm").addEventListener("submit", createCategoryFromApi);
    $("#refreshCategoriesBtn").addEventListener("click", refreshCategoriesFromApi);
    $("#createBudgetForm").addEventListener("submit", createBudgetFromApi);
    $("#refreshBudgetsBtn").addEventListener("click", refreshBudgetsFromApi);
    $("#openCategoriesBtn").addEventListener("click", () => {
      closeModal();
      const panel = $("#categories");
      if (panel.hidden) {
        showToast("Đăng nhập để quản lý danh mục.");
        return;
      }
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      $("#newCategoryName").focus();
    });
    $("#transactionSearch").addEventListener("input", renderTransactions);
    $("#transactionTypeFilter").addEventListener("change", renderTransactions);

    $("#searchToggle").addEventListener("click", () => {
      const panel = $("#quickSearchPanel");
      const isOpening = panel.hidden;
      panel.hidden = !isOpening;
      $("#searchToggle").setAttribute("aria-expanded", String(isOpening));
      if (isOpening) {
        $("#globalSearch").focus();
      } else {
        $("#globalSearch").value = "";
        $("#transactionSearch").value = "";
        renderTransactions();
      }
    });
    $("#globalSearch").addEventListener("input", () => {
      $("#transactionSearch").value = $("#globalSearch").value;
      renderTransactions();
      document.getElementById("transactions").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("#chartRangeButton").addEventListener("click", () => {
      chartRangeIndex = (chartRangeIndex + 1) % chartRanges.length;
      updateCashflowChart();
    });

    $("#notificationButton").addEventListener("click", () => {
      showToast("Bạn chưa có thông báo mới trong bản demo.");
    });
    $("#showAllTransactions").addEventListener("click", () => {
      $("#transactionSearch").value = "";
      $("#transactionTypeFilter").value = "all";
      renderTransactions();
    });

    document.addEventListener("keydown", event => {
      if (
        event.key === "Escape" &&
        $("#transactionModal").classList.contains("is-open")
      ) {
        closeModal();
      }
    });

    initNavigation();
    updateSummary();
    renderTransactions();
    updateCashflowChart();

    document
      .getElementById("refreshDailyChartBtn")
      ?.addEventListener("click", refreshDailyChartFromApi);
      }

  document.addEventListener("DOMContentLoaded", init);
})();
