/* ==========================================================================
   NOTIFICATION SYSTEM (notifications.js)
   Real-Time User Alerts, Overdue Warnings & Reservation Notifications
   ========================================================================== */

import { 
  db, 
  isRealFirebaseActive, 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_NOTIFICATIONS } from "./seed-data.js";

// Ensure initial notifications exist
(function ensureInitialNotifications() {
  const existing = LocalStore.getAll("notifications");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("notifications", INITIAL_NOTIFICATIONS);
  }
})();

export const NotificationService = {
  /**
   * Send a notification to a user
   */
  async sendNotification({ userId, title, message, type = "info" }) {
    const notif = {
      userId,
      title,
      message,
      type, // 'info', 'success', 'warning', 'danger'
      read: false,
      createdAt: new Date().toISOString()
    };

    if (isRealFirebaseActive && db) {
      try {
        const ref = await addDoc(collection(db, "notifications"), notif);
        notif.id = ref.id;
      } catch (err) {
        notif.id = "notif_" + Date.now();
      }
    } else {
      notif.id = "notif_" + Date.now();
    }

    LocalStore.set("notifications", notif.id, notif);
    window.dispatchEvent(new CustomEvent("new_notification", { detail: notif }));
    return notif;
  },

  /**
   * Get all notifications for a specific user
   */
  async getUserNotifications(userId) {
    let list = [];
    if (isRealFirebaseActive && db) {
      try {
        const q = query(collection(db, "notifications"), where("userId", "==", userId));
        const snap = await getDocs(q);
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn("Firestore getUserNotifications failed, using local store:", err);
      }
    }

    if (list.length === 0) {
      list = LocalStore.getAll("notifications").filter(n => n.userId === userId);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  },

  /**
   * Mark single notification as read
   */
  async markAsRead(notificationId) {
    if (isRealFirebaseActive && db) {
      try {
        await updateDoc(doc(db, "notifications", notificationId), { read: true });
      } catch (err) {
        console.warn("Firestore markAsRead failed:", err);
      }
    }
    return LocalStore.update("notifications", notificationId, { read: true });
  },

  /**
   * Mark all notifications for a user as read
   */
  async markAllAsRead(userId) {
    const list = await this.getUserNotifications(userId);
    for (const item of list) {
      if (!item.read) {
        await this.markAsRead(item.id);
      }
    }
    return true;
  }
};
