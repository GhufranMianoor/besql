/**
 * views/judge.js — LeetCode-style problem solver (split-pane judge view).
 *
 * Layout: left panel = problem description + test-case tracker
 *         right panel = SQL editor + run/submit buttons + result table
 */
'use strict';

function renderJudge(ctx) {
  if (!ctx) { nav('home'); return; }
  S.judgeCtx = ctx;
  const p = S.problems.find(x => x.id === ctx.problemId);
  if (!p) { toast('Problem not found', 'error'); nav(ctx.backView || 'home'); return; }

  el('judge-back-btn').onclick = () => nav(ctx.backView || 'home', ctx.contestId);
  el('judge-diff').textContent  = p.difficulty;
  el('judge-diff').className    = diffCls(p.difficulty);
  el('judge-pts').textContent   = `+${p.points}`;
  el('judge-title').textContent = p.title;
  const codeEl = el('judge-code');
  if (codeEl) codeEl.textContent = p.code || p.id.toUpperCase();

  // ── Problem description HTML ────────────────────────────
  let descHTML = `<div style="font-size:13px;color:var(--t1);line-height:1.8;white-space:pre-line">${esc(p.description)}</div>`;

  if (p.sampleOutput?.columns) {
    const so = p.sampleOutput;
    descHTML += `
      <div class="prob-section">
        <div class="prob-section-title">Sample Output</div>
        <div style="overflow-x:auto">
          <table class="sample-table">
            <thead><tr>${so.columns.map(col => `<th>${esc(col)}</th>`).join('')}</tr></thead>
            <tbody>${so.rows.map(row => `<tr>${row.map(cell => `<td>${esc(String(cell))}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
        <div style="font-size:11px;color:var(--t3);margin-top:5px">
          Sample rows only — your query must return all matching rows.
        </div>
      </div>`;
  }

  if (p.schemaHint) {
    descHTML += `
      <div class="prob-section">
        <div class="prob-section-title">Schema: <span style="color:var(--grn);font-family:var(--mono);font-size:11px">${esc(p.schemaHint.table)}</span></div>
        <div style="overflow-x:auto">
          <table class="schema-table">
            <thead><tr><th>Column</th><th>Type</th></tr></thead>
            <tbody>${p.schemaHint.columns.map(([col, type]) => `
              <tr><td class="col-name">${esc(col)}</td><td class="col-type">${esc(type)}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  descHTML += `
    <div class="prob-section">
      <div class="prob-section-title">Available Tables</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
        ${[
          { name: 'employees',   cols: 'id, name, dept_id, salary, hire_year, age, level' },
          { name: 'departments', cols: 'id, name, budget, location, headcount' },
          { name: 'orders',      cols: 'id, customer, product_id, amount, status, month' },
          { name: 'products',    cols: 'id, name, category, price, stock' },
          { name: 'students',    cols: 'id, name, grade, course_id, year, gpa' },
          { name: 'courses',     cols: 'id, name, credits, instructor, dept' },
        ].map(t => `
          <div style="background:var(--bg2);border:1px solid var(--line2);border-radius:5px;padding:7px 10px;min-width:0">
            <div style="font-size:11px;font-weight:700;color:var(--grn);font-family:var(--mono);margin-bottom:3px">${t.name}</div>
            <div style="font-size:10.5px;color:var(--t3);font-family:var(--mono);line-height:1.6">${t.cols}</div>
          </div>`).join('')}
      </div>
    </div>`;

  el('judge-desc').innerHTML  = descHTML;
  el('judge-tags').innerHTML  = p.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('');

  // ── Test case list ───────────────────────────────────────
  el('tc-list').innerHTML = p.testCases.map((tc, i) => `
    <div class="tc-row tc-pending mb2" id="tc-row-${tc.id}">
      <span style="font-size:10px;font-weight:700;color:var(--t3);font-family:var(--mono);width:22px;flex-shrink:0;text-align:center">${i + 1}</span>
      <div style="flex:1">
        <div style="font-size:12px;color:var(--t1);font-weight:500">${esc(tc.name)}</div>
        <div style="font-size:11px;color:var(--t3);margin-top:1px">${esc(tc.desc)}</div>
      </div>
      <span style="font-size:14px;font-weight:700;font-family:var(--mono);color:var(--t3);width:20px;text-align:center" id="tc-status-${tc.id}">–</span>
    </div>`).join('');
  el('tc-summary').textContent = `${p.testCases.length} test cases`;

  // ── Reset judge panel state ──────────────────────────────
  clearJudgeState();
  const isSolved = getSolvedIds().has(p.id);

  // ── Timer ────────────────────────────────────────────────
  if (S.judgeTimer) clearInterval(S.judgeTimer);
  S.judgeElapsed = 0;
  S.judgeTimer   = setInterval(() => {
    S.judgeElapsed++;
    const te     = el('judge-timer-small');
    const urgent = p.timeLimit && S.judgeElapsed > p.timeLimit * 0.8;
    if (te) te.innerHTML = `<span style="font-size:11px;font-weight:600;font-family:var(--mono);color:${urgent ? 'var(--rose)' : 'var(--t2)'}">${fmtT(S.judgeElapsed)}</span>`;
  }, 1000);

  // ── Editor binding ───────────────────────────────────────
  // Replace node to clear any stacked listeners from the previous problem
  const edOld = el('judge-editor');
  const edNew  = edOld.cloneNode(true);
  edOld.parentNode.replaceChild(edNew, edOld);
  const ed = edNew;

  const prevSub = S.submissions.filter(s => s.problemId === p.id).sort((a, b) => b.at - a.at)[0];
  ed.value = prevSub?.code || '';
  el('judge-chars').textContent = `${(prevSub?.code || '').length}`;

  ed.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); judgeRun(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = e.target.selectionStart;
      ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(e.target.selectionEnd);
      ed.selectionStart = ed.selectionEnd = s + 2;
    }
  });
  ed.addEventListener('input', () => { el('judge-chars').textContent = ed.value.length; });

  el('btn-judge-submit').disabled    = isSolved;
  el('btn-judge-submit').textContent = isSolved ? 'Solved ✓' : 'Submit';
}

/* ── Clear panel state between problems ─────────────────── */
function clearJudgeState() {
  ['judge-verdict', 'judge-feedback', 'judge-result', 'judge-row-count'].forEach(id => {
    const e = el(id);
    if (!e) return;
    e.innerHTML = '';
    e.classList.add('hidden');
  });
  const ts = el('tc-summary');
  if (ts) ts.textContent = '— test cases';
  const tm = el('judge-timer-small');
  if (tm) tm.innerHTML = '';
  const nb = el('btn-judge-next');
  if (nb) nb.style.display = 'none';
}

function resetTC(tcId) {
  const row = el(`tc-row-${tcId}`);
  const ico = el(`tc-status-${tcId}`);
  if (row) row.className = 'tc-row tc-pending mb2';
  if (ico) { ico.textContent = '–'; ico.style.color = 'var(--t3)'; }
}

/* ── Run (Ctrl+Enter) ───────────────────────────────────── */
function judgeRun() {
  const p   = S.problems.find(x => x.id === S.judgeCtx?.problemId);
  if (!p) return;
  const sql = el('judge-editor').value;
  if (!sql.trim()) { toast('Write a query first', 'warn'); return; }

  el('btn-judge-run').textContent = 'Running…';
  el('btn-judge-run').disabled    = true;

  setTimeout(() => {
    const result = runSQL(sql, DB);
    showJudgeResult(result);
    runTestCases(p, result, false);
    el('btn-judge-run').textContent = 'Run & Test';
    el('btn-judge-run').disabled    = false;
  }, 120);
}

/* ── Test-case runner ───────────────────────────────────── */
function runTestCases(p, result, isSubmit) {
  let passed = 0;
  p.testCases.forEach(tc => {
    const row = el(`tc-row-${tc.id}`);
    const ico = el(`tc-status-${tc.id}`);
    if (!row) return;
    if (result.error) {
      row.className = 'tc-row tc-fail mb2';
      if (ico) { ico.textContent = '✗'; ico.style.color = 'var(--rose)'; }
      return;
    }
    const ok = tc.validate(result);
    if (ok) passed++;
    row.className = `tc-row ${ok ? 'tc-pass' : 'tc-fail'} mb2`;
    if (ico) { ico.textContent = ok ? '✓' : '✗'; ico.style.color = ok ? 'var(--grn)' : 'var(--rose)'; }
  });
  el('tc-summary').textContent = `${passed}/${p.testCases.length} passed`;
  return passed === p.testCases.length;
}

/* ── Result table renderer ─────────────────────────────── */
function showJudgeResult(result) {
  const panel = el('judge-result');
  el('judge-row-count').textContent = result.error ? '' : `${result.rowCount} rows`;

  if (result.error) {
    panel.innerHTML = `
      <div class="res-panel">
        <div class="res-hdr"><span style="color:var(--rose);font-weight:600">SQL ERROR</span></div>
        <div style="padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--rose)">${esc(result.error)}</div>
      </div>`;
  } else if (!result.columns.length) {
    panel.innerHTML = `
      <div class="res-panel">
        <div class="res-hdr"><span style="color:var(--t2)">NO ROWS RETURNED</span></div>
      </div>`;
  } else {
    const ths = result.columns.map(c => `<th>${esc(c)}</th>`).join('');
    const trs = result.rows.slice(0, 50).map((row, i) =>
      `<tr style="animation:rowIn .12s ease ${i * 0.015}s both">
        ${row.map(cell =>
          cell === null
            ? '<td><span class="tbl-null">NULL</span></td>'
            : `<td>${esc(String(cell))}</td>`
        ).join('')}
      </tr>`
    ).join('');
    panel.innerHTML = `
      <div class="res-panel">
        <div class="res-hdr">
          <span style="color:var(--grn);font-weight:600">QUERY RESULT</span>
          <span style="color:var(--t2)">${result.rowCount} rows · ${result.columns.length} cols</span>
        </div>
        <div class="res-body"><div class="tw">
          <table class="tbl"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>
        </div>
        ${result.rowCount > 50 ? `<div style="padding:7px 12px;font-size:11px;color:var(--t3)">Showing 50 / ${result.rowCount}</div>` : ''}
        </div>
      </div>`;
  }
  panel.classList.remove('hidden');
}

/* ── Submit ─────────────────────────────────────────────── */
function judgeSubmit() {
  if (!S.user) { toast('Please sign in to submit', 'error'); return; }
  const p = S.problems.find(x => x.id === S.judgeCtx?.problemId);
  if (!p) return;
  const sql = el('judge-editor').value;
  if (!sql.trim()) { toast('Write a query first', 'warn'); return; }

  el('btn-judge-submit').disabled    = true;
  el('btn-judge-submit').textContent = 'Judging…';

  setTimeout(() => {
    const result     = runSQL(sql, DB);
    const allPassed  = runTestCases(p, result, true);
    showJudgeResult(result);

    let verdict = 'WA';
    if (result.error)                           verdict = 'CE';
    else if (allPassed)                         verdict = 'AC';
    else if (S.judgeElapsed >= (p.timeLimit || 300)) verdict = 'TLE';

    const alreadySolved = getSolvedIds().has(p.id);

    const sub = {
      id: genId(), userId: S.user.userId, problemId: p.id,
      contestId: S.judgeCtx?.contestId || null,
      code: sql, verdict, timeTaken: S.judgeElapsed,
      at: Date.now(),
      tcPassed: p.testCases.filter(tc => tc.validate(result)).length,
      tcTotal:  p.testCases.length,
    };
    S.submissions.unshift(sub);
    LS.set(`subs:${S.user.userId}`, S.submissions);

    if (verdict === 'AC' && !alreadySolved) {
      const bonus = S.judgeElapsed < 60 ? 50 : S.judgeElapsed < 120 ? 30 : S.judgeElapsed < 300 ? 10 : 0;
      S.user.score  = (S.user.score  || 0) + p.points + bonus;
      S.user.solved = (S.user.solved || 0) + 1;
      LS.set(`user:${S.user.username}`, S.user);
      clearInterval(S.judgeTimer);
    }

    // ── Verdict banner ───────────────────────────────────
    const vColor = verdict === 'AC' ? 'var(--grn)' : verdict === 'CE' ? 'var(--violet)' : verdict === 'TLE' ? 'var(--gold)' : 'var(--rose)';
    el('judge-verdict').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-radius:5px;background:${vColor}18;border:1px solid ${vColor}44">
        <span style="color:${vColor};font-size:15px;font-weight:800">${verdict}</span>
        <span style="font-size:11px;color:var(--t2)">${sub.tcPassed}/${sub.tcTotal} tests</span>
      </div>`;
    el('judge-verdict').classList.remove('hidden');

    const fb = el('judge-feedback');
    fb.innerHTML = `
      <div class="fx ic gap2" style="padding:10px 14px;border-radius:5px;background:${vColor}10;border:1px solid ${vColor}30">
        <span style="color:${vColor};font-size:16px">${verdict === 'AC' ? '✓' : '✗'}</span>
        <span style="color:${vColor};font-size:12px;font-weight:500">
          ${verdict === 'AC'  ? `Accepted! ${sub.tcPassed}/${sub.tcTotal} test cases passed.`
          : verdict === 'CE'  ? `Runtime Error: ${result.error}`
          : verdict === 'TLE' ? `Time Limit Exceeded (${S.judgeElapsed}s)`
          :                     `Wrong Answer — ${sub.tcPassed}/${sub.tcTotal} test cases passed.`}
        </span>
      </div>`;
    fb.classList.remove('hidden');

    if (verdict === 'AC') {
      renderTopRight();
      const btnNext = document.getElementById('btn-judge-next');
      const nextIdx = S.problems.findIndex(x => x.id === p.id) + 1;
      const nextP   = S.problems[nextIdx] || null;
      if (btnNext) {
        btnNext.style.display = nextP ? 'inline-flex' : 'none';
        btnNext.onclick = nextP
          ? () => nav('judge', { problemId: nextP.id, backView: S.judgeCtx?.backView || 'practice', contestId: S.judgeCtx?.contestId || null })
          : null;
      }
      toast(`Accepted! +${p.points}${p.points !== sub.tcTotal ? ' points' : ''}`, 'success');
      el('btn-judge-submit').textContent = 'Solved ✓';
    } else {
      el('btn-judge-submit').disabled    = false;
      el('btn-judge-submit').textContent = 'Submit';
      toast(verdict === 'CE' ? 'Error in query' : verdict === 'TLE' ? 'Time limit exceeded' : 'Wrong answer', 'error');
    }
  }, 300);
}

/* ── Editor clear button ────────────────────────────────── */
function judgeEditorClear() {
  el('judge-editor').value = '';
  el('judge-chars').textContent = '0';
  clearJudgeState();
  const p = S.problems.find(x => x.id === S.judgeCtx?.problemId);
  if (p) p.testCases.forEach(tc => resetTC(tc.id));
}
