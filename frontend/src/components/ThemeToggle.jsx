import React, { useState, useEffect } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("dayflow_theme");
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("dayflow_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle visual theme"
    >
      {theme === "dark" ? (
        <>
          <i className="bi bi-sun-fill text-warning"></i>
          <span className="small d-none d-md-inline">Light</span>
        </>
      ) : (
        <>
          <i className="bi bi-moon-stars-fill" style={{ color: "#B59A61" }}></i>
          <span className="small d-none d-md-inline">Dark</span>
        </>
      )}
    </button>
  );
}

export default ThemeToggle;
