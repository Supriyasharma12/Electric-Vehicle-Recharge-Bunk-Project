// // src/booking.js
// import { auth, db } from "./firebase.js";
// import {
//   collection,
//   query,
//   where,
//   getDocs,
//   deleteDoc,
//   doc
// } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
// import {
//   onAuthStateChanged,
//   signOut
// } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
// import {
//   doc,
//   getDoc,
//   addDoc,
//   collection,
//   serverTimestamp,
// } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";



// const bookingList = document.getElementById("bookingList");
// const logoutBtn = document.getElementById("logoutBtn");
// const loginLink = document.getElementById("loginLink");

// // ------------------- Check Auth -------------------
// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     loginLink.classList.add("hidden");
//     logoutBtn.classList.remove("hidden");
//     loadBookings(user.uid);
//   } else {
//     loginLink.classList.remove("hidden");
//     logoutBtn.classList.add("hidden");
//     bookingList.innerHTML = "<p>Please login to view your bookings.</p>";
//   }
// });

// // ------------------- Load Bookings -------------------
// async function loadBookings(userId) {
//   bookingList.innerHTML = "<p>Loading your bookings...</p>";

//   try {
//     const q = query(collection(db, "bookings"), where("userId", "==", userId));
//     const snapshot = await getDocs(q);

//     if (snapshot.empty) {
//       bookingList.innerHTML = "<p>No bookings found.</p>";
//       return;
//     }

//     bookingList.innerHTML = "";

//     snapshot.forEach((docSnap) => {
//       const booking = docSnap.data();

//       const card = document.createElement("div");
//       card.className = "booking-card";

//       card.innerHTML = `
//         <h3>${booking.stationName}</h3>
//         <p><strong>Address:</strong> ${booking.stationAddress}</p>
//         <p><strong>Slot:</strong> ${booking.slotNumber || "N/A"}</p>
//         <p><strong>Date:</strong> ${booking.date || "N/A"}</p>
//         <button class="cancel-btn" data-id="${docSnap.id}">Cancel</button>
//       `;

//       bookingList.appendChild(card);
//     });

//     // attach cancel handlers
//     document.querySelectorAll(".cancel-btn").forEach((btn) => {
//       btn.addEventListener("click", async (e) => {
//         const bookingId = e.target.dataset.id;
//         if (confirm("Cancel this booking?")) {
//           await deleteDoc(doc(db, "bookings", bookingId));
//           loadBookings(userId); // refresh list
//         }
//       });
//     });
//   } catch (error) {
//     console.error("Error loading bookings:", error);
//     bookingList.innerHTML = "<p>Error loading bookings.</p>";
//   }
// }

// // ------------------- Logout -------------------
// logoutBtn.addEventListener("click", async () => {
//   await signOut(auth);
//   window.location.href = "index.html";
// });

import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,query,
  where,
  getDocs,
  deleteDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


// -------- helpers --------
function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setToday(el) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  el.value = `${yyyy}-${mm}-${dd}`;
  el.min = `${yyyy}-${mm}-${dd}`; // prevent past date selection
}

// -------- DOM --------
const stationInfo = document.getElementById("stationInfo");
const bookingForm = document.getElementById("bookingForm");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const connectorSelect = document.getElementById("connectorSelect");
const vehicleInput = document.getElementById("vehicleInput");
const statusEl = document.getElementById("status");
const myBookingsEl = document.getElementById("myBookings");
const logoutBtn = document.getElementById("logoutBtn");
const loginLink = document.getElementById("loginLink");


// init defaults
setToday(dateInput);

// -------- load station --------
const bunkId = getParam("bunkId");

async function loadStation() {
  if (!bunkId) {
    stationInfo.textContent = "No station selected.";
    bookingForm.style.display = "none";
    return;
  }

  try {
    const ref = doc(db, "bunks", bunkId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      stationInfo.textContent = "Station not found.";
      bookingForm.style.display = "none";
      return;
    }

    const b = snap.data();
    stationInfo.innerHTML = `
      <div><strong>${b.name || "Unnamed station"}</strong></div>
      <div>${b.address || ""}</div>
      ${b.type ? `<div>Type: ${b.type}</div>` : ""}
      ${typeof b.slots !== "undefined" ? `<div>Slots: ${b.slots}</div>` : ""}
      ${b.openHours ? `<div>Hours: ${b.openHours}</div>` : ""}
    `;
  } catch (err) {
    console.error(err);
    stationInfo.textContent = "Failed to load station.";
  }
}
loadStation();

// -------- auth check --------
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    bookingForm.style.display = "block";
    statusEl.textContent = "";
     loginLink.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    loadMyBookings(user.uid);
  } else {
    currentUser = null;
    bookingForm.style.display = "none";
    statusEl.style.color = "#ff9b9b";
    statusEl.textContent = "Please log in to book a slot.";
    loginLink.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    myBookingsEl.innerHTML = "<p>Please log in to view bookings.</p>";
  }
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
  }
});

// -------- submit booking --------
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";
statusEl.style.color = ""; // reset color

  const date = dateInput.value;
  const time = timeInput.value;
  const connector = connectorSelect.value;
  const vehicle = vehicleInput.value.trim();

  if (!bunkId) return (statusEl.textContent = "No station selected.");
  if (!date || !time || !connector || !vehicle) {
    statusEl.textContent = "Please fill all fields.";
    return;
  }
 
  // simple validation: prevent past datetime
  const chosen = new Date(`${date}T${time}`);
  if (isNaN(chosen.getTime())) {
    statusEl.textContent = "Invalid date/time.";
    return;
  }
  if (chosen < new Date()) {
    statusEl.textContent = "Cannot book in the past.";
    return;
  }
  

  try {
    const user = auth.currentUser || null;
    // create booking
    await addDoc(collection(db, "bookings"), {
      bunkId,
      date,          // string "YYYY-MM-DD"
      startTime: time, // string "HH:MM"
      connectorType: connector,
      vehicleNumber: vehicle,
      userId: user ? user.uid : null,
      userEmail: user ? user.email : null,
      status: "pending",      // you can update later to "confirmed"
      createdAt: serverTimestamp(),
    });

    statusEl.style.color = "#9ad69a";
    statusEl.textContent = "Booking created! You can close this page.";
    bookingForm.reset();
    setToday(dateInput);
  } catch (err) {
    console.error(err);
    statusEl.style.color = "#ff9b9b";
    statusEl.textContent = "Could not create booking. Try again.";
  }
});

// load user's bookings
async function loadMyBookings(userId) {
  myBookingsEl.innerHTML = "<p>Loading your bookings...</p>";
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      myBookingsEl.innerHTML = "<p>No bookings found.</p>";
      return;
    }
    myBookingsEl.innerHTML = "";
    snapshot.forEach(docSnap => {
      const b = docSnap.data();
      const card = document.createElement("div");
      card.className = "booking-card";
      card.innerHTML = `
        <h3>Station: ${b.bunkId || "N/A"}</h3>
        <p><strong>Date:</strong> ${b.date || "N/A"}</p>
        <p><strong>Start:</strong> ${b.startTime || "N/A"}</p>
        <p><strong>Connector:</strong> ${b.connectorType || "-"}</p>
        <p><strong>Vehicle:</strong> ${b.vehicleNumber || "-"}</p>
        <button class="cancel-btn" data-id="${docSnap.id}">Cancel</button>
      `;
      myBookingsEl.appendChild(card);
    });

    myBookingsEl.querySelectorAll(".cancel-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Cancel this booking?")) return;
        try {
          await deleteDoc(doc(db, "bookings", id));
          loadMyBookings(userId);
        } catch (err) {
          console.error(err);
          alert("Could not cancel booking.");
        }
      });
    });
  } catch (err) {
    console.error("Error loading bookings:", err);
    myBookingsEl.innerHTML = "<p>Error loading bookings.</p>";
  }
}

// bookingForm.addEventListener("submit", async (e) => {
//   e.preventDefault();
//   statusEl.textContent = "";

//   const date = dateInput.value;           // "YYYY-MM-DD"
//   const time = timeInput.value;           // "HH:MM"
//   const connector = connectorSelect.value;
//   const vehicle = vehicleInput.value.trim();

//   if (!bunkId) return (statusEl.textContent = "No station selected.");
//   if (!date || !time || !connector || !vehicle) {
//     statusEl.textContent = "Please fill all fields.";
//     return;
//   }

//   const user = auth.currentUser;
//   if (!user) return; // guarded by onAuthStateChanged already

//   statusEl.textContent = "Checking availability...";

//   try {
//     await runTransaction(db, async (tx) => {
//       const resId = `${date}_${time}_${connector}`;
//       const resRef = doc(db, `bunks/${bunkId}/reservations/${resId}`);
//       const resSnap = await tx.get(resRef);
//       if (resSnap.exists()) {
//         throw new Error("This slot is already booked. Please choose another time.");
//       }

//       // 1) create reservation (guarantees uniqueness)
//       tx.set(resRef, {
//         bunkId, date, startTime: time, connectorType: connector,
//         userId: user.uid, createdAt: serverTimestamp(),
//       });

//       // 2) create booking doc (for user's history)
//       const bookingRef = doc(collection(db, "bookings"));
//       tx.set(bookingRef, {
//         bookingId: bookingRef.id,
//         bunkId, date, startTime: time, connectorType: connector,
//         vehicleNumber: vehicle,
//         userId: user.uid, userEmail: user.email || null,
//         status: "confirmed",
//         createdAt: serverTimestamp(),
//       });
//     });

//     statusEl.style.color = "#9ad69a";
//     statusEl.textContent = "Booking confirmed!";
//     bookingForm.reset();
//     setToday(dateInput);
//   } catch (err) {
//     statusEl.style.color = "#ff9b9b";
//     statusEl.textContent = err.message || "Could not create booking.";
//   }
// });

// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {

//     function signedIn() {
//       return request.auth != null;
//     }

//     // Everyone can read bunks, only admins can write (you can model admins in /users or custom claims)
//     match /bunks/{bunkId} {
//       allow read: if true;
//       allow create, update, delete: if signedIn() && exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
//                                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin";
//       // reservations checked by unique doc + transaction; allow create only if it doesn't exist
//       match /reservations/{resId} {
//         allow read: if true;
//         allow create: if signedIn() && !exists(/databases/$(database)/documents/bunks/$(bunkId)/reservations/$(resId));
//         allow delete: if signedIn(); // refine to owner/admin later
//       }
//     }

//     // Users can read their own bookings; admins can read all
//     match /bookings/{bookingId} {
//       allow read: if signedIn() && (
//         resource.data.userId == request.auth.uid ||
//         (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
//          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "admin")
//       );
//       allow create: if signedIn() && request.resource.data.userId == request.auth.uid;
//       allow update, delete: if signedIn() && resource.data.userId == request.auth.uid;
//     }

//     match /users/{uid} {
//       allow read: if signedIn() && request.auth.uid == uid;
//       allow create: if signedIn() && request.auth.uid == uid;
//       allow update: if signedIn() && request.auth.uid == uid;
//     }
//   }
// }
