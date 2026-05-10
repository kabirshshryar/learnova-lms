import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isRegisterMode = useMemo(
    () => location.pathname === "/register",
    [location.pathname]
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    interests: "",
  });
  const [wantToTeach, setWantToTeach] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const interestTags = formData.interests
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const payload = isRegisterMode
        ? {
            name: formData.name.trim(),
            email: formData.email.trim(),
            password: formData.password,
            interests: interestTags,
            wantToTeach,
          }
        : {
            email: formData.email.trim(),
            password: formData.password,
          };

      const endpoint = isRegisterMode ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, payload);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/dashboard");
    } catch (requestError) {
      const message =
        requestError.response?.data?.message ||
        "Unable to authenticate. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card">
        <p className="auth-kicker">Learnova LMS marketplace</p>
        <h2>{isRegisterMode ? "Create account" : "Login"}</h2>
        <p>
          {isRegisterMode
            ? "Study with experts using tokens — or teach and withdraw earnings from the same account."
            : "Sign in for your learner dashboard, wallet, and tutoring tools."}
        </p>

        <form className="auth-form" onSubmit={submitAuth}>
          {isRegisterMode ? (
            <label>
              Name
              <input
                name="name"
                type="text"
                value={formData.name}
                onChange={onInputChange}
                required
                minLength={2}
                placeholder="John Doe"
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={onInputChange}
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={onInputChange}
              required
              minLength={6}
              placeholder="••••••••"
            />
          </label>

          {isRegisterMode ? (
            <label>
              Learning interests (comma separated, optional)
              <input
                name="interests"
                type="text"
                value={formData.interests}
                onChange={onInputChange}
                placeholder="python, math, ielts"
              />
            </label>
          ) : null}

          {isRegisterMode ? (
            <label className="checkbox-inline">
              <input
                type="checkbox"
                checked={wantToTeach}
                onChange={(e) => setWantToTeach(e.target.checked)}
              />
              <span>
                I also want to teach (same account acts as learner + tutor — dual role).
              </span>
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Please wait..."
              : isRegisterMode
              ? "Create account"
              : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          {isRegisterMode ? "Already have an account?" : "No account yet?"}{" "}
          <Link to={isRegisterMode ? "/login" : "/register"}>
            {isRegisterMode ? "Login" : "Register"}
          </Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
