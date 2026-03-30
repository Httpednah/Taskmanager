import { useState } from "react";

/**
 * Login Component
 * Handles:
 * User login
 * New user registration
 * Ensures only registered users can log in
 * Stores user info in localStorage to persist across refresh
 */
// Utility: hash a string using SHA-256 and return hex
async function hashString(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function Login({ onLogin }) {
  // STATE: form inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");

  // STATE: toggle between login and register
  const [isRegistering, setIsRegistering] = useState(false);

  // STATE: error messages
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * handleSubmit
   * Triggered when the form is submitted
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // reset errors
    setIsSubmitting(true);

    // Retrieve stored users from localStorage (simulate DB)
    const users = JSON.parse(localStorage.getItem("users") || "[]");

    if (isRegistering) {
      // Basic validation
      if (!name.trim()) {
        setError("Please enter your name to register.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!/\d/.test(password)) {
        setError("Password must include at least one number.");
        return;
      }

      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already exists
      const userExists = users.find((u) => u.email === normalizedEmail);
      if (userExists) {
        setError("Email already registered. Please login.");
        setIsSubmitting(false);
        return;
      }

      // Hash password before storing
      const passwordHash = await hashString(password);

      // Add new user to "database" (store hashed password only)
      const newUser = {
        email: normalizedEmail,
        passwordHash,
        name,
        details,
        tasks: [],
      };
      users.push(newUser);
      localStorage.setItem("users", JSON.stringify(users));

      // create a session (token) and persist in sessionStorage
      const token = await hashString(normalizedEmail + Date.now());
      const session = { name, email: normalizedEmail, details, token };
      sessionStorage.setItem("session", JSON.stringify(session));

      // Automatically log in after registration
      onLogin({ name, email: normalizedEmail, details, tasks: [] });
      setIsSubmitting(false);
    } else {
      // LOGIN: find user by email
      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email === normalizedEmail);
      if (!user) {
        setError("Invalid email or password. Please register if new.");
        setIsSubmitting(false);
        return;
      }

      // Hash entered password and compare with stored hash
      const enteredHash = await hashString(password);
      if (enteredHash !== user.passwordHash) {
        setError("Invalid email or password. Please register if new.");
        setIsSubmitting(false);
        return;
      }

      // Successful login: create session and pass user data up
      const token = await hashString(normalizedEmail + Date.now());
      const session = {
        name: user.name,
        email: user.email,
        details: user.details,
        token,
      };
      sessionStorage.setItem("session", JSON.stringify(session));

      onLogin({
        name: user.name,
        email: user.email,
        details: user.details,
        tasks: user.tasks || [],
      });
      setIsSubmitting(false);
    }

    // Reset form (do not persist password)
    setEmail("");
    setPassword("");
    setName("");
    setDetails("");
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>{isRegistering ? "Register" : "Login"}</h2>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* NAME: shown when registering */}
          {isRegistering && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          {/* DETAILS/BIO: shown when registering */}
          {isRegistering && (
            <input
              type="text"
              placeholder="A short detail about you (e.g. Engineer, Designer)"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          )}

          {/* EMAIL INPUT */}
          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* PASSWORD INPUT */}
          <div className="password-row">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="toggle-btn"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {isRegistering && (
            <div className="hint">
              Password must be at least 8 characters and include a number.
            </div>
          )}

          {/* SUBMIT BUTTON */}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? isRegistering
                ? "Registering…"
                : "Logging in…"
              : isRegistering
                ? "Register"
                : "Login"}
          </button>
        </form>

        {/* TOGGLE LOGIN / REGISTER */}
        <p>
          {isRegistering ? "Already have an account?" : "New user?"}{" "}
          <button
            className="toggle-btn"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError("");
            }}
          >
            {isRegistering ? "Login here" : "Register here"}
          </button>
        </p>
      </div>
    </div>
  );
}
