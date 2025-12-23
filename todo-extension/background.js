// background.js

// Helpers to load/save tasks (same shape as popup.js)
function loadTasks() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["tasks"], (result) => {
        resolve(result.tasks || []);
      });
    });
  }
  
  function saveTasks(tasks) {
    chrome.storage.sync.set({ tasks });
  }
  
  // Optional: keep the same sorting rule (incomplete on top)
  function sortTasks(tasks) {
    tasks.sort((a, b) => Number(a.done) - Number(b.done));
  }
  
  // Add a task with given text
  async function addTaskFromContext(text) {
    if (!text || !text.trim()) return;
  
    const tasks = await loadTasks();
    tasks.push({ text: text.trim(), done: false });
  
    sortTasks(tasks); // optional, matches your popup behavior
    saveTasks(tasks);
  }
  
  // Create context menu entries when extension is installed/updated
  chrome.runtime.onInstalled.addListener(() => {
    // Right-click selected text
    chrome.contextMenus.create({
      id: "addTodoSelection",
      title: 'Add to Todo: "%s"',
      contexts: ["selection"]
    });
  
    // Right-click page (no selection)
    chrome.contextMenus.create({
      id: "addTodoPage",
      title: "Add page to Todo",
      contexts: ["page"]
    });
  });
  
  // Handle clicks on our context menu items
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "addTodoSelection") {
      // Use selected text
      addTaskFromContext(info.selectionText);
    } else if (info.menuItemId === "addTodoPage") {
      // Use page title (fallback to URL)
      const title = tab && tab.title ? tab.title : info.pageUrl;
      addTaskFromContext(title);
    }
  });
  