/* ==========================================================================
   BORROWING & RETURN SERVICE (borrowings.js)
   Atomic Transactions, Inventory Decrement/Increment, Overdue & History
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
  runTransaction, 
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_BORROWINGS } from "./seed-data.js";
import { FineService } from "./fines.js";
import { ReservationService } from "./reservations.js";
import { NotificationService } from "./notifications.js";

const DEFAULT_LOAN_DAYS = 14; // Standard 2-week borrowing window

// Ensure initial borrowings exist
(function ensureInitialBorrowings() {
  const existing = LocalStore.getAll("borrowings");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("borrowings", INITIAL_BORROWINGS);
  }
})();

export const BorrowingService = {
  getDefaultLoanDays() {
    return DEFAULT_LOAN_DAYS;
  },

  /**
   * Get all borrowings across the entire library (for Admin)
   */
  async getAllBorrowings() {
    if (isRealFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "borrowings"));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) return list;
      } catch (err) {
        console.warn("Firestore getAllBorrowings error:", err);
      }
    }
    return LocalStore.getAll("borrowings");
  },

  /**
   * Get borrowings for a specific student
   */
  async getStudentBorrowings(userId) {
    const all = await this.getAllBorrowings();
    return all.filter(b => b.userId === userId);
  },

  /**
   * Issue a book to a student
   * Uses atomic decrement on book.available and increments book.borrowCount
   */
  async issueBook({ userId, userEmail, userName, bookId }) {
    // 1. Check if student already has this exact book currently issued
    const studentBorrows = await this.getStudentBorrowings(userId);
    const alreadyIssued = studentBorrows.find(b => b.bookId === bookId && b.status === "issued");
    if (alreadyIssued) {
      throw new Error("You currently have an active loan for this book. Please return your current copy first.");
    }

    // 2. Check student's outstanding unpaid fines
    const unpaidFineTotal = await FineService.getStudentUnpaidBalance(userId);
    if (unpaidFineTotal > 15.00) {
      throw new Error(`Borrowing blocked: You have $${unpaidFineTotal.toFixed(2)} in unpaid fines. Please clear your overdue balance before borrowing new titles.`);
    }

    let issuedBookRecord = null;
    const now = new Date();
    const dueDate = new Date(now.getTime() + DEFAULT_LOAN_DAYS * 24 * 60 * 60 * 1000);

    // If Real Firebase is active, execute Firestore atomic transaction
    if (isRealFirebaseActive && db) {
      try {
        const bookDocRef = doc(db, "books", bookId);
        await runTransaction(db, async (transaction) => {
          const bSnap = await transaction.get(bookDocRef);
          if (!bSnap.exists()) {
            throw new Error("Book not found in database.");
          }
          const bData = bSnap.data();
          if ((bData.available || 0) <= 0) {
            throw new Error("Sorry, no copies of this book are currently available to issue.");
          }

          // Decrement available, increment borrowCount
          transaction.update(bookDocRef, {
            available: (bData.available || 0) - 1,
            borrowCount: (bData.borrowCount || 0) + 1
          });

          // Create borrowing document
          const borrowRef = doc(collection(db, "borrowings"));
          const borrowData = {
            id: borrowRef.id,
            userId,
            userEmail,
            userName: userName || userEmail.split("@")[0],
            bookId,
            bookTitle: bData.title,
            bookIsbn: bData.isbn,
            issueDate: now.toISOString(),
            dueDate: dueDate.toISOString(),
            returnDate: null,
            status: "issued"
          };
          transaction.set(borrowRef, borrowData);
          issuedBookRecord = borrowData;
        });
      } catch (err) {
        console.warn("Firestore transaction failed, falling back to local store transaction:", err);
      }
    }

    // LocalStore transaction (guarantees consistency)
    if (!issuedBookRecord) {
      const book = LocalStore.getById("books", bookId);
      if (!book) {
        throw new Error("Book not found.");
      }
      if ((book.available || 0) <= 0) {
        throw new Error("Sorry, no copies of this book are currently available.");
      }

      // Decrement available count
      LocalStore.update("books", bookId, {
        available: book.available - 1,
        borrowCount: (book.borrowCount || 0) + 1
      });

      const borrowId = "borrow_" + Date.now();
      issuedBookRecord = {
        id: borrowId,
        userId,
        userEmail,
        userName: userName || userEmail.split("@")[0],
        bookId,
        bookTitle: book.title,
        bookIsbn: book.isbn,
        issueDate: now.toISOString(),
        dueDate: dueDate.toISOString(),
        returnDate: null,
        status: "issued"
      };

      LocalStore.set("borrowings", borrowId, issuedBookRecord);
    } else {
      // Mirror to local store
      LocalStore.set("borrowings", issuedBookRecord.id, issuedBookRecord);
      const b = LocalStore.getById("books", bookId);
      if (b) {
        LocalStore.update("books", bookId, {
          available: Math.max(0, (b.available || 1) - 1),
          borrowCount: (b.borrowCount || 0) + 1
        });
      }
    }

    // If user had a reservation for this book, mark it fulfilled
    const reservations = await ReservationService.getStudentReservations(userId);
    const matchedRes = reservations.find(r => r.bookId === bookId && (r.status === "active" || r.status === "available_ready"));
    if (matchedRes) {
      await ReservationService.fulfillReservation(matchedRes.id);
    }

    // Send confirmation notification
    await NotificationService.sendNotification({
      userId,
      title: "Book Issued Successfully",
      message: `You borrowed '${issuedBookRecord.bookTitle}'. Due date: ${new Date(issuedBookRecord.dueDate).toLocaleDateString()}.`,
      type: "success"
    });

    return issuedBookRecord;
  },

  /**
   * Return a borrowed book
   * Atomically increments available copies, checks overdue fines, and notifies waiting reservations
   */
  async returnBook(borrowingId) {
    const borrow = LocalStore.getById("borrowings", borrowingId);
    if (!borrow) {
      throw new Error("Borrowing record not found.");
    }
    if (borrow.status === "returned") {
      throw new Error("This book has already been returned.");
    }

    const returnTime = new Date().toISOString();

    // Calculate overdue fine
    const fineCalc = FineService.calculateFine(borrow.dueDate, returnTime);
    let generatedFine = null;

    if (fineCalc.isOverdue && fineCalc.amount > 0) {
      generatedFine = await FineService.createFineRecord({
        userId: borrow.userId,
        borrowingId: borrow.id,
        bookTitle: borrow.bookTitle,
        amount: fineCalc.amount,
        daysOverdue: fineCalc.daysOverdue
      });

      // Notify student about overdue fine
      await NotificationService.sendNotification({
        userId: borrow.userId,
        title: "Overdue Return Fine Recorded",
        message: `'${borrow.bookTitle}' was returned ${fineCalc.daysOverdue} days late. A fine of $${fineCalc.amount.toFixed(2)} has been incurred.`,
        type: "danger"
      });
    }

    // Firestore Transaction for return & increment
    if (isRealFirebaseActive && db) {
      try {
        const bookDocRef = doc(db, "books", borrow.bookId);
        const borrowDocRef = doc(db, "borrowings", borrowingId);
        await runTransaction(db, async (transaction) => {
          const bSnap = await transaction.get(bookDocRef);
          if (bSnap.exists()) {
            const bData = bSnap.data();
            const newAvailable = Math.min((bData.quantity || 1), (bData.available || 0) + 1);
            transaction.update(bookDocRef, { available: newAvailable });
          }
          transaction.update(borrowDocRef, {
            returnDate: returnTime,
            status: "returned"
          });
        });
      } catch (err) {
        console.warn("Firestore return transaction failed, fallback to local store:", err);
      }
    }

    // LocalStore updates
    const updatedBorrow = LocalStore.update("borrowings", borrowingId, {
      returnDate: returnTime,
      status: "returned"
    });

    const book = LocalStore.getById("books", borrow.bookId);
    if (book) {
      const newAvail = Math.min((book.quantity || 1), (book.available || 0) + 1);
      LocalStore.update("books", borrow.bookId, { available: newAvail });
    }

    // Check reservation queue and notify waiting students
    await ReservationService.checkAndNotifyWaitingStudent(borrow.bookId, borrow.bookTitle);

    // Send return receipt notification
    await NotificationService.sendNotification({
      userId: borrow.userId,
      title: "Book Returned Successfully",
      message: `Thank you for returning '${borrow.bookTitle}'.`,
      type: "info"
    });

    return {
      borrowing: updatedBorrow,
      fine: generatedFine
    };
  }
};
