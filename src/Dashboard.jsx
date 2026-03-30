
// It handles:
// Task creation
// Task display
// Status tracking (pending, completed, overdue)
// Dashboard insights

import { useState, useEffect, useRef } from "react";

export default function Dashboard({ user, onLogout }) {
  
  // STATE: tasks
  // initialize from `user.tasks` so registered/logged users keep their tasks
  // Each task has:
  // id
  // title
  // priority
  // dueDate
  // completed
  const [tasks, setTasks] = useState(() => user?.tasks || []);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPriority, setEditPriority] = useState("Low");
  const [editDueDate, setEditDueDate] = useState("");
  const [filter, setFilter] = useState("All");
  const [sortBy, setSortBy] = useState("auto");
  const [showCompleted, setShowCompleted] = useState(true);

  // STATE: form inputs
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Low");
  const [dueDate, setDueDate] = useState("");

  // FUNCTION: addTask
  const addTask = (e) => {
    e.preventDefault();
    // Validate title and dueDate
    setError("");
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!dueDate) {
      setError("Please select a due date.");
      return;
    }

    // Disallow past dates (compare date-only)
    const due = new Date(dueDate);
    const today = new Date();
    const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    if (utcDue < utcToday) {
      setError("Due date cannot be in the past.");
      return;
    }

    const newTask = {
      id: Date.now(),
      title: title.trim(),
      priority,
      dueDate,
      completed: false,
    };

    const updated = [...tasks, newTask];
    setTasks(updated);

    // Reset form
    setTitle("");
    setPriority("Low");
    setDueDate("");
  };

  const deleteTask = (id) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    if (editingId === id) cancelEdit();

    // remove any pending notifications for this task
    setNotifyList((prev) => prev.filter((n) => n.id !== id));
    notifiedRef.current.delete(id);
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
    setError("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditPriority("Low");
    setEditDueDate("");
    setError("");
  };

  const saveEdit = (e) => {
    e.preventDefault();
    setError("");
    if (!editTitle.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!editDueDate) {
      setError("Please select a due date.");
      return;
    }
    const due = new Date(editDueDate);
    const today = new Date();
    const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    if (utcDue < utcToday) {
      setError("Due date cannot be in the past.");
      return;
    }

    const updated = tasks.map((t) =>
      t.id === editingId ? { ...t, title: editTitle.trim(), priority: editPriority, dueDate: editDueDate } : t,
    );
    setTasks(updated);
    cancelEdit();
  };

  // FUNCTION: toggleComplete
  const toggleComplete = (id) => {
    const updatedTasks = tasks.map((task) =>
      task.id === id
        ? {
            ...task,
            completed: !task.completed,
            completedAt: !task.completed ? Date.now() : undefined,
          }
        : task,
    );

    setTasks(updatedTasks);
    // if task was completed just now, remove it from notify list and notified set
    const toggled = updatedTasks.find((t) => t.id === id);
    if (toggled && toggled.completed) {
      setNotifyList((prev) => prev.filter((n) => n.id !== id));
      notifiedRef.current.delete(id);
    }
  };
  // FUNCTION: checkOverdue
  const isOverdue = (task) => {
    if (task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  // DASHBOARD CALCULATIONS
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const overdueTasks = tasks.filter((t) => isOverdue(t)).length;
  const pendingTasks = totalTasks - completedTasks;

  // Helper: days remaining (date-only) — 0 = due today, negative = past
  const daysRemaining = (dueDateStr) => {
    const due = new Date(dueDateStr);
    const today = new Date();
    const utcDue = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = utcDue - utcToday;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Urgent tasks: not completed and 5 or fewer days remaining (including due today)
  const urgentTasks = tasks.filter((t) => !t.completed && daysRemaining(t.dueDate) <= 5 && daysRemaining(t.dueDate) >= 0);

  // Near due tasks for immediate alerts (e.g., 2 days or less)
  const nearDueTasks = tasks.filter((t) => !t.completed && daysRemaining(t.dueDate) <= 2 && daysRemaining(t.dueDate) >= 0);

  // Sort tasks according to `sortBy`
  const priorityRank = { High: 3, Medium: 2, Low: 1 };
  const sortedTasks = tasks.slice().sort((a, b) => {
    if (sortBy === "auto") {
      // overdue first
      const aOver = isOverdue(a) ? 1 : 0;
      const bOver = isOverdue(b) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      // sooner due first
      const da = daysRemaining(a.dueDate);
      const db = daysRemaining(b.dueDate);
      if (da !== db) return da - db;
      // then priority
      return (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
    }
    if (sortBy === "priority") {
      const pr = (priorityRank[b.priority] || 0) - (priorityRank[a.priority] || 0);
      if (pr !== 0) return pr;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === "dueDate") {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    // newest first
    return b.id - a.id;
  });

  // Apply filter to the sorted list
  const filteredTasks = sortedTasks.filter((t) => {
    if (filter === "All") return true;
    if (filter === "Pending") return !t.completed && !isOverdue(t);
    if (filter === "Completed") return t.completed;
    if (filter === "Overdue") return isOverdue(t);
    if (filter === "Urgent") return !t.completed && daysRemaining(t.dueDate) <= 5 && daysRemaining(t.dueDate) >= 0;
    return true;
  });

  // Persist tasks to localStorage whenever they change
  useEffect(() => {
    try {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const updatedUsers = users.map((u) => (u.email === user.email ? { ...u, tasks } : u));
      localStorage.setItem("users", JSON.stringify(updatedUsers));
    } catch (e) {
      // ignore
    }
  }, [tasks, user.email]);

  // Notifications: detect near-due tasks and show banner once per task
  const [notifyList, setNotifyList] = useState([]);
  const [showNotifyBanner, setShowNotifyBanner] = useState(false);
  const notifiedRef = useRef(new Set());

  useEffect(() => {
    const checkNear = () => {
      const near = tasks.filter((t) => !t.completed && daysRemaining(t.dueDate) <= 2 && daysRemaining(t.dueDate) >= 0);
      const newOnes = near.filter((t) => !notifiedRef.current.has(t.id));
      if (newOnes.length > 0) {
        newOnes.forEach((t) => notifiedRef.current.add(t.id));
        setNotifyList((prev) => [...newOnes, ...prev]);
        setShowNotifyBanner(true);
      }
    };

    checkNear();
    const id = setInterval(checkNear, 60 * 1000); // check every minute
    return () => clearInterval(id);
  }, [tasks]);

  // Clean up notifyList when tasks change: remove items that were completed or deleted
  useEffect(() => {
    setNotifyList((prev) => prev.filter((n) => {
      const found = tasks.find((t) => t.id === n.id);
      return found && !found.completed;
    }));
  }, [tasks]);

  const dismissNotify = () => {
    setShowNotifyBanner(false);
  };

  return (
    <div className="dashboard">
      {/* NAVBAR */}
      <div className="navbar">
        <div className="brand">
          <h2>Task Dashboard</h2>
          <span className="badge overdue-badge">{overdueTasks}</span>
          <span className="badge urgent-badge">{urgentTasks.length}</span>
        </div>

        <div>
          <strong>Hi, {user?.name || user?.email}!</strong>
          {user?.details && <div className="sub">{user.details}</div>}
        </div>

        <button onClick={onLogout}>Logout</button>
      </div>

      {/* ALERT */}
      {overdueTasks > 0 && (
        <div className="alert"> You have {overdueTasks} overdue tasks</div>
      )}
      {urgentTasks.length > 0 && (
        <div className="alert urgent"> {urgentTasks.length} task(s) due within 5 days</div>
      )}
      {showNotifyBanner && notifyList.length > 0 && (
        <div className="notify-banner">
          <strong>Reminder:</strong> You have {notifyList.length} task(s) due very soon:
          <ul className="notify-list">
            {notifyList.slice(0,5).map((t) => (
              <li key={t.id}>{t.title} — due {t.dueDate} ({daysRemaining(t.dueDate) <= 0 ? 'Due today' : `${daysRemaining(t.dueDate)} day(s)`})</li>
            ))}
          </ul>
          <div className="notify-actions">
            <button onClick={dismissNotify} className="small">Dismiss</button>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="summary">
        <div>Total: {totalTasks}</div>
        <div>Completed: {completedTasks}</div>
        <div>Pending: {pendingTasks}</div>
        <div>Overdue: {overdueTasks}</div>
      </div>

      {/* ADD TASK FORM */}
      <form onSubmit={addTask} className="task-form">
        {error && <p className="error">{error}</p>}
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
          min={new Date().toISOString().split("T")[0]}
        />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <button type="submit">Add Task</button>
      </form>

      <div className="controls">
        <div className="filters">
          {["All", "Pending", "Completed", "Overdue", "Urgent"].map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        <div className="sort">
          <label>Sort:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="title">Title</option>
            <option value="created">Newest</option>
          </select>
        </div>
      </div>

      {/* TASK LIST */}
      <div className="task-list">
        {/* COMPLETED TASKS SECTION */}
        <div className="completed-section">
          <div className="completed-header">
            <h3>Completed Tasks</h3>
            <button onClick={() => setShowCompleted((s) => !s)} className="small">{showCompleted ? 'Hide' : 'Show'}</button>
          </div>
          {showCompleted && (
            <div className="completed-list">
              {tasks.filter((t) => t.completed).length === 0 && <div className="muted">No completed tasks</div>}
              {tasks
                .filter((t) => t.completed)
                .slice()
                .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
                .map((task) => (
                  <div key={task.id} className="task completed">
                    <h4>{task.title}</h4>
                    <p className="completed-meta">Due: {task.dueDate} • Completed: {task.completedAt ? new Date(task.completedAt).toLocaleString() : '—'}</p>
                    <div className="task-actions">
                      <button onClick={() => toggleComplete(task.id)} className="small">Undo</button>
                      <button onClick={() => deleteTask(task.id)} className="small danger">Delete</button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        {filteredTasks.map((task) => {
          const days = daysRemaining(task.dueDate);
          const isUrgent = !task.completed && days <= 5 && days >= 0;
          return (
            <div
              key={task.id}
              className={`task priority-${task.priority.toLowerCase()} ${isOverdue(task) ? "overdue" : ""} ${task.completed ? "completed" : ""} ${isUrgent ? "urgent" : ""}`}
            >
              {editingId === task.id ? (
                <form className="edit-form" onSubmit={saveEdit}>
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} required />
                  <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} required min={new Date().toISOString().split("T")[0]} />
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                  <button type="submit" className="save-btn">Save</button>
                  <button type="button" className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                </form>
              ) : (
                <>
                  <h4>{task.title}</h4>
                  <p>Priority: {task.priority}</p>
                  <p>Due: {task.dueDate} {days > 0 ? `(${days} day${days>1?"s":""} left)` : days===0 ? "(Due today)" : "(Past)"}</p>

                  {/* STATUS DISPLAY */}
                  <p>
                    Status: {" "}
                    {task.completed
                      ? "Completed"
                      : isOverdue(task)
                        ? "Overdue"
                        : isUrgent
                          ? "Urgent"
                          : "Pending"}
                  </p>

                  {/* ACTION BUTTONS */}
                  <div className="task-actions">
                    <button onClick={() => toggleComplete(task.id)} className="small">{task.completed ? "Undo" : "Mark Complete"}</button>
                    <button onClick={() => startEdit(task)} className="small">Edit</button>
                    <button onClick={() => deleteTask(task.id)} className="small danger">Delete</button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
