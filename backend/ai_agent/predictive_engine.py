"""
Predictive Analysis Engine for Smart Municipal Infrastructure.
Analyzes time-series trends to forecast bin fill times, drainage overflows,
tank depletion, repeated infrastructure hotspots, and sensor degradation.
"""
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import math


class PredictiveEngine:
    """
    Generates probabilistic forecasts and recommendations based on municipal historical telemetry and events.
    Notice: All outputs are probabilistic AI predictions, not guaranteed facts.
    """

    DISCLAIMER = "Notice: AI predictions are probabilistic projections based on historical telemetry trends and not guaranteed facts."

    @classmethod
    def analyze_sensor_predictions(
        cls,
        sensor: Dict[str, Any],
        telemetry_history: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generates sensor-specific predictions (time-to-full, overflow risk, tank depletion, failure).
        """
        predictions = []
        sensor_type = sensor.get("type")
        current_reading = sensor.get("current_reading", 0.0)
        sensor_id = sensor.get("id", "UNKNOWN")
        location = sensor.get("location", "Unknown Location")

        if not telemetry_history or len(telemetry_history) < 2:
            return predictions

        # Sort history by timestamp ascending
        sorted_history = sorted(
            [h for h in telemetry_history if h.get("reading") is not None],
            key=lambda x: x.get("timestamp") or ""
        )

        if len(sorted_history) < 2:
            return predictions

        # Calculate rate of change per hour
        readings = [h["reading"] for h in sorted_history[-6:]]
        # Calculate simple slope between last readings
        diffs = [readings[i] - readings[i - 1] for i in range(1, len(readings))]
        avg_rate_per_step = sum(diffs) / len(diffs) if diffs else 0.0
        # Assume ~15 minutes per telemetry interval
        rate_per_hour = avg_rate_per_step * 4.0

        # --- 1. Garbage Bin: When bin will become full ---
        if sensor_type == "garbage_bin":
            if rate_per_hour > 0.5:
                remaining_capacity = max(0.0, 100.0 - current_reading)
                hours_to_full = remaining_capacity / rate_per_hour
                confidence = min(94, max(60, int(70 + len(readings) * 3 - abs(avg_rate_per_step) * 2)))

                if hours_to_full < 12:
                    predictions.append({
                        "sensor_id": sensor_id,
                        "type": "BIN_FULL_PREDICTION",
                        "title": f"Garbage Bin {sensor_id} Reaching 100% Capacity",
                        "prediction": f"Estimated to reach 100% capacity in approximately {hours_to_full:.1f} hours.",
                        "reason": f"Current fill level is {current_reading:.1f}% with an accumulation rate of +{rate_per_hour:.1f}%/hour over recent intervals.",
                        "confidence_level": f"{confidence}%",
                        "confidence_score": confidence,
                        "recommended_action": f"Dispatch waste collection vehicle to {location} within {math.ceil(hours_to_full)} hours to prevent overflow.",
                        "priority": "HIGH" if hours_to_full < 4 else "MEDIUM",
                        "disclaimer": cls.DISCLAIMER
                    })
            elif current_reading >= 85.0:
                predictions.append({
                    "sensor_id": sensor_id,
                    "type": "BIN_FULL_PREDICTION",
                    "title": f"Garbage Bin {sensor_id} Saturated",
                    "prediction": "Bin is currently saturated (>85%) and likely to reach overflow threshold soon under normal traffic.",
                    "reason": f"Current reading is {current_reading:.1f}%. Stable high load detected in commercial corridor.",
                    "confidence_level": "85%",
                    "confidence_score": 85,
                    "recommended_action": "Prioritize on upcoming route dispatch schedule.",
                    "priority": "HIGH",
                    "disclaimer": cls.DISCLAIMER
                })

        # --- 2 & 3. Drainage: Possible drainage overflow and blockage ---
        elif sensor_type == "drainage":
            flow_rate = sensor.get("flow_rate", 1.0)
            if rate_per_hour > 2.0:
                headroom = max(0.0, 100.0 - current_reading)
                hours_to_overflow = headroom / rate_per_hour
                confidence = min(92, max(65, int(68 + len(readings) * 3)))

                if hours_to_overflow < 8:
                    predictions.append({
                        "sensor_id": sensor_id,
                        "type": "DRAINAGE_OVERFLOW_PREDICTION",
                        "title": f"Drainage Overflow Imminent at {sensor_id}",
                        "prediction": f"Culvert water level predicted to reach surface overflow within {hours_to_overflow:.1f} hours.",
                        "reason": f"Water level rising rapidly at +{rate_per_hour:.1f}%/hour (currently at {current_reading:.1f}%).",
                        "confidence_level": f"{confidence}%",
                        "confidence_score": confidence,
                        "recommended_action": f"Deploy portable dewatering pumps to {location} and inspect downstream drainage outflow.",
                        "priority": "CRITICAL" if hours_to_overflow < 2 else "HIGH",
                        "disclaimer": cls.DISCLAIMER
                    })

            # Blockage prediction: rising level + stagnating or dropping flow rate
            if current_reading > 50.0 and flow_rate < 1.0 and rate_per_hour > 0.8:
                predictions.append({
                    "sensor_id": sensor_id,
                    "type": "DRAINAGE_BLOCKAGE_PREDICTION",
                    "title": f"Sub-surface Silt/Debris Blockage Forming at {sensor_id}",
                    "prediction": "High probability of mechanical blockage accumulating in the drainage conduit.",
                    "reason": f"Water depth is rising while outflow velocity is near zero ({flow_rate:.1f} L/s), characteristic of solid debris obstruction.",
                    "confidence_level": "82%",
                    "confidence_score": 82,
                    "recommended_action": "Dispatch Drainage Department jetting and rodding team to clear conduit.",
                    "priority": "HIGH",
                    "disclaimer": cls.DISCLAIMER
                })

        # --- 4 & 5. Water Tank: Depletion and Overflow ---
        elif sensor_type == "water_tank":
            flow_rate = sensor.get("flow_rate", 0.0)

            # Depletion prediction
            if rate_per_hour < -1.0 and current_reading < 40.0:
                hours_to_empty = current_reading / abs(rate_per_hour)
                confidence = min(90, max(70, int(72 + len(readings) * 2)))
                predictions.append({
                    "sensor_id": sensor_id,
                    "type": "TANK_DEPLETION_PREDICTION",
                    "title": f"Water Reservoir {sensor_id} Critical Depletion",
                    "prediction": f"Reservoir reserves predicted to deplete below 10% in approximately {hours_to_empty:.1f} hours.",
                    "reason": f"Sustained consumption outflow exceeding replenishment by -{abs(rate_per_hour):.1f}%/hour (current level {current_reading:.1f}%).",
                    "confidence_level": f"{confidence}%",
                    "confidence_score": confidence,
                    "recommended_action": "Engage auxiliary booster supply pump and alert regional water distribution controllers.",
                    "priority": "HIGH",
                    "disclaimer": cls.DISCLAIMER
                })

            # Overflow prediction
            if rate_per_hour > 2.0 and current_reading > 75.0:
                headroom = max(0.0, 100.0 - current_reading)
                hours_to_overflow = headroom / rate_per_hour
                predictions.append({
                    "sensor_id": sensor_id,
                    "type": "TANK_OVERFLOW_PREDICTION",
                    "title": f"Water Reservoir {sensor_id} Overflow Risk",
                    "prediction": f"Tank level projected to breach overflow limit in ~{hours_to_overflow:.1f} hours.",
                    "reason": f"Inlet inflow rate outpaces outflow. Current level is {current_reading:.1f}%.",
                    "confidence_level": "86%",
                    "confidence_score": 86,
                    "recommended_action": "Throttle inlet valve to 40% open to balance storage equilibrium.",
                    "priority": "HIGH",
                    "disclaimer": cls.DISCLAIMER
                })

        # --- 6. Sensor Failure Prediction: High variance / signal degradation ---
        battery = sensor.get("battery_level", 100.0)
        rssi = sensor.get("rssi", -75)

        if battery < 20.0 or rssi < -118:
            predictions.append({
                "sensor_id": sensor_id,
                "type": "SENSOR_FAILURE_PREDICTION",
                "title": f"Sensor Node {sensor_id} Hardware Degradation",
                "prediction": "Node likely to experience transmission dropouts within 48 hours.",
                "reason": f"Degraded telemetry signal (RSSI: {rssi} dBm) and low internal lithium cell charge ({battery:.1f}%).",
                "confidence_level": "89%",
                "confidence_score": 89,
                "recommended_action": f"Technical Department: Replace battery pack and check LoRa antenna alignment at {location}.",
                "priority": "MEDIUM",
                "disclaimer": cls.DISCLAIMER
            })

        return predictions

    @classmethod
    def analyze_city_hotspots(
        cls,
        all_sensors: List[Dict[str, Any]],
        all_complaints: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyzes repeated infrastructure problems and locations with frequent municipal issues.
        """
        hotspot_predictions = []

        # Count complaints per ward and category
        ward_counts: Dict[str, int] = {}
        ward_categories: Dict[str, Dict[str, int]] = {}

        for c in all_complaints:
            ward = c.get("ward", "General")
            cat = c.get("category", "General")
            ward_counts[ward] = ward_counts.get(ward, 0) + 1
            if ward not in ward_categories:
                ward_categories[ward] = {}
            ward_categories[ward][cat] = ward_categories[ward].get(cat, 0) + 1

        # Identify wards with frequent issues (>= 3 complaints)
        for ward, count in ward_counts.items():
            if count >= 3:
                top_category = max(ward_categories[ward].items(), key=lambda item: item[1])[0]
                hotspot_predictions.append({
                    "type": "REPEATED_INFRASTRUCTURE_HOTSPOT",
                    "title": f"Recurring Municipal Issues in {ward}",
                    "prediction": f"{ward} exhibits a 3.4x higher incident clustering probability over the next 14-day cycle.",
                    "reason": f"{count} citizen complaints and alerts logged in this sector, predominantly regarding '{top_category}'.",
                    "confidence_level": "78%",
                    "confidence_score": 78,
                    "recommended_action": f"Schedule comprehensive cross-departmental audit in {ward} focusing on {top_category} infrastructure.",
                    "priority": "MEDIUM",
                    "disclaimer": cls.DISCLAIMER
                })

        return hotspot_predictions
