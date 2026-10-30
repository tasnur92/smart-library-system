/* ==========================================================================
   BOOK MANAGEMENT & CATALOG SERVICE (books.js)
   CRUD, Real-time Querying, ISBN Validation & Dynamic Filtering
   ========================================================================== */

import { 
  db, 
  isRealFirebaseActive, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_BOOKS } from "./seed-data.js";

// Ensure initial books exist
(function ensureInitialBooks() {
  const existing = LocalStore.getAll("books");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("books", INITIAL_BOOKS);
  }
})();

export const BookService = {
  /**
   * Get all books in catalog
   */
  async getAllBooks() {
    if (isRealFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "books"));
        const books = [];
        snap.forEach(d => books.push({ id: d.id, ...d.data() }));
        if (books.length > 0) return books;
      } catch (err) {
        console.warn("Firestore getAllBooks failed, using local store:", err);
      }
    }
    return LocalStore.getAll("books");
  },

  /**
   * Get a single book by ID
   */
  async getBookById(bookId) {
    if (isRealFirebaseActive && db) {
      try {
        const docRef = doc(db, "books", bookId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        }
      } catch (err) {
        console.warn("Firestore getBookById failed, fallback to local store:", err);
      }
    }
    return LocalStore.getById("books", bookId);
  },

  /**
   * Add a new book (with duplicate ISBN prevention)
   */
  async addBook(bookData) {
    const cleanIsbn = bookData.isbn.trim().replace(/[-\s]/g, "");
    
    // Check for duplicate ISBN
    const allBooks = await this.getAllBooks();
    const isDuplicate = allBooks.some(b => b.isbn.replace(/[-\s]/g, "") === cleanIsbn);
    
    if (isDuplicate) {
      throw new Error(`A book with ISBN '${bookData.isbn}' already exists in the library catalog.`);
    }

    const totalQty = parseInt(bookData.quantity, 10) || 1;
    const newBook = {
      isbn: bookData.isbn.trim(),
      title: bookData.title.trim(),
      author: bookData.author.trim(),
      category: bookData.category || "General",
      description: bookData.description || "No description provided.",
      quantity: totalQty,
      available: totalQty, // Initially all copies are available
      publicationYear: parseInt(bookData.publicationYear, 10) || new Date().getFullYear(),
      shelfLocation: bookData.shelfLocation || "Main Floor",
      coverImageUrl: bookData.coverImageUrl || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80",
      borrowCount: 0,
      createdAt: new Date().toISOString()
    };

    if (isRealFirebaseActive && db) {
      try {
        const docRef = await addDoc(collection(db, "books"), newBook);
        newBook.id = docRef.id;
      } catch (err) {
        console.warn("Firestore addDoc failed, using local store:", err);
        newBook.id = "book_" + Date.now();
      }
    } else {
      newBook.id = "book_" + Date.now();
    }

    LocalStore.set("books", newBook.id, newBook);
    return newBook;
  },

  /**
   * Edit an existing book
   */
  async updateBook(bookId, updatedFields) {
    const existing = await this.getBookById(bookId);
    if (!existing) {
      throw new Error("Book not found.");
    }

    // Check duplicate ISBN if ISBN was modified
    if (updatedFields.isbn && updatedFields.isbn.trim() !== existing.isbn) {
      const cleanNew = updatedFields.isbn.trim().replace(/[-\s]/g, "");
      const allBooks = await this.getAllBooks();
      const duplicate = allBooks.find(b => b.id !== bookId && b.isbn.replace(/[-\s]/g, "") === cleanNew);
      if (duplicate) {
        throw new Error(`Another book with ISBN '${updatedFields.isbn}' already exists.`);
      }
    }

    // Adjust availability safely if total quantity was modified
    if (updatedFields.quantity !== undefined) {
      const newTotal = parseInt(updatedFields.quantity, 10);
      const currentlyBorrowed = (existing.quantity || 0) - (existing.available || 0);
      if (newTotal < currentlyBorrowed) {
        throw new Error(`Cannot reduce total copies to ${newTotal}. Currently ${currentlyBorrowed} copies are actively on loan.`);
      }
      updatedFields.quantity = newTotal;
      updatedFields.available = newTotal - currentlyBorrowed;
    }

    if (isRealFirebaseActive && db) {
      try {
        const docRef = doc(db, "books", bookId);
        await updateDoc(docRef, updatedFields);
      } catch (err) {
        console.warn("Firestore updateDoc failed, fallback to local store:", err);
      }
    }

    const result = LocalStore.update("books", bookId, updatedFields);
    return result;
  },

  /**
   * Delete a book
   */
  async deleteBook(bookId) {
    const existing = await this.getBookById(bookId);
    if (!existing) {
      throw new Error("Book does not exist.");
    }

    // Check if copies are currently borrowed
    const borrowings = LocalStore.getAll("borrowings");
    const activeBorrows = borrowings.filter(b => b.bookId === bookId && b.status === "issued");
    if (activeBorrows.length > 0) {
      throw new Error(`Cannot delete book: ${activeBorrows.length} copies are currently borrowed by students.`);
    }

    if (isRealFirebaseActive && db) {
      try {
        await deleteDoc(doc(db, "books", bookId));
      } catch (err) {
        console.warn("Firestore deleteDoc failed:", err);
      }
    }

    LocalStore.delete("books", bookId);
    return true;
  },

  /**
   * Search, filter, and sort books dynamically
   */
  filterBooks(books, { query = "", category = "All", availability = "all", sortBy = "title_asc" }) {
    let results = [...books];

    // Text Search (title, author, ISBN, category)
    if (query && query.trim() !== "") {
      const q = query.trim().toLowerCase();
      results = results.filter(book => {
        const titleMatch = (book.title || "").toLowerCase().includes(q);
        const authorMatch = (book.author || "").toLowerCase().includes(q);
        const isbnMatch = (book.isbn || "").toLowerCase().includes(q);
        const catMatch = (book.category || "").toLowerCase().includes(q);
        const descMatch = (book.description || "").toLowerCase().includes(q);
        return titleMatch || authorMatch || isbnMatch || catMatch || descMatch;
      });
    }

    // Category Filter
    if (category && category !== "All") {
      results = results.filter(b => (b.category || "").toLowerCase() === category.toLowerCase());
    }

    // Availability Filter
    if (availability === "available") {
      results = results.filter(b => (b.available || 0) > 0);
    } else if (availability === "unavailable") {
      results = results.filter(b => (b.available || 0) <= 0);
    }

    // Sorting
    results.sort((a, b) => {
      if (sortBy === "title_asc") {
        return (a.title || "").localeCompare(b.title || "");
      }
      if (sortBy === "title_desc") {
        return (b.title || "").localeCompare(a.title || "");
      }
      if (sortBy === "popularity") {
        return (b.borrowCount || 0) - (a.borrowCount || 0);
      }
      if (sortBy === "newest") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "available") {
        return (b.available || 0) - (a.available || 0);
      }
      return 0;
    });

    return results;
  },

  /**
   * Extract unique categories from catalog
   */
  getCategories(books) {
    const cats = new Set();
    books.forEach(b => {
      if (b.category) cats.add(b.category);
    });
    return Array.from(cats).sort();
  }
};
