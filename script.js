
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = "careerTrackApplications";
  const THEME_KEY = "careerTrackTheme";
  const GOAL_KEY = "careerTrackWeeklyGoal";

  const STATUSES = ["Applied", "Shortlisted", "Interview", "Offer", "Rejected"];
  const COLORS = {
    Applied: "#8b78ed",
    Shortlisted: "#e6ad39",
    Interview: "#42a2e8",
    Offer: "#30b981",
    Rejected: "#e66b82"
  };

  const form = $("applicationForm");
  const dialog = $("applicationDialog");
  let applications = loadApplications();
  let toastTimer;

  function loadApplications() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data) ? data.filter(item => item && typeof item === "object") : [];
    } catch {
      return [];
    }
  }

  function saveApplications() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
      return true;
    } catch {
      showToast("Unable to save data in this browser.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;",
      '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    return (parts.length === 1
      ? parts[0].slice(0, 2)
      : parts.slice(0, 2).map(part => part[0]).join("")
    ).toUpperCase();
  }

  function avatarColor(name) {
    let hash = 0;
    for (const char of String(name || "")) {
      hash = (hash * 31 + char.charCodeAt(0)) | 0;
    }
    const palette = [
      "linear-gradient(135deg,#9b7cff,#6748e8)",
      "linear-gradient(135deg,#69c6ef,#387fce)",
      "linear-gradient(135deg,#f4b4d2,#d45c9c)",
      "linear-gradient(135deg,#75d8b0,#219b7a)",
      "linear-gradient(135deg,#ffc979,#e38a35)",
      "linear-gradient(135deg,#a8b8ff,#6676d8)",
      "linear-gradient(135deg,#ffaaa4,#d45f72)"
    ];
    return palette[Math.abs(hash) % palette.length];
  }

  function todayISO() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDate(value) {
    if (!value) return "No date";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  // Day and night mode
  function setTheme(theme) {
    const dark = theme === "dark";
    document.body.classList.toggle("dark-theme", dark);
    $("themeToggle").textContent = dark ? "☀" : "☾";
    $("themeToggle").title = dark ? "Switch to day mode" : "Switch to night mode";
    $("themeToggle").setAttribute(
      "aria-label", dark ? "Switch to day mode" : "Switch to night mode"
    );
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {}
  }

  // Add or edit application
  function openDialog(application = null) {
    form.reset();

    $("applicationId").value = application?.id || "";
    $("formTitle").textContent = application
      ? "Edit application"
      : "Add an application";

    $("saveApplicationBtn").textContent = application
      ? "Save changes →"
      : "Save application →";

    $("company").value = application?.company || "";
    $("role").value = application?.role || "";
    $("date").value = application?.date || todayISO();
    $("status").value = STATUSES.includes(application?.status)
      ? application.status : "Applied";
    $("notes").value = application?.notes || "";

    if (!dialog.open) dialog.showModal();
    setTimeout(() => $("company").focus(), 50);
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
  }

  // Search and status filter
  function getFilteredApplications() {
    const query = $("searchInput").value.trim().toLowerCase();
    const status = $("statusFilter").value;

    return [...applications]
      .filter(app => {
        const text = `${app.company || ""} ${app.role || ""} ${app.notes || ""}`.toLowerCase();
        return text.includes(query) &&
          (status === "All" || app.status === status);
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }

  function renderApplications() {
    const list = $("applicationList");
    const filtered = getFilteredApplications();

    $("resultCount").textContent =
      `Showing ${filtered.length} of ${applications.length} applications`;
    $("navCount").textContent = applications.length;
    $("heroCount").textContent =
      `${applications.length} application${applications.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
      const hasFilters = $("searchInput").value.trim() ||
        $("statusFilter").value !== "All";

      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-illustration">${hasFilters ? "⌕" : "✦"}</div>
          <h3>${hasFilters ? "No matching applications" : "Your next chapter starts here"}</h3>
          <p>${hasFilters
            ? "Try another search or clear your filters to see all applications."
            : "Add your first job application and keep your placement journey organized."}</p>
          ${hasFilters
            ? '<button class="secondary-btn" data-action="clear-filters" type="button">Clear filters</button>'
            : '<button class="primary-btn" data-action="add" type="button">＋ Add your first application</button>'}
        </div>`;
      return;
    }

    list.innerHTML = filtered.map(app => {
      const status = STATUSES.includes(app.status) ? app.status : "Applied";
      const note = String(app.notes || "").trim();

      return `
        <article class="application-row">
          <div class="company-cell">
            <div class="company-avatar" style="background:${avatarColor(app.company)}">
              ${escapeHTML(initials(app.company))}
            </div>
            <div class="company-details">
              <strong title="${escapeHTML(app.company)}">${escapeHTML(app.company || "Unnamed company")}</strong>
              <small title="${escapeHTML(app.role)}">${escapeHTML(app.role || "Role not specified")}</small>
            </div>
          </div>
          <div class="application-meta">
            <small>${escapeHTML(formatDate(app.date))}</small>
            <span class="status-badge status-${status.toLowerCase()}">${escapeHTML(status)}</span>
          </div>
          <div class="row-actions">
            <button class="row-action" data-action="edit" data-id="${escapeHTML(app.id)}"
              aria-label="Edit application" title="Edit" type="button">✎</button>
            <button class="row-action delete" data-action="delete" data-id="${escapeHTML(app.id)}"
              aria-label="Delete application" title="Delete" type="button">×</button>
          </div>
          ${note ? `<div class="application-note">✎ ${escapeHTML(note)}</div>` : ""}
        </article>`;
    }).join("");
  }

  // Dashboard statistics
  function renderStats() {
    const count = status => applications.filter(app => app.status === status).length;

    $("totalCount").textContent = applications.length;
    $("interviewCount").textContent = count("Interview");
    $("shortlistedCount").textContent = count("Shortlisted");
    $("offerCount").textContent = count("Offer");
    $("chartTotal").textContent = applications.length;
  }

  // Live donut chart
  function renderChart() {
    const total = applications.length;
    let cursor = 0;
    const segments = [];

    STATUSES.forEach(status => {
      const count = applications.filter(app => app.status === status).length;
      const percentage = total ? count / total * 100 : 0;

      if (percentage > 0) {
        segments.push(
          `${COLORS[status]} ${cursor.toFixed(2)}% ${(cursor + percentage).toFixed(2)}%`
        );
        cursor += percentage;
      }
    });

    $("donutChart").style.background = total
      ? `conic-gradient(${segments.join(", ")})`
      : "conic-gradient(#e9e6f2 0% 100%)";

    $("chartLegend").innerHTML = STATUSES.map(status => {
      const count = applications.filter(app => app.status === status).length;
      return `
        <div class="legend-row">
          <span class="legend-swatch" style="background:${COLORS[status]}"></span>
          <span class="legend-label">${status}</span>
          <strong class="legend-value">${count}</strong>
        </div>`;
    }).join("");

    const active = applications.filter(app =>
      ["Applied", "Shortlisted", "Interview"].includes(app.status)
    ).length;

    $("chartNote").textContent = total
      ? `${active} application${active === 1 ? "" : "s"} still in progress. Keep your tracker updated as you hear back.`
      : "Add an application to see your placement insights here.";
  }

  // Weekly goal: counts application dates from Monday through today
  function startOfWeek() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
    return date;
  }

  function getWeeklyGoal() {
    try {
      const value = Number(localStorage.getItem(GOAL_KEY));
      if (Number.isFinite(value) && value >= 1) {
        return Math.min(100, Math.floor(value));
      }
    } catch {}
    return 5;
  }

  function renderGoal() {
    const target = getWeeklyGoal();
    const start = startOfWeek();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const weeklyCount = applications.filter(app => {
      if (!app.date) return false;
      const date = new Date(`${app.date}T12:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date <= end;
    }).length;

    $("goalProgressText").textContent = `${weeklyCount} / ${target}`;
    $("goalProgressFill").style.width =
      `${Math.min(100, weeklyCount / target * 100)}%`;
    $("goalProgressFill").setAttribute("role", "progressbar");
    $("goalProgressFill").setAttribute("aria-valuemin", "0");
    $("goalProgressFill").setAttribute("aria-valuemax", String(target));
    $("goalProgressFill").setAttribute(
      "aria-valuenow", String(Math.min(weeklyCount, target))
    );

    $("goalRemaining").textContent = weeklyCount >= target
      ? "Goal reached — amazing work!"
      : `${target - weeklyCount} more to reach your goal`;

    $("weeklyGoalInput").value = target;
  }

  function renderAll() {
    renderApplications();
    renderStats();
    renderChart();
    renderGoal();
  }

  // Delete an application
  function deleteApplication(id) {
    const app = applications.find(item => item.id === id);
    if (!app) return;

    if (!window.confirm(`Delete the application for ${app.company || "this company"}?`)) {
      return;
    }

    const previous = applications;
    applications = applications.filter(item => item.id !== id);

    if (saveApplications()) {
      renderAll();
      showToast("Application deleted.");
    } else {
      applications = previous;
    }
  }

  // Download application records as CSV
  function exportCSV() {
    if (!applications.length) {
      showToast("Add an application before exporting.");
      return;
    }

    const fields = ["company", "role", "date", "status", "notes"];
    const cell = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      fields.join(","),
      ...applications.map(app => fields.map(field => cell(app[field])).join(","))
    ];

    const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
      type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "careertrack-applications.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("CSV export downloaded.");
  }

  // Form submission: create or update
  form.addEventListener("submit", event => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const id = $("applicationId").value;
    const existing = applications.find(app => app.id === id);

    const application = {
      id: id || (crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`),
      company: $("company").value.trim(),
      role: $("role").value.trim(),
      date: $("date").value,
      status: $("status").value,
      notes: $("notes").value.trim(),
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    if (!application.company || !application.role || !application.date) {
      showToast("Please complete all required fields.");
      return;
    }

    const previous = applications;
    applications = existing
      ? applications.map(app => app.id === id ? application : app)
      : [...applications, application];

    if (saveApplications()) {
      renderAll();
      closeDialog();
      showToast(existing
        ? "Application updated successfully."
        : "Application added successfully.");
    } else {
      applications = previous;
    }
  });

  // Application list buttons
  $("applicationList").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "add") openDialog();

    if (action === "clear-filters") {
      $("searchInput").value = "";
      $("statusFilter").value = "All";
      renderApplications();
    }

    if (action === "edit") {
      const app = applications.find(item => item.id === id);
      if (app) openDialog(app);
    }

    if (action === "delete") deleteApplication(id);
  });

  // Event listeners
  $("addTopBtn").addEventListener("click", () => openDialog());
  $("closeDialogBtn").addEventListener("click", closeDialog);
  $("cancelDialogBtn").addEventListener("click", closeDialog);

  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });

  $("searchInput").addEventListener("input", renderApplications);
  $("statusFilter").addEventListener("change", renderApplications);

  $("clearFiltersBtn").addEventListener("click", () => {
    $("searchInput").value = "";
    $("statusFilter").value = "All";
    renderApplications();
  });

  $("exportBtn").addEventListener("click", exportCSV);

  $("themeToggle").addEventListener("click", () => {
    setTheme(document.body.classList.contains("dark-theme") ? "light" : "dark");
  });

  $("editGoalBtn").addEventListener("click", () => {
    $("goalForm").hidden = !$("goalForm").hidden;
    if (!$("goalForm").hidden) $("weeklyGoalInput").focus();
  });

  $("cancelGoalBtn").addEventListener("click", () => {
    $("goalForm").hidden = true;
  });

  $("goalForm").addEventListener("submit", event => {
    event.preventDefault();
    const target = Math.floor(Number($("weeklyGoalInput").value));

    if (!Number.isFinite(target) || target < 1 || target > 100) {
      showToast("Choose a goal between 1 and 100.");
      return;
    }

    try {
      localStorage.setItem(GOAL_KEY, String(target));
    } catch {
      showToast("Could not save the weekly goal.");
      return;
    }

    renderGoal();
    $("goalForm").hidden = true;
    showToast("Weekly goal updated.");
  });

  $("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(item => {
        item.classList.remove("active");
      });
      link.classList.add("active");
      $("sidebar").classList.remove("open");
    });
  });

  // Initial page setup
  let savedTheme = "light";
  try {
    savedTheme = localStorage.getItem(THEME_KEY) || "light";
  } catch {}

  setTheme(savedTheme === "dark" ? "dark" : "light");

  const hour = new Date().getHours();
  $("greeting").textContent = hour < 12
    ? "Good morning. Make it count."
    : hour < 17
      ? "Make your next move count."
      : "Good evening. Keep moving forward.";

  $("currentDate").textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
  $("footerYear").textContent = new Date().getFullYear();

  renderAll();
})();


