// Import Firebase modules
import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Auth check – only logged in admins can access
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  }
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// Add EV Bunk
const addBunkForm = document.getElementById("addBunkForm");
addBunkForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const bunkName = document.getElementById("bunkName").value;
  const bunkAddress = document.getElementById("bunkAddress").value;
  const bunkLocation = document.getElementById("bunkLocation").value;
  const totalSlots = parseInt(document.getElementById("totalSlots").value);

  try {
    await addDoc(collection(db, "ev_bunks"), {
      bunkName,
      bunkAddress,
      bunkLocation,
      totalSlots,
      availableSlots: totalSlots,
      createdAt: new Date(),
    });
    alert("EV Bunk Added Successfully!");
    addBunkForm.reset();
    loadBunks();
  } catch (error) {
    console.error("Error adding bunk:", error);
    alert("Failed to add bunk.");
  }
});

// Load & Display Bunks
async function loadBunks() {
  const bunksList = document.getElementById("bunksList");
  bunksList.innerHTML = "";

  const querySnapshot = await getDocs(collection(db, "ev_bunks"));
  querySnapshot.forEach((docSnap) => {
    const bunk = docSnap.data();
    const div = document.createElement("div");
    div.className = "bunk-card";
    div.innerHTML = `
      <h4>${bunk.bunkName}</h4>
      <p><b>Address:</b> ${bunk.bunkAddress}</p>
      <p><b>Location:</b> <a href="${bunk.bunkLocation}" target="_blank">Map</a></p>
      <p><b>Slots:</b> ${bunk.availableSlots} / ${bunk.totalSlots}</p>
      <button onclick="updateSlots('${docSnap.id}', ${bunk.availableSlots + 1}, ${bunk.totalSlots})">+ Add Slot</button>
      <button onclick="updateSlots('${docSnap.id}', ${bunk.availableSlots - 1}, ${bunk.totalSlots})">- Remove Slot</button>
    `;
    bunksList.appendChild(div);
  });
}

// Update Slots
window.updateSlots = async function (id, newAvailable, total) {
  if (newAvailable < 0 || newAvailable > total) {
    alert("Invalid slot update!");
    return;
  }
  const bunkRef = doc(db, "ev_bunks", id);
  await updateDoc(bunkRef, { availableSlots: newAvailable });
  loadBunks();
};

// Initial load
loadBunks();
