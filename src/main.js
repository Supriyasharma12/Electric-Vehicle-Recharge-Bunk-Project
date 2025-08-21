import { db } from "./firebase.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


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



// Mock bunk data WILL CHANGE LATER
const bunks = [
  { name: "EV Station A", lat: 28.6139, lng: 77.2090, address: "Connaught Place, Delhi" },
  { name: "EV Station B", lat: 19.0760, lng: 72.8777, address: "Bandra, Mumbai" },
  { name: "EV Station C", lat: 12.9716, lng: 77.5946, address: "MG Road, Bangalore" },
];

// markers for all bunks
function displayBunks(list) {
  bunkList.innerHTML = "";
  list.forEach(bunk => {
    const marker = L.marker([bunk.lat, bunk.lng]).addTo(map)
      .bindPopup(`<b>${bunk.name}</b><br>${bunk.address}`);
// Add to the list section
    const div = document.createElement("div");
    div.className = "bunk-card";
    div.innerHTML = `<h3>${bunk.name}</h3><p>${bunk.address}</p>`;
    bunkList.appendChild(div);
  });
}

// initial bunks SHOWING
displayBunks(bunks);

// Locating user on button click
locateBtn.addEventListener("click", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.setView([latitude, longitude], 14);

        // Mark user location
        L.marker([latitude, longitude], { title: "You are here" })
          .addTo(map)
          .bindPopup("You are here")
          .openPopup();
      },
      () => {
        alert("Unable to fetch your location.");
      }
    );
  } else {
    alert("Geolocation not supported by your browser.");
  }
});

// Searching bunks by name or address
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  const filtered = bunks.filter(
    bunk =>
      bunk.name.toLowerCase().includes(query) ||
      bunk.address.toLowerCase().includes(query)
  );
  displayBunks(filtered);
});
