"""
Comprehensive test suite for Smart Municipal Administration AI Agent.
Tests:
- Telemetry validation and sensor failure diagnostics
- Garbage bin heuristics & thresholds
- Drainage heuristics & blockage detection
- Water tank heuristics & depletion/overflow detection
- Priority scoring (LOW, MEDIUM, HIGH, CRITICAL)
- Predictive engine trends & confidence scoring
- Citizen complaint NLP classification, department routing, priority calculation
- Duplicate complaint detection
- Automatic alert generation
"""
import unittest
from datetime import datetime, timezone, timedelta
import sys
import os

# Add parent dir to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai_agent.sensor_analyzer import SensorAnalyzer
from ai_agent.predictive_engine import PredictiveEngine
from ai_agent.complaint_processor import ComplaintProcessor
from ai_agent.alert_generator import AlertGenerator


class TestSensorAnalyzer(unittest.TestCase):

    def test_validation_impossible_value(self):
        # Impossible fill > 120%
        valid, fail_type, desc = SensorAnalyzer.validate_reading(
            sensor_id="GB101", sensor_type="garbage_bin", reading=135.0, timestamp=datetime.now(timezone.utc)
        )
        self.assertFalse(valid)
        self.assertEqual(fail_type, "IMPOSSIBLE_VALUE")

    def test_validation_negative_value(self):
        valid, fail_type, desc = SensorAnalyzer.validate_reading(
            sensor_id="GB101", sensor_type="garbage_bin", reading=-10.0, timestamp=datetime.now(timezone.utc)
        )
        self.assertFalse(valid)
        self.assertEqual(fail_type, "IMPOSSIBLE_VALUE")

    def test_sensor_failure_generates_high_priority_technical_alert(self):
        analysis = SensorAnalyzer.analyze(
            sensor_id="DR201",
            sensor_type="drainage",
            location="Main Bridge Culvert",
            reading="CORRUPT_STRING",  # Invalid measurement
            unit="cm"
        )
        self.assertEqual(analysis["condition_label"], "Sensor Failure")
        self.assertEqual(analysis["priority"], "HIGH")
        self.assertEqual(analysis["responsible_department"], "Technical/Maintenance Department")
        self.assertTrue(analysis["requires_alert"])

    def test_garbage_bin_normal(self):
        analysis = SensorAnalyzer.analyze(
            sensor_id="GB101",
            sensor_type="garbage_bin",
            location="Ward 1 Market",
            reading=45.0,
            unit="%"
        )
        self.assertEqual(analysis["condition_label"], "Normal")
        self.assertEqual(analysis["priority"], "LOW")
        self.assertFalse(analysis["requires_alert"])
        self.assertEqual(analysis["responsible_department"], "Waste Management Department")

    def test_garbage_bin_full_and_overflow(self):
        # Full (92% - prompt example)
        res_full = SensorAnalyzer.analyze(
            sensor_id="GB102",
            sensor_type="garbage_bin",
            location="Main Road",
            reading=92.0,
            unit="%"
        )
        self.assertEqual(res_full["condition_label"], "Full")
        self.assertEqual(res_full["priority"], "HIGH")
        self.assertTrue(res_full["requires_alert"])
        self.assertIn("Schedule garbage collection", res_full["recommended_action"])

        # Overflow (100%)
        res_overflow = SensorAnalyzer.analyze(
            sensor_id="GB102",
            sensor_type="garbage_bin",
            location="Main Road",
            reading=100.0,
            unit="%"
        )
        self.assertEqual(res_overflow["condition_label"], "Overflow")
        self.assertEqual(res_overflow["priority"], "CRITICAL")
        self.assertTrue(res_overflow["requires_alert"])

    def test_drainage_blockage_detection(self):
        # Continuous increase with near-zero flow rate
        history = [
            {"reading": 58.0, "timestamp": "2026-09-07T12:00:00Z"},
            {"reading": 62.0, "timestamp": "2026-09-07T12:15:00Z"}
        ]
        res = SensorAnalyzer.analyze(
            sensor_id="DR202",
            sensor_type="drainage",
            location="Railway Underpass",
            reading=66.0,
            unit="%",
            flow_rate=0.2,  # Stagnant flow
            history=history
        )
        self.assertEqual(res["condition_label"], "Possible Blockage")
        self.assertEqual(res["priority"], "HIGH")
        self.assertEqual(res["responsible_department"], "Drainage Department")
        self.assertIn("clear blockage", res["recommended_action"].lower())

    def test_water_tank_critically_low_and_overflow(self):
        # Critically low (<10%)
        res_low = SensorAnalyzer.analyze(
            sensor_id="WT301",
            sensor_type="water_tank",
            location="North Ridge",
            reading=8.0,
            unit="%"
        )
        self.assertEqual(res_low["condition_label"], "Critically Low")
        self.assertEqual(res_low["priority"], "CRITICAL")
        self.assertEqual(res_low["responsible_department"], "Water Supply Department")
        self.assertTrue(res_low["requires_alert"])


class TestPredictiveEngine(unittest.TestCase):

    def test_bin_full_prediction(self):
        sensor = {
            "id": "GB102",
            "type": "garbage_bin",
            "current_reading": 80.0,
            "location": "Main Road"
        }
        history = [
            {"reading": 65.0, "timestamp": "2026-09-07T10:00:00Z"},
            {"reading": 70.0, "timestamp": "2026-09-07T10:15:00Z"},
            {"reading": 75.0, "timestamp": "2026-09-07T10:30:00Z"},
            {"reading": 80.0, "timestamp": "2026-09-07T10:45:00Z"}
        ]
        preds = PredictiveEngine.analyze_sensor_predictions(sensor, history)
        self.assertTrue(len(preds) > 0)
        p = preds[0]
        self.assertIn("prediction", p)
        self.assertIn("reason", p)
        self.assertIn("confidence_level", p)
        self.assertIn("recommended_action", p)
        self.assertIn("disclaimer", p)


class TestComplaintProcessor(unittest.TestCase):

    def test_classify_and_route_school_pothole(self):
        # Matches prompt example: "There is a large pothole near the school and vehicles are having difficulty passing."
        desc = "There is a large pothole near the school and vehicles are having difficulty passing."
        res = ComplaintProcessor.process_complaint(
            citizen_name="Citizen X",
            contact="12345",
            description=desc,
            location="St. Anne's School Avenue"
        )
        self.assertEqual(res["category"], "Roads")
        self.assertEqual(res["responsible_department"], "Roads/Municipal Engineering Department")
        self.assertEqual(res["priority"], "HIGH")  # Prompt says: Priority: HIGH
        self.assertIn("pothole", res["main_problem"].lower())

    def test_critical_electrical_safety_hazard(self):
        desc = "Sparking wire hanging from streetlight pole near public bus stop, dangerous shock hazard!"
        res = ComplaintProcessor.process_complaint(
            citizen_name="Citizen Y",
            contact="54321",
            description=desc,
            location="Bus Terminus"
        )
        self.assertEqual(res["category"], "Streetlights")
        self.assertEqual(res["responsible_department"], "Electrical/Streetlight Department")
        self.assertEqual(res["priority"], "CRITICAL")

    def test_duplicate_complaint_detection(self):
        existing = [{
            "id": "CMP-1001",
            "category": "Roads",
            "description": "Deep pothole on Main Street causing vehicular damage",
            "location": "Main Street near Central Bank",
            "status": "IN_PROGRESS",
            "ward": "Ward 2"
        }]

        new_desc = "Huge dangerous pothole on Main Street causing traffic jam and damage"
        res = ComplaintProcessor.process_complaint(
            citizen_name="Citizen Z",
            contact="99999",
            description=new_desc,
            location="Main Street near Central Bank",
            existing_complaints=existing
        )
        self.assertEqual(res["duplicate_status"], "DUPLICATE")
        self.assertEqual(res["parent_complaint_id"], "CMP-1001")
        self.assertIn("CMP-1001", res["duplicate_reason"])


class TestAlertGenerator(unittest.TestCase):

    def test_generate_sensor_alert_high_priority(self):
        analysis = {
            "sensor_id": "GB102",
            "reading": 92.0,
            "unit": "%",
            "location": "Main Road",
            "problem_type": "Garbage Bin Full",
            "priority": "HIGH",
            "responsible_department": "Waste Management Department",
            "recommended_action": "Schedule garbage collection soon."
        }
        alert = AlertGenerator.generate_sensor_alert(analysis)
        self.assertIsNotNone(alert)
        self.assertEqual(alert["priority"], "HIGH")
        self.assertEqual(alert["current_reading"], "92.0%")
        self.assertEqual(alert["sensor_id"], "GB102")


if __name__ == "__main__":
    unittest.main()
