function MoodSelector({ mood, setMood }) {
    const moods = ["😢", "😕", "😐", "😊", "🤩"];
  
    return (
      <div className="mood-selector">
        {moods.map((m, i) => {
          const value = i + 1;
          const isActive = mood === value;
  
          return (
            <button
              key={value}
              type="button"
              className={`mood-button ${isActive ? "mood-button-active" : ""}`}
              onClick={() => setMood(value)}
            >
              {m}
            </button>
          );
        })}
      </div>
    );
  }
  
  export default MoodSelector;
  