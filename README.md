# 🏙️ Smart Municipal Administration AI Agent

An end-to-end **AI-Powered Smart Municipal Monitoring, Infrastructure Management, and Citizen Grievance Redressal System**.

Built for modern civic corporations to monitor IoT field infrastructure in real time via LoRa/LoRaWAN, detect anomalies, forecast equipment degradation, triage citizen complaints with live NLP pre-screening and duplicate detection, route work orders to municipal departments, and visually track incidents on an interactive GIS Satellite map.

---

## 🛰️ Key Features

### 1. GIS Satellite Problem Location Map
- **High-Resolution Satellite Imagery**: Uses ArcGIS World Imagery with road boundary overlays.
- **Pulsing Severity Beacons**: Plots active critical alerts (🔴), high-priority issues (🟠), citizen grievances (🔵), and IoT sensor nodes (🟢).
- **Incident Intelligence Card**: Click any marker to view exact GPS coordinates, sensor telemetry, responsible department, and action directives.
- **Pin Incident Location**: Click anywhere on the satellite imagery to drop a GPS pin and file a new municipal grievance.

### 2. Smart Infrastructure Monitoring (IoT via LoRaWAN)
- **Architecture**: `IoT Sensor → LoRa Module → LoRa Gateway → Cloud Server → AI Agent`
- **Garbage Bins**: Fill level monitoring (`Normal`, `Nearly Full`, `Full`, `Overflow Risk`, `Overflow`) routed to **Waste Management Department**.
- **Drainage Systems**: Ultrasonic depth and flow rate monitoring. Detects culvert blockages when depth rises while flow drops to near zero. Routed to **Drainage Department**.
- **Water Tanks**: Real-time reservoir storage percentages, depletion warnings, and overflow prevention routed to **Water Supply Department**.
- **Hardware Failure Diagnostics**: Detects offline nodes, depleted batteries, communication timeouts, and stuck sensors, escalating to **Technical/Maintenance Department**.

### 3. AI Predictive Analytics Engine
- Time-series rate-of-change forecasting:
  - Hours remaining until garbage bins reach 100% saturation.
  - Culvert drainage overflow and sub-surface blockage prediction.
  - Water reservoir depletion countdowns.
  - Ward-level recurring problem hotspots.
- Every prediction includes **Prediction**, **Mathematical Reason**, **Confidence Level (%)**, and **Action Directive**.

### 4. Citizen Grievance Portal & Real-Time AI Pre-Screening
- **Real-Time NLP Pre-Screening**: As citizens type, the AI dynamically extracts the problem, determines priority (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`), assesses safety hazards (schools, hospitals, transit arteries), and routes to the correct department.
- **Duplicate Complaint Detection**: Computes semantic text similarity and spatial proximity against active open complaints, linking duplicate submissions to parent cases.
- **Citizen Feedback**: 1–5 star rating and review submission for resolved grievances.

### 5. People & Profiles Directory
- **Municipal Staff Profiles**: Rosters for engineers, inspectors, and technicians across all departments with duty status toggles (`Available`, `On Duty`, `Dispatched`), ratings, contact details, and assigned work orders.
- **Citizen Profiles**: Citizen cards with civic engagement scores, address, contact, and reporting history.
- **Header Profile Switcher**: Fast persona switcher in the top bar.

### 6. LoRaWAN Gateway Simulator Drawer
- Slide-over simulation drawer to test operational stress scenarios:
  - *Flash Storm: Drainage Surge*
  - *Market Rush: Garbage Overflow*
  - *Water Main Rupture: Tank Drought*
  - *Hardware Sensor Failure Injection*

---

## 🛠️ Tech Stack

- **Backend**: Python, Flask, SQLAlchemy, SQLite, CORS
- **Frontend**: React 19, Vite, Leaflet, Lucide React, Modern Vanilla CSS Design System
- **IoT Protocol Simulation**: LoRaWAN 1.0.4 Class A (EU868 / US915)

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/aswinrv2007-hue/Smart-Municipal-Administration.git
cd Smart-Municipal-Administration
```

### 2. Run the Backend
```bash
cd backend
py -m pip install -r requirements.txt
py app.py
```
*Backend runs at `http://127.0.0.1:5000`*

### 3. Run the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173`*

---

## 🧪 Running Automated Tests

```bash
cd backend
py -m unittest discover -s tests -p "test_*.py"
```

---

## 📄 License
MIT License
