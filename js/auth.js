/* ==========================================================================
   AUTHENTICATION & USER PROFILE SERVICE (auth.js)
   Firebase Auth + Firestore Users Collection + Role-Based Access Control
   ========================================================================== */

import { 
  auth, 
  db, 
  isRealFirebaseActive,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged,
  doc, 
  setDoc, 
  getDoc,
  LocalStore 
} from "./firebase-config.js";
import { INITIAL_USERS } from "./seed-data.js";

const CURRENT_USER_KEY = "smart_library_current_user";

// Seed initial users into LocalStore if empty
(function ensureInitialUsers() {
  const existing = LocalStore.getAll("users");
  if (!existing || existing.length === 0) {
    LocalStore.saveCollection("users", INITIAL_USERS);
  }
})();

export const AuthService = {
  /**
   * Register a new user (Student or Admin)
   */
  async register({ name, email, password, role = "student", studentId = "", department = "" }) {
    email = email.trim().toLowerCase();
    
    // Check if user already exists
    const existing = LocalStore.getAll("users").find(u => u.email === email);
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    let uid = "user_" + Date.now();
    let authUser = null;

    if (isRealFirebaseActive && auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        authUser = cred.user;
        uid = authUser.uid;
      } catch (err) {
        console.warn("Firebase Auth registration failed, fallback to local store:", err.message);
      }
    }

    const initials = name
      .split(" ")
      .map(part => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "U";

    const userProfile = {
      uid,
      name,
      email,
      role: role.toLowerCase(), // 'student' or 'admin'
      studentId: studentId || (role === "student" ? `STU-${Date.now().toString().slice(-4)}` : ""),
      department: department || (role === "student" ? "General Studies" : "Library Administration"),
      avatar: initials,
      createdAt: new Date().toISOString()
    };

    // Save to Firestore if connected
    if (isRealFirebaseActive && db) {
      try {
        await setDoc(doc(db, "users", uid), userProfile);
      } catch (err) {
        console.warn("Firestore setDoc failed:", err);
      }
    }

    // Save to LocalStore
    LocalStore.set("users", uid, userProfile);
    this.setCurrentUser(userProfile);
    return userProfile;
  },

  /**
   * Sign In with Email and Password
   */
  async login(email, password) {
    email = email.trim().toLowerCase();

    // Check LocalStore first or demo credentials
    const localUser = LocalStore.getAll("users").find(u => u.email === email);

    if (isRealFirebaseActive && auth) {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;
        
        let profile = null;
        if (db) {
          const docSnap = await getDoc(doc(db, "users", uid));
          if (docSnap.exists()) {
            profile = { uid, ...docSnap.data() };
          }
        }
        
        if (!profile && localUser) {
          profile = localUser;
        } else if (!profile) {
          profile = {
            uid,
            name: cred.user.displayName || email.split("@")[0],
            email,
            role: "student",
            createdAt: new Date().toISOString()
          };
        }

        this.setCurrentUser(profile);
        return profile;
      } catch (err) {
        // If Firebase auth failed but credentials match a local seed user
        if (localUser) {
          this.setCurrentUser(localUser);
          return localUser;
        }
        throw new Error(err.message || "Invalid email or password.");
      }
    } else {
      // In Demo / Local Mode
      if (!localUser) {
        throw new Error("No account found with this email. Please check your credentials or register.");
      }
      this.setCurrentUser(localUser);
      return localUser;
    }
  },

  /**
   * Log out current user
   */
  async logout() {
    if (isRealFirebaseActive && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn("Firebase signout error:", e);
      }
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    const currentPath = window.location.pathname.toLowerCase();
    window.location.href = currentPath.includes("/pages/") ? "login.html" : "pages/login.html";
  },

  /**
   * Get currently authenticated user profile
   */
  getCurrentUser() {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Set current user session
   */
  setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent("auth_state_changed", { detail: user }));
  },

  /**
   * Listen for Auth state changes
   */
  onAuthStateChange(callback) {
    if (isRealFirebaseActive && auth) {
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          let profile = this.getCurrentUser();
          if (!profile || profile.uid !== fbUser.uid) {
            profile = LocalStore.getById("users", fbUser.uid) || {
              uid: fbUser.uid,
              name: fbUser.displayName || fbUser.email.split("@")[0],
              email: fbUser.email,
              role: "student"
            };
            this.setCurrentUser(profile);
          }
          callback(profile);
        } else {
          callback(null);
        }
      });
    }

    window.addEventListener("auth_state_changed", (e) => {
      callback(e.detail);
    });

    // Initial check
    callback(this.getCurrentUser());
  },

  /**
   * Route Guard: Protects admin or student pages
   */
  requireAuth(requiredRole = null) {
    const user = this.getCurrentUser();
    const currentPath = window.location.pathname.toLowerCase();

    if (!user) {
      // Redirect to login if unauthenticated
      window.location.href = currentPath.includes("/pages/") 
        ? "login.html?redirect=" + encodeURIComponent(window.location.pathname)
        : "pages/login.html";
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      // Role mismatch: redirect to their authorized dashboard
      alert(`Access Restricted: This portal is for ${requiredRole.toUpperCase()}s only.`);
      if (user.role === "admin") {
        window.location.href = currentPath.includes("/pages/") ? "admin-dashboard.html" : "pages/admin-dashboard.html";
      } else {
        window.location.href = currentPath.includes("/pages/") ? "student-dashboard.html" : "pages/student-dashboard.html";
      }
      return null;
    }

    return user;
  },

  /**
   * Get all registered users (for Admin Directory)
   */
  async getAllUsers() {
    if (isRealFirebaseActive && db) {
      try {
        const { getDocs, collection } = await import("./firebase-config.js");
        const snap = await getDocs(collection(db, "users"));
        const list = [];
        snap.forEach(d => list.push({ uid: d.id, ...d.data() }));
        if (list.length > 0) return list;
      } catch (err) {
        console.warn("Firestore getAllUsers error:", err);
      }
    }
    return LocalStore.getAll("users");
  }
};
