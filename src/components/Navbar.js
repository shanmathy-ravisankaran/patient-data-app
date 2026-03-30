import { NavLink, useNavigate } from "react-router-dom";
import { useAppStore } from "../store";

function Navbar() {
  const navigate = useNavigate();
  const { logout } = useAppStore();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <div className="navbar__brand">Patient Data App</div>
      <nav className="navbar__links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link--active" : "nav-link"
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/patient"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link--active" : "nav-link"
          }
        >
          Add Patient
        </NavLink>
        <NavLink
          to="/audit"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link--active" : "nav-link"
          }
        >
          Audit Trail
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            isActive ? "nav-link nav-link--active" : "nav-link"
          }
        >
          Patient History
        </NavLink>
      </nav>
      <button className="btn btn-secondary" onClick={handleLogout}>
        Logout
      </button>
    </header>
  );
}

export default Navbar;
