import { auth, db } from "./firebase.js";
import { collection, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const adminLink = document.getElementById("adminLink");
// LEAFLET map
const map = L.map("map").setView([20.5937, 78.9629], 5);

// OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
}).addTo(map);

const locateBtn = document.getElementById("locateBtn");
const searchInput = document.getElementById("searchInput");
const radiusSelect = document.getElementById("radiusSelect");
const bunkList = document.getElementById("bunkList");

// Keep track of markers so we can clear them
let markers = [];
let bunksData = []; //to store all stations from firestore
let userLocation = null;
let radiusCircle = null;

// Icons 
const fastIcon = L.icon({ iconUrl: "./assets/fast.png", iconSize: [36, 36] });
const slowIcon = L.icon({ iconUrl: "./assets/slow.png", iconSize: [36, 36] });


// ---------------- Utility Functions ------------

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function drawRadiusCircle(lat, lng, radiusKm) {
  if (radiusCircle) map.removeLayer(radiusCircle);
  radiusCircle = L.circle([lat, lng], {
    radius: radiusKm * 1000,
    color: "#1976d2",
    fillColor: "#bbdefb",
    fillOpacity: 0.18,
  }).addTo(map);
}

function fitMapToMarkers() {
  if (markers.length === 0) return;
  const group = L.featureGroup(markers);
  map.fitBounds(group.getBounds().pad(0.2));
}

// ---------------- Display Bunks ---------------

function displayBunks(list) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  bunkList.innerHTML = "";

  if (!list || list.length === 0) {
    bunkList.innerHTML = "<p class='no-results'>No stations found.</p>";
    return;
  }

  list.forEach(bunk => {
    const { lat, lng, name, address, type, slots, openHours, id } = bunk;
    // Define icon based on type
    // const fastIcon = L.icon({ iconUrl: '/assets/fast.png', iconSize: [36, 36] });
    // const slowIcon = L.icon({ iconUrl: '/assets/slow.png', iconSize: [36, 36] });
    const markerIcon = type === 'Fast Charger' ? fastIcon : slowIcon;

    // add marker
    const popupHtml = `
    <div>
      <strong>${name}</strong><br/>
      ${address}<br/>
      ${type ? `<em>${type}</em><br/>` : ""}
      ${Number.isFinite(slots) ? `Slots: ${slots}<br/>` : ""}
      ${openHours ? `Hours: ${openHours}<br/>` : ""}
      <a href="booking.html?bunkId=${id}" class="btn">Book Now</a>
    </div>
    `;    //<button onclick="window.location.href='booking.html?bunkId=${id}'">Book Now</button>

    const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map).bindPopup(popupHtml);
    markers.push(marker);

    // add card to list
    const div = document.createElement("div");
    div.className = "bunk-card";
    div.innerHTML = `
      <h3>${name || "unnamed station"}</h3>
      <p class="address">${address || ""}</p>
      ${type ? `<p class="meta">Type: ${type}</p>` : ""}
      ${Number.isFinite(slots) ? `<p class="meta">Slots: ${slots}</p>` : ""}
      <div class="card-actions">
        <button class="btn book-btn" data-id="${bunk.id}">Book Now</button>
        <button class="btn view-map-btn" data-lat="${lat}" data-lng="${lng}">View</button>
      </div>
    `;
    bunkList.appendChild(div);
  });

  // add delegated event listeners for Book Now and View buttons
  bunkList.querySelectorAll(".book-btn").forEach(btn =>
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.dataset.id;
      // open booking flow: for now redirect to booking page with id param
      window.location.href = `booking.html?bunkId=${id}`;
    })
  );

  bunkList.querySelectorAll(".view-map-btn").forEach(btn =>
    btn.addEventListener("click", (e) => {
      const lat = parseFloat(e.currentTarget.dataset.lat);
      const lng = parseFloat(e.currentTarget.dataset.lng);
      map.setView([lat, lng], 15);
      const mk = markers.find(m => Math.abs(m.getLatLng().lat - lat) < 1e-6 && Math.abs(m.getLatLng().lng - lng) < 1e-6);
      if (mk) mk.openPopup();
    })
  );
  if (!userLocation) fitMapToMarkers();
}

// ---------------- Fetch Bunks from Firestore -------------

onSnapshot(collection(db, "bunks"), (snapshot) => {
  bunksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  // displayBunks(bunksData);
  applyFilters();
  }, (err) => {
  console.error("Failed to load bunks:", err);
  bunkList.innerHTML = "<p class='no-results'>Failed to load stations.</p>";
});


// ---------------- Filters ---------------

function applyFilters() {
  let filtered = bunksData.slice();
  // Radius filter
  if (userLocation) {
    const radius = parseFloat(radiusSelect.value);
    if (!isNaN(radius)) {
      filtered = filtered.filter(b =>
        getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng) <= radius
      );
      drawRadiusCircle(userLocation.lat, userLocation.lng, radius);
    }
  }else if (radiusCircle) {
    map.removeLayer(radiusCircle);
    radiusCircle = null;
  }

  // Search filter
  const query = searchInput.value.trim().toLowerCase();
  if (query) {
    filtered = filtered.filter(b =>
      (b.name && b.name.toLowerCase().includes(query)) ||
      (b.address && b.address.toLowerCase().includes(query))
    );
  }
  displayBunks(filtered);
}

// ---------------- Event Listeners ----------------
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) return alert("Geolocation not supported.");

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      userLocation = { lat: latitude, lng: longitude };
      map.setView([latitude, longitude], 14);
      L.marker([latitude, longitude], { title: "You are here" })
        .addTo(map)
        .bindPopup("You are here")
        .openPopup();
      applyFilters();
    },
     (err) => {
      console.error("Geolocation error", err);
      alert("Unable to fetch your location. Make sure location is enabled.");
    },
    { enableHighAccuracy: true }
  );
});

radiusSelect.addEventListener("change", () => {
  if (!userLocation) return alert("Please locate yourself first.");
  applyFilters();
});

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(applyFilters, 200);
});

const loginLink = document.getElementById("loginLink");
const logoutBtn = document.getElementById("logoutBtn");

// Auth UI logic
onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginLink.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    // check role
    try {
      const udoc = await db.getDoc?.(db.doc?.())
    } catch (e) {
      // ignore — we will do a safer check using getDoc below
    }
    try {
      const { doc: docFn, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
    } catch (e) { }
    // simple role check (read users/{uid}.role)
    try {
      const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js");
      const uref = doc(db, "users", user.uid);
      const usnap = await getDoc(uref);
      const role = usnap.exists() ? usnap.data().role : "user";
      if (role === "admin") adminLink.classList.remove("hidden");
    } catch (err) {
      // fail silently
    }
  } else {
    loginLink.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    adminLink.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.reload();
  } catch (e) {
    console.error("Sign out error:", e);
    alert("Could not sign out, try again.");
  }
});

bunkList.querySelectorAll(".view-map-btn").forEach(btn =>
  btn.addEventListener("click", (e) => {
    const lat = parseFloat(e.currentTarget.dataset.lat);
    const lng = parseFloat(e.currentTarget.dataset.lng);
    map.setView([lat, lng], 15);
    // Optionally find the marker and open its popup
    const mk = markers.find(m => {
      const p = m.getLatLng();
      return Math.abs(p.lat - lat) < 1e-6 && Math.abs(p.lng - lng) < 1e-6;
    });
    if (mk) mk.openPopup();
  })
);
