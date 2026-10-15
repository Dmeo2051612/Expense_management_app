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
    const date = new Date(`${isoDate}T12:00:00`);
    return Number.isNaN(date.getTime()) ? escapeHtml(isoDate) : dateFormatter.format(date);
  }

  function accountName(key) {
    return ({ cash: "Ví tiền mặt", bank: "Tài khoản ngân hàng", wallet: "Ví điện tử" })[key] || "Tài khoản";
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

    const rows = [...state.transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter(item => {
        const searchable = `${item.name} ${accountName(item.account)} ${item.category} ${item.description}`.toLocaleLowerCase("vi");
        return (!query || searchable.includes(query)) && (kind === "all" || item.kind === kind);
      });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-row">Không tìm thấy giao dịch phù hợp.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(item => {
      const style = categoryStyle[item.category] || categoryStyle["Khác"];
      const sign = item.kind === "thu" ? "+" : "−";
      const amountClass = item.kind === "thu" ? "amount-in" : "amount-out";
      return `<tr>
        <td><div class="transaction-title"><span class="transaction-icon ${style.className}">${style.icon}</span><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(accountName(item.account))}</small></span></div></td>
        <td class="date-cell">${dateLabel(item.date)}</td>
        <td><span class="category-pill ${style.pill}">${escapeHtml(item.category)}</span></td>
        <td class="align-right ${amountClass}">${sign} ${money(item.amount)}</td>
      </tr>`;
    }).join("");

    const count = $(".nav-count");
    if (count) count.textContent = String(state.transactions.length);
  }

  function updateCategoryOptions() {
    const kind = $("#transactionKind").value;
    const select = $("#transactionCategory");
    const current = select.value;
    select.innerHTML = categoryOptions[kind]
      .map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
      .join("");
    if (categoryOptions[kind].includes(current)) select.value = current;
  }

  function openModal() {
    const modal = $("#transactionModal");
    $("#transactionForm").reset();
    $("#transactionDate").value = new Date().toLocaleDateString("en-CA");
    updateCategoryOptions();
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

  function updateCashflowChart() {
    const months = chartRanges[chartRangeIndex];
    const labels = months === 3
      ? ["T8", "T9", "T10"]
      : months === 6
        ? ["T5", "T6", "T7", "T8", "T9", "T10"]
        : ["T11", "T12", "T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10"];
    const incomeValues = months === 3
      ? [88, 73, 92]
      : months === 6
        ? [68, 78, 61, 88, 73, 92]
        : [54, 63, 74, 68, 72, 59, 68, 78, 61, 88, 73, 92];
    const expenseValues = months === 3
      ? [44, 37, 36]
      : months === 6
        ? [32, 39, 29, 44, 37, 36]
        : [31, 36, 43, 27, 34, 29, 32, 39, 29, 44, 37, 36];
    const groups = $(".bar-groups");
    groups.style.gridTemplateColumns = `repeat(${months}, minmax(0, 1fr))`;
    groups.innerHTML = labels.map((label, i) => `
      <div class="bar-group ${i === labels.length - 1 ? "current" : ""}">
        <div class="bar-pair">
          <i class="bar income" style="height:${incomeValues[i]}%"></i>
          <i class="bar expense" style="height:${expenseValues[i]}%"></i>
        </div>
        <span>${label}</span>
      </div>`).join("");
    $("#chartRangeButton").innerHTML = `${months} tháng gần đây <span>⌄</span>`;
  }

  function addTransaction(event) {
    event.preventDefault();
    const kind = $("#transactionKind").value;
    const amount = Number($("#transactionAmount").value);
    const category = $("#transactionCategory").value;
    const account = $("#transactionAccount").value;
    const date = $("#transactionDate").value;
    const description = $("#transactionDescription").value.trim();

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(amount * 100) || Math.round(amount * 100) !== amount * 100) {
      showToast("Số tiền phải lớn hơn 0 và tối đa 2 chữ số thập phân.");
      $("#transactionAmount").focus();
      return;
    }
    if (!date || !description) {
      showToast("Vui lòng nhập ngày và mô tả giao dịch.");
      return;
    }

    const transaction = {
      id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`),
      name: description,
      description,
      account,
      kind,
      category,
      amount,
      date
    };

    state.transactions.push(transaction);
    if (kind === "thu") {
      state.balance += amount;
      state.income += amount;
      state.accounts[account] += amount;
    } else {
      state.balance -= amount;
      state.expense += amount;
      state.accounts[account] -= amount;
      state.budgetSpent += amount;
      if (state.categoryBudgets[category]) {
        state.categoryBudgets[category].spent += amount;
      }
    }

    persistState();
    updateSummary();
    renderTransactions();
    closeModal();
    showToast("Đã thêm giao dịch vào dữ liệu demo trên trình duyệt.");
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

  function renderApiAccounts(accounts) {
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
      $("#createAccountStatus").textContent = "Sẵn sàng tạo tài khoản bằng API.";
      $("#createAccountStatus").className = "api-connection-status";
      status.textContent = `Đăng nhập thành công. Đã tải ${body.length} tài khoản từ API.`;
      status.className = "api-connection-status is-success";
      showToast(`Đã tải ${body.length} tài khoản từ backend.`);
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
    $("#loginPassword").value = "";
    $("#loginForm").hidden = false;
    $("#apiSessionPanel").hidden = true;
    $("#createAccountForm").hidden = true;
    $("#apiAccountsContainer").hidden = true;
    $("#demoAccountsContainer").hidden = false;
    $("#apiBadge").textContent = "DEMO";
    $("#apiBadge").classList.remove("is-connected");
    $("#accountsSubtitle").textContent = "Dữ liệu đang là minh họa; đăng nhập để tải danh sách thật.";
    const status = $("#apiConnectionStatus");
    status.textContent = "Đã đăng xuất. JWT đã được xóa khỏi bộ nhớ của trang.";
    status.className = "api-connection-status";
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

    $("#addTransactionBtn").addEventListener("click", openModal);
    $("#loginForm").addEventListener("submit", loginToApi);
    $("#refreshAccountsBtn").addEventListener("click", refreshAccountsFromApi);
    $("#logoutBtn").addEventListener("click", logoutFromApi);
    $("#createAccountForm").addEventListener("submit", createAccountFromApi);
    $$("[data-close-modal]").forEach(button => button.addEventListener("click", closeModal));
    $("#transactionModal").addEventListener("click", event => {
      if (event.target === $("#transactionModal")) closeModal();
    });
    $("#transactionKind").addEventListener("change", updateCategoryOptions);
    $("#transactionForm").addEventListener("submit", addTransaction);
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
      showToast(`Đang hiển thị mô phỏng ${chartRanges[chartRangeIndex]} tháng.`);
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
      if (event.key === "Escape" && $("#transactionModal").classList.contains("is-open")) closeModal();
    });

    initNavigation();
    updateSummary();
    renderTransactions();
    updateCashflowChart();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
