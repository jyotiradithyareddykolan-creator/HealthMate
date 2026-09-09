import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import "../Dashboard.css";

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    full_name: "", age: "", gender: "", blood_type: "",
    emergency_contact_name: "", emergency_contact_phone: "", emergency_contact_relation: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/profile").then((res) => {
      setProfile({
        full_name: res.data.full_name || "",
        age: res.data.age || "",
        gender: res.data.gender || "",
        blood_type: res.data.blood_type || "",
        emergency_contact_name: res.data.emergency_contact_name || "",
        emergency_contact_phone: res.data.emergency_contact_phone || "",
        emergency_contact_relation: res.data.emergency_contact_relation || "",
      });
    }).catch((err) => {
      if (err.response?.status === 401) navigate("/login");
    });
  }, []);

  const handleChange = (field, value) => {
    setProfile({ ...profile, [field]: value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      await api.put("/profile", {
        ...profile,
        age: profile.age ? Number(profile.age) : null,
      });
      setMessage("Profile saved successfully.");
    } catch (err) {
      setMessage("Failed to save profile.");
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Profile</h1>
        <Link to="/dashboard" className="logout-btn">Back to Dashboard</Link>
      </div>

      <form onSubmit={handleSave}>
        <div className="section-card">
          <h2>Patient Information</h2>
          <div className="form-row">
            <input placeholder="Full name" value={profile.full_name} onChange={(e) => handleChange("full_name", e.target.value)} />
            <input type="number" placeholder="Age" value={profile.age} onChange={(e) => handleChange("age", e.target.value)} style={{ maxWidth: 100 }} />
            <select value={profile.gender} onChange={(e) => handleChange("gender", e.target.value)}>
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            <select value={profile.blood_type} onChange={(e) => handleChange("blood_type", e.target.value)}>
              <option value="">Blood type</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="section-card">
          <h2>Emergency Contact</h2>
          <div className="form-row">
            <input placeholder="Contact name" value={profile.emergency_contact_name} onChange={(e) => handleChange("emergency_contact_name", e.target.value)} />
            <input placeholder="Phone number" value={profile.emergency_contact_phone} onChange={(e) => handleChange("emergency_contact_phone", e.target.value)} />
            <input placeholder="Relationship (e.g. Parent)" value={profile.emergency_contact_relation} onChange={(e) => handleChange("emergency_contact_relation", e.target.value)} />
          </div>
        </div>

        <button type="submit" className="add-btn" style={{ padding: "10px 24px" }}>Save Profile</button>
        {message && <p style={{ marginTop: 10, color: message.includes("success") ? "green" : "red" }}>{message}</p>}
      </form>
    </div>
  );
}

export default Profile;