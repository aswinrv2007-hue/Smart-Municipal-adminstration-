"""
Sensor Data Analysis and Anomaly Detection Engine for Smart Municipal Infrastructure.
Covers Garbage Bins, Drainage Systems, Water Tanks, and Sensor Failure Diagnostics.
"""
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple


class SensorAnalyzer:
    """
    Validates IoT LoRa sensor telemetry and performs rule-based and heuristics analysis.
    """

    # Configurable default thresholds
    GARBAGE_THRESHOLDS = {
        "nearly_full": 70.0,
        "full": 85.0,
        "overflow_risk": 95.0,
        "overflow": 100.0,
    }

    DRAINAGE_THRESHOLDS = {
        "rising": 50.0,
        "high": 75.0,
        "overflow_risk": 90.0,
        "overflow": 100.0,
    }

    WATER_TANK_THRESHOLDS = {
        "critically_low": 10.0,
        "low": 25.0,
        "high": 85.0,
        "overflow_risk": 95.0,
        "overflow": 100.0,
    }

    @staticmethod
    def validate_reading(
        sensor_id: str,
        sensor_type: str,
        reading: Any,
        timestamp: Optional[datetime],
        battery_level: Optional[float] = None,
        rssi: Optional[int] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validates the incoming sensor telemetry.
        Returns: (is_valid, failure_type, error_description)
        """
        # 1. Missing values
        if reading is None:
            return False, "MISSING_DATA", f"Missing reading payload for sensor {sensor_id}"

        # 2. Invalid numeric format
        try:
            val = float(reading)
        except (ValueError, TypeError):
            return False, "INVALID_VALUE", f"Non-numeric measurement '{reading}' from sensor {sensor_id}"

        # 3. Impossible measurements check
        if val < 0.0 or val > 120.0:  # Sensor percentage cannot be negative or absurdly high
            return False, "IMPOSSIBLE_VALUE", f"Impossible measurement {val}% outside physical bounds [0, 120]"

        # 4. Outdated timestamps check (> 24 hours old or future by > 1 hour)
        if timestamp:
            now = datetime.now(timezone.utc)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            
            diff_hours = (now - timestamp).total_seconds() / 3600.0
            if diff_hours > 24.0:
                return False, "OUTDATED_TIMESTAMP", f"Telemetry timestamp is outdated by {diff_hours:.1f} hours"
            if diff_hours < -1.0:
                return False, "FUTURE_TIMESTAMP", "Telemetry timestamp is in the future"

        # 5. Communication problems (Weak LoRa signal)
        if rssi is not None and rssi < -128:
            return False, "COMMUNICATION_FAILURE", f"Critical LoRa packet degradation (RSSI {rssi} dBm)"

        # 6. Dead battery
        if battery_level is not None and battery_level <= 0.0:
            return False, "OFFLINE_SENSOR", f"Sensor {sensor_id} battery completely depleted (0%)"

        # 7. Repeated identical readings (stuck sensor anomaly)
        if history and len(history) >= 5:
            last_readings = [h.get("reading") for h in history[-5:] if h.get("reading") is not None]
            if len(last_readings) == 5 and all(abs(r - val) < 0.001 for r in last_readings):
                # Only abnormal if not permanently 0 or 100 with zero variance over dynamic conditions
                return False, "STUCK_SENSOR", f"Sensor {sensor_id} has produced 6 identical consecutive readings ({val})"

        # 8. Sudden unexplained massive jump (e.g., jump of > 65% in a single telemetry cycle)
        if history and len(history) >= 1:
            last_val = history[-1].get("reading")
            if last_val is not None:
                delta = abs(val - last_val)
                if delta > 65.0:
                    return False, "SUDDEN_SPIKE", f"Erratic jump of {delta:.1f}% detected from previous reading {last_val:.1f}%"

        return True, None, None

    @classmethod
    def analyze(
        cls,
        sensor_id: str,
        sensor_type: str,
        location: str,
        reading: float,
        unit: str = "%",
        flow_rate: float = 0.0,
        timestamp: Optional[datetime] = None,
        battery_level: float = 100.0,
        rssi: int = -75,
        snr: float = 8.0,
        sensor_status: str = "ONLINE",
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive analysis pipeline for an incoming telemetry packet.
        """
        # Step 1: Validation
        is_valid, failure_type, failure_desc = cls.validate_reading(
            sensor_id=sensor_id,
            sensor_type=sensor_type,
            reading=reading,
            timestamp=timestamp,
            battery_level=battery_level,
            rssi=rssi,
            history=history
        )

        # Step 2: Handle Sensor Failure
        if not is_valid:
            return {
                "sensor_id": sensor_id,
                "sensor_type": sensor_type,
                "location": location,
                "reading": reading,
                "unit": unit,
                "condition_label": "Sensor Failure",
                "priority": "HIGH",
                "responsible_department": "Technical/Maintenance Department",
                "recommended_action": f"Inspect and repair the sensor or communication system. Reason: {failure_desc}",
                "requires_alert": True,
                "alert_priority": "HIGH",
                "problem_type": f"Sensor Failure ({failure_type})",
                "status": "FAULT",
                "details": failure_desc
            }

        if sensor_status == "OFFLINE":
            return {
                "sensor_id": sensor_id,
                "sensor_type": sensor_type,
                "location": location,
                "reading": reading,
                "unit": unit,
                "condition_label": "Sensor Offline",
                "priority": "HIGH",
                "responsible_department": "Technical/Maintenance Department",
                "recommended_action": "Sensor is offline. Inspect battery power, LoRa gateway connectivity, and field node.",
                "requires_alert": True,
                "alert_priority": "HIGH",
                "problem_type": "Sensor Offline",
                "status": "OFFLINE",
                "details": "Gateway missed 3+ consecutive telemetry check-ins."
            }

        # Step 3: Type-specific operational evaluation
        val = float(reading)

        if sensor_type == "garbage_bin":
            return cls._analyze_garbage_bin(sensor_id, location, val, unit, history)
        elif sensor_type == "drainage":
            return cls._analyze_drainage(sensor_id, location, val, unit, flow_rate, history)
        elif sensor_type == "water_tank":
            return cls._analyze_water_tank(sensor_id, location, val, unit, flow_rate, history)
        else:
            return {
                "sensor_id": sensor_id,
                "sensor_type": sensor_type,
                "location": location,
                "reading": val,
                "unit": unit,
                "condition_label": "Normal",
                "priority": "LOW",
                "responsible_department": "General Municipal Administration",
                "recommended_action": "Continue monitoring",
                "requires_alert": False,
                "alert_priority": "LOW",
                "problem_type": "None",
                "status": "ONLINE"
            }

    @classmethod
    def _analyze_garbage_bin(
        cls, sensor_id: str, location: str, fill: float, unit: str, history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Garbage Bin Analysis
        Responsible Department: Waste Management Department
        """
        dept = "Waste Management Department"
        requires_alert = False
        alert_priority = "LOW"
        problem_type = "None"
        status = "ONLINE"

        if fill >= cls.GARBAGE_THRESHOLDS["overflow"]:
            condition = "Overflow"
            priority = "CRITICAL"
            action = "Send collection vehicle immediately to empty overflowing bin."
            requires_alert = True
            alert_priority = "CRITICAL"
            problem_type = "Garbage Bin Overflow"
            status = "CRITICAL"
        elif fill >= cls.GARBAGE_THRESHOLDS["overflow_risk"]:
            condition = "Overflow Risk"
            priority = "HIGH"
            action = "Send collection vehicle urgently; bin will overflow within hours."
            requires_alert = True
            alert_priority = "HIGH"
            problem_type = "Garbage Bin Overflow Risk"
            status = "WARNING"
        elif fill >= cls.GARBAGE_THRESHOLDS["full"]:
            condition = "Full"
            priority = "HIGH"
            action = "Schedule garbage collection route to clear bin today."
            requires_alert = True
            alert_priority = "HIGH"
            problem_type = "Garbage Bin Full"
            status = "WARNING"
        elif fill >= cls.GARBAGE_THRESHOLDS["nearly_full"]:
            condition = "Nearly Full"
            priority = "MEDIUM"
            action = "Schedule garbage collection on next routine route."
            requires_alert = False  # Normal or medium non-critical
            status = "ONLINE"
        else:
            condition = "Normal"
            priority = "LOW"
            action = "Continue monitoring."
            requires_alert = False
            status = "ONLINE"

        return {
            "sensor_id": sensor_id,
            "sensor_type": "garbage_bin",
            "location": location,
            "reading": fill,
            "unit": unit,
            "condition_label": condition,
            "priority": priority,
            "responsible_department": dept,
            "recommended_action": action,
            "requires_alert": requires_alert,
            "alert_priority": alert_priority,
            "problem_type": problem_type,
            "status": status
        }

    @classmethod
    def _analyze_drainage(
        cls,
        sensor_id: str,
        location: str,
        water_level: float,
        unit: str,
        flow_rate: float,
        history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Drainage Analysis
        Responsible Department: Drainage Department
        """
        dept = "Drainage Department"
        requires_alert = False
        alert_priority = "LOW"
        problem_type = "None"
        status = "ONLINE"

        # Rate of change and blockage evaluation
        is_rising = False
        is_blockage = False

        if history and len(history) >= 2:
            prev_reading = history[-1].get("reading", water_level)
            delta = water_level - prev_reading
            if delta > 1.5:  # Rising significantly
                is_rising = True

            # Blockage logic: If water level is rising continuously or already high while flow rate is stagnant / near zero
            if water_level >= 55.0 and flow_rate <= 1.0 and delta >= 0.5:
                is_blockage = True

        if water_level >= cls.DRAINAGE_THRESHOLDS["overflow"]:
            condition = "Overflow"
            priority = "CRITICAL"
            action = "Take urgent action: Deploy emergency pumps and maintenance crew to prevent road waterlogging."
            requires_alert = True
            alert_priority = "CRITICAL"
            problem_type = "Drainage Overflow"
            status = "CRITICAL"
        elif water_level >= cls.DRAINAGE_THRESHOLDS["overflow_risk"]:
            condition = "Overflow Risk"
            priority = "CRITICAL"
            action = "Take urgent action when overflow is likely. Send maintenance team with dewatering pumps."
            requires_alert = True
            alert_priority = "CRITICAL"
            problem_type = "Drainage Overflow Risk"
            status = "CRITICAL"
        elif is_blockage:
            condition = "Possible Blockage"
            priority = "HIGH"
            action = "Inspect drainage and clear blockage. Flow rate dropped despite rising water level."
            requires_alert = True
            alert_priority = "HIGH"
            problem_type = "Drainage Blockage Detected"
            status = "WARNING"
        elif water_level >= cls.DRAINAGE_THRESHOLDS["high"]:
            condition = "High Water Level"
            priority = "HIGH"
            action = "Send maintenance team to inspect drainage outflow."
            requires_alert = True
            alert_priority = "HIGH"
            problem_type = "High Drainage Level"
            status = "WARNING"
        elif water_level >= cls.DRAINAGE_THRESHOLDS["rising"] or is_rising:
            condition = "Rising Water Level"
            priority = "MEDIUM"
            action = "Continue monitoring drainage levels; inspect for early silt accumulation."
            requires_alert = False
            status = "ONLINE"
        else:
            condition = "Normal"
            priority = "LOW"
            action = "Continue monitoring."
            requires_alert = False
            status = "ONLINE"

        return {
            "sensor_id": sensor_id,
            "sensor_type": "drainage",
            "location": location,
            "reading": water_level,
            "unit": unit,
            "flow_rate": flow_rate,
            "condition_label": condition,
            "priority": priority,
            "responsible_department": dept,
            "recommended_action": action,
            "requires_alert": requires_alert,
            "alert_priority": alert_priority,
            "problem_type": problem_type,
            "status": status
        }

    @classmethod
    def _analyze_water_tank(
        cls,
        sensor_id: str,
        location: str,
        tank_level: float,
        unit: str,
        flow_rate: float,
        history: Optional[List[Dict[str, Any]]]
    ) -> Dict[str, Any]:
        """
        Water Tank Analysis
        Responsible Department: Water Supply Department
        """
        dept = "Water Supply Department"
        requires_alert = False
        alert_priority = "LOW"
        problem_type = "None"
        status = "ONLINE"

        if tank_level >= cls.WATER_TANK_THRESHOLDS["overflow"]:
            condition = "Overflow"
            priority = "CRITICAL"
            action = "Shut inlet valve immediately to prevent municipal water reservoir overflow and wastage."
            requires_alert = True
            alert_priority = "CRITICAL"
            problem_type = "Water Tank Overflow"
            status = "CRITICAL"
        elif tank_level >= cls.WATER_TANK_THRESHOLDS["overflow_risk"]:
            condition = "Overflow Risk"
            priority = "HIGH"
            action = "Check inlet/outlet and prevent overflow. Modulate supply feeder valve."
            requires_alert = True
            alert_priority = "HIGH"
            problem_type = "Water Tank Overflow Risk"
            status = "WARNING"
        elif tank_level <= cls.WATER_TANK_THRESHOLDS["critically_low"]:
            condition = "Critically Low"
            priority = "CRITICAL"
            action = "Urgent: Schedule emergency water supply. Water reserves depleted below 10%."
            requires_alert = True
            alert_priority = "CRITICAL"
            problem_type = "Water Supply Depletion (Critically Low)"
            status = "CRITICAL"
        elif tank_level <= cls.WATER_TANK_THRESHOLDS["low"]:
            condition = "Low Level"
            priority = "MEDIUM"
            action = "Check water supply schedule and plan booster pump replenishment."
            requires_alert = False
            status = "ONLINE"
        elif tank_level >= cls.WATER_TANK_THRESHOLDS["high"]:
            condition = "High Level"
            priority = "LOW"
            action = "Reservoir well replenished. Continue monitoring inlet flow."
            requires_alert = False
            status = "ONLINE"
        else:
            condition = "Normal"
            priority = "LOW"
            action = "Continue monitoring."
            requires_alert = False
            status = "ONLINE"

        return {
            "sensor_id": sensor_id,
            "sensor_type": "water_tank",
            "location": location,
            "reading": tank_level,
            "unit": unit,
            "flow_rate": flow_rate,
            "condition_label": condition,
            "priority": priority,
            "responsible_department": dept,
            "recommended_action": action,
            "requires_alert": requires_alert,
            "alert_priority": alert_priority,
            "problem_type": problem_type,
            "status": status
        }
