import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function Dashboard() {
  const navigate = useNavigate();

  const [medicines, setMedicines] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [appointments, setAppointments] = useState([]);

  // Form states
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
    <div style={{ maxWidth: 900, margin: "30px auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>HealthMate Dashboard</h1>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      {/* Medicines Section */}
      <section style={{ marginTop: 30 }}>
        <h2>Medicines</h2>
        <form onSubmit={handleAddMedicine} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>
          <input placeholder="Name" value={medName} onChange={(e) => setMedName(e.target.value)} required style={{ padding: 6 }} />
          <input placeholder="Dosage (e.g. 500mg)" value={medDosage} onChange={(e) => setMedDosage(e.target.value)} required style={{ padding: 6 }} />
          <input placeholder="Frequency (e.g. twice a day)" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} required style={{ padding: 6 }} />
          <input type="number" min="1" placeholder="Times/day" value={medTimesPerDay} onChange={(e) => setMedTimesPerDay(e.target.value)} style={{ padding: 6, width: 90 }} />
          <button type="submit">Add Medicine</button>
        </form>
        {medicines.length === 0 ? <p>No medicines added yet.</p> : (
          <ul>
            {medicines.map((m) => (
              <li key={m.id} style={{ marginBottom: 6 }}>
                <strong>{m.name}</strong> — {m.dosage}, {m.frequency} ({m.times_per_day}x/day)
                {" "}<button onClick={() => handleDeleteMedicine(m.id)} style={{ marginLeft: 8 }}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Vitals Section */}
      <section style={{ marginTop: 30 }}>
        <h2>Vitals</h2>
        <form onSubmit={handleAddVital} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>
          <select value={vitalType} onChange={(e) => setVitalType(e.target.value)} style={{ padding: 6 }}>
            <option value="weight">Weight</option>
            <option value="blood_pressure">Blood Pressure</option>
            <option value="sugar">Blood Sugar</option>
          </select>
          <input type="number" step="any" placeholder="Value" value={vitalValue} onChange={(e) => setVitalValue(e.target.value)} required style={{ padding: 6 }} />
          <input placeholder="Unit (e.g. kg, mmHg)" value={vitalUnit} onChange={(e) => setVitalUnit(e.target.value)} style={{ padding: 6 }} />
          <button type="submit">Add Vital</button>
        </form>
        {vitals.length === 0 ? <p>No vitals logged yet.</p> : (
          <ul>
            {vitals.map((v) => (
              <li key={v.id}>
                {v.type}: {v.value} {v.unit} — {new Date(v.recorded_at).toLocaleString()}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Appointments Section */}
      <section style={{ marginTop: 30, marginBottom: 50 }}>
        <h2>Appointments</h2>
        <form onSubmit={handleAddAppointment} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>
          <input placeholder="Doctor name" value={apptDoctor} onChange={(e) => setApptDoctor(e.target.value)} required style={{ padding: 6 }} />
          <input type="datetime-local" value={apptDateTime} onChange={(e) => setApptDateTime(e.target.value)} required style={{ padding: 6 }} />
          <input placeholder="Notes (optional)" value={apptNotes} onChange={(e) => setApptNotes(e.target.value)} style={{ padding: 6 }} />
          <button type="submit">Add Appointment</button>
        </form>
        {appointments.length === 0 ? <p>No appointments scheduled.</p> : (
          <ul>
            {appointments.map((a) => (
              <li key={a.id}>
                Dr. {a.doctor_name} — {new Date(a.date_time).toLocaleString()} {a.notes && `(${a.notes})`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Dashboard;