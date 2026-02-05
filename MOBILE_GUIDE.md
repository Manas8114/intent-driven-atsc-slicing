# 📱 Mobile App Demo Guide

## Intent-Driven ATSC 3.0 Network Slicing

This guide explains how to start, connect, and understand the mobile applications (BLE Advertiser & Receiver).

---

### 1. Prerequisites 🛠️

* **Phone:** Android or iOS device.
* **App:** Install **Expo Go** from your app store.
  * [iOS Download](https://apps.apple.com/app/expo-go/id982107779)
  * [Android Download](https://play.google.com/store/apps/details?id=host.exp.exponent)

### 2. How to Start 🚀

1. **On your PC**, run the all-in-one startup script:

    ```cmd
    .\start_multi_tunnel.cmd
    ```

2. Wait for all windows to open. You will see 4 public URLs generated.
3. Two separate terminal windows will open:
    * **BLE Advertiser** (Simulator for Broadcast Tower)
    * **BLE Receiver** (Simulator for User Device)

### 3. How to Connect 🔗

**Option A: Local WiFi (Same Network)**

* Scan the QR code shown in the terminal window using your phone's camera or Expo Go.

**Option B: Remote (Friend's Network)**

* Look for the `exp://...` URL in the terminal window.
* Send this URL to your friend.
* They paste it into Expo Go -> "Enter URL manually".

### 4. What to Expect (The Demo) 📱

#### 📡 App 1: BLE Advertiser (The Tower)

* **Role:** Simulates an ATSC 3.0 Broadcast Tower sending out connection parameters.
* **What you see:**
  * It broadcasts a "Service UUID".
  * It shows the **Current Intent** (e.g., "Maximize Coverage").
  * **Action:** It updates automatically when the AI Engine changes the intent.

#### 📲 App 2: BLE Receiver (The User)

* **Role:** Simulates a phone receiving the TV signal.
* **What you see:**
  * **"Scanning..."**: Searching for the tower.
  * **"Signal Found!"**: Connected to the Advertiser.
  * **Graphs:** Real-time SNR (Signal-to-Noise Ratio) and Throughput.
  * **Heatmap:** Visual I/Q constellation (simulated signal quality).
* **Interaction:** Move the phones apart (if testing locally with 2 phones) to see signal strength drop!

### 5. Troubleshooting 🔧

| Issue | Solution |
|-------|----------|
| **"Network Response Timed Out"** | The tunnel might be slow or disconnected. Restart `start_multi_tunnel.cmd`. |
| **"Uncaught Error: Java"** | (Android) Clear Expo Go cache or reinstall Expo Go. |
| **"Tunnel not found"** | The ngrok session expired. Close all windows and run the start script again. |
| **Apps don't see each other** | Ensure "Advertiser" is running FIRST. Bluetooth permissions must be granted on the phone. |

### 6. Technical Note (Real vs. Demo) 🧠

* **Real:** The **AI Logic** (PPO Algorithm) and **Data Packaging** (JSON/Protobuf) are 100% real.
* **Demo:** We use **Bluetooth (BLE)** to simulate the ATSC 3.0 RF signal because phones don't have ATSC 3.0 tuners yet.
* **Connectivity:** The IP connection via ngrok allows the apps to talk to the backend brain from anywhere in the world.
