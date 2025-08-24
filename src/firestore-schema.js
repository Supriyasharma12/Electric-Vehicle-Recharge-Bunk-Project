// src/firestore-schema.js
import { db } from "./firebase.js";
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

async function setupSchema() {
  try {
    // Example bunk (station)
    const bunkRef = doc(collection(db, "bunks"), "bunk1");
    await setDoc(bunkRef, {
      name: "NIT Patna EV Station",
      address: "NITP Main Gate, Patna",
      location: {
        lat: 25.6207,
        lng: 85.1786
      },
      phone: "+91-9876543210"
    });

    // Example slots
    const slotRef = doc(collection(bunkRef, "slots"), "slot1");
    await setDoc(slotRef, {
      time: "10:00 AM - 11:00 AM",
      isBooked: false,
      userId: null
    });

    console.log("Firestore schema & sample data created");
  } catch (err) {
    console.error("Error setting up schema:", err);
  }
}

setupSchema();

