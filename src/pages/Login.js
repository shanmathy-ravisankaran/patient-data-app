import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store";

function Login() {
  const navigate = useNavigate();
  const { login } = useAppStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    if (username === "admin" && password === "1234") {
      login();
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="auth-page">
      <form className="page-card auth-card" onSubmit={handleLogin}>
        <div className="page-header">
          <h2>Login</h2>
          <p>Use your existing credentials to access the patient dashboard.</p>
        </div>

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button className="btn" type="submit">
          Login
        </button>

        {error && <p className="message message-error">{error}</p>}
      </form>
    </div>
  );
}

export default Login;
