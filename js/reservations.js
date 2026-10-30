/* ==========================================================================
   BOOK RESERVATION SERVICE (reservations.js)
   Waitlist Queue, Duplicate Protection & Availability Auto-Notification
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
  deleteDoc, 
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_RESERVATIONS } from "./seed-data.js";
import { NotificationService } from "./notifications.js";

// Ensure initial reservations exist
(function ensureInitialReservations() {
  const existing = LocalStore.getAll("reservations");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("reservations", INITIAL_RESERVATIONS);
  }
})();

export const ReservationService = {
  /**
   * Get all reservations (for Admin)
   */
  async getAllReservations() {
    if (isRealFirebaseActive && db) {
      try {
        const snap = await getDocs(collection(db, "reservations"));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (list.length > 0) return list;
      } catch (err) {
        console.warn("Firestore getAllReservations error:", err);
      }
    }
    return LocalStore.getAll("reservations");
  },

  /**
   * Get reservations for a student
   */
  async getStudentReservations(userId) {
    const all = await this.getAllReservations();
    return all.filter(r => r.userId === userId);
  },

  /**
   * Reserve an unavailable book
   */
  async reserveBook({ userId, userEmail, userName, bookId, bookTitle }) {
    // 1. Verify book availability is 0
    const books = LocalStore.getAll("books");
    const book = books.find(b => b.id === bookId);
    if (!book) {
      throw new Error("Book not found.");
    }
    if ((book.available || 0) > 0) {
      throw new Error("This book is currently available on the shelf. You can borrow it directly without reserving!");
    }

    // 2. Prevent duplicate active reservations
    const userReserves = await this.getStudentReservations(userId);
    const existing = userReserves.find(r => r.bookId === bookId && (r.status === "active" || r.status === "available_ready"));
    if (existing) {
      throw new Error(`You already have an active reservation for '${bookTitle}'. We will alert you when a copy becomes available.`);
    }

    const reservation = {
      userId,
      userEmail,
      userName: userName || userEmail.split("@")[0],
      bookId,
      bookTitle,
      reservationDate: new Date().toISOString(),
      status: "active" // 'active', 'available_ready', 'fulfilled', 'cancelled'
    };

    if (isRealFirebaseActive && db) {
      try {
        const ref = await addDoc(collection(db, "reservations"), reservation);
        reservation.id = ref.id;
      } catch (err) {
        reservation.id = "res_" + Date.now();
      }
    } else {
      reservation.id = "res_" + Date.now();
    }

    LocalStore.set("reservations", reservation.id, reservation);

    // Notify user of confirmation
    await NotificationService.sendNotification({
      userId,
      title: "Reservation Placed",
      message: `You reserved '${bookTitle}'. We'll hold it for you once returned.`,
      type: "info"
    });

    return reservation;
  },

  /**
   * Called when a book is returned to notify the first waiting student
   */
  async checkAndNotifyWaitingStudent(bookId, bookTitle) {
    const all = await this.getAllReservations();
    // Find oldest active reservation for this book
    const waiting = all
      .filter(r => r.bookId === bookId && r.status === "active")
      .sort((a, b) => new Date(a.reservationDate) - new Date(b.reservationDate));

    if (waiting.length > 0) {
      const target = waiting[0];
      const update = { status: "available_ready", notifiedAt: new Date().toISOString() };
      
      if (isRealFirebaseActive && db) {
        try {
          await updateDoc(doc(db, "reservations", target.id), update);
        } catch (err) {
          console.warn("Firestore update reservation status error:", err);
        }
      }

      LocalStore.update("reservations", target.id, update);

      // Send high priority notification to student
      await NotificationService.sendNotification({
        userId: target.userId,
        title: "Reserved Book Available! 📚",
        message: `Good news! A copy of '${bookTitle}' is now available in the library. Please borrow it within 48 hours.`,
        type: "success"
      });

      return target;
    }
    return null;
  },

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId) {
    const update = { status: "cancelled", cancelledAt: new Date().toISOString() };
    if (isRealFirebaseActive && db) {
      try {
        await updateDoc(doc(db, "reservations", reservationId), update);
      } catch (err) {
        console.warn("Firestore cancelReservation error:", err);
      }
    }
    return LocalStore.update("reservations", reservationId, update);
  },

  /**
   * Admin mark reservation as fulfilled
   */
  async fulfillReservation(reservationId) {
    const update = { status: "fulfilled", fulfilledAt: new Date().toISOString() };
    if (isRealFirebaseActive && db) {
      try {
        await updateDoc(doc(db, "reservations", reservationId), update);
      } catch (err) {
        console.warn("Firestore fulfillReservation error:", err);
      }
    }
    return LocalStore.update("reservations", reservationId, update);
  }
};
