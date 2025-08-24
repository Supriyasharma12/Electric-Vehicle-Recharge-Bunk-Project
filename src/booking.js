import { auth, db } from "./firebase.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  deleteDoc,
  setDoc,
  updateDoc,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Get stationId from URL params
const params = new URLSearchParams(window.location.search);
const stationId = params.get("stationId");

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

// ============== AUTH CHECK ==================
// onAuthStateChanged(auth, async (user) => {
//   if (user) {
//     console.log("User logged in:", user.email);
//     loadAvailableBunks();
//   } else {
//     alert("You must log in first.");
//     window.location.href = "login.html";
//   }
// });

// // ============== LOAD BUNKS ==================
// async function loadAvailableBunks() {
//   const bunkList = document.getElementById("bunkList"); // <ul> or <div> in your HTML
//   bunkList.innerHTML = "";

//   const q = query(collection(db, "bunks"));
//   const snapshot = await getDocs(q);

//   snapshot.forEach((docSnap) => {
//     const bunk = docSnap.data();
//     const li = document.createElement("li");
//     li.innerHTML = `
//       <strong>${bunk.name}</strong><br>
//       ${bunk.address}<br>
//       <button onclick="viewSlots('${docSnap.id}')">View Slots</button>
//     `;
//     bunkList.appendChild(li);
//   });
// }

// // ============== VIEW SLOTS ==================
// window.viewSlots = async function (bunkId) {
//   const slotList = document.getElementById("slotList");
//   slotList.innerHTML = "";

//   const q = query(collection(db, "ev_bunks", bunkId, "slots"));
//   const snapshot = await getDocs(q);

//   snapshot.forEach((slotDoc) => {
//     const slot = slotDoc.data();
//     const btn = document.createElement("button");

//     btn.textContent = `${slot.startTime} - ${slot.endTime} ${
//       slot.isBooked ? "(Booked)" : "(Available)"
//     }`;

//     btn.disabled = slot.isBooked; // disable if already booked

//     btn.onclick = () => bookSlot(bunkId, slotDoc.id);

//     slotList.appendChild(btn);
//   });
// };

// // ============== BOOK SLOT ==================
// async function bookSlot(bunkId, slotId) {
//   const user = auth.currentUser;
//   if (!user) {
//     alert("Please log in first.");
//     return;
//   }

//   const slotRef = doc(db, "ev_bunks", bunkId, "slots", slotId);
//   const slotSnap = await getDoc(slotRef);

//   if (!slotSnap.exists()) {
//     alert("Slot does not exist!");
//     return;
//   }

//   const slotData = slotSnap.data();

//   if (slotData.isBooked) {
//     alert("Sorry, this slot is already booked!");
//     return;
//   }

//   // Mark slot as booked
//   await updateDoc(slotRef, {
//     isBooked: true,
//     bookedBy: user.uid
//   });

//   alert("Slot booked successfully!");
//   viewSlots(bunkId); // refresh slots
// }

// // ============== LOGOUT ==================
// document.getElementById("logoutBtn")?.addEventListener("click", async () => {
//   await signOut(auth);
//   window.location.href = "login.html";
// });





// -------- helpers --------

function setToday(el) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  el.value = `${yyyy}-${mm}-${dd}`;
  el.min = `${yyyy}-${mm}-${dd}`; // prevent past date selection
}
// init defaults
setToday(dateInput);

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}
const bunkId = getParam("bunkId");

// load station info for booking page-------
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
  currentUser=user;
  if (user) {
  //   currentUser = user;
  //   bookingForm.style.display = "block";
  //   statusEl.textContent = "";
  //    loginLink.classList.add("hidden");
  //   logoutBtn.classList.remove("hidden");
  //   loadMyBookings(user.uid);
  // } else {
  //   currentUser = null;
  //   bookingForm.style.display = "none";
  //   statusEl.style.color = "#ff9b9b";
  //   statusEl.textContent = "Please log in to book a slot.";
  //   loginLink.classList.remove("hidden");
  //   logoutBtn.classList.add("hidden");
  //   myBookingsEl.innerHTML = "<p>Please log in to view bookings.</p>";
  // show booking form and user's bookings
    if (bookingForm) bookingForm.style.display = "block";
    if (loginLink) loginLink.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    loadMyBookings(user.uid);
  } else {
    // hide booking form
    if (bookingForm) bookingForm.style.display = "none";
    if (loginLink) loginLink.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
    statusEl && (statusEl.style.color = "#ff9b9b");
    statusEl && (statusEl.textContent = "Please log in to book a slot.");
    myBookingsEl && (myBookingsEl.innerHTML = "<p>Please log in to view bookings.</p>");
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

  // const date = dateInput.value || "";
  // const time = timeInput.value|| "";
  // const connector = connectorSelect.value|| "";
  // const vehicle = vehicleInput.value.trim()|| "";
  const date = (dateInput && dateInput.value) || "";
  const time = (timeInput && timeInput.value) || "";
  const connector = (connectorSelect && connectorSelect.value) || "";
  const vehicle = (vehicleInput && vehicleInput.value.trim()) || "";


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
    statusEl && (statusEl.textContent = "Cannot book in the past.");
    return;
  }
  const user = currentUser;
  if (!user) {
    statusEl && (statusEl.textContent = "Please log in first.");
    return;
  }

  // reservation id to guarantee uniqueness for same slot/time/connector
  const resId = `${date}_${time}_${connector}_${user.uid}`.replace(/\s+/g, "_");

  try {
    statusEl && (statusEl.textContent = "Checking availability...");
    // transaction: create reservation doc, decrement bunk.slots, create booking history
    await runTransaction(db, async (tx) => {
      const bunkRef = doc(db, "bunks", bunkId);
      const bunkSnap = await tx.get(bunkRef);
      if (!bunkSnap.exists()) {
        throw new Error("Station not found (during transaction).");
      }
      const bunkData = bunkSnap.data();

      // check slot count (if present). If you use explicit slot docs instead, adapt logic.
      if (typeof bunkData.slots !== "undefined" && bunkData.slots <= 0) {
        throw new Error("No available slots left at this station.");
      }

      const resRef = doc(db, "bunks", bunkId, "reservations", resId);
      const resSnap = await tx.get(resRef);
      if (resSnap.exists()) {
        throw new Error("This time slot is already reserved. Choose another time.");
      }

      // create reservation
      tx.set(resRef, {
        bunkId,
        date,
        time,
        connector,
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // decrement slots count if present
      if (typeof bunkData.slots !== "undefined") {
        tx.update(bunkRef, {
          slots: bunkData.slots - 1
        });
      }

      // create booking history in top-level collection
      const bookingRef = doc(collection(db, "bookings"));
      tx.set(bookingRef, {
        bookingId: bookingRef.id,
        userId: user.uid,
        userEmail: user.email || null,
        bunkId,
        reservationId: resId,
        date,
        time,
        connector,
        vehicleNumber: vehicle,
        status: "confirmed",
        createdAt: serverTimestamp()
      });
    });


  // try {
  //   const user = auth.currentUser || null;
  //   // create booking
  //   await addDoc(collection(db, "bookings"), {
  //     bunkId,
  //     date,          // string "YYYY-MM-DD"
  //     startTime: time, // string "HH:MM"
  //     connectorType: connector,
  //     vehicleNumber: vehicle,
  //     userId: user ? user.uid : null,
  //     userEmail: user ? user.email : null,
  //     status: "pending",      // you can update later to "confirmed"
  //     createdAt: serverTimestamp(),
  //   });



//     statusEl.style.color = "#9ad69a";
//     statusEl.textContent = "Booking created! You can close this page.";
//     bookingForm.reset();
//     setToday(dateInput);
//   } catch (err) {
//     console.error(err);
//     statusEl.style.color = "#ff9b9b";
//     statusEl.textContent = "Could not create booking. Try again.";
//   }
// });

 statusEl && (statusEl.style.color = "#9ad69a");
    statusEl && (statusEl.textContent = "Booking confirmed!");
    bookingForm.reset();
    setToday(dateInput);
    // refresh UI
    loadStation();
    loadMyBookings(user.uid);
  } catch (err) {
    console.error("booking transaction:", err);
    statusEl && (statusEl.style.color = "#ff9b9b");
    statusEl && (statusEl.textContent = (err && err.message) || "Could not create booking.");
  }
});

// load user's bookings
async function loadMyBookings(userId) {
   if (!myBookingsEl) return;
  myBookingsEl.innerHTML = "<p>Loading your bookings...</p>";
  try {
    const q = query(collection(db, "bookings"), where("userId", "==", userId), orderBy("createdAt", "desc"));
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
        <p><strong>Start:</strong> ${b.time || "N/A"}</p>
        <p><strong>Connector:</strong> ${b.connector || "-"}</p>
        <p><strong>Vehicle:</strong> ${b.vehicleNumber || "-"}</p>
        <p><strong>Status:</strong> ${b.status || "N/A"}</p>
        <button class="cancel-btn" data-id="${docSnap.id}">Cancel</button>
      `;
      myBookingsEl.appendChild(card);
    });

    myBookingsEl.querySelectorAll(".cancel-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        const id = e.currentTarget.dataset.id;
        if (!confirm("Cancel this booking?")) return;
        // try {
        //   await deleteDoc(doc(db, "bookings", id));
        //   loadMyBookings(userId);
         try {
          await cancelBooking(id);
          // reload bookings/UI
          if (currentUser) loadMyBookings(currentUser.uid);
          if (bunkId) loadStation();
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

// ---------- Cancel booking (transaction-safe) ----------
async function cancelBooking(bookingId) {
  try {
    const bookingRef = doc(db, "bookings", bookingId);
    const bookingSnap = await getDoc(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found.");
    const booking = bookingSnap.data();

    // only allow owner to cancel (or admin in future)
    if (!currentUser || booking.userId !== currentUser.uid) {
      throw new Error("Not authorized to cancel this booking.");
    }

    // perform transaction: delete reservation, increment bunk.slots (if exists), delete booking
    await runTransaction(db, async (tx) => {
      const bunkRef = doc(db, "bunks", booking.bunkId);
      const bunkSnap = await tx.get(bunkRef);
      if (!bunkSnap.exists()) {
        throw new Error("Associated station not found (during cancel).");
      }
      const bunkData = bunkSnap.data();

      // reservation doc
      const resRef = doc(db, "bunks", booking.bunkId, "reservations", booking.reservationId);
      const resSnap = await tx.get(resRef);
      if (resSnap.exists()) {
        tx.delete(resRef);
      }

      // increment slots if bunk has 'slots' field
      if (typeof bunkData.slots !== "undefined") {
        tx.update(bunkRef, {
          slots: bunkData.slots + 1
        });
      }

      // delete booking (history)
      tx.delete(bookingRef);
    });

    // success
    statusEl && (statusEl.style.color = "orange");
    statusEl && (statusEl.textContent = "Booking cancelled successfully.");
  } catch (err) {
    console.error("cancelBooking transaction:", err);
    throw err; // caller will handle alert
  }
}

