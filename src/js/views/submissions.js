/**
 * views/submissions.js — Submission history view.
 */
'use strict';

function renderSubmissions() {
  const filter = (el('sub-filter-verdict') || {}).value || 'all';
  const subs   = filter === 'all' ? S.submissions : S.submissions.filter(s => s.verdict === filter);

  el('sub-list').innerHTML = subs.length
    ? subs.map(s => {
        const p      = S.problems.find(x => x.id === s.problemId);
        const vcolor = s.verdict === 'AC' ? 'var(--grn)' : s.verdict === 'WA' ? 'var(--rose)' : s.verdict === 'TLE' ? 'var(--gold)' : 'var(--violet)';
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--line);cursor:pointer"
               onclick="nav('judge',{problemId:'${s.problemId}',backView:'submissions'})">
            <span style="font-size:10px;color:var(--t3);width:150px;flex-shrink:0">${new Date(s.at).toLocaleString()}</span>
            <span style="flex:1;min-width:0;font-size:13px;color:var(--t0)" class="trunc">${esc(p?.title || s.problemId)}</span>
            <span class="${diffCls(p?.difficulty || 'Easy')}" style="flex-shrink:0">${p?.difficulty || '?'}</span>
            <span style="color:${vcolor};font-weight:700;font-size:11px;width:40px;text-align:center;flex-shrink:0">${s.verdict}</span>
            <span style="font-size:11px;color:var(--t3);width:60px;text-align:right;flex-shrink:0">${s.tcPassed}/${s.tcTotal} TC</span>
            <span style="font-size:11px;color:var(--t3);width:40px;text-align:right;flex-shrink:0">${s.timeTaken}s</span>
          </div>`;
      }).join('')
    : '<div class="empty"><div class="empty-ico">📝</div><div class="empty-lbl">No submissions yet</div></div>';
}
