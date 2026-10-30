/* ==========================================================================
   STUDENT DASHBOARD CONTROLLER (student-controller.js)
   Catalog Browser, AI Recommendations, Issue/Return, Reservations, Fines
   ========================================================================== */

import { AuthService } from "./auth.js";
import { BookService } from "./books.js";
import { BorrowingService } from "./borrowings.js";
import { ReservationService } from "./reservations.js";
import { FineService } from "./fines.js";
import { NotificationService } from "./notifications.js";
import { AIRecommender } from "./ai-recommender.js";

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

// Current student state
let currentUser = null;
let allCatalogBooks = [];
let currentCategoryFilter = "All";
let currentAvailabilityFilter = "all";
let currentSortBy = "title_asc";
let currentSearchQuery = "";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Auth Guard (Requires 'student' role)
  currentUser = AuthService.requireAuth("student");
  if (!currentUser) return;

  // Initialize UI components
  setupHeaderAndUserMeta();
  setupNavigationTabs();
  setupEventListeners();
  
  // Load initial data
  await refreshCatalog();
  await refreshMyBorrowed();
  await refreshReservations();
  await refreshFines();
  await refreshAIRecommendations();
  await refreshNotifications();
});

/**
 * Populate user profile in sidebar & header
 */
function setupHeaderAndUserMeta() {
  document.querySelectorAll(".student-name-display").forEach(el => el.textContent = currentUser.name);
  document.querySelectorAll(".student-email-display").forEach(el => el.textContent = currentUser.email);
  document.querySelectorAll(".student-id-display").forEach(el => el.textContent = currentUser.studentId || "STU-2026");
  document.querySelectorAll(".student-avatar-display").forEach(el => el.textContent = currentUser.avatar || "ST");
}

/**
 * Tab Navigation (Catalog, AI, My Loans, Reservations, Fines, Profile)
 */
function setupNavigationTabs() {
  const links = document.querySelectorAll(".sidebar-link[data-view]");
  const views = document.querySelectorAll(".dashboard-view");

  function switchTab(viewId) {
    links.forEach(l => l.classList.toggle("active", l.dataset.view === viewId));
    views.forEach(v => v.classList.toggle("active", v.id === `view-${viewId}`));
    window.location.hash = viewId;

    // Trigger tab-specific refresh
    if (viewId === "recommendations") refreshAIRecommendations();
    if (viewId === "my-books") refreshMyBorrowed();
    if (viewId === "reservations") refreshReservations();
    if (viewId === "fines") refreshFines();
  }

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      switchTab(link.dataset.view);
    });
  });

  // Handle URL hash if present
  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(`view-${hash}`)) {
    switchTab(hash);
  }
}

/**
 * Event Listeners for Search, Category Chips, Mobile Sidebar, and Modals
 */
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById("catalog-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value;
      renderFilteredCatalog();
    });
  }

  // Availability Filter
  const availSelect = document.getElementById("catalog-avail-select");
  if (availSelect) {
    availSelect.addEventListener("change", (e) => {
      currentAvailabilityFilter = e.target.value;
      renderFilteredCatalog();
    });
  }

  // Sort Select
  const sortSelect = document.getElementById("catalog-sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      currentSortBy = e.target.value;
      renderFilteredCatalog();
    });
  }

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

  // Notification dropdown toggle
  const notifBtn = document.getElementById("notification-bell-btn");
  const notifDropdown = document.getElementById("notification-dropdown");
  if (notifBtn && notifDropdown) {
    notifBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
      if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
        notifDropdown.classList.remove("active");
      }
    });
  }

  // Mark all notifications read
  const markReadBtn = document.getElementById("mark-all-read-btn");
  if (markReadBtn) {
    markReadBtn.addEventListener("click", async () => {
      await NotificationService.markAllAsRead(currentUser.uid);
      refreshNotifications();
      showToast("Notifications", "All marked as read", "info");
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("sidebar-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => AuthService.logout());
  }

  // Modal Close buttons
  document.querySelectorAll(".modal-close, [data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("active"));
    });
  });
}

/**
 * Fetch and Render Book Catalog
 */
async function refreshCatalog() {
  try {
    allCatalogBooks = await BookService.getAllBooks();
    renderCategoryPills();
    renderFilteredCatalog();
  } catch (err) {
    console.error("refreshCatalog error:", err);
    showToast("Error", "Failed to load library catalog.", "danger");
  }
}

function renderCategoryPills() {
  const container = document.getElementById("category-pills-container");
  if (!container) return;

  const categories = ["All", ...BookService.getCategories(allCatalogBooks)];
  container.innerHTML = categories.map(cat => `
    <button class="category-chip ${cat === currentCategoryFilter ? 'active' : ''}" data-category="${cat}">
      ${cat}
    </button>
  `).join("");

  container.querySelectorAll(".category-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentCategoryFilter = btn.dataset.category;
      renderFilteredCatalog();
    });
  });
}

function renderFilteredCatalog() {
  const container = document.getElementById("catalog-books-grid");
  const countDisplay = document.getElementById("catalog-results-count");
  if (!container) return;

  const filtered = BookService.filterBooks(allCatalogBooks, {
    query: currentSearchQuery,
    category: currentCategoryFilter,
    availability: currentAvailabilityFilter,
    sortBy: currentSortBy
  });

  if (countDisplay) {
    countDisplay.textContent = `Showing ${filtered.length} of ${allCatalogBooks.length} books`;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fas fa-search empty-state-icon"></i>
        <h4 class="empty-state-title">No books match your criteria</h4>
        <p class="empty-state-description">Try adjusting your search terms, changing category filters, or checking availability.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(book => {
    const isAvail = (book.available || 0) > 0;
    const availPercent = Math.round(((book.available || 0) / (book.quantity || 1)) * 100);

    return `
      <div class="book-card">
        <div class="book-cover-container">
          <img src="${book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'}" alt="${book.title}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'">
          <span class="badge ${isAvail ? 'badge-success' : 'badge-danger'} book-status-badge">
            <i class="fas ${isAvail ? 'fa-check' : 'fa-clock'}"></i> ${isAvail ? 'Available' : 'Reserved/Out'}
          </span>
          <span class="book-category-pill">${book.category || 'General'}</span>
        </div>

        <div class="book-card-body">
          <h3 class="book-title" title="${book.title}">${book.title}</h3>
          <div class="book-author"><i class="fas fa-feather-alt"></i> ${book.author}</div>
          
          <div style="margin-bottom: 0.6rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.775rem; color: var(--slate-500); font-weight: 600;">
              <span>Availability</span>
              <span>${book.available} / ${book.quantity} copies</span>
            </div>
            <div class="book-stock-bar">
              <div class="book-stock-progress ${book.available === 0 ? 'empty' : book.available === 1 ? 'low' : ''}" style="width: ${availPercent}%"></div>
            </div>
          </div>

          <div class="book-meta">
            <span><i class="fas fa-barcode"></i> ISBN: ${book.isbn}</span>
            <span><i class="fas fa-map-marker-alt"></i> ${book.shelfLocation || 'Floor 1'}</span>
          </div>
        </div>

        <div class="book-card-actions">
          ${isAvail ? `
            <button class="btn btn-primary btn-sm btn-borrow-book" style="flex: 1;" data-book-id="${book.id}">
              <i class="fas fa-book-reader"></i> Borrow Book
            </button>
          ` : `
            <button class="btn btn-outline btn-sm btn-reserve-book" style="flex: 1;" data-book-id="${book.id}">
              <i class="fas fa-bookmark"></i> Reserve Copy
            </button>
          `}
          <button class="btn btn-secondary btn-sm btn-details-book" title="View synopsis and similar books" data-book-id="${book.id}">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  // Attach button actions
  container.querySelectorAll(".btn-borrow-book").forEach(btn => {
    btn.addEventListener("click", () => handleBorrowBook(btn.dataset.bookId));
  });

  container.querySelectorAll(".btn-reserve-book").forEach(btn => {
    btn.addEventListener("click", () => handleReserveBook(btn.dataset.bookId));
  });

  container.querySelectorAll(".btn-details-book").forEach(btn => {
    btn.addEventListener("click", () => handleViewBookDetails(btn.dataset.bookId));
  });
}

/**
 * Handle Borrowing a Book
 */
async function handleBorrowBook(bookId) {
  try {
    const book = allCatalogBooks.find(b => b.id === bookId);
    if (!book) return;

    if (!confirm(`Confirm Borrowing:\n\nTitle: ${book.title}\nAuthor: ${book.author}\nLoan Period: ${BorrowingService.getDefaultLoanDays()} Days\n\nWould you like to issue this book now?`)) {
      return;
    }

    const issued = await BorrowingService.issueBook({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.name,
      bookId: book.id
    });

    showToast("Success! 📚", `Issued '${book.title}'. Return by ${new Date(issued.dueDate).toLocaleDateString()}.`, "success");
    await refreshCatalog();
    await refreshMyBorrowed();
    await refreshAIRecommendations();
    await refreshNotifications();
  } catch (err) {
    showToast("Borrow Failed", err.message, "danger");
  }
}

/**
 * Handle Reserving an Unavailable Book
 */
async function handleReserveBook(bookId) {
  try {
    const book = allCatalogBooks.find(b => b.id === bookId);
    if (!book) return;

    if (!confirm(`Reserve Unavailable Book:\n\nTitle: ${book.title}\nAuthor: ${book.author}\n\nYou will be notified immediately when a returned copy becomes available.`)) {
      return;
    }

    await ReservationService.reserveBook({
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.name,
      bookId: book.id,
      bookTitle: book.title
    });

    showToast("Reserved! 🔖", `You reserved '${book.title}'. We'll alert you once available.`, "info");
    await refreshReservations();
    await refreshNotifications();
  } catch (err) {
    showToast("Reservation Notice", err.message, "warning");
  }
}

/**
 * View Book Details & Similar Recommendations Modal
 */
async function handleViewBookDetails(bookId) {
  const book = allCatalogBooks.find(b => b.id === bookId);
  if (!book) return;

  const modal = document.getElementById("book-details-modal");
  const content = document.getElementById("book-details-modal-body");
  if (!modal || !content) return;

  const similar = await AIRecommender.getSimilarBooks(book.id, 3);

  content.innerHTML = `
    <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
      <img src="${book.coverImageUrl}" alt="${book.title}" style="width: 140px; height: 190px; object-fit: cover; border-radius: var(--radius-md); box-shadow: var(--shadow-md);">
      <div style="flex: 1; min-width: 240px;">
        <span class="badge badge-purple" style="margin-bottom: 0.5rem;">${book.category}</span>
        <h3 style="font-size: 1.35rem; font-weight: 800; color: var(--slate-900); margin-bottom: 0.25rem;">${book.title}</h3>
        <p style="color: var(--slate-600); font-weight: 600; margin-bottom: 0.75rem;">By ${book.author}</p>
        <p style="font-size: 0.875rem; color: var(--slate-700); line-height: 1.6; margin-bottom: 1rem;">${book.description}</p>
        <div style="display: flex; gap: 1.5rem; font-size: 0.825rem; color: var(--slate-500);">
          <span><strong>ISBN:</strong> ${book.isbn}</span>
          <span><strong>Year:</strong> ${book.publicationYear || 'N/A'}</span>
          <span><strong>Shelf:</strong> ${book.shelfLocation || 'Main Floor'}</span>
        </div>
      </div>
    </div>

    ${similar.length > 0 ? `
      <div style="border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--slate-800); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fas fa-magic" style="color: var(--accent-purple);"></i> Similar Titles in ${book.category}
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
          ${similar.map(s => `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; background: var(--slate-50);">
              <h5 style="font-size: 0.85rem; font-weight: 700; color: var(--slate-900); margin-bottom: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.title}</h5>
              <div style="font-size: 0.75rem; color: var(--slate-500); margin-bottom: 0.5rem;">${s.author}</div>
              <span class="badge ${s.available > 0 ? 'badge-success' : 'badge-danger'}" style="font-size: 0.7rem;">
                ${s.available > 0 ? `${s.available} Available` : 'Out of Stock'}
              </span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ''}
  `;

  modal.classList.add("active");
}

/**
 * Refresh AI Personalized Recommendations
 */
async function refreshAIRecommendations() {
  const container = document.getElementById("ai-recommendations-grid");
  const affinityContainer = document.getElementById("ai-affinity-chips");
  const topCategoryBadge = document.getElementById("ai-top-category-badge");
  if (!container) return;

  try {
    const aiData = await AIRecommender.getRecommendationsForStudent(currentUser.uid, 6);
    const recommendations = aiData.recommendations || [];
    const profile = aiData.userProfile || {};

    // Render affinity badges
    if (affinityContainer && profile.topCategories) {
      affinityContainer.innerHTML = profile.topCategories.length > 0 
        ? profile.topCategories.map(c => `
            <span class="affinity-tag">
              <i class="fas fa-tag"></i> ${c.category} (${c.score}%)
            </span>
          `).join("")
        : `<span class="affinity-tag"><i class="fas fa-sparkles"></i> Exploring all library genres</span>`;
    }

    if (topCategoryBadge && profile.topCategories && profile.topCategories[0]) {
      topCategoryBadge.textContent = profile.topCategories[0].category;
    }

    if (recommendations.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <i class="fas fa-robot empty-state-icon"></i>
          <h4 class="empty-state-title">Analyzing Reading Profile</h4>
          <p class="empty-state-description">Borrow titles from the catalog to allow our AI model to tailor recommendations to your interests.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recommendations.map(book => {
      const isAvail = (book.available || 0) > 0;

      return `
        <div class="book-card" style="border: 1.5px solid rgba(139, 92, 246, 0.25);">
          <div class="book-cover-container">
            <img src="${book.coverImageUrl}" alt="${book.title}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'">
            
            <div class="ai-match-badge">
              <i class="fas fa-brain"></i> ${book.matchPercentage}% Match
            </div>
            
            <span class="book-category-pill">${book.category}</span>
          </div>

          <div class="book-card-body">
            <div class="ai-reason-pill">
              <i class="fas fa-sparkles"></i> <span>${book.aiReason}</span>
            </div>

            <h3 class="book-title" title="${book.title}">${book.title}</h3>
            <div class="book-author"><i class="fas fa-feather-alt"></i> ${book.author}</div>

            <div class="book-meta">
              <span><i class="fas fa-check-circle" style="color: ${isAvail ? 'var(--success)' : 'var(--danger)'};"></i> ${book.available} copies left</span>
              <span><i class="fas fa-fire" style="color: var(--accent-amber);"></i> ${book.borrowCount || 0} reads</span>
            </div>
          </div>

          <div class="book-card-actions">
            ${isAvail ? `
              <button class="btn btn-primary btn-sm btn-borrow-book" style="flex: 1;" data-book-id="${book.id}">
                <i class="fas fa-book-reader"></i> Borrow
              </button>
            ` : `
              <button class="btn btn-outline btn-sm btn-reserve-book" style="flex: 1;" data-book-id="${book.id}">
                <i class="fas fa-bookmark"></i> Reserve
              </button>
            `}
          </div>
        </div>
      `;
    }).join("");

    // Reattach listeners
    container.querySelectorAll(".btn-borrow-book").forEach(btn => {
      btn.addEventListener("click", () => handleBorrowBook(btn.dataset.bookId));
    });
    container.querySelectorAll(".btn-reserve-book").forEach(btn => {
      btn.addEventListener("click", () => handleReserveBook(btn.dataset.bookId));
    });

  } catch (err) {
    console.error("refreshAIRecommendations error:", err);
  }
}

/**
 * Refresh My Borrowed Books (Active Loans & History)
 */
async function refreshMyBorrowed() {
  const tableBody = document.getElementById("my-borrowed-table-body");
  const countBadge = document.getElementById("active-borrows-count-badge");
  const activeCountSidebar = document.getElementById("sidebar-loans-count");
  if (!tableBody) return;

  const borrows = await BorrowingService.getStudentBorrowings(currentUser.uid);
  const activeBorrows = borrows.filter(b => b.status === "issued");
  const pastBorrows = borrows.filter(b => b.status === "returned");

  if (countBadge) countBadge.textContent = activeBorrows.length;
  if (activeCountSidebar) activeCountSidebar.textContent = activeBorrows.length;

  if (activeBorrows.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 2.5rem;">
          <i class="fas fa-book-open" style="font-size: 2rem; color: var(--slate-300); margin-bottom: 0.5rem; display: block;"></i>
          <p style="color: var(--slate-500); font-weight: 600;">You currently have no active book loans.</p>
          <a href="#catalog" class="btn btn-primary btn-sm" style="margin-top: 0.75rem;" onclick="document.querySelector('[data-view=catalog]').click()">
            Browse Library Catalog
          </a>
        </td>
      </tr>
    `;
  } else {
    const now = new Date().getTime();

    tableBody.innerHTML = activeBorrows.map(b => {
      const dueTime = new Date(b.dueDate).getTime();
      const diffDays = Math.ceil((dueTime - now) / (1000 * 60 * 60 * 24));
      const isOverdue = diffDays < 0;
      const overdueDays = Math.abs(diffDays);

      let statusBadge;
      if (isOverdue) {
        statusBadge = `<span class="badge badge-danger"><i class="fas fa-exclamation-triangle"></i> Overdue by ${overdueDays}d</span>`;
      } else if (diffDays <= 2) {
        statusBadge = `<span class="badge badge-warning"><i class="fas fa-clock"></i> Due in ${diffDays}d</span>`;
      } else {
        statusBadge = `<span class="badge badge-success"><i class="fas fa-check"></i> ${diffDays} days left</span>`;
      }

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--slate-900);">${b.bookTitle}</div>
            <div style="font-size: 0.775rem; color: var(--slate-400);">ISBN: ${b.bookIsbn || 'N/A'}</div>
          </td>
          <td>${new Date(b.issueDate).toLocaleDateString()}</td>
          <td>${new Date(b.dueDate).toLocaleDateString()}</td>
          <td>${statusBadge}</td>
          <td>
            ${isOverdue ? `<span style="color: var(--danger); font-weight: 700;">$${(overdueDays * FineService.getDailyFineRate()).toFixed(2)}</span>` : `<span style="color: var(--success);">$0.00</span>`}
          </td>
          <td>
            <button class="btn btn-primary btn-sm btn-return-book" data-borrow-id="${b.id}" data-book-title="${b.bookTitle}">
              <i class="fas fa-undo"></i> Return Book
            </button>
          </td>
        </tr>
      `;
    }).join("");

    tableBody.querySelectorAll(".btn-return-book").forEach(btn => {
      btn.addEventListener("click", () => handleReturnBook(btn.dataset.borrowId, btn.dataset.bookTitle));
    });
  }

  // Render past borrowing history
  const historyBody = document.getElementById("my-history-table-body");
  if (historyBody) {
    if (pastBorrows.length === 0) {
      historyBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">No past borrowing history yet.</td></tr>`;
    } else {
      historyBody.innerHTML = pastBorrows.map(p => `
        <tr>
          <td style="font-weight: 600;">${p.bookTitle}</td>
          <td>${new Date(p.issueDate).toLocaleDateString()}</td>
          <td>${new Date(p.returnDate).toLocaleDateString()}</td>
          <td><span class="badge badge-neutral"><i class="fas fa-check-double"></i> Returned</span></td>
        </tr>
      `).join("");
    }
  }
}

/**
 * Handle Return Book Action
 */
async function handleReturnBook(borrowingId, bookTitle) {
  try {
    if (!confirm(`Confirm Return:\n\nAre you sure you want to return '${bookTitle}'?`)) {
      return;
    }

    const result = await BorrowingService.returnBook(borrowingId);
    
    if (result.fine) {
      showToast("Overdue Fine Generated", `Book returned late. A fine of $${result.fine.amount.toFixed(2)} was added to your account.`, "warning");
    } else {
      showToast("Returned Successfully! 🎉", `Thank you for returning '${bookTitle}' on time.`, "success");
    }

    await refreshMyBorrowed();
    await refreshCatalog();
    await refreshFines();
    await refreshAIRecommendations();
    await refreshNotifications();
  } catch (err) {
    showToast("Return Failed", err.message, "danger");
  }
}

/**
 * Refresh Reservations Tab
 */
async function refreshReservations() {
  const container = document.getElementById("my-reservations-table-body");
  const badge = document.getElementById("sidebar-reserves-count");
  if (!container) return;

  const reservations = await ReservationService.getStudentReservations(currentUser.uid);
  const activeRes = reservations.filter(r => r.status === "active" || r.status === "available_ready");

  if (badge) badge.textContent = activeRes.length;

  if (reservations.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted" style="padding: 2rem;">
          You have no active book reservations. If an item is out of stock, use the "Reserve" button on the catalog.
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = reservations.map(r => {
    let statusPill;
    if (r.status === "available_ready") {
      statusPill = `<span class="badge badge-success"><i class="fas fa-bell"></i> Ready For Pickup!</span>`;
    } else if (r.status === "active") {
      statusPill = `<span class="badge badge-warning"><i class="fas fa-hourglass-half"></i> In Queue</span>`;
    } else if (r.status === "fulfilled") {
      statusPill = `<span class="badge badge-neutral"><i class="fas fa-check"></i> Fulfilled</span>`;
    } else {
      statusPill = `<span class="badge badge-danger">Cancelled</span>`;
    }

    return `
      <tr>
        <td style="font-weight: 700; color: var(--slate-900);">${r.bookTitle}</td>
        <td>${new Date(r.reservationDate).toLocaleDateString()}</td>
        <td>${statusPill}</td>
        <td>${r.status === "available_ready" ? 'Available at front desk' : 'Waiting for copy return'}</td>
        <td>
          ${(r.status === "active" || r.status === "available_ready") ? `
            <button class="btn btn-outline btn-sm btn-cancel-res" data-id="${r.id}">
              <i class="fas fa-times"></i> Cancel
            </button>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join("");

  container.querySelectorAll(".btn-cancel-res").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (confirm("Cancel this book reservation?")) {
        await ReservationService.cancelReservation(btn.dataset.id);
        showToast("Reservation Cancelled", "Your reservation has been cancelled.", "info");
        refreshReservations();
      }
    });
  });
}

/**
 * Refresh Fines Tab & Payment Simulation
 */
async function refreshFines() {
  const tableBody = document.getElementById("my-fines-table-body");
  const balanceDisplay = document.getElementById("my-fine-balance-display");
  const sidebarFinesBadge = document.getElementById("sidebar-fines-badge");
  if (!tableBody) return;

  const fines = await FineService.getStudentFines(currentUser.uid);
  const unpaidTotal = await FineService.getStudentUnpaidBalance(currentUser.uid);

  if (balanceDisplay) balanceDisplay.textContent = `$${unpaidTotal.toFixed(2)}`;
  if (sidebarFinesBadge) {
    sidebarFinesBadge.textContent = unpaidTotal > 0 ? `$${unpaidTotal.toFixed(0)}` : "0";
    sidebarFinesBadge.style.backgroundColor = unpaidTotal > 0 ? "var(--danger)" : "rgba(255, 255, 255, 0.2)";
  }

  if (fines.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 2rem;">
          <i class="fas fa-shield-alt" style="color: var(--success); font-size: 1.5rem; display: block; margin-bottom: 0.5rem;"></i>
          No fines recorded! Your account is in excellent standing.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = fines.map(f => {
    const isUnpaid = f.status === "unpaid";
    return `
      <tr>
        <td style="font-weight: 700; color: var(--slate-900);">${f.bookTitle}</td>
        <td>${f.daysOverdue || 0} days</td>
        <td style="font-weight: 700; color: ${isUnpaid ? 'var(--danger)' : 'var(--slate-800)'};">$${parseFloat(f.amount).toFixed(2)}</td>
        <td>${new Date(f.createdAt).toLocaleDateString()}</td>
        <td>
          <span class="badge ${isUnpaid ? 'badge-danger' : f.status === 'paid' ? 'badge-success' : 'badge-neutral'}">
            ${f.status.toUpperCase()}
          </span>
        </td>
        <td>
          ${isUnpaid ? `
            <button class="btn btn-success btn-sm btn-pay-fine" data-id="${f.id}" data-amount="${f.amount}" data-title="${f.bookTitle}">
              <i class="fas fa-credit-card"></i> Pay Now
            </button>
          ` : `
            <span style="font-size: 0.8rem; color: var(--slate-400);">Paid ${f.paidAt ? new Date(f.paidAt).toLocaleDateString() : ''}</span>
          `}
        </td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll(".btn-pay-fine").forEach(btn => {
    btn.addEventListener("click", () => handlePayFineModal(btn.dataset.id, btn.dataset.amount, btn.dataset.title));
  });
}

function handlePayFineModal(fineId, amount, title) {
  const modal = document.getElementById("fine-payment-modal");
  const titleDisplay = document.getElementById("pay-fine-book-title");
  const amountDisplay = document.getElementById("pay-fine-amount");
  const confirmBtn = document.getElementById("btn-confirm-pay-fine");

  if (!modal || !confirmBtn) return;

  if (titleDisplay) titleDisplay.textContent = title;
  if (amountDisplay) amountDisplay.textContent = `$${parseFloat(amount).toFixed(2)}`;

  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<span class="spinner spinner-sm spinner-white"></span> Processing...`;
    
    setTimeout(async () => {
      await FineService.markFinePaid(fineId, "Student Portal Online Debit");
      showToast("Payment Successful! 💳", `Paid $${parseFloat(amount).toFixed(2)} fine. Receipt generated.`, "success");
      modal.classList.remove("active");
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = `Pay Now`;
      refreshFines();
    }, 700);
  };

  modal.classList.add("active");
}

/**
 * Refresh Notifications Bell Dropdown
 */
async function refreshNotifications() {
  const notifList = document.getElementById("notification-items-list");
  const unreadBadge = document.getElementById("notification-badge-count");
  if (!notifList) return;

  const notifs = await NotificationService.getUserNotifications(currentUser.uid);
  const unread = notifs.filter(n => !n.read);

  if (unreadBadge) {
    unreadBadge.textContent = unread.length;
    unreadBadge.style.display = unread.length > 0 ? "flex" : "none";
  }

  if (notifs.length === 0) {
    notifList.innerHTML = `<li style="padding: 1.5rem; text-align: center; color: var(--slate-400); font-size: 0.85rem;">No notifications</li>`;
    return;
  }

  notifList.innerHTML = notifs.slice(0, 8).map(n => `
    <li class="notification-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
      <div class="notification-icon">
        <i class="fas ${n.type === 'success' ? 'fa-check' : n.type === 'warning' ? 'fa-exclamation-triangle' : n.type === 'danger' ? 'fa-exclamation-circle' : 'fa-bell'}"></i>
      </div>
      <div>
        <div class="notification-text"><strong>${n.title}</strong>: ${n.message}</div>
        <div class="notification-time">${new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </li>
  `).join("");

  notifList.querySelectorAll(".notification-item").forEach(item => {
    item.addEventListener("click", async () => {
      await NotificationService.markAsRead(item.dataset.id);
      item.classList.remove("unread");
      refreshNotifications();
    });
  });
}
