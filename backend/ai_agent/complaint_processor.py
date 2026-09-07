"""
Citizen Complaint AI Processing Engine.
Performs:
- NLP & Rule-based Category Identification
- Main Problem Entity Extraction
- Priority Determination (Safety risk, severity, school/hospital proximity, disruption)
- Responsible Department Mapping
- Recommended Municipal Action Formulation
- Duplicate Complaint Detection (Spatial proximity + semantic text similarity)
"""
import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple


class ComplaintProcessor:
    """
    Intelligent processor for Citizen Complaints.
    """

    DEPARTMENT_MAPPING = {
        "Garbage/Waste": "Waste Management Department",
        "Drainage": "Drainage Department",
        "Water Supply": "Water Supply Department",
        "Roads": "Roads/Municipal Engineering Department",
        "Streetlights": "Electrical/Streetlight Department",
        "Public Environment": "Environment Department",
        "Other": "General Municipal Administration"
    }

    CATEGORY_KEYWORDS = {
        "Garbage/Waste": [
            "garbage", "waste", "trash", "bin", "dump", "litter", "rubbish", "refuse",
            "overflowing bin", "smell", "rotting", "collection", "sanitation"
        ],
        "Drainage": [
            "drain", "drainage", "sewer", "sewage", "gutter", "clog", "blockage",
            "manhole", "waterlogging", "stagnant water", "overflow", "culvert", "runoff"
        ],
        "Water Supply": [
            "water", "tank", "tap", "pipeline", "pipe leak", "no water", "contamination",
            "dirty water", "pressure", "drinking water", "supply cut", "burst pipe"
        ],
        "Roads": [
            "road", "pothole", "asphalt", "crater", "crack", "footpath", "sidewalk",
            "speed breaker", "pavement", "cave-in", "traffic divider", "bridge"
        ],
        "Streetlights": [
            "streetlight", "street light", "lamp", "dark", "wire", "pole", "bulb",
            "sparking", "flickering", "lighting", "junction box", "electrocution"
        ],
        "Public Environment": [
            "park", "tree", "fallen branch", "air pollution", "noise", "chemical",
            "garden", "smoke", "lake", "pond", "open burning", "greenery", "odor"
        ]
    }

    HIGH_SENSITIVITY_LOCATIONS = [
        "school", "hospital", "clinic", "dispensary", "kindergarten", "college",
        "railway station", "bus stop", "metro station", "market", "main road",
        "highway", "emergency room", "pedestrian crossing"
    ]

    CRITICAL_SAFETY_KEYWORDS = [
        "danger", "fatal", "hazard", "sparking", "electric shock", "cave-in",
        "open manhole", "deep crater", "poisonous", "toxic", "massive flood",
        "burst main", "collapse", "severe accident", "emergency", "fire risk"
    ]

    HIGH_SEVERITY_KEYWORDS = [
        "huge", "large", "overflowing", "blocked", "heavy", "urgent", "broken",
        "accidents", "paralyzed", "disrupted", "school children", "hospital gate"
    ]

    @classmethod
    def classify_category(cls, description: str, explicit_category: Optional[str] = None) -> Tuple[str, float]:
        """
        Infers the category and confidence score from description or validates provided category.
        """
        desc_lower = description.lower()

        # If user selected an explicit valid category, check consistency
        if explicit_category and explicit_category in cls.DEPARTMENT_MAPPING and explicit_category != "Other":
            return explicit_category, 0.95

        # Score each category based on keyword matches
        scores: Dict[str, int] = {cat: 0 for cat in cls.CATEGORY_KEYWORDS}
        for cat, keywords in cls.CATEGORY_KEYWORDS.items():
            for kw in keywords:
                if kw in desc_lower:
                    # Multi-word match scores higher
                    weight = 2 if " " in kw else 1
                    scores[cat] += weight

        best_cat = max(scores, key=scores.get)
        best_score = scores[best_cat]

        if best_score > 0:
            confidence = min(0.95, 0.5 + (best_score * 0.15))
            return best_cat, round(confidence, 2)

        # Fallback to Other
        return "Other", 0.30

    @classmethod
    def extract_main_problem(cls, description: str, category: str) -> str:
        """
        Extracts a concise summary of the core municipal issue from the citizen's description.
        """
        text = description.strip()
        # Find key phrases
        sentences = re.split(r'[.!?\n]+', text)
        first_sentence = sentences[0].strip() if sentences else text

        if len(first_sentence) <= 90:
            return first_sentence

        # Truncate thoughtfully
        return first_sentence[:87] + "..."

    @classmethod
    def evaluate_priority(
        cls,
        description: str,
        location: str,
        category: str,
        related_sensors: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[str, str]:
        """
        Determines priority (LOW, MEDIUM, HIGH, CRITICAL) and the operational rationale.
        """
        desc_lower = description.lower()
        loc_lower = location.lower()
        reasons = []

        is_critical = False
        is_high = False

        # 1. Critical safety risk keywords
        for kw in cls.CRITICAL_SAFETY_KEYWORDS:
            if kw in desc_lower:
                is_critical = True
                reasons.append(f"Contains critical hazard indicator: '{kw}'")
                break

        # 2. High sensitivity location proximity
        near_sensitive = False
        for loc_kw in cls.HIGH_SENSITIVITY_LOCATIONS:
            if loc_kw in loc_lower or loc_kw in desc_lower:
                near_sensitive = True
                reasons.append(f"Located adjacent to sensitive public facility: '{loc_kw}'")
                break

        # 3. High severity problem indicators
        for h_kw in cls.HIGH_SEVERITY_KEYWORDS:
            if h_kw in desc_lower:
                is_high = True
                reasons.append(f"Severity modifier identified: '{h_kw}'")
                break

        # 4. Related sensor telemetry validation
        if related_sensors:
            for s in related_sensors:
                if s.get("status") in ["CRITICAL", "WARNING"]:
                    is_high = True
                    reasons.append(f"Corroborated by active {s.get('status')} telemetry at sensor {s.get('id')}")

        # Combine priority: CRITICAL is reserved for acute immediate dangers
        if is_critical:
            priority = "CRITICAL"
        elif near_sensitive or is_high:
            priority = "HIGH"
        elif category in ["Drainage", "Roads", "Streetlights"]:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        reason_str = "; ".join(reasons) if reasons else "Routine maintenance condition with standard municipal impact."
        return priority, reason_str

    @classmethod
    def formulate_recommended_action(cls, category: str, priority: str, main_problem: str, location: str) -> str:
        """
        Produces clear, actionable next steps for the assigned department.
        """
        dept = cls.DEPARTMENT_MAPPING.get(category, "General Municipal Administration")

        actions = {
            "Garbage/Waste": {
                "CRITICAL": f"Dispatch emergency compacting truck to {location} within 2 hours; sanitize perimeter.",
                "HIGH": f"Schedule immediate waste collection and inspect bin capacity at {location}.",
                "MEDIUM": f"Add {location} to next routine morning waste collection route.",
                "LOW": f"Schedule routine bin inspection at {location}."
            },
            "Drainage": {
                "CRITICAL": f"Deploy emergency dewatering pumps and suction tankers to {location} immediately.",
                "HIGH": f"Dispatch drainage maintenance crew to inspect and clear culvert blockage at {location}.",
                "MEDIUM": f"Inspect drainage flow rate and clear silt build-up at {location}.",
                "LOW": f"Log for scheduled bi-weekly drain cleaning cycle at {location}."
            },
            "Water Supply": {
                "CRITICAL": f"Dispatch water pipeline repair squad; arrange mobile drinking water tankers for {location}.",
                "HIGH": f"Inspect main feeder valves and test water sample at {location}.",
                "MEDIUM": f"Schedule pipeline leak check and pressure adjustment at {location}.",
                "LOW": f"Review distribution schedule and verify consumer connection at {location}."
            },
            "Roads": {
                "CRITICAL": f"Erect safety barricades immediately; deploy quick-setting asphalt crew to repair crater at {location}.",
                "HIGH": f"Inspect road surface defect and schedule cold-mix asphalt patch within 24 hours at {location}.",
                "MEDIUM": f"Log road defect into pavement maintenance work order list for {location}.",
                "LOW": f"Survey section during quarterly engineering road audit at {location}."
            },
            "Streetlights": {
                "CRITICAL": f"Isolate electrical line immediately to prevent public shock hazard; dispatch electrician to {location}.",
                "HIGH": f"Dispatch electrical maintenance van to replace bulb/fixture and restore illumination at {location}.",
                "MEDIUM": f"Check circuit feeder pillar and replace damaged lamp fixture at {location}.",
                "LOW": f"Schedule replacement during scheduled streetlight route inspection at {location}."
            },
            "Public Environment": {
                "CRITICAL": f"Dispatch tree surgery/forestry emergency crew to clear hazardous fallen tree/obstruction at {location}.",
                "HIGH": f"Inspect environmental nuisance and enforce municipal code compliance at {location}.",
                "MEDIUM": f"Deploy park maintenance staff to clean and trim greenery at {location}.",
                "LOW": f"Record feedback for seasonal horticulture maintenance at {location}."
            },
            "Other": {
                "CRITICAL": f"Municipal Officer immediate site visit to {location} for urgent assessment.",
                "HIGH": f"Assign to Ward Inspector for priority field verification at {location}.",
                "MEDIUM": f"Review complaint details and route to concerned municipal division.",
                "LOW": f"Review citizen submission and request clarification if necessary."
            }
        }

        category_actions = actions.get(category, actions["Other"])
        return category_actions.get(priority, f"Inspect and resolve issue at {location}.")

    @classmethod
    def detect_duplicate(
        cls,
        new_description: str,
        new_location: str,
        new_category: str,
        existing_complaints: List[Dict[str, Any]]
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Compares new complaint against open/active complaints.
        Returns: (is_duplicate, parent_complaint_id, match_reason)
        """
        def tokenize(text: str) -> set:
            # Remove punctuation and lowercase
            cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
            tokens = set(t for t in cleaned.split() if len(t) > 3)
            # Filter stop words
            stopwords = {"there", "where", "which", "about", "please", "having", "their", "issue", "problem"}
            return tokens - stopwords

        new_tokens = tokenize(new_description)
        new_loc_lower = new_location.lower().strip()

        for c in existing_complaints:
            # Only compare with active/unresolved complaints
            status = c.get("status", "")
            if status in ["RESOLVED", "CLOSED"]:
                continue

            existing_id = c.get("id")
            existing_cat = c.get("category")
            existing_loc = c.get("location", "").lower().strip()
            existing_desc = c.get("description", "")

            # Category must match or be closely related
            if existing_cat != new_category:
                continue

            # Location match check (exact or substring or shared key terms)
            loc_match = (
                new_loc_lower in existing_loc or
                existing_loc in new_loc_lower or
                c.get("ward") and c.get("ward").lower() in new_loc_lower
            )

            # Text similarity: Jaccard similarity of keywords
            exist_tokens = tokenize(existing_desc)
            if not exist_tokens or not new_tokens:
                continue

            intersection = new_tokens.intersection(exist_tokens)
            union = new_tokens.union(exist_tokens)
            jaccard = len(intersection) / len(union) if union else 0.0

            # If same location and high word overlap (or moderate overlap with same specific street)
            if loc_match and jaccard >= 0.28:
                reason = f"Matches active complaint {existing_id} in {c.get('location')} ({jaccard*100:.0f}% descriptive keyword overlap)."
                return True, existing_id, reason
            elif jaccard >= 0.60:
                reason = f"High textual duplication ({jaccard*100:.0f}%) with active complaint {existing_id}."
                return True, existing_id, reason

        return False, None, None

    @classmethod
    def process_complaint(
        cls,
        citizen_name: str,
        contact: str,
        description: str,
        location: str,
        explicit_category: Optional[str] = None,
        ward: Optional[str] = None,
        latitude: float = 0.0,
        longitude: float = 0.0,
        photo_url: Optional[str] = None,
        existing_complaints: Optional[List[Dict[str, Any]]] = None,
        related_sensors: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Complete AI analysis of an incoming citizen complaint.
        """
        # 1. Identify category & confidence
        category, cat_confidence = cls.classify_category(description, explicit_category)

        # 2. Responsible department
        department = cls.DEPARTMENT_MAPPING.get(category, "General Municipal Administration")

        # 3. Main problem summary
        main_problem = cls.extract_main_problem(description, category)

        # 4. Priority determination
        priority, priority_reason = cls.evaluate_priority(
            description=description,
            location=location,
            category=category,
            related_sensors=related_sensors
        )

        # 5. Formulate recommended action
        recommended_action = cls.formulate_recommended_action(
            category=category,
            priority=priority,
            main_problem=main_problem,
            location=location
        )

        # 6. Duplicate detection
        is_dup = False
        parent_id = None
        dup_reason = None
        if existing_complaints:
            is_dup, parent_id, dup_reason = cls.detect_duplicate(
                new_description=description,
                new_location=location,
                new_category=category,
                existing_complaints=existing_complaints
            )

        # 7. Unclear complaint handling
        is_unclear = category == "Other" and cat_confidence < 0.4 and len(description.split()) < 4
        if is_unclear:
            recommended_action = "Complaint is ambiguous. Request citizen clarification or assign manual officer review."

        return {
            "citizen_name": citizen_name,
            "contact": contact,
            "description": description,
            "location": location,
            "ward": ward or "Ward 1",
            "latitude": latitude,
            "longitude": longitude,
            "photo_url": photo_url,
            "category": category,
            "category_confidence": cat_confidence,
            "main_problem": main_problem,
            "priority": priority,
            "priority_reason": priority_reason,
            "responsible_department": department,
            "recommended_action": recommended_action,
            "duplicate_status": "DUPLICATE" if is_dup else "ORIGINAL",
            "parent_complaint_id": parent_id,
            "duplicate_reason": dup_reason,
            "is_unclear": is_unclear,
            "status": "ASSIGNED" if not is_dup else "SUBMITTED"
        }
