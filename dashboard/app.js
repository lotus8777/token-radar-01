// Token Radar's page: one static page, no framework, no network. It reads the data
// main.ts wrote into data.js (window.RADAR) and renders the board, the detail view and
// the live set from it. The hash names the view, so a screenshot can open any of them:
//   #/board                                  the ranked board
//   #/board?category=Dexs&chain=Ethereum     the board, filtered
//   #/detail/<slug>                          one protocol's detail view
//   #/live                                   protocols whose token already trades
'use strict';

const D = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** $1.24B, $845M, $520K, $900. */
function money(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n}`;
}

/** +12.5%, -4.0%, or an em dash when unreported. */
function pct(n) {
  if (n === null || n === undefined) return { t: '—', c: 'flat' };
  return { t: `${n > 0 ? '+' : ''}${n.toFixed(1)}%`, c: n > 0 ? 'up' : n < 0 ? 'down' : 'flat' };
}

/** 214d, 1.2y, or an em dash when unreported. */
function age(n) {
  if (n === null || n === undefined) return '—';
  if (n < 365) return `${n}d`;
  return `${(n / 365).toFixed(1)}y`;
}

const state = { view: 'board', slug: null, sort: 'rank', dir: 1, q: '', category: '', chain: '', minTvl: 0, watchlistOnly: false };

function readHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const parts = (path || 'board').split('/');
  state.view = parts[0] === 'live' ? 'live' : parts[0] === 'detail' ? 'detail' : 'board';
  state.slug = state.view === 'detail' ? decodeURIComponent(parts[1] || '') : null;
  const params = new URLSearchParams(query || '');
  state.q = params.get('q') || '';
  state.category = params.get('category') || '';
  state.chain = params.get('chain') || '';
  state.minTvl = Number(params.get('minTvl') || 0);
  state.watchlistOnly = params.get('watchlist') === '1';
}

function writeHash() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.chain) params.set('chain', state.chain);
  if (state.minTvl) params.set('minTvl', String(state.minTvl));
  if (state.watchlistOnly) params.set('watchlist', '1');
  const qs = params.toString();
  const h = state.view === 'detail' ? `#/detail/${state.slug}` : state.view === 'live' ? '#/live' : `#/board${qs ? `?${qs}` : ''}`;
  if (location.hash !== h) history.replaceState(null, '', h);
}

function filteredRows() {
  const q = state.q.trim().toLowerCase();
  return D.rows.filter((r) => {
    if (state.watchlistOnly && !r.watchlist) return false;
    if (state.category && r.category !== state.category) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (state.minTvl && r.tvl_usd < state.minTvl) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q) || (r.category || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function sortRows(rows) {
  const k = state.sort;
  const d = state.dir;
  const val = (r) => {
    if (k === 'name') return r.name.toLowerCase();
    if (k === 'category') return (r.category || '').toLowerCase();
    if (k === 'chains') return r.chains.join(', ');
    if (k === 'change_7d') return r.change_7d === null ? -Infinity : r.change_7d;
    if (k === 'age_days') return r.age_days === null ? -Infinity : r.age_days;
    return r[k];
  };
  return rows.slice().sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va < vb) return -1 * d;
    if (va > vb) return 1 * d;
    return a.rank - b.rank;
  });
}

function boardTable(rows) {
  if (rows.length === 0) return '<div class="empty">No protocol matches these filters.</div>';
  const arrow = (k) => (state.sort === k ? (state.dir === 1 ? ' ▲' : ' ▼') : '');
  const th = (label, k, num) => `<th data-sort="${k}" class="${num ? 'num' : ''}">${label}${arrow(k)}</th>`;
  const body = rows
    .map((r) => {
      const p = pct(r.change_7d);
      return `<tr data-slug="${esc(r.slug)}" class="${state.slug === r.slug ? 'selected' : ''}">
        <td class="num">${r.rank}</td>
        <td><span class="name">${esc(r.name)}</span>${r.watchlist ? '<span class="badge">Watchlist</span>' : ''}<br><span class="sub">${esc(r.slug)}</span></td>
        <td>${esc(r.category || '—')}</td>
        <td>${esc(r.chains.join(', ') || '—')}</td>
        <td class="num">${money(r.tvl_usd)}</td>
        <td class="num ${p.c}">${p.t}</td>
        <td class="num">${age(r.age_days)}</td>
        <td class="num"><strong>${money(r.implied_value_usd)}</strong></td>
      </tr>`;
    })
    .join('');
  return `<table><thead><tr>
    ${th('Rank', 'rank', true)}${th('Protocol', 'name')}${th('Category', 'category')}${th('Chains', 'chains')}
    ${th('TVL', 'tvl_usd', true)}${th('7d', 'change_7d', true)}${th('Age', 'age_days', true)}${th('Implied value', 'implied_value_usd', true)}
  </tr></thead><tbody>${body}</tbody></table>`;
}

function liveTable() {
  const body = D.live
    .map((r) => {
      const p = pct(r.change_7d);
      return `<tr>
        <td><span class="name">${esc(r.name)}</span><br><span class="sub">${esc(r.slug)}</span></td>
        <td>${esc(r.category || '—')}</td>
        <td>${esc(r.chains.join(', ') || '—')}</td>
        <td class="num">${money(r.tvl_usd)}</td>
        <td class="num"><strong>${money(r.mcap_usd)}</strong></td>
        <td class="num ${p.c}">${p.t}</td>
      </tr>`;
    })
    .join('');
  return `<p class="count">These protocols already have a token that trades, so the radar shows the market's own value for them instead of a model's. They are not ranked on the board.</p>
  <table><thead><tr><th>Protocol</th><th>Category</th><th>Chains</th><th class="num">TVL</th><th class="num">Market cap</th><th class="num">7d</th></tr></thead><tbody>${body}</tbody></table>`;
}

function detailHtml(r) {
  const m = r.model;
  const p = pct(r.change_7d);
  const steps = r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('');
  return `<button class="close" id="closeDetail" type="button">Close</button>
  <h2>${esc(r.name)} <span class="sub">#${r.rank} &middot; ${esc(r.slug)}</span></h2>
  <p class="meta">${esc(r.category || 'Uncategorised')} &middot; ${esc(r.chains.join(', ') || 'no chain listed')} &middot; tracked since ${esc(r.listed_at || 'unknown date')}${r.watchlist ? ' &middot; on the snapshot\u2019s watchlist' : ''}</p>
  <dl class="kv">
    <div><dt>Implied value</dt><dd>${money(r.implied_value_usd)}</dd></div>
    <div><dt>TVL</dt><dd>${money(r.tvl_usd)}</dd></div>
    <div><dt>7-day change</dt><dd class="${p.c}">${p.t}</dd></div>
    <div><dt>Age with no token</dt><dd>${age(r.age_days)}</dd></div>
  </dl>
  <p class="math">How the value is built: <b>${money(r.tvl_usd)}</b> TVL &times; <b>${m.category_multiple}</b> category multiple &times; <b>${m.growth_multiplier}</b> growth &times; <b>${m.window_multiplier}</b> launch window &times; <b>${m.chain_multiplier}</b> chains = <b>${money(r.implied_value_usd)}</b></p>
  <h3>How to farm it</h3>
  <ol>${steps}</ol>
  <p class="note">This protocol records no token on DefiLlama, which is the snapshot's record &mdash; not proof it has none. Its page on DefiLlama: defillama.com/protocol/${esc(r.slug)}</p>`;
}

function render() {
  readHash();
  $('tab-board').setAttribute('aria-current', state.view === 'board' || state.view === 'detail' ? 'page' : 'false');
  $('tab-live').setAttribute('aria-current', state.view === 'live' ? 'page' : 'false');
  $('controls').style.display = state.view === 'live' ? 'none' : 'flex';
  $('q').value = state.q;
  $('category').value = state.category;
  $('chain').value = state.chain;
  $('minTvl').value = String(state.minTvl);
  $('watchlistOnly').checked = state.watchlistOnly;
  const view = $('view');
  const detail = $('detail');
  if (state.view === 'live') {
    $('count').textContent = `${D.live.length} largest protocols by market cap whose token already trades.`;
    view.innerHTML = liveTable();
    detail.innerHTML = '';
  } else {
    const rows = sortRows(filteredRows());
    $('count').textContent = `${rows.length} of ${D.rows.length} pre-token protocols shown${state.watchlistOnly ? ' (watchlist only)' : ''}. Click a row for its detail and farm plan.`;
    view.innerHTML = boardTable(rows);
    const sel = state.slug ? D.rows.find((r) => r.slug === state.slug) : null;
    detail.innerHTML = sel ? detailHtml(sel) : '';
    const close = $('closeDetail');
    if (close) close.addEventListener('click', () => { location.hash = '#/board'; });
  }
  view.querySelectorAll('th[data-sort]').forEach((th) => {
    th.addEventListener('click', () => {
      const k = th.getAttribute('data-sort');
      if (state.sort === k) state.dir = -state.dir;
      else { state.sort = k; state.dir = k === 'name' || k === 'category' || k === 'chains' ? 1 : -1; }
      render();
    });
  });
  view.querySelectorAll('tr[data-slug]').forEach((tr) => {
    tr.addEventListener('click', () => { location.hash = `#/detail/${tr.getAttribute('data-slug')}`; });
  });
  window.__ready = true;
}

function init() {
  $('stats').innerHTML = [
    ['Protocols in snapshot', String(D.protocols_total)],
    ['On the watchlist', String(D.watchlist_size)],
    ['Ranked pre-token', String(D.board_size)],
    ['Already trading', String(D.live_size)],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('source').textContent = `Snapshot as of ${D.as_of} · ${D.source} · watchlist floor ${money(D.floor_usd)} TVL.`;
  const m = D.model;
  $('model').innerHTML = `<h2>How the radar scores &mdash; model ${esc(D.model_version)}</h2>
  <p class="formula">implied value = TVL &times; category multiple &times; growth &times; launch window &times; chains</p>
  <p>Category multiple: trading and lending books 0.35, vaults, curators and yield products 0.30, most protocols 0.25, wrappers and payment rails 0.20. Growth: 1 + the seven-day TVL change, clamped to -60%…+120%, halved. Launch window: under 6 months with no token is unproven (0.75 rising to 1.0), 6 to 36 months is the prime window (1.0), longer fades to 0.85. Chains: +2% per extra chain, up to five.</p>
  <p>Every row is scored by the same function &mdash; no protocol is ever special-cased by name. The detail view shows each protocol's arithmetic.</p>`;
  const cats = [...new Set(D.rows.map((r) => r.category).filter(Boolean))].sort();
  $('category').innerHTML = '<option value="">All categories</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  const chains = [...new Set(D.rows.flatMap((r) => r.chains))].sort();
  $('chain').innerHTML = '<option value="">All chains</option>' + chains.map((c) => `<option>${esc(c)}</option>`).join('');
  $('q').addEventListener('input', () => { state.q = $('q').value; writeHash(); render(); });
  $('category').addEventListener('change', () => { state.category = $('category').value; writeHash(); render(); });
  $('chain').addEventListener('change', () => { state.chain = $('chain').value; writeHash(); render(); });
  $('minTvl').addEventListener('change', () => { state.minTvl = Number($('minTvl').value); writeHash(); render(); });
  $('watchlistOnly').addEventListener('change', () => { state.watchlistOnly = $('watchlistOnly').checked; writeHash(); render(); });
  window.addEventListener('hashchange', render);
  render();
}

init();
