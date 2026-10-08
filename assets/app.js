/* Sunday Scaries War Room: renders every section from window.SCARIES (data.js). */
(function () {
  'use strict';
  const D = window.SCARIES;
  const $ = id => document.getElementById(id);
  if (!D) { $('headline').textContent = 'The league data did not load. Refresh the page to try again.'; return; }

  const T = D.teams, S = D.standings, M = D.meta, N = D.notes || {}, O = D.odds;
  const L = M.lastComplete, MW = M.matchupWeek;
  const order = D.rankings.map(r => String(r.id));
  const live = D.matchups.some(m => m.live);

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f1 = x => (Math.round(x * 10) / 10).toFixed(1);
  const pct = x => (x >= 99.5 && x < 100 ? '>99' : x > 0 && x < 0.5 ? '<1' : Math.round(x)) + '%';
  const rec = t => `${S[t].W}-${S[t].L}${S[t].T ? '-' + S[t].T : ''}`;
  const nm = t => esc(T[t]?.name ?? t);

  // team identity: muted colors that sit well on black
  const PAL = ['#D9705F', '#D9A55B', '#8CC7A0', '#7FA8D9', '#A99BE0', '#D98FB5', '#6FC1B8', '#D98B5B', '#A8C97A', '#B9A1D9', '#A3AFBB', '#C9788F'];
  const COL = {}; Object.keys(T).sort((a, b) => a - b).forEach((t, i) => { COL[t] = PAL[i % PAL.length]; });
  const mark = t => `<i class="mark" style="--tc:${COL[t]}" aria-hidden="true"></i>`;
  const team = t => `<span class="team">${mark(t)}<span>${nm(t)}</span></span>`;

  // ---------- cover ----------
  const shownWeek = M.phase === 'final' ? L : (MW || L);
  const phaseWord = { preview: 'preview', live: 'in progress', final: 'is final', update: 'update' }[M.phase] || '';
  $('issue').textContent = `Week ${shownWeek} ${phaseWord}`;
  $('headline').textContent = N.headline || '';
  $('stamp').innerHTML = `Updated <b>${esc(M.generated)}</b>. Next update ${esc(M.nextUpdate)}.`;

  const top = order[0];
  const raceLeader = Object.keys(S).sort((a, b) => S[b].PF - S[a].PF)[0];
  const closest = D.matchups.slice().sort((a, b) => Math.abs(a.pHome - 50) - Math.abs(b.pHome - 50))[0];
  const mgr = Object.keys(S).sort((a, b) => (S[b].blown.length - S[a].blown.length) || (S[b].left - S[a].left));
  const items = [
    ['#rankings', 'Power rankings', `${T[top].name} on top after Week ${L}`],
    ['#slate', 'This week', closest ? `Closest call: ${T[closest.home.t].name} vs ${T[closest.away.t].name}` : 'No games this week'],
    ['#race', 'Points race', `${T[raceLeader].name} leads with ${Math.round(S[raceLeader].PF)}`],
    ['#awards', 'Awards', D.records?.highScore ? `Season high is ${f1(D.records.highScore.pts)}, by ${T[D.records.highScore.t].name}` : 'The best and worst so far'],
    ['#managers', 'Manager report', `Flag on ${T[mgr[0]].name}`],
    ['#playoffs', 'Playoff picture', `First team out: ${T[D.bracket.firstOut].name}`]];
  $('contents').innerHTML = items.map(([h, t, x]) => `<li><a href="${h}"><span class="t">${t}</span><span class="x">${esc(x)}</span><span class="go" aria-hidden="true">→</span></a></li>`).join('');

  // ---------- slate ----------
  const prev = (N.previews || {})[MW] || {};
  $('slate-title').textContent = `Week ${MW} ${live ? 'live' : 'slate'}`;
  $('slate-sub').textContent = live ? 'Live scores. Win odds account for who still has players to go.' : 'ESPN projections for the lineups as they are set now. The win odds are ours.';
  $('games').innerHTML = D.matchups.map(m => {
    const fav = m.pHome >= 50 ? m.home.t : m.away.t;
    const row = s => `<div class="fx-row ${s.t === fav ? 'fav' : ''}">${team(String(s.t))}<span class="pts">${f1(live ? s.live : s.proj)}</span></div>`;
    const alerts = [m.home, m.away].flatMap(s => s.alerts.map(a => `${T[s.t].name} is starting ${a}`));
    const note = prev[`${m.home.t}-${m.away.t}`];
    return `<article class="fixture">${row(m.home)}${row(m.away)}
      <div class="odds"><span>${m.pHome}%</span><span class="bar" aria-hidden="true"><i style="width:${m.pHome}%;background:${COL[m.home.t]}"></i><i style="width:${100 - m.pHome}%;background:${COL[m.away.t]}"></i></span><span>${100 - m.pHome}%</span></div>
      ${live ? `<p class="fx-meta">Projected finish ${f1(m.home.projFinal)} to ${f1(m.away.projFinal)}</p>` : ''}
      ${alerts.length ? `<p class="fx-alert">${alerts.map(esc).join('. ')}.</p>` : ''}
      ${note ? `<p class="fx-note">${esc(note)}</p>` : ''}</article>`;
  }).join('') || '<p class="dim">No games scheduled this week.</p>';

  // ---------- power rankings ----------
  const blurbs = (N.rankBlurbs || {})[L] || {};
  $('rank-sub').textContent = `After Week ${L}. Weighted toward how teams are playing right now, so record alone won't save you. Arrows compare to the last rankings.`;
  const maxPts = Math.max(...Object.values(S).flatMap(x => x.weekly.map(w => w.pts)));
  $('ladder').innerHTML = D.rankings.map((r, i) => {
    const t = String(r.id), s = S[t];
    const mv = r.move > 0 ? `<span class="move up">Up ${r.move}</span>` : r.move < 0 ? `<span class="move down">Down ${-r.move}</span>` : `<span class="move">No change</span>`;
    const spark = s.weekly.map(w => `<i class="${w.rank <= 3 ? 'hot' : ''}" style="height:${Math.max(10, w.pts / maxPts * 100)}%" title="Week ${w.w}: ${f1(w.pts)}, ${w.rank} of 12"></i>`).join('');
    return `<li class="rung" style="--tc:${COL[t]};--i:${i}">
      <span class="no" aria-label="Rank ${r.rank}">${r.rank}</span>
      <div class="body"><h3>${mark(t)}${nm(t)}</h3>
        <p class="facts"><span><b>${rec(t)}</b> record</span><span><b>${s.apW}-${s.apL}</b> all-play</span><span><b>${f1(s.l3)}</b> a week, last three</span><span><b>${pct(O[t].playoffs)}</b> playoff odds</span></p>
        ${blurbs[t] ? `<p class="blurb">${esc(blurbs[t])}</p>` : ''}</div>
      <div class="side">${mv}<div class="spark" role="img" aria-label="Weekly scores, taller is better">${spark}</div></div></li>`;
  }).join('');

  // ---------- points race ----------
  let raceOn = null;
  function race() {
    const box = $('racebox'), svg = $('racesvg');
    const W = Math.max(280, Math.round(box.clientWidth)), H = W < 560 ? 260 : 380, ml = 40, mr = 8, mt = 10, mb = 30;
    const weeks = S[order[0]].weekly.map(w => w.w);
    const series = order.map(t => { let c = 0; return { t, pts: [0, ...S[t].weekly.map(w => (c += w.pts))] }; });
    const max = Math.ceil(Math.max(...series.map(s => s.pts[s.pts.length - 1])) / 100) * 100 || 100;
    const x = i => ml + i / Math.max(1, weeks.length) * (W - ml - mr), y = v => mt + (1 - v / max) * (H - mt - mb);
    let g = '';
    for (let v = 0; v <= max; v += 100) g += `<line class="gl" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${ml - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    g += `<text class="ax" x="${x(0)}" y="${H - 8}">Start</text>`;
    weeks.forEach((w, i) => { g += `<text class="ax" x="${x(i + 1)}" y="${H - 8}" text-anchor="${i === weeks.length - 1 ? 'end' : 'middle'}">${W < 560 ? '' : 'Week '}${w}</text>`; });
    const lines = series.slice().reverse().map(s =>
      `<path class="ln" data-t="${s.t}" stroke="${COL[s.t]}" d="${s.pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ')}"/>` +
      `<circle class="dot" data-t="${s.t}" cx="${x(s.pts.length - 1)}" cy="${y(s.pts[s.pts.length - 1])}" r="3.5" fill="${COL[s.t]}"/>`).join('');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = g + lines;
    const byTotal = series.slice().sort((a, b) => b.pts[b.pts.length - 1] - a.pts[a.pts.length - 1]);
    $('legend').innerHTML = byTotal.map(s => `<button type="button" aria-pressed="false" data-t="${s.t}" style="--tc:${COL[s.t]}">${mark(s.t)}${nm(s.t)} <span class="dim num">${Math.round(s.pts[s.pts.length - 1])}</span></button>`).join('');
    paint();
  }
  function paint() {
    const box = $('racebox'), svg = $('racesvg');
    box.classList.toggle('focus', !!raceOn);
    box.querySelectorAll('[data-t]').forEach(el => {
      const hit = el.dataset.t === raceOn;
      if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', String(hit)); else el.classList.toggle('on', hit);
    });
    if (raceOn) { svg.appendChild(svg.querySelector(`path[data-t="${raceOn}"]`)); svg.appendChild(svg.querySelector(`circle[data-t="${raceOn}"]`)); }
  }
  const pick = t => { raceOn = raceOn === t ? null : t; paint(); };
  $('legend').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (b) pick(b.dataset.t); });
  $('racesvg').addEventListener('click', e => { const p = e.target.closest('[data-t]'); if (p) pick(p.dataset.t); });
  race();
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(race, 150); });

  // ---------- standings ----------
  const cols = [
    ['Team', t => T[t].name, 'team'], ['Record', t => S[t].W + S[t].T * .5 + S[t].PF / 1e5, 'rec'], ['PF', t => S[t].PF], ['PA', t => S[t].PA],
    ['All-play', t => S[t].apW, 'ap'], ['Expected wins', t => S[t].expW], ['Luck', t => S[t].luck, 'luck'], ['Streak', t => S[t].streak, 'text'],
    ['Division', t => T[t].div, 'text'], ['Playoff odds', t => O[t].playoffs, 'pct']];
  let sortBy = 1, dir = -1;
  const cell = (c, t) => {
    const v = c[1](t);
    switch (c[2]) {
      case 'team': return team(t);
      case 'rec': return rec(t);
      case 'ap': return `${S[t].apW}-${S[t].apL}`;
      case 'luck': return `<span class="${v > .25 ? 'w' : v < -.25 ? 'l' : ''}">${v > 0 ? '+' : ''}${f1(v)}</span>`;
      case 'pct': return pct(v);
      case 'text': return esc(v);
      default: return f1(v);
    }
  };
  function drawStand() {
    const rows = Object.keys(S).sort((a, b) => { const va = cols[sortBy][1](a), vb = cols[sortBy][1](b); return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * dir; });
    const cutOn = sortBy === 1 && dir < 0;
    $('stand').innerHTML = `<thead><tr>${cols.map((c, i) => `<th scope="col" ${i === sortBy ? `aria-sort="${dir < 0 ? 'descending' : 'ascending'}"` : ''}><button type="button" data-i="${i}">${c[0]}${i === sortBy ? (dir < 0 ? ' ↓' : ' ↑') : ''}</button></th>`).join('')}</tr></thead>
      <tbody>${rows.map((t, i) => `<tr class="${cutOn && i === M.playoffTeams - 1 ? 'cut' : ''}">${cols.map(c => `<td>${cell(c, t)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('cutnote').textContent = cutOn ? `The gold line is the playoff cut. Top ${M.playoffTeams} get in, ties broken by points scored.` : 'Sort by record to see the playoff cut.';
  }
  $('stand').addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    const i = +b.dataset.i;
    if (i === sortBy) dir = -dir; else { sortBy = i; dir = cols[i][2] === 'text' || cols[i][2] === 'team' ? 1 : -1; }
    drawStand();
  });
  drawStand();

  // weekly heat: warm gold for top-six weeks, cool slate for bottom-six
  const heat = r => { const d = (6.5 - r) / 5.5; const c = d > 0 ? 'var(--gold)' : '#6E7B8F'; return `color-mix(in srgb, ${c} ${Math.round(6 + Math.abs(d) * 30)}%, transparent)`; };
  const weeks = S[order[0]].weekly.map(w => w.w);
  $('heat').innerHTML = `<thead><tr><th scope="col">Team</th>${weeks.map(w => `<th scope="col">Week ${w}</th>`).join('')}<th scope="col">Average</th><th scope="col">Swing</th></tr></thead><tbody>` +
    order.map(t => `<tr><td>${team(t)}</td>${S[t].weekly.map(w => `<td class="cell" style="background:${heat(w.rank)}" title="${w.r === 'W' ? 'Beat' : 'Lost to'} ${nm(w.opp)}, ${f1(w.oppPts)}. Finished ${w.rank} of 12.">${f1(w.pts)}<span class="res ${w.r === 'W' ? 'w' : 'l'}">${w.r}</span></td>`).join('')}<td>${f1(S[t].avg)}</td><td class="dim">±${f1(S[t].sd)}</td></tr>`).join('') + '</tbody>';

  // ---------- awards ----------
  const A = D.awards, R = D.records;
  const honor = (bad, label, fig, who, why) => `<div class="honor ${bad ? 'bad' : ''}"><dt>${label}</dt><dd class="fig">${fig}</dd><dd class="who">${who}</dd>${why ? `<dd class="why">${why}</dd>` : ''}</div>`;
  const pl = p => `${esc(p.name)} <span class="dim" style="font-family:var(--sans);font-size:.8125rem">${esc(p.pos)}, ${nm(p.t)}</span>`;
  const vs = g => `${nm(g.winner)} over ${nm(g.loser)}, ${f1(g.wpts)} to ${f1(g.lpts)}`;
  if (A && A.week) {
    $('awards-title').textContent = `Week ${A.week} awards`;
    $('aw').innerHTML = [
      honor(0, 'High score', f1(A.high.pts), team(A.high.t)),
      honor(1, 'Low score', f1(A.low.pts), team(A.low.t)),
      honor(0, 'Player of the week', f1(A.mvp.pts), pl(A.mvp), `ESPN projected ${f1(A.mvp.proj)}`),
      honor(1, 'Dud of the week', f1(A.dud.pts), pl(A.dud), `Projected ${f1(A.dud.proj)} and started anyway`),
      honor(0, 'Biggest blowout', '+' + f1(A.blowout.margin), vs(A.blowout)),
      honor(0, 'Closest game', f1(A.closest.margin), vs(A.closest)),
      honor(0, 'Bench hero', f1(A.benchHero.pts), pl(A.benchHero), 'Every point of it on the bench'),
      honor(1, 'Most left on the bench', f1(A.mostLeft.left), team(A.mostLeft.t), 'Points the best lineup would have added')].join('');
  }
  if (R && R.highScore) {
    $('fame').innerHTML = [
      honor(0, 'Highest score', f1(R.highScore.pts), team(R.highScore.t), `Week ${R.highScore.w}`),
      honor(0, 'Best player game', f1(R.bestPlayer.pts), pl(R.bestPlayer), `Week ${R.bestPlayer.w}`),
      honor(0, 'Biggest blowout', '+' + f1(R.blowout.margin), vs(R.blowout), `Week ${R.blowout.w}`),
      honor(0, 'Saddest loss', f1(R.saddestLoss.pts), team(R.saddestLoss.t), `Still lost to ${nm(R.saddestLoss.opp)} in Week ${R.saddestLoss.w}`)].join('');
    $('shame').innerHTML = [
      honor(1, 'Lowest score', f1(R.lowScore.pts), team(R.lowScore.t), `Week ${R.lowScore.w}`),
      honor(1, 'Worst starter', f1(R.worstStarter.pts), pl(R.worstStarter), `Week ${R.worstStarter.w}, projected ${f1(R.worstStarter.proj)}`),
      honor(1, 'Ugliest win', f1(R.ugliestWin.pts), team(R.ugliestWin.t), `Somehow beat ${nm(R.ugliestWin.opp)} in Week ${R.ugliestWin.w}`),
      honor(1, 'Most left on the bench', f1(R.mostLeft.left), team(R.mostLeft.t), `Week ${R.mostLeft.w}`)].join('');
  }

  // ---------- manager report ----------
  const wst = mgr[0], nb = S[wst].blown.length;
  $('worst').innerHTML = `<svg viewBox="0 0 48 60" aria-hidden="true"><rect x="4" y="2" width="3" height="56" rx="1.5" fill="var(--faint)"/><path d="M7 4 L44 8 L36 19 L44 30 L7 32 Z" fill="var(--gold)"/></svg>
    <div><p class="kicker">Flag on the play. Worst manager in the league.</p><h3>${nm(wst)}</h3>
    <p><b>${nb} blown win${nb === 1 ? '' : 's'}</b>, in Week${nb === 1 ? '' : 's'} ${S[wst].blown.join(', ')}. With the best lineup every week this team would be <b>${S[wst].W + nb}-${S[wst].L - nb}</b> instead of ${rec(wst)}.</p></div>`;
  const maxLeft = Math.max(...Object.values(S).map(s => s.left));
  const effs = Object.values(S).map(s => s.eff);
  $('benchbars').innerHTML = `<h3>Points left on the bench</h3>` + Object.keys(S).sort((a, b) => S[b].left - S[a].left).map(t =>
    `<div class="brow">${team(t)}<span class="track"><i style="width:${S[t].left / maxLeft * 100}%;background:${COL[t]}"></i></span><span class="v"><b>${f1(S[t].left)}</b> left${S[t].blown.length ? `, <span class="l">${S[t].blown.length} blown</span>` : ''}</span></div>`).join('') +
    `<p class="key">Lineup efficiency is points scored divided by the best possible. Best in the league: ${f1(Math.max(...effs))}%. Worst: ${f1(Math.min(...effs))}%.</p>`;

  // ---------- playoffs ----------
  const B = D.bracket, sd = B.seeds;
  $('po-sub').textContent = `Our best guess at the bracket if the rest of the season goes the way the simulation expects. Top ${M.playoffTeams} get in, and the top 2 skip the first round.`;
  const slot = (seed, t) => `<div class="slot"><span class="sd">${seed}</span>${team(t)}<span class="p">${pct(O[t].playoffs)}</span></div>`;
  const tbd = txt => `<div class="slot"><span class="sd"></span><span class="tbd">${txt}</span><span></span></div>`;
  $('bracket').innerHTML = `
    <div class="round"><h4>Quarterfinals</h4><div class="tie">${slot(4, sd[3])}${slot(5, sd[4])}</div><div class="tie">${slot(3, sd[2])}${slot(6, sd[5])}</div></div>
    <div class="round"><h4>Semifinals</h4><div class="tie">${slot(1, sd[0])}${tbd('Winner of 4 vs 5')}</div><div class="tie">${slot(2, sd[1])}${tbd('Winner of 3 vs 6')}</div></div>
    <div class="round"><h4>Championship</h4><div class="tie">${tbd('Semifinal winner')}${tbd('Semifinal winner')}</div></div>`;
  $('bubble').innerHTML = `First team out is ${nm(B.firstOut)}, at ${pct(O[B.firstOut].playoffs)}. The percentage beside each team is its playoff odds.`;
  $('oddsbars').innerHTML = `<h3>Playoff and bye odds</h3>` + Object.keys(O).sort((a, b) => O[b].playoffs - O[a].playoffs || O[b].bye - O[a].bye).map(t =>
    `<div class="brow">${team(t)}<span class="track"><i style="width:${O[t].playoffs}%;background:color-mix(in srgb, ${COL[t]} 40%, transparent)"></i><i style="width:${O[t].bye}%;background:${COL[t]}"></i></span><span class="v"><b>${pct(O[t].playoffs)}</b> in, ${pct(O[t].bye)} bye</span></div>`).join('') +
    `<p class="key"><span><i style="background:var(--paper)"></i>Bye odds</span><span><i style="background:color-mix(in srgb, var(--paper) 40%, transparent)"></i>Playoff odds</span></p>`;

  // ---------- players ----------
  $('leaders').innerHTML = `<thead><tr><th scope="col">Player</th><th scope="col">Pos</th><th scope="col">Points</th><th scope="col">vs projection</th></tr></thead><tbody>` +
    D.leaders.map(p => `<tr><td><span class="team">${mark(String(p.t))}<span>${esc(p.name)}</span></span></td><td>${esc(p.pos)}</td><td>${f1(p.pts)}</td><td class="${p.vsProj >= 0 ? 'w' : 'l'}">${p.vsProj > 0 ? '+' : ''}${f1(p.vsProj)}</td></tr>`).join('') + '</tbody>';
  $('mvps').innerHTML = `<thead><tr><th scope="col">Team</th><th scope="col">MVP</th><th scope="col">Letdown, vs projection</th></tr></thead><tbody>` +
    order.map(t => { const m = D.mvp[t]; return m ? `<tr><td>${team(t)}</td><td>${esc(m.mvp.name)} <span class="dim">${f1(m.mvp.pts)}</span></td><td>${esc(m.bust.name)} <span class="l">${f1(m.bust.vsProj)}</span></td></tr>` : ''; }).join('') + '</tbody>';
  const P = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'];
  $('posrank').innerHTML = `<thead><tr><th scope="col">Team</th>${P.map(p => `<th scope="col">${p}</th>`).join('')}</tr></thead><tbody>` +
    order.map(t => `<tr><td>${team(t)}</td>${P.map(p => `<td class="cell" style="background:${heat(D.posRank[t][p])}">#${D.posRank[t][p]}<br><span class="dim" style="font-weight:400;font-size:.75rem">${Math.round(D.posPts[t][p])}</span></td>`).join('')}</tr>`).join('') + '</tbody>';

  $('foot-upd').textContent = `Data from ESPN, last pulled ${M.generated}. The site refreshes Thursday, Friday, Monday and Tuesday mornings.`;
})();
