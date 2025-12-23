// ==== DOM ELEMENTS ====
const input = document.getElementById("new-task");
const addBtn = document.getElementById("add-btn");
const list = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const openTabBtn = document.getElementById("open-tab");
const bc = new BroadcastChannel("tasks-sync");

// ---- Backend base URL ----
const API_BASE = "http://localhost:4000";

// ==== STORAGE HELPERS (extension local storage) ====
function loadTasks() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["tasks"], (result) => {
      resolve(result.tasks || []);
    });
  });
}

function saveTasks(tasks) {
  sortTasks(tasks); // keep storage sorted too
  chrome.storage.sync.set({ tasks });
}

// ---- Sorting: incomplete on top, completed at bottom ----
function sortTasks(tasks) {
  tasks.sort((a, b) => Number(a.done) - Number(b.done));
}

// ==== BACKEND HELPERS ====

// 1) Create task in backend, return created task { id, text, done, created_at, source }
async function syncTaskToBackend(text) {
  const res = await fetch(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      done: false,
      createdAt: new Date().toISOString(),
      source: "extension",
    }),
  });

  if (!res.ok) {
    throw new Error("Backend POST failed");
  }

  const createdTask = await res.json();

  // ✅ notify React page that tasks changed
  bc.postMessage("updated");

  return createdTask;
}

// 2) Update "done" in backend
async function updateDoneInBackend(backendId, done) {
  const res = await fetch(`${API_BASE}/api/tasks/${backendId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) {
    throw new Error("Backend PATCH failed");
  }
}

// 3) Delete in backend
async function deleteInBackend(backendId) {
  const res = await fetch(`${API_BASE}/api/tasks/${backendId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    throw new Error("Backend DELETE failed");
  }
}

// ==== EDITING HELPERS (inline edit) ====
function startEditing(span, index, tasks) {
  const originalText = tasks[index].text;
  const parent = span.parentElement; // .task-left

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.value = originalText;
  editInput.className = "edit-input";

  parent.replaceChild(editInput, span);
  editInput.focus();
  editInput.setSelectionRange(editInput.value.length, editInput.value.length);

  function finishEdit(save) {
    editInput.removeEventListener("blur", onBlur);
    editInput.removeEventListener("keydown", onKeyDown);

    if (save) {
      const newText = editInput.value.trim();
      if (newText) {
        tasks[index].text = newText;
        // NOTE: if you also want to sync text edits to backend,
        // you could add another PATCH call here.
      }
      saveTasks(tasks);
    }

    renderTasks(tasks);
  }

  function onBlur() {
    finishEdit(true);
  }

  function onKeyDown(e) {
    if (e.key === "Enter") {
      finishEdit(true);
    } else if (e.key === "Escape") {
      finishEdit(false);
    }
  }

  editInput.addEventListener("blur", onBlur);
  editInput.addEventListener("keydown", onKeyDown);
}

// ==== UI: create one <li> ====
function createTaskElement(task, index, tasks) {
  const li = document.createElement("li");
  li.className = "task-item";

  const left = document.createElement("div");
  left.className = "task-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!task.done;
  checkbox.className = "task-checkbox";

  // When checkbox changes -> update storage + backend
  checkbox.addEventListener("change", async () => {
    const checked = checkbox.checked;
    tasks[index].done = checked;
    saveTasks(tasks);
    renderTasks(tasks);

    const backendId = tasks[index].backendId;
    if (backendId) {
      try {
        await updateDoneInBackend(backendId, checked);

        bc.postMessage("updated");
      } catch (err) {
        console.error("Failed to sync done to backend", err);
      }
    }
  });

  const span = document.createElement("span");
  span.textContent = task.text;
  span.className = "task-text";
  if (task.done) span.classList.add("done");

  // Click on text to edit (local only for now)
  span.addEventListener("click", () => startEditing(span, index, tasks));

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.className = "delete-btn";

  // When delete -> update storage + backend
  deleteBtn.addEventListener("click", async () => {
    const backendId = tasks[index].backendId;

    tasks.splice(index, 1);
    saveTasks(tasks);
    renderTasks(tasks);

    if (backendId) {
      try {
        await deleteInBackend(backendId);
        bc.postMessage("updated");
      } catch (err) {
        console.error("Failed to delete from backend", err);
      }
    }
  });

  left.appendChild(checkbox);
  left.appendChild(span);
  li.appendChild(left);
  li.appendChild(deleteBtn);

  return li;
}

// ==== Render whole list ====
function renderTasks(tasks) {
  sortTasks(tasks);
  list.innerHTML = "";

  if (!tasks.length) {
    if (emptyState) emptyState.style.display = "block";
    return;
  } else {
    if (emptyState) emptyState.style.display = "none";
  }

  tasks.forEach((task, index) => {
    list.appendChild(createTaskElement(task, index, tasks));
  });
}

// ==== ADD BUTTON: add + sync to backend ====
addBtn.addEventListener("click", async () => {
  const text = input.value.trim();
  if (!text) return;

  const tasks = await loadTasks();

  try {
    const backendTask = await syncTaskToBackend(text);

    tasks.push({
      text,
      done: !!backendTask.done,
      createdAt: backendTask.created_at,
      backendId: backendTask.id, // 👈 store the DB id
    });

    saveTasks(tasks);
    renderTasks(tasks);

    input.value = "";
    input.focus();
  } catch (err) {
    console.error("Backend sync failed", err);
  }
});

// Enter key = click Add
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addBtn.click();
  }
});

// ==== INIT POPUP ====
(async function init() {
  const tasks = await loadTasks();
  renderTasks(tasks);
})();

// Open full page
if (openTabBtn) {
  openTabBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "popup.html" }); // or your React URL
  });
}
