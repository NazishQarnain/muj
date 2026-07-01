# 🌐 MujConnects – A Community Platform for MUJ Students

MujConnects is a **college-exclusive community web application** built for students of **Manipal University Jaipur (MUJ)** to connect, chat, and collaborate within their respective batches.

This is a **frontend-only demo** created as a **PBL (Project-Based Learning)** project using **HTML, Tailwind CSS, and JavaScript**, hosted on **GitHub Pages**.

---

## 🚀 Live Demo
🔗 **[View MujConnects](https://nazishqarnain.github.io/MujConnects/)**  

---

## 📖 Overview

MujConnects allows students to:
- Register and log in using their **college email ID** (`@muj.manipal.edu`)
- Join their **batch-specific chat room**
- Interact with peers, discuss topics, and share information
- Manage their **profile** (name, email, batch)
- Enjoy a **modern, responsive, dark/light mode UI**

---

## 💡 Features

✅ **User Authentication (frontend simulation)**  
✅ **Batch-wise Chat Room UI**  
✅ **Profile Management**  
✅ **Responsive Design (Mobile + Desktop)**  
✅ **Light/Dark Mode Toggle**  
✅ **LocalStorage Data Persistence**  
✅ **Smooth Hash-based Routing**

---

## 🧱 Folder Structure

mujconnects/
│
├── index.html
├── css/
│ └── style.css
├── js/
│ ├── main.js
│ ├── auth.js
│ ├── home.js
│ ├── chat.js
│ └── utils.js
├── images/

---

## 🔥 Firebase Backend Setup

MujConnects now includes **Firebase Authentication** and **Firebase Realtime Database** for real-time chat functionality.

### Prerequisites
1. A Google account
2. Basic knowledge of Firebase console

### Setup Instructions

#### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click on "Add project" or "Create a project"
3. Enter project name (e.g., "MujConnects")
4. Follow the setup wizard

#### Step 2: Enable Authentication
1. In Firebase Console, click on "Authentication" from the left sidebar
2. Click on "Get Started"
3. Go to "Sign-in method" tab
4. Enable **Email/Password** authentication

#### Step 3: Create Realtime Database
1. In Firebase Console, click on "Realtime Database" from the left sidebar
2. Click on "Create Database"
3. Choose a location (preferably closest to your users)
4. Start in **Test mode** (for development)
   - **Important**: For production, set up proper security rules

#### Step 4: Get Your Firebase Config
1. Go to Project Settings (gear icon → Project settings)
2. Scroll down to "Your apps" section
3. Click on the Web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

#### Step 5: Update Your Project
1. Open `js/firebase-config.js` in your project
2. Replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. Save the file

### Security Rules (Production)

For production deployment, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "chats": {
      "$batchId": {
        "messages": {
          ".read": "auth != null",
          ".write": "auth != null",
          "$messageId": {
            ".validate": "newData.hasChildren(['text', 'displayName', 'email', 'uid', 'timestamp'])"
          }
        }
      }
    },
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```

### Features with Firebase

✅ **Real-time Authentication** - Secure user login and registration  
✅ **Real-time Chat** - Messages sync instantly across all users  
✅ **Batch-wise Rooms** - Students chat within their batch groups  
✅ **User Profiles** - Display names and email stored securely  
✅ **Message Persistence** - Chat history preserved in Firebase

---
│ └── logo.png
└── README.md
