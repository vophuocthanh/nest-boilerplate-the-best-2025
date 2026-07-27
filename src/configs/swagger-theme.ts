export const SWAGGER_CUSTOM_CSS = `
/* Floating theme toggle button (light mode look). Placed below the topbar so it
   never hides behind the explorer bar. */
#swagger-theme-toggle {
  position: fixed;
  top: 76px;
  right: 16px;
  z-index: 99999;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid #888;
  background: #ffffff;
  color: #111111;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

/* ===== Dark theme ===== */
body.swagger-dark { background-color: #1f2430; }
body.swagger-dark .swagger-ui { color: #d6deeb; }
body.swagger-dark .swagger-ui .topbar { background: #11151c; }

body.swagger-dark .swagger-ui .info .title,
body.swagger-dark .swagger-ui .info li,
body.swagger-dark .swagger-ui .info p,
body.swagger-dark .swagger-ui .info table,
body.swagger-dark .swagger-ui label,
body.swagger-dark .swagger-ui .opblock-tag,
body.swagger-dark .swagger-ui .opblock .opblock-summary-operation-id,
body.swagger-dark .swagger-ui .opblock .opblock-summary-path,
body.swagger-dark .swagger-ui .opblock .opblock-summary-description,
body.swagger-dark .swagger-ui .opblock-description-wrapper p,
body.swagger-dark .swagger-ui .parameter__name,
body.swagger-dark .swagger-ui .parameter__type,
body.swagger-dark .swagger-ui table thead tr td,
body.swagger-dark .swagger-ui table thead tr th,
body.swagger-dark .swagger-ui .response-col_status,
body.swagger-dark .swagger-ui .responses-inner h4,
body.swagger-dark .swagger-ui .responses-inner h5,
body.swagger-dark .swagger-ui .model-title,
body.swagger-dark .swagger-ui .model,
body.swagger-dark .swagger-ui .tab li,
body.swagger-dark .swagger-ui .opblock .opblock-section-header h4,
body.swagger-dark .swagger-ui .opblock .opblock-section-header label { color: #d6deeb; }

body.swagger-dark .swagger-ui .scheme-container,
body.swagger-dark .swagger-ui section.models,
body.swagger-dark .swagger-ui .opblock .opblock-section-header { background: #232936; box-shadow: none; }

body.swagger-dark .swagger-ui .opblock { background: #232936; border-color: #2f3b52; }
body.swagger-dark .swagger-ui section.models .model-container { background: #232936; }

body.swagger-dark .swagger-ui input,
body.swagger-dark .swagger-ui textarea,
body.swagger-dark .swagger-ui select {
  background: #11151c;
  color: #d6deeb;
  border-color: #2f3b52;
}

body.swagger-dark .swagger-ui .model-box { background: #11151c; }
body.swagger-dark .swagger-ui svg:not(:root) { fill: #d6deeb; }
body.swagger-dark .swagger-ui .opblock-body pre.microlight { background: #11151c !important; color: #d6deeb; }
body.swagger-dark .swagger-ui .markdown code,
body.swagger-dark .swagger-ui .renderedMarkdown code { background: #11151c; color: #f78c6c; }

/* Theme toggle button (dark mode look) */
body.swagger-dark #swagger-theme-toggle {
  background: #232936;
  color: #d6deeb;
  border-color: #2f3b52;
}
`;

export const SWAGGER_THEME_TOGGLE_JS = `
(function () {
  var STORAGE_KEY = 'swagger-theme';

  function currentTheme() {
    return localStorage.getItem(STORAGE_KEY) || 'light';
  }

  function applyTheme(theme) {
    document.body.classList.toggle('swagger-dark', theme === 'dark');
    var btn = document.getElementById('swagger-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  function toggleTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  function init() {
    if (!document.body) return;
    if (document.getElementById('swagger-theme-toggle')) return true;
    var btn = document.createElement('button');
    btn.id = 'swagger-theme-toggle';
    btn.type = 'button';
    btn.addEventListener('click', toggleTheme);
    document.body.appendChild(btn);
    applyTheme(currentTheme());
    return true;
  }

  // Mount as soon as possible, then keep retrying briefly until the button exists
  // (covers cases where the body/Swagger UI is still rendering).
  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('load', init);
  var tries = 0;
  var timer = setInterval(function () {
    if (init() || ++tries > 20) clearInterval(timer);
  }, 200);
})();
`;
