/**
 * views/submissions.js — Submission history view.
 */
'use strict';

function renderSubmissions() {
  const filter = (el('sub-filter-verdict') || {}).value || 'all';
  const subs   = filter === 'all' ? S.submissions : S.submissions.filter(s => s.verdict === filter);

  const verdictCls  = v => v === 'AC' ? 'v-ac' : v === 'WA' ? 'v-wa' : v === 'TLE' ? 'v-tle' : 'v-ce';
  const verdictIcon = v => v === 'AC' ? '✓' : v === 'WA' ? '✗' : v === 'TLE' ? '⏱' : '⚠';

  el('sub-list').innerHTML = subs.length
    ? subs.map((s, i) => {
        const p = S.problems.find(x => x.id === s.problemId);
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;${i < subs.length - 1 ? 'border-bottom:1px solid var(--line);' : ''}cursor:pointer;transition:background var(--tr)"
               onmouseenter="this.style.background='var(--bg2)'" onmouseleave="this.style.background=''"
               onclick="nav('judge',{problemId:'${s.problemId}',backView:'submissions'})">
            <span style="font-size:11px;color:var(--t3);width:145px;flex-shrink:0;font-family:var(--mono)">${new Date(s.at).toLocaleString()}</span>
            <span style="flex:1;min-width:0;font-size:13px;font-weight:500;color:var(--t0)" class="trunc">${esc(p?.title || s.problemId)}</span>
            <span class="${diffCls(p?.difficulty || 'Easy')}" style="flex-shrink:0">${p?.difficulty || '?'}</span>
            <span class="${verdictCls(s.verdict)}" style="font-weight:700;font-size:11.5px;font-family:var(--mono);width:44px;text-align:center;flex-shrink:0;display:flex;align-items:center;justify-content:center;gap:3px">
              <span style="font-size:10px">${verdictIcon(s.verdict)}</span>${s.verdict}
            </span>
            <span style="font-size:11px;color:var(--t3);width:60px;text-align:right;flex-shrink:0;font-family:var(--mono)">${s.tcPassed}/${s.tcTotal} TC</span>
            <span style="font-size:11px;color:var(--t3);width:44px;text-align:right;flex-shrink:0;font-family:var(--mono)">${fmtT(s.timeTaken || 0)}</span>
          </div>`;
      }).join('')
    : '<div class="empty"><div class="empty-ico">📝</div><div class="empty-lbl">No submissions yet</div></div>';
}
