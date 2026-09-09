import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "../Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medTimesPerDay, setMedTimesPerDay] = useState(1);

  const [vitalType, setVitalType] = useState("weight");
  const [vitalValue, setVitalValue] = useState("");
  const [vitalUnit, setVitalUnit] = useState("kg");

  const [apptDoctor, setApptDoctor] = useState("");
  const [apptDateTime, setApptDateTime] = useState("");
  const [apptNotes, setApptNotes] = useState("");

  const fetchAll = async () => {
    try {
      const [medRes, vitalRes, apptRes] = await Promise.all([
        api.get("/medicines"),
        api.get("/vitals"),
        api.get("/appointments"),
      ]);
      setMedicines(medRes.data);
      setVitals(vitalRes.data);
      setAppointments(apptRes.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    await api.post("/medicines", {
      name: medName,
      dosage: medDosage,
      frequency: medFrequency,
      times_per_day: Number(medTimesPerDay),
      start_date: new Date().toISOString(),
      end_date: null,
    });
    setMedName(""); setMedDosage(""); setMedFrequency(""); setMedTimesPerDay(1);
    fetchAll();
  };

  const handleDeleteMedicine = async (id) => {
    await api.delete(`/medicines/${id}`);
    fetchAll();
  };

  const handleAddVital = async (e) => {
    e.preventDefault();
    await api.post("/vitals", {
      type: vitalType,
      value: Number(vitalValue),
      unit: vitalUnit,
    });
    setVitalValue("");
    fetchAll();
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    await api.post("/appointments", {
      doctor_name: apptDoctor,
      date_time: apptDateTime,
      notes: apptNotes,
    });
    setApptDoctor(""); setApptDateTime(""); setApptNotes("");
    fetchAll();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>HealthMate</h1>
        <button className="logout-btn" onClick={handleLogout}>Log Out</button>
      </div>

      {/* Medicines Section */}
      <div className="section-card">
        <h2>Medicines</h2>
        <form onSubmit={handleAddMedicine} className="form-row">
          <input placeholder="Name" value={medName} onChange={(e) => setMedName(e.target.value)} required />
          <input placeholder="Dosage" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} required />
          <input placeholder="Frequency" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} required />
          <input type="number" min="1" placeholder="Times/day" value={medTimesPerDay} onChange={(e) => setMedTimesPerDay(e.target.value)} style={{ maxWidth: 90 }} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {medicines.length === 0 ? <p className="empty-state">No medicines added yet.</p> : (
          <ul className="item-list">
            {medicines.map((m) => (
              <li key={m.id} className="item-row">
                <span><span className="item-name">{m.name}</span> <span className="item-meta">— {m.dosage}, {m.frequency} ({m.times_per_day}x/day)</span></span>
                <button className="delete-btn" onClick={() => handleDeleteMedicine(m.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Vitals Section */}
      <div className="section-card">
        <h2>Vitals</h2>
        <form onSubmit={handleAddVital} className="form-row">
          <select value={vitalType} onChange={(e) => setVitalType(e.target.value)}>
            <option value="weight">Weight</option>
            <option value="blood_pressure">Blood Pressure</option>
            <option value="sugar">Blood Sugar</option>
          </select>
          <input type="number" step="any" placeholder="Value" value={vitalValue} onChange={(e) => setVitalValue(e.target.value)} required />
          <input placeholder="Unit" value={vitalUnit} onChange={(e) => setVitalUnit(e.target.value)} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {vitals.length === 0 ? <p className="empty-state">No vitals logged yet.</p> : (
          <ul className="item-list">
            {vitals.map((v) => (
              <li key={v.id} className="item-row">
                <span className="item-meta">{v.type}: <span className="item-name">{v.value} {v.unit}</span></span>
                <span className="item-meta">{new Date(v.recorded_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Appointments Section */}
      <div className="section-card">
        <h2>Appointments</h2>
        <form onSubmit={handleAddAppointment} className="form-row">
          <input placeholder="Doctor name" value={apptDoctor} onChange={(e) => setApptDoctor(e.target.value)} required />
          <input type="datetime-local" value={apptDateTime} onChange={(e) => setApptDateTime(e.target.value)} required />
          <input placeholder="Notes (optional)" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} />
          <button type="submit" className="add-btn">Add</button>
        </form>
        {appointments.length === 0 ? <p className="empty-state">No appointments scheduled.</p> : (
          <ul className="item-list">
            {appointments.map((a) => (
              <li key={a.id} className="item-row">
                <span className="item-name">Dr. {a.doctor_name}</span>
                <span className="item-meta">{new Date(a.date_time).toLocaleString()} {a.notes && `— ${a.notes}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Dashboard;