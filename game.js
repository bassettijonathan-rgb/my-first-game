/* The Gibbet Apprentice
 * A small, grim roleplaying game. You are the apprentice of a hanged necromancer
 * in the plague town of Wexmoor. Keep yourself fed, keep your mind, keep the
 * witch-finder from your door, and decide what to do with what your master left.
 */
(() => {
'use strict';

// ---------------------------------------------------------------- utilities
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const SAVE_KEY = 'gibbet-apprentice-save-v1';
const PHASES = ['Dawn', 'Day', 'Dusk', 'Night'];
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
  'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth',
  'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth'];

const ITEMS = {
  bread:     { name: 'Black bread',  desc: 'A day\'s eating, barely.' },
  candle:    { name: 'Tallow candle', desc: 'Light for study and rites.' },
  chalk:     { name: 'Chalk',         desc: 'For drawing the circle.' },
  salt:      { name: 'Grave salt',    desc: 'Keeps meat. Keeps the door.' },
  bonedust:  { name: 'Bone dust',     desc: 'Mends what has been bound.' },
  nightshade:{ name: 'Nightshade',    desc: 'The apothecary pays for it.' },
  gravemoss: { name: 'Grave-moss',    desc: 'A poultice for wounds and fever.' },
};

const SPELLS = {
  bind:    { name: 'Binding of the Lesser Dead', req: 0,  desc: 'Raise a corpse as a thrall.' },
  chill:   { name: 'Grave Chill',               req: 15, desc: 'Combat. 2 will. Cold of the grave.' },
  wither:  { name: 'Wither',                    req: 30, desc: 'Combat. 3 will. Take what they have left.' },
  calling: { name: 'The Calling Back',          req: 50, desc: 'Call one who has gone far.' },
};

const NOTES = [
  { at: 8, text: 'The dead are not gone. They are only <em>still</em>. Stillness can be disturbed, as a pond can, but understand: every ripple you make returns to the hand that made it.' },
  { at: 15, text: 'Cold is what is left when the soul goes out of a body. It does not go anywhere. Learn to gather it in your palm and give it to someone who is still warm. (Here the hand is shaking. Grave Chill.)' },
  { at: 22, text: 'Salt keeps meat and salt keeps the door. Without salt at the threshold, what answers your call may not be what you called.' },
  { at: 30, text: 'A body is a purse. Life is the coin in it. A wise man does not take more than he needs, and I have never been wise. (Wither.)' },
  { at: 40, text: 'They burn us because they believe. That is the worst of it. A greedy man can be bribed. A frightened man can be reasoned with. A man who believes he is saving your soul will hold the torch himself.' },
  { at: 50, text: 'To call back one who has gone far you need three things: something of theirs, a road between, and a night with no one watching. The crossroads is a road between. If they hang me, and they will, the crossroads will serve. Do not wait long. The crows are patient but they are not idle. (The Calling Back.)' },
  { at: 60, text: 'Do not call me back for love. Call me back only if you must know something. Love is not a reason to do this to anyone.' },
];

const ENEMIES = {
  watchman: { name: 'Night watchman', hp: 14, atk: [2, 4], hit: 0.7, coin: [1, 4],
    flavour: 'A stout man in a padded jack, lantern swinging, cudgel already raised.' },
  dogs:     { name: 'Feral dogs', hp: 9, atk: [1, 3], hit: 0.75, coin: [0, 0],
    flavour: 'Three of them, ribs like harp strings, mouths red from the pit.' },
  ragpicker:{ name: 'Rag-picker', hp: 9, atk: [1, 3], hit: 0.65, coin: [0, 2],
    flavour: 'A man wrapped in other people\'s clothes, a hooked knife in his fist. He is as hungry as you.' },
  wolf:     { name: 'Grey wolf', hp: 13, atk: [2, 5], hit: 0.7, coin: [0, 0],
    flavour: 'Winter-thin and silent. It does not growl. It simply comes.' },
  robber:   { name: 'Resurrection man', hp: 12, atk: [2, 4], hit: 0.7, coin: [2, 5],
    flavour: 'Another digger, spade in hand. He sells to the surgeons\' guild and does not want to share.' },
  soldier:  { name: 'Church soldier', hp: 16, atk: [2, 5], hit: 0.7, coin: [1, 3],
    flavour: 'Mail under a white surcoat stained grey with road mud. He has done this before.' },
  aldric:   { name: 'Brother Aldric', hp: 28, atk: [3, 6], hit: 0.75, coin: [0, 0], boss: true,
    flavour: 'Lean, tonsured, a short sword in one hand and a reliquary of finger-bones in the other.' },
};

// ---------------------------------------------------------------- state
let S = null;

function newState() {
  return {
    day: 1, phase: 0, loc: 'garret',
    hp: 20, hpMax: 20, will: 10, willMax: 10,
    corruption: 0, suspicion: 5, coin: 6, knowledge: 0,
    inv: { bread: 2, candle: 2, chalk: 1, salt: 0, bonedust: 0, nightshade: 0, gravemoss: 0 },
    corpses: [],       // { label, quality, age }
    thralls: [],       // { name, hp, hpMax, atk:[a,b], quality }
    spells: ['bind'],
    notesRead: 0,
    corvin: 100,       // what is left of the master on the gibbet
    fed: false, sick: 0, prayed: false,
    freshGrave: 0,     // day a fresh burial happened
    hesk: 0, heskDelivery: false,
    aldric: false, hanging: false, warned: false,
    queue: [],
    log: [],
    thrallCount: 0,
    over: false,
  };
}

function save() {
  if (!S || S.over) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------- rendering
const elNarr = $('#narrative');
const elChoices = $('#choices');
const elLoc = $('#location');
let currentChoices = [];

function para(t) {
  if (t.startsWith('<')) return t;
  return `<p>${t}</p>`;
}

function show(title, lines, choices) {
  elLoc.textContent = title || '';
  elNarr.innerHTML = lines.filter(Boolean).map(para).join('');
  renderChoices(choices);
  renderSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderChoices(choices) {
  currentChoices = choices.filter(Boolean);
  elChoices.innerHTML = '';
  let n = 0;
  currentChoices.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'choice' + (c.sep ? ' sep' : '');
    const disabled = !!c.disabled;
    b.disabled = disabled;
    n += 1;
    c.key = n <= 9 ? String(n) : '';
    const hint = typeof c.disabled === 'string' ? c.disabled : c.hint;
    b.innerHTML = `<span class="key">${c.key}</span><span class="label">${c.label}</span>` +
      (hint ? `<span class="hint">${hint}</span>` : '');
    b.addEventListener('click', () => { if (!b.disabled) { sfx('step'); c.fn(); } });
    elChoices.appendChild(b);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const c = currentChoices.find((x) => x.key === e.key);
  if (c && !c.disabled) { sfx('step'); c.fn(); }
});

function bar(cls, label, v, max, showVal = true) {
  const pct = clamp((v / max) * 100, 0, 100);
  return `<div class="stat"><div class="stat-head"><span>${label}</span><span>${showVal ? `${v} / ${max}` : ''}</span></div>` +
    `<div class="bar ${cls}"><i style="width:${pct}%"></i></div></div>`;
}

function suspicionWord(v) {
  if (v < 15) return 'Unremarked';
  if (v < 35) return 'Muttered about';
  if (v < 55) return 'Watched';
  if (v < 75) return 'Named in whispers';
  if (v < 90) return 'Hunted';
  return 'They are coming';
}
function corruptionWord(v) {
  if (v < 15) return 'Clean hands';
  if (v < 35) return 'Cold fingers';
  if (v < 55) return 'Grey at the lips';
  if (v < 75) return 'Something looks out';
  return 'Barely yourself';
}

function renderSidebar() {
  if (!S) return;
  $('#clock').textContent = S.over ? '' : `The ${ORDINAL[S.day] || S.day + 'th'} day — ${PHASES[S.phase]}`;
  const tags = [];
  if (S.sick) tags.push('<span class="status-tag bad">Fevered</span>');
  if (!S.fed) tags.push('<span class="status-tag">Not yet eaten</span>');
  if (S.aldric) tags.push('<span class="status-tag bad">Witch-finder in town</span>');
  $('#stats').innerHTML =
    bar('hp', 'Health', S.hp, S.hpMax) +
    bar('will', 'Will', S.will, S.willMax) +
    `<div class="stat"><div class="stat-head"><span>Corruption</span><span>${corruptionWord(S.corruption)}</span></div><div class="bar corr"><i style="width:${S.corruption}%"></i></div></div>` +
    `<div class="stat"><div class="stat-head"><span>Suspicion</span><span>${suspicionWord(S.suspicion)}</span></div><div class="bar susp"><i style="width:${S.suspicion}%"></i></div></div>` +
    `<div class="kv"><span>Coin</span><span>${S.coin} pennies</span></div>` +
    `<div class="kv"><span>Knowledge</span><span>${S.knowledge}</span></div>` +
    (tags.length ? `<div style="margin-top:6px">${tags.join('')}</div>` : '');

  const inv = Object.keys(ITEMS).filter((k) => S.inv[k] > 0)
    .map((k) => `<div class="kv" title="${ITEMS[k].desc}"><span>${ITEMS[k].name}</span><span>${S.inv[k]}</span></div>`);
  if (S.corpses.length) {
    inv.push(`<div class="kv"><span>In the cellar</span><span>${S.corpses.length} ${S.corpses.length === 1 ? 'body' : 'bodies'}</span></div>`);
  }
  $('#inventory').innerHTML = inv.length ? inv.join('') : '<div class="empty">Empty, save for lint.</div>';

  $('#thralls').innerHTML = S.thralls.length
    ? S.thralls.map((t) => `<div class="thrall">${t.name}<small>${t.hp}/${t.hpMax} — ${t.hp < t.hpMax / 2 ? 'coming apart' : 'holding together'}</small></div>`).join('') +
      `<div class="empty">Room for ${thrallCap() - S.thralls.length} more.</div>`
    : `<div class="empty">None. You may hold ${thrallCap()}.</div>`;

  $('#spells').innerHTML = S.spells.map((k) => `<div class="kv" title="${SPELLS[k].desc}"><span>${SPELLS[k].name}</span><span></span></div>`).join('');

  renderLog();
}

function renderLog() {
  $('#log').innerHTML = S.log.slice(-40).reverse()
    .map((l) => `<li class="${l.cls || ''}"><b>D${l.day}</b>${l.msg}</li>`).join('');
}

function log(msg, cls) {
  S.log.push({ day: S.day, msg, cls });
  if (S.log.length > 120) S.log.shift();
}

// ---------------------------------------------------------------- stat changes
function thrallCap() { return 1 + Math.floor(S.knowledge / 30); }

function adj(key, delta, quiet) {
  const before = S[key];
  const max = key === 'hp' ? S.hpMax : key === 'will' ? S.willMax : 100;
  if (key === 'coin') S.coin = Math.max(0, S.coin + delta);
  else S[key] = clamp(S[key] + delta, 0, max);
  const real = S[key] - before;
  if (!quiet && real !== 0) {
    const names = { hp: 'health', will: 'will', corruption: 'corruption', suspicion: 'suspicion', coin: 'pennies', knowledge: 'knowledge' };
    const good = (key === 'corruption' || key === 'suspicion') ? real < 0 : real > 0;
    return `<p class="${good ? 'gain' : 'loss'}">${real > 0 ? '+' : ''}${real} ${names[key]}</p>`;
  }
  return '';
}

function give(item, n) {
  S.inv[item] = Math.max(0, (S.inv[item] || 0) + n);
  return `<p class="${n > 0 ? 'gain' : 'loss'}">${n > 0 ? '+' : ''}${n} ${ITEMS[item].name.toLowerCase()}</p>`;
}

function has(item, n = 1) { return (S.inv[item] || 0) >= n; }

function learnFromKnowledge() {
  const out = [];
  Object.keys(SPELLS).forEach((k) => {
    if (!S.spells.includes(k) && S.knowledge >= SPELLS[k].req) {
      S.spells.push(k);
      log(`Learned ${SPELLS[k].name}.`, 'good');
      out.push(`<p class="gain">You have learned <em>${SPELLS[k].name}</em>.</p>`);
    }
  });
  return out;
}

// ---------------------------------------------------------------- time
function spend(n = 1) {
  for (let i = 0; i < n; i++) {
    S.phase += 1;
    if (S.phase > 3) {
      S.phase = 0;
      S.queue.push('sleepless');
      dailyTick(false);
    }
  }
}

function dailyTick(rested) {
  S.day += 1;
  const notes = [];

  // food
  if (!S.fed) {
    if (has('bread')) { S.inv.bread -= 1; notes.push('You ate the last of yesterday\'s bread before sleep.'); }
    else {
      S.hp = clamp(S.hp - 3, 0, S.hpMax); S.will = clamp(S.will - 1, 0, S.willMax);
      notes.push('You went to sleep hungry. Your belly is a fist.');
      log('Went hungry.', 'bad');
    }
  }
  S.fed = false;
  S.prayed = false;

  // rest
  if (rested) {
    S.will = clamp(S.will + 3, 0, S.willMax);
    if (!S.sick) S.hp = clamp(S.hp + 3, 0, S.hpMax);
  } else {
    S.will = clamp(S.will - 2, 0, S.willMax);
  }

  // sickness
  if (S.sick) {
    S.hp = clamp(S.hp - 2, 0, S.hpMax);
    notes.push('The fever sits in your joints.');
    if (chance(0.3)) { S.sick = 0; notes.push('By morning it has broken. You are soaked and shaking, but clear.'); log('The fever broke.', 'good'); }
  }

  // bodies in the cellar
  S.corpses.forEach((c) => { c.age += 1; });
  const rotten = S.corpses.filter((c) => c.age >= 4);
  if (rotten.length) {
    S.corpses = S.corpses.filter((c) => c.age < 4);
    S.suspicion = clamp(S.suspicion + 6 * rotten.length, 0, 100);
    notes.push('Something in the cellar has turned. The smell comes up through the boards and out under the door, and the neighbours have noses. You drag it out to the midden in the dark, but the damage is done.');
    log('A body rotted in the cellar. The neighbours noticed.', 'bad');
  }

  // thralls decay and draw notice
  S.thralls.forEach((t) => { t.hp -= 1; });
  const fallen = S.thralls.filter((t) => t.hp <= 0);
  if (fallen.length) {
    S.thralls = S.thralls.filter((t) => t.hp > 0);
    fallen.forEach((t) => { notes.push(`${t.name} came apart in the night. The binding simply let go.`); log(`${t.name} fell apart.`, 'bad'); });
  }
  if (S.thralls.length) {
    S.suspicion = clamp(S.suspicion + 2 * S.thralls.length, 0, 100);
  } else if (S.suspicion > 0) {
    S.suspicion = clamp(S.suspicion - 1, 0, 100);
  }
  if (S.aldric) S.suspicion = clamp(S.suspicion + 2, 0, 100);

  // the master on the gibbet
  S.corvin = clamp(S.corvin - 5, 0, 100);

  // gravedigger delivery
  if (S.heskDelivery) {
    S.heskDelivery = false;
    S.corpses.push({ label: 'a carter, three days dead of the cough', quality: 2, age: 0 });
    notes.push('Hesk was as good as his word. There is a shape in sacking at the bottom of the cellar stairs.');
    log('Hesk delivered a body.', '');
  }

  // story beats
  if (S.day === 4) S.queue.push('burial');
  if (S.day === 6 && !S.aldric) S.queue.push('aldric');
  if (S.day === 9 && !S.hanging) S.queue.push('hanging');
  if (S.corvin <= 0) S.queue.push('gibbetGone');

  if (notes.length) S.queue.push({ kind: 'morning', notes });
}

// ---------------------------------------------------------------- endings & checks
function checkFatal() {
  if (S.over) return true;
  if (S.hp <= 0) { endDeath(); return true; }
  if (S.will <= 0) { endMadness(); return true; }
  if (S.corruption >= 100) { endCorruption(); return true; }
  if (S.suspicion >= 100) { arrest(); return true; }
  return false;
}

function ending(title, lines) {
  S.over = true;
  clearSave();
  log(`Ending: ${title}`, 'bad');
  elLoc.textContent = '';
  elNarr.innerHTML = `<h2 class="ending-title">${title}</h2>` + lines.map(para).join('') +
    `<p class="dim">You lasted ${S.day} ${S.day === 1 ? 'day' : 'days'}. Knowledge ${S.knowledge}. Corruption ${S.corruption}. ${S.thrallCount} raised.</p>`;
  renderChoices([{ label: 'Begin again', fn: () => { S = newState(); intro(); } }]);
  renderSidebar();
  sfx('toll');
}

function endDeath() {
  ending('A Grave of Your Own', [
    'The cold comes up from the ground and finds you. It is not dramatic. It is like being very tired in a very quiet room.',
    'They find you in a few days. No one knows you well enough to say what you were. The gravedigger puts you in the pit with the others, and you are, at last, entirely ordinary.',
  ]);
}
function endMadness() {
  ending('The Hollow Room', [
    'There is a point past which the voices in the master\'s notes and the voices in your head are the same voices. You pass it on a grey afternoon without noticing.',
    'The neighbours hear you laughing in the garret for three days, then talking, then nothing. When the door is forced, you are sitting very straight in the chalk circle, waiting for someone to answer. No one does. No one ever did.',
  ]);
}
function endCorruption() {
  ending('What Answered', [
    'You used to think the cold in your hands was something you carried. It was carrying you.',
    'One morning you look in the basin and the face that looks back is patient in a way no living face is. You go out into Wexmoor. Within the week the plague pits are empty, and the town is very, very quiet.',
  ]);
}

function arrest() {
  S.queue = [];
  const lines = [
    'They come before dawn, the way they always do. Boots on the stair. A fist on the door, then the door itself, splintering at the latch.',
    `<p class="speech">"In the name of the Holy Office," says Brother Aldric, quite calmly, stepping over the wreck of it. Two soldiers behind him. Torchlight on the chalk marks you never quite scrubbed away.</p>`,
  ];
  if (S.thralls.length) lines.push(`In the corner, ${S.thralls.map((t) => t.name).join(' and ')} ${S.thralls.length === 1 ? 'turns' : 'turn'} its head toward you, waiting.`);
  show('The Garret', lines, [
    { label: 'Fight', hint: 'They will not take you alive, then', fn: () => {
      combat(['soldier', 'aldric'], {
        canFlee: false,
        intro: 'The first soldier comes through the door shoulder-first.',
        onWin: () => ending('The Road at Night', [
          'When it is done the garret floor is slick and dark and you are the only one breathing. You take what coin they carried, the master\'s notes, and nothing else.',
          'You leave Wexmoor through the drain under the south wall and walk until the sun comes up. Behind you, someone rings the alarm bell. Ahead of you, there are other towns, and other graveyards, and the Holy Office has a long memory.',
        ]),
      });
    } },
    { label: 'Surrender', hint: 'Perhaps there is mercy', fn: () => ending('Ashes at Candlemas', [
      'There is no mercy. There is a trial, which is brief, and a confession, which is not yours but has your mark at the bottom of it after the second day.',
      'They burn you in the market square on a damp morning. The wood is green and it takes a long time. Brother Aldric prays for your soul throughout, and you believe, by the end, that he means it. That is the worst of it.',
    ]) },
  ]);
}

// ---------------------------------------------------------------- queued scenes
function runQueue() {
  if (!S.queue.length) return false;
  const item = S.queue.shift();
  if (typeof item === 'object' && item.kind === 'morning') {
    show(PHASES[S.phase], item.notes, [{ label: 'Go on', fn: hub }]);
    return true;
  }
  const scene = SCENES[item];
  if (scene) { scene(); return true; }
  return false;
}

const SCENES = {
  sleepless() {
    S.loc = 'garret';
    show('Grey Morning', [
      'You did not sleep. The night simply wore away, and now the sky over the rooftops is the colour of dishwater and your eyes feel full of sand.',
      'Somehow your feet have brought you back to the garret.',
    ], [{ label: 'Go on', fn: hub }]);
  },
  burial() {
    S.freshGrave = S.day;
    show('A Bell at Saint Orrin\'s', [
      'A single bell from Saint Orrin\'s before the sun is properly up. Not the plague bell, which is cracked and sounds like a cough. The proper one.',
      'A burial with a priest, then. Someone with money. Someone who will be lying under fresh earth tonight, whole, and only a few hours dead.',
      '<p class="dim">A fresh grave waits in the churchyard for the next two nights.</p>',
    ], [{ label: 'Go on', fn: hub }]);
  },
  aldric() {
    S.aldric = true;
    log('Brother Aldric of the Holy Office has come to Wexmoor.', 'bad');
    show('The Witch-Finder', [
      'He arrives at the north gate with four soldiers and a mule cart full of books. By noon everyone in Wexmoor knows his name.',
      'Brother Aldric of the Holy Office. Thin, soft-spoken, younger than you expected. He takes rooms above the cooper\'s and on the first evening he stands on the church steps and asks, very gently, whether anyone knew the scrivener Corvin, who was hanged, and whether anyone kept company with him.',
      'Several people look at the ground. One or two look at you.',
      '<p class="dim">From now on, suspicion grows a little every day. Pray, work, and keep your cellar clean.</p>',
    ], [{ label: 'Go on', fn: hub }]);
  },
  hanging() {
    S.hanging = true;
    show('Market Square', [
      'Aldric has found someone. Not you.',
      'Old Mother Tibb, who sold charms against the toothache and was simple, and talked to her goat. They hang her from the market crossbeam at midday, and she does not seem to understand what is happening until the very end, and then she does.',
      'The crowd is quiet. Some of them weep. Most of them watch you, or you think they do.',
    ], [
      { label: 'Watch until it is finished', hint: 'You should see what they do', fn: () => {
        const out = [
          'You make yourself watch all of it. You make yourself remember her face.',
          'Afterward Aldric catches your eye across the square and nods, as if you have both been through something together.',
        ];
        out.push(adj('will', -2), adj('suspicion', -6));
        show('Market Square', out, [{ label: 'Go on', fn: hub }]);
      } },
      { label: 'Turn away and go home', fn: () => {
        const out = ['You push back through the crowd. Someone says something behind you. You do not turn around.'];
        out.push(adj('suspicion', 4));
        S.loc = 'garret';
        show('Market Square', out, [{ label: 'Go on', fn: hub }]);
      } },
    ]);
  },
  gibbetGone() {
    ending('What the Crows Left', [
      'One morning there is nothing on the crossroads gibbet but a length of tarred rope and some scraps of cloth. The crows have finished. The parish cuts down what is left and burns it in a lime pit.',
      'Whatever Master Corvin knew, he took into the fire with him. You stay in Wexmoor and copy wills and bills of sale for the living, and you never open his notes again. Some nights you think of them. Most nights you sleep.',
    ]);
  },
};

// ---------------------------------------------------------------- intro
function intro() {
  show('Wexmoor, in the Plague Winter', [
    'Three days ago they hanged Master Corvin at the south crossroads.',
    'He was a scrivener by trade. He wrote letters for people who could not, and copied deeds, and kept a cold little garret above the chandler\'s on Tallow Lane. He also, in the cellar, with the door barred, raised the dead. You know this because for two years you held the candle.',
    'The Holy Office did not find his notes. They are under your floorboards now: a bundle of oilcloth and tied string, written in a hand that slopes more steeply toward the end.',
    'The grey cough is in the town. Bread is dear. A witch-finder has been sent for. And you are alone with what he taught you, which is not nearly enough.',
  ], [
    { label: 'Take up the notes', fn: intro2 },
  ]);
}
function intro2() {
  show('The Garret', [
    'You unwrap the oilcloth. The first page is in his ordinary hand, a note left for you and no one else:',
    '<p class="note">If you are reading this I am dead, and you have been foolish enough to keep these. Very well. Eat first. Study second. Do not raise anything you cannot hide. And whatever they do with my body, do not let it be wasted. — C.</p>',
    'Outside, a cart goes by with the day\'s dead stacked under a sheet. The driver is singing.',
    '<p class="dim">Keep yourself fed and sane. Study to learn. Raise the dead if you must. Watch your suspicion. Your master hangs at the crossroads, and every day there is less of him.</p>',
  ], [
    { label: 'Begin', fn: () => { log('Master Corvin is three days hanged. You have his notes.'); hub(); } },
  ]);
}

// ---------------------------------------------------------------- locations
const OUTSIDE = ['pits', 'blackwood', 'crossroads'];

const LOCS = {
  garret: {
    name: 'The Garret, Tallow Lane',
    desc() {
      const d = [
        ['Grey light through the one small window. Below, the chandler is already rendering fat, and the smell of it comes up through the floor.',
         'Frost on the inside of the shutters. Your breath shows.'],
        ['Noise from the lane: carts, a dog, someone coughing and coughing. The garret is cold even at midday.',
         'The master\'s chair is still by the window. You have not been able to sit in it.'],
        ['The light goes early in winter. You can hear the chandler barring his shop downstairs.',
         'The window turns blue, then black. Somewhere a child is calling for its mother.'],
        ['Night. The house ticks and settles. Under the boards, the cellar waits with its chalk marks and its iron ring.',
         'The candle-stub gutters. Out in the dark, the bell of Saint Orrin\'s counts the hours for no one.'],
      ][S.phase];
      const out = [pick(d)];
      if (S.corpses.length) out.push(`In the cellar: ${S.corpses.map((c) => c.label + (c.age >= 2 ? ', and beginning to turn' : '')).join('; ')}.`);
      if (S.thralls.length) out.push(`${S.thralls.map((t) => t.name).join(' and ')} ${S.thralls.length === 1 ? 'stands' : 'stand'} in the cellar dark, facing the wall, waiting.`);
      if (S.corruption >= 50) out.push('<p class="dim">Your hands are always cold now. You have stopped trying to warm them.</p>');
      return out;
    },
    actions() {
      const night = S.phase >= 2;
      return [
        { label: 'Study the master\'s notes', hint: night ? 'Burns a candle' : 'By daylight', disabled: night && !has('candle') ? 'You have no candle' : false, fn: study },
        { label: 'Go down to the cellar', hint: S.corpses.length ? `${S.corpses.length} body waiting` : '', fn: cellar },
        { label: 'Eat', hint: 'Black bread', disabled: S.fed ? 'You have eaten today' : !has('bread') ? 'No bread' : false, fn: eat },
        { label: 'Make a poultice', hint: 'Grave-moss — heals and breaks fever', disabled: !has('gravemoss') ? 'No grave-moss' : false, fn: poultice },
        { label: 'Sleep until dawn', hint: 'Restores will and health', fn: sleep },
      ];
    },
  },
  market: {
    name: 'Market Square',
    desc() {
      if (S.phase >= 2) return ['The stalls are shuttered. A few women pick through the cabbage leaves trodden into the cobbles. The crossbeam where they hang people stands black against the sky.'];
      const out = [pick([
        'Half the stalls are empty. The ones that remain sell what they can at prices that would have caused a riot last year.',
        'A friar is preaching from the well-head about sin and the cough, and which causes which. Nobody stops to listen, but nobody tells him to stop either.',
        'Carts in from the country, guarded by men with staves. A loaf costs what a pie cost at harvest.',
      ])];
      if (S.aldric) out.push('One of the witch-finder\'s soldiers leans by the well, watching who buys what.');
      return out;
    },
    actions() {
      const open = S.phase < 2;
      const closed = open ? false : 'Closed until morning';
      const chalkPrice = S.aldric ? 3 : 2;
      return [
        { label: 'Buy black bread', hint: '1 penny', disabled: closed || (S.coin < 1 ? 'Not enough coin' : false), fn: () => buy('bread', 1) },
        { label: 'Buy a tallow candle', hint: '1 penny', disabled: closed || (S.coin < 1 ? 'Not enough coin' : false), fn: () => buy('candle', 1) },
        { label: 'Buy chalk', hint: `${chalkPrice} pennies`, disabled: closed || (S.coin < chalkPrice ? 'Not enough coin' : false), fn: () => buy('chalk', chalkPrice) },
        { label: 'Buy grave salt from the salter', hint: '3 pennies', disabled: closed || (S.coin < 3 ? 'Not enough coin' : false), fn: () => buy('salt', 3) },
        { label: 'Sell herbs to the apothecary', hint: 'Nightshade 2, grave-moss 3', disabled: closed || (!has('nightshade') && !has('gravemoss') ? 'Nothing to sell' : false), fn: sellHerbs },
        { label: 'Write letters for coin', hint: 'Honest work. Takes the day.', disabled: closed, fn: scribeWork },
        { label: 'Ask the carters about passage south', hint: 'Leave Wexmoor for good', disabled: closed, fn: passage },
      ];
    },
  },
  tavern: {
    name: 'The Drowned Lantern',
    desc() {
      if (S.phase < 2) return ['Daytime, and the Lantern is nearly empty: the potboy asleep on a bench, last night\'s rushes on the floor. A sour smell of spilt ale.'];
      const out = [pick([
        'Low beams, a smoking fire, men drinking to forget what they carted out of town this morning. Nobody sings here any more.',
        'The Lantern is crowded and quiet. People drink close together and talk in murmurs. A dice game in the corner, played without enthusiasm.',
      ])];
      out.push('Hesk the gravedigger sits by himself near the fire, as he always does, clay pipe and a cup of small beer. People leave a space around him.');
      return out;
    },
    actions() {
      const open = S.phase >= 2;
      return [
        { label: 'Buy a hot meal', hint: '2 pennies — pottage and a heel of bread', disabled: S.coin < 2 ? 'Not enough coin' : false, fn: meal },
        { label: 'Drink alone in a corner', hint: '1 penny — steadies the nerves', disabled: S.coin < 1 ? 'Not enough coin' : false, fn: drink },
        { label: 'Listen to the talk', fn: rumours, disabled: open ? false : 'No one here to listen to' },
        { label: 'Sit with Hesk the gravedigger', fn: hesk, disabled: open ? false : 'He comes in after dark' },
      ];
    },
  },
  churchyard: {
    name: 'Saint Orrin\'s Churchyard',
    desc() {
      const fresh = S.freshGrave && S.day - S.freshGrave <= 2;
      const d = [
        'Leaning stones, sunk graves, the yews black and dripping. The wall on the lane side has fallen in places.',
        'The churchyard is full. They have started burying them two deep along the north wall, where the sun never comes.',
        'The light is going. The sexton\'s lantern bobs down by the lychgate and then goes out.',
        'Night. The stones are pale shapes. The church is a black mass with one red lamp burning inside it, for the Host.',
      ][S.phase];
      const out = [d];
      if (fresh) out.push('By the chancel wall, a grave so new the earth is still dark and loose, the turf laid back over it in squares.');
      if (S.aldric && S.phase === 3) out.push('<p class="dim">Since the witch-finder came, the watch walks this way more often.</p>');
      return out;
    },
    actions() {
      const night = S.phase === 3;
      return [
        { label: 'Pray in the church', hint: 'Be seen to be pious', disabled: night ? 'The doors are barred' : S.prayed ? 'You have prayed today' : false, fn: pray },
        { label: 'Dig', hint: 'Spade from the sexton\'s shed. Only at night.', disabled: night ? false : 'Not in daylight. Not with people watching.', fn: dig },
      ];
    },
  },
  pits: {
    name: 'The Plague Pits',
    desc() {
      return [[
        'Outside the east wall, in what was the lazar-house field. Long trenches, lime spread over them like frost. Crows.',
        'The carts come out with the morning\'s dead. Men with rags tied over their faces tip them in and go back for more.',
        'The lime glows faintly in the dusk. The smell is something you stop noticing, and then notice again, all at once.',
        'Night at the pits. Things move at the edges: dogs, and people who live like dogs. A fire burns where the rag-pickers sleep.',
      ][S.phase], '<p class="dim">The dead here are many and poor and diseased. Nobody counts them.</p>'];
    },
    actions() {
      return [
        { label: 'Take a body', hint: 'Plentiful, but sick. Risk of fever.', fn: pitBody },
        { label: 'Gather bones', hint: 'For bone dust', fn: pitBones },
      ];
    },
  },
  blackwood: {
    name: 'The Blackwood',
    desc() {
      return [[
        'Mist between the trunks. Frost on the bracken. The wood begins half a mile beyond the south gate and does not really end.',
        'Pale winter light between bare oaks. Charcoal-burners used to work here before the cough. Their mounds are cold now.',
        'Shadows pool between the trees. A wolf calls, far off, and is answered.',
        'Black, cold, and utterly silent. Not a place to be at night.',
      ][S.phase]];
    },
    actions() {
      return [
        { label: 'Forage for herbs', hint: S.phase === 3 ? 'Blind, in wolf country' : 'Nightshade, grave-moss', fn: forage },
      ];
    },
  },
  crossroads: {
    name: 'The South Crossroads',
    desc() {
      const c = S.corvin;
      const out = [S.phase === 3
        ? 'The gibbet is a black shape against a blacker sky. The chain creaks. Four roads go away into the dark.'
        : 'Where the Wexmoor road meets the old drove road, the parish gibbet. A cage of iron straps, hung from a beam.'];
      if (c >= 80) out.push('Master Corvin is still recognisably himself. The crows have had his eyes. His mouth is open as if about to correct your spelling.');
      else if (c >= 55) out.push('The crows have been busy. What is in the cage is still a man, but you have to know it was him.');
      else if (c >= 30) out.push('There is less of him every day. Rags, and the shape of a man, and not much more.');
      else out.push('Barely anything left. Bones held together by tendon and tarred cloth. Time is nearly out.');
      return out;
    },
    actions() {
      const known = S.spells.includes('calling');
      let why = false;
      if (!known) why = 'You do not know how. Study.';
      else if (S.phase !== 3) why = 'Only at night, with no one watching';
      else if (!has('candle', 3) || !has('chalk') || !has('salt')) why = 'Needs 3 candles, chalk, grave salt';
      else if (S.will < 5) why = 'Your will is too frayed (need 5)';
      return [
        { label: 'Stand beneath the gibbet a while', fn: mourn },
        { label: 'Perform the Calling Back', hint: '3 candles, chalk, grave salt, 5 will', disabled: why, fn: calling },
      ];
    },
  },
};

const TRAVEL = [
  { id: 'garret', label: 'Home to the garret' },
  { id: 'market', label: 'The market square' },
  { id: 'tavern', label: 'The Drowned Lantern' },
  { id: 'churchyard', label: 'Saint Orrin\'s churchyard' },
  { id: 'pits', label: 'The plague pits, outside the east wall' },
  { id: 'blackwood', label: 'The Blackwood' },
  { id: 'crossroads', label: 'The south crossroads, and the gibbet' },
];

// ---------------------------------------------------------------- hub
function hub(extra) {
  if (checkFatal()) return;
  // show the result of the last action before any scene the night has queued up
  if (extra && extra.filter(Boolean).length && S.queue.length) {
    show(LOCS[S.loc].name, extra, [{ label: 'Go on', fn: () => hub() }]);
    return;
  }
  if (runQueue()) return;
  if (checkFatal()) return;
  save();
  const L = LOCS[S.loc];
  const lines = [];
  if (extra && extra.length) lines.push(...extra, '<hr style="border:0;border-top:1px solid var(--line);margin:1em 0">');
  lines.push(...L.desc());
  if (S.phase === 3) lines.push('<p class="dim">It is night. Whatever you do now will cost you your sleep.</p>');
  const actions = L.actions();
  actions.push({ label: 'Go elsewhere', sep: true, fn: travelMenu });
  show(L.name, lines, actions);
}

function travelMenu() {
  const opts = TRAVEL.filter((t) => t.id !== S.loc).map((t) => {
    const leaving = OUTSIDE.includes(t.id) !== OUTSIDE.includes(S.loc);
    return {
      label: t.label,
      hint: leaving ? (S.phase === 3 ? 'Through the gate — shut at night' : 'Through the gate') : '',
      fn: () => travel(t.id),
    };
  });
  opts.push({ label: 'Stay', sep: true, fn: hub });
  show(LOCS[S.loc].name, ['Where to?'], opts);
}

function travel(id) {
  const leaving = OUTSIDE.includes(id) !== OUTSIDE.includes(S.loc);
  const out = [];
  if (leaving) {
    if (S.phase === 3) {
      out.push('The gates are shut. You go by the drain culvert under the south wall, up to your knees in black water.');
      if (chance(0.3)) { out.push('A watchman on the wall-walk sees a shape in the ditch and shouts. You do not stop.', adj('suspicion', 3)); }
    } else {
      out.push(pick(['The gate-wardens barely look at you.', 'You pass under the gatehouse arch with a carter and his dead.', 'A gate-warden asks your business. You tell him a lie, and he lets you by.']));
    }
    spend(1);
  }
  S.loc = id;
  if (checkFatal()) return;
  // chance of trouble on arrival
  if (id === 'blackwood' && S.phase >= 2 && chance(S.phase === 3 ? 0.55 : 0.25)) return encounter('wolf', out);
  if (id === 'pits' && S.phase === 3 && chance(0.35)) return encounter(pick(['dogs', 'ragpicker']), out);
  hub(out);
}

// ---------------------------------------------------------------- actions: garret
function study() {
  const out = [];
  if (S.phase >= 2) { S.inv.candle -= 1; out.push('You light a candle and hunch over the notes.'); }
  else out.push('You open the shutters for the light and spread the notes on the master\'s table.');
  const gain = rand(7, 11);
  out.push(pick([
    'His handwriting is small and cramped and full of abbreviations he never taught you. You work at it line by line.',
    'A long passage on the humours of a body after death: what goes first, what lasts, which parts remember.',
    'Diagrams of circles within circles, with names written at the edges in a script you are only beginning to read.',
    'Accounts, mostly. Then, in the margin, a sentence that makes the room very cold.',
  ]));
  out.push(adj('knowledge', gain), adj('will', -1));
  const note = NOTES.find((n, i) => i >= S.notesRead && S.knowledge >= n.at);
  if (note) {
    S.notesRead = NOTES.indexOf(note) + 1;
    out.push(`<p class="note">${note.text}</p>`);
  }
  out.push(...learnFromKnowledge());
  spend(1);
  hub(out);
}

function eat() {
  S.inv.bread -= 1; S.fed = true;
  hub(['You eat standing at the window. It is coarse and sour and there is grit in it. It is enough.']);
}

function poultice() {
  S.inv.gravemoss -= 1;
  const out = ['You chew the grave-moss into a paste the way the master showed you and bind it with linen. It stinks. It works.'];
  out.push(adj('hp', 6));
  if (S.sick) { S.sick = 0; out.push('<p class="gain">The fever breaks.</p>'); log('Cured the fever with a poultice.', 'good'); }
  hub(out);
}

function sleep() {
  const out = [];
  if (!S.fed && has('bread')) { S.inv.bread -= 1; S.fed = true; out.push('You eat a little bread first.'); }
  dailyTick(true);
  S.phase = 0;
  S.queue.unshift({ kind: 'morning', notes: [
    pick(['You sleep badly, but you sleep.', 'You dream of the master, writing. He does not look up.', 'You dream of chalk circles. Something on the other side of the line is patient.']),
    'Dawn comes grey over Wexmoor.',
  ].concat(out) });
  hub();
}

function cellar() {
  const lines = ['Down the ladder. The cellar is cold as a well, the walls sweating. The master\'s circle is scored into the flagstones, the chalk long since scrubbed out and redrawn a hundred times.'];
  const choices = [];
  if (!S.corpses.length) lines.push('There is nothing here to work with. You need a body: from the churchyard, the pits, or from someone who will sell one.');
  S.corpses.forEach((c, i) => {
    const freshness = ['fresh', 'still sound', 'softening', 'turning'][Math.min(c.age, 3)];
    lines.push(`A body: ${c.label}. It is ${freshness}.`);
    let why = false;
    if (S.thralls.length >= thrallCap()) why = 'You cannot hold another';
    else if (!has('chalk') || !has('candle')) why = 'Needs chalk and a candle';
    else if (S.will < 3) why = 'Your will is too frayed (need 3)';
    choices.push({ label: `Bind ${c.label.split(',')[0]}`, hint: 'Chalk, candle, 3 will', disabled: why, fn: () => raise(i) });
    choices.push({ label: `Get rid of ${c.label.split(',')[0]}`, hint: 'Take it to the midden in the dark', fn: () => {
      S.corpses.splice(i, 1);
      spend(1);
      const o = ['You haul it up the ladder in sacking and leave it on the midden behind the tannery, where no one looks too closely at anything.'];
      if (chance(0.2)) o.push('A shutter opens across the lane, and closes again.', adj('suspicion', 4));
      S.loc = 'garret';
      hub(o);
    } });
  });
  S.thralls.forEach((t, i) => {
    choices.push({ label: `Mend ${t.name}`, hint: 'Bone dust — restores it', disabled: !has('bonedust') ? 'No bone dust' : t.hp >= t.hpMax ? 'It is whole' : false, fn: () => {
      S.inv.bonedust -= 1;
      t.hp = Math.min(t.hpMax, t.hp + 5);
      cellarMsg([`You rub bone dust into the seams of ${t.name} and say the words. Things that were coming loose draw tight again.`]);
    } });
    choices.push({ label: `Release ${t.name}`, hint: 'Let it lie down', fn: () => {
      S.thralls.splice(i, 1);
      log(`Released ${t.name}.`);
      cellarMsg([`You say the words backwards. ${t.name} sighs, a long sigh, all the air going out of it, and is only a body again. You will need to be rid of it.`],
        () => { S.corpses.push({ label: `what is left of ${t.name}`, quality: 0, age: 3 }); });
    } });
  });
  choices.push({ label: 'Go back up', sep: true, fn: hub });
  show('The Cellar', lines, choices);
}

function cellarMsg(lines, before) {
  if (before) before();
  show('The Cellar', lines, [{ label: 'Go on', fn: cellar }]);
}

const THRALL_NAMES = ['the Carter', 'the Weaver\'s Wife', 'the Drowned Boy', 'the Tanner', 'Old Jory', 'the Soldier', 'the Nameless One', 'the Midwife', 'the Pale Man', 'the Miller\'s Son'];

function raise(i) {
  const c = S.corpses[i];
  S.corpses.splice(i, 1);
  S.inv.chalk -= 1; S.inv.candle -= 1;
  const q = c.quality;
  const base = [[5, [1, 2]], [8, [1, 3]], [11, [2, 4]], [14, [3, 5]]][clamp(q, 0, 3)];
  let name = c.name || pick(THRALL_NAMES.filter((n) => !S.thralls.some((t) => t.name === n)));
  if (!name) name = 'the Other One';
  const t = { name, hp: base[0], hpMax: base[0], atk: base[1], quality: q };
  S.thralls.push(t);
  S.thrallCount += 1;
  log(`Raised ${name}.`, 'bad');
  const out = [
    'You draw the circle fresh. You set the candle at the head. You put your cold hands on its cold chest and you say the words, all of them, in order, without stopping, the way he made you practise.',
    pick([
      'For a long time nothing happens. Then the body draws a breath it does not need, and lets it out, and opens its eyes.',
      'The candle flame leans toward the body, as if in a draught. Then the fingers move, one by one, testing.',
      'It sits up all at once, like a man waking from a nightmare. But it does not look afraid. It does not look anything.',
    ]),
    `You call it ${name}. It does not object.`,
  ];
  if (q <= 1) out.push('<p class="dim">The cough had it in life. It is a poor, weak thing.</p>');
  out.push(adj('will', -3), adj('corruption', 8));
  if (S.thralls.length === 1 && S.thrallCount === 1) out.push('<p class="dim">Thralls fight beside you, but each one rots a little every day, and the neighbours notice the smell.</p>');
  spend(1);
  S.loc = 'garret';
  hub(out);
}

// ---------------------------------------------------------------- actions: market
function buy(item, price) {
  S.coin -= price;
  S.inv[item] += 1;
  const out = [`You count out ${price} ${price === 1 ? 'penny' : 'pennies'}.`, `<p class="gain">+1 ${ITEMS[item].name.toLowerCase()}</p>`];
  if (S.aldric && (item === 'chalk' || item === 'salt') && chance(0.35)) {
    out.push('The soldier by the well watches you tuck it into your satchel.', adj('suspicion', 2));
  }
  hub(out);
}

function sellHerbs() {
  const n = S.inv.nightshade, g = S.inv.gravemoss;
  const total = n * 2 + g * 3;
  S.inv.nightshade = 0; S.inv.gravemoss = 0;
  S.coin += total;
  hub([`The apothecary sniffs at your bundles, weighs them, and gives you ${total} pennies without a word.`,
    `<p class="gain">+${total} pennies</p>`]);
}

function scribeWork() {
  const pay = rand(3, 5);
  const out = [pick([
    'You set up at the corner of the guildhall with your board and ink. A widow wants a letter to her son in the army, if he is still alive. A farmer needs a bill of sale for a cow. A man dictates a will, coughing, and asks you to hurry.',
    'Wills, mostly. Everyone wants a will this winter. You write the same words over and over: <em>being of sound mind, and knowing not the hour.</em>',
    'A merchant needs his accounts copied fair. It is dull and your fingers ache with cold, and it is the most normal you have felt in weeks.',
  ])];
  S.coin += pay;
  out.push(`<p class="gain">+${pay} pennies</p>`, adj('suspicion', -2));
  if (chance(0.2)) {
    S.freshGrave = S.day;
    out.push('One of the wills you wrote last week has already been needed. The man is being buried at Saint Orrin\'s today.');
  }
  spend(1);
  hub(out);
}

function passage() {
  show('Market Square', [
    'A salt carter from the coast, eating an onion like an apple, tells you he leaves at first light for the south and takes paying passengers. Twenty pennies. No questions.',
    'You could go. Leave the notes, or take them. Leave the master on his gibbet. Start again somewhere no one knows you.',
  ], [
    { label: 'Pay and leave Wexmoor', hint: '20 pennies', disabled: S.coin < 20 ? 'You have not enough' : false, fn: () => ending('The Road South', [
      'You ride out on a cart of salt under a grey sky. You do not look back at the crossroads, and then at the last moment you do, but it is too far to see anything.',
      S.knowledge >= 30
        ? 'In a coastal town where no one knows you, you write letters for sailors. The notes are sewn into the lining of your coat. You have not opened them in a year. You tell yourself that this is a choice, renewed each day.'
        : 'In a coastal town where no one knows you, you write letters for sailors. You burned the notes at the first inn on the road. Sometimes your hands are cold for no reason. Sometimes it is only winter.',
    ]) },
    { label: 'Not yet', fn: hub },
  ]);
}

// ---------------------------------------------------------------- actions: tavern
function meal() {
  S.coin -= 2;
  const out = ['Pottage with something that may once have been mutton in it, and a heel of bread to wipe the bowl. Heat spreads out from your belly to your hands.'];
  if (!S.fed) S.fed = true;
  out.push(adj('hp', 4));
  hub(out);
}

function drink() {
  S.coin -= 1;
  hub(['Sour ale in a leather jack. You drink it slowly, your back to the wall, and for a little while the world is further away.', adj('will', 2)]);
}

function rumours() {
  const pool = [
    'A carter, to his friend: "They say Corvin\'s apprentice still lives on Tallow Lane. Odd, that. Never married. Keeps strange hours."',
    'A woman: "The sexton swears graves are being disturbed. He\'s put a man on watch, nights."',
    '"The Blackwood\'s full of wolves this winter. Came right up to the south gate Tuesday. Don\'t go out there after dusk, not for anything."',
    '"Plague pits are the only place in Wexmoor with plenty. Rag-pickers out there would knife you for your shoes."',
    '"Hesk? He\'ll sell you anything that\'s been in the ground, if you can stand his company. Buy him a drink first. He likes to be courted."',
    '"Old Corvin. Still up on the crossroads, the crows having their fill. The parish says they\'ll cut him down when there\'s nothing left worth looking at."',
  ];
  if (S.aldric) {
    pool.push('"The witch-finder asks about everyone. Who prays. Who doesn\'t. Who buys chalk. Who keeps a cellar."');
    pool.push('"Brother Aldric isn\'t cruel, they say. Doesn\'t need to be. He just doesn\'t stop."');
  } else {
    pool.push('"They\'ve sent to the bishop for a witch-finder. Holy Office man. Should be here inside the week."');
  }
  if (S.suspicion >= 50) pool.push('Two men at the next table stop talking when you sit down. One of them makes the sign against the evil eye under the table, where he thinks you cannot see.');
  if (S.thralls.length) pool.push('"Something stinks on Tallow Lane. Like a dead dog under a floor. The chandler says it\'s not his fat."');
  const first = pick(pool);
  const second = pick(pool.filter((x) => x !== first));
  spend(1);
  hub(['You nurse nothing at a corner table and keep your ears open.', first, second]);
}

function hesk() {
  const lines = [];
  const choices = [];
  if (S.hesk === 0) {
    lines.push('Hesk looks at you sideways when you sit. He is a small, square man, older than he looks, with earth under every nail that will never come out.');
    lines.push('<p class="speech">"Scribe. Your master owed me a shilling. Don\'t suppose you\'re here to pay it."</p>');
  } else if (S.hesk === 1) {
    lines.push('<p class="speech">"Scribe again." He shifts along the bench to make room. "You\'re a glutton for poor company."</p>');
  } else {
    lines.push('<p class="speech">"Scribe." A nod. Something that is almost a smile. "Business, or the pleasure of my conversation?"</p>');
  }
  choices.push({ label: 'Buy him a drink', hint: '1 penny', disabled: S.coin < 1 ? 'Not enough coin' : false, fn: () => {
    S.coin -= 1;
    S.hesk = Math.min(S.hesk + 1, 3);
    const t = [
      'He accepts it without thanks and drinks half in one swallow.',
      S.hesk === 1 ? '<p class="speech">"Corvin used to buy me drinks. Used to ask me which graves were fresh. I never asked why. You learn not to, in my trade."</p>'
        : '<p class="speech">"There\'s a surgeon in Hallam pays four shillings for a good one. I\'d sell to you for less. Scribe\'s rate. Eight pennies, and I bring it to your door, and I never knew you."</p>',
    ];
    if (S.hesk >= 2) t.push('<p class="dim">Hesk will now sell you a body.</p>');
    spend(1);
    hub(t);
  } });
  if (S.hesk >= 2) {
    let why = false;
    if (S.coin < 8) why = 'Not enough coin';
    else if (S.heskDelivery) why = 'One is already coming';
    else if (S.suspicion >= 70) why = 'He will not risk it now';
    choices.push({ label: 'Buy a body', hint: '8 pennies — delivered by dawn', disabled: why, fn: () => {
      S.coin -= 8; S.heskDelivery = true;
      log('Paid Hesk for a body.');
      hub(['<p class="speech">"Cellar door. Before light. Leave it unbarred and don\'t come down till you hear the cart go."</p>', adj('suspicion', 3)]);
    } });
    choices.push({ label: 'Ask about fresh graves', fn: () => {
      const fresh = S.freshGrave && S.day - S.freshGrave <= 2;
      if (!fresh && chance(0.5)) S.freshGrave = S.day;
      const nowFresh = S.freshGrave && S.day - S.freshGrave <= 2;
      hub([nowFresh
        ? '<p class="speech">"Put one in by the chancel wall today. Wool merchant\'s boy. Fever, not the cough. Clean." He looks into his cup. "I didn\'t tell you that."</p>'
        : '<p class="speech">"Nothing worth the digging. Everything\'s going to the pits now. Ask me in a day or two."</p>']);
    } });
  }
  if (S.suspicion >= 70) lines.push('<p class="speech">"Keep your voice down. That holy man\'s been asking me about Corvin\'s friends. I said he didn\'t have any. Don\'t make me a liar."</p>');
  choices.push({ label: 'Leave him to his pipe', sep: true, fn: hub });
  show('The Drowned Lantern', lines, choices);
}

// ---------------------------------------------------------------- actions: churchyard
function pray() {
  S.prayed = true;
  const out = [pick([
    'You kneel at the back of the nave among the coughing poor. The priest\'s Latin is slurred and quick. You make the responses in the right places.',
    'The church is cold and smells of tallow and damp stone. Above the altar, the saints in the window look down at you, and you look down at the floor.',
  ])];
  if (S.corruption >= 40) out.push('When you dip your fingers in the holy water stoup, it is so cold it burns. You keep your face still.');
  if (S.aldric && chance(0.4)) out.push('Brother Aldric is at prayer near the front. When he rises, he sees you, and nods, approving.');
  out.push(adj('suspicion', -4), adj('will', 1));
  spend(1);
  hub(out);
}

function dig() {
  const fresh = S.freshGrave && S.day - S.freshGrave <= 2;
  const risk = (S.aldric ? 0.4 : 0.25) + (S.suspicion >= 50 ? 0.1 : 0);
  spend(1);
  if (chance(risk)) {
    return digTrouble(fresh);
  }
  digResult(fresh, []);
}

function digResult(fresh, pre) {
  const out = [...pre];
  out.push('You take the spade from the sexton\'s shed and work by touch, the soil heavy and cold, stopping each time a dog barks.');
  if (fresh) {
    S.freshGrave = 0;
    S.corpses.push({ label: 'the wool merchant\'s son, a day dead', quality: 3, age: 0 });
    out.push('The fresh grave gives easily. The coffin lid is pine, cheap for all the bell-ringing. Inside, a young man in his good shirt, hardly marked, as if asleep.');
    out.push('You carry him home over your shoulders through the back lanes. He is heavier than any living person you have ever held.');
    out.push('<p class="gain">A fresh body lies in your cellar.</p>');
    log('Took a fresh body from Saint Orrin\'s.', '');
  } else if (chance(0.5)) {
    S.corpses.push({ label: 'a woman from an older grave', quality: 1, age: 1 });
    out.push('An older grave, from before the frosts. What you find is not what she was, but it will hold together, for now.');
    out.push('<p class="gain">A poor body lies in your cellar.</p>');
  } else {
    const d = rand(1, 2);
    out.push('Three hours of digging and you find only old bones, the coffin long since rotted to black crumbs. You take what you can grind.', give('bonedust', d));
  }
  out.push(adj('will', -1));
  if (S.corruption < 20) out.push('<p class="dim">Your hands shake for a long time afterwards.</p>');
  S.loc = 'garret';
  hub(out);
}

function digTrouble(fresh) {
  if (chance(0.4)) {
    return encounter('robber', [], () => digResult(fresh, ['The other digger lies still in the wet grass. You leave him for the sexton to find.']));
  }
  show('Saint Orrin\'s Churchyard', [
    'A lantern comes round the corner of the church. A voice: <span class="speech">"Who\'s that? Who\'s there?"</span>',
    'The night watchman. He has not seen your face. Not yet.',
  ], [
    { label: 'Run', hint: 'Leave the spade', fn: () => {
      if (chance(0.65)) {
        S.loc = 'garret';
        hub(['You run, crouched, between the stones, over the fallen wall, through a yard of hissing geese, and home. You lie on the floor of the garret until your heart slows.', adj('suspicion', 5)]);
      } else {
        encounter('watchman', ['He is faster than he looks. A hand closes on your collar.'], null, true);
      }
    } },
    { label: 'Bribe him', hint: '4 pennies', disabled: S.coin < 4 ? 'Not enough coin' : false, fn: () => {
      S.coin -= 4;
      if (chance(0.75)) {
        digResult(fresh, ['<span class="speech">"Didn\'t see nothing,"</span> he says, weighing the coins, and walks away whistling. You finish your work with your heart in your mouth.', adj('suspicion', 2)]);
      } else {
        hub(['He takes the money. Then he looks at the open grave, and at you, and he walks away very fast toward the cooper\'s, where the witch-finder lodges.', adj('suspicion', 18)]);
      }
    } },
    { label: 'Wait for him to come close', hint: 'Fight', fn: () => encounter('watchman', [], null, true) },
  ]);
}

// ---------------------------------------------------------------- actions: pits / wood / crossroads
function pitBody() {
  const phase = S.phase;
  spend(1);
  const out = ['You pick the freshest you can find near the top of the newest trench, wrap it in sacking from a pile meant for this, and no one stops you. No one cares.'];
  S.corpses.push({ label: 'a pit corpse, grey with the cough', quality: 1, age: 1 });
  out.push('<p class="gain">A sick body lies in your cellar.</p>');
  if (!S.sick && chance(0.3)) { S.sick = 1; out.push('That evening you start to cough, and then to shiver.', '<p class="loss">You have taken the fever.</p>'); log('Caught the fever at the pits.', 'bad'); }
  out.push('You carry it back to town under a load of firewood, and it is two hours before your arms stop aching.');
  S.loc = 'garret';
  if (phase === 3 && chance(0.3)) return encounter(pick(['dogs', 'ragpicker']), ['Before you have gone twenty yards, something comes out of the dark.'], () => hub(out));
  hub(out);
}

function pitBones() {
  const phase = S.phase;
  spend(1);
  const d = rand(1, 3);
  const out = ['At the old end of the pits, where the lime has done its work, bones lie half exposed. You fill a sack. Later, in the garret, you grind them with the master\'s pestle.', give('bonedust', d)];
  if (chance(0.15) && !S.sick) { S.sick = 1; out.push('<p class="loss">You have taken the fever.</p>'); log('Caught the fever at the pits.', 'bad'); }
  if (phase === 3 && chance(0.25)) return encounter(pick(['dogs', 'ragpicker']), [], () => hub(out));
  hub(out);
}

function forage() {
  const phase = S.phase;
  spend(1);
  const out = [];
  const n = rand(0, 2), g = rand(0, 2);
  if (n + g === 0) out.push('Hours of searching under frost-black bracken. Nothing.');
  else {
    out.push('You find what grows in winter, in the dark places: purple-black berries on dead stems, grey moss on the north faces of old stones.');
    if (n) out.push(give('nightshade', n));
    if (g) out.push(give('gravemoss', g));
  }
  if (phase >= 2 && chance(phase === 3 ? 0.5 : 0.3)) return encounter('wolf', [], () => hub(out));
  hub(out);
}

function mourn() {
  const out = [];
  if (S.corvin >= 55) out.push('You stand under the gibbet and look up at him. You want to say something, and cannot think what. In life he would have told you to stop gawping and go and do something useful.');
  else out.push('You stand under the gibbet. There is no face left to look at. The chain creaks. A crow regards you from the crossbeam with polite interest.');
  out.push(adj('will', S.corruption >= 50 ? 1 : -1));
  if (S.aldric && S.phase < 3 && chance(0.3)) out.push('A soldier on the road watches you for a long time.', adj('suspicion', 4));
  spend(1);
  hub(out);
}

// ---------------------------------------------------------------- the calling back
function calling() {
  S.inv.candle -= 3; S.inv.chalk -= 1; S.inv.salt -= 1;
  const lines = [
    'You climb the gibbet post in the dark, slip the cage pin with numb fingers, and lower what is left of him to the frozen road. It weighs almost nothing.',
    'Chalk on the frozen mud where the four roads meet. Salt in a line across each road, so that nothing comes down them uninvited. Three candles, sheltered in your coat, then set out at the points of a triangle. You have read the words so many times you no longer need the page.',
    'You say them. The candles go flat and blue. The wind stops. On every road, as far as you can see, the dark grows thicker, and leans in.',
  ];
  lines.push(adj('will', -4), adj('corruption', 20));
  log('Performed the Calling Back.', 'bad');
  show('The South Crossroads', lines, [{ label: 'Go on', fn: callingResult }]);
}

function callingResult() {
  if (checkFatal()) return;
  const c = S.corvin;
  const lines = [];
  if (c >= 60) {
    lines.push('He breathes in. It is a terrible sound, a dry sound, a sound like pages tearing.');
    lines.push('<p class="speech">"Ah," says Master Corvin, from his ruined mouth. "You read to the end, then. I wondered." A pause. "You took your time."</p>');
  } else if (c >= 30) {
    lines.push('Something stirs in the rags. A jaw works. The voice comes from a long way down.');
    lines.push('<p class="speech">"...cold. Cold. Is that... the boy? The girl? I cannot... ah. It is you. You waited too long. There is so little of me."</p>');
  } else {
    lines.push('What is left of him moves. It makes a sound. It is not words. It goes on making the sound, and you understand, slowly, that he is aware, and that there is not enough of him left to do anything with that awareness except this.');
  }
  const hunted = S.aldric && S.suspicion >= 35;
  if (hunted) {
    lines.push('And then, on the town road, torches.');
    show('The South Crossroads', lines, [{ label: 'Turn to face them', fn: finalFight }]);
  } else {
    show('The South Crossroads', lines, [{ label: 'Go on', fn: finalChoice }]);
  }
}

function finalFight() {
  const lines = [
    'Brother Aldric comes up the road with two soldiers behind him, their torches throwing long shadows across the salt lines. He looks at the circle, and the candles, and the thing on the ground that was your master. His face does not change.',
    '<p class="speech">"I have been following you for days," he says. "I hoped I was wrong. I am almost never wrong. Child, step out of the circle. It is not too late for your soul."</p>',
  ];
  show('The South Crossroads', lines, [
    { label: 'Fight', fn: () => {
      // the master joins the fight, as well as he is able
      const c = S.corvin;
      if (c >= 30) S.thralls.push({ name: 'Master Corvin', hp: Math.round(c / 6), hpMax: Math.round(c / 6), atk: c >= 60 ? [3, 6] : [2, 4], temp: true });
      combat(['soldier', 'aldric'], {
        canFlee: false,
        intro: c >= 30 ? 'Behind you, the dead man rises on legs that should not hold him.' : 'You are alone in the circle with the screaming thing.',
        onWin: () => {
          S.thralls = S.thralls.filter((t) => !t.temp);
          show('The South Crossroads', [
            'Brother Aldric lies across the salt line, his reliquary spilled open beside him, little finger-bones scattered on the road like dice.',
            'He was right. He was almost never wrong. You find that it does not make you feel anything at all, and that frightens you more than he ever did.',
          ], [{ label: 'Turn back to the master', fn: finalChoice }]);
        },
      });
    } },
    { label: 'Step out of the circle', hint: 'Surrender', fn: () => ending('The Penitent', [
      'You step over the chalk. The candles go out behind you all at once, and what was rising in the circle falls back with a dry clatter and is still.',
      'Brother Aldric takes your hands in his, quite gently. He does not burn you. He is, he explains on the long road to the bishop\'s court, far more interested in what you know. You will spend the rest of a long life in a monastery cell, writing it all down for the Holy Office, so that they may better find the others.',
      'You are allowed candles. As many as you like.',
    ]) },
  ]);
}

function finalChoice() {
  const c = S.corvin;
  const lines = [];
  if (c >= 30) {
    lines.push('<p class="speech">"Well?" says the master. "You did not drag me back for the pleasure of my company. Ask what you came to ask. The salt will not hold forever."</p>');
  } else {
    lines.push('He cannot speak. He can only suffer. But the binding holds, and he is yours to do with as you will.');
  }
  const choices = [];
  if (c >= 30) {
    choices.push({ label: 'Ask him to teach you everything', fn: () => ending('The Apprentice', [
      'He talks until the candles are stubs. You do not write anything down. You will not need to. Some of what he tells you goes into you like cold water and stays there, and you feel the parts of yourself that cannot hold it simply go.',
      'Toward dawn he says, <span class="speech">"That is all of it. That is everything. Now let me go."</span> And you do.',
      `You walk back into Wexmoor in the grey light knowing what he knew. ${S.corruption >= 60 ? 'It is a long time before you notice that you have stopped feeling the cold at all.' : 'The witch-finders will come again. Let them. You know where the dead lie now, and how to ask them to stand.'}`,
    ]) });
  }
  choices.push({ label: 'Let him go', hint: 'Give him the rest they denied him', fn: () => ending('The Last Kindness', [
    c >= 30 ? '<p class="speech">"Sentiment,"</p> he says, but there is no anger in it. <span class="speech">"Thank you."</span>' : 'You say the words backwards, slowly, so as not to hurt him.',
    'You bury him yourself, at the crossroads, in the frozen ground, with your bare hands and a gibbet bar for a spade. It takes until dawn. You put the notes in with him.',
    'Then you walk into the town, and back to Tallow Lane, and for the first time since he died, you sleep without dreaming.',
  ]) });
  if (S.corruption >= 70) {
    choices.push({ label: 'Bind him to you forever', hint: 'He belongs to you now', fn: () => ending('Master of the Gibbet', [
      'You tighten the binding. You feel him understand what you are doing, and you feel him try to say no, and you do not let him.',
      'He serves you for a very long time. He teaches you whatever you ask. He never speaks of anything else. In the cellars of the towns you move between, he stands facing the wall in the dark, waiting, and you tell yourself he is grateful.',
      'You became the thing he warned you against. He knew you would. It was, in the end, his last lesson.',
    ]) });
  }
  show('The South Crossroads', lines, choices);
}

// ---------------------------------------------------------------- encounters & combat
function encounter(key, pre = [], onWin, isWatch) {
  const e = ENEMIES[key];
  combat([key], {
    canFlee: true,
    intro: [...pre, e.flavour].join(' '),
    onWin: () => {
      const out = [];
      if (key === 'watchman') {
        out.push('The watchman lies still. Someone will find him in the morning, and someone will ask questions.', adj('suspicion', 14));
        log('Killed a watchman.', 'bad');
      }
      if (onWin) { if (out.length) S.queue.unshift({ kind: 'morning', notes: out }); onWin(); return; }
      if (isWatch) S.loc = 'garret';
      hub(out);
    },
    onFlee: () => {
      const out = ['You run, and keep running, and do not stop until there are walls around you.'];
      if (isWatch) out.push(adj('suspicion', 8));
      S.loc = 'garret';
      hub(out);
    },
  });
}

let C = null; // live combat state, never saved

function combat(keys, opts) {
  C = {
    foes: keys.map((k) => ({ ...ENEMIES[k], key: k, hpMax: ENEMIES[k].hp })),
    turn: 0,
    opts,
  };
  sfx('toll');
  combatScreen([opts.intro || 'You are attacked.']);
}

function combatScreen(lines) {
  const foes = `<div class="combatants">${C.foes.map((f) => `<div class="foe ${f.hp <= 0 ? 'dead' : ''}"><span class="name">${f.name}</span>` +
    `<div class="bar hp"><i style="width:${clamp(f.hp / f.hpMax * 100, 0, 100)}%"></i></div></div>`).join('')}</div>`;
  const allLines = [foes, ...lines];
  const spellBonus = Math.floor(S.corruption / 25);
  const choices = [
    { label: 'Strike with your knife', hint: '2–4 damage', fn: () => playerAct('knife') },
  ];
  if (S.spells.includes('chill')) choices.push({ label: 'Grave Chill', hint: `2 will — ${4 + spellBonus}–${7 + spellBonus} damage`, disabled: S.will < 2 ? 'Not enough will' : false, fn: () => playerAct('chill') });
  if (S.spells.includes('wither')) choices.push({ label: 'Wither', hint: `3 will — ${3 + spellBonus}–${6 + spellBonus}, heals you`, disabled: S.will < 3 ? 'Not enough will' : false, fn: () => playerAct('wither') });
  if (has('gravemoss')) choices.push({ label: 'Press grave-moss to your wounds', hint: '+6 health', fn: () => playerAct('moss') });
  if (C.opts.canFlee) choices.push({ label: 'Run', hint: S.thralls.length ? 'Your dead may cover you' : 'Even odds', sep: true, fn: () => playerAct('flee') });
  show('Violence', allLines, choices);
}

function liveFoes() { return C.foes.filter((f) => f.hp > 0); }

function playerAct(act) {
  const out = [];
  const target = liveFoes()[0];
  const bonus = Math.floor(S.corruption / 25);
  if (act === 'knife') {
    if (chance(0.8)) { const d = rand(2, 4); target.hp -= d; out.push(`You get your knife into ${target.name.toLowerCase()}. (${d})`); }
    else out.push('You slash and miss. Your arm is weak with cold and fear.');
  } else if (act === 'chill') {
    S.will -= 2; S.corruption = clamp(S.corruption + 2, 0, 100);
    const d = rand(4, 7) + bonus; target.hp -= d;
    out.push(`You put your palm flat against ${target.name.toLowerCase()} and give them the cold of the grave. Frost blooms on skin. (${d})`);
  } else if (act === 'wither') {
    S.will -= 3; S.corruption = clamp(S.corruption + 4, 0, 100);
    const d = rand(3, 6) + bonus; target.hp -= d;
    S.hp = clamp(S.hp + d, 0, S.hpMax);
    out.push(`You take hold and pull. Something goes out of ${target.name.toLowerCase()} and into you, warm and wrong. (${d}, healed ${d})`);
  } else if (act === 'moss') {
    S.inv.gravemoss -= 1; S.hp = clamp(S.hp + 6, 0, S.hpMax);
    out.push('You slap the moss into the worst of it and bind it with your free hand.');
  } else if (act === 'flee') {
    const p = S.thralls.length ? 0.7 : 0.5;
    if (chance(p)) {
      if (S.thralls.length && chance(0.5)) {
        const t = S.thralls[0];
        t.hp -= 3;
        if (t.hp <= 0) { S.thralls.shift(); log(`${t.name} was torn apart covering your escape.`, 'bad'); }
      }
      const f = C.opts.onFlee; C = null;
      if (f) f(); else hub(['You get away.']);
      return;
    }
    out.push('You turn to run and they are on you.');
  }
  if (target.hp <= 0) out.push(`<p class="gain">${target.name} goes down.</p>`);

  // your dead
  S.thralls.forEach((t) => {
    const f = liveFoes()[0];
    if (!f || t.hp <= 0) return;
    if (chance(0.75)) { const d = rand(t.atk[0], t.atk[1]); f.hp -= d; out.push(`${t.name} reaches for ${f.name.toLowerCase()} with dead hands. (${d})`); if (f.hp <= 0) out.push(`<p class="gain">${f.name} goes down.</p>`); }
    else out.push(`${t.name} lurches and misses.`);
  });

  if (!liveFoes().length) {
    const coin = C.foes.reduce((a, f) => a + rand(f.coin[0], f.coin[1]), 0);
    if (coin) S.coin += coin;
    const w = C.opts.onWin; C = null;
    sfx('toll');
    if (coin) log(`Took ${coin} pennies from the dead.`);
    if (w) w(); else hub(['It is over.']);
    return;
  }

  // their turn
  C.turn += 1;
  liveFoes().forEach((f) => {
    if (f.boss && C.turn % 3 === 0) {
      out.push(`<p class="loss">Brother Aldric raises the reliquary and speaks the Litany of Saint Orrin. The words go into you like nails.</p>`);
      S.will = clamp(S.will - 2, 0, S.willMax);
      S.thralls.forEach((t) => { t.hp -= 3; });
      return;
    }
    const thrallsUp = S.thralls.filter((t) => t.hp > 0);
    if (thrallsUp.length && chance(0.45)) {
      const t = pick(thrallsUp);
      if (chance(f.hit)) { const d = rand(f.atk[0], f.atk[1]) + (f.boss ? 2 : 0); t.hp -= d; out.push(`${f.name} hacks at ${t.name}. (${d})`); }
      else out.push(`${f.name} swings at ${t.name} and misses.`);
    } else if (chance(f.hit)) {
      const d = rand(f.atk[0], f.atk[1]); S.hp = clamp(S.hp - d, 0, S.hpMax);
      out.push(`<span class="loss">${f.name} hurts you. (${d})</span>`);
    } else out.push(`${f.name} comes at you, and you twist away.`);
  });
  const lost = S.thralls.filter((t) => t.hp <= 0);
  lost.forEach((t) => { out.push(`<p class="loss">${t.name} comes apart and does not get up.</p>`); log(`${t.name} was destroyed.`, 'bad'); });
  S.thralls = S.thralls.filter((t) => t.hp > 0);

  if (S.hp <= 0) {
    const l = C.opts.onLose; C = null;
    if (l) l(); else endDeath();
    return;
  }
  if (S.will <= 0) { C = null; endMadness(); return; }
  combatScreen(out.map((x) => (x.startsWith('<') ? x : `<p>${x}</p>`)));
}

// ---------------------------------------------------------------- ambient sound (WebAudio, generated)
let audio = null;
function startAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx();
  const master = ctx.createGain(); master.gain.value = 0.0; master.connect(ctx.destination);
  // wind: brown noise through a wandering bandpass
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
  const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400; bp.Q.value = 0.8;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 250;
  lfo.connect(lfoGain); lfoGain.connect(bp.frequency);
  const windGain = ctx.createGain(); windGain.gain.value = 0.5;
  noise.connect(bp); bp.connect(windGain); windGain.connect(master);
  // low drone
  const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 55;
  const drone2 = ctx.createOscillator(); drone2.type = 'sine'; drone2.frequency.value = 82.4;
  const dg = ctx.createGain(); dg.gain.value = 0.05;
  drone.connect(dg); drone2.connect(dg); dg.connect(master);
  noise.start(); lfo.start(); drone.start(); drone2.start();
  master.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);
  return { ctx, master };
}
function sfx(kind) {
  if (!audio) return;
  const { ctx, master } = audio;
  const t = ctx.currentTime;
  if (kind === 'toll') {
    [110, 220.5, 331].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25 / (i + 1), t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 4.1);
    });
  } else if (kind === 'step') {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 70;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
  }
}
$('#btn-sound').addEventListener('click', (e) => {
  if (!audio) { audio = startAudio(); e.target.textContent = 'Sound: on'; return; }
  if (audio.ctx.state === 'running') { audio.ctx.suspend(); e.target.textContent = 'Sound: off'; }
  else { audio.ctx.resume(); e.target.textContent = 'Sound: on'; }
});
$('#btn-restart').addEventListener('click', () => {
  if (!S || S.over) return;
  if (confirm('Abandon this life and begin again?')) { clearSave(); S = newState(); intro(); }
});

// ---------------------------------------------------------------- title
function title() {
  const saved = loadSave();
  S = newState();
  document.body.classList.add('title-screen');
  const choices = [];
  if (saved && !saved.over) {
    choices.push({ label: `Continue — the ${ORDINAL[saved.day] || saved.day + 'th'} day`, fn: () => { S = saved; document.body.classList.remove('title-screen'); hub(); } });
  }
  choices.push({ label: 'Begin', fn: () => { clearSave(); S = newState(); document.body.classList.remove('title-screen'); intro(); } });
  show('', [
    '<h2 class="ending-title">The Gibbet Apprentice</h2>',
    'A grim tale of the plague winter, in which you are a scrivener\'s apprentice, your master is three days hanged, and what he taught you in the cellar is a crime.',
    '<p class="dim">Choose with the mouse or the number keys. Your progress is kept between visits. Sound is off until you turn it on.</p>',
  ], choices);
}

// Expose a tiny hook for automated testing.
window.__game = { get state() { return S; }, get combat() { return C; } };

title();
})();
