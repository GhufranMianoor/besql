/**
 * views/practice.js — Practice problem list view.
 */
'use strict';

function renderPractice() {
  const solved = getSolvedIds();
  const diffs  = ['All', 'Easy', 'Medium', 'Hard', 'Expert'];
  el('practice-filters').innerHTML = diffs.map(d => `
    <button class="btn btn-sm ${S.practiceFilter === d ? 'btn-blue' : 'btn-ghost'}"
            onclick="setPracticeFilter('${d}')">${d}</button>`).join('');

  const filtered = S.practiceFilter === 'All' ? S.problems : S.problems.filter(p => p.difficulty === S.practiceFilter);
  el('practice-problem-list').innerHTML = `<div class="card">${
    filtered.map((p, i) => `
      <div class="prob-row ${solved.has(p.id) ? 'solved' : ''}"
           onclick="nav('judge',{problemId:'${p.id}',backView:'practice'})">
        <div class="prob-num">${i + 1}</div>
        <div style="flex:1;min-width:0">
          <div class="fx ic gap2">
            <span style="font-size:10px;font-family:var(--mono);font-weight:700;color:var(--t3)">${p.code || p.id.toUpperCase()}</span>
            <span style="font-size:13px;color:${solved.has(p.id) ? 'var(--grn)' : 'var(--t0)'}">${esc(p.title)}</span>
            ${p.dailyDate === getTodayStr()
              ? '<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:var(--gdim);color:var(--grn);border:1px solid rgba(46,200,102,.2);font-weight:700">TODAY</span>'
              : ''}
          </div>
          <div class="fx gap2 mt1">${p.tags.slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        </div>
        <div class="fx ic gap3">
          <span class="${diffCls(p.difficulty)}">${p.difficulty}</span>
          <span style="font-size:12px;color:var(--gold);font-weight:700">${p.points}pt</span>
          <span style="font-size:12px;color:var(--t3)">${p.testCases.length} tests</span>
          ${solved.has(p.id) ? '<span style="color:var(--grn);font-weight:700;font-size:11px">AC</span>' : ''}
        </div>
      </div>`).join('') ||
    '<div class="empty"><div class="empty-ico">—</div></div>'}
  </div>`;

  const streak = S.user?.streak || 0;
  el('streak-count').textContent = streak;
  el('practice-streak-display').innerHTML = `
    <div class="fx ic gap2">
      <span style="font-size:24px">🔥</span>
      <div>
        <div style="font-size:20px;font-weight:800;color:var(--gold)">${streak} days</div>
        <div style="font-size:10px;color:var(--t3)">current streak</div>
      </div>
    </div>`;

  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  el('streak-calendar').innerHTML = days.map((d, i) => {
    const cls = i < streak ? 'sd-done' : i === streak ? 'sd-today' : 'sd-miss';
    return `<div class="streak-day ${cls}">${d}</div>`;
  }).join('');

  el('practice-diff-stats').innerHTML = ['Easy', 'Medium', 'Hard', 'Expert'].map(d => {
    const dp  = S.problems.filter(p => p.difficulty === d);
    const ds  = dp.filter(p => solved.has(p.id)).length;
    const pct = dp.length ? Math.round(ds / dp.length * 100) : 0;
    const color = d === 'Easy' ? 'var(--grn)' : d === 'Medium' ? 'var(--gold)' : d === 'Hard' ? 'var(--rose)' : 'var(--violet)';
    return `
      <div style="margin-bottom:12px">
        <div class="fx ic sb mb1">
          <span class="${diffCls(d)}">${d}</span>
          <span style="font-size:11px;color:var(--t2)">${ds}/${dp.length}</span>
        </div>
        <div class="pbar"><div class="pfill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
  }).join('');
}

function setPracticeFilter(f) { S.practiceFilter = f; renderPractice(); }
