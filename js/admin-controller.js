/* ==========================================================================
   ADMIN DASHBOARD CONTROLLER (admin-controller.js)
   Book CRUD, User Management, Borrowing Oversight, Reservations & Fines
   ========================================================================== */

import { AuthService } from "./auth.js";
import { BookService } from "./books.js";
import { BorrowingService } from "./borrowings.js";
import { ReservationService } from "./reservations.js";
import { FineService } from "./fines.js";
import { NotificationService } from "./notifications.js";
import { 
  isRealFirebaseActive, 
  getActiveFirebaseConfig, 
  saveCustomFirebaseConfig, 
  resetFirebaseConfig,
  LocalStore 
} from "./firebase-config.js";
import { 
  INITIAL_BOOKS, 
  INITIAL_USERS, 
  INITIAL_BORROWINGS, 
  INITIAL_RESERVATIONS, 
  INITIAL_FINES, 
  INITIAL_NOTIFICATIONS 
} from "./seed-data.js";

// Helper for UI Toasts
function showToast(title, message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastFadeOut 0.3s forwards";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

let currentUser = null;
let allBooks = [];
let allUsers = [];
let allBorrowings = [];
let allReservations = [];
let allFines = [];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Auth Guard (Requires 'admin' role)
  currentUser = AuthService.requireAuth("admin");
  if (!currentUser) return;

  // Initialize UI components
  setupAdminMeta();
  setupNavigationTabs();
  setupEventListeners();
  
  // Load all initial data
  await refreshDashboardStats();
  await refreshBooksTable();
  await refreshBorrowingsTable();
  await refreshReservationsTable();
  await refreshFinesTable();
  await refreshUsersTable();
  setupFirebaseSettingsView();
});

function setupAdminMeta() {
  document.querySelectorAll(".admin-name-display").forEach(el => el.textContent = currentUser.name);
  document.querySelectorAll(".admin-email-display").forEach(el => el.textContent = currentUser.email);
  document.querySelectorAll(".admin-avatar-display").forEach(el => el.textContent = currentUser.avatar || "AD");
}

function setupNavigationTabs() {
  const links = document.querySelectorAll(".sidebar-link[data-view]");
  const views = document.querySelectorAll(".dashboard-view");

  function switchTab(viewId) {
    links.forEach(l => l.classList.toggle("active", l.dataset.view === viewId));
    views.forEach(v => v.classList.toggle("active", v.id === `view-${viewId}`));
    window.location.hash = viewId;

    if (viewId === "overview") refreshDashboardStats();
    if (viewId === "books") refreshBooksTable();
    if (viewId === "borrowings") refreshBorrowingsTable();
    if (viewId === "reservations") refreshReservationsTable();
    if (viewId === "fines") refreshFinesTable();
    if (viewId === "users") refreshUsersTable();
  }

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(link.dataset.view);
    });
  });

  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(`view-${hash}`)) {
    switchTab(hash);
  }
}

function setupEventListeners() {
  // Mobile sidebar toggle
  const mobileToggle = document.getElementById("mobile-sidebar-toggle");
  const sidebar = document.querySelector(".app-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (mobileToggle && sidebar && overlay) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("active");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }

  // Logout
  const logoutBtn = document.getElementById("sidebar-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => AuthService.logout());
  }

  // Book Search in Table
  const bookSearch = document.getElementById("admin-book-search");
  if (bookSearch) {
    bookSearch.addEventListener("input", (e) => {
      renderBooksTable(e.target.value);
    });
  }

  // Add Book Button & Modal
  const openAddBookBtn = document.getElementById("btn-open-add-book-modal");
  const addBookModal = document.getElementById("add-book-modal");
  const addBookForm = document.getElementById("add-book-form");

  if (openAddBookBtn && addBookModal) {
    openAddBookBtn.addEventListener("click", () => {
      if (addBookForm) addBookForm.reset();
      document.getElementById("modal-add-book-title").textContent = "Add New Book to Catalog";
      document.getElementById("form-book-id").value = "";
      addBookModal.classList.add("active");
    });
  }

  if (addBookForm) {
    addBookForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSaveBook(new FormData(addBookForm));
    });
  }

  // Seed sample data button
  const seedBtn = document.getElementById("btn-seed-sample-data");
  if (seedBtn) {
    seedBtn.addEventListener("click", () => handleResetAndSeedData());
  }

  // Modal Closers
  document.querySelectorAll(".modal-close, [data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    });
  });
}

/**
 * Refresh KPI Cards and Analytics Charts
 */
async function refreshDashboardStats() {
  [allBooks, allUsers, allBorrowings, allFines, allReservations] = await Promise.all([
    BookService.getAllBooks(),
    AuthService.getAllUsers(),
    BorrowingService.getAllBorrowings(),
    FineService.getAllFines(),
    ReservationService.getAllReservations()
  ]);

  const totalBooks = allBooks.length;
  const totalCopies = allBooks.reduce((sum, b) => sum + (parseInt(b.quantity, 10) || 0), 0);
  const availableCopies = allBooks.reduce((sum, b) => sum + (parseInt(b.available, 10) || 0), 0);
  const issuedCopies = totalCopies - availableCopies;
  const activeReservations = allReservations.filter(r => r.status === "active" || r.status === "available_ready").length;
  const totalFineAmount = allFines.reduce((sum, f) => f.status === "unpaid" ? sum + (parseFloat(f.amount) || 0) : sum, 0);

  // Update stat widgets
  document.getElementById("stat-total-titles").textContent = totalBooks;
  document.getElementById("stat-active-issued").textContent = issuedCopies;
  document.getElementById("stat-available-copies").textContent = availableCopies;
  document.getElementById("stat-registered-users").textContent = allUsers.length;
  document.getElementById("stat-pending-reserves").textContent = activeReservations;
  document.getElementById("stat-unpaid-fines").textContent = `$${totalFineAmount.toFixed(2)}`;

  // Category Distribution Bar
  renderCategoryAnalytics();
  renderRecentActivityLog();
}

function renderCategoryAnalytics() {
  const container = document.getElementById("analytics-category-bars");
  if (!container) return;

  const counts = {};
  allBooks.forEach(b => {
    const cat = b.category || "General";
    counts[cat] = (counts[cat] || 0) + (b.quantity || 1);
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  container.innerHTML = sorted.map(([cat, count]) => {
    const pct = Math.round((count / total) * 100);
    return `
      <div style="margin-bottom: 1rem;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.3rem;">
          <span>${cat}</span>
          <span style="color: var(--slate-500);">${count} copies (${pct}%)</span>
        </div>
        <div style="height: 8px; background: var(--slate-100); border-radius: var(--radius-full); overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background: linear-gradient(90deg, var(--primary), var(--accent-purple)); border-radius: var(--radius-full);"></div>
        </div>
      </div>
    `;
  }).join("");
}

function renderRecentActivityLog() {
  const container = document.getElementById("admin-recent-activity-list");
  if (!container) return;

  const combined = [
    ...allBorrowings.map(b => ({
      type: b.status === "issued" ? "issue" : "return",
      title: b.bookTitle,
      user: b.userName || b.userEmail,
      date: b.status === "issued" ? b.issueDate : b.returnDate
    })),
    ...allReservations.map(r => ({
      type: "reserve",
      title: r.bookTitle,
      user: r.userName || r.userEmail,
      date: r.reservationDate
    }))
  ];

  combined.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  container.innerHTML = combined.slice(0, 6).map(act => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle); font-size: 0.875rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span class="badge ${act.type === 'issue' ? 'badge-primary' : act.type === 'return' ? 'badge-success' : 'badge-purple'}">
          ${act.type.toUpperCase()}
        </span>
        <div>
          <strong>${act.title}</strong>
          <div style="font-size: 0.78rem; color: var(--slate-500);">By ${act.user}</div>
        </div>
      </div>
      <span style="font-size: 0.75rem; color: var(--slate-400);">${new Date(act.date).toLocaleDateString()}</span>
    </div>
  `).join("");
}

/**
 * Book Management Table
 */
async function refreshBooksTable() {
  allBooks = await BookService.getAllBooks();
  renderBooksTable();
}

function renderBooksTable(query = "") {
  const tableBody = document.getElementById("admin-books-table-body");
  if (!tableBody) return;

  let filtered = allBooks;
  if (query && query.trim() !== "") {
    const q = query.trim().toLowerCase();
    filtered = allBooks.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) || 
      b.isbn.toLowerCase().includes(q) || 
      (b.category || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No books found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map(b => `
    <tr>
      <td>
        <img src="${b.coverImageUrl}" alt="${b.title}" style="width: 38px; height: 50px; object-fit: cover; border-radius: var(--radius-sm);" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'">
      </td>
      <td>
        <div style="font-weight: 700; color: var(--slate-900);">${b.title}</div>
        <div style="font-size: 0.78rem; color: var(--slate-500);">By ${b.author}</div>
      </td>
      <td><span class="badge badge-purple">${b.category || 'General'}</span></td>
      <td><code style="font-family: var(--font-mono); font-size: 0.8rem;">${b.isbn}</code></td>
      <td>
        <span class="badge ${b.available > 0 ? 'badge-success' : 'badge-danger'}">
          ${b.available} / ${b.quantity} Available
        </span>
      </td>
      <td>${b.shelfLocation || 'N/A'}</td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm btn-edit-book" data-book-id="${b.id}" title="Edit Book">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-danger btn-sm btn-delete-book" data-book-id="${b.id}" data-title="${b.title}" title="Delete Book">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  // Attach Edit and Delete listeners
  tableBody.querySelectorAll(".btn-edit-book").forEach(btn => {
    btn.addEventListener("click", () => handleOpenEditModal(btn.dataset.bookId));
  });

  tableBody.querySelectorAll(".btn-delete-book").forEach(btn => {
    btn.addEventListener("click", () => handleDeleteBook(btn.dataset.bookId, btn.dataset.title));
  });
}

/**
 * Handle Add/Edit Book Save
 */
async function handleSaveBook(formData) {
  const bookId = formData.get("bookId");
  const payload = {
    title: formData.get("title"),
    author: formData.get("author"),
    isbn: formData.get("isbn"),
    category: formData.get("category"),
    quantity: parseInt(formData.get("quantity"), 10) || 1,
    publicationYear: parseInt(formData.get("publicationYear"), 10) || 2026,
    shelfLocation: formData.get("shelfLocation") || "Main Stack",
    coverImageUrl: formData.get("coverImageUrl") || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
    description: formData.get("description") || ""
  };

  try {
    if (bookId) {
      await BookService.updateBook(bookId, payload);
      showToast("Book Updated", `Updated '${payload.title}' successfully.`, "success");
    } else {
      await BookService.addBook(payload);
      showToast("Book Added", `Added '${payload.title}' to the catalog.`, "success");
    }

    document.getElementById("add-book-modal").classList.remove("active");
    await refreshBooksTable();
    await refreshDashboardStats();
  } catch (err) {
    showToast("Save Error", err.message, "danger");
  }
}

function handleOpenEditModal(bookId) {
  const book = allBooks.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById("add-book-modal");
  document.getElementById("modal-add-book-title").textContent = "Edit Book Information";
  document.getElementById("form-book-id").value = book.id;
  document.getElementById("form-book-title").value = book.title;
  document.getElementById("form-book-author").value = book.author;
  document.getElementById("form-book-isbn").value = book.isbn;
  document.getElementById("form-book-category").value = book.category;
  document.getElementById("form-book-quantity").value = book.quantity;
  document.getElementById("form-book-year").value = book.publicationYear || "";
  document.getElementById("form-book-shelf").value = book.shelfLocation || "";
  document.getElementById("form-book-cover").value = book.coverImageUrl || "";
  document.getElementById("form-book-desc").value = book.description || "";

  modal.classList.add("active");
}

async function handleDeleteBook(bookId, title) {
  if (!confirm(`Are you sure you want to delete '${title}' from the library catalog?\n\nThis action cannot be undone.`)) {
    return;
  }

  try {
    await BookService.deleteBook(bookId);
    showToast("Book Deleted", `'${title}' was removed from the catalog.`, "info");
    await refreshBooksTable();
    await refreshDashboardStats();
  } catch (err) {
    showToast("Delete Blocked", err.message, "danger");
  }
}

/**
 * Borrowings Oversight Table
 */
async function refreshBorrowingsTable() {
  allBorrowings = await BorrowingService.getAllBorrowings();
  const tableBody = document.getElementById("admin-borrowings-table-body");
  if (!tableBody) return;

  if (allBorrowings.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No borrowing records found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = allBorrowings.map(b => {
    const isReturned = b.status === "returned";
    const isOverdue = !isReturned && new Date(b.dueDate).getTime() < Date.now();

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--slate-900);">${b.bookTitle}</div>
          <div style="font-size: 0.78rem; color: var(--slate-500);">ISBN: ${b.bookIsbn || 'N/A'}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${b.userName || 'Student'}</div>
          <div style="font-size: 0.78rem; color: var(--slate-400);">${b.userEmail}</div>
        </td>
        <td>${new Date(b.issueDate).toLocaleDateString()}</td>
        <td>${new Date(b.dueDate).toLocaleDateString()}</td>
        <td>
          <span class="badge ${isReturned ? 'badge-neutral' : isOverdue ? 'badge-danger' : 'badge-primary'}">
            ${isReturned ? 'Returned' : isOverdue ? 'OVERDUE' : 'Issued'}
          </span>
        </td>
        <td>${b.returnDate ? new Date(b.returnDate).toLocaleDateString() : '-'}</td>
        <td>
          ${!isReturned ? `
            <button class="btn btn-primary btn-sm btn-admin-return" data-id="${b.id}" data-title="${b.bookTitle}">
              <i class="fas fa-undo"></i> Return
            </button>
          ` : `<span style="color: var(--success); font-size: 0.8rem;"><i class="fas fa-check"></i> Closed</span>`}
        </td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll(".btn-admin-return").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm(`Process return for '${btn.dataset.title}'?`)) {
        await BorrowingService.returnBook(btn.dataset.id);
        showToast("Return Processed", `Processed return for '${btn.dataset.title}'.`, "success");
        await refreshBorrowingsTable();
        await refreshDashboardStats();
        await refreshBooksTable();
      }
    });
  });
}

/**
 * Reservations Management Table
 */
async function refreshReservationsTable() {
  allReservations = await ReservationService.getAllReservations();
  const tableBody = document.getElementById("admin-reservations-table-body");
  if (!tableBody) return;

  if (allReservations.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 2rem;">No student reservations in queue.</td></tr>`;
    return;
  }

  tableBody.innerHTML = allReservations.map(r => `
    <tr>
      <td style="font-weight: 700;">${r.bookTitle}</td>
      <td>
        <div>${r.userName || 'Student'}</div>
        <div style="font-size: 0.78rem; color: var(--slate-400);">${r.userEmail}</div>
      </td>
      <td>${new Date(r.reservationDate).toLocaleDateString()}</td>
      <td>
        <span class="badge ${r.status === 'available_ready' ? 'badge-success' : r.status === 'active' ? 'badge-warning' : r.status === 'fulfilled' ? 'badge-neutral' : 'badge-danger'}">
          ${r.status.toUpperCase()}
        </span>
      </td>
      <td>
        <div style="display: flex; gap: 0.4rem;">
          ${r.status === 'active' || r.status === 'available_ready' ? `
            <button class="btn btn-success btn-sm btn-admin-fulfill-res" data-id="${r.id}">
              <i class="fas fa-check"></i> Fulfill
            </button>
            <button class="btn btn-outline btn-sm btn-admin-cancel-res" data-id="${r.id}">
              <i class="fas fa-times"></i> Cancel
            </button>
          ` : '-'}
        </div>
      </td>
    </tr>
  `).join("");

  tableBody.querySelectorAll(".btn-admin-fulfill-res").forEach(btn => {
    btn.addEventListener("click", async () => {
      await ReservationService.fulfillReservation(btn.dataset.id);
      showToast("Fulfilled", "Reservation marked as fulfilled.", "success");
      refreshReservationsTable();
      refreshDashboardStats();
    });
  });

  tableBody.querySelectorAll(".btn-admin-cancel-res").forEach(btn => {
    btn.addEventListener("click", async () => {
      await ReservationService.cancelReservation(btn.dataset.id);
      showToast("Cancelled", "Reservation cancelled.", "info");
      refreshReservationsTable();
      refreshDashboardStats();
    });
  });
}

/**
 * Fines Management Table
 */
async function refreshFinesTable() {
  allFines = await FineService.getAllFines();
  const tableBody = document.getElementById("admin-fines-table-body");
  if (!tableBody) return;

  if (allFines.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 2rem;">No fine records.</td></tr>`;
    return;
  }

  tableBody.innerHTML = allFines.map(f => {
    const isUnpaid = f.status === "unpaid";
    return `
      <tr>
        <td style="font-weight: 700;">${f.bookTitle}</td>
        <td><code>${f.userId}</code></td>
        <td>${f.daysOverdue || 0} days</td>
        <td style="font-weight: 700; color: ${isUnpaid ? 'var(--danger)' : 'var(--slate-800)'};">$${parseFloat(f.amount).toFixed(2)}</td>
        <td>
          <span class="badge ${isUnpaid ? 'badge-danger' : f.status === 'paid' ? 'badge-success' : 'badge-neutral'}">
            ${f.status.toUpperCase()}
          </span>
        </td>
        <td>${new Date(f.createdAt).toLocaleDateString()}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            ${isUnpaid ? `
              <button class="btn btn-success btn-sm btn-admin-pay-fine" data-id="${f.id}" title="Mark Paid">
                <i class="fas fa-check"></i> Mark Paid
              </button>
              <button class="btn btn-secondary btn-sm btn-admin-waive-fine" data-id="${f.id}" title="Waive Fine">
                <i class="fas fa-hand-holding-usd"></i> Waive
              </button>
            ` : `<span style="font-size: 0.8rem; color: var(--slate-400);">Resolved</span>`}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll(".btn-admin-pay-fine").forEach(btn => {
    btn.addEventListener("click", async () => {
      await FineService.markFinePaid(btn.dataset.id, "Admin Cash Desk");
      showToast("Fine Settled", "Marked fine as paid.", "success");
      refreshFinesTable();
      refreshDashboardStats();
    });
  });

  tableBody.querySelectorAll(".btn-admin-waive-fine").forEach(btn => {
    btn.addEventListener("click", async () => {
      const reason = prompt("Enter waiver reason (e.g. Medical excuse, Grace period):", "Administrative waiver");
      if (reason) {
        await FineService.waiveFine(btn.dataset.id, reason);
        showToast("Fine Waived", "Fine has been waived.", "info");
        refreshFinesTable();
        refreshDashboardStats();
      }
    });
  });
}

/**
 * Registered Users Directory
 */
async function refreshUsersTable() {
  allUsers = await AuthService.getAllUsers();
  const tableBody = document.getElementById("admin-users-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = allUsers.map(u => `
    <tr>
      <td>
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <div class="user-avatar-small" style="width: 32px; height: 32px; font-size: 0.8rem;">${u.avatar || u.name.substring(0, 2).toUpperCase()}</div>
          <div>
            <div style="font-weight: 700; color: var(--slate-900);">${u.name}</div>
            <div style="font-size: 0.78rem; color: var(--slate-400);">${u.email}</div>
          </div>
        </div>
      </td>
      <td>
        <span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-primary'}">
          ${u.role.toUpperCase()}
        </span>
      </td>
      <td>${u.studentId || u.department || 'N/A'}</td>
      <td>${u.department || 'General'}</td>
      <td>${new Date(u.createdAt || Date.now()).toLocaleDateString()}</td>
    </tr>
  `).join("");
}

/**
 * Firebase Settings & Connection View
 */
function setupFirebaseSettingsView() {
  const statusBadge = document.getElementById("firebase-status-badge");
  const configTextarea = document.getElementById("custom-firebase-config-json");
  const saveBtn = document.getElementById("btn-save-firebase-config");
  const resetBtn = document.getElementById("btn-reset-firebase-config");

  if (statusBadge) {
    if (isRealFirebaseActive) {
      statusBadge.className = "badge badge-success";
      statusBadge.innerHTML = `<i class="fas fa-check-circle"></i> Connected to Cloud Firestore`;
    } else {
      statusBadge.className = "badge badge-warning";
      statusBadge.innerHTML = `<i class="fas fa-database"></i> Standalone High-Speed Engine Active`;
    }
  }

  if (configTextarea) {
    configTextarea.value = JSON.stringify(getActiveFirebaseConfig(), null, 2);
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      try {
        const parsed = JSON.parse(configTextarea.value);
        saveCustomFirebaseConfig(parsed);
      } catch (err) {
        alert("Invalid JSON format in Firebase configuration: " + err.message);
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset to default configuration?")) {
        resetFirebaseConfig();
      }
    });
  }
}

/**
 * One-click Reset & Seed Sample Data
 */
function handleResetAndSeedData() {
  if (!confirm("This will re-populate the library database with 14 comprehensive books, 3 test users, sample loans, reservations, and fine records.\n\nProceed?")) {
    return;
  }

  LocalStore.saveCollection("books", INITIAL_BOOKS);
  LocalStore.saveCollection("users", INITIAL_USERS);
  LocalStore.saveCollection("borrowings", INITIAL_BORROWINGS);
  LocalStore.saveCollection("reservations", INITIAL_RESERVATIONS);
  LocalStore.saveCollection("fines", INITIAL_FINES);
  LocalStore.saveCollection("notifications", INITIAL_NOTIFICATIONS);

  showToast("Database Seeded", "Successfully loaded sample library dataset.", "success");
  setTimeout(() => window.location.reload(), 800);
}
