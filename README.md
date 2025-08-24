 # EV Recharge Bunk  

 A web-based EV charging management system that allows users to find nearby stations, book charging slots in real time, and helps admins manage availability efficiently. 

## Screenshots  

###  Home Page  
![Homepage Screenshot](./assets/screenshots/home.png)  

###  Booking Page  
![Booking Screenshot](./assets/screenshots/booking.png)  

###  Login / Register  
![Login Screenshot](./assets/screenshots/login.png)  



## Project Overview  
**EV Recharge Bunk** is a **Smart Electric Vehicle Charging Slot Booking System** designed to reduce EV charging station queues.  
It allows EV owners to:  
- **Search nearby charging stations** using map integration  
- **View station details** (address, contact, slots available)  
- **Book charging slots** in advance  
- **Login/Register securely** using Firebase Authentication  
- **Check live availability** of charging slots  

This system ensures **seamless long-distance EV travel** and better **charging station accessibility** in smart cities.  


## Features
 Admin Panel to manage **Bunk Details & Slots**  
 Google Maps / Leaflet Map for **Station Discovery**  
 User Login & Registration (Firebase Auth)  
 **Slot Booking System** with availability check  
 Firebase Firestore for **real-time data storage**  
 Mobile-friendly responsive UI  


## Project Structure  

EV-Recharge-Bunk/
│── index.html # Homepage
│── login.html # User Login
│── register.html # User Registration
│── booking.html # Book a Slot
|── admin.html   # admin page
│── styles/
│ └── main.css # Global Styles
│── scripts/
│ ├── login.js # Authentication Logic
| ├── register.js # Authentication Logic
| ├── main.js   # Home page logic
│ ├── booking.js # Slot Booking Logic
│ ├── firebase.js # Firebase Config
│ └── admin.js # Admin dashboard 
│── assets/ # Icons & Images
│── README.md # Project Documentation

##  Technologies Used
- **Frontend:** HTML5, CSS3, JavaScript  
- **Database & Auth:** Firebase (Firestore + Authentication)  
- **Map Integration:** Leaflet.js (OpenStreetMap)  
- **Deployment:** Firebase Hosting / GitHub Pages  




