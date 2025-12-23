import { useState, useEffect } from "react";
import axios from "axios";

import SupportChatCard from "../componants/SupportChatCard.jsx";
import MoodSelector from "../componants/MoodSelector.jsx";
import TaskList from "../componants/TaskList.jsx";
import JournalInput from "../componants/JournalInput.jsx";

const API_BASE = "http://localhost:4000";

// helper: turn any Date/string into "YYYY-MM-DD"
function getDateKey(value) {
  const d = new Date(value);
  return d.toISOString().slice(0, 10);
}

function TodayPage() {
  const [mood, setMood] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [note, setNote] = useState("");
  const [dailyGoal, setDailyGoal] = useState(5);

  // ----- NEW: reusable loader -----
  async function loadTasks() {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks`);
      setTasks(
        res.data.map((t) => ({
          id: t.id,
          text: t.text,
          done: !!t.done,
          createdAt: t.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load tasks", err);
    }
  }

  // load on mount + poll every 10s
  useEffect(() => {
    loadTasks(); // initial

    const id = setInterval(loadTasks, 100); // every 0.1 seconds
    return () => clearInterval(id); // cleanup on unmount
  }, []);

  // 🔥 reload instantly when extension changes tasks
  useEffect(() => {
    loadTasks(); // initial load

    const bc = new BroadcastChannel("tasks-sync");
    bc.onmessage = (ev) => {
      if (ev.data === "updated") {
        loadTasks();
      }
    };

    return () => bc.close();
  }, []);

  // load tasks from backend
  useEffect(() => {
    axios
      .get(`${API_BASE}/api/tasks`)
      .then((res) => {
        setTasks(
          res.data.map((t) => ({
            id: t.id,
            text: t.text,
            done: !!t.done,
            createdAt: t.created_at,
          }))
        );
      })
      .catch((err) => {
        console.error("Failed to load tasks", err);
      });
  }, []);

  // 1) add createdAt when creating a task
  async function addTask(text) {
    if (!text.trim()) return;
    const createdAt = new Date().toISOString();

    try {
      const res = await axios.post(`${API_BASE}/api/tasks`, {
        text,
        done: false,
        createdAt,
        source: "web",
      });

      const t = res.data;
      setTasks((prev) => [
        ...prev,
        {
          id: t.id,
          text: t.text,
          done: !!t.done,
          createdAt: t.created_at,
        },
      ]);
    } catch (err) {
      console.error("Failed to add task", err);
    }
  }

  async function toggleTask(id) {
    const current = tasks.find((t) => t.id === id);
    if (!current) return;

    const newDone = !current.done;

    // optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: newDone } : t))
    );

    try {
      await axios.patch(`${API_BASE}/api/tasks/${id}`, {
        done: newDone,
      });
    } catch (err) {
      console.error("Failed to update task", err);
    }
  }

  async function deleteTask(id) {
    // optimistic UI
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await axios.delete(`${API_BASE}/api/tasks/${id}`);
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  }

  async function saveToday() {
    const dateKey = getDateKey(new Date());

    try {
      await axios.post(`${API_BASE}/api/journal`, {
        dateKey,
        mood, // can be null if user didn’t pick a mood
        note,
      });

      alert("Day saved! 🎉");
    } catch (err) {
      console.error("Failed to save journal", err);
      alert("Oops, couldn't save your day. Please try again.");
    }
  }

  // 2) Build a 7-day summary (last 7 days, including today)
  const today = new Date();
  const weeklySummary = [];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date();
    d.setDate(today.getDate() - offset);

    const dateKey = getDateKey(d);
    const label =
      offset === 0
        ? "Today"
        : d.toLocaleDateString(undefined, { weekday: "short" }); // Mon, Tue...

    const completedCount = tasks.filter(
      (t) => t.done && getDateKey(t.createdAt || today) === dateKey
    ).length;

    // simple intensity: 0–100% based on up to 5 tasks
    const intensity = Math.min(100, completedCount * 20);

    weeklySummary.push({
      dateKey,
      label,
      completed: completedCount,
      intensity,
    });
  }

  // ---- Today + weekly summary numbers ----
  const todayKey = getDateKey(today);

  const completedToday = tasks.filter(
    (t) => t.done && getDateKey(t.createdAt || today) === todayKey
  ).length;

  const totalCompletedWeek = weeklySummary.reduce(
    (sum, d) => sum + d.completed,
    0
  );

  const safeGoal = dailyGoal > 0 ? dailyGoal : 1; // avoid divide-by-zero
  const completionRateToday = Math.min(
    100,
    Math.round((completedToday / safeGoal) * 100)
  );

  // weekly goal = dailyGoal * 7
  const weeklyGoal = safeGoal * 7;

  // for bar height, compare each day to dailyGoal (cap at 100%)
  const maxForBars = safeGoal;

  const maxCompletedDay = Math.max(1, ...weeklySummary.map((d) => d.completed)); // avoid 0 for division

  return (
    <div className="today-layout">
      {/* LEFT: main page (your existing content) */}
      <div className="today-page">
        <h1 className="page-title">Today</h1>

        <section className="section">
          <h3 className="section-title">How do you feel?</h3>
          <MoodSelector mood={mood} setMood={setMood} />
        </section>

        <section className="section">
          <h3 className="section-title">Tasks</h3>
          <TaskList
            tasks={tasks}
            addTask={addTask}
            toggleTask={toggleTask}
            deleteTask={deleteTask}
          />
        </section>

        <section className="section">
          <h3 className="section-title">Journal</h3>
          <JournalInput note={note} setNote={setNote} />
        </section>

        <button className="save-button" onClick={saveToday}>
          Save Today
        </button>

        {/* Existing weekly report list */}
        <section className="section weekly-section">
          <h3 className="section-title">Weekly report</h3>
          <p className="weekly-subtitle">Completed tasks in the last 7 days.</p>
          <div className="weekly-list">
            {weeklySummary.map((day) => (
              <div className="weekly-row" key={day.dateKey}>
                <div className="weekly-day-label">{day.label}</div>

                <div className="weekly-bar-wrapper">
                  <div className="weekly-bar-bg">
                    <div
                      className="weekly-bar-fill"
                      style={{ width: `${day.intensity}%` }}
                    />
                  </div>
                </div>

                <div className="weekly-count">
                  {day.completed}{" "}
                  <span className="weekly-count-unit">done</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* RIGHT: stats + vertical bar chart + chat */}
      <aside className="today-sidebar">
        {/* Today summary with editable daily goal */}
        <div className="sidebar-card">
          <div className="sidebar-header-row">
            <h3 className="sidebar-title">Today summary</h3>

            <div className="goal-edit">
              <span className="goal-label">Daily goal</span>
              <input
                type="number"
                min={1}
                className="goal-input"
                value={dailyGoal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setDailyGoal(Number.isNaN(v) ? 1 : Math.max(1, v));
                }}
              />
            </div>
          </div>

          <p className="sidebar-number">{completedToday}</p>
          <p className="sidebar-label">tasks completed of {safeGoal} today</p>
          <div className="sidebar-progress">
            <div
              className="sidebar-progress-fill"
              style={{ width: `${completionRateToday}%` }}
            />
          </div>
          <p className="sidebar-small">
            Completion rate: {completionRateToday}%
          </p>
        </div>

        {/* Weekly bar chart uses goal-based heights */}
        <div className="sidebar-card">
          <h3 className="sidebar-title">Weekly bar chart</h3>
          <p className="sidebar-small">
            Total completed this week: <strong>{totalCompletedWeek}</strong> /{" "}
            {weeklyGoal}
          </p>

          <div className="weekly-chart">
            {weeklySummary.map((day) => (
              <div className="weekly-chart-col" key={day.dateKey}>
                <div className="weekly-chart-bar">
                  <div
                    className="weekly-chart-bar-inner"
                    style={{
                      height: `${
                        Math.min(100, (day.completed / maxForBars) * 100) || 0
                      }%`,
                    }}
                  />
                </div>
                <span className="weekly-chart-label">
                  {day.label === "Today" ? "T" : day.label[0]}
                </span>
                <span className="weekly-chart-count">{day.completed}</span>
              </div>
            ))}
          </div>
        </div>

        <SupportChatCard />
      </aside>
    </div>
  );
}

export default TodayPage;
