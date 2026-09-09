import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../api";

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    api.get(`/verify-email?token=${token}`)
      .then((res) => {
        setStatus("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "Verification failed.");
      });
  }, [searchParams]);

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", textAlign: "center" }}>
      <h2>Email Verification</h2>
      {status === "verifying" && <p>Verifying your email...</p>}
      {status === "success" && (
        <>
          <p style={{ color: "green" }}>{message}</p>
          <Link to="/login">Go to Login</Link>
        </>
      )}
      {status === "error" && (
        <>
          <p style={{ color: "red" }}>{message}</p>
          <Link to="/signup">Back to Signup</Link>
        </>
      )}
    </div>
  );
}

export default VerifyEmail;