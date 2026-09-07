import React, { useState, useEffect } from "react";
import {
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  Star,
  Camera,
  MapPin,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Info
} from "lucide-react";
import { api } from "../api";

export default function CitizenPortal({
  complaints = [],
  onComplaintSubmitted,
  pinnedCoords,
  onOpenSatelliteMap
}) {
  const [activeTab, setActiveTab] = useState("submit"); // 'submit' or 'track'

  // Submission Form State
  const [formData, setFormData] = useState({
    citizen_name: "",
    contact: "",
    category: "",
    location: "",
    ward: "Ward 1",
    latitude: 12.9716,
    longitude: 77.5946,
    description: "",
    photo_url: ""
  });

  useEffect(() => {
    if (pinnedCoords) {
      setFormData((prev) => ({
        ...prev,
        latitude: pinnedCoords.lat,
        longitude: pinnedCoords.lng,
        location: prev.location || `GPS Location (${pinnedCoords.lat}, ${pinnedCoords.lng})`
      }));
    }
  }, [pinnedCoords]);

  const [aiPreview, setAiPreview] = useState(null);
  const [isPreAnalyzing, setIsPreAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Tracking State
  const [searchId, setSearchId] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [ratingSubmittedFor, setRatingSubmittedFor] = useState(null);

  // Debounced AI Pre-analysis
  useEffect(() => {
    if (!formData.description || formData.description.length < 6) {
      setAiPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsPreAnalyzing(true);
      try {
        const res = await api.preAnalyzeComplaint({
          description: formData.description,
          location: formData.location,
          category: formData.category || undefined
        });
        setAiPreview(res);
      } catch (err) {
        console.error("Pre-analysis error", err);
      } finally {
        setIsPreAnalyzing(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [formData.description, formData.location, formData.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.citizen_name || !formData.contact || !formData.description || !formData.location) {
      alert("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitComplaint(formData);
      if (res.status === "success") {
        setSubmitSuccess(res.complaint);
        setFormData({
          citizen_name: "",
          contact: "",
          category: "",
          location: "",
          ward: "Ward 1",
          description: "",
          photo_url: ""
        });
        setAiPreview(null);
        if (onComplaintSubmitted) onComplaintSubmitted();
      }
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRatingSubmit = async (complaintId) => {
    try {
      await api.submitComplaintFeedback(complaintId, feedbackRating, feedbackText);
      setRatingSubmittedFor(complaintId);
      setFeedbackText("");
      if (onComplaintSubmitted) onComplaintSubmitted();
    } catch (err) {
      console.error("Feedback failed", err);
    }
  };

  const trackedComplaint = complaints.find(
    (c) => c.id.toLowerCase() === searchId.trim().toLowerCase()
  );

  return (
    <div id="citizen-portal-container">
      {/* Sub-nav: Submit or Track */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          id="tab-submit-grievance"
          className={`btn ${activeTab === "submit" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => {
            setActiveTab("submit");
            setSubmitSuccess(null);
          }}
        >
          <Send size={16} />
          <span>Report Municipal Grievance</span>
        </button>

        <button
          id="tab-track-grievance"
          className={`btn ${activeTab === "track" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("track")}
        >
          <Search size={16} />
          <span>Track Grievance Status & Feedback</span>
        </button>
      </div>

      {/* View 1: Submit Grievance */}
      {activeTab === "submit" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))", gap: "1.5rem" }}>
          
          {/* Form */}
          <div className="glass-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Send size={20} color="#00f0ff" />
                <span>Citizen Municipal Grievance Portal</span>
              </div>
            </div>

            {submitSuccess ? (
              <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid #10b981", borderRadius: "var(--radius-lg)", padding: "1.5rem", textAlign: "center" }}>
                <CheckCircle2 size={44} color="#10b981" style={{ margin: "0 auto 0.5rem" }} />
                <h3 style={{ color: "#10b981" }}>Grievance Successfully Registered</h3>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0.5rem 0", fontFamily: "monospace", color: "#fff" }}>
                  Tracking ID: {submitSuccess.id}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                  The AI Agent has analyzed and routed this issue to the <strong>{submitSuccess.responsible_department}</strong> with priority <strong>{submitSuccess.priority}</strong>.
                </p>
                {submitSuccess.duplicate_status === "DUPLICATE" && (
                  <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1px solid #f59e0b", borderRadius: "var(--radius-md)", padding: "0.75rem", fontSize: "0.8rem", color: "#fde68a", marginBottom: "1rem" }}>
                    Linked to parent municipal case <strong>{submitSuccess.parent_complaint_id}</strong> for consolidated dispatch.
                  </div>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setSubmitSuccess(null)}
                >
                  Submit Another Grievance
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} id="citizen-complaint-form">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      id="input-citizen-name"
                      className="form-input"
                      value={formData.citizen_name}
                      onChange={(e) => setFormData({ ...formData, citizen_name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Contact Phone / Email *</label>
                    <input
                      type="text"
                      id="input-citizen-contact"
                      className="form-input"
                      value={formData.contact}
                      onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                      placeholder="+91 98450 00000"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <label className="form-label" style={{ margin: 0 }}>Location / Landmark *</label>
                      {onOpenSatelliteMap && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
                          onClick={onOpenSatelliteMap}
                        >
                          🛰️ Pick on Satellite Map
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      id="input-citizen-location"
                      className="form-input"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g. 5th Main Road near St. Anne's School"
                      required
                    />
                    {formData.latitude && formData.longitude && (
                      <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", marginTop: "0.25rem" }}>
                        📍 Satellite GPS: {formData.latitude}, {formData.longitude}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Municipal Ward</label>
                    <select
                      id="select-citizen-ward"
                      className="form-select"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                    >
                      <option value="Ward 1">Ward 1 - Downtown</option>
                      <option value="Ward 2">Ward 2 - Commercial</option>
                      <option value="Ward 3">Ward 3 - Healthcare Zone</option>
                      <option value="Ward 4">Ward 4 - Residential</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Category (Optional: AI will auto-detect from description)</label>
                  <select
                    id="select-citizen-category"
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Auto-Detect via AI NLP</option>
                    <option value="Garbage/Waste">Garbage/Waste &rarr; Waste Management</option>
                    <option value="Drainage">Drainage &rarr; Drainage Department</option>
                    <option value="Water Supply">Water Supply &rarr; Water Supply Department</option>
                    <option value="Roads">Roads &rarr; Roads & Engineering</option>
                    <option value="Streetlights">Streetlights &rarr; Electrical Department</option>
                    <option value="Public Environment">Public Environment &rarr; Environment Department</option>
                    <option value="Other">Other &rarr; General Administration</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Grievance Description *</label>
                  <textarea
                    id="textarea-citizen-description"
                    className="form-textarea"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the issue in detail (e.g. 'There is a large pothole near the school and vehicles are having difficulty passing.')..."
                    rows={4}
                    required
                  ></textarea>
                </div>

                {/* Quick Examples */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--color-text-dim)", marginBottom: "0.4rem" }}>
                    Try Example Prompts:
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem" }}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          description: "There is a large pothole near the school and vehicles are having difficulty passing.",
                          location: "St. Anne's School Road, Ward 2",
                          ward: "Ward 2"
                        })
                      }
                    >
                      Pothole near School (Prompt Example)
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem" }}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          description: "Commercial garbage piled on the pavement next to the Main Road bin, foul odor affecting shops.",
                          location: "Main Road Commercial Corridor, Ward 2",
                          ward: "Ward 2"
                        })
                      }
                    >
                      Duplicate Test: Main Road Garbage
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: "0.72rem" }}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          description: "Sparking wire hanging from streetlight pole near public hospital gate, severe shock danger!",
                          location: "Hospital Main Gate, Ward 3",
                          ward: "Ward 3"
                        })
                      }
                    >
                      Critical Electrical Hazard
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="submit-grievance-btn"
                  className="btn btn-primary"
                  style={{ width: "100%" }}
                  disabled={isSubmitting}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? "AI Processing Grievance..." : "Submit Grievance to Municipality"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Real-time AI Pre-Screening Panel */}
          <div>
            <div className="glass-panel" style={{ height: "100%" }}>
              <div className="panel-header">
                <div className="panel-title">
                  <Sparkles size={20} color="#00f0ff" />
                  <span>Real-Time AI Intake Pre-Screening</span>
                </div>
                {isPreAnalyzing && <span style={{ fontSize: "0.75rem", color: "var(--color-primary)" }}>Analyzing...</span>}
              </div>

              {!aiPreview ? (
                <div style={{ textAlign: "center", padding: "3rem 1.5rem", color: "var(--color-text-dim)" }}>
                  <Info size={36} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                  <h4>Live NLP Engine Ready</h4>
                  <p style={{ fontSize: "0.82rem", marginTop: "0.4rem" }}>
                    Start typing your grievance description on the left. The AI Agent will instantly evaluate problem severity, route to the correct municipal department, check for nearby duplicate reports, and assess public safety risk.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="ai-preview-card">
                    <div className="ai-preview-header">
                      <span className="ai-pill">
                        <Sparkles size={12} />
                        AI Verified Analysis
                      </span>
                      <span
                        className={`badge ${
                          aiPreview.priority === "CRITICAL"
                            ? "badge-critical"
                            : aiPreview.priority === "HIGH"
                            ? "badge-high"
                            : "badge-medium"
                        }`}
                      >
                        Priority: {aiPreview.priority}
                      </span>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Classified Category</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#00f0ff" }}>
                        {aiPreview.category}
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Responsible Municipal Department</div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>
                        {aiPreview.responsible_department}
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Priority Rationale</div>
                      <div style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                        {aiPreview.priority_reason}
                      </div>
                    </div>

                    <div className="recommendation-box" style={{ marginTop: "0.5rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 700 }}>
                        Auto-Formulated Action Directive:
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#f8fafc", marginTop: "0.2rem" }}>
                        {aiPreview.recommended_action}
                      </div>
                    </div>

                    {/* Duplicate Detection Alert Banner */}
                    {aiPreview.duplicate_status === "DUPLICATE" && (
                      <div className="duplicate-warning-banner">
                        <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                        <div>
                          <strong>Duplicate Incident Detected:</strong> {aiPreview.duplicate_reason}.
                          Your submission will automatically link to existing case <strong>{aiPreview.parent_complaint_id}</strong> so crews can prioritize this location.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* View 2: Track & Citizen Feedback */}
      {activeTab === "track" && (
        <div className="glass-panel">
          <div className="panel-header">
            <div className="panel-title">
              <Search size={20} />
              <span>Track Grievance Status & Citizen Satisfaction</span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", maxWidth: "350px", width: "100%" }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by ID (e.g. CMP-1001)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginTop: "1rem" }}>
            {complaints.map((c) => {
              const isResolved = c.status === "RESOLVED" || c.status === "CLOSED";

              return (
                <div
                  key={c.id}
                  style={{
                    background: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1.25rem"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-primary)" }}>
                          {c.id}
                        </span>
                        <span className="badge badge-medium">{c.category}</span>
                        <span
                          className={`badge ${
                            c.priority === "CRITICAL"
                              ? "badge-critical"
                              : c.priority === "HIGH"
                              ? "badge-high"
                              : "badge-medium"
                          }`}
                        >
                          {c.priority}
                        </span>
                        {c.duplicate_status === "DUPLICATE" && (
                          <span className="badge badge-high">
                            Duplicate of {c.parent_complaint_id}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: "1.05rem", marginTop: "0.35rem" }}>{c.main_problem}</h3>
                      <div style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                        📍 {c.location} ({c.ward}) &bull; Citizen: {c.citizen_name} ({c.contact})
                      </div>
                    </div>

                    <div>
                      <span
                        className={`badge ${
                          isResolved ? "badge-low" : c.status === "IN_PROGRESS" ? "badge-high" : "badge-medium"
                        }`}
                        style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                      >
                        Status: {c.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "var(--radius-md)", margin: "0.75rem 0", fontSize: "0.82rem" }}>
                    "{c.description}"
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.8rem", color: "var(--color-text-dim)" }}>
                    <div>Assigned Department: <strong style={{ color: "#fff" }}>{c.responsible_department}</strong></div>
                    <div>Assigned Officer: <strong style={{ color: "#fff" }}>{c.staff_assigned || "Pending Dispatch"}</strong></div>
                    <div>Created: {new Date(c.created_at).toLocaleDateString()}</div>
                  </div>

                  {c.resolution_notes && (
                    <div style={{ background: "rgba(16, 185, 129, 0.1)", borderLeft: "3px solid #10b981", padding: "0.6rem 0.85rem", marginTop: "0.75rem", borderRadius: "0 4px 4px 0", fontSize: "0.82rem", color: "#6ee7b7" }}>
                      <strong>Municipal Resolution:</strong> {c.resolution_notes}
                    </div>
                  )}

                  {/* Citizen Rating / Feedback Section */}
                  {isResolved && (
                    <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem" }}>
                      {c.citizen_rating ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                          <span>Citizen Rating:</span>
                          <div style={{ display: "flex", color: "#f59e0b" }}>
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                fill={i < c.citizen_rating ? "#f59e0b" : "none"}
                              />
                            ))}
                          </div>
                          {c.citizen_feedback && (
                            <span style={{ color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                              "{c.citizen_feedback}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f8fafc", marginBottom: "0.4rem" }}>
                            How satisfied are you with this resolution? Submit Feedback:
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: "0.25rem", cursor: "pointer" }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={20}
                                  color="#f59e0b"
                                  fill={star <= feedbackRating ? "#f59e0b" : "none"}
                                  onClick={() => setFeedbackRating(star)}
                                />
                              ))}
                            </div>

                            <input
                              type="text"
                              className="form-input"
                              style={{ width: "300px", padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                              placeholder="Add feedback comment..."
                              value={ratingSubmittedFor === c.id ? "" : feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                            />

                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleRatingSubmit(c.id)}
                            >
                              Submit Review
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
