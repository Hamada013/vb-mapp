/* Touch mini-games for milestones that can be presented on a screen.
 * Each game scores against its milestone's own full/half criteria (see the milestone scoring text).
 * Spoken prompts are numbered clips (audio/NNN.mp3) recorded by the assessor; docs/SOUND-SCRIPT.md
 * is generated from `clips` by scripts/build-sound-script.cjs. Never ship synthesized speech.
 * Clip numbers are permanent: add new clips at the end of a range, never renumber. */
(function (root) {
  'use strict';
  // Picture pool: card id → semantic group (used for "similar stimuli" and sorting categories).
  const groups = {
    animals: { ar: 'حيوانات', en: 'Animals', cards: ['15_4','15_2','15_10','15_5','15_6','15_1','15_3','21_6','21_8','21_13','21_18','21_11','20_3','20_7','20_13','20_14','20_2'] },
    fruit: { ar: 'فواكه', en: 'Fruit', cards: ['6_1','6_3','6_10','6_15','6_14','6_20','6_18','6_19'] },
    vegetables: { ar: 'خضار', en: 'Vegetables', cards: ['7_6','7_9','7_27','7_17','7_8','7_20','7_13'] },
    clothes: { ar: 'ثياب', en: 'Clothes', cards: ['22_17','22_6','22_15','22_11','22_20','22_22','22_9','22_1'] },
    vehicles: { ar: 'مواصلات', en: 'Vehicles', cards: ['10_9','23_4','23_7','23_3','23_6','10_26','10_4','23_20'] },
    toys: { ar: 'ألعاب', en: 'Toys', cards: ['10_2','10_24','10_10','10_5','10_13','10_7','10_21'] },
    household: { ar: 'أغراض البيت', en: 'Household', cards: ['11_11','11_30','11_29','11_17','11_25','24_2','11_12','11_34','11_38','11_20','24_41','24_29','24_15'] },
    food: { ar: 'أكل', en: 'Food', cards: ['5_3','5_12','5_23','5_25','5_13','5_10','5_33','5_32'] },
    drinks: { ar: 'مشروبات', en: 'Drinks', cards: ['8_1','8_6','8_8','8_15'] },
    instruments: { ar: 'آلات موسيقية', en: 'Instruments', cards: ['35_3','35_6','35_10','35_7','35_15'] }
  };

  const clips = [];
  const clip = (n, ar, use, extra = {}) => { clips.push({ n, ar, use, ...extra }); return n; };

  // 001–019 general instructions (games work silently until recorded).
  clip(1, 'وين متلها؟', 'Matching (VP-MTS): ask the child to find the same picture.');
  clip(2, 'حط كل لون مع لونو.', 'VP-MTS 7: sort colours to the models.');
  clip(3, 'حط كل شكل مع شكلو.', 'VP-MTS 7: sort shapes to the models.');
  clip(4, 'فيك تصنّفهن؟', 'VP-MTS 14: starter prompt for sorting without a model.');
  clip(5, 'شو بيجي بعدها؟', 'VP-MTS 15: continue the pattern.');
  // 006–007 reserved.
  clip(8, 'وين الكلمة اللي بتروح مع الصورة؟', 'Reading 15: picture → word.');
  clip(9, 'وين الصورة اللي بتروح مع الكلمة؟', 'Reading 15: word → picture.');
  clip(10, 'وين العدد اللي بيروح مع الرقم؟', 'Math 15: numeral → quantity.');
  clip(11, 'وين الرقم اللي بيروح مع العدد؟', 'Math 15: quantity → numeral.');

  // 100–199 listener: "وين ال...؟" for each pool picture.
  const labels = root.VB_PICTURE_DATA?.cards || {};
  const listenerClip = {};
  // Spoken forms for labels that do not simply take ال (Syrian usage).
  const spoken = { '11_34': 'فرشاية السنان', '11_35': 'معجون السنان', '10_1': 'سيارة الإسعاف', '10_11': 'سيارة الإطفاء', '10_17': 'سيارة الشرطة', '24_44': 'الغسالة', '10_13': 'الطيارة الورق', '10_7': 'فقاعات الصابون', '10_21': 'حبل النط', '11_34': 'فرشاية السنان', '8_6': 'عصير البرتقال', '8_8': 'كاسة المي', '22_22': 'التيشيرت', '5_10': 'الكب كيك' };
  let next = 100;
  for (const g of Object.values(groups)) for (const id of g.cards) {
    const word = labels[id]?.label?.ar || id;
    listenerClip[id] = clip(next++, `وين ${spoken[id] || 'ال' + word.replace(/^ال/, '')}؟`, `Listener: name the picture “${word}” (${id}).`, { card: id });
  }

  // 200–229 LRFFC fill-ins (Listener 2-8). Draft Syrian wording: review before recording.
  const fillIns = [
    ['منقعد على ال...', '11_11'], ['مننام بال...', '24_2'], ['منشرب المي بال...', '11_17'], ['مناكل الشوربة بال...', '11_29'],
    ['منمشّط شعرنا بال...', '11_12'], ['منفرشي سناننا بال...', '11_34'], ['منلبس بإجرينا ال...', '22_17'], ['منفتح الباب بال...', '11_20'],
    ['لما تشتي منفتح ال...', '11_38'], ['منلعب فوتبول بال...', '10_2'], ['منسوق ال...', '10_9'], ['منسافر بالسما بال...', '23_7'],
    ['منركب بالبحر بال...', '23_3'], ['منتنشّف بال...', '24_41'], ['منطبخ بال...', '24_29'], ['بتعطينا حليب ال...', '21_6'],
    ['بتبيض ال...', '15_3'], ['بتعيش بالمي ال...', '15_6'], ['بيطير بالسما ال...', '15_1'], ['مندق على ال...', '35_3'],
    ['منلبس عراسنا ال...', '22_1'], ['منلبس بإيدينا ال...', '22_9'], ['القرد بيحب ياكل ال...', '6_3'], ['الأرنب بياكل ال...', '7_6'],
    ['منحط الأكل بال...', '11_25'], ['منعزف على ال...', '35_6'], ['منحضن ال... وقت النوم', '10_24']
  ].map(([ar, answer], i) => ({ prompt: clip(200 + i, ar, `LRFFC fill-in (Listener 2-8) → ${labels[answer]?.label?.ar || answer}.`), answer }));

  // 230–259 LRFFC WH questions (2-9 array of 10; 3-11 array of 10 with 3 similar). `avoid` keeps other right answers out.
  const wh = [
    ['مين بينبح؟', '15_4'], ['مين عندو رقبة طويلة كتير؟', '20_7'], ['مين عندو خرطوم طويل؟', '20_3'], ['مين بيعطينا حليب؟', '21_6', ['21_11']],
    ['مين بتبيض؟', '15_3', ['15_5', '15_1']], ['مين بيعيش بالمي؟', '15_6', ['15_5']], ['شو منلبس بإجرينا؟', '22_17', ['22_20']], ['شو منلبس عراسنا؟', '22_1'],
    ['شو منلبس بإيدينا؟', '22_9'], ['شو بيطير بالسما؟', '23_7', ['23_6']], ['شو بيمشي عالمي؟', '23_3'], ['شو بيمشي عالسكة؟', '10_26'],
    ['شو لونو أصفر ومنقشّرو؟', '6_3', ['6_15', '6_19']], ['شو منعصر ومنعمل منو عصير برتقال؟', '6_15'], ['شو كبير وأخضر ومن جوّا أحمر؟', '6_14'], ['شو منقعد عليه؟', '11_11', ['24_2']],
    ['شو مننام عليه؟', '24_2'], ['شو منشرب فيه؟', '11_17'], ['شو مناكل فيه الشوربة؟', '11_29', ['11_25', '24_29']], ['شو منفتح فيه الباب؟', '11_20'],
    ['شو منفتح لما تشتي؟', '11_38'], ['شو منمشّط فيه شعرنا؟', '11_12'], ['شو منشوط فيه؟', '10_2'], ['شو منعزف عليه وفيه أوتار؟', '35_6', ['35_10']],
    ['شو منحضن وقت النوم؟', '10_24', ['10_10']], ['شو لونو برتقالي وبياكلو الأرنب؟', '7_6']
  ].map(([ar, answer, avoid = []], i) => ({ prompt: clip(230 + i, ar, `LRFFC question (Listener 2-9 / 3-11) → ${labels[answer]?.label?.ar || answer}.`), answer, avoid }));

  // 260–269 sounds (LRFFC 2-6): the assessor says the sound, the child selects the animal/object.
  const sounds = [
    ['مياو مياو... مين بيقول مياو؟', '15_2'], ['هاو هاو... مين بيقول هاو هاو؟', '15_4'], ['مووو... مين بيقول مووو؟', '21_6'],
    ['كاك كاك... مين بيقول كاك كاك؟', '15_5'], ['ماااء... مين بيقول ماااء؟', '21_18'], ['بيب بيب... شو بيقول بيب بيب؟', '10_9'],
    ['توت توت... شو بيقول توت توت؟', '10_26'], ['كوكوكو... مين بيقول كوكوكو؟', '15_3']
  ].map(([ar, answer], i) => ({ prompt: clip(260 + i, ar, `LRFFC sound (2-6) → ${labels[answer]?.label?.ar || answer}.`), answer }));

  // 270–279 food and drink fill-ins (LRFFC 2-7).
  const eat = clip(270, 'منآكل...', 'LRFFC 2-7: “you eat…” (a food is in the array of 5).');
  const drink = clip(271, 'منشرب...', 'LRFFC 2-7: “you drink…” (a drink is in the array of 5).');
  const foodDrink = [['5_3', eat], ['6_1', eat], ['6_3', eat], ['5_12', eat], ['5_23', eat], ['8_1', drink], ['8_6', drink], ['8_8', drink]].map(([answer, prompt]) => ({ answer, prompt }));

  // 280–299 colours and shapes (Listener 3-11; VP-MTS 7 and 15 use the same shapes silently).
  const colors = { red: ['#e53935', 'أحمر', 'Red'], blue: ['#1e88e5', 'أزرق', 'Blue'], yellow: ['#fdd835', 'أصفر', 'Yellow'], green: ['#43a047', 'أخضر', 'Green'], orange: ['#fb8c00', 'برتقالي', 'Orange'], purple: ['#8e24aa', 'بنفسجي', 'Purple'] };
  const shapes = { circle: ['دائرة', 'Circle'], square: ['مربع', 'Square'], triangle: ['مثلث', 'Triangle'], star: ['نجمة', 'Star'], heart: ['قلب', 'Heart'], diamond: ['معيّن', 'Diamond'] };
  const colorClip = {}, shapeClip = {};
  [['red', 'وين الأحمر؟'], ['blue', 'وين الأزرق؟'], ['yellow', 'وين الأصفر؟'], ['green', 'وين الأخضر؟']].forEach(([k, ar], i) => { colorClip[k] = clip(280 + i, ar, `Listener 3-11: colour ${colors[k][2]}.`); });
  [['circle', 'وين الدائرة؟'], ['square', 'وين المربع؟'], ['triangle', 'وين المثلث؟'], ['star', 'وين النجمة؟']].forEach(([k, ar], i) => { shapeClip[k] = clip(290 + i, ar, `Listener 3-11: shape ${shapes[k][1]}.`); });

  // 300–329 English uppercase letters (used when the interface is in English).
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const letterClip = {};
  letters.forEach((l, i) => { letterClip[l] = clip(300 + i, `وين حرف ${l}؟`, `Reading 3-12: letter ${l} (say the English letter name).`); });

  // 500–527 Arabic letters (used when the interface is in Arabic). The isolated form is shown; the prompt names the letter.
  const arabicLetters = [['ا', 'الألف'], ['ب', 'الباء'], ['ت', 'التاء'], ['ث', 'الثاء'], ['ج', 'الجيم'], ['ح', 'الحاء'], ['خ', 'الخاء'], ['د', 'الدال'], ['ذ', 'الذال'], ['ر', 'الراء'], ['ز', 'الزاي'], ['س', 'السين'], ['ش', 'الشين'], ['ص', 'الصاد'],
    ['ض', 'الضاد'], ['ط', 'الطاء'], ['ظ', 'الظاء'], ['ع', 'العين'], ['غ', 'الغين'], ['ف', 'الفاء'], ['ق', 'القاف'], ['ك', 'الكاف'], ['ل', 'اللام'], ['م', 'الميم'], ['ن', 'النون'], ['ه', 'الهاء'], ['و', 'الواو'], ['ي', 'الياء']];
  const arabicLetterClip = {};
  arabicLetters.forEach(([ch, name], i) => { arabicLetterClip[ch] = clip(500 + i, `وين حرف ${name}؟`, `Reading 3-12 (Arabic): letter ${ch}.`); });

  // 330–339 numbers (Math 3-11).
  const numberWords = ['واحد', 'اتنين', 'تلاتة', 'أربعة', 'خمسة'];
  const numberClip = {};
  numberWords.forEach((w, i) => { numberClip[i + 1] = clip(330 + i, `وين رقم ${w}؟`, `Math 3-11: number ${i + 1}.`); });

  // 340–344 counting out (Math 3-13).
  const countClip = {};
  ['عطيني واحد', 'عطيني اتنين', 'عطيني تلاتة', 'عطيني أربعة', 'عطيني خمسة'].forEach((ar, i) => { countClip[i + 1] = clip(340 + i, ar, `Math 3-13: give me ${i + 1}.`); });

  // 350–365 comparisons (Math 3-14, Listener 3-13). Each pair: [key, more-word clip, less-word clip].
  const comparisons = [
    ['more', 'وين الأكتر؟', 'وين الأقل؟'], ['big', 'وين الكبير؟', 'وين الصغير؟'], ['long', 'وين الطويل؟', 'وين القصير؟'], ['full', 'وين المليان؟', 'وين الفاضي؟'],
    ['heavy', 'وين التقيل؟', 'وين الخفيف؟'], ['thick', 'وين التخين؟', 'وين الرفيع؟'], ['high', 'وين العالي؟', 'وين الواطي؟'], ['fast', 'وين السريع؟', 'وين البطيء؟']
  ].map(([k, a1, a2], i) => ({ k, a: clip(350 + i * 2, a1, `Comparison “${k}” (first of the pair).`), b: clip(351 + i * 2, a2, `Comparison “${k}” (second of the pair).`) }));

  // 370–377 relative adverbs (Listener 3-13): the assessor gives the instruction, the child performs it.
  const adverbs = [
    ['speed', 'امشي بسرعة', 'امشي ببطء'], ['force', 'دق عالطاولة بقوة', 'دق عالطاولة بشويش'],
    ['volume', 'قول "ماما" بصوت عالي', 'قول "ماما" بصوت واطي'], ['amount', 'صفّق كتير', 'صفّق شوي']
  ].map(([k, a1, a2], i) => ({ k, a: clip(370 + i * 2, a1, `Listener 3-13 adverb pair “${k}”.`), b: clip(371 + i * 2, a2, `Listener 3-13 adverb pair “${k}”.`) }));

  // 390–399 assessor questions for the say-it cards and the mand board.
  const ask = {
    what: clip(390, 'شو هاد؟', 'Tact cards: “What’s that?”'), doing: clip(391, 'شو عم يعمل؟', 'Tact 2-8: “What is he doing?”'),
    where: clip(392, 'وين الطابة؟', 'Tact 3-12: prepositions (“Where is the ball?”).'), letter: clip(393, 'شو هاد الحرف؟', 'Reading 3-13: “What letter is this?”'),
    number: clip(394, 'شو هاد الرقم؟', 'Math 3-12: “What number is this?”'), who: clip(395, 'مين هاد؟', 'Tact 1-1: “Who’s that?”'),
    how: clip(396, 'كيف هاد؟', 'Tact 3-13: adjectives (“What is it like?”).'), want: clip(397, 'شو بدك؟', 'Mand board: “What do you want?”')
  };
  // Live examiner cards (no picture) for pronouns and adverbs.
  const pronounCards = [['أنا', 'I'], ['إنت', 'you'], ['تبعي / إلي', 'mine'], ['تبعك / إلك', 'yours']].map(([ar, en]) => ({ ar, en, live: true }));
  const adverbCards = [['بسرعة', 'fast'], ['ببطء', 'slowly'], ['بقوة', 'hard'], ['بشويش', 'gently']].map(([ar, en]) => ({ ar, en, live: true }));
  const sets = {
    reinforcers: ['10_2', '10_24', '10_10', '10_5', '10_7', '10_9', '5_25', '6_3', '6_1', '5_2', '8_6', '10_26', '11_2', '15_4', '15_2'],
    nonReinforcing: ['22_17', '22_1', '11_29', '10_9', '11_17', '24_2', '11_11', '11_30', '11_12', '11_25', '24_41', '11_20', '22_9', '22_6'],
    body: ['3_14', '3_27', '3_24', '3_12', '3_21', '3_18', '3_20', '3_6', '3_25', '3_1'],
    actions: ['2_1', '2_2', '2_7', '2_13', '2_14', '2_29', '2_16', '2_17', '2_25', '2_34', '2_36', '2_9', '2_3', '2_10', '2_11', '2_30', '2_31', '2_37'],
    prepositions: ['12_6', '12_9', '12_10', '12_1', '12_5', '12_8', '12_2', '12_4', '12_7'],
    adjectives: ['33_23', '33_24', '33_55', '33_56', '33_87', '33_88', '33_93', '33_94', '33_53', '33_54']
  };

  // 400–499 listener prompts for pictures that only appear in the generalization sets (Listener 2-7).
  const exampleClip = {};
  let nextExample = 400;
  for (const id of Object.keys(root.VB_PICTURE_EXAMPLES || {}).sort((x, y) => x.localeCompare(y, 'en', { numeric: true }))) {
    if (listenerClip[id]) continue;
    const word = labels[id]?.label?.ar || id;
    exampleClip[id] = clip(nextExample++, `وين ${spoken[id] || 'ال' + word.replace(/^ال/, '')}؟`, `Listener 2-7: name the picture “${word}” (${id}).`, { card: id });
  }

  // Per-milestone games. full/half = correct responses needed (from the milestone's scoring text).
  const games = {
    'vp1-5': { kind: 'match', array: 3, messy: false, full: 10, half: 5, maxTrials: 14, clip: 1, note: { ar: 'مطابقة صور متماثلة. يُحتسب كل صنف مطابق بشكل صحيح.', en: 'Identical picture matching; each correctly matched item counts.' } },
    'vp2-6': { kind: 'match', array: 6, messy: true, full: 25, half: 15, maxTrials: 32, clip: 1, note: { ar: 'مطابقة متماثلة في مصفوفة فوضوية من 6.', en: 'Identical matching in a messy array of 6.' } },
    'vp2-8': { kind: 'match', array: 8, messy: true, similar: 3, full: 25, half: 15, maxTrials: 32, clip: 1, note: { ar: 'مطابقة متماثلة في مصفوفة فوضوية من 8 فيها 3 مثيرات متشابهة (من نفس الفئة).', en: 'Identical matching, messy array of 8 with 3 similar (same-category) stimuli.' } },
    'vp2-7': { kind: 'sortModel', full: 10, half: 5, note: { ar: 'أربع جولات (ألوان ثم أشكال) مع نماذج. يُحتسب اللون أو الشكل عندما توضع كل قطعه مع نموذجها.', en: 'Four rounds (colours, then shapes) with models. A colour or shape counts when all its pieces go to its model.' } },
    'vp3-14': { kind: 'sortFree', categories: 5, perCategory: 3, full: 5, half: 3, clip: 4, note: { ar: 'تصنيف بدون نموذج: 5 فئات × 3 صور في 5 صناديق فارغة. تُحتسب الفئة عندما تجتمع صورها الثلاث وحدها في صندوق واحد.', en: 'Sorting without a model: 5 categories × 3 pictures into 5 empty boxes. A category counts when its 3 pictures share one box alone.' } },
    'vp3-15': { kind: 'pattern', full: 20, half: 20, maxTrials: 26, clip: 5, note: { ar: 'أنماط ثلاثية الخطوات = نقطة كاملة؛ ثنائية الخطوات = نصف نقطة (اختر النوع قبل البدء).', en: '3-step patterns = full point; 2-step patterns = half point (choose before starting).' } },
    'l1-5': { kind: 'listener', array: 4, messy: false, full: 20, half: 15, maxTrials: 26, note: { ar: 'قل اسم الصورة (أو شغّل التسجيل) ثم يلمس الطفل. تُحتسب المحاولة الأولى فقط لكل صنف.', en: 'Say the name (or play the clip); the child touches. Only the first trial of each item counts.' } },
    'l2-6': { kind: 'listener', array: 6, messy: true, full: 40, half: 25, maxTrials: 50, note: { ar: 'مصفوفة فوضوية من 6.', en: 'Messy array of 6.' } },
    'l3-11': { kind: 'colorShape', array: 6, full: 4, half: 2, note: { ar: '4 ألوان و4 أشكال من مصفوفة من 6 مثيرات متشابهة. كاملة = 4 و4؛ نصف = 2 و2.', en: '4 colours and 4 shapes from 6 similar stimuli. Full = 4 and 4; half = 2 and 2.' } },
    'lr2-6': { kind: 'lrffc', bank: 'sounds', array: 3, full: 5, half: 2, maxTrials: 8, note: { ar: 'قل الصوت (أو شغّل التسجيل)، والطفل يختار من 3.', en: 'Say the sound (or play the clip); the child selects from 3.' } },
    'lr2-7': { kind: 'lrffc', bank: 'foodDrink', array: 5, nonFoodDistractors: true, full: 5, half: 2, maxTrials: 8, note: { ar: 'طعام أو شراب واحد مع 4 أشياء ليست طعاماً.', en: 'One food or drink with 4 non-food items.' } },
    'lr2-8': { kind: 'lrffc', bank: 'fillIns', array: 8, full: 25, half: 12, maxTrials: 27, note: { ar: 'جمل تكملة (صياغة مسودة؛ راجعها قبل التسجيل).', en: 'Fill-in statements (draft wording; review before recording).' } },
    'lr2-9': { kind: 'lrffc', bank: 'wh', array: 10, full: 25, half: 12, maxTrials: 26, note: { ar: 'أسئلة ماذا/مين من مصفوفة من 10.', en: 'What/who questions from an array of 10.' } },
    'lr3-11': { kind: 'lrffc', bank: 'wh', array: 10, similar: 3, full: 25, half: 15, maxTrials: 26, note: { ar: 'مصفوفة من 10 فيها 3 مثيرات متشابهة.', en: 'Array of 10 containing 3 similar stimuli.' } },
    'r3-12': { kind: 'letters', array: 5, full: 10, half: 5, maxTrials: 14, note: { ar: 'يختار الحرف من مصفوفة من 5. تُستعمل الحروف العربية في الواجهة العربية، والإنجليزية الكبيرة في الواجهة الإنجليزية، وتُذكر في الملاحظة.', en: 'Selects the letter from an array of 5. Arabic letters in the Arabic interface, English uppercase in the English interface; the note records which.' } },
    'r3-15': { kind: 'wordPicture', array: 5, full: 5, half: 3, note: { ar: 'كلمة ← صورة ثم صورة ← كلمة. تُحتسب الكلمة عندما تصح بالاتجاهين.', en: 'Word → picture then picture → word. A word counts when correct both ways.' } },
    'ma3-11': { kind: 'numbers', array: 5, note: { ar: 'كل رقم من 1 إلى 5 مرة واحدة. كاملة = 1–5 صحيحة؛ نصف = 1–3 صحيحة.', en: 'Each number 1–5 once. Full = 1–5 correct; half = 1–3 correct.' } },
    'ma3-15': { kind: 'numberQuantity', array: 5, note: { ar: 'رقم ← كمية ثم كمية ← رقم. كاملة = 1–5 بالاتجاهين؛ نصف = 1–3 بالاتجاهين.', en: 'Numeral → quantity then quantity → numeral. Full = 1–5 both ways; half = 1–3 both ways.' } }
  };
  const note = (ar, en) => ({ ar, en });
  Object.assign(games, {
    // Child plays on screen.
    'vp2-9': { kind: 'matchNonIdentical', array: 10, similar: 3, full: 25, half: 15, maxTrials: 32, clip: 1, styles: ['a', 'b'], note: note('مطابقة غير متماثلة: نفس الشيء برسمة مختلفة، مصفوفة فوضوية من 10 فيها 3 متشابهة.', 'Non-identical matching: the same thing drawn differently, messy array of 10 with 3 similar.') },
    'vp3-12': { kind: 'matchNonIdentical', array: 10, similar: 3, full: 25, half: 15, maxTrials: 32, clip: 1, styles: ['c', 'b'], note: note('مطابقة غير متماثلة معممة بأشياء جديدة: تُستعمل رسمة ثالثة لم تظهر في بند 2-9. تُحتسب المحاولة الأولى فقط.', 'Generalized non-identical matching with new items: a third drawing not used in 2-9. First trial only.') },
    'l2-7': { kind: 'generalizeListener', array: 8, fullItems: 50, halfItems: 25, note: note('كل صنف يُعرض بثلاث رسومات مختلفة في مصفوفة فوضوية من 8. الصنف يُحتسب عند صحة رسوماته (3 للكاملة، 2 للنصف). المكتبة فيها 48 صنفاً بثلاث رسومات: أضف ما تحققت منه بأشياء حقيقية.', 'Each item appears in three different drawings in a messy array of 8. An item counts when its drawings are correct (3 for full, 2 for half). The library has 48 items with three drawings: add any you verified with real objects.') },
    'ma3-13': { kind: 'countOut', note: note('اطلب عدداً ("عطيني تلاتة") والطفل يسحب العدد إلى السلة ثم يضغط خلص. كاملة = 1–5؛ نصف = 1–3.', 'Ask for a number (“give me three”); the child drags that many into the basket, then taps done. Full = 1–5; half = 1–3.') },
    'ma3-14': { kind: 'compare', noEarlyStop: true, pairs: ['more', 'big', 'long', 'full', 'heavy', 'thick', 'high', 'fast'], full: 8, half: 6, note: note('8 مقارنات قياس، كل واحدة بطرفيها (مثلاً الكبير والصغير). تُحتسب المقارنة عند صحة الطرفين.', '8 measurement comparisons, each with both ends (e.g. big and small). A comparison counts when both are correct.') },
    'l3-13': { kind: 'compare', pairs: ['big', 'long', 'thick', 'fast'], adverbs: true, note: note('4 أزواج صفات على الشاشة، ثم 4 أزواج ظروف تؤديها مع الطفل وتسجّل صح أو غلط. كاملة = 4 و4؛ نصف = 2 و2، أو 4 من نوع واحد.', '4 adjective pairs on screen, then 4 adverb pairs you give live and mark correct or not. Full = 4 and 4; half = 2 and 2, or 4 of one kind.') },
    'vp3-13': { kind: 'puzzle', designs: 20, note: note('تصاميم أشكال: اسحب كل قطعة إلى مكانها بنفس الشكل واللون. 8 قطع = نقطة كاملة؛ 4 قطع = نصف نقطة (اختر قبل البدء). "تخطي" يعني لم يُكمل.', 'Shape designs: drag each piece to its place with the same shape and colour. 8 pieces = full point; 4 pieces = half point (choose before starting). “Skip” means not completed.') },
    'w3-12': { kind: 'trace', shapes: ['circle', 'square', 'triangle', 'rectangle', 'star'], note: note('يتتبع الطفل الشكل بإصبعه أو بالقلم. ضمن ¼ إنش لكل الأشكال الخمسة = كاملة؛ ضمن ½ إنش = نصف. القياس تقريبي حسب حجم الشاشة.', 'The child traces with a finger or pencil. Within ¼ inch on all 5 shapes = full; within ½ inch = half. Measurement is approximate for the screen size.') },
    'l1-3': { kind: 'photos', full: 5, half: 2, note: note('صوّر أفراد العائلة أو الحيوان الأليف أو الأشياء المحبوبة (تبقى الصور على هذا الجهاز فقط). قل الاسم والطفل يختار من صورتين.', 'Photograph family members, pets or favourite things (photos stay on this device only). Say the name; the child picks from two.') },
    // Screen shows; you mark correct or not.
    'vp1-1': { kind: 'track', full: 5, half: 2, note: note('يتحرك شيء ببطء على الشاشة. اضغط «يتابع» مطولاً ما دام الطفل يتابعه بعينيه؛ ثانيتان تُحتسب.', 'Something glides slowly across the screen. Hold “Following” while the child’s eyes follow it; 2 seconds counts.') },
    'vp1-3': { kind: 'attend', full: 30, half: 15, note: note('مشهد متحرك. اضغط "ينظر" ما دام الطفل منتبهاً واضغطه مجدداً عندما يشيح بنظره. أطول انتباه متواصل: 30 ث = كاملة، 15 ث = نصف. لا تُعطَ النقطة إذا كان المثير نفسه دائماً أو مثيراً للاستثارة الذاتية.', 'An animated scene. Tap “looking” while the child attends and again when they look away. Longest continuous look: 30 s = full, 15 s = half. Do not credit if it is always the same item or a self-stimulation item.') },
    'm1-1': { kind: 'board', full: 2, half: 1, distinct: true, note: note('لوحة معززات: يطلب الطفل بالكلام أو الإشارة أو لمس الصورة. مسموح التلقين الصدوي أو التقليدي (بدون تلقين جسدي). اضغط «طلب» لكل طلب.', 'Reinforcer board: the child asks by word, sign or touching the picture. Echoic or imitative prompts allowed (no physical prompts). Tap “Mand” for each mand.') },
    'm1-2': { kind: 'board', full: 4, half: 3, distinct: true, note: note('بدون تلقين (إلا "شو بدك؟"). اضغط «طلب» لكل طلب لشيء مختلف.', 'No prompts (except “What do you want?”). Tap “Mand” for each mand for a different item.') },
    'm1-5': { kind: 'board', full: 10, half: null, distinct: true, note: note('10 طلبات لأشياء مختلفة بدون تلقين. النص المرفق لا يذكر نصف نقطة.', '10 mands for different items without prompts. The supplied text gives no half point.') },
    'm1-4': { kind: 'board', full: 5, half: 2, minutes: 60, note: note('ملاحظة 60 دقيقة: طلبات عفوية بدون "شو بدك؟". اضغط «طلب» لكل طلب.', '60-minute observation: spontaneous mands without “What do you want?”. Tap “Mand” for each.') },
    't1-1': { kind: 'deck', set: 'reinforcers', photos: true, ask: 'who', full: 2, half: 1, note: note('أشياء أو أشخاص محببون (تظهر صور العائلة أولاً إذا أضفتها). اضغط «سمّاها» إذا سمّاه بدون تلقين صدوي.', 'Favourite things or people (family photos first if added). Tap “Said it” if named without an echoic prompt.') },
    't1-2': { kind: 'deck', set: 'pool', ask: 'what', full: 4, half: 3, note: note('اضغط «سمّاها» لكل تسمية بدون تلقين صدوي.', 'Tap “Said it” for each tact without an echoic prompt.') },
    't1-3': { kind: 'deck', set: 'nonReinforcing', ask: 'what', full: 6, half: 5, note: note('أشياء غير معززة. لا تحتسب ما كان طلباً جزئياً.', 'Non-reinforcing items. Do not count part-mands.') },
    't1-5': { kind: 'deck', set: 'poolBody', ask: 'what', full: 10, half: 8, note: note('أشياء وأجزاء جسم وصور.', 'Objects, body parts and pictures.') },
    't2-6': { kind: 'deck', set: 'pool', ask: 'what', full: 25, half: 20, note: note('"شو هاد؟" لـ 25 صنفاً.', '“What’s that?” for 25 items.') },
    't2-8': { kind: 'deck', set: 'actions', ask: 'doing', full: 10, half: 5, note: note('"شو عم يعمل؟" لصور الأفعال.', '“What is he doing?” for action pictures.') },
    't2-7': { kind: 'deck', set: 'generalize', ask: 'what', fullItems: 50, halfItems: 50, note: note('كل صنف بثلاث رسومات. كاملة = 50 صنفاً بثلاث رسومات؛ نصف = 50 صنفاً برسمتين. المكتبة فيها 48 بثلاث رسومات: أضف ما تحققت منه خارج التطبيق.', 'Each item in three drawings. Full = 50 items across 3; half = 50 items across 2. The library has 48 with three drawings: add any you verified outside the app.') },
    't3-12': { kind: 'deck', set: 'prepositions', live: 'pronouns', ask: 'where', mixed: true, note: note('صور حروف الجر، ثم بطاقات الضمائر تقدّمها مباشرة (أشر لنفسك وللطفل). كاملة = 4 و4.', 'Preposition pictures, then pronoun cards you elicit live (point to yourself and the child). Full = 4 and 4.') },
    't3-13': { kind: 'deck', set: 'adjectives', live: 'adverbs', ask: 'how', mixed: true, note: note('صور الصفات، ثم بطاقات الظروف تؤديها أمام الطفل وتسأل "كيف؟". كاملة = 4 و4.', 'Adjective pictures, then adverb cards you act out and ask “how?”. Full = 4 and 4.') },
    'r3-13': { kind: 'deck', set: 'letters', ask: 'letter', full: 10, half: 5, note: note('يسمّي الحروف: عربية في الواجهة العربية، وإنجليزية كبيرة في الواجهة الإنجليزية.', 'Names letters: Arabic in the Arabic interface, English uppercase in the English interface.') },
    'ma3-12': { kind: 'deck', set: 'numbers', ask: 'number', note: note('الأرقام 1–5 بترتيب مختلط. كاملة = الخمسة؛ نصف = أي 3.', 'Numbers 1–5 in mixed order. Full = all five; half = any 3.') }
  });
  // Observation timer (you watch and tap). crit: total = events, distinct = different events, bout = longest continuous seconds, sum = total seconds, percent = % of the period.
  const obs = (minutes, full, half, ar, en) => ({ kind: 'observe', minutes, full, half, note: note(ar, en) });
  Object.assign(games, {
    't1-4': obs(0, { distinct: 2 }, { distinct: 1 }, 'سمّى أشياء مختلفة بشكل عفوي (بدون حد زمني).', 'Spontaneous tacts of different items (no time limit).'),
    'v1-1': obs(60, { total: 5 }, { total: 2 }, 'أصوات كلامية عفوية في ساعة.', 'Spontaneous speech sounds in an hour.'),
    'v1-2': obs(60, { distinct: 5, total: 10 }, { distinct: 3, total: 10 }, 'أصوات مختلفة ومجموع الأصوات في ساعة.', 'Different sounds and total sounds in an hour.'),
    'v1-3': obs(60, { distinct: 10, total: 25 }, { distinct: 5, total: 25 }, 'أصوات مختلفة بتنغيم متنوع ومجموعها في ساعة.', 'Different sounds with varied intonation and the total in an hour.'),
    'v1-4': obs(0, { total: 5 }, { total: 2 }, 'تقريبات كلمات كاملة عفوية (أثناء الملاحظة).', 'Spontaneous whole-word approximations (during observation).'),
    'v1-5': obs(60, { distinct: 15 }, { distinct: 8 }, 'تقريبات كلمات مختلفة مفهومة في ساعة.', 'Different identifiable word approximations in an hour.'),
    's1-1': obs(30, { total: 5 }, { total: 2 }, 'يتابع حركة الناس ويهتم بها.', 'Tracks and shows interest in people’s movement.'),
    's1-2': obs(60, { total: 2 }, { total: 1 }, 'يطلب أن يُحمل أو يُلعب معه جسدياً.', 'Indicates wanting to be held or physically played with.'),
    's1-3': obs(30, { total: 5 }, { total: 2 }, 'ينظر عفوياً إلى أطفال آخرين.', 'Spontaneously glances at other children.'),
    's1-4': obs(30, { sum: 120 }, { sum: 60 }, 'لعب متوازٍ قرب الأطفال (المجموع). شغّل المؤقت أثناء اللعب.', 'Parallel play near children (total). Run the timer while it happens.'),
    's1-5': obs(30, { total: 2 }, { total: 1 }, 'يتبع الأقران أو يقلد حركاتهم عفوياً.', 'Spontaneously follows peers or imitates them.'),
    'p1-1': obs(30, { bout: 60 }, { bout: 30 }, 'يستكشف الأشياء دقيقة متواصلة.', 'Explores objects for a continuous minute.'),
    'p1-2': obs(30, { distinct: 5 }, { distinct: 3 }, 'يلعب بأشياء مختلفة.', 'Plays with different items.'),
    'p1-4': obs(30, { sum: 120 }, { sum: 60 }, 'لعب حركي (أرجحة، رقص، قفز…).', 'Movement play (swinging, dancing, jumping…).'),
    'p1-5': obs(30, { sum: 120 }, { sum: 60 }, 'لعب السبب والنتيجة.', 'Cause-and-effect play.'),
    'i1-4': obs(0, { total: 5 }, { total: 2 }, 'يقلد حركات الآخرين عفوياً.', 'Spontaneously imitates others’ motor behaviour.'),
    'm2-8': obs(60, { distinct: 5 }, { distinct: 2 }, 'طلبات مختلفة من كلمتين أو أكثر (ليس "بدي").', 'Different mands of 2+ words (not “I want”).'),
    'm2-9': obs(30, { distinct: 15 }, { total: 8 }, 'طلبات عفوية مختلفة. نصف = 8 طلبات.', 'Different spontaneous mands. Half = 8 mands.'),
    'p2-9': obs(30, { sum: 300 }, { sum: 120 }, 'لعب على ألعاب الحديقة (المجموع).', 'Play on playground equipment (total).'),
    's2-7': obs(60, { total: 5 }, { total: 2 }, 'يطلب من الأقران عفوياً.', 'Spontaneously mands to peers.'),
    's2-8': obs(30, { bout: 300 }, { bout: 120 }, 'لعب اجتماعي متواصل مع الأقران بتفاعل فعلي.', 'Sustained social play with peers with real interaction.'),
    's2-9': obs(0, { total: 5 }, { total: 2 }, 'يستجيب عفوياً لطلبات الأقران.', 'Spontaneously responds to peers’ mands.'),
    's2-10': obs(60, { total: 2 }, { total: 1 }, 'يدعو الأقران للمشاركة في اللعب.', 'Mands to peers to join games or play.'),
    'cl2-9': obs(0, { bout: 300 }, { bout: 120 }, 'يجلس في مجموعة من 3 أطفال أو أكثر بدون سلوك مزعج.', 'Sits in a group of 3+ children without disruption.'),
    'm3-11': obs(60, { total: 5 }, { total: 2 }, 'يسأل عن معلومات بأدوات استفهام.', 'Mands for information with question words.'),
    'm3-13': obs(60, { distinct: 10 }, { distinct: 5 }, 'طلبات بصفات أو حروف جر أو ظروف مختلفة (يلزم 2 على الأقل من كل نوع للكاملة).', 'Mands with different adjectives, prepositions or adverbs (full needs at least 2 of each).'),
    's3-12': obs(60, { distinct: 5 }, { distinct: 2 }, 'أسئلة مختلفة للأقران.', 'Different questions to peers.'),
    's3-13': obs(60, { distinct: 5 }, { distinct: 2 }, 'يرد كلامياً على أسئلة أو تعليقات الأقران.', 'Responds verbally to peers’ questions or statements.'),
    'p3-13': obs(0, { bout: 300 }, { bout: 120 }, 'أنشطة فنية مستقلة.', 'Independent arts and crafts.'),
    'p3-14': obs(0, { bout: 600 }, { bout: 300 }, 'لعب مستقل متواصل.', 'Sustained independent play.'),
    'p3-15': obs(0, { bout: 300 }, { bout: 120 }, 'رسم أو كتابة في كتب الأنشطة.', 'Drawing or writing in activity books.'),
    'r3-11': obs(3, { percent: 75 }, { percent: 50 }, 'ينتبه للكتاب أثناء قراءة القصة: شغّل "ينتبه" وأوقفه عند الإشاحة.', 'Attends to the book while a story is read: toggle “attending”.'),
    'iv3-11': obs(0, { total: 20 }, { total: 10 }, 'تعليقات حوارية عفوية خلال اليوم.', 'Spontaneous intraverbal comments during the day.'),
    'li2-8': obs(0, { distinct: 10 }, { distinct: 5 }, 'عبارات مختلفة من كلمتين خلال اليوم (ليس ترديداً).', 'Different 2-word utterances during the day (not echoic).')
  });

  root.VB_GAMES = { groups, clips, listenerClip, fillIns, wh, sounds, foodDrink, colors, shapes, colorClip, shapeClip, letters, letterClip, arabicLetters, arabicLetterClip, numberClip, games, countClip, comparisons, adverbs, ask, pronounCards, adverbCards, sets, exampleClip };
  if (typeof module !== 'undefined') module.exports = root.VB_GAMES;
})(typeof window !== 'undefined' ? window : globalThis);
