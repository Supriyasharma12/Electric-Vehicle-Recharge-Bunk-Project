import { auth, db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

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

// // Icons 
// const fastIcon = L.icon({ iconUrl: "./assets/fast.png", iconSize: [36, 36] });
// const slowIcon = L.icon({ iconUrl: "./assets/slow.png", iconSize: [36, 36] });


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
//     const lat = bunk.lat;
//     const lng = bunk.lng;
//     const title = bunk.name || "Unnamed station";
//     const address = bunk.address || "";
//     const type = bunk.type || "";
//     const slots = (typeof bunk.slots !== "undefined") ? bunk.slots : null;
//     const openHours = bunk.openHours || "";

//     const fastIcon = L.icon({ iconUrl: '/assets/fast.png', iconSize: [36,36] });
// const slowIcon = L.icon({ iconUrl: '/assets/slow.png', iconSize: [36,36] });

// const markerIcon = bunk.type === 'Fast Charger' ? fastIcon : slowIcon;
    
    const { lat, lng, name, address, type, slots, openHours, id } = bunk;

    // Define icon based on type
    const fastIcon = L.icon({ iconUrl: '/assets/fast.png', iconSize: [36,36] });
    const slowIcon = L.icon({ iconUrl: '/assets/slow.png', iconSize: [36,36] });
    const markerIcon = type === 'Fast Charger' ? fastIcon : slowIcon;


    // add marker
    const popupHtml = `
      <strong>${title}</strong><br/>
      ${address}<br/>
      ${type ? `<em>${type}</em><br/>` : ""}
      ${slots !== null ? `Slots: ${slots}<br/>` : ""}
      ${openHours ? `Hours: ${openHours}<br/>` : ""}
      <button onclick="window.location.href='booking.html?bunkId=${id}'">Book Now</button>
    `;

   const marker = L.marker([lat, lng], { icon: markerIcon }).addTo(map).bindPopup(popupHtml);
    markers.push(marker);

    // add card to list
    const div = document.createElement("div");
    div.className = "bunk-card";
    div.innerHTML = `
      <h3>${name || "unnamed station"}</h3>
      <p class="address">${address || ""}</p>
      ${type ? `<p class="meta">Type: ${type}</p>` : ""}
      ${slots !== null ? `<p class="meta">Slots: ${slots}</p>` : ""}
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
    })
  );
  if(!userLocation) fitMapToMarkers();
}

// ---------------- Fetch Bunks from Firestore -------------

onSnapshot(collection(db, "bunks"), (snapshot) => {
    bunksData = snapshot.docs.map(doc => ({id: doc.id,...doc.data()}));
    // displayBunks(bunksData);
    applyFilters();
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
    () => alert("Unable to fetch your location.")
  );
});

radiusSelect.addEventListener("change", () => {
  if (!userLocation) return alert("Please locate yourself first.");
  applyFilters();
});

searchInput.addEventListener("input", applyFilters);




// function filterNearbyBunks(userLat, userLng, radiusKm) {
//     const nearby = bunksData.filter(bunk => {
//         const d = getDistance(userLat, userLng, bunk.lat, bunk.lng);
//         return d <= radiusKm;
//     });
//     displayBunks(nearby);
// }


// // Locating user on button click
// locateBtn.addEventListener("click", () => {
//     if (navigator.geolocation) {
//         navigator.geolocation.getCurrentPosition(
//             (pos) => {
//                 const { latitude, longitude } = pos.coords;
//                 userLocation = { lat: latitude, lng: longitude };
//                 map.setView([latitude, longitude], 14);

//                 // Mark user location
//                 L.marker([latitude, longitude], { title: "You are here" })
//                     .addTo(map)
//                     .bindPopup("You are here")
//                     .openPopup();

//                     // draw circle based on current radius
// const selectedRadiusNow = parseFloat(radiusSelect.value) || 5; // default 5
// drawRadiusCircle(userLocation.lat, userLocation.lng, selectedRadiusNow);

// // apply combined filters (search + radius)
// applyFilters();

//             },
//             () => {
//                 alert("Unable to fetch your location.");
//             }
//         );
//     } else {
//         alert("Geolocation not supported by your browser.");
//     }
// });

// // ----- Radius filter
// radiusSelect.addEventListener("change", () => {
//   if (!userLocation) {
//     alert("Please locate yourself first.");
//     return;
//   }

//   const selectedRadius = parseFloat(radiusSelect.value); // e.g., 5, 10, 20
//   if (isNaN(selectedRadius)) {
//     displayBunks(bunksData); // If "All" is selected, show all
//     return;
//   }

// //   const filtered = bunksData.filter((bunk) => {
// //     const distance = getDistance(
// //       userLocation.lat,
// //       userLocation.lng,
// //       bunk.lat,
// //       bunk.lng
// //     );
// //     return distance <= selectedRadius;
// //   });

// //   displayBunks(filtered);
//  const selectedRadius = parseFloat(radiusSelect.value);
//   drawRadiusCircle(userLocation.lat, userLocation.lng, selectedRadius);
//   applyFilters();
// });

// function applyFilters() {
//   let filtered = bunksData.slice();

//   // radius filter
//   if (userLocation) {
//     const radius = parseFloat(radiusSelect.value);
//     if (!isNaN(radius)) {
//       filtered = filtered.filter(b => {
//         const d = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
//         return d <= radius;
//       });
//     }
//   }

//   // search filter
//   const q = searchInput.value.trim().toLowerCase();
//   if (q) {
//     filtered = filtered.filter(b =>
//       (b.name && b.name.toLowerCase().includes(q)) ||
//       (b.address && b.address.toLowerCase().includes(q))
//     );
//   }

//   displayBunks(filtered);
// }


// // Searching bunks by name or address
// searchInput.addEventListener("input", () => {
//     const query = searchInput.value.toLowerCase();
//     const filtered = bunksData.filter(
//         bunk =>
//             bunk.name.toLowerCase().includes(query) ||
//             bunk.address.toLowerCase().includes(query)
//     );
//     displayBunks(filtered);
// });


const loginLink = document.getElementById("loginLink");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    loginLink.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    loginLink.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  alert("Logged out!");
});