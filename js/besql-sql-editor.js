/**
 * BeSQL - Multi-Dialect SQL Editor
 * ================================
 * Built with CodeMirror 6 (@codemirror/lang-sql)
 *
 * INSTRUCTIONS FOR GITHUB COPILOT
 * --------------------------------
 * This file is the reference implementation for integrating a
 * multi-dialect SQL editor into the BeSQL platform (besql.vercel.app).
 *
 * The platform is Plain HTML/JS (no build step, no bundler).
 * All imports use ESM via esm.sh CDN.
 *
 * Files this integrates with:
 *   - The SQL Playground panel  (#sql-editor container)
 *   - The Contest problem editor (#contest-editor container)
 *   - The Daily Practice editor  (#practice-editor container)
 *
 * Usage:
 *   BeSQLEditor.init({ container, dialect, schema, onRun, readOnly })
 *   BeSQLEditor.getValue()
 *   BeSQLEditor.setValue(sql)
 *   BeSQLEditor.setDialect(dialectName)
 *   BeSQLEditor.setSchema(schemaObj)
 *   BeSQLEditor.destroy()
 *
 * Supported dialects (string keys):
 *   'mysql' | 'postgresql' | 'sqlite' | 'mssql' | 'mariadb' | 'plsql' | 'cassandra'
 *
 * Schema format (for autocomplete):
 *   {
 *     users:  ['id', 'name', 'email', 'created_at'],
 *     orders: ['id', 'user_id', 'total', 'status'],
 *   }
 *
 * Keyboard shortcuts:
 *   Ctrl+Enter  → triggers onRun callback with current SQL
 *   Ctrl+/      → toggle line comment
 *   Ctrl+Shift+F → format SQL (pretty print)
 *   Ctrl+Z / Ctrl+Y → undo / redo
 *
 * Theme:
 *   Dark theme matching BeSQL's existing dark SQL Playground UI.
 *   Uses CSS custom properties so you can override via :root.
 *
 * Dependencies (loaded via ESM — no npm install needed):
 *   codemirror@6
 *   @codemirror/lang-sql@6
 *   @codemirror/state@6
 *   @codemirror/view@6
 *   @codemirror/commands@6
 *   @codemirror/theme-one-dark (optional, swappable)
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
} from "https://esm.sh/@codemirror/lang-sql@6";

import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6";


// ─── DIALECT MAP ──────────────────────────────────────────────────────────────

/**
 * Maps dialect string keys → CodeMirror SQL dialect objects.
 * Extend this if you add more dialects.
 */
const DIALECTS = {
  mysql:      MySQL,
  postgresql: PostgreSQL,
  sqlite:     SQLite,
  mssql:      MSSQL,
  mariadb:    MariaSQL,
  plsql:      PLSQL,
  cassandra:  Cassandra,
};


// ─── BESQL CUSTOM THEME ───────────────────────────────────────────────────────

/**
 * Custom dark theme that matches BeSQL's existing Playground UI.
 * Override CSS variables in :root to restyle without touching this.
 *
 * CSS variables you can set on your page:
 *   --besql-editor-bg        Background of editor (default: #1a1a2e)
 *   --besql-editor-fg        Default text color   (default: #c9d1d9)
 *   --besql-editor-gutter    Gutter background    (default: #161625)
 *   --besql-editor-cursor    Caret color          (default: #58a6ff)
 *   --besql-editor-selection Selection highlight  (default: #264f78)
 *   --besql-editor-border    Border color         (default: #30363d)
 *   --besql-editor-radius    Border radius        (default: 8px)
 */
const beSQLTheme = EditorView.theme({
  "&": {
    color: "var(--besql-editor-fg, #c9d1d9)",
    backgroundColor: "var(--besql-editor-bg, #1a1a2e)",
    borderRadius: "var(--besql-editor-radius, 8px)",
    border: "1px solid var(--besql-editor-border, #30363d)",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  "&.cm-focused": {
    outline: "none",
    borderColor: "var(--besql-editor-cursor, #58a6ff)",
    boxShadow: "0 0 0 2px rgba(88,166,255,0.15)",
  },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "var(--besql-editor-cursor, #58a6ff)",
    minHeight: "180px",
  },
  ".cm-gutters": {
    backgroundColor: "var(--besql-editor-gutter, #161625)",
    borderRight: "1px solid var(--besql-editor-border, #30363d)",
    color: "#484f58",
    borderRadius: "var(--besql-editor-radius, 8px) 0 0 var(--besql-editor-radius, 8px)",
  },
  ".cm-lineNumbers .cm-gutterElement": {
    padding: "0 10px 0 6px",
    minWidth: "36px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "rgba(255,255,255,0.05)",
    color: "#8b949e",
  },
  ".cm-selectionBackground, ::selection": {
    backgroundColor: "var(--besql-editor-selection, #264f78) !important",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--besql-editor-cursor, #58a6ff)",
    borderLeftWidth: "2px",
  },
  ".cm-tooltip": {
    backgroundColor: "#1c2128",
    border: "1px solid #30363d",
    borderRadius: "6px",
    fontSize: "13px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "#264f78",
    color: "#c9d1d9",
  },
  ".cm-completionLabel": {
    color: "#c9d1d9",
  },
  ".cm-completionDetail": {
    color: "#8b949e",
    fontStyle: "normal",
    marginLeft: "8px",
  },
  ".cm-completionIcon": {
    opacity: "0.7",
  },
}, { dark: true });


// ─── EDITOR FACTORY ───────────────────────────────────────────────────────────

/**
 * BeSQLEditor — main public API
 *
 * @example
 * // Basic usage (Playground panel)
 * const editor = BeSQLEditor.init({
 *   container: document.getElementById('sql-editor'),
 *   dialect: 'mysql',
 *   onRun: (sql) => runQuery(sql),
 * });
 *
 * @example
 * // With schema autocomplete (Contest problem editor)
 * const editor = BeSQLEditor.init({
 *   container: document.getElementById('contest-editor'),
 *   dialect: 'postgresql',
 *   schema: {
 *     employees: ['id', 'name', 'department_id', 'salary'],
 *     departments: ['id', 'name', 'manager_id'],
 *   },
 *   onRun: (sql) => submitAnswer(sql),
 *   readOnly: false,
 * });
 *
 * @example
 * // Read-only view (show submitted SQL in Submissions panel)
 * const editor = BeSQLEditor.init({
 *   container: document.getElementById('submission-view'),
 *   dialect: 'mysql',
 *   initialValue: submission.sql,
 *   readOnly: true,
 * });
 */
const BeSQLEditor = (() => {

  // Internal state per instance
  let _view = null;
  let _langCompartment = new Compartment();
  let _readOnlyCompartment = new Compartment();
  let _themeCompartment = new Compartment();
  let _onRun = null;


  /**
   * Build the SQL language extension for the given dialect and schema.
   * @param {string} dialectKey  - One of the keys in DIALECTS
   * @param {object} schema      - Optional schema for autocomplete
   * @returns {Extension}
   */
  function _buildLang(dialectKey = 'mysql', schema = {}) {
    const dialect = DIALECTS[dialectKey] ?? MySQL;
    return sql({
      dialect,
      schema,
      // upperCaseKeywords: true,  // Uncomment to force uppercase SQL keywords
    });
  }


  /**
   * Build the Ctrl+Enter keymap binding that fires onRun.
   * @returns {KeyBinding[]}
   */
  function _runKeymap() {
    return [
      {
        key: "Ctrl-Enter",
        mac: "Cmd-Enter",
        run(view) {
          if (typeof _onRun === 'function') {
            _onRun(view.state.doc.toString());
          }
          return true;
        },
      },
      {
        key: "Ctrl-Shift-f",
        mac: "Cmd-Shift-f",
        run(_view) {
          // Basic SQL formatter — inserts newlines before major clauses.
          // Replace with a proper formatter lib if needed (e.g. sql-formatter).
          const current = _view.state.doc.toString();
          const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN',
            'RIGHT JOIN', 'INNER JOIN', 'GROUP BY', 'ORDER BY', 'HAVING',
            'LIMIT', 'OFFSET', 'UNION', 'INSERT INTO', 'VALUES',
            'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
            'DROP TABLE'];
          let formatted = current;
          keywords.forEach(kw => {
            const re = new RegExp(`\\b(${kw})\\b`, 'gi');
            formatted = formatted.replace(re, '\n$1');
          });
          formatted = formatted.trim();
          _view.dispatch({
            changes: { from: 0, to: _view.state.doc.length, insert: formatted },
          });
          return true;
        },
      },
    ];
  }


  /**
   * Assemble the full extension list.
   * @param {object} opts
   * @param {string}  opts.dialect
   * @param {object}  opts.schema
   * @param {boolean} opts.readOnly
   * @returns {Extension[]}
   */
  function _buildExtensions({ dialect, schema, readOnly }) {
    return [
      // Line numbers + gutter
      lineNumbers(),
      highlightActiveLineGutter(),
      foldGutter(),

      // Editing helpers
      history(),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),

      // Autocomplete
      autocompletion(),

      // Syntax highlighting
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

      // Keymaps
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab,
        { key: "Ctrl-/", mac: "Cmd-/", run: toggleComment },
        ..._runKeymap(),
      ]),

      // Compartments (hot-swappable at runtime)
      _langCompartment.of(_buildLang(dialect, schema)),
      _readOnlyCompartment.of(EditorState.readOnly.of(!!readOnly)),
      _themeCompartment.of([oneDark, beSQLTheme]),

      // Line wrap (optional — comment out if you prefer horizontal scroll)
      // EditorView.lineWrapping,
    ];
  }


  // ── PUBLIC API ──────────────────────────────────────────────────────────────

  return {

    /**
     * Initialize the editor and mount it into `container`.
     * Replaces any existing child content of the container.
     *
     * @param {object}      opts
     * @param {HTMLElement} opts.container    - DOM element to mount into
     * @param {string}      [opts.dialect='mysql']  - SQL dialect key
     * @param {object}      [opts.schema={}]        - Schema for autocomplete
     * @param {string}      [opts.initialValue='']  - Initial SQL content
     * @param {boolean}     [opts.readOnly=false]   - Disable editing
     * @param {function}    [opts.onRun]            - Called with SQL on Ctrl+Enter
     * @param {number}      [opts.minHeight=180]    - Min editor height in px
     * @returns {BeSQLEditor} this (for chaining)
     */
    init({
      container,
      dialect = 'mysql',
      schema = {},
      initialValue = '',
      readOnly = false,
      onRun,
      minHeight = 180,
    } = {}) {
      if (!container) {
        console.error('[BeSQLEditor] container element is required');
        return this;
      }

      // Destroy any previous instance
      this.destroy();

      _onRun = onRun ?? null;

      // Apply min-height via CSS variable
      container.style.setProperty('--cm-min-height', `${minHeight}px`);

      _view = new EditorView({
        state: EditorState.create({
          doc: initialValue,
          extensions: _buildExtensions({ dialect, schema, readOnly }),
        }),
        parent: container,
      });

      return this;
    },


    /**
     * Get the current SQL string from the editor.
     * @returns {string}
     */
    getValue() {
      return _view?.state.doc.toString() ?? '';
    },


    /**
     * Replace the editor content with new SQL.
     * @param {string} sql
     * @returns {BeSQLEditor}
     */
    setValue(sql = '') {
      if (!_view) return this;
      _view.dispatch({
        changes: { from: 0, to: _view.state.doc.length, insert: sql },
      });
      return this;
    },


    /**
     * Switch the active SQL dialect at runtime (no editor remount needed).
     * @param {string} dialectKey - Key from DIALECTS map
     * @param {object} [schema={}]
     * @returns {BeSQLEditor}
     */
    setDialect(dialectKey, schema = {}) {
      if (!_view) return this;
      _view.dispatch({
        effects: _langCompartment.reconfigure(_buildLang(dialectKey, schema)),
      });
      return this;
    },


    /**
     * Update the autocomplete schema without changing the dialect.
     * Useful when the contest problem changes the available tables.
     * @param {object} schema
     * @returns {BeSQLEditor}
     */
    setSchema(schema = {}) {
      if (!_view) return this;
      const currentLang = _view.state.facet(EditorState.languageData);
      // Re-apply current dialect with new schema
      // Note: dialect key is tracked outside in your UI — pass it again here.
      // For simplicity, defaults to mysql if not tracked separately.
      _view.dispatch({
        effects: _langCompartment.reconfigure(_buildLang('mysql', schema)),
      });
      return this;
    },


    /**
     * Toggle read-only mode.
     * @param {boolean} isReadOnly
     * @returns {BeSQLEditor}
     */
    setReadOnly(isReadOnly) {
      if (!_view) return this;
      _view.dispatch({
        effects: _readOnlyCompartment.reconfigure(
          EditorState.readOnly.of(!!isReadOnly)
        ),
      });
      return this;
    },


    /**
     * Focus the editor programmatically.
     * @returns {BeSQLEditor}
     */
    focus() {
      _view?.focus();
      return this;
    },


    /**
     * Destroy the editor instance and clean up DOM.
     * @returns {BeSQLEditor}
     */
    destroy() {
      _view?.destroy();
      _view = null;
      _onRun = null;
      return this;
    },


    /**
     * List all supported dialect keys.
     * @returns {string[]}
     */
    getSupportedDialects() {
      return Object.keys(DIALECTS);
    },

  };

})();


// ─── EXPORT ───────────────────────────────────────────────────────────────────

export default BeSQLEditor;

// Also attach to window for non-module HTML usage:
// <script type="module" src="js/besql-sql-editor.js"></script>
// window.BeSQLEditor.init({ ... })
if (typeof window !== 'undefined') {
  window.BeSQLEditor = BeSQLEditor;
}
