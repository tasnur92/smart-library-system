/* ==========================================================================
   FIREBASE CONFIGURATION & UNIFIED DATA ADAPTER
   Supports Real Firebase Cloud Firestore + Auth, with Zero-Crash Fallback
   ========================================================================== */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  onSnapshot, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Default or User-Provided Firebase Configuration
// Replace these with your Firebase project keys from Firebase Console -> Project Settings
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyForSmartLibrarySystem2026",
  authDomain: "smart-library-ai.firebaseapp.com",
  projectId: "smart-library-ai",
  storageBucket: "smart-library-ai.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Retrieve any custom config saved in LocalStorage
function getActiveFirebaseConfig() {
  const custom = localStorage.getItem('smart_library_custom_firebase_config');
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {
      console.warn("Failed to parse custom Firebase config, using default", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveCustomFirebaseConfig(configObj) {
  localStorage.setItem('smart_library_custom_firebase_config', JSON.stringify(configObj));
  window.location.reload();
}

export function resetFirebaseConfig() {
  localStorage.removeItem('smart_library_custom_firebase_config');
  window.location.reload();
}

// State tracking
let appInstance = null;
let authInstance = null;
let dbInstance = null;
let isRealFirebaseActive = false;

// Initialize Firebase
const activeConfig = getActiveFirebaseConfig();
const isPlaceholderKey = !activeConfig.apiKey || activeConfig.apiKey.includes("Dummy") || activeConfig.apiKey.includes("YOUR_");

try {
  if (!isPlaceholderKey) {
    appInstance = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    isRealFirebaseActive = true;
    console.log("Firebase initialized with live credentials for project:", activeConfig.projectId);
  } else {
    console.log("Smart Library: Running in Local Fallback Engine Mode (No live Firebase config provided). Real-time simulation active.");
  }
} catch (err) {
  console.warn("Firebase initialization skipped/failed. Activating seamless local storage fallback adapter.", err);
  isRealFirebaseActive = false;
}

export { 
  appInstance as app, 
  authInstance as auth, 
  dbInstance as db, 
  isRealFirebaseActive,
  getActiveFirebaseConfig,
  // Export Firestore methods for direct access
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  onSnapshot, 
  serverTimestamp,
  // Export Auth methods
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  updateProfile
};

/* ==========================================================================
   UNIFIED LOCAL FALLBACK DATA STORE
   Replicates Firestore Collections & Queries when Firebase Keys are not set
   ========================================================================== */

const STORAGE_PREFIX = "smart_library_db_";

export const LocalStore = {
  getCollection(collName) {
    const raw = localStorage.getItem(STORAGE_PREFIX + collName);
    return raw ? JSON.parse(raw) : [];
  },

  saveCollection(collName, data) {
    localStorage.setItem(STORAGE_PREFIX + collName, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(`store_updated_${collName}`, { detail: data }));
  },

  getAll(collName) {
    return this.getCollection(collName);
  },

  getById(collName, id) {
    const items = this.getCollection(collName);
    return items.find(item => item.id === id || item.uid === id) || null;
  },

  add(collName, item) {
    const items = this.getCollection(collName);
    const id = item.id || 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newItem = { ...item, id, createdAt: item.createdAt || new Date().toISOString() };
    items.unshift(newItem);
    this.saveCollection(collName, items);
    return newItem;
  },

  set(collName, id, item) {
    const items = this.getCollection(collName);
    const index = items.findIndex(i => i.id === id || i.uid === id);
    const updated = { ...item, id, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      items[index] = { ...items[index], ...updated };
    } else {
      items.push(updated);
    }
    this.saveCollection(collName, items);
    return updated;
  },

  update(collName, id, partial) {
    const items = this.getCollection(collName);
    const index = items.findIndex(i => i.id === id || i.uid === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...partial, updatedAt: new Date().toISOString() };
      this.saveCollection(collName, items);
      return items[index];
    }
    throw new Error(`Item ${id} not found in ${collName}`);
  },

  delete(collName, id) {
    let items = this.getCollection(collName);
    items = items.filter(i => i.id !== id && i.uid !== id);
    this.saveCollection(collName, items);
    return true;
  },

  query(collName, filters = []) {
    let items = this.getCollection(collName);
    for (const filter of filters) {
      const { field, op, value } = filter;
      items = items.filter(item => {
        if (op === '==') return item[field] === value;
        if (op === '!=') return item[field] !== value;
        if (op === '>') return item[field] > value;
        if (op === '>=') return item[field] >= value;
        if (op === '<') return item[field] < value;
        if (op === '<=') return item[field] <= value;
        if (op === 'in') return Array.isArray(value) && value.includes(item[field]);
        return true;
      });
    }
    return items;
  }
};
