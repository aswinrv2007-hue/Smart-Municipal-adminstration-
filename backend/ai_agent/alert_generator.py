"""
Automatic Alert Generator and Lifecycle Manager for Smart Municipal Operations.
Creates structured HIGH and CRITICAL alerts for sensor anomalies and critical citizen reports.
"""
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import uuid


class AlertGenerator:
    """
    Manages automated alert generation and deduplication.
    """

    @staticmethod
    def generate_sensor_alert(analysis_result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Creates an alert if the condition is HIGH or CRITICAL.
        Returns None if condition is normal or low/medium.
        """
        priority = analysis_result.get("priority")
        if priority not in ["HIGH", "CRITICAL"]:
            return None

        sensor_id = analysis_result.get("sensor_id")
        reading_val = analysis_result.get("reading")
        unit = analysis_result.get("unit", "%")
        location = analysis_result.get("location", "Unknown Location")
        problem_type = analysis_result.get("problem_type") or analysis_result.get("condition_label", "Abnormal Condition")
        action = analysis_result.get("recommended_action", "Investigate immediately.")
        dept = analysis_result.get("responsible_department", "General Municipal Administration")

        # Format human-friendly current reading string
        if reading_val is not None:
            reading_str = f"{reading_val}{unit}"
        else:
            reading_str = "N/A (Offline/Fault)"

        alert_id = f"ALT-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        return {
            "id": alert_id,
            "problem_type": problem_type,
            "location": location,
            "latitude": float(analysis_result.get("latitude", 12.9716)),
            "longitude": float(analysis_result.get("longitude", 77.5946)),
            "sensor_id": sensor_id,
            "current_reading": reading_str,
            "priority": priority,
            "responsible_department": dept,
            "recommended_action": action,
            "detection_time": datetime.now(timezone.utc),
            "status": "ACTIVE",
            "assigned_team": None,
            "resolution_notes": None
        }

    @staticmethod
    def generate_complaint_alert(complaint_result: Dict[str, Any], complaint_id: str) -> Optional[Dict[str, Any]]:
        """
        Creates an alert when a CRITICAL citizen complaint is lodged (e.g. live electrical hazard or cave-in).
        """
        priority = complaint_result.get("priority")
        if priority != "CRITICAL":
            return None

        alert_id = f"ALT-CITIZEN-{datetime.now(timezone.utc).strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        return {
            "id": alert_id,
            "problem_type": f"Critical Citizen Incident: {complaint_result.get('main_problem')}",
            "location": complaint_result.get("location"),
            "latitude": float(complaint_result.get("latitude", 12.9716)),
            "longitude": float(complaint_result.get("longitude", 77.5946)),
            "sensor_id": None,
            "current_reading": f"Complaint Ref: {complaint_id}",
            "priority": "CRITICAL",
            "responsible_department": complaint_result.get("responsible_department"),
            "recommended_action": complaint_result.get("recommended_action"),
            "detection_time": datetime.now(timezone.utc),
            "status": "ACTIVE",
            "assigned_team": None,
            "resolution_notes": None
        }
