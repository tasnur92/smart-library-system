/* ==========================================================================
   LANDING PAGE CONTROLLER (landing.js)
   Featured Book Catalog, Dynamic Search Preview & Navigation
   ========================================================================== */

import { BookService } from "./books.js";
import { AuthService } from "./auth.js";

document.addEventListener("DOMContentLoaded", async () => {
  setupNavbar();
  setupHeroSearch();
  await loadFeaturedBooks();
  setupAuthButtonRedirects();
});

function setupNavbar() {
  const nav = document.querySelector(".landing-nav");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 30) {
      nav.classList.add("scrolled");
    } else {
      nav.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  const mobileBtn = document.getElementById("mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener("click", () => {
      const isVisible = navLinks.style.display === "flex";
      navLinks.style.display = isVisible ? "none" : "flex";
      navLinks.style.flexDirection = "column";
      navLinks.style.position = "absolute";
      navLinks.style.top = "100%";
      navLinks.style.left = "0";
      navLinks.style.right = "0";
      navLinks.style.background = "#ffffff";
      navLinks.style.padding = "1.5rem";
      navLinks.style.boxShadow = "var(--shadow-xl)";
    });
  }
}

function setupHeroSearch() {
  const searchInput = document.getElementById("hero-search-input");
  const searchBtn = document.getElementById("hero-search-btn");

  function triggerSearch() {
    const q = (searchInput ? searchInput.value : "").trim();
    const booksSection = document.getElementById("featured-books");
    if (booksSection) {
      booksSection.scrollIntoView({ behavior: "smooth" });
    }
    // Filter landing catalog
    loadFeaturedBooks(q);
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", triggerSearch);
  }
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") triggerSearch();
    });
  }

  // Quick tag chips click
  document.querySelectorAll(".quick-tag-pill").forEach(pill => {
    pill.addEventListener("click", () => {
      const tag = pill.textContent.trim();
      if (searchInput) searchInput.value = tag;
      triggerSearch();
    });
  });
}

async function loadFeaturedBooks(query = "") {
  const container = document.getElementById("featured-books-grid");
  if (!container) return;

  try {
    const allBooks = await BookService.getAllBooks();
    let displayBooks = allBooks;

    if (query && query !== "") {
      displayBooks = BookService.filterBooks(allBooks, { query });
    } else {
      // Pick top 8 books with good diversity
      displayBooks = allBooks.slice(0, 8);
    }

    if (displayBooks.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--slate-500);">
          <i class="fas fa-search" style="font-size: 2.5rem; color: var(--slate-300); margin-bottom: 0.75rem; display: block;"></i>
          <h3>No books found matching "${query}"</h3>
          <p style="margin-top: 0.5rem;"><button class="btn btn-secondary btn-sm" onclick="location.reload()">Clear Search</button></p>
        </div>
      `;
      return;
    }

    container.innerHTML = displayBooks.map(book => {
      const isAvail = (book.available || 0) > 0;

      return `
        <div class="book-card">
          <div class="book-cover-container">
            <img src="${book.coverImageUrl}" alt="${book.title}" class="book-cover-img" onerror="this.src='https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'">
            <span class="badge ${isAvail ? 'badge-success' : 'badge-danger'} book-status-badge">
              <i class="fas ${isAvail ? 'fa-check' : 'fa-hourglass-half'}"></i> ${isAvail ? 'Available' : 'Reserved'}
            </span>
            <span class="book-category-pill">${book.category || 'General'}</span>
          </div>

          <div class="book-card-body">
            <h3 class="book-title" title="${book.title}">${book.title}</h3>
            <div class="book-author"><i class="fas fa-feather-alt"></i> ${book.author}</div>
            
            <p style="font-size: 0.825rem; color: var(--slate-600); line-height: 1.5; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${book.description}
            </p>

            <div class="book-meta">
              <span><i class="fas fa-copy"></i> ${book.available} / ${book.quantity} copies</span>
              <span><i class="fas fa-barcode"></i> ${book.isbn}</span>
            </div>
          </div>

          <div class="book-card-actions">
            <a href="pages/login.html" class="btn btn-primary btn-sm" style="flex: 1;">
              <i class="fas fa-book-reader"></i> Borrow / Reserve
            </a>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.error("Error loading featured books:", err);
  }
}

function setupAuthButtonRedirects() {
  const user = AuthService.getCurrentUser();
  const authNavBtn = document.getElementById("nav-auth-btn");
  if (authNavBtn && user) {
    authNavBtn.textContent = user.role === "admin" ? "Admin Portal" : "Student Portal";
    authNavBtn.href = user.role === "admin" ? "pages/admin-dashboard.html" : "pages/student-dashboard.html";
  }
}
