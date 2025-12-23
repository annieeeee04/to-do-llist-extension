import { useState } from "react";

function TaskList({ tasks, addTask, toggleTask, deleteTask }) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (input.trim() === "") return;
    addTask(input.trim());
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      handleAdd();
    }
  }

  return (
    <div className="task-list-wrapper">
      <div className="task-input-row">
        <input
          className="task-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add task..."
        />
        <button className="task-add-btn" type="button" onClick={handleAdd}>
          Add
        </button>
      </div>

      <ul className="task-list">
        {tasks.map((task) => (
          <li className="task-item" key={task.id}>
            <label className="task-content">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task.id)}
              />
              <span
                className={`task-text ${task.done ? "task-text-done" : ""}`}
              >
                {task.text}
              </span>
            </label>
            <button
              className="task-delete-btn"
              type="button"
              onClick={() => deleteTask(task.id)}
            >
              ✕
            </button>
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="task-empty-state">No tasks yet. Add your first one ✨</li>
        )}
      </ul>
    </div>
  );
}

export default TaskList;
