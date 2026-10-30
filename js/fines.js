/* ==========================================================================
   FINE MANAGEMENT SERVICE (fines.js)
   Automatic Overdue Calculations, Status Tracking, Receipts & History
   ========================================================================== */

import { 
  db, 
  isRealFirebaseActive, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_FINES } from "./seed-data.js";

const FINE_RATE_PER_DAY = 1.00; // $1.00 per day overdue

// Ensure initial fines exist
(function ensureInitialFines() {
  const existing = LocalStore.getAll("fines");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("fines", INITIAL_FINES);
  }
})();

export const FineService = {
  getDailyFineRate() {
    return FINE_RATE_PER_DAY;
  },

  /**
   * Calculate overdue days and fine amount
   */
  calculateFine(dueDateStr, returnDateStr = null) {
    const due = new Date(dueDateStr);
    const returnDate = returnDateStr ? new Date(returnDateStr) : new Date();
    
    // Difference in milliseconds
    const diffMs = returnDate.getTime() - due.getTime();
    if (diffMs <= 0) {
      return { daysOverdue: 0, amount: 0, isOverdue: false };
    }

    const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const amount = Number((daysOverdue * FINE_RATE_PER_DAY).toFixed(2));

    return {
      daysOverdue,
      amount,
      isOverdue: true
    };
  },

  /**
   * Get all fine records (for Admin)
   */
  async getAllFines() {
    if (isRealFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "fines"));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) return list;
      } catch (err) {
        console.warn("Firestore getAllFines error:", err);
      }
    }
    return LocalStore.getAll("fines");
  },

  /**
   * Get fines for a specific student
   */
  async getStudentFines(userId) {
    const all = await this.getAllFines();
    return all.filter(f => f.userId === userId);
  },

  /**
   * Calculate total unpaid fines for a student
   */
  async getStudentUnpaidBalance(userId) {
    const fines = await this.getStudentFines(userId);
    const unpaid = fines.filter(f => f.status === "unpaid");
    return unpaid.reduce((sum, f) => sum + (parseFloat(f.amount) || 0), 0);
  },

  /**
   * Record a new fine
   */
  async createFineRecord({ userId, borrowingId, bookTitle, amount, daysOverdue }) {
    // Check if fine for this borrowing already exists
    const allFines = await this.getAllFines();
    const existing = allFines.find(f => f.borrowingId === borrowingId);
    if (existing) {
      return existing;
    }

    const fineObj = {
      userId,
      borrowingId,
      bookTitle,
      amount: parseFloat(amount),
      daysOverdue: parseInt(daysOverdue, 10),
      status: "unpaid", // 'unpaid', 'paid', 'waived'
      createdAt: new Date().toISOString()
    };

    if (isRealFirebaseActive && db) {
      try {
        const ref = await addDoc(collection(db, "fines"), fineObj);
        fineObj.id = ref.id;
      } catch (err) {
        fineObj.id = "fine_" + Date.now();
      }
    } else {
      fineObj.id = "fine_" + Date.now();
    }

    LocalStore.set("fines", fineObj.id, fineObj);
    return fineObj;
  },

  /**
   * Mark fine as paid
   */
  async markFinePaid(fineId, paymentMethod = "Online Payment") {
    const update = {
      status: "paid",
      paymentMethod,
      paidAt: new Date().toISOString()
    };

    if (isRealFirebaseActive && db) {
      try {
        await updateDoc(doc(db, "fines", fineId), update);
      } catch (err) {
        console.warn("Firestore markFinePaid error:", err);
      }
    }

    return LocalStore.update("fines", fineId, update);
  },

  /**
   * Admin Waive fine
   */
  async waiveFine(fineId, reason = "Administrative waiver") {
    const update = {
      status: "waived",
      waivedReason: reason,
      waivedAt: new Date().toISOString()
    };

    if (isRealFirebaseActive && db) {
      try {
        await updateDoc(doc(db, "fines", fineId), update);
      } catch (err) {
        console.warn("Firestore waiveFine error:", err);
      }
    }

    return LocalStore.update("fines", fineId, update);
  }
};
