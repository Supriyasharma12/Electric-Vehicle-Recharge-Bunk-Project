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
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";


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
}

// -------- DOM --------
const stationInfo = document.getElementById("stationInfo");
const bookingForm = document.getElementById("bookingForm");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const connectorSelect = document.getElementById("connectorSelect");
const vehicleInput = document.getElementById("vehicleInput");
const statusEl = document.getElementById("status");

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
  } else {
    currentUser = null;
    bookingForm.style.display = "none";
    statusEl.style.color = "#ff9b9b";
    statusEl.textContent = "Please log in to book a slot.";
    setTimeout(() => {
      window.location.href = "login.html"; // redirect to login page
    }, 1500);
  }
});

// -------- submit booking --------
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  statusEl.textContent = "";

  const date = dateInput.value;
  const time = timeInput.value;
  const connector = connectorSelect.value;
  const vehicle = vehicleInput.value.trim();

  if (!bunkId) return (statusEl.textContent = "No station selected.");
  if (!date || !time || !connector || !vehicle) {
    statusEl.textContent = "Please fill all fields.";
    return;
  }

  const user = auth.currentUser || null;

  try {
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

