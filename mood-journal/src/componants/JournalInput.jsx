// JournalInput.jsx

const MAX_CHARS = 1000;

const PROMPTS = [
  "What went well today, even if it was small?",
  "What is making you feel stressed right now?",
  "What would you tell a friend who felt the way you do today?",
];

function JournalInput({ note, setNote }) {
  const length = note.length;
  const remaining = MAX_CHARS - length;
  const isNearLimit = remaining <= 100;

  function handleChange(e) {
    const value = e.target.value;
    if (value.length <= MAX_CHARS) {
      setNote(value);
    }
  }

  function insertPrompt(text) {
    if (!note.trim()) {
      setNote(text + " ");
    } else {
      setNote(note.trimEnd() + "\n\n" + text + " ");
    }
  }

  return (
    <div className="journal-card">
      <div className="journal-header-row">
        <div>
          <h4 className="journal-title">Today&rsquo;s reflection</h4>
          <p className="journal-subtitle">
            A few sentences are enough. This stays on your device for now.
          </p>
        </div>
        <span
          className={
            "journal-counter" + (isNearLimit ? " journal-counter-warn" : "")
          }
        >
          {length}/{MAX_CHARS}
        </span>
      </div>

      <div className="journal-prompts-row">
        {PROMPTS.map((p, i) => (
          <button
            key={i}
            type="button"
            className="journal-chip"
            onClick={() => insertPrompt(p)}
          >
            {i === 0 && "✨ "}
            {i === 1 && "🌧 "}
            {i === 2 && "💌 "}
            {p}
          </button>
        ))}
      </div>

      <textarea
        className="journal-textarea"
        value={note}
        onChange={handleChange}
        rows={5}
        placeholder="Write about your day, or tap a prompt above to get started..."
      />

      <p className="journal-footer-note">
        Be kind to yourself. This journal is for you, not for perfection.
      </p>
    </div>
  );
}

export default JournalInput;

  