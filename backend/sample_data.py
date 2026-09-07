"""
Seed data generator with realistic municipal infrastructure, sensors,
telemetry series, active complaints, alerts, and thresholds.
"""
from datetime import datetime, timezone, timedelta
from database import (
    SessionLocal, Sensor, Telemetry, Alert, Complaint, MunicipalThreshold,
    Staff, Citizen, init_db
)


def seed_database():
    init_db()
    db = SessionLocal()

    # Check if data already exists
    if db.query(Sensor).count() > 0:
        db.close()
        return

    now = datetime.now(timezone.utc)

    # 1. Configurable Municipal Thresholds
    thresholds = [
        MunicipalThreshold(sensor_type="garbage_bin", warning_threshold=70.0, critical_threshold=95.0, unit="%"),
        MunicipalThreshold(sensor_type="drainage", warning_threshold=50.0, critical_threshold=90.0, unit="%"),
        MunicipalThreshold(sensor_type="water_tank", warning_threshold=25.0, critical_threshold=10.0, unit="%")
    ]
    db.add_all(thresholds)

    # 2. Sensors
    sensors_data = [
        # Garbage Bins
        {
            "id": "GB101",
            "name": "Central Market Bin #1",
            "type": "garbage_bin",
            "location": "Market Square, Ward 1",
            "ward": "Ward 1",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "current_reading": 62.0,
            "unit": "%",
            "battery_level": 94.0,
            "rssi": -72,
            "snr": 9.2,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Waste Management Department"
        },
        {
            "id": "GB102",
            "name": "Main Road Commercial Bin",
            "type": "garbage_bin",
            "location": "Main Road Commercial Corridor, Ward 2",
            "ward": "Ward 2",
            "latitude": 12.9754,
            "longitude": 77.6012,
            "current_reading": 92.0,  # Prompt example: 92% full
            "unit": "%",
            "battery_level": 88.0,
            "rssi": -78,
            "snr": 8.0,
            "status": "WARNING",
            "condition_label": "Full",
            "responsible_department": "Waste Management Department"
        },
        {
            "id": "GB103",
            "name": "Civic Hospital Gate Bin",
            "type": "garbage_bin",
            "location": "Hospital Road, Ward 3",
            "ward": "Ward 3",
            "latitude": 12.9680,
            "longitude": 77.6080,
            "current_reading": 45.0,
            "unit": "%",
            "battery_level": 97.0,
            "rssi": -69,
            "snr": 10.5,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Waste Management Department"
        },
        {
            "id": "GB104",
            "name": "Metro Station Transit Bin",
            "type": "garbage_bin",
            "location": "Metro Station Exit 2, Ward 1",
            "ward": "Ward 1",
            "latitude": 12.9730,
            "longitude": 77.5980,
            "current_reading": 78.0,
            "unit": "%",
            "battery_level": 91.0,
            "rssi": -74,
            "snr": 8.5,
            "status": "ONLINE",
            "condition_label": "Nearly Full",
            "responsible_department": "Waste Management Department"
        },

        # Drainage Nodes
        {
            "id": "DR201",
            "name": "Sector 4 Stormwater Culvert",
            "type": "drainage",
            "location": "4th Cross Main Culvert, Ward 2",
            "ward": "Ward 2",
            "latitude": 12.9770,
            "longitude": 77.6050,
            "current_reading": 42.0,
            "unit": "%",
            "flow_rate": 3.8,
            "battery_level": 92.0,
            "rssi": -80,
            "snr": 7.4,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Drainage Department"
        },
        {
            "id": "DR202",
            "name": "Railway Underpass Low-lying Drain",
            "type": "drainage",
            "location": "Underpass Channel, Ward 1",
            "ward": "Ward 1",
            "latitude": 12.9695,
            "longitude": 77.5920,
            "current_reading": 79.0,
            "unit": "%",
            "flow_rate": 0.4,  # High level + low flow -> blockage risk
            "battery_level": 89.0,
            "rssi": -84,
            "snr": 6.8,
            "status": "WARNING",
            "condition_label": "High Water Level",
            "responsible_department": "Drainage Department"
        },
        {
            "id": "DR203",
            "name": "Industrial Outfall Sump",
            "type": "drainage",
            "location": "East Industrial Canal, Ward 4",
            "ward": "Ward 4",
            "latitude": 12.9810,
            "longitude": 77.6150,
            "current_reading": 28.0,
            "unit": "%",
            "flow_rate": 4.5,
            "battery_level": 95.0,
            "rssi": -71,
            "snr": 9.8,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Drainage Department"
        },

        # Water Tanks / Reservoirs
        {
            "id": "WT301",
            "name": "Hilltop Primary Reservoir",
            "type": "water_tank",
            "location": "North Ridge Heights, Ward 2",
            "ward": "Ward 2",
            "latitude": 12.9850,
            "longitude": 77.5990,
            "current_reading": 68.0,
            "unit": "%",
            "flow_rate": 6.2,
            "battery_level": 96.0,
            "rssi": -66,
            "snr": 11.2,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Water Supply Department"
        },
        {
            "id": "WT302",
            "name": "Community Overhead Tank #4",
            "type": "water_tank",
            "location": "Community Center Complex, Ward 4",
            "ward": "Ward 4",
            "latitude": 12.9790,
            "longitude": 77.6180,
            "current_reading": 18.0,
            "unit": "%",
            "flow_rate": 1.2,
            "battery_level": 90.0,
            "rssi": -76,
            "snr": 8.1,
            "status": "ONLINE",
            "condition_label": "Low Level",
            "responsible_department": "Water Supply Department"
        },
        {
            "id": "WT303",
            "name": "Hospital Zone Emergency Water Reserve",
            "type": "water_tank",
            "location": "Civic Hospital Campus, Ward 3",
            "ward": "Ward 3",
            "latitude": 12.9675,
            "longitude": 77.6095,
            "current_reading": 82.0,
            "unit": "%",
            "flow_rate": 5.0,
            "battery_level": 98.0,
            "rssi": -68,
            "snr": 10.9,
            "status": "ONLINE",
            "condition_label": "Normal",
            "responsible_department": "Water Supply Department"
        }
    ]

    sensor_objs = []
    for s_info in sensors_data:
        sensor = Sensor(
            id=s_info["id"],
            name=s_info["name"],
            type=s_info["type"],
            location=s_info["location"],
            ward=s_info["ward"],
            latitude=s_info["latitude"],
            longitude=s_info["longitude"],
            current_reading=s_info["current_reading"],
            unit=s_info["unit"],
            flow_rate=s_info.get("flow_rate", 0.0),
            battery_level=s_info["battery_level"],
            rssi=s_info["rssi"],
            snr=s_info["snr"],
            status=s_info["status"],
            condition_label=s_info["condition_label"],
            responsible_department=s_info["responsible_department"],
            last_active=now
        )
        sensor_objs.append(sensor)
    db.add_all(sensor_objs)

    # 3. Telemetry Time-series (last 6 steps for each sensor)
    telemetry_objs = []
    for s in sensors_data:
        base_val = s["current_reading"]
        for i in range(6, 0, -1):
            t_time = now - timedelta(minutes=15 * i)
            # simulate progressive filling or slight variance
            val = max(5.0, min(100.0, base_val - (i * 1.8)))
            t_obj = Telemetry(
                sensor_id=s["id"],
                timestamp=t_time,
                reading=round(val, 1),
                unit=s["unit"],
                flow_rate=s.get("flow_rate", 0.0),
                battery_level=s["battery_level"],
                rssi=s["rssi"],
                snr=s["snr"],
                status="ONLINE",
                condition_label="Normal"
            )
            telemetry_objs.append(t_obj)
    db.add_all(telemetry_objs)

    # 4. Initial Alert (Garbage Bin GB102 example from prompt specification)
    alerts_data = [
        Alert(
            id="ALT-260907-GB102",
            problem_type="Garbage Bin Full",
            location="Main Road Commercial Corridor, Ward 2",
            latitude=12.9754,
            longitude=77.6012,
            sensor_id="GB102",
            current_reading="92%",
            priority="HIGH",
            responsible_department="Waste Management Department",
            recommended_action="Schedule garbage collection soon.",
            detection_time=now - timedelta(minutes=35),
            status="ACTIVE",
            assigned_team="Rapid Sanitation Unit 3",
            resolution_notes=None
        ),
        Alert(
            id="ALT-260907-DR202",
            problem_type="High Drainage Level",
            location="Underpass Channel, Ward 1",
            latitude=12.9695,
            longitude=77.5920,
            sensor_id="DR202",
            current_reading="79%",
            priority="HIGH",
            responsible_department="Drainage Department",
            recommended_action="Send maintenance team to inspect drainage outflow and clear early silt.",
            detection_time=now - timedelta(minutes=18),
            status="ACTIVE",
            assigned_team=None,
            resolution_notes=None
        )
    ]
    db.add_all(alerts_data)

    # 4.5. Staff Profiles (Municipal Officers & Field Technicians)
    staff_data = [
        Staff(
            id="STF-101",
            name="Engineer V. Kumar",
            role="Senior Roads & Civil Infrastructure Engineer",
            department="Roads/Municipal Engineering Department",
            phone="+91 98450 11223",
            email="v.kumar@smartcity.gov",
            ward="Ward 2",
            status="ON_DUTY",
            rating=4.9,
            completed_cases=48,
            active_cases_count=1,
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop"
        ),
        Staff(
            id="STF-102",
            name="Technician S. Murthy",
            role="High-Voltage Electrical Grid Specialist",
            department="Electrical/Streetlight Department",
            phone="+91 98860 33445",
            email="s.murthy@smartcity.gov",
            ward="Ward 1",
            status="DISPATCHED",
            rating=4.8,
            completed_cases=62,
            active_cases_count=1,
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop"
        ),
        Staff(
            id="STF-103",
            name="Inspector Ramesh",
            role="Chief Municipal Water Distribution Inspector",
            department="Water Supply Department",
            phone="+91 97410 22334",
            email="ramesh.water@smartcity.gov",
            ward="Ward 4",
            status="AVAILABLE",
            rating=4.9,
            completed_cases=55,
            active_cases_count=0,
            avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop"
        ),
        Staff(
            id="STF-104",
            name="Lead Priya Sharma",
            role="Fleet Sanitation & Solid Waste Supervisor",
            department="Waste Management Department",
            phone="+91 98455 77889",
            email="priya.sanitation@smartcity.gov",
            ward="Ward 2",
            status="ON_DUTY",
            rating=4.7,
            completed_cases=73,
            active_cases_count=1,
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop"
        ),
        Staff(
            id="STF-105",
            name="Specialist Anand Rao",
            role="Culvert Dewatering & Flood Prevention Lead",
            department="Drainage Department",
            phone="+91 99002 44556",
            email="anand.drainage@smartcity.gov",
            ward="Ward 1",
            status="DISPATCHED",
            rating=4.9,
            completed_cases=41,
            active_cases_count=1,
            avatar_url="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop"
        ),
        Staff(
            id="STF-106",
            name="Engineer Arvind Das",
            role="Smart IoT Field Node & Telemetry Lead",
            department="Technical/Maintenance Department",
            phone="+91 98800 66778",
            email="arvind.iot@smartcity.gov",
            ward="All Wards",
            status="AVAILABLE",
            rating=5.0,
            completed_cases=89,
            active_cases_count=0,
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop"
        )
    ]
    db.add_all(staff_data)

    # 4.6. Citizen Profiles (Registered Municipal Citizens)
    citizens_data = [
        Citizen(
            id="CTZ-501",
            name="Rajesh Sharma",
            contact="+91 98450 12345",
            email="rajesh.sharma@example.com",
            ward="Ward 2",
            address="14, 5th Cross, St. Anne's Road",
            reputation_score=98,
            total_reported=4,
            avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop"
        ),
        Citizen(
            id="CTZ-502",
            name="Ananya Verma",
            contact="+91 98860 67890",
            email="ananya.verma@example.com",
            ward="Ward 1",
            address="88, 3rd Cross Street, Downtown",
            reputation_score=92,
            total_reported=2,
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop"
        ),
        Citizen(
            id="CTZ-503",
            name="David Fernandez",
            contact="+91 97410 54321",
            email="david.f@merchants.org",
            ward="Ward 2",
            address="Shop 12, Main Road Commercial Corridor",
            reputation_score=90,
            total_reported=3,
            avatar_url="https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop"
        ),
        Citizen(
            id="CTZ-504",
            name="Priya Patel",
            contact="+91 99001 11223",
            email="priya.p@example.com",
            ward="Ward 4",
            address="Flat 402, Block B Housing Colony",
            reputation_score=96,
            total_reported=1,
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop"
        )
    ]
    db.add_all(citizens_data)

    # 5. Initial Citizen Complaints
    complaints_data = [
        Complaint(
            id="CMP-1001",
            citizen_name="Rajesh Sharma",
            contact="+91 98450 12345",
            category="Roads",
            description="There is a large pothole near the school and vehicles are having difficulty passing.",
            location="St. Anne's School Road, Ward 2",
            ward="Ward 2",
            latitude=12.9760,
            longitude=77.6020,
            photo_url="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop",
            main_problem="Large pothole near school",
            priority="HIGH",
            responsible_department="Roads/Municipal Engineering Department",
            recommended_action="Inspect and repair the road with cold asphalt patch.",
            duplicate_status="ORIGINAL",
            parent_complaint_id=None,
            status="IN_PROGRESS",
            created_at=now - timedelta(hours=3),
            staff_assigned="Engineer V. Kumar",
            resolution_notes="Patch crew dispatched with asphalt mixer."
        ),
        Complaint(
            id="CMP-1002",
            citizen_name="Ananya Verma",
            contact="+91 98860 67890",
            category="Streetlights",
            description="Sparking wire and broken streetlight fixture on 3rd Cross Street, posing shock danger in the dark.",
            location="3rd Cross Street, Ward 1",
            ward="Ward 1",
            latitude=12.9720,
            longitude=77.5950,
            photo_url="https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=600&auto=format&fit=crop",
            main_problem="Sparking wire on broken streetlight pole",
            priority="CRITICAL",
            responsible_department="Electrical/Streetlight Department",
            recommended_action="Isolate electrical line immediately to prevent public shock hazard; dispatch electrician.",
            duplicate_status="ORIGINAL",
            parent_complaint_id=None,
            status="ASSIGNED",
            created_at=now - timedelta(hours=1, minutes=20),
            staff_assigned="Technician S. Murthy",
            resolution_notes="Emergency lineman line cut request submitted."
        ),
        Complaint(
            id="CMP-1003",
            citizen_name="David Fernandez",
            contact="+91 97410 54321",
            category="Garbage/Waste",
            description="Commercial garbage piled on the pavement next to the Main Road bin, foul odor affecting shops.",
            location="Main Road Commercial Corridor, Ward 2",
            ward="Ward 2",
            latitude=12.9755,
            longitude=77.6014,
            photo_url="https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?w=600&auto=format&fit=crop",
            main_problem="Commercial garbage overflow on sidewalk",
            priority="HIGH",
            responsible_department="Waste Management Department",
            recommended_action="Schedule immediate waste collection and sanitize perimeter.",
            duplicate_status="ORIGINAL",
            parent_complaint_id=None,
            status="SUBMITTED",
            created_at=now - timedelta(minutes=45),
            staff_assigned=None,
            resolution_notes=None
        ),
        Complaint(
            id="CMP-1000",
            citizen_name="Priya Patel",
            contact="+91 99001 11223",
            category="Water Supply",
            description="Low tap pressure and cloudy drinking water supply in Block B.",
            location="Block B Housing Colony, Ward 4",
            ward="Ward 4",
            latitude=12.9800,
            longitude=77.6160,
            photo_url=None,
            main_problem="Low pressure and cloudy water supply",
            priority="MEDIUM",
            responsible_department="Water Supply Department",
            recommended_action="Schedule pipeline leak check and pressure adjustment.",
            duplicate_status="ORIGINAL",
            parent_complaint_id=None,
            status="RESOLVED",
            created_at=now - timedelta(days=1, hours=4),
            resolved_at=now - timedelta(hours=6),
            staff_assigned="Inspector Ramesh",
            resolution_notes="Flushed secondary pipeline and replaced valve gasket. Water pressure restored to 2.4 bar.",
            citizen_rating=5,
            citizen_feedback="Issue was resolved within 24 hours. Excellent response from the water engineering team."
        )
    ]
    db.add_all(complaints_data)

    db.commit()
    db.close()
    print("Database seeded successfully with realistic municipal infrastructure data.")


if __name__ == "__main__":
    seed_database()
