// The ROOT component of this application.
// controls which page the user sees (Login or Dashboard)
// stores global state like the current user.

import { useState, useEffect } from "react";
import Login from "./Login";
import Dashboard from "./Dashboard";
import "./styles.css";

export default function App() {
  // STATE: currentUser
  // This simulates authentication.
  // If user is logged in  we store user info
  // If null then the user is not logged in
  const [currentUser, setCurrentUser] = useState(null);

  // FUNCTION: handleLogin
  // This function is passed to Login.jsx
  // When user logs in, we store their data here
  const handleLogin = (userData) => {
    // Persist current session briefly in sessionStorage
    const session = {
      name: userData.name,
      email: userData.email,
      details: userData.details,
    };
    try {
      sessionStorage.setItem("session", JSON.stringify(session));
    } catch (e) {}
    setCurrentUser(userData);
  };

  // FUNCTION: handleLogout

  const handleLogout = () => {
    sessionStorage.removeItem("session");
    setCurrentUser(null);
  };

  // On mount, restore session (if any)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("session");
      if (raw) {
        const session = JSON.parse(raw);
        // Load tasks for this user from localStorage if available
        const users = JSON.parse(localStorage.getItem("users") || "[]");
        const userRecord = users.find((u) => u.email === session.email);
        const tasks = userRecord?.tasks || [];
        setCurrentUser({
          name: session.name,
          email: session.email,
          details: session.details,
          tasks,
        });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // CONDITIONAL RENDERING
  // If user is NOT logged in show Login page
  // If logged in  show Dashboard
  return (
    <div>
      {!currentUser ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
}
