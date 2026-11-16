/* Touch mini-games: a full-screen overlay the child plays; the result scores the milestone.
 * VBGames.has(id) → boolean; VBGames.open(id, onResult) where onResult({score, correct, attempts, complete, detail}).
 * Only tones are synthesized here; spoken prompts are the assessor's recordings (audio/NNN.mp3). */
(function () {
  'use strict';
  const G = window.VB_GAMES;
  const I = (name, cls) => window.VBIcon ? window.VBIcon(name, cls) : '';
  if (!G) return;
  const cards = () => window.VB_PICTURE_DATA?.cards || {};
  const lang = () => (document.documentElement.lang === 'en' ? 'en' : 'ar');
  const tr = (en, ar) => (lang() === 'ar' ? ar : en);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const shuffle = list => { const a = [...list]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (list, n) => shuffle(list).slice(0, n);
  const pool = Object.values(G.groups).flatMap(g => g.cards).filter((id, i, a) => a.indexOf(id) === i);
  const groupOf = id => Object.keys(G.groups).find(k => G.groups[k].cards.includes(id));
  const label = id => cards()[id]?.label?.ar || id;
  const clipText = n => G.clips.find(c => c.n === n)?.ar || '';
  const FOODLIKE = ['food', 'fruit', 'vegetables', 'drinks'];

  /* ---------- sound ---------- */
  let voice = null, ctx = null;
  function play(n) {
    if (!n) return;
    // One reused player: iPad Safari allows it to keep playing after the first tap unlocks it.
    try { voice ||= new Audio(); voice.pause(); voice.src = `audio/${String(n).padStart(3, '0')}.mp3`; voice.currentTime = 0; voice.play().catch(() => {}); } catch (e) { /* no recording yet */ }
  }
  function tone(ok) {
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime, notes = ok ? [660, 880, 1320] : [196];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = now + i * 0.09;
        o.type = ok ? 'triangle' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(ok ? 0.18 : 0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.32);
      });
    } catch (e) { /* audio unavailable */ }
  }

  /* ---------- stimuli ---------- */
  const SHAPES = {
    circle: '<circle cx="50" cy="50" r="42"/>',
    square: '<rect x="10" y="10" width="80" height="80" rx="6"/>',
    triangle: '<path d="M50 8 94 90H6Z"/>',
    star: '<path d="M50 6 61 38h34L67 58l11 34-28-21-28 21 11-34L5 38h34Z"/>',
    heart: '<path d="M50 88C20 66 6 50 6 32 6 18 18 8 31 8c9 0 15 5 19 12 4-7 10-12 19-12 13 0 25 10 25 24 0 18-14 34-44 56Z"/>',
    diamond: '<path d="M50 5 92 50 50 95 8 50Z"/>'
  };
  const digits = n => (G._indic ? String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
  function stimulus(o) {
    if (o.type === 'img') return `<img src="${esc(o.src)}" alt="" draggable="false">`;
    if (o.type === 'svg') return o.svg;
    if (o.type === 'card') { const c = cards()[o.id]; return `<img src="${esc(c?.src || '')}" alt="" draggable="false">`; }
    if (o.type === 'shape') return `<svg viewBox="0 0 100 100" aria-hidden="true" fill="${esc(o.color)}" stroke="#0002" stroke-width="2">${SHAPES[o.shape]}</svg>`;
    if (o.type === 'letter') return `<span class="game-glyph" dir="auto">${esc(o.ch)}</span>`;
    if (o.type === 'numeral') return `<span class="game-glyph">${esc(digits(o.n))}</span>`;
    if (o.type === 'word') return `<span class="game-word" dir="rtl">${esc(o.text)}</span>`;
    if (o.type === 'quantity') { const src = cards()[o.card]?.src || ''; return `<span class="game-quantity" style="--qw:${({ 1: '80%', 2: '44%', 3: '30%', 4: '44%', 5: '30%' })[o.n]}">${Array.from({ length: o.n }, () => `<img src="${esc(src)}" alt="" draggable="false">`).join('')}</span>`; }
    return '';
  }
  const optionName = o => o.name || (o.type === 'card' || o.type === 'img' ? label(o.id) : o.type === 'shape' ? `${G.shapes[o.shape][0]} ${o.colorName || ''}` : o.type === 'letter' ? o.ch : o.type === 'numeral' || o.type === 'quantity' ? String(o.n) : o.text || '');
  const card = id => ({ type: 'card', id });
  // Distractors never repeat a label and never include a listed alternative right answer.
  function distractors(answer, n, { similar = 0, avoid = [], excludeGroups = [] } = {}) {
    const g = groupOf(answer), used = new Set([label(answer), ...avoid.map(label)]), out = [];
    const take = list => { for (const id of shuffle(list)) { if (out.length >= n) break; if (id === answer || avoid.includes(id) || used.has(label(id))) continue; used.add(label(id)); out.push(id); } };
    if (similar) { take(G.groups[g].cards); out.splice(similar); }
    take(pool.filter(id => groupOf(id) !== g && !excludeGroups.includes(groupOf(id))));
    return out;
  }

  /* ---------- trial builders (choice games) ---------- */
  const builders = {
    match(cfg) {
      return pick(pool, cfg.maxTrials).map(id => { const options = shuffle([id, ...distractors(id, cfg.array - 1, { similar: cfg.similar || 0 })]).map(card); return { key: id, clip: cfg.clip, text: clipText(cfg.clip), sample: card(id), messy: cfg.messy, options, answer: options.findIndex(o => o.id === id) }; });
    },
    listener(cfg) {
      return pick(pool, cfg.maxTrials).map(id => { const options = shuffle([id, ...distractors(id, cfg.array - 1)]).map(card); return { key: id, clip: G.listenerClip[id], text: clipText(G.listenerClip[id]), messy: cfg.messy, options, answer: options.findIndex(o => o.id === id) }; });
    },
    lrffc(cfg) {
      return pick(G[cfg.bank], cfg.maxTrials).map(q => {
        const excludeGroups = cfg.nonFoodDistractors ? FOODLIKE : [];
        const options = shuffle([q.answer, ...distractors(q.answer, cfg.array - 1, { similar: cfg.similar || 0, avoid: q.avoid || [], excludeGroups })]).map(card);
        return { key: q.answer + '@' + q.prompt, clip: q.prompt, text: clipText(q.prompt), messy: cfg.array >= 8, options, answer: options.findIndex(o => o.id === q.answer) };
      });
    },
    letters(cfg) {
      // Arabic letters in the Arabic interface, English uppercase in English; the result note records which.
      const ar = lang() === 'ar', set = ar ? G.arabicLetters.map(([ch]) => ch) : G.letters, clipOf = ch => ar ? G.arabicLetterClip[ch] : G.letterClip[ch];
      session.opts.script = ar ? 'arabic' : 'english';
      return pick(set, cfg.maxTrials).map(ch => { const options = shuffle([ch, ...pick(set.filter(l => l !== ch), cfg.array - 1)]).map(c => ({ type: 'letter', ch: c })); return { key: ch, clip: clipOf(ch), text: clipText(clipOf(ch)), options, answer: options.findIndex(o => o.ch === ch) }; });
    },
    numbers() {
      return shuffle([1, 2, 3, 4, 5]).map(n => { const options = shuffle([1, 2, 3, 4, 5]).map(v => ({ type: 'numeral', n: v })); return { key: 'n' + n, n, clip: G.numberClip[n], text: clipText(G.numberClip[n]), options, answer: options.findIndex(o => o.n === n) }; });
    },
    numberQuantity() {
      const items = ['6_1', '10_2', '15_5', '10_9', '6_20'];
      const nq = shuffle([1, 2, 3, 4, 5]).map(n => { const c = items[n - 1], options = shuffle([1, 2, 3, 4, 5]).map(v => ({ type: 'quantity', n: v, card: c })); return { key: 'nq' + n, n, clip: 10, text: clipText(10), sample: { type: 'numeral', n }, options, answer: options.findIndex(o => o.n === n) }; });
      const qn = shuffle([1, 2, 3, 4, 5]).map(n => { const options = shuffle([1, 2, 3, 4, 5]).map(v => ({ type: 'numeral', n: v })); return { key: 'qn' + n, n, clip: 11, text: clipText(11), sample: { type: 'quantity', n, card: items[n - 1] }, options, answer: options.findIndex(o => o.n === n) }; });
      return [...nq, ...qn];
    },
    wordPicture(cfg) {
      const groupsUsed = pick(Object.keys(G.groups).filter(k => !['drinks', 'instruments'].includes(k)), cfg.array), set = groupsUsed.map(k => pick(G.groups[k].cards, 1)[0]);
      const wp = shuffle(set).map(id => { const options = shuffle(set).map(card); return { key: 'wp' + id, id, clip: 9, text: clipText(9), sample: { type: 'word', text: label(id) }, options, answer: options.findIndex(o => o.id === id) }; });
      const pw = shuffle(set).map(id => { const options = shuffle(set).map(v => ({ type: 'word', text: label(v), id: v })); return { key: 'pw' + id, id, clip: 8, text: clipText(8), sample: card(id), options, answer: options.findIndex(o => o.id === id) }; });
      return [...wp, ...pw];
    },
    colorShape(cfg) {
      const colorKeys = Object.keys(G.colors), shapeKeys = Object.keys(G.shapes);
      const colorTrials = Object.keys(G.colorClip).map(c => { const options = shuffle(colorKeys.slice(0, cfg.array)).map(k => ({ type: 'shape', shape: 'circle', color: G.colors[k][0], colorName: G.colors[k][1], k })); return { key: 'c-' + c, clip: G.colorClip[c], text: clipText(G.colorClip[c]), options, answer: options.findIndex(o => o.k === c) }; });
      const shapeTrials = Object.keys(G.shapeClip).map(sh => { const options = shuffle(shapeKeys.slice(0, cfg.array)).map(k => ({ type: 'shape', shape: k, color: G.colors.blue[0], k })); return { key: 's-' + sh, clip: G.shapeClip[sh], text: clipText(G.shapeClip[sh]), options, answer: options.findIndex(o => o.k === sh) }; });
      return shuffle([...colorTrials, ...shapeTrials]);
    },
    pattern(cfg, opts) {
      const k = opts.steps, palette = shuffle(Object.keys(G.shapes)).map((shape, i) => ({ type: 'shape', shape, color: G.colors[Object.keys(G.colors)[i % 6]][0] }));
      return Array.from({ length: cfg.maxTrials }, (_, i) => {
        const elems = pick(palette, k), extra = pick(palette.filter(p => !elems.includes(p)), 4 - k), len = k * 2 + (i % k);
        const seq = Array.from({ length: len }, (_, j) => elems[j % k]), right = elems[len % k], options = shuffle([...elems, ...extra]);
        return { key: 'p' + i, clip: cfg.clip, text: clipText(cfg.clip), sequence: seq, options, answer: options.indexOf(right) };
      });
    }
  };
  const builderFor = { match: 'match', listener: 'listener', lrffc: 'lrffc', letters: 'letters', numbers: 'numbers', numberQuantity: 'numberQuantity', wordPicture: 'wordPicture', colorShape: 'colorShape', pattern: 'pattern' };

  /* ---------- scoring ---------- */
  const okKeys = results => new Set(results.filter(r => r.ok).map(r => r.key));
  const scorers = {
    standard(cfg, r) { const c = r.filter(x => x.ok).length; return { score: c >= cfg.full ? 1 : c >= cfg.half ? 0.5 : 0, detail: '' }; },
    letters(cfg, r, opts) { const c = r.filter(x => x.ok).length; return { score: c >= cfg.full ? 1 : c >= cfg.half ? 0.5 : 0, detail: opts.script === 'arabic' ? tr('Arabic letters', 'حروف عربية') : tr('English uppercase letters', 'حروف إنجليزية كبيرة') }; },
    numbers(cfg, r) { const ok = okKeys(r), all = n => n.every(v => ok.has('n' + v)); return { score: all([1, 2, 3, 4, 5]) ? 1 : all([1, 2, 3]) ? 0.5 : 0, detail: tr('Correct numbers: ', 'الأرقام الصحيحة: ') + [1, 2, 3, 4, 5].filter(v => ok.has('n' + v)).join('، ') }; },
    numberQuantity(cfg, r) { const ok = okKeys(r), both = v => ok.has('nq' + v) && ok.has('qn' + v), all = n => n.every(both); return { score: all([1, 2, 3, 4, 5]) ? 1 : all([1, 2, 3]) ? 0.5 : 0, detail: tr('Correct both ways: ', 'صحيحة بالاتجاهين: ') + ([1, 2, 3, 4, 5].filter(both).join('، ') || '—') }; },
    wordPicture(cfg, r) { const ok = okKeys(r), ids = [...new Set(r.map(x => x.key.slice(2)))], both = ids.filter(id => ok.has('wp' + id) && ok.has('pw' + id)); return { score: both.length >= cfg.full ? 1 : both.length >= cfg.half ? 0.5 : 0, detail: tr('Words correct both ways: ', 'كلمات صحيحة بالاتجاهين: ') + both.length }; },
    colorShape(cfg, r) { const ok = okKeys(r), c = [...ok].filter(k => k.startsWith('c-')).length, s = [...ok].filter(k => k.startsWith('s-')).length; return { score: c >= cfg.full && s >= cfg.full ? 1 : c >= cfg.half && s >= cfg.half ? 0.5 : 0, detail: tr(`Colours ${c}/4 · shapes ${s}/4`, `ألوان ${c}/4 · أشكال ${s}/4`) }; },
    pattern(cfg, r, opts) { const c = r.filter(x => x.ok).length; return { score: c >= cfg.full ? (opts.steps === 3 ? 1 : 0.5) : 0, detail: tr(`${opts.steps}-step patterns`, `أنماط من ${opts.steps} خطوات`) }; }
  };

  /* ---------- plug-in kinds (games-more.js) ---------- */
  const kinds = {};

  /* ---------- overlay ---------- */
  let dialog, session = null;
  function build() {
    dialog = document.createElement('dialog');
    dialog.id = 'gameDialog'; dialog.className = 'game-dialog'; dialog.setAttribute('data-no-outside-close', ''); dialog.setAttribute('aria-labelledby', 'gameTitle');
    dialog.innerHTML = `<header class="game-bar"><button type="button" class="game-close" data-game-close>${I('x')}</button><h2 id="gameTitle"></h2><span class="game-progress" aria-live="polite"></span></header><div class="game-prompt"></div><div class="game-stage"></div>`;
    document.body.append(dialog);
    dialog.querySelector('[data-game-close]').onclick = () => stop();
    dialog.addEventListener('cancel', e => { e.preventDefault(); stop(); });
    window.addEventListener('resize', () => session?.layout?.());
  }
  const $ = sel => dialog.querySelector(sel);
  function title(id) { const m = window.VBModel?.allMilestones?.(window.VB_DATA)?.find(i => i.id === id); const cat = m && window.VB_DATA.categoryLabels?.[m.category]?.[lang()]; return m ? `${cat || m.category} ${m.milestone}` : id; }
  function progress() { const s = session; $('.game-progress').innerHTML = s.mode === 'choice' ? `<b class="game-count">${I('check')} ${s.results.filter(r => r.ok).length}</b> · <bdi dir="ltr">${s.results.length}/${s.trials.length}</bdi>` : s.mode === 'sort' ? `<bdi dir="ltr">${(s.round || 0) + 1}/${s.rounds?.length || 1}</bdi>` : ''; }
  function prompt(text, n) { $('.game-prompt').innerHTML = text ? `<span class="game-say" title="${esc(tr('Say this to the child', 'قلها للطفل'))}">${I('speak')} ${esc(text)}</span>${n ? `<button type="button" class="game-replay" data-clip="${n}" aria-label="${esc(tr('Play recording', 'تشغيل التسجيل'))}">${I('speaker')} <bdi dir="ltr">${String(n).padStart(3, '0')}</bdi></button>` : ''}` : ''; const b = $('.game-replay'); if (b) b.onclick = () => play(n); }

  // Keep the screen awake during games and timed observations (iPads auto-lock after a few minutes).
  let wake = null;
  async function stayAwake() { try { if (!wake && navigator.wakeLock && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && dialog?.open) stayAwake(); });
  function open(id, onResult) {
    const cfg = G.games[id]; if (!cfg) return;
    if (!dialog) build();
    session = { id, cfg, onResult, results: [], opts: { steps: 3 }, finished: false };
    $('#gameTitle').innerHTML = I(meta(id).icon) + ' ' + esc(title(id));
    $('.game-close').setAttribute('aria-label', tr('Stop game', 'إيقاف اللعبة'));
    prompt('', 0); $('.game-progress').textContent = '';
    intro();
    if (!dialog.open) dialog.showModal();
    stayAwake();
    $('[data-game-start]')?.focus();
  }
  function intro() {
    const { cfg } = session;
    const crit = cfg.kind === 'numbers' || cfg.kind === 'numberQuantity' || cfg.full === undefined || typeof cfg.full === 'object' ? '' : `<p class="game-criteria">${tr('Full point', 'نقطة كاملة')}: <b>${cfg.full}</b> · ${tr('Half point', 'نصف نقطة')}: <b>${cfg.half}</b></p>`;
    const options = cfg.kind === 'pattern' ? `<div class="game-options" role="group"><button type="button" data-steps="3" aria-pressed="true">${tr('3-step (full point)', '3 خطوات (نقطة كاملة)')}</button><button type="button" data-steps="2" aria-pressed="false">${tr('2-step (half point)', 'خطوتان (نصف نقطة)')}</button></div>`
      : cfg.kind === 'numbers' || cfg.kind === 'numberQuantity' ? `<div class="game-options" role="group"><button type="button" data-indic="1" aria-pressed="${lang() === 'ar'}">١٢٣</button><button type="button" data-indic="0" aria-pressed="${lang() !== 'ar'}">123</button></div>` : kinds[cfg.kind]?.intro?.(cfg, session) || '';
    G._indic = lang() === 'ar';
    $('.game-stage').innerHTML = `<div class="game-intro"><p>${esc(cfg.note[lang()])}</p>${crit}${options}<p class="game-hint">${tr('The child taps the answer. Tap the close button at any time to stop: what was done is scored and marked incomplete.', 'يلمس الطفل الإجابة. اضغط زر الإغلاق في أي وقت للإيقاف: تُحتسب الدرجة لما أُنجز وتُعلّم كغير مكتملة.')}</p><button type="button" class="game-start" data-game-start>${tr('Start', 'ابدأ')} ${I('play')}</button></div>`;
    dialog.querySelectorAll('[data-steps]').forEach(b => { b.onclick = () => { session.opts.steps = Number(b.dataset.steps); dialog.querySelectorAll('[data-steps]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; });
    dialog.querySelectorAll('[data-indic]').forEach(b => { b.onclick = () => { G._indic = b.dataset.indic === '1'; dialog.querySelectorAll('[data-indic]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; });
    kinds[cfg.kind]?.bindIntro?.(cfg, session);
    $('[data-game-start]').onclick = start;
  }
  function start() {
    const { cfg } = session;
    if (cfg.kind === 'sortModel' || cfg.kind === 'sortFree') return startSort();
    if (kinds[cfg.kind]) { session.mode = kinds[cfg.kind].mode || 'custom'; return kinds[cfg.kind].start(cfg, session); }
    session.mode = 'choice'; session.trials = builders[builderFor[cfg.kind]](cfg, session.opts); session.index = 0; trial();
  }

  /* ----- choice runner ----- */
  function trial() {
    const s = session, t = s.trials[s.index]; progress();
    prompt(t.text, t.clip); play(t.clip); s.locked = false;
    const sample = t.sequence ? `<div class="game-sequence" dir="ltr">${t.sequence.map(o => `<span class="game-tile small">${stimulus(o)}</span>`).join('')}<span class="game-tile small game-blank">?</span></div>`
      : t.sample ? `<div class="game-sample"><span class="game-tile ${t.sample.type === 'word' ? 'wide' : ''}">${stimulus(t.sample)}</span></div>` : '';
    $('.game-stage').innerHTML = `${sample}<div class="game-array ${t.messy ? 'messy' : ''}">${t.options.map((o, i) => `<button type="button" class="game-tile game-option" data-option="${i}" aria-label="${esc(optionName(o))}">${stimulus(o)}</button>`).join('')}</div>`;
    s.layout = () => layout($('.game-array'), t.messy); s.layout();
    dialog.querySelectorAll('[data-option]').forEach(b => b.addEventListener('click', () => answer(Number(b.dataset.option), b)));
  }
  function answer(i, button) {
    const s = session; if (s.locked || s.finished) return; s.locked = true;
    const t = s.trials[s.index], ok = i === t.answer;
    s.results.push({ key: t.key, ok }); tone(ok); button.classList.add(ok ? 'ok' : 'no'); progress();
    if (ok) { const star = document.createElement('span'); star.className = 'game-star'; star.innerHTML = I('star'); button.append(star); }
    setTimeout(() => {
      if (!session || session !== s || s.finished) return;
      const correct = s.results.filter(r => r.ok).length;
      s.index++;
      const done = (typeof s.cfg.full === 'number' && !s.cfg.noEarlyStop && s.cfg.kind !== 'wordPicture' && s.cfg.kind !== 'colorShape' && correct >= s.cfg.full) || s.index >= s.trials.length;
      if (!done) trial(); else if (s.next) { const next = s.next; s.next = null; next(); } else finish(true);
    }, ok ? 800 : 650);
  }
  // Even neat arrays are positioned explicitly so every option stays inside the screen.
  function layout(box, messy) {
    if (!box) return;
    const items = [...box.children], n = items.length, W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
    let cols = Math.max(1, Math.round(Math.sqrt(n * W / H))); if (cols > n) cols = n; let rows = Math.ceil(n / cols);
    const cw = W / cols, ch = H / rows, size = Math.min(cw, ch) * (messy ? 0.72 : 0.84), cells = messy ? shuffle([...Array(cols * rows).keys()]).slice(0, n) : [...Array(n).keys()];
    items.forEach((el, i) => {
      const c = cells[i] % cols, r = Math.floor(cells[i] / cols), jx = messy ? (Math.random() - 0.5) * (cw - size) * 0.8 : 0, jy = messy ? (Math.random() - 0.5) * (ch - size) * 0.8 : 0;
      el.style.width = el.style.height = size + 'px';
      el.style.left = (c * cw + (cw - size) / 2 + jx) + 'px'; el.style.top = (r * ch + (ch - size) / 2 + jy) + 'px';
      el.style.transform = messy ? `rotate(${Math.round((Math.random() - 0.5) * 24)}deg)` : '';
    });
  }

  /* ----- sorting runner ----- */
  function startSort() {
    const s = session, cfg = s.cfg; s.mode = 'sort'; s.round = 0; s.sorted = [];
    if (cfg.kind === 'sortModel') {
      s.rounds = [
        { clip: 2, items: ['red', 'blue', 'green'].map(k => ({ k, type: 'shape', shape: 'circle', color: G.colors[k][0] })) },
        { clip: 2, items: ['yellow', 'orange', 'purple'].map(k => ({ k, type: 'shape', shape: 'square', color: G.colors[k][0] })) },
        { clip: 3, items: ['circle', 'square', 'triangle'].map(k => ({ k, type: 'shape', shape: k, color: G.colors.blue[0] })) },
        { clip: 3, items: ['star', 'heart', 'diamond'].map(k => ({ k, type: 'shape', shape: k, color: G.colors.green[0] })) }
      ];
    } else {
      const chosen = pick(Object.keys(G.groups).filter(k => G.groups[k].cards.length >= cfg.perCategory && k !== 'drinks'), cfg.categories);
      s.rounds = [{ clip: cfg.clip, free: true, groups: chosen, pieces: shuffle(chosen.flatMap(g => pick(G.groups[g].cards, cfg.perCategory).map(id => ({ ...card(id), k: g })))) }];
    }
    sortRound();
  }
  function sortRound() {
    const s = session, r = s.rounds[s.round]; progress(); prompt(clipText(r.clip), r.clip); play(r.clip);
    const pieces = r.free ? r.pieces : shuffle(r.items.flatMap(it => [it, it]));
    const bins = r.free ? r.groups.map((_, i) => `<div class="game-bin" data-bin="${i}" role="button" tabindex="0" aria-label="${esc(tr('Box ', 'صندوق ') + (i + 1))}"><div class="game-bin-items"></div></div>`)
      : r.items.map((it, i) => `<div class="game-bin" data-bin="${i}" data-k="${it.k}" role="button" tabindex="0" aria-label="${esc(tr('Model ', 'نموذج ') + optionName(it))}"><span class="game-model">${stimulus(it)}</span><div class="game-bin-items"></div></div>`);
    $('.game-stage').innerHTML = `<div class="game-pile">${pieces.map((p, i) => `<button type="button" class="game-tile game-piece" data-piece="${i}" data-k="${p.k}" aria-label="${esc(optionName(p))}">${stimulus(p)}</button>`).join('')}</div><div class="game-bins ${r.free ? 'free' : ''}">${bins.join('')}</div><div class="game-sort-actions"><button type="button" class="game-start" data-sort-done>${s.round < s.rounds.length - 1 ? tr('Next', 'التالي') + ' ' + I('next') : tr('Finish', 'إنهاء') + ' ' + I('check')}</button></div>`;
    let selected = null;
    const select = el => { selected?.classList.remove('selected'); selected = el === selected ? null : el; selected?.classList.add('selected'); };
    const place = (piece, bin) => { bin.querySelector('.game-bin-items').append(piece); piece.classList.remove('selected'); piece.style.transform = ''; selected = null; tone(true); if (!r.free && !$('.game-pile').children.length) setTimeout(() => { if (session === s && !s.finished && s.rounds[s.round] === r && !$('.game-pile')?.children.length) endRound(); }, 1200); };
    dialog.querySelectorAll('.game-bin').forEach(bin => { bin.onclick = e => { if (selected && !e.target.closest('.game-piece:not(.selected)')) place(selected, bin); }; bin.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && selected) { e.preventDefault(); place(selected, bin); } }; });
    dialog.querySelectorAll('.game-piece').forEach(piece => {
      let start = null, dragging = false;
      piece.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; dragging = false; piece.setPointerCapture(e.pointerId); });
      piece.addEventListener('pointermove', e => { if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; if (!dragging && Math.hypot(dx, dy) > 8) { dragging = true; piece.classList.add('dragging'); } if (dragging) piece.style.transform = `translate(${dx}px,${dy}px) scale(1.1)`; });
      piece.addEventListener('pointerup', e => {
        if (!start) return; const wasDragging = dragging; start = null; dragging = false; piece.classList.remove('dragging');
        if (!wasDragging) { piece.style.transform = ''; return; }
        piece.style.visibility = 'hidden'; const bin = document.elementFromPoint(e.clientX, e.clientY)?.closest('.game-bin'); piece.style.visibility = '';
        piece.style.transform = ''; if (bin) place(piece, bin); piece.dataset.dragged = '1';
      });
      piece.addEventListener('pointercancel', () => { start = null; dragging = false; piece.classList.remove('dragging'); piece.style.transform = ''; });
      piece.addEventListener('click', e => { e.stopPropagation(); if (piece.dataset.dragged) { delete piece.dataset.dragged; return; } select(piece); });
    });
    $('[data-sort-done]').onclick = endRound;
  }
  function endRound() {
    const s = session; if (!s || s.finished) return;
    scoreRound(); s.round++;
    if (s.round < s.rounds.length) sortRound(); else finish(true);
  }
  function scoreRound() {
    const s = session, r = s.rounds[s.round];
    const bins = [...dialog.querySelectorAll('.game-bin')].map(b => ({ k: b.dataset.k, items: [...b.querySelectorAll('.game-piece')].map(p => p.dataset.k) }));
    const placed = bins.reduce((n, b) => n + b.items.length, 0);
    if (r.free) {
      for (const g of r.groups) { const ok = bins.some(b => b.items.length === s.cfg.perCategory && b.items.every(k => k === g)); s.results.push({ key: g, ok }); }
    } else {
      for (const it of r.items) { const own = bins.find(b => b.k === it.k); const ok = own.items.filter(k => k === it.k).length === 2 && own.items.every(k => k === it.k); s.results.push({ key: it.k, ok }); }
    }
    return placed;
  }

  /* ----- finish ----- */
  function scoreOf(s) {
    const scorer = kinds[s.cfg.kind]?.score || scorers[s.cfg.kind] || scorers.standard;
    return scorer(s.cfg, s.results, s.opts);
  }
  function finish(complete) {
    const s = session; if (!s || s.finished) return; s.finished = true;
    voice?.pause(); kinds[s.cfg.kind]?.stop?.(s);
    const attempts = s.results.length, correct = s.results.filter(r => r.ok).length;
    if (!attempts && !s.hasData) { close(); return; }
    const { score, detail, summary } = scoreOf(s), result = { id: s.id, score, correct, attempts, complete, detail, summary, steps: s.cfg.kind === 'pattern' ? s.opts.steps : undefined };
    let saved = true; try { s.onResult?.(result); } catch (e) { saved = false; }
    const shown = score === 0.5 ? '½' : String(score);
    prompt('', 0); $('.game-progress').textContent = '';
    $('.game-stage').innerHTML = `<div class="game-result"><div class="game-trophy" aria-hidden="true">${I(score === 1 ? 'trophy' : score ? 'star' : 'smile')}</div><p class="game-score">${tr('Score', 'الدرجة')}: <b dir="ltr">${shown}</b></p><p>${summary ? esc(summary) : `${tr('Correct', 'صحيحة')} <b dir="ltr">${correct}</b> ${tr('of', 'من')} <b dir="ltr">${attempts}</b>`}${detail ? ' · ' + esc(detail) : ''}</p>${complete ? '' : `<p class="game-incomplete">${tr('Stopped early: marked incomplete.', 'أُوقفت مبكراً: مُعلّمة كغير مكتملة.')}</p>`}<p class="game-hint">${saved ? tr('Saved to the milestone. You can still change the score by hand.', 'سُجّلت في المعلم. يمكنك تعديل الدرجة يدوياً.') : tr('Could not save the score.', 'تعذّر حفظ الدرجة.')}</p><button type="button" class="game-start" data-game-done>${tr('Close', 'إغلاق')}</button></div>`;
    $('[data-game-done]').onclick = close; $('[data-game-done]').focus();
  }
  function stop() {
    const s = session; if (!s) return close();
    if (s.finished) return close();
    // A sorting round in progress is scored as it stands when anything was placed.
    if (s.mode === 'sort' && dialog.querySelectorAll('.game-bin .game-piece').length) scoreRound();
    finish(false);
  }
  function close() { if (session) kinds[session.cfg.kind]?.stop?.(session); voice?.pause(); session = null; if (dialog?.open) dialog.close(); wake?.release().catch(() => {}); wake = null; }

  // Button wording by kind: child games, cards you score, observation timers.
  const META = { deck: ['cards', 'Picture cards', 'بطاقات للطفل'], board: ['board', 'Mand board', 'لوحة الطلب'], observe: ['timer', 'Observation timer', 'مؤقت الملاحظة'], track: ['motion', 'Moving animation', 'عرض متحرك'], attend: ['eye', 'Animated scene', 'مشهد متحرك'], photos: ['camera', 'Family photos', 'صور العائلة'] };
  const meta = id => { const m = META[G.games[id]?.kind] || ['game', 'Play as a game', 'العب كلعبة']; return { icon: m[0], en: m[1], ar: m[2] }; };
  // Shared helpers for plug-in kinds.
  const core = { G, tr, esc, shuffle, pick, pool, groupOf, label, clipText, play, tone, stimulus, card, distractors, layout, prompt, progress, finish, lang,
    $: sel => dialog.querySelector(sel), dialog: () => dialog, session: () => session, cards,
    runChoice(trials) { session.mode = 'choice'; session.trials = trials; session.index = 0; trial(); } };
  // `currentAnswer` is read-only and lets automated tests play a game.
  window.VBGames = { has: id => Boolean(G.games[id]), open, meta, core, register: (kind, impl) => { kinds[kind] = impl; }, list: () => Object.keys(G.games), currentAnswer: () => session?.mode === 'choice' && !session.finished ? session.trials[session.index]?.answer ?? null : null };
})();
