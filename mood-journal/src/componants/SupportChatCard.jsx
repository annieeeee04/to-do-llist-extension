// src/componants/SupportChatCard.jsx
import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:4000";

function SupportChatCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi, I’m your AI buddy. I can listen and give gentle suggestions, " +
        "but I’m not a professional. What’s on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [
      ...messages,
      { role: "user", text },
    ];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // hit your backend; backend will talk to ChatGPT API
      const res = await axios.post(`${API_BASE}/api/chat`, {
        messages: newMessages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
      });

      const replyText = res.data.reply || "(No reply received)";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: replyText },
      ]);
    } catch (err) {
      console.error("chat error", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            "Sorry, I had trouble connecting right now. " +
            "You can try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sidebar-card">
      <div className="chat-header-row">
        <h3 className="sidebar-title">Need to talk?</h3>
        <label className="chat-toggle">
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => setIsOpen(e.target.checked)}
          />
          <span className="chat-toggle-label">
            {isOpen ? "On" : "Off"}
          </span>
        </label>
      </div>

      <p className="sidebar-small">
        Chat with an AI companion about your day.
        This is not a substitute for professional help.
      </p>

      {isOpen && (
        <>
          <div className="chat-window">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === "user"
                    ? "chat-bubble chat-bubble-user"
                    : "chat-bubble chat-bubble-ai"
                }
              >
                {m.text}
              </div>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              className="chat-input"
              type="text"
              placeholder="Type something…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="chat-send-btn"
              type="submit"
              disabled={loading || !input.trim()}
            >
              {loading ? "…" : "Send"}
            </button>
          </form>

          <p className="chat-crisis-note">
            If you ever feel in danger or unable to cope,
            please contact local emergency services or a
            crisis hotline in your area.
          </p>
        </>
      )}
    </div>
  );
}

export default SupportChatCard;
