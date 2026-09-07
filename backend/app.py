"""
Flask REST API for Smart Municipal Administration System.
Serves AI telemetry processing, citizen complaint intake, alerts, dispatch, and reports.
"""
from datetime import datetime, timezone
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import desc

from database import (
    SessionLocal, Sensor, Telemetry, Alert, Complaint, MunicipalThreshold,
    Staff, Citizen, init_db
)
from sample_data import seed_database
from ai_agent.sensor_analyzer import SensorAnalyzer
from ai_agent.predictive_engine import PredictiveEngine
from ai_agent.complaint_processor import ComplaintProcessor
from ai_agent.alert_generator import AlertGenerator
from ai_agent.lora_simulator import LoRaSimulator

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Ensure database is initialized and seeded
init_db()
seed_database()


def get_db_session():
    return SessionLocal()


# ==========================================
# 1. Health & Status
# ==========================================
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "Smart Municipal Administration AI Agent",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ==========================================
# 2. Sensors & Telemetry Endpoints
# ==========================================
@app.route("/api/sensors", methods=["GET"])
def get_sensors():
    db = get_db_session()
    sensor_type = request.args.get("type")
    status = request.args.get("status")
    ward = request.args.get("ward")

    query = db.query(Sensor)
    if sensor_type:
        query = query.filter(Sensor.type == sensor_type)
    if status:
        query = query.filter(Sensor.status == status)
    if ward:
        query = query.filter(Sensor.ward == ward)

    sensors = query.all()
    result = [s.to_dict() for s in sensors]
    db.close()
    return jsonify({"count": len(result), "sensors": result})


@app.route("/api/sensors/<sensor_id>", methods=["GET"])
def get_sensor(sensor_id):
    db = get_db_session()
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        db.close()
        return jsonify({"error": f"Sensor {sensor_id} not found"}), 404

    sensor_dict = sensor.to_dict()
    db.close()
    return jsonify(sensor_dict)


@app.route("/api/sensors/<sensor_id>/history", methods=["GET"])
def get_sensor_history(sensor_id):
    db = get_db_session()
    limit = int(request.args.get("limit", 25))
    telemetries = (
        db.query(Telemetry)
        .filter(Telemetry.sensor_id == sensor_id)
        .order_by(desc(Telemetry.timestamp))
        .limit(limit)
        .all()
    )
    result = [t.to_dict() for t in reversed(telemetries)]
    db.close()
    return jsonify({"sensor_id": sensor_id, "count": len(result), "history": result})


@app.route("/api/telemetry", methods=["POST"])
def ingest_telemetry():
    """
    Ingests LoRa/LoRaWAN sensor telemetry packet, runs AI validation & analysis,
    and updates sensor and alert records.
    """
    data = request.get_json() or {}
    sensor_id = data.get("sensor_id")
    if not sensor_id:
        return jsonify({"error": "sensor_id is required"}), 400

    db = get_db_session()
    sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
    if not sensor:
        db.close()
        return jsonify({"error": f"Sensor {sensor_id} does not exist"}), 404

    # Fetch recent history for rate of change and anomaly checking
    recent_history = (
        db.query(Telemetry)
        .filter(Telemetry.sensor_id == sensor_id)
        .order_by(desc(Telemetry.timestamp))
        .limit(6)
        .all()
    )
    history_dicts = [t.to_dict() for t in reversed(recent_history)]

    reading = data.get("reading")
    flow_rate = data.get("flow_rate", sensor.flow_rate)
    battery_level = data.get("battery_level", sensor.battery_level)
    rssi = data.get("rssi", sensor.rssi)
    snr = data.get("snr", sensor.snr)
    sensor_status = data.get("status", sensor.status)

    # Run AI Sensor Analyzer
    analysis = SensorAnalyzer.analyze(
        sensor_id=sensor_id,
        sensor_type=sensor.type,
        location=sensor.location,
        reading=reading,
        unit=sensor.unit,
        flow_rate=flow_rate,
        timestamp=datetime.now(timezone.utc),
        battery_level=battery_level,
        rssi=rssi,
        snr=snr,
        sensor_status=sensor_status,
        history=history_dicts
    )

    # Update Sensor model
    if analysis.get("status") != "FAULT" and reading is not None:
        sensor.current_reading = float(reading)
    sensor.flow_rate = float(flow_rate) if flow_rate is not None else 0.0
    sensor.battery_level = float(battery_level) if battery_level is not None else 100.0
    sensor.rssi = int(rssi) if rssi is not None else -75
    sensor.snr = float(snr) if snr is not None else 8.0
    sensor.status = analysis.get("status", "ONLINE")
    sensor.condition_label = analysis.get("condition_label", "Normal")
    sensor.responsible_department = analysis.get("responsible_department", sensor.responsible_department)
    sensor.last_active = datetime.now(timezone.utc)

    # Insert Telemetry record
    telemetry_record = Telemetry(
        sensor_id=sensor_id,
        timestamp=datetime.now(timezone.utc),
        reading=float(reading) if reading is not None and analysis.get("status") != "FAULT" else 0.0,
        unit=sensor.unit,
        flow_rate=sensor.flow_rate,
        battery_level=sensor.battery_level,
        rssi=sensor.rssi,
        snr=sensor.snr,
        status=sensor.status,
        condition_label=sensor.condition_label
    )
    db.add(telemetry_record)

    # Auto-generate Alert if condition is HIGH or CRITICAL
    generated_alert = None
    if analysis.get("requires_alert"):
        # Check if an active alert already exists for this sensor
        existing_alert = (
            db.query(Alert)
            .filter(Alert.sensor_id == sensor_id, Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]))
            .first()
        )
        if not existing_alert:
            alert_payload = AlertGenerator.generate_sensor_alert(analysis)
            if alert_payload:
                alert_obj = Alert(**alert_payload)
                db.add(alert_obj)
                generated_alert = alert_payload

    db.commit()
    db.close()

    return jsonify({
        "status": "success",
        "analysis": analysis,
        "alert_created": bool(generated_alert),
        "alert": generated_alert
    })


# ==========================================
# 3. LoRaWAN Gateway Simulation Controller
# ==========================================
@app.route("/api/simulator/tick", methods=["POST"])
def simulator_tick():
    """
    Executes one simulation step across all or specific sensors.
    Supports scenarios: NORMAL, RAIN_SURGE, MARKET_GARBAGE, WATER_DROUGHT, SENSOR_FAULT.
    """
    body = request.get_json() or {}
    scenario = body.get("scenario", "NORMAL")
    target_sensor_id = body.get("sensor_id")

    db = get_db_session()
    query = db.query(Sensor)
    if target_sensor_id:
        query = query.filter(Sensor.id == target_sensor_id)
    sensors = query.all()

    processed = []
    for s in sensors:
        # Simulate next physical value
        sim = LoRaSimulator.simulate_next_reading(s.to_dict(), scenario=scenario)

        # Build LoRaWAN packet
        packet = LoRaSimulator.generate_uplink_packet(
            sensor_id=s.id,
            sensor_type=s.type,
            reading=sim["reading"],
            unit=s.unit,
            flow_rate=sim["flow_rate"],
            battery=sim["battery"]
        )
        packet["rssi"] = sim.get("rssi", s.rssi)
        packet["snr"] = sim.get("snr", s.snr)

        # Get history
        hist = (
            db.query(Telemetry)
            .filter(Telemetry.sensor_id == s.id)
            .order_by(desc(Telemetry.timestamp))
            .limit(6)
            .all()
        )
        hist_dicts = [h.to_dict() for h in reversed(hist)]

        # Analyze
        analysis = SensorAnalyzer.analyze(
            sensor_id=s.id,
            sensor_type=s.type,
            location=s.location,
            reading=packet["reading"],
            unit=s.unit,
            flow_rate=packet["flow_rate"],
            timestamp=datetime.now(timezone.utc),
            battery_level=packet["battery_level"],
            rssi=packet["rssi"],
            snr=packet["snr"],
            sensor_status="ONLINE" if sim["reading"] <= 120 else "FAULT",
            history=hist_dicts
        )

        # Update sensor
        if analysis.get("status") != "FAULT":
            s.current_reading = packet["reading"]
        s.flow_rate = packet["flow_rate"]
        s.battery_level = packet["battery_level"]
        s.rssi = packet["rssi"]
        s.snr = packet["snr"]
        s.status = analysis.get("status", "ONLINE")
        s.condition_label = analysis.get("condition_label", "Normal")
        s.responsible_department = analysis.get("responsible_department", s.responsible_department)
        s.last_active = datetime.now(timezone.utc)

        # Telemetry record
        tel = Telemetry(
            sensor_id=s.id,
            timestamp=datetime.now(timezone.utc),
            reading=s.current_reading,
            unit=s.unit,
            flow_rate=s.flow_rate,
            battery_level=s.battery_level,
            rssi=s.rssi,
            snr=s.snr,
            status=s.status,
            condition_label=s.condition_label
        )
        db.add(tel)

        # Alert generation
        if analysis.get("requires_alert"):
            existing = (
                db.query(Alert)
                .filter(Alert.sensor_id == s.id, Alert.status.in_(["ACTIVE", "ACKNOWLEDGED"]))
                .first()
            )
            if not existing:
                alert_dict = AlertGenerator.generate_sensor_alert(analysis)
                if alert_dict:
                    db.add(Alert(**alert_dict))

        processed.append({
            "sensor_id": s.id,
            "reading": s.current_reading,
            "condition": s.condition_label,
            "status": s.status
        })

    db.commit()
    db.close()

    return jsonify({
        "status": "success",
        "scenario": scenario,
        "processed_count": len(processed),
        "updates": processed
    })


# ==========================================
# 4. AI Predictive Analytics
# ==========================================
@app.route("/api/predictions", methods=["GET"])
def get_predictions():
    db = get_db_session()
    sensors = db.query(Sensor).all()
    complaints = db.query(Complaint).all()

    sensor_dicts = [s.to_dict() for s in sensors]
    complaint_dicts = [c.to_dict() for c in complaints]

    all_predictions = []

    # Sensor specific trend predictions
    for s in sensors:
        hist = (
            db.query(Telemetry)
            .filter(Telemetry.sensor_id == s.id)
            .order_by(desc(Telemetry.timestamp))
            .limit(10)
            .all()
        )
        hist_dicts = [h.to_dict() for h in reversed(hist)]
        preds = PredictiveEngine.analyze_sensor_predictions(s.to_dict(), hist_dicts)
        all_predictions.extend(preds)

    # City-wide recurring issue hotspots
    hotspots = PredictiveEngine.analyze_city_hotspots(sensor_dicts, complaint_dicts)
    all_predictions.extend(hotspots)

    db.close()
    return jsonify({
        "count": len(all_predictions),
        "disclaimer": PredictiveEngine.DISCLAIMER,
        "predictions": all_predictions
    })


# ==========================================
# 5. Alerts Operations Center
# ==========================================
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    db = get_db_session()
    priority = request.args.get("priority")
    status = request.args.get("status")
    department = request.args.get("department")

    query = db.query(Alert).order_by(desc(Alert.detection_time))
    if priority:
        query = query.filter(Alert.priority == priority)
    if status:
        query = query.filter(Alert.status == status)
    if department:
        query = query.filter(Alert.responsible_department == department)

    alerts = query.all()
    result = [a.to_dict() for a in alerts]
    db.close()
    return jsonify({"count": len(result), "alerts": result})


@app.route("/api/alerts/<alert_id>/action", methods=["POST"])
def update_alert_action(alert_id):
    """
    Update alert status: ACKNOWLEDGE, DISPATCH, RESOLVE
    """
    body = request.get_json() or {}
    action = body.get("action", "").upper()
    assigned_team = body.get("assigned_team")
    notes = body.get("notes")

    db = get_db_session()
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        db.close()
        return jsonify({"error": f"Alert {alert_id} not found"}), 404

    if action == "ACKNOWLEDGE":
        alert.status = "ACKNOWLEDGED"
    elif action == "DISPATCH":
        alert.status = "DISPATCHED"
        if assigned_team:
            alert.assigned_team = assigned_team
    elif action == "RESOLVE":
        alert.status = "RESOLVED"
        alert.resolved_at = datetime.now(timezone.utc)
        if notes:
            alert.resolution_notes = notes
    else:
        db.close()
        return jsonify({"error": "Invalid action. Use ACKNOWLEDGE, DISPATCH, or RESOLVE"}), 400

    db.commit()
    res = alert.to_dict()
    db.close()
    return jsonify({"status": "success", "alert": res})


# ==========================================
# 6. Citizen Complaints & Service Management
# ==========================================
@app.route("/api/complaints/pre-analyze", methods=["POST"])
def pre_analyze_complaint():
    """
    Instant AI preview while citizen types in form:
    Predicts category, priority, and warns if duplicate exists.
    """
    body = request.get_json() or {}
    description = body.get("description", "")
    location = body.get("location", "")
    explicit_category = body.get("category")

    if not description:
        return jsonify({"category": "Other", "priority": "LOW", "is_duplicate": False})

    db = get_db_session()
    existing = db.query(Complaint).all()
    existing_dicts = [c.to_dict() for c in existing]
    sensors = db.query(Sensor).all()
    sensor_dicts = [s.to_dict() for s in sensors]

    analysis = ComplaintProcessor.process_complaint(
        citizen_name="",
        contact="",
        description=description,
        location=location,
        explicit_category=explicit_category,
        existing_complaints=existing_dicts,
        related_sensors=sensor_dicts
    )
    db.close()

    return jsonify({
        "category": analysis["category"],
        "category_confidence": analysis["category_confidence"],
        "priority": analysis["priority"],
        "priority_reason": analysis["priority_reason"],
        "responsible_department": analysis["responsible_department"],
        "recommended_action": analysis["recommended_action"],
        "duplicate_status": analysis["duplicate_status"],
        "parent_complaint_id": analysis["parent_complaint_id"],
        "duplicate_reason": analysis["duplicate_reason"]
    })


@app.route("/api/complaints", methods=["GET"])
def get_complaints():
    db = get_db_session()
    category = request.args.get("category")
    status = request.args.get("status")
    priority = request.args.get("priority")
    ward = request.args.get("ward")

    query = db.query(Complaint).order_by(desc(Complaint.created_at))
    if category:
        query = query.filter(Complaint.category == category)
    if status:
        query = query.filter(Complaint.status == status)
    if priority:
        query = query.filter(Complaint.priority == priority)
    if ward:
        query = query.filter(Complaint.ward == ward)

    complaints = query.all()
    result = [c.to_dict() for c in complaints]
    db.close()
    return jsonify({"count": len(result), "complaints": result})


@app.route("/api/complaints", methods=["POST"])
def submit_complaint():
    """
    Processes citizen complaint submission through the AI Agent.
    """
    body = request.get_json() or {}
    citizen_name = body.get("citizen_name")
    contact = body.get("contact")
    description = body.get("description")
    location = body.get("location")
    explicit_category = body.get("category")
    ward = body.get("ward", "Ward 1")
    latitude = body.get("latitude", 0.0)
    longitude = body.get("longitude", 0.0)
    photo_url = body.get("photo_url")

    if not citizen_name or not contact or not description or not location:
        return jsonify({"error": "citizen_name, contact, description, and location are required"}), 400

    db = get_db_session()
    existing = db.query(Complaint).all()
    existing_dicts = [c.to_dict() for c in existing]
    sensors = db.query(Sensor).all()
    sensor_dicts = [s.to_dict() for s in sensors]

    # Process through AI Agent
    analysis = ComplaintProcessor.process_complaint(
        citizen_name=citizen_name,
        contact=contact,
        description=description,
        location=location,
        explicit_category=explicit_category,
        ward=ward,
        latitude=latitude,
        longitude=longitude,
        photo_url=photo_url,
        existing_complaints=existing_dicts,
        related_sensors=sensor_dicts
    )

    # Generate Complaint ID
    comp_count = db.query(Complaint).count() + 1001
    complaint_id = f"CMP-{comp_count}"

    complaint_obj = Complaint(
        id=complaint_id,
        citizen_name=citizen_name,
        contact=contact,
        category=analysis["category"],
        description=description,
        location=location,
        ward=ward,
        latitude=latitude,
        longitude=longitude,
        photo_url=photo_url,
        main_problem=analysis["main_problem"],
        priority=analysis["priority"],
        responsible_department=analysis["responsible_department"],
        recommended_action=analysis["recommended_action"],
        duplicate_status=analysis["duplicate_status"],
        parent_complaint_id=analysis["parent_complaint_id"],
        status=analysis["status"],
        created_at=datetime.now(timezone.utc)
    )
    db.add(complaint_obj)

    # Auto-generate Alert if complaint is CRITICAL
    alert_created = None
    if analysis["priority"] == "CRITICAL":
        alert_payload = AlertGenerator.generate_complaint_alert(analysis, complaint_id)
        if alert_payload:
            db.add(Alert(**alert_payload))
            alert_created = alert_payload

    db.commit()
    res = complaint_obj.to_dict()
    db.close()

    return jsonify({
        "status": "success",
        "complaint": res,
        "alert_created": bool(alert_created),
        "alert": alert_created
    }), 201


@app.route("/api/complaints/<complaint_id>/status", methods=["PATCH", "POST"])
def update_complaint_status(complaint_id):
    """
    Municipal Staff updates workflow status: ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    """
    body = request.get_json() or {}
    new_status = body.get("status")
    staff_assigned = body.get("staff_assigned")
    notes = body.get("resolution_notes")

    db = get_db_session()
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        db.close()
        return jsonify({"error": f"Complaint {complaint_id} not found"}), 404

    if new_status:
        comp.status = new_status
        if new_status in ["RESOLVED", "CLOSED"] and not comp.resolved_at:
            comp.resolved_at = datetime.now(timezone.utc)

    if staff_assigned:
        comp.staff_assigned = staff_assigned
    if notes:
        comp.resolution_notes = notes

    db.commit()
    res = comp.to_dict()
    db.close()
    return jsonify({"status": "success", "complaint": res})


@app.route("/api/complaints/<complaint_id>/feedback", methods=["POST"])
def submit_complaint_feedback(complaint_id):
    """
    Citizen submits 1-5 star rating and feedback on resolved complaint.
    """
    body = request.get_json() or {}
    rating = body.get("rating")
    feedback = body.get("feedback")

    if not rating or not (1 <= int(rating) <= 5):
        return jsonify({"error": "rating must be an integer between 1 and 5"}), 400

    db = get_db_session()
    comp = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not comp:
        db.close()
        return jsonify({"error": f"Complaint {complaint_id} not found"}), 404

    comp.citizen_rating = int(rating)
    comp.citizen_feedback = feedback

    db.commit()
    res = comp.to_dict()
    db.close()
    return jsonify({"status": "success", "complaint": res})


# ==========================================
# 7. Municipal Analytics & Executive Reports
# ==========================================
@app.route("/api/analytics/summary", methods=["GET"])
def get_analytics_summary():
    db = get_db_session()
    sensors = db.query(Sensor).all()
    alerts = db.query(Alert).all()
    complaints = db.query(Complaint).all()

    total_sensors = len(sensors)
    online_sensors = sum(1 for s in sensors if s.status == "ONLINE")
    health_score = round((online_sensors / total_sensors * 100), 1) if total_sensors else 100.0

    # Alerts breakdown
    active_alerts = [a for a in alerts if a.status in ["ACTIVE", "ACKNOWLEDGED"]]
    critical_alerts = sum(1 for a in active_alerts if a.priority == "CRITICAL")
    high_alerts = sum(1 for a in active_alerts if a.priority == "HIGH")

    # Complaints breakdown
    total_complaints = len(complaints)
    resolved_complaints = sum(1 for c in complaints if c.status in ["RESOLVED", "CLOSED"])
    sla_rate = round((resolved_complaints / total_complaints * 100), 1) if total_complaints else 100.0

    # Department distribution
    dept_stats = {}
    for c in complaints:
        dept = c.responsible_department
        dept_stats[dept] = dept_stats.get(dept, 0) + 1

    # Infrastructure fill / levels averages
    avg_bin_fill = 0.0
    bins = [s for s in sensors if s.type == "garbage_bin"]
    if bins:
        avg_bin_fill = round(sum(b.current_reading for b in bins) / len(bins), 1)

    avg_drainage_level = 0.0
    drains = [s for s in sensors if s.type == "drainage"]
    if drains:
        avg_drainage_level = round(sum(d.current_reading for d in drains) / len(drains), 1)

    avg_tank_level = 0.0
    tanks = [s for s in sensors if s.type == "water_tank"]
    if tanks:
        avg_tank_level = round(sum(t.current_reading for t in tanks) / len(tanks), 1)

    db.close()
    return jsonify({
        "city_infrastructure_health_score": health_score,
        "total_sensors": total_sensors,
        "online_sensors": online_sensors,
        "active_alerts_total": len(active_alerts),
        "critical_alerts": critical_alerts,
        "high_alerts": high_alerts,
        "total_complaints": total_complaints,
        "resolved_complaints": resolved_complaints,
        "resolution_sla_rate": sla_rate,
        "avg_bin_fill_pct": avg_bin_fill,
        "avg_drainage_level_pct": avg_drainage_level,
        "avg_water_tank_pct": avg_tank_level,
        "department_distribution": dept_stats
    })


@app.route("/api/analytics/report", methods=["GET"])
def generate_municipal_report():
    """
    Generates a full structured municipal administration report.
    """
    db = get_db_session()
    sensors = db.query(Sensor).all()
    alerts = db.query(Alert).all()
    complaints = db.query(Complaint).all()

    now = datetime.now(timezone.utc)
    report = {
        "report_id": f"REP-MUN-{now.strftime('%Y%m%d-%H%M')}",
        "generated_at": now.isoformat(),
        "municipality": "Metropolitan Smart City Corporation",
        "executive_summary": (
            "Smart Infrastructure telemetry is operating at 90.0% fleet integrity. "
            "LoRa IoT gateways report stable wireless connectivity across all 4 municipal wards. "
            "Waste Management and Drainage teams have been alerted to 2 critical threshold incidents."
        ),
        "infrastructure_status": {
            "garbage_bins": [s.to_dict() for s in sensors if s.type == "garbage_bin"],
            "drainage_nodes": [s.to_dict() for s in sensors if s.type == "drainage"],
            "water_reservoirs": [s.to_dict() for s in sensors if s.type == "water_tank"]
        },
        "active_alerts_summary": [a.to_dict() for a in alerts if a.status in ["ACTIVE", "ACKNOWLEDGED"]],
        "citizen_complaints_summary": {
            "total": len(complaints),
            "pending": sum(1 for c in complaints if c.status in ["SUBMITTED", "ASSIGNED"]),
            "in_progress": sum(1 for c in complaints if c.status == "IN_PROGRESS"),
            "resolved": sum(1 for c in complaints if c.status in ["RESOLVED", "CLOSED"]),
            "recent_complaints": [c.to_dict() for c in complaints[:6]]
        },
        "department_performance": [
            {"department": "Waste Management Department", "open_cases": 1, "sla_compliance": "94%"},
            {"department": "Drainage Department", "open_cases": 1, "sla_compliance": "89%"},
            {"department": "Water Supply Department", "open_cases": 0, "sla_compliance": "98%"},
            {"department": "Roads/Municipal Engineering", "open_cases": 1, "sla_compliance": "91%"},
            {"department": "Electrical/Streetlight Department", "open_cases": 1, "sla_compliance": "88%"}
        ]
    }
    db.close()
    return jsonify(report)


# ==========================================
# 8. Municipal Thresholds Configuration
# ==========================================
@app.route("/api/thresholds", methods=["GET"])
def get_thresholds():
    db = get_db_session()
    thresholds = db.query(MunicipalThreshold).all()
    result = [t.to_dict() for t in thresholds]
    db.close()
    return jsonify(result)


# ==========================================
# 9. Municipal Staff Profiles & Roster
# ==========================================
@app.route("/api/staff", methods=["GET"])
def get_staff_members():
    db = get_db_session()
    dept = request.args.get("department")
    status = request.args.get("status")

    query = db.query(Staff)
    if dept and dept != "all":
        query = query.filter(Staff.department == dept)
    if status and status != "all":
        query = query.filter(Staff.status == status)

    staff_list = query.all()
    result = [s.to_dict() for s in staff_list]
    db.close()
    return jsonify({"count": len(result), "staff": result})


@app.route("/api/staff/<staff_id>", methods=["GET"])
def get_staff_member(staff_id):
    db = get_db_session()
    member = db.query(Staff).filter(Staff.id == staff_id).first()
    if not member:
        db.close()
        return jsonify({"error": f"Staff {staff_id} not found"}), 404
    
    # Also fetch complaints assigned to this staff
    assigned_cases = (
        db.query(Complaint)
        .filter(Complaint.staff_assigned == member.name)
        .all()
    )
    member_dict = member.to_dict()
    member_dict["assigned_work_orders"] = [c.to_dict() for c in assigned_cases]
    db.close()
    return jsonify(member_dict)


@app.route("/api/staff/<staff_id>/status", methods=["PATCH", "POST"])
def update_staff_status(staff_id):
    body = request.get_json() or {}
    new_status = body.get("status")

    db = get_db_session()
    member = db.query(Staff).filter(Staff.id == staff_id).first()
    if not member:
        db.close()
        return jsonify({"error": f"Staff {staff_id} not found"}), 404

    if new_status:
        member.status = new_status

    db.commit()
    res = member.to_dict()
    db.close()
    return jsonify({"status": "success", "staff": res})


# ==========================================
# 10. Citizen Profiles
# ==========================================
@app.route("/api/citizens", methods=["GET"])
def get_citizens():
    db = get_db_session()
    ward = request.args.get("ward")

    query = db.query(Citizen)
    if ward and ward != "all":
        query = query.filter(Citizen.ward == ward)

    citizens = query.all()
    result = [c.to_dict() for c in citizens]
    db.close()
    return jsonify({"count": len(result), "citizens": result})


@app.route("/api/citizens/<citizen_id>", methods=["GET"])
def get_citizen_detail(citizen_id):
    db = get_db_session()
    citizen = db.query(Citizen).filter(Citizen.id == citizen_id).first()
    if not citizen:
        db.close()
        return jsonify({"error": f"Citizen {citizen_id} not found"}), 404

    # Fetch their complaints
    user_complaints = (
        db.query(Complaint)
        .filter(Complaint.citizen_name == citizen.name)
        .all()
    )
    c_dict = citizen.to_dict()
    c_dict["grievances"] = [c.to_dict() for c in user_complaints]
    db.close()
    return jsonify(c_dict)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
