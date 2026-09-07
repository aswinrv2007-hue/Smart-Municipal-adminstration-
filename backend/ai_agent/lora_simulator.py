"""
LoRa / LoRaWAN IoT Gateway Simulator.
Models: IoT Sensor -> LoRa Module -> LoRa Gateway -> Cloud Server -> AI Agent
Generates realistic telemetry packets and supports scenario-based stress tests.
"""
import random
from datetime import datetime, timezone
from typing import Dict, Any, List


class LoRaSimulator:
    """
    Simulates LoRaWAN uplink packets from field infrastructure devices.
    """

    GATEWAYS = [
        {"id": "GW-CENTRAL-01", "location": "Civic Center Tower", "freq": "868.1 MHz"},
        {"id": "GW-NORTH-02", "location": "North Substation", "freq": "868.3 MHz"},
        {"id": "GW-SOUTH-03", "location": "South Reservoir Station", "freq": "868.5 MHz"}
    ]

    @classmethod
    def generate_uplink_packet(
        cls,
        sensor_id: str,
        sensor_type: str,
        reading: float,
        unit: str = "%",
        flow_rate: float = 0.0,
        battery: float = 95.0
    ) -> Dict[str, Any]:
        """
        Constructs a standard LoRaWAN telemetry payload frame.
        """
        gateway = random.choice(cls.GATEWAYS)
        rssi = random.randint(-92, -65)
        snr = round(random.uniform(6.0, 12.5), 1)

        return {
            "dev_eui": f"00-1A-79-{sensor_id.replace('-', '')}",
            "sensor_id": sensor_id,
            "sensor_type": sensor_type,
            "gateway_id": gateway["id"],
            "frequency": gateway["freq"],
            "rssi": rssi,
            "snr": snr,
            "battery_level": round(battery, 1),
            "reading": round(reading, 1),
            "unit": unit,
            "flow_rate": round(flow_rate, 2),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

    @classmethod
    def simulate_next_reading(
        cls,
        sensor: Dict[str, Any],
        scenario: str = "NORMAL"
    ) -> Dict[str, Any]:
        """
        Advances the sensor's physical state based on current reading and scenario.
        """
        sensor_type = sensor.get("type")
        current_val = float(sensor.get("current_reading", 50.0))
        flow = float(sensor.get("flow_rate", 0.0))
        battery = max(5.0, float(sensor.get("battery_level", 95.0)) - 0.05)

        new_val = current_val
        new_flow = flow

        if scenario == "RAIN_SURGE":
            # Heavy storm event: drainage fills fast, tanks fill, bins accumulate rain waste
            if sensor_type == "drainage":
                new_val = min(100.0, current_val + random.uniform(8.0, 16.0))
                new_flow = round(random.uniform(0.1, 0.8), 2)  # High level with restricted flow (backflow/blockage)
            elif sensor_type == "water_tank":
                new_val = min(100.0, current_val + random.uniform(4.0, 9.0))
                new_flow = round(random.uniform(12.0, 20.0), 2)
            else:
                new_val = min(100.0, current_val + random.uniform(3.0, 6.0))

        elif scenario == "MARKET_GARBAGE":
            # Weekend market surge on bins
            if sensor_type == "garbage_bin":
                new_val = min(100.0, current_val + random.uniform(12.0, 22.0))
            else:
                new_val = max(10.0, min(95.0, current_val + random.uniform(-2.0, 2.0)))

        elif scenario == "WATER_DROUGHT":
            # Heavy consumption / supply cut
            if sensor_type == "water_tank":
                new_val = max(0.0, current_val - random.uniform(10.0, 18.0))
                new_flow = round(random.uniform(0.0, 1.5), 2)
            else:
                new_val = max(5.0, min(90.0, current_val + random.uniform(-1.0, 2.0)))

        elif scenario == "SENSOR_FAULT":
            # Inject impossible or stuck sensor reading
            return {
                "reading": 999.0,  # Impossible value
                "flow_rate": -5.0,
                "battery": 0.0,
                "rssi": -135,
                "snr": -12.0
            }

        else:
            # NORMAL DRIFT
            if sensor_type == "garbage_bin":
                # Gradual filling
                drift = random.uniform(-1.0, 4.0)
                new_val = min(100.0, max(0.0, current_val + drift))
            elif sensor_type == "drainage":
                # Steady flow with minor fluctuations
                drift = random.uniform(-3.0, 3.5)
                new_val = min(100.0, max(5.0, current_val + drift))
                new_flow = round(max(0.5, random.uniform(2.0, 5.0)), 2)
            elif sensor_type == "water_tank":
                # Regular cycle (consumption and pump cycles)
                drift = random.uniform(-4.0, 3.0)
                new_val = min(100.0, max(8.0, current_val + drift))
                new_flow = round(max(1.0, random.uniform(4.0, 8.0)), 2)

        return {
            "reading": round(new_val, 1),
            "flow_rate": round(new_flow, 2),
            "battery": round(battery, 1),
            "rssi": random.randint(-88, -68),
            "snr": round(random.uniform(7.0, 12.0), 1)
        }
