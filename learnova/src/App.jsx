import { Link, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import GigsPage from "./pages/GigsPage";

function App() {
  const token = localStorage.getItem("token");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      return null;
    }
  })();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <h1>Learnova</h1>
          <p>MOOC marketplace · tutors & tokens</p>
        </div>
        <nav className="app-nav">
          <Link to="/">Home</Link>
          <Link to="/gigs">Tutors</Link>
          {token ? <Link to="/dashboard">Dashboard</Link> : null}
          {!token ? <Link to="/login">Login</Link> : null}
          {!token ? <Link to="/register">Register</Link> : null}
          {token ? <span className="nav-user-chip">{user?.name || "User"}</span> : null}
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/gigs" element={<GigsPage />} />
          <Route
            path="/dashboard"
            element={token ? <DashboardPage /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;