/* More touch activities, registered into games.js:
 * child games (non-identical matching, generalization, counting out, comparisons, puzzles, tracing, family photos)
 * and assessor-scored screens (picture cards, mand board, tracking/attention animations, observation timer). */
(function () {
  'use strict';
  const V = window.VBGames; if (!V) return;
  const C = V.core, G = C.G, { tr, esc, shuffle, pick, label, clipText, play, tone, stimulus, prompt, finish } = C;
  const $ = sel => C.$(sel), all = sel => [...C.dialog().querySelectorAll(sel)];
  const I = (name, cls) => window.VBIcon ? window.VBIcon(name, cls) : '';
  const EX = window.VB_PICTURE_EXAMPLES || {};
  const cards = () => C.cards();
  const srcOf = (id, style) => style === 'a' ? cards()[id]?.src : (EX[id] || []).find(p => p.includes(`/${style}/`));
  const has = (id, style) => Boolean(srcOf(id, style));
  const img = (id, style) => ({ type: 'img', src: srcOf(id, style), id });
  const catOf = id => C.groupOf(id) || 'c' + (cards()[id]?.category ?? '');
  const triples = () => Object.keys(EX).filter(id => ['a', 'b', 'c'].every(s => has(id, s)));
  const sayClip = id => G.listenerClip[id] || G.exampleClip?.[id] || 0;
  const sayText = id => sayClip(id) ? clipText(sayClip(id)) : `وين ال${label(id).replace(/^ال/, '')}؟`;
  const count = (results, f = r => r.ok) => new Set(results.filter(f).map(r => r.key)).size;
  const level = (ok, full, half) => ok >= full ? 1 : half != null && ok >= half ? 0.5 : 0;
  const clock = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

  // Assessor correct / not-correct bar (big targets, bottom of the screen).
  function judge(onYes, onNo, { yes = tr('Correct', 'صح'), no = tr('Not correct', 'غلط') } = {}) {
    const bar = document.createElement('div'); bar.className = 'game-judge';
    bar.innerHTML = `<button type="button" class="judge-no" data-judge="0">${I('x')} <span>${esc(no)}</span></button><button type="button" class="judge-yes" data-judge="1">${I('check')} <span>${esc(yes)}</span></button>`;
    bar.querySelector('[data-judge="1"]').onclick = onYes; bar.querySelector('[data-judge="0"]').onclick = onNo; return bar;
  }
  function counter(text) { $('.game-progress').innerHTML = text; }
  const extraField = () => `<label class="game-extra">${tr('Items already verified outside the app', 'أصناف تحققت منها خارج التطبيق')} <input type="number" min="0" max="50" value="0" data-extra inputmode="numeric"></label>`;
  const bindExtra = (cfg, s) => { const i = $('[data-extra]'); if (i) i.oninput = () => { s.opts.extra = Math.max(0, Math.min(50, Number(i.value) || 0)); }; };

  /* ---------- family photos (device only, per child) ---------- */
  const PHOTO_KEY = 'vb-mapp-photos-v1:';
  const childId = () => window.VBAccounts?.active?.()?.id || 'none';
  const photos = () => { try { return JSON.parse(localStorage.getItem(PHOTO_KEY + childId()) || '[]'); } catch (e) { return []; } };
  const savePhotos = list => { try { localStorage.setItem(PHOTO_KEY + childId(), JSON.stringify(list)); return true; } catch (e) { return false; } };
  const photoCard = p => ({ type: 'img', src: p.src, id: 'photo-' + p.id, name: p.name });
  function shrink(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const max = 320, k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.75)); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(Error('image')); }; im.src = url;
    });
  }
  function photoManager() {
    const list = photos();
    return `<div class="photo-manager"><div class="photo-list">${list.map(p => `<figure><img src="${esc(p.src)}" alt=""><figcaption>${esc(p.name)}</figcaption><button type="button" data-photo-del="${esc(p.id)}" aria-label="${esc(tr('Remove ', 'حذف ') + p.name)}">${I('x')}</button></figure>`).join('') || `<p class="game-hint">${tr('No photos yet.', 'لا توجد صور بعد.')}</p>`}</div>
      <div class="photo-add"><input type="text" data-photo-name maxlength="30" placeholder="${esc(tr('Name (e.g. Mama)', 'الاسم (مثلاً ماما)'))}" dir="auto"><label class="game-start photo-pick">${I('camera')} ${tr('Add photo', 'إضافة صورة')}<input type="file" accept="image/*" data-photo-file hidden></label></div><p class="game-hint" data-photo-status role="status"></p></div>`;
  }
  function bindPhotos(cfg, s, refresh) {
    all('[data-photo-del]').forEach(b => { b.onclick = () => { savePhotos(photos().filter(p => p.id !== b.dataset.photoDel)); refresh(); }; });
    const file = $('[data-photo-file]'); if (!file) return;
    file.onchange = async () => {
      const name = $('[data-photo-name]').value.trim(), status = $('[data-photo-status]');
      if (!name) { status.textContent = tr('Type a name first.', 'اكتب الاسم أولاً.'); file.value = ''; return; }
      try { const src = await shrink(file.files[0]), list = photos(); list.push({ id: Date.now().toString(36), name, src }); if (!savePhotos(list.slice(-8))) throw Error('full'); refresh(); }
      catch (e) { status.textContent = tr('Could not add the photo.', 'تعذّرت إضافة الصورة.'); }
    };
  }
  V.register('photos', {
    mode: 'choice',
    intro: () => photoManager(),
    bindIntro(cfg, s) { const refresh = () => { $('.photo-manager').outerHTML = photoManager(); bindPhotos(cfg, s, refresh); }; bindPhotos(cfg, s, refresh); },
    start(cfg) {
      const list = photos();
      if (list.length < 2) { $('[data-photo-status]').textContent = tr('Add at least 2 photos.', 'أضف صورتين على الأقل.'); C.session().mode = null; return; }
      C.runChoice(shuffle(list).map(p => { const other = pick(list.filter(x => x.id !== p.id), 1)[0], options = shuffle([p, other]).map(photoCard); return { key: p.id, clip: 0, text: `وين ${p.name}؟`, options, answer: options.findIndex(o => o.id === 'photo-' + p.id) }; }));
    },
    score: (cfg, r) => { const ok = count(r); return { score: level(ok, cfg.full, cfg.half), detail: '' }; }
  });

  /* ---------- non-identical matching (VP-MTS 2-9, 3-12) ---------- */
  V.register('matchNonIdentical', {
    mode: 'choice',
    start(cfg) {
      const [from, to] = cfg.styles, ids = Object.keys(EX).filter(id => has(id, from) && has(id, to));
      const trials = pick(ids, cfg.maxTrials).map(id => {
        const used = new Set([label(id)]), take = list => list.filter(x => { if (used.has(label(x))) return false; used.add(label(x)); return true; });
        const similar = take(shuffle(ids.filter(x => x !== id && catOf(x) === catOf(id)))).slice(0, cfg.similar);
        const rest = take(shuffle(ids.filter(x => catOf(x) !== catOf(id)))).slice(0, cfg.array - 1 - similar.length);
        const options = shuffle([id, ...similar, ...rest]).map(x => img(x, to));
        return { key: id, clip: cfg.clip, text: clipText(cfg.clip), sample: img(id, from), messy: true, options, answer: options.findIndex(o => o.id === id) };
      });
      C.runChoice(trials);
    }
  });

  /* ---------- generalized listener discriminations (Listener 2-7) ---------- */
  V.register('generalizeListener', {
    mode: 'choice', intro: extraField, bindIntro: bindExtra,
    start(cfg, s) {
      s.opts.extra ||= 0;
      const ids = shuffle(triples()), others = Object.keys(EX);
      const trials = ['a', 'b', 'c'].flatMap(style => shuffle(ids).map(id => {
        const used = new Set([label(id)]), dis = shuffle(others.filter(x => catOf(x) !== catOf(id))).filter(x => { if (used.has(label(x))) return false; used.add(label(x)); return true; }).slice(0, cfg.array - 1);
        const options = shuffle([id, ...dis]).map(x => img(x, x === id ? style : pick(['a', 'b', 'c'].filter(st => has(x, st)), 1)[0]));
        return { key: id + ':' + style, item: id, clip: sayClip(id), text: sayText(id), messy: true, options, answer: options.findIndex(o => o.id === id) };
      }));
      C.runChoice(trials);
    },
    score(cfg, r, opts) {
      const per = {}; for (const x of r) { const id = x.key.split(':')[0]; per[id] ||= 0; if (x.ok) per[id]++; }
      const three = Object.values(per).filter(n => n >= 3).length, two = Object.values(per).filter(n => n >= 2).length, extra = opts.extra || 0;
      return { score: three + extra >= cfg.fullItems ? 1 : two + extra >= cfg.halfItems ? 0.5 : 0, summary: tr(`${three} items across 3 drawings, ${two} across 2`, `${three} صنفاً بثلاث رسومات، ${two} برسمتين`) + (extra ? tr(` + ${extra} verified outside`, ` + ${extra} خارج التطبيق`) : '') };
    }
  });

  /* ---------- picture cards you score (tacts) ---------- */
  function deckCards(cfg) {
    const set = cfg.set, pc = ids => ids.filter(id => cards()[id]).map(id => ({ key: id, show: { type: 'card', id } }));
    if (set === 'letters') { const ar = C.lang() === 'ar'; C.session().opts.script = ar ? 'arabic' : 'english'; return shuffle(ar ? G.arabicLetters.map(([ch]) => ch) : G.letters).slice(0, 14).map(ch => ({ key: ch, show: { type: 'letter', ch } })); }
    if (set === 'numbers') return shuffle([1, 2, 3, 4, 5]).map(n => ({ key: 'n' + n, show: { type: 'numeral', n } }));
    if (set === 'generalize') { const ids = shuffle(triples()); return ['a', 'b', 'c'].flatMap(st => shuffle(ids).map(id => ({ key: id + ':' + st, show: img(id, st) }))); }
    let list = set === 'pool' ? pc(shuffle(C.pool)).slice(0, cfg.full + 10) : set === 'poolBody' ? pc(shuffle([...G.sets.body, ...pick(C.pool, 10)])) : pc(shuffle(G.sets[set]));
    if (cfg.photos) list = [...photos().map(p => ({ key: 'photo-' + p.id, show: photoCard(p) })), ...list];
    if (cfg.live) list = [...list.map(x => ({ ...x, part: 'a' })), ...G[cfg.live === 'pronouns' ? 'pronounCards' : 'adverbCards'].map(c => ({ key: 'live-' + c.en, part: 'b', show: { type: 'word', text: c.ar }, live: c }))];
    return list;
  }
  V.register('deck', {
    intro: cfg => cfg.set === 'generalize' ? extraField() : '', bindIntro: bindExtra,
    start(cfg, s) {
      s.deck = deckCards(cfg); s.index = 0; s.opts.extra ||= 0;
      if (!s.deck.length) return finish(false);
      next();
      function next() {
        const c = s.deck[s.index], ok = count(s.results);
        if (!c || (typeof cfg.full === 'number' && !cfg.mixed && ok >= cfg.full)) return finish(true);
        const ask = G.ask[cfg.ask], liveText = c.live ? tr(cfg.live === 'pronouns' ? `Elicit live: “${c.live.en}” (point to yourself / the child)` : `Act it out ${c.live.en} and ask “how?”`, cfg.live === 'pronouns' ? `اطلبه مباشرة: «${c.live.ar}» (أشر لنفسك أو للطفل)` : `نفّذ الحركة ${c.live.ar} واسأل «كيف؟»`) : '';
        prompt(liveText || clipText(ask), c.live ? 0 : ask); if (!c.live) play(ask);
        counter(`<b class="game-count">${I('check')} ${ok}</b> · <bdi dir="ltr">${s.index + 1}/${s.deck.length}</bdi>`);
        $('.game-stage').innerHTML = `<div class="deck-card"><span class="game-tile deck-tile ${c.show.type === 'word' ? 'wide' : ''}">${stimulus(c.show)}</span></div>`;
        $('.game-stage').append(judge(() => mark(true), () => mark(false), { yes: tr('Said it', 'سمّاها'), no: tr('No / prompted', 'لا / بتلقين') }));
        function mark(okNow) { s.results.push({ key: c.key, ok: okNow, part: c.part }); tone(okNow); s.index++; next(); }
      }
    },
    score(cfg, r, opts) {
      if (cfg.set === 'numbers') { const ok = count(r); return { score: ok >= 5 ? 1 : ok >= 3 ? 0.5 : 0, detail: '' }; }
      if (cfg.set === 'generalize') {
        const per = {}; for (const x of r) { const id = x.key.split(':')[0]; per[id] ||= 0; if (x.ok) per[id]++; }
        const three = Object.values(per).filter(n => n >= 3).length, two = Object.values(per).filter(n => n >= 2).length, extra = opts.extra || 0;
        return { score: three + extra >= cfg.fullItems ? 1 : two + extra >= cfg.halfItems ? 0.5 : 0, summary: tr(`${three} items across 3 drawings, ${two} across 2`, `${three} صنفاً بثلاث رسومات، ${two} برسمتين`) + (extra ? ` + ${extra}` : '') };
      }
      if (cfg.mixed) {
        const a = count(r, x => x.ok && x.part === 'a'), b = count(r, x => x.ok && x.part === 'b');
        return { score: a >= 4 && b >= 4 ? 1 : (a + b >= 4 && a && b) || a >= 4 || b >= 4 ? 0.5 : 0, summary: cfg.live === 'pronouns' ? tr(`Prepositions ${a} · pronouns ${b}`, `حروف جر ${a} · ضمائر ${b}`) : tr(`Adjectives ${a} · adverbs ${b}`, `صفات ${a} · ظروف ${b}`) };
      }
      const ok = count(r), script = cfg.set === 'letters' ? (opts.script === 'arabic' ? tr(' (Arabic letters)', ' (حروف عربية)') : tr(' (English uppercase)', ' (حروف إنجليزية كبيرة)')) : '';
      return { score: level(ok, cfg.full, cfg.half), summary: tr(`${ok} different items named`, `${ok} أصناف مختلفة مسمّاة`) + script };
    }
  });

  /* ---------- mand board ---------- */
  V.register('board', {
    start(cfg, s) {
      const items = [...photos().map(photoCard), ...G.sets.reinforcers.map(id => ({ type: 'card', id }))].slice(0, 15);
      s.hasData = Boolean(cfg.minutes); s.t0 = Date.now(); let chosen = null;
      prompt(clipText(G.ask.want), G.ask.want);
      $('.game-stage').innerHTML = `<div class="board-grid">${items.map((o, i) => `<button type="button" class="game-tile board-item" data-board="${i}" aria-label="${esc(o.name || label(o.id))}">${stimulus(o)}</button>`).join('')}</div><div class="board-show" hidden></div><div class="game-sort-actions"><button type="button" class="game-start" data-board-end>${tr('Finish', 'إنهاء')} ${I('check')}</button></div>`;
      const show = $('.board-show'), update = () => { const t = cfg.minutes ? ` · ${I('timer')} <bdi dir="ltr">${clock((Date.now() - s.t0) / 1000)}/${cfg.minutes}:00</bdi>` : ''; counter(`<b class="game-count">${I('check')} ${cfg.distinct ? count(s.results) : s.results.filter(r => r.ok).length}</b>${t}`); };
      all('[data-board]').forEach(b => { b.onclick = () => { chosen = items[b.dataset.board]; all('[data-board]').forEach(x => x.classList.toggle('selected', x === b)); show.hidden = false; show.innerHTML = `<span class="game-tile">${stimulus(chosen)}</span>`; show.classList.remove('pop'); void show.offsetWidth; show.classList.add('pop'); tone(true); setTimeout(() => { show.hidden = true; }, 1600); }; });
      $('.game-stage').append(judge(() => { if (!chosen) { $('.game-say').textContent = tr('Tap the item that was requested first.', 'اضغط أولاً على الشيء المطلوب.'); return; } s.results.push({ key: chosen.id, ok: true }); chosen = null; all('[data-board]').forEach(x => x.classList.remove('selected')); update(); if (!cfg.minutes && count(s.results) >= cfg.full) finish(true); }, () => { chosen = null; all('[data-board]').forEach(x => x.classList.remove('selected')); }, { yes: tr('Mand', 'طلب'), no: tr('Not a mand', 'ليس طلباً') }));
      $('[data-board-end]').onclick = () => finish(!cfg.minutes || (Date.now() - s.t0) >= cfg.minutes * 60000);
      update(); s.timer = setInterval(() => { update(); if (cfg.minutes && Date.now() - s.t0 >= cfg.minutes * 60000) finish(true); }, 1000);
    },
    stop: s => clearInterval(s.timer),
    score(cfg, r) { const ok = cfg.distinct ? count(r) : r.filter(x => x.ok).length; return { score: level(ok, cfg.full, cfg.half), summary: cfg.distinct ? tr(`${ok} different mands`, `${ok} طلبات مختلفة`) : tr(`${ok} mands`, `${ok} طلبات`) }; }
  });

  /* ---------- tracking animation (VP-MTS 1-1) ---------- */
  V.register('track', {
    intro: () => `<div class="game-options" role="group"><button type="button" data-speed="0.16" aria-pressed="true">${tr('Slow', 'بطيء')}</button><button type="button" data-speed="0.28" aria-pressed="false">${tr('Medium', 'متوسط')}</button></div>`,
    bindIntro(cfg, s) { s.opts.speed = 0.16; all('[data-speed]').forEach(b => { b.onclick = () => { s.opts.speed = Number(b.dataset.speed); all('[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; }); },
    start(cfg, s) {
      // One object keeps wandering for the whole session; the assessor holds “Following” while the eyes follow it.
      const ids = shuffle([...G.sets.reinforcers, '15_4', '15_5', '21_6', '10_9', '23_7']);
      let pic = 0, lastSwap = performance.now(), hold = null;
      prompt(tr('Hold “Following” while the child’s eyes follow it; 2 seconds counts', 'اضغط «يتابع» مطولاً ما دامت عينا الطفل تتابعانه؛ ثانيتان تُحتسب'), 0);
      $('.game-stage').innerHTML = `<div class="track-area"><span class="game-tile track-thing">${stimulus({ type: 'card', id: ids[0] })}</span></div>
        <div class="game-judge"><button type="button" class="judge-no" data-miss>${I('x')} <span>${tr('Did not follow', 'لم يتابع')}</span></button><button type="button" class="judge-yes track-hold" data-hold><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="ring-bg"/><circle cx="18" cy="18" r="15" class="ring" pathLength="100"/></svg>${I('check')} <span>${tr('Following (hold)', 'يتابع (اضغط مطولاً)')}</span></button></div>`;
      const area = $('.track-area'), thing = $('.track-thing'), ring = $('.ring'), btn = $('[data-hold]');
      const ok = () => s.results.filter(r => r.ok).length, show = () => counter(`<b class="game-count">${I('check')} ${ok()}</b> · <bdi dir="ltr">${s.results.length}</bdi>`);
      const swap = () => { pic = (pic + 1) % ids.length; thing.innerHTML = stimulus({ type: 'card', id: ids[pic] }); thing.classList.remove('swap'); void thing.offsetWidth; thing.classList.add('swap'); lastSwap = performance.now(); };
      let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, prev = performance.now(), started = false;
      const target = (W, H, size) => { tx = Math.random() * (W - size); ty = Math.random() * (H - size); };
      const step = now => {
        if (!thing.isConnected || s.finished) return;
        const W = area.clientWidth, H = area.clientHeight, size = Math.min(W, H) * 0.26, dt = Math.min(0.05, (now - prev) / 1000); prev = now;
        thing.style.width = thing.style.height = size + 'px';
        if (!started) { x = (W - size) / 2; y = (H - size) / 2; target(W, H, size); started = true; }
        const speed = Math.min(W, H) * s.opts.speed * 1.6, dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy);
        if (dist < size * 0.3) target(W, H, size);
        // Steer gently toward the waypoint so the path curves instead of turning sharply.
        vx += ((dx / (dist || 1)) * speed - vx) * Math.min(1, dt * 1.5); vy += ((dy / (dist || 1)) * speed - vy) * Math.min(1, dt * 1.5);
        x = Math.max(0, Math.min(W - size, x + vx * dt)); y = Math.max(0, Math.min(H - size, y + vy * dt));
        thing.style.transform = `translate(${x}px,${y}px) rotate(${Math.sin(now / 420) * 7}deg)`;
        if (hold) { const p = Math.min(1, (now - hold) / 2000); ring.style.strokeDashoffset = String(100 - p * 100); if (p >= 1) { hold = null; ring.style.strokeDashoffset = '100'; s.results.push({ key: 't' + s.results.length, ok: true }); tone(true); show(); swap(); if (ok() >= cfg.full) return finish(true); } }
        if (now - lastSwap > 12000 && !hold) swap();
        requestAnimationFrame(step);
      };
      const press = e => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); hold = performance.now(); btn.classList.add('holding'); };
      const release = () => { hold = null; ring.style.strokeDashoffset = '100'; btn.classList.remove('holding'); };
      btn.addEventListener('pointerdown', press); btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release); btn.addEventListener('contextmenu', e => e.preventDefault());
      btn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !hold && !e.repeat) { e.preventDefault(); hold = performance.now(); } });
      btn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') release(); });
      $('[data-miss]').onclick = () => { s.results.push({ key: 't' + s.results.length, ok: false }); tone(false); show(); };
      show(); requestAnimationFrame(step);
    },
    score(cfg, r) { const ok = r.filter(x => x.ok).length; return { score: level(ok, cfg.full, cfg.half), summary: tr(`Followed for 2 s on ${ok} occasions`, `تابع ثانيتين ${ok} مرات`) }; }
  });

  /* ---------- attention scene (VP-MTS 1-3) ---------- */
  V.register('attend', {
    start(cfg, s) {
      const scenes = ['images/scene-park.webp', 'images/scene-kitchen.webp', 'images/scene-bedroom.webp', 'images/scene-classroom.webp'];
      const scene = scenes[Math.floor(Math.random() * scenes.length)], floaters = pick(G.sets.reinforcers, 4);
      s.hasData = true; s.longest = 0; s.bout = null;
      prompt(tr('Tap “looking” while the child attends', 'اضغط «ينظر» ما دام الطفل منتبهاً'), 0);
      $('.game-stage').innerHTML = `<div class="attend-scene"><img src="${scene}" alt="" class="attend-bg">${floaters.map((id, i) => `<img src="${esc(cards()[id].src)}" alt="" class="attend-float" style="--i:${i}">`).join('')}</div><div class="game-judge"><button type="button" class="judge-yes attend-toggle" data-attend aria-pressed="false">${I('eye')} ${tr('Looking', 'ينظر')}</button></div>`;
      const btn = $('[data-attend]'), update = () => { const cur = s.bout ? (Date.now() - s.bout) / 1000 : 0; counter(`${tr('Now', 'الآن')} <bdi dir="ltr">${cur.toFixed(0)}s</bdi> · ${tr('Longest', 'الأطول')} <b dir="ltr">${Math.max(s.longest, cur).toFixed(0)}s</b>`); if (Math.max(s.longest, cur) >= cfg.full) { s.longest = Math.max(s.longest, cur); s.results.push({ key: 'bout', ok: true }); finish(true); } };
      btn.onclick = () => { if (s.bout) { s.longest = Math.max(s.longest, (Date.now() - s.bout) / 1000); s.bout = null; } else s.bout = Date.now(); btn.setAttribute('aria-pressed', String(Boolean(s.bout))); btn.innerHTML = s.bout ? `${I('pause')} ${tr('Looked away', 'أشاح بنظره')}` : `${I('eye')} ${tr('Looking', 'ينظر')}`; update(); };
      s.onHide = () => { if (document.visibilityState === 'hidden' && s.bout) btn.click(); };
      document.addEventListener('visibilitychange', s.onHide);
      s.timer = setInterval(update, 250); update();
    },
    stop(s) { clearInterval(s.timer); document.removeEventListener('visibilitychange', s.onHide); if (s.bout) { s.longest = Math.max(s.longest || 0, (Date.now() - s.bout) / 1000); s.bout = null; } },
    score(cfg, r, opts) { const sec = Math.floor(C.session()?.longest || 0); return { score: sec >= cfg.full ? 1 : sec >= cfg.half ? 0.5 : 0, summary: tr(`Longest continuous attention ${sec} s`, `أطول انتباه متواصل ${sec} ث`) }; }
  });

  /* ---------- observation timer ---------- */
  const meets = (c, m) => c && Object.entries(c).every(([k, v]) => (m[k] || 0) >= v);
  V.register('observe', {
    start(cfg, s) {
      const keys = new Set([...Object.keys(cfg.full), ...Object.keys(cfg.half || {})]), counts = keys.has('total') || keys.has('distinct'), timed = keys.has('bout') || keys.has('sum') || keys.has('percent');
      s.hasData = true; s.m = { total: 0, distinct: 0, bout: 0, sum: 0, percent: 0 }; s.elapsed = 0; s.running = false; s.on = null; s.last = Date.now(); s.log = [];
      prompt(cfg.note[C.lang()], 0);
      $('.game-stage').innerHTML = `<div class="observe"><div class="observe-clock" dir="ltr"><span data-clock>0:00</span>${cfg.minutes ? `<small>/ ${cfg.minutes}:00</small>` : ''}</div>
        <button type="button" class="game-start" data-run>${I('play')} ${tr('Start observation', 'ابدأ الملاحظة')}</button>
        ${counts ? `<div class="observe-buttons">${keys.has('distinct') ? `<button type="button" class="observe-btn" data-ev="new">${I('plus')} ${tr('New', 'جديد')}</button><button type="button" class="observe-btn alt" data-ev="repeat">${I('plus')} ${tr('Repeat', 'مكرر')}</button>` : `<button type="button" class="observe-btn" data-ev="new">${I('plus')}1</button>`}<button type="button" class="observe-undo" data-undo>${I('undo')} ${tr('Undo', 'تراجع')}</button></div>` : ''}
        ${timed ? `<button type="button" class="observe-btn wide" data-on aria-pressed="false">${I('play')} ${tr('Happening now', 'يحدث الآن')}</button>` : ''}
        <div class="observe-stats" data-stats></div><button type="button" class="game-start alt" data-obs-end>${tr('Finish and save', 'إنهاء وحفظ')}</button></div>`;
      const tick = () => {
        const now = Date.now(); if (s.running) { const d = (now - s.last) / 1000; s.elapsed += d; if (s.on) s.m.sum += d; } s.last = now;
        const cur = s.on && s.running ? (now - s.on) / 1000 : 0; s.m.bout = Math.max(s.m.bout, cur); s.m.percent = s.elapsed ? Math.round(s.m.sum / s.elapsed * 100) : 0;
        $('[data-clock]').textContent = clock(s.elapsed);
        const parts = []; if (keys.has('total')) parts.push(`${tr('Total', 'المجموع')} <b>${s.m.total}</b>`); if (keys.has('distinct')) parts.push(`${tr('Different', 'مختلف')} <b>${s.m.distinct}</b>`);
        if (keys.has('bout')) parts.push(`${tr('Longest', 'الأطول')} <b dir="ltr">${clock(s.m.bout)}</b>`); if (keys.has('sum')) parts.push(`${tr('Total time', 'الوقت الكلي')} <b dir="ltr">${clock(s.m.sum)}</b>`); if (keys.has('percent')) parts.push(`<b dir="ltr">${s.m.percent}%</b>`);
        const lvl = meets(cfg.full, s.m) ? 1 : meets(cfg.half, s.m) ? 0.5 : 0;
        $('[data-stats]').innerHTML = parts.join(' · ') + ` → <b class="observe-level">${lvl === 0.5 ? '½' : lvl}</b>`; counter(parts.length ? '' : '');
        if (cfg.minutes && s.elapsed >= cfg.minutes * 60) { s.results.push({ key: 'end', ok: true }); finish(true); }
      };
      $('[data-run]').onclick = () => { s.running = !s.running; s.last = Date.now(); if (!s.running && s.on) { s.on = null; const b = $('[data-on]'); if (b) { b.setAttribute('aria-pressed', 'false'); b.innerHTML = `${I('play')} ${tr('Happening now', 'يحدث الآن')}`; } } $('[data-run]').innerHTML = s.running ? `${I('pause')} ${tr('Pause', 'إيقاف مؤقت')}` : `${I('play')} ${tr('Continue', 'متابعة')}`; tick(); };
      all('[data-ev]').forEach(b => { b.onclick = () => { if (!s.running) { $('[data-run]').click(); } s.m.total++; if (b.dataset.ev === 'new') s.m.distinct++; s.log.push(b.dataset.ev); tone(true); tick(); }; });
      const undo = $('[data-undo]'); if (undo) undo.onclick = () => { const ev = s.log.pop(); if (!ev) return; s.m.total--; if (ev === 'new') s.m.distinct--; tick(); };
      const on = $('[data-on]'); if (on) on.onclick = () => { if (!s.running) $('[data-run]').click(); s.on = s.on ? null : Date.now(); on.setAttribute('aria-pressed', String(Boolean(s.on))); on.innerHTML = s.on ? `${I('pause')} ${tr('Stopped', 'توقف')}` : `${I('play')} ${tr('Happening now', 'يحدث الآن')}`; tick(); };
      $('[data-obs-end]').onclick = () => { tick(); finish(!cfg.minutes || meets(cfg.full, s.m) || s.elapsed >= cfg.minutes * 60); };
      // Time while the app is hidden (another app, locked screen) is not observed time: pause.
      s.onHide = () => { if (document.visibilityState === 'hidden' && s.running) { tick(); $('[data-run]').click(); $('[data-stats]').insertAdjacentHTML('afterend', `<p class="game-hint" data-paused>${tr('Paused while the app was hidden.', 'أُوقف مؤقتاً أثناء إخفاء التطبيق.')}</p>`); } };
      document.addEventListener('visibilitychange', s.onHide);
      s.timer = setInterval(tick, 250); tick();
    },
    stop(s) { clearInterval(s.timer); document.removeEventListener('visibilitychange', s.onHide); },
    score(cfg) {
      const m = C.session().m, parts = [];
      if ('total' in cfg.full || 'total' in (cfg.half || {})) parts.push(tr(`total ${m.total}`, `المجموع ${m.total}`));
      if ('distinct' in cfg.full || 'distinct' in (cfg.half || {})) parts.push(tr(`different ${m.distinct}`, `مختلف ${m.distinct}`));
      if ('bout' in cfg.full) parts.push(tr(`longest ${clock(m.bout)}`, `الأطول ${clock(m.bout)}`));
      if ('sum' in cfg.full) parts.push(tr(`total time ${clock(m.sum)}`, `الوقت الكلي ${clock(m.sum)}`));
      if ('percent' in cfg.full) parts.push(`${m.percent}%`);
      parts.push(tr(`observed ${clock(C.session().elapsed)}`, `مدة الملاحظة ${clock(C.session().elapsed)}`));
      return { score: meets(cfg.full, m) ? 1 : meets(cfg.half, m) ? 0.5 : 0, summary: parts.join(' · ') };
    }
  });

  /* ---------- counting out (Math 3-13) ---------- */
  V.register('countOut', {
    start(cfg, s) {
      const order = shuffle([1, 2, 3, 4, 5]), items = ['10_2', '10_9', '6_1', '15_5', '10_24'];
      const run = () => {
        const n = order[s.results.length]; if (!n) return finish(true);
        const id = items[s.results.length % items.length], clip = G.countClip[n];
        prompt(clipText(clip), clip); play(clip); counter(`<bdi dir="ltr">${s.results.length + 1}/5</bdi>`);
        $('.game-stage').innerHTML = `<div class="count-pile">${Array.from({ length: 8 }, (_, i) => `<button type="button" class="game-tile count-item" data-count="${i}" aria-label="${esc(label(id))}">${stimulus({ type: 'card', id })}</button>`).join('')}</div><div class="count-basket" aria-label="${tr('Basket', 'السلة')}"><span class="count-basket-label">${I('basket')}</span><div class="count-in"></div></div><div class="game-sort-actions"><button type="button" class="game-start" data-count-done>${tr('Done', 'خلص')} ${I('check')}</button></div>`;
        const pile = $('.count-pile'), basket = $('.count-in');
        all('[data-count]').forEach(b => { b.onclick = () => { (b.parentElement === pile ? basket : pile).append(b); tone(true); }; });
        $('[data-count-done]').onclick = () => { const ok = basket.children.length === n; s.results.push({ key: 'c' + n, ok }); tone(ok); setTimeout(run, 500); };
      };
      run();
    },
    score(cfg, r) { const ok = new Set(r.filter(x => x.ok).map(x => Number(x.key.slice(1)))), has = list => list.every(v => ok.has(v)); return { score: has([1, 2, 3, 4, 5]) ? 1 : has([1, 2, 3]) ? 0.5 : 0, detail: tr('Correct: ', 'الصحيحة: ') + ([...ok].sort().join('، ') || '—') }; }
  });

  /* ---------- comparisons (Math 3-14, Listener 3-13) ---------- */
  const svgBox = inner => ({ type: 'svg', svg: `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>` });
  const PAINT = { more: v => svgBox(Array.from({ length: v }, (_, i) => `<circle cx="${18 + (i % 3) * 32}" cy="${20 + Math.floor(i / 3) * 30}" r="11" fill="#e53935"/>`).join('')),
    big: v => svgBox(`<image href="${cards()['10_2'].src}" x="${50 - v / 2}" y="${50 - v / 2}" width="${v}" height="${v}"/>`),
    long: v => svgBox(`<rect x="${50 - v / 2}" y="44" width="${v}" height="12" rx="6" fill="#fb8c00"/><path d="M${50 + v / 2} 44l8 6-8 6z" fill="#5d4037"/>`),
    full: v => svgBox(`<path d="M28 15h44l-6 78H34z" fill="#e3f2fd" stroke="#90a4ae" stroke-width="3"/><path d="M${34 - (v / 100) * -0} ${93 - v * 0.75}h${32}l${-6 + 6 * (1 - v / 100) * 0} 0L66 93H34z" fill="#42a5f5" opacity="${v ? 0.9 : 0}"/>`),
    heavy: v => ({ type: 'card', id: v }),
    thick: v => svgBox(`<rect x="${50 - v / 2}" y="10" width="${v}" height="80" rx="${v / 2}" fill="#8d6e63"/>`),
    high: v => svgBox(`<line x1="50" y1="${100 - v + 18}" x2="50" y2="98" stroke="#90a4ae" stroke-width="1.5"/><ellipse cx="50" cy="${100 - v}" rx="12" ry="15" fill="#ec407a"/>`),
    fast: v => svgBox(`<line x1="5" y1="78" x2="95" y2="78" stroke="#cfd8dc" stroke-width="3"/><g class="cmp-move" style="animation-duration:${v}s"><rect x="0" y="52" width="26" height="16" rx="5" fill="#1e88e5"/><circle cx="6" cy="72" r="5" fill="#263238"/><circle cx="20" cy="72" r="5" fill="#263238"/></g>`) };
  const LEVELS = { more: [1, 3, 7], big: [28, 55, 92], long: [22, 50, 86], full: [0, 45, 95], heavy: ['15_1', '15_4', '20_3'], thick: [6, 18, 40], high: [20, 50, 80], fast: [6, 2.6, 0.9] };
  V.register('compare', {
    start(cfg, s) {
      const trials = shuffle(cfg.pairs.flatMap(k => { const pair = G.comparisons.find(p => p.k === k); return [['a', 2], ['b', 0]].map(([end, idx]) => { const opts = shuffle([0, 1, 2]).map(i => ({ ...PAINT[k](LEVELS[k][i]), lv: i, name: k + i })); const clip = pair[end]; return { key: `${k}-${end}`, clip, text: clipText(clip), options: opts, answer: opts.findIndex(o => o.lv === idx) }; }); }));
      if (cfg.adverbs) s.next = () => adverbPhase(cfg, s);
      C.runChoice(trials);
    },
    score(cfg, r) {
      const ok = new Set(r.filter(x => x.ok).map(x => x.key)), pairs = cfg.pairs.filter(k => ok.has(k + '-a') && ok.has(k + '-b')).length;
      if (!cfg.adverbs) return { score: level(pairs, cfg.full, cfg.half), summary: tr(`${pairs} comparisons correct both ways`, `${pairs} مقارنات صحيحة بطرفيها`) };
      const advPairs = G.adverbs.filter(p => ok.has('adv-' + p.k + '-a') && ok.has('adv-' + p.k + '-b')).length, advItems = [...ok].filter(k => k.startsWith('adv-')).length;
      return { score: pairs >= 4 && advPairs >= 4 ? 1 : (pairs >= 2 && advItems >= 2) || pairs >= 4 || advPairs >= 4 ? 0.5 : 0, summary: tr(`Adjective pairs ${pairs} · adverb pairs ${advPairs}`, `أزواج صفات ${pairs} · أزواج ظروف ${advPairs}`) };
    }
  });
  function adverbPhase(cfg, s) {
    const items = shuffle(G.adverbs.flatMap(p => [['a', p.a], ['b', p.b]].map(([end, clip]) => ({ key: `adv-${p.k}-${end}`, clip }))));
    let i = 0; s.mode = 'custom';
    const run = () => {
      const it = items[i]; if (!it) return finish(true);
      prompt(clipText(it.clip), it.clip); play(it.clip); counter(`<bdi dir="ltr">${i + 1}/${items.length}</bdi>`);
      $('.game-stage').innerHTML = `<div class="deck-card"><span class="game-tile deck-tile wide">${stimulus({ type: 'word', text: clipText(it.clip) })}</span></div>`;
      $('.game-stage').append(judge(() => mark(true), () => mark(false), { yes: tr('Did it', 'نفّذ'), no: tr('Did not', 'لم ينفّذ') }));
      function mark(ok) { s.results.push({ key: it.key, ok }); tone(ok); i++; run(); }
    };
    run();
  }

  /* ---------- shape puzzles (VP-MTS 3-13) ---------- */
  const PIECES = { sq: '<rect x="4" y="4" width="92" height="92" rx="6"/>', circ: '<circle cx="50" cy="50" r="44"/>', tri0: '<path d="M4 96 96 96 4 4Z"/>', tri1: '<path d="M4 4 96 4 4 96Z"/>', tri2: '<path d="M4 4 96 4 96 96Z"/>', tri3: '<path d="M96 4 96 96 4 96Z"/>', half: '<path d="M4 96A46 46 0 0 1 96 96Z"/>' };
  const PCOL = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#6d4c41'];
  function design(n) {
    const cols = 4, rows = 3, free = new Set([...Array(cols * rows).keys()]), out = [];
    for (const cell of shuffle([...free])) {
      if (out.length >= n || !free.has(cell)) continue;
      const c = cell % cols, r = Math.floor(cell / cols), wide = c < cols - 1 && free.has(cell + 1) && Math.random() < 0.3, tall = !wide && r < rows - 1 && free.has(cell + cols) && Math.random() < 0.3;
      const shape = wide || tall ? 'sq' : pick(Object.keys(PIECES), 1)[0]; free.delete(cell); if (wide) free.delete(cell + 1); if (tall) free.delete(cell + cols);
      out.push({ c, r, w: wide ? 2 : 1, h: tall ? 2 : 1, shape, color: PCOL[out.length % PCOL.length] });
    }
    return out;
  }
  const pieceSvg = (p, ghost) => `<svg viewBox="0 0 ${100 * p.w} ${100 * p.h}" preserveAspectRatio="none" aria-hidden="true"><g transform="scale(${p.w},${p.h})" fill="${ghost ? p.color + '33' : p.color}" stroke="${ghost ? p.color : '#0003'}" stroke-width="${ghost ? 3 : 2}" ${ghost ? 'stroke-dasharray="8 6"' : ''} vector-effect="non-scaling-stroke">${PIECES[p.shape]}</g></svg>`;
  V.register('puzzle', {
    intro: () => `<div class="game-options" role="group"><button type="button" data-pieces="8" aria-pressed="true">${tr('8 pieces (full point)', '8 قطع (نقطة كاملة)')}</button><button type="button" data-pieces="4" aria-pressed="false">${tr('4 pieces (half point)', '4 قطع (نصف نقطة)')}</button></div>`,
    bindIntro(cfg, s) { s.opts.pieces = 8; all('[data-pieces]').forEach(b => { b.onclick = () => { s.opts.pieces = Number(b.dataset.pieces); all('[data-pieces]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; }); },
    start(cfg, s) {
      const run = () => {
        if (s.results.length >= cfg.designs) return finish(true);
        const d = design(s.opts.pieces); let selected = null;
        prompt(tr('Put each piece in its place', 'حط كل قطعة بمكانها'), 0); counter(`<b class="game-count">${I('check')} ${s.results.filter(r => r.ok).length}</b> · <bdi dir="ltr">${s.results.length + 1}/${cfg.designs}</bdi>`);
        $('.game-stage').innerHTML = `<div class="puzzle-board" dir="ltr">${d.map((p, i) => `<div class="puzzle-slot" data-slot="${i}" style="grid-column:${p.c + 1}/span ${p.w};grid-row:${p.r + 1}/span ${p.h}">${pieceSvg(p, true)}</div>`).join('')}</div><div class="puzzle-tray">${shuffle(d.map((p, i) => i)).map(i => `<button type="button" class="game-tile puzzle-piece" data-piece="${i}" style="--w:${d[i].w};--h:${d[i].h}" aria-label="${tr('Piece', 'قطعة')}">${pieceSvg(d[i])}</button>`).join('')}</div><div class="game-sort-actions"><button type="button" class="game-start alt" data-skip>${tr('Skip (not completed)', 'تخطي (لم يُكمل)')}</button></div>`;
        const fits = (pi, si) => { const a = d[pi], b = d[si]; return a.shape === b.shape && a.color === b.color && a.w === b.w && a.h === b.h; };
        const place = (piece, slot) => {
          const pi = Number(piece.dataset.piece), si = Number(slot.dataset.slot);
          if (slot.classList.contains('filled') || !fits(pi, si)) { piece.classList.add('no'); setTimeout(() => piece.classList.remove('no'), 400); tone(false); return; }
          slot.classList.add('filled'); slot.innerHTML = pieceSvg(d[si]); piece.remove(); tone(true);
          if (!$('.puzzle-tray').children.length) { s.results.push({ key: 'd' + s.results.length, ok: true }); setTimeout(run, 700); }
        };
        all('[data-piece]').forEach(piece => {
          let start = null, moved = false;
          piece.addEventListener('pointerdown', e => { start = { x: e.clientX, y: e.clientY }; moved = false; piece.setPointerCapture(e.pointerId); });
          piece.addEventListener('pointermove', e => { if (!start) return; const dx = e.clientX - start.x, dy = e.clientY - start.y; if (!moved && Math.hypot(dx, dy) > 8) { moved = true; piece.classList.add('dragging'); } if (moved) piece.style.transform = `translate(${dx}px,${dy}px)`; });
          piece.addEventListener('pointerup', e => { if (!start) return; start = null; piece.classList.remove('dragging'); piece.style.transform = ''; if (!moved) { selected?.classList.remove('selected'); selected = selected === piece ? null : piece; selected?.classList.add('selected'); return; } piece.style.visibility = 'hidden'; const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.puzzle-slot'); piece.style.visibility = ''; if (slot) place(piece, slot); });
        });
        all('[data-slot]').forEach(slot => { slot.onclick = () => { if (selected) { const p = selected; selected = null; p.classList.remove('selected'); place(p, slot); } }; });
        $('[data-skip]').onclick = () => { s.results.push({ key: 'd' + s.results.length, ok: false }); run(); };
      };
      run();
    },
    score(cfg, r, opts) { const ok = r.filter(x => x.ok).length; return { score: ok >= cfg.designs ? (opts.pieces === 8 ? 1 : 0.5) : 0, summary: tr(`${ok} of ${cfg.designs} designs completed (${opts.pieces} pieces)`, `${ok} من ${cfg.designs} تصاميم مكتملة (${opts.pieces} قطع)`) }; }
  });

  /* ---------- tracing (Writing 3-12) ---------- */
  function outline(shape, S) {
    const m = S * 0.12, w = S - 2 * m, pts = [], poly = list => { for (let i = 0; i < list.length; i++) { const [x1, y1] = list[i], [x2, y2] = list[(i + 1) % list.length], n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 4); for (let k = 0; k < n; k++) pts.push([x1 + (x2 - x1) * k / n, y1 + (y2 - y1) * k / n]); } };
    if (shape === 'circle') { const n = 220; for (let i = 0; i < n; i++) pts.push([S / 2 + Math.cos(i / n * 2 * Math.PI) * w / 2, S / 2 + Math.sin(i / n * 2 * Math.PI) * w / 2]); }
    if (shape === 'square') poly([[m, m], [S - m, m], [S - m, S - m], [m, S - m]]);
    if (shape === 'rectangle') poly([[m, S * 0.28], [S - m, S * 0.28], [S - m, S * 0.72], [m, S * 0.72]]);
    if (shape === 'triangle') poly([[S / 2, m], [S - m, S - m], [m, S - m]]);
    if (shape === 'star') { const v = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? w * 0.2 : w / 2; v.push([S / 2 + Math.cos(a) * rr, S / 2 + Math.sin(a) * rr]); } poly(v); }
    return pts;
  }
  V.register('trace', {
    start(cfg, s) {
      // CSS pixels per inch: about 132 on iPad, 160 on phones (approximate).
      const ppi = Math.min(screen.width, screen.height) >= 700 ? 132 : 160;
      const run = () => {
        const shape = cfg.shapes[s.results.length]; if (!shape) return finish(true);
        prompt(tr('Trace the shape', 'مشي إصبعك على الشكل'), 0); counter(`<bdi dir="ltr">${s.results.length + 1}/${cfg.shapes.length}</bdi>`);
        $('.game-stage').innerHTML = `<div class="trace-wrap"><svg class="trace-pad" data-pad></svg></div><div class="game-sort-actions"><button type="button" class="game-start alt" data-clear>${tr('Clear', 'مسح')}</button><button type="button" class="game-start" data-trace-done>${tr('Done', 'خلص')} ${I('check')}</button></div>`;
        const pad = $('[data-pad]'), S = Math.min(pad.clientWidth, pad.clientHeight), guide = outline(shape, S), ox = (pad.clientWidth - S) / 2, oy = (pad.clientHeight - S) / 2;
        pad.innerHTML = `<polygon points="${guide.map(([x, y]) => `${x + ox},${y + oy}`).join(' ')}" class="trace-guide"/><g data-ink></g>`;
        let strokes = [], cur = null;
        const pt = e => { const r = pad.getBoundingClientRect(); return [e.clientX - r.left - ox, e.clientY - r.top - oy]; };
        const draw = () => { pad.querySelector('[data-ink]').innerHTML = strokes.map(st => `<polyline points="${st.map(([x, y]) => `${x + ox},${y + oy}`).join(' ')}" class="trace-ink"/>`).join(''); };
        // Once an Apple Pencil is used, ignore touches so a resting palm does not draw.
        let pen = s.penSeen || false, active = null;
        pad.onpointerdown = e => { if (e.pointerType === 'pen') pen = s.penSeen = true; if (pen && e.pointerType === 'touch') return; if (active !== null) return; active = e.pointerId; pad.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); draw(); };
        pad.onpointermove = e => { if (cur && e.pointerId === active) { cur.push(pt(e)); draw(); } };
        pad.onpointerup = pad.onpointercancel = e => { if (e.pointerId === active) { cur = null; active = null; } };
        $('[data-clear]').onclick = () => { strokes = []; draw(); };
        $('[data-trace-done]').onclick = () => {
          const ink = strokes.flat(); if (ink.length < 10) return;
          const near = (p, list, tol) => list.some(q => Math.hypot(p[0] - q[0], p[1] - q[1]) <= tol);
          const within = tol => guide.filter(p => near(p, ink, tol)).length / guide.length >= 0.9 && ink.filter(p => near(p, guide, tol)).length / ink.length >= 0.9;
          const lenient = shape === 'star' ? 1.5 : 1, quarter = within(ppi / 4 * lenient), half = quarter || within(ppi / 2 * lenient);
          s.results.push({ key: shape, ok: quarter, half }); tone(half); setTimeout(run, 500);
        };
      };
      run();
    },
    score(cfg, r) { const q = r.filter(x => x.ok).length, h = r.filter(x => x.half).length, n = cfg.shapes.length; return { score: q >= n ? 1 : h >= n ? 0.5 : 0, summary: tr(`Within ¼ inch: ${q}/${n} · within ½ inch: ${h}/${n}`, `ضمن ¼ إنش: ${q}/${n} · ضمن ½ إنش: ${h}/${n}`) }; }
  });

  window.VBGamePhotos = { key: id => PHOTO_KEY + id };
})();
