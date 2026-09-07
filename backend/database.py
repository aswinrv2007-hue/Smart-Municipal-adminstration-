"""
Database configuration and ORM models for Smart Municipal Administration System.
"""
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, Float, String, DateTime, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "municipal.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

engine_options = {"pool_pre_ping": True}
if DATABASE_URL.startswith("sqlite"):
    engine_options["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(String(50), primary_key=True)  # e.g., 'GB101', 'DR201', 'WT301'
    name = Column(String(100), nullable=False)
    type = Column(String(50), nullable=False)  # 'garbage_bin', 'drainage', 'water_tank'
    location = Column(String(200), nullable=False)
    ward = Column(String(50), nullable=False)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    current_reading = Column(Float, default=0.0)
    unit = Column(String(20), default="%")
    flow_rate = Column(Float, default=0.0)  # L/min or m3/h for drainage/tanks
    battery_level = Column(Float, default=100.0)  # %
    rssi = Column(Integer, default=-75)  # dBm LoRa signal
    snr = Column(Float, default=8.0)  # dB
    status = Column(String(30), default="ONLINE")  # 'ONLINE', 'OFFLINE', 'FAULT', 'WARNING', 'CRITICAL'
    condition_label = Column(String(100), default="Normal")
    responsible_department = Column(String(100), default="General")
    last_active = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    telemetries = relationship("Telemetry", back_populates="sensor", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "location": self.location,
            "ward": self.ward,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "current_reading": round(self.current_reading, 1) if self.current_reading is not None else 0.0,
            "unit": self.unit,
            "flow_rate": round(self.flow_rate, 2) if self.flow_rate is not None else 0.0,
            "battery_level": round(self.battery_level, 1) if self.battery_level is not None else 0.0,
            "rssi": self.rssi,
            "snr": self.snr,
            "status": self.status,
            "condition_label": self.condition_label,
            "responsible_department": self.responsible_department,
            "last_active": self.last_active.isoformat() if self.last_active else None
        }


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_id = Column(String(50), ForeignKey("sensors.id"), nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reading = Column(Float, nullable=False)
    unit = Column(String(20), default="%")
    flow_rate = Column(Float, default=0.0)
    battery_level = Column(Float, default=100.0)
    rssi = Column(Integer, default=-75)
    snr = Column(Float, default=8.0)
    status = Column(String(30), default="ONLINE")
    condition_label = Column(String(100), default="Normal")

    sensor = relationship("Sensor", back_populates="telemetries")

    def to_dict(self):
        return {
            "id": self.id,
            "sensor_id": self.sensor_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "reading": round(self.reading, 1) if self.reading is not None else 0.0,
            "unit": self.unit,
            "flow_rate": round(self.flow_rate, 2) if self.flow_rate is not None else 0.0,
            "battery_level": round(self.battery_level, 1) if self.battery_level is not None else 0.0,
            "rssi": self.rssi,
            "snr": self.snr,
            "status": self.status,
            "condition_label": self.condition_label
        }


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True)  # e.g., 'ALT-2026-001'
    problem_type = Column(String(100), nullable=False)
    location = Column(String(200), nullable=False)
    latitude = Column(Float, default=12.9716)
    longitude = Column(Float, default=77.5946)
    sensor_id = Column(String(50), nullable=True)
    current_reading = Column(String(100), nullable=False)
    priority = Column(String(20), nullable=False)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    responsible_department = Column(String(100), nullable=False)
    recommended_action = Column(Text, nullable=False)
    detection_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    status = Column(String(30), default="ACTIVE")  # 'ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED'
    assigned_team = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "problem_type": self.problem_type,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "sensor_id": self.sensor_id,
            "current_reading": self.current_reading,
            "priority": self.priority,
            "responsible_department": self.responsible_department,
            "recommended_action": self.recommended_action,
            "detection_time": self.detection_time.isoformat() if self.detection_time else None,
            "status": self.status,
            "assigned_team": self.assigned_team,
            "resolution_notes": self.resolution_notes,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String(50), primary_key=True)  # e.g., 'CMP-1001'
    citizen_name = Column(String(100), nullable=False)
    contact = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(200), nullable=False)
    ward = Column(String(50), default="Ward 1")
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    photo_url = Column(String(255), nullable=True)
    
    # AI derived fields
    main_problem = Column(String(200), nullable=False)
    priority = Column(String(20), nullable=False)  # 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    responsible_department = Column(String(100), nullable=False)
    recommended_action = Column(Text, nullable=False)
    duplicate_status = Column(String(30), default="ORIGINAL")  # 'ORIGINAL', 'DUPLICATE'
    parent_complaint_id = Column(String(50), nullable=True)

    # Workflow & Citizen Feedback
    status = Column(String(30), default="SUBMITTED")  # 'SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    staff_assigned = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    citizen_rating = Column(Integer, nullable=True)  # 1 to 5 stars
    citizen_feedback = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "citizen_name": self.citizen_name,
            "contact": self.contact,
            "category": self.category,
            "description": self.description,
            "location": self.location,
            "ward": self.ward,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "photo_url": self.photo_url,
            "main_problem": self.main_problem,
            "priority": self.priority,
            "responsible_department": self.responsible_department,
            "recommended_action": self.recommended_action,
            "duplicate_status": self.duplicate_status,
            "parent_complaint_id": self.parent_complaint_id,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "staff_assigned": self.staff_assigned,
            "resolution_notes": self.resolution_notes,
            "citizen_rating": self.citizen_rating,
            "citizen_feedback": self.citizen_feedback
        }


class MunicipalThreshold(Base):
    __tablename__ = "municipal_thresholds"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sensor_type = Column(String(50), unique=True, nullable=False)
    warning_threshold = Column(Float, nullable=False)
    critical_threshold = Column(Float, nullable=False)
    unit = Column(String(20), default="%")

    def to_dict(self):
        return {
            "id": self.id,
            "sensor_type": self.sensor_type,
            "warning_threshold": self.warning_threshold,
            "critical_threshold": self.critical_threshold,
            "unit": self.unit
        }


class Staff(Base):
    __tablename__ = "staff"

    id = Column(String(50), primary_key=True)  # e.g., 'STF-101'
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    phone = Column(String(50), nullable=False)
    email = Column(String(100), nullable=False)
    ward = Column(String(50), default="All Wards")
    status = Column(String(30), default="AVAILABLE")  # 'AVAILABLE', 'ON_DUTY', 'DISPATCHED', 'OFF_DUTY'
    rating = Column(Float, default=4.8)
    completed_cases = Column(Integer, default=0)
    active_cases_count = Column(Integer, default=0)
    avatar_url = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "department": self.department,
            "phone": self.phone,
            "email": self.email,
            "ward": self.ward,
            "status": self.status,
            "rating": self.rating,
            "completed_cases": self.completed_cases,
            "active_cases_count": self.active_cases_count,
            "avatar_url": self.avatar_url
        }


class Citizen(Base):
    __tablename__ = "citizens"

    id = Column(String(50), primary_key=True)  # e.g., 'CTZ-501'
    name = Column(String(100), nullable=False)
    contact = Column(String(50), nullable=False)
    email = Column(String(100), nullable=True)
    ward = Column(String(50), default="Ward 1")
    address = Column(String(200), nullable=True)
    reputation_score = Column(Integer, default=95)
    total_reported = Column(Integer, default=1)
    avatar_url = Column(String(255), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "contact": self.contact,
            "email": self.email,
            "ward": self.ward,
            "address": self.address,
            "reputation_score": self.reputation_score,
            "total_reported": self.total_reported,
            "avatar_url": self.avatar_url
        }


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
