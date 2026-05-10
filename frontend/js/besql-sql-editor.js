/**
 * BeSQL - Multi-Dialect SQL Editor
 * ================================
 * Built with CodeMirror 6 (@codemirror/lang-sql)
 */

// ─── IMPORTS ──────────────────────────────────────────────────────────────────

import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  rectangularSelection,
  crosshairCursor,
  dropCursor,
} from "https://esm.sh/@codemirror/view@6";

import {
  EditorState,
  Compartment,
} from "https://esm.sh/@codemirror/state@6";

import {
  defaultKeymap,
  history,
  historyKeymap,
  toggleComment,
  indentWithTab,
} from "https://esm.sh/@codemirror/commands@6";

import {
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
  foldGutter,
  indentOnInput,
} from "https://esm.sh/@codemirror/language@6";

import {
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
} from "https://esm.sh/@codemirror/autocomplete@6";

import {
  sql,
  MySQL,
  PostgreSQL,
  SQLite,
  MSSQL,
  MariaSQL,
  PLSQL,
  Cassandra,
  OracleSQL,
} from "https://esm.sh/@codemirror/lang-sql@6";

import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6";


// ─── DIALECT MAP ──────────────────────────────────────────────────────────────

const DIALECTS = {
  mysql: MySQL,
  postgresql: PostgreSQL,
  sqlite: SQLite,
  mssql: MSSQL,
  mariadb: MariaSQL,
  plsql: PLSQL,
  cassandra: Cassandra,
  oracle: OracleSQL,
  sqlserver: MSSQL,
};


// ─── DARK THEME (existing) ────────────────────────────────────────────────────

const beSQLDarkTheme = EditorView.theme({
  "&": {
    color: "var(--t0, #c9d1d9)",
    backgroundColor: "var(--bg, #0d1117)",
    borderRadius: "var(--r, 5px)",
    border: "1px solid var(--line2, #2a3347)",
    fontSize: "13.5px",
    fontFamily: "var(--mono, monospace)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--grn, #58a6ff)",
    boxShadow: "0 0 0 2px rgba(46,200,102,0.15)",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "var(--t0, #58a6ff)",
    minHeight: "var(--cm-min-height, 180px)",
  },
  ".cm-gutters": {
    backgroundColor: "var(--bg1, #161b22)",
    borderRight: "1px solid var(--line, #21293a)",
    color: "var(--t3, #484f58)",
    borderRadius: "var(--r, 5px) 0 0 var(--r, 5px)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 6px",
    minWidth: "36px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "var(--t1, #8b949e)",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(79,142,247,0.25) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--t0, #58a6ff)",
    borderLeftWidth: "2px",
  },
  ".cm-tooltip": {
    backgroundColor: "var(--bg2, #1c2128)",
    border: "1px solid var(--line2, #30363d)",
    borderRadius: "var(--r, 6px)",
    fontSize: "13px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--idim, #264f78)",
    color: "var(--t0, #c9d1d9)",
  },
  ".cm-completionLabel": {
    color: "var(--t0, #c9d1d9)",
  },
  ".cm-completionDetail": {
    color: "var(--t2, #8b949e)",
    fontStyle: "normal",
    marginLeft: "8px",
  },
  ".cm-completionIcon": {
    opacity: "0.7",
  },
}, { dark: true });


// ─── LIGHT THEME (new) ───────────────────────────────────────────────────────

const beSQLLightTheme = EditorView.theme({
  "&": {
    color: "#24292f",
    backgroundColor: "#ffffff",
    borderRadius: "var(--r, 5px)",
    border: "1px solid #d0d7de",
    fontSize: "13.5px",
    fontFamily: "var(--mono, monospace)",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "#0969da",
    boxShadow: "0 0 0 2px rgba(9,105,218,0.15)",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "#0969da",
    minHeight: "var(--cm-min-height, 180px)",
  },
  ".cm-gutters": {
    backgroundColor: "#f6f8fa",
    borderRight: "1px solid #d0d7de",
    color: "#8c959f",
    borderRadius: "var(--r, 5px) 0 0 var(--r, 5px)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 6px",
    minWidth: "36px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0,0,0,0.03)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(0,0,0,0.05)",
    color: "#24292f",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "rgba(9,105,218,0.15) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "#0969da",
    borderLeftWidth: "2px",
  },
  ".cm-tooltip": {
    backgroundColor: "#ffffff",
    border: "1px solid #d0d7de",
    borderRadius: "var(--r, 6px)",
    fontSize: "13px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "#0969da",
    color: "#ffffff",
  },
  ".cm-completionLabel": {
    color: "#24292f",
  },
  ".cm-completionDetail": {
    color: "#57606a",
    fontStyle: "normal",
    marginLeft: "8px",
  },
  ".cm-completionIcon": {
    opacity: "0.7",
  },
}, { dark: false });


// ─── THEME BUNDLES ────────────────────────────────────────────────────────────
// Each bundle = [CodeMirror base theme, BeSQL custom theme]

const THEMES = {
  dark: [oneDark, beSQLDarkTheme],
  light: [beSQLLightTheme],        // light has no CM base theme — uses defaultHighlightStyle
};


// ─── SYSTEM THEME DETECTION ───────────────────────────────────────────────────

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;


// ─── BE SQL EDITOR CLASS ─────────────────────────────────────────────────────

export class BeSQLEditor {
  constructor() {
    this._view = null;
    this._onRun = null;
    this._langCompartment = new Compartment();
    this._readOnlyCompartment = new Compartment();
    this._themeCompartment = new Compartment();
    this._currentTheme = 'system'; // 'dark' | 'light' | 'system'
    this._systemThemeListener = null;
  }

  /**
   * Initialize the editor and mount it into `container`.
   * @param {object} opts
   * @param {HTMLElement} opts.container
   * @param {string}  [opts.dialect='mysql']
   * @param {object}  [opts.schema={}]
   * @param {string}  [opts.initialValue='']
   * @param {boolean} [opts.readOnly=false]
   * @param {function} [opts.onRun]
   * @param {number}  [opts.minHeight=180]
   * @param {'dark'|'light'|'system'} [opts.theme='system']
   */
  init({
    container,
    dialect = 'mysql',
    schema = {},
    initialValue = '',
    readOnly = false,
    onRun,
    minHeight = 180,
    theme = 'system',   // ← NEW: default follows system
  } = {}) {
    if (!container) {
      console.error('[BeSQLEditor] container element is required');
      return this;
    }

    this.destroy();
    this._onRun = onRun ?? null;
    this._currentTheme = theme;

    container.style.setProperty('--cm-min-height', `${minHeight}px`);

    this._view = new EditorView({
      state: EditorState.create({
        doc: initialValue,
        extensions: this._buildExtensions({ dialect, schema, readOnly }),
      }),
      parent: container,
    });

    // Listen for OS theme changes when in 'system' mode
    this._attachSystemListener();

    return this;
  }

  // ── Private: resolve 'system' → 'dark' | 'light' ──────────────────────────
  _resolvedTheme() {
    if (this._currentTheme === 'system') {
      return systemPrefersDark() ? 'dark' : 'light';
    }
    return this._currentTheme;
  }

  // ── Private: attach matchMedia listener for system theme ──────────────────
  _attachSystemListener() {
    this._detachSystemListener();

    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    this._systemThemeListener = (e) => {
      if (this._currentTheme === 'system') {
        this._applyTheme(e.matches ? 'dark' : 'light');
      }
    };

    mq.addEventListener('change', this._systemThemeListener);
  }

  _detachSystemListener() {
    if (!this._systemThemeListener) return;
    window.matchMedia?.('(prefers-color-scheme: dark)')
      ?.removeEventListener('change', this._systemThemeListener);
    this._systemThemeListener = null;
  }

  // ── Private: push theme extensions into the compartment ───────────────────
  _applyTheme(resolved) {
    if (!this._view) return;
    this._view.dispatch({
      effects: this._themeCompartment.reconfigure(THEMES[resolved] ?? THEMES.dark),
    });
  }

  _buildLang(dialectKey = 'mysql', schema = {}) {
    const dialect = DIALECTS[dialectKey] ?? MySQL;
    return sql({ dialect, schema });
  }

  _runKeymap() {
    return [
      {
        key: "Ctrl-Enter",
        mac: "Cmd-Enter",
        run: (view) => {
          if (typeof this._onRun === 'function') {
            this._onRun(view.state.doc.toString());
          }
          return true;
        },
      },
      {
        key: "Ctrl-Shift-f",
        mac: "Cmd-Shift-f",
        run: (view) => {
          const current = view.state.doc.toString();
          const keywords = [
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
            'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
            'UNION', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
            'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE'
          ];
          let formatted = current;
          keywords.forEach(kw => {
            const re = new RegExp(`\\b(${kw})\\b`, 'gi');
            formatted = formatted.replace(re, '\n$1');
          });
          formatted = formatted.trim();
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: formatted },
          });
          return true;
        },
      },
    ];
  }

  _buildExtensions({ dialect, schema, readOnly }) {
    return [
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter(),
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab,
        { key: "Ctrl-/", mac: "Cmd-/", run: toggleComment },
        ...this._runKeymap(),
      ]),
      this._langCompartment.of(this._buildLang(dialect, schema)),
      this._readOnlyCompartment.of(EditorState.readOnly.of(!!readOnly)),
      this._themeCompartment.of(THEMES[this._resolvedTheme()]),
    ];
  }

  // ─── PUBLIC API ─────────────────────────────────────────────────────────────

  getValue() {
    return this._view?.state.doc.toString() ?? '';
  }

  setValue(sql = '') {
    if (!this._view) return this;
    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: sql },
    });
    return this;
  }

  setDialect(dialectKey, schema = {}) {
    if (!this._view) return this;
    this._view.dispatch({
      effects: this._langCompartment.reconfigure(this._buildLang(dialectKey, schema)),
    });
    return this;
  }

  setSchema(schema = {}) {
    if (!this._view) return this;
    this._view.dispatch({
      effects: this._langCompartment.reconfigure(this._buildLang('mysql', schema)),
    });
    return this;
  }

  setReadOnly(isReadOnly) {
    if (!this._view) return this;
    this._view.dispatch({
      effects: this._readOnlyCompartment.reconfigure(
        EditorState.readOnly.of(!!isReadOnly)
      ),
    });
    return this;
  }

  /**
   * Switch editor theme.
   * @param {'dark' | 'light' | 'system'} theme
   *   'system' — follows OS preference and updates live when it changes
   *   'dark'   — always dark regardless of OS
   *   'light'  — always light regardless of OS
   */
  setTheme(theme) {
    if (!['dark', 'light', 'system'].includes(theme)) {
      console.warn(`[BeSQLEditor] Unknown theme "${theme}". Use 'dark', 'light', or 'system'.`);
      return this;
    }

    this._currentTheme = theme;

    if (theme === 'system') {
      // Re-attach listener in case it was detached
      this._attachSystemListener();
      this._applyTheme(systemPrefersDark() ? 'dark' : 'light');
    } else {
      // Manual override — detach system listener so OS changes don't override
      this._detachSystemListener();
      this._applyTheme(theme);
    }

    return this;
  }

  /**
   * Returns the currently active resolved theme ('dark' or 'light').
   * Useful for syncing a toggle button state.
   */
  getTheme() {
    return this._resolvedTheme();
  }

  focus() {
    this._view?.focus();
    return this;
  }

  destroy() {
    this._detachSystemListener();
    this._view?.destroy();
    this._view = null;
    this._onRun = null;
    return this;
  }

  getSupportedDialects() {
    return Object.keys(DIALECTS);
  }
}

// Attach to window for non-module usage
if (typeof window !== 'undefined') {
  window.BeSQLEditor = BeSQLEditor;
}

export default BeSQLEditor;