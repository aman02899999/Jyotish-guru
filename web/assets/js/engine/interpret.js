/**
 * interpret.js — turns computed chart geometry into readable Jyotisha guidance.
 *
 * Every sentence produced here is keyed to a real computed placement
 * (sign, house, nakshatra, dignity, dasha or transit). Nothing is random and
 * nothing is pre-written for a fictional chart — change the birth data and
 * the text changes with it.
 */

import { SIGNS, NAKSHATRAS, GRAHAS, formatSignPos, norm360 } from './ephemeris.js';

/* ------------------------------------------------------------------ *
 * Karakatva — significations
 * ------------------------------------------------------------------ */

export const GRAHA_INFO = {
  Sun: {
    karaka: 'Soul, father, authority, vitality, government',
    positive: 'confident leadership, clarity of purpose, strong constitution',
    negative: 'ego friction with authority, restlessness, strain on the heart or eyes',
    deity: 'Surya', gem: 'Ruby', metal: 'Gold', day: 'Sunday',
    mantra: 'Om Hraam Hreem Hraum Sah Suryaya Namah',
    direction: 'East',
  },
  Moon: {
    karaka: 'Mind, mother, emotions, memory, the public',
    positive: 'emotional intelligence, imagination, nurturing instinct',
    negative: 'mood swings, over-attachment, disturbed sleep',
    deity: 'Chandra', gem: 'Pearl', metal: 'Silver', day: 'Monday',
    mantra: 'Om Shraam Shreem Shraum Sah Chandraya Namah',
    direction: 'North-West',
  },
  Mars: {
    karaka: 'Courage, siblings, land, energy, competition',
    positive: 'decisive action, technical skill, physical stamina',
    negative: 'anger, impatience, accidents, disputes over property',
    deity: 'Mangala', gem: 'Red Coral', metal: 'Copper', day: 'Tuesday',
    mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah',
    direction: 'South',
  },
  Mercury: {
    karaka: 'Intellect, speech, commerce, analysis, friends',
    positive: 'quick learning, negotiation, writing and coding ability',
    negative: 'nervous overthinking, scattered focus, contractual slips',
    deity: 'Budha', gem: 'Emerald', metal: 'Bronze', day: 'Wednesday',
    mantra: 'Om Braam Breem Braum Sah Budhaya Namah',
    direction: 'North',
  },
  Jupiter: {
    karaka: 'Wisdom, teachers, children, wealth, dharma',
    positive: 'expansion, good counsel, optimism, protection',
    negative: 'over-promising, excess, complacency, weight gain',
    deity: 'Brihaspati', gem: 'Yellow Sapphire', metal: 'Gold', day: 'Thursday',
    mantra: 'Om Graam Greem Graum Sah Gurave Namah',
    direction: 'North-East',
  },
  Venus: {
    karaka: 'Love, spouse, art, luxury, vehicles',
    positive: 'charm, aesthetic talent, harmonious relationships, comfort',
    negative: 'indulgence, indecision in love, overspending',
    deity: 'Shukra', gem: 'Diamond', metal: 'Silver', day: 'Friday',
    mantra: 'Om Draam Dreem Draum Sah Shukraya Namah',
    direction: 'South-East',
  },
  Saturn: {
    karaka: 'Discipline, longevity, labour, karma, servants',
    positive: 'endurance, structure, mastery earned slowly, integrity',
    negative: 'delay, isolation, chronic fatigue, pessimism',
    deity: 'Shani', gem: 'Blue Sapphire', metal: 'Iron', day: 'Saturday',
    mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah',
    direction: 'West',
  },
  Rahu: {
    karaka: 'Ambition, foreign lands, technology, obsession',
    positive: 'unconventional success, innovation, sudden rise',
    negative: 'illusion, addiction, shortcuts that backfire',
    deity: 'Rahu', gem: 'Hessonite', metal: 'Lead', day: 'Saturday',
    mantra: 'Om Bhraam Bhreem Bhraum Sah Rahave Namah',
    direction: 'South-West',
  },
  Ketu: {
    karaka: 'Detachment, moksha, past-life skill, research',
    positive: 'intuition, spiritual depth, mastery without effort',
    negative: 'confusion, disinterest, sudden separations',
    deity: 'Ketu', gem: "Cat's Eye", metal: 'Mixed', day: 'Tuesday',
    mantra: 'Om Sraam Sreem Sraum Sah Ketave Namah',
    direction: 'North-West',
  },
};

export const HOUSE_INFO = [
  { n: 1, sa: 'Tanu', name: 'Self & Body', themes: 'personality, health, appearance, life direction' },
  { n: 2, sa: 'Dhana', name: 'Wealth & Speech', themes: 'savings, family, food, voice' },
  { n: 3, sa: 'Sahaja', name: 'Courage & Siblings', themes: 'initiative, communication, short travel, skills' },
  { n: 4, sa: 'Sukha', name: 'Home & Happiness', themes: 'mother, property, vehicles, inner peace' },
  { n: 5, sa: 'Putra', name: 'Intellect & Children', themes: 'creativity, romance, speculation, mantra' },
  { n: 6, sa: 'Ripu', name: 'Service & Obstacles', themes: 'competition, debts, health, daily work' },
  { n: 7, sa: 'Kalatra', name: 'Partnership', themes: 'marriage, business partners, contracts' },
  { n: 8, sa: 'Ayur', name: 'Transformation', themes: 'longevity, inheritance, occult, sudden change' },
  { n: 9, sa: 'Dharma', name: 'Fortune & Belief', themes: 'father, guru, long travel, higher learning' },
  { n: 10, sa: 'Karma', name: 'Career & Status', themes: 'profession, reputation, authority' },
  { n: 11, sa: 'Labha', name: 'Gains & Network', themes: 'income, elder siblings, aspirations, community' },
  { n: 12, sa: 'Vyaya', name: 'Release & Foreign', themes: 'expenses, foreign lands, sleep, liberation' },
];

/** Nakshatra character sketches, used for the Moon and lagna readings. */
const NAK_TRAITS = {
  Ashwini: 'swift, healing, pioneering; you start things others only talk about',
  Bharani: 'intense, disciplined, transformative; you carry burdens others avoid',
  Krittika: 'sharp, purifying, critical; you cut through pretence',
  Rohini: 'magnetic, fertile, artistic; you attract resources naturally',
  Mrigashira: 'searching, curious, restless; you are always tracking something better',
  Ardra: 'stormy, penetrating, innovative; upheaval clears the way for insight',
  Punarvasu: 'renewing, generous, philosophical; you recover from anything',
  Pushya: 'nourishing, dependable, devotional; the most protective of nakshatras',
  Ashlesha: 'hypnotic, strategic, deeply perceptive; you read people instantly',
  Magha: 'regal, ancestral, authoritative; lineage and legacy matter to you',
  'Purva Phalguni': 'charming, pleasure-loving, creative; you make life enjoyable',
  'Uttara Phalguni': 'loyal, organised, contractual; you build lasting agreements',
  Hasta: 'skilful, dexterous, clever; whatever your hands touch improves',
  Chitra: 'brilliant, design-minded, dazzling; you craft beautiful structures',
  Swati: 'independent, adaptable, diplomatic; you move like wind, unbound',
  Vishakha: 'goal-driven, determined, dual-natured; you refuse to stop short',
  Anuradha: 'friendly, devoted, resilient; you build alliances that endure',
  Jyeshtha: 'senior, protective, secretive; responsibility finds you early',
  Mula: 'root-seeking, investigative, radical; you dig until you hit truth',
  'Purva Ashadha': 'invincible, persuasive, buoyant; you convince through conviction',
  'Uttara Ashadha': 'principled, enduring, victorious; late but permanent success',
  Shravana: 'listening, learned, connective; wisdom arrives through hearing',
  Dhanishta: 'rhythmic, wealthy, performative; you thrive with an audience',
  Shatabhisha: 'healing, secretive, scientific; you solve what others cannot diagnose',
  'Purva Bhadrapada': 'visionary, fiery, otherworldly; intensity fuels your transformation',
  'Uttara Bhadrapada': 'deep, calm, compassionate; still waters of great wisdom',
  Revati: 'gentle, guiding, complete; you shepherd others safely home',
};

const SIGN_TRAITS = {
  Aries: 'direct, competitive and quick to act',
  Taurus: 'steady, sensual and resistant to being rushed',
  Gemini: 'versatile, communicative and mentally restless',
  Cancer: 'protective, emotionally intelligent and memory-driven',
  Leo: 'proud, generous and built for visibility',
  Virgo: 'analytical, service-minded and detail-perfect',
  Libra: 'diplomatic, aesthetic and partnership-oriented',
  Scorpio: 'intense, private and psychologically penetrating',
  Sagittarius: 'philosophical, optimistic and freedom-seeking',
  Capricorn: 'disciplined, ambitious and structurally patient',
  Aquarius: 'unconventional, humanitarian and system-minded',
  Pisces: 'imaginative, compassionate and boundary-dissolving',
};

/* ------------------------------------------------------------------ *
 * Narrative builders
 * ------------------------------------------------------------------ */

export function lagnaReading(chart) {
  const s = SIGNS[chart.ascendantSign];
  const nak = chart.ascNakshatra;
  const lord = s.lord;
  const lp = chart.planets[lord];
  return {
    title: `${s.en} Lagna (${s.sa})`,
    body: `Your rising sign is ${s.en} at ${formatSignPos(chart.ascendant)}, in ${nak.name} nakshatra pada ${nak.pada}. ` +
      `This gives a temperament that is ${SIGN_TRAITS[s.en]}. Because ${nak.name} is ${NAK_TRAITS[nak.name]}, ` +
      `that outer style is coloured by a deeper current of the same. ` +
      `Your chart-ruler is ${lord}, currently in ${lp.signName} in house ${lp.house} (${HOUSE_INFO[lp.house - 1].name}) ` +
      `and ${lp.dignity.toLowerCase() === 'neutral' ? 'in neutral dignity' : `${lp.dignity.toLowerCase()}`}. ` +
      `That placement is where your life force is most naturally spent: ${HOUSE_INFO[lp.house - 1].themes}.`,
  };
}

export function moonReading(chart) {
  const m = chart.planets.Moon;
  const nak = m.nakshatra;
  return {
    title: `Moon in ${m.signName} — ${nak.name} pada ${nak.pada}`,
    body: `Your Janma Rashi is ${m.signName} (${SIGNS[m.sign].sa}) and your Janma Nakshatra is ${nak.name}, ruled by ${nak.lord}. ` +
      `Emotionally you are ${SIGN_TRAITS[m.signName]}. The nakshatra adds a signature that is ${NAK_TRAITS[nak.name]}. ` +
      `The Moon occupies house ${m.house}, so your sense of security is tied to ${HOUSE_INFO[m.house - 1].themes}. ` +
      `Because ${nak.lord} rules your birth star, its Vimshottari period governs the rhythm of your whole life-timeline.`,
  };
}

export function sunReading(chart) {
  const s = chart.planets.Sun;
  return {
    title: `Sun in ${s.signName} — house ${s.house}`,
    body: `The Sun, karaka of soul and authority, sits at ${formatSignPos(s.lon)} in the ${ordinal(s.house)} house ` +
      `(${HOUSE_INFO[s.house - 1].name}). Your core identity expresses through ${HOUSE_INFO[s.house - 1].themes}. ` +
      `Dignity: ${s.dignity}. ${dignityNote('Sun', s.dignity)}`,
  };
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function dignityNote(planet, dignity) {
  switch (dignity) {
    case 'Exalted': return `${planet} is exalted here — this is its strongest possible expression and a genuine asset in the chart.`;
    case 'Own Sign': return `${planet} rules this sign, so it acts freely and reliably, with no need for external support.`;
    case 'Debilitated': return `${planet} is debilitated here, so its significations mature late and benefit most from conscious remedy.`;
    default: return `${planet} is in neutral dignity, so results depend largely on aspects, house lordship and the running dasha.`;
  }
}

/** Per-planet placement paragraphs — nine real readings. */
export function planetReadings(chart, strengths) {
  return GRAHAS.map(({ key }) => {
    const p = chart.planets[key];
    const info = GRAHA_INFO[key];
    const h = HOUSE_INFO[p.house - 1];
    return {
      key,
      glyph: p.glyph,
      color: p.color,
      title: `${key} in ${p.signName}, house ${p.house}`,
      position: formatSignPos(p.lon),
      nakshatra: `${p.nakshatra.name} pada ${p.nakshatra.pada}`,
      dignity: p.dignity,
      retrograde: p.retrograde,
      strength: strengths[key],
      karaka: info.karaka,
      body: `${key} governs ${info.karaka.toLowerCase()}. Placed in the ${ordinal(p.house)} house of ${h.name.toLowerCase()} ` +
        `(${h.themes}) and in ${p.signName}, it channels those significations through a ${SIGN_TRAITS[p.signName]} filter. ` +
        `${dignityNote(key, p.dignity)}` +
        (p.retrograde && !['Rahu', 'Ketu'].includes(key)
          ? ` It is retrograde, which turns its energy inward — results come after review, revision and a second attempt.`
          : '') +
        ` At its best this yields ${info.positive}; under stress it shows as ${info.negative}.`,
    };
  });
}

/** House-by-house summary driven by real lords and occupants. */
export function houseReadings(chart) {
  return HOUSE_INFO.map((h, i) => {
    const sign = chart.houses[i];
    const lord = sign.lord;
    const lp = chart.planets[lord];
    const occupants = Object.values(chart.planets).filter((p) => p.house === h.n);
    return {
      ...h,
      signName: sign.signName,
      lord,
      lordPlacement: lp ? `${lp.signName}, house ${lp.house}` : '—',
      occupants: occupants.map((o) => o.key),
      text: `${sign.signName} occupies the ${ordinal(h.n)} house, so ${lord} is its lord, placed in house ${lp.house}. ` +
        (occupants.length
          ? `${occupants.map((o) => o.key).join(', ')} ${occupants.length > 1 ? 'occupy' : 'occupies'} this house, directly shaping ${h.themes}.`
          : `No graha occupies this house, so results follow the condition of its lord ${lord}.`),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Life-area scores — computed, not invented
 * ------------------------------------------------------------------ */

/**
 * Score a life area from the strength of its house lord, its occupants and
 * the natural karaka. Returns 0-100.
 */
export function lifeAreaScores(chart, strengths) {
  const areas = [
    { key: 'Career', houses: [10, 6, 2], karaka: ['Saturn', 'Sun', 'Mercury'], icon: '⚒' },
    { key: 'Wealth', houses: [2, 11, 5], karaka: ['Jupiter', 'Venus'], icon: '◆' },
    { key: 'Relationships', houses: [7, 5, 11], karaka: ['Venus', 'Jupiter'], icon: '❤' },
    { key: 'Health', houses: [1, 6, 8], karaka: ['Sun', 'Mars'], icon: '✚' },
    { key: 'Education', houses: [4, 5, 9], karaka: ['Mercury', 'Jupiter'], icon: '✎' },
    { key: 'Spirituality', houses: [9, 12, 5], karaka: ['Jupiter', 'Ketu'], icon: '🕉' },
    { key: 'Family', houses: [4, 2, 9], karaka: ['Moon', 'Venus'], icon: '⌂' },
    { key: 'Travel', houses: [3, 9, 12], karaka: ['Rahu', 'Moon'], icon: '✈' },
  ];

  return areas.map((a) => {
    let total = 0, weight = 0;
    a.houses.forEach((hn, idx) => {
      const w = [3, 2, 1][idx];
      const lord = chart.houses[hn - 1].lord;
      total += (strengths[lord] || 50) * w;
      weight += w;
      // Occupants nudge the score
      const occ = Object.values(chart.planets).filter((p) => p.house === hn);
      for (const o of occ) {
        const benefic = ['Jupiter', 'Venus', 'Mercury', 'Moon'].includes(o.key);
        total += (benefic ? 8 : -4) * w * 0.35;
        weight += w * 0.35;
      }
    });
    for (const k of a.karaka) { total += (strengths[k] || 50) * 1.2; weight += 1.2; }
    const score = Math.max(8, Math.min(98, Math.round(total / weight)));
    return { ...a, score, band: score >= 72 ? 'Strong' : score >= 52 ? 'Balanced' : 'Needs support' };
  });
}

/* ------------------------------------------------------------------ *
 * Dasha narrative
 * ------------------------------------------------------------------ */

export function dashaReading(chart, path) {
  if (!path || !path.length) return null;
  const [maha, antar, praty] = path;
  const mp = chart.planets[maha.lord];
  const ap = antar ? chart.planets[antar.lord] : null;
  const mi = GRAHA_INFO[maha.lord];
  const ai = antar ? GRAHA_INFO[antar.lord] : null;

  const lines = [];
  lines.push(
    `You are running the ${maha.lord} Mahadasha (${fmtY(maha.start)}–${fmtY(maha.end)}), a ${maha.years}-year chapter. ` +
    `In your chart ${maha.lord} sits in ${mp.signName}, house ${mp.house}, ${mp.dignity.toLowerCase()}, ` +
    `so this whole period pushes ${HOUSE_INFO[mp.house - 1].themes} to the centre of your life.`
  );
  if (antar && ap) {
    lines.push(
      `Within it, the ${antar.lord} Antardasha runs ${fmtD(antar.start)} → ${fmtD(antar.end)}. ` +
      `${antar.lord} occupies house ${ap.house} from your lagna, adding ${HOUSE_INFO[ap.house - 1].themes} ` +
      `to the mix. The blend of ${maha.lord} and ${antar.lord} typically brings ${blend(maha.lord, antar.lord)}.`
    );
  }
  if (praty) {
    lines.push(`The current Pratyantar sub-period is ${praty.lord}, active until ${fmtD(praty.end)} — a short window that fine-tunes the above.`);
  }
  lines.push(`Focus themes: ${mi.positive}. Watch for: ${mi.negative}${ai ? `, and ${ai.negative}` : ''}.`);
  return { title: `${maha.lord}–${antar ? antar.lord : '—'} period`, paragraphs: lines };
}

const RELATION_TONE = {
  friend: 'smooth progress and support from people in power',
  neutral: 'steady, mixed results that reward consistent effort',
  enemy: 'friction that forces growth — expect delays before breakthroughs',
};

function blend(a, b) {
  const friendly = {
    Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'],
    Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
    Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'],
    Saturn: ['Mercury', 'Venus'], Rahu: ['Venus', 'Saturn'], Ketu: ['Mars', 'Jupiter'],
  };
  if (a === b) return 'a concentrated, unmistakable expression of that planet\'s agenda';
  if ((friendly[a] || []).includes(b)) return RELATION_TONE.friend;
  const enemies = { Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'] };
  if ((enemies[a] || []).includes(b)) return RELATION_TONE.enemy;
  return RELATION_TONE.neutral;
}

const fmtY = (d) => d.getFullYear();
const fmtD = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/* ------------------------------------------------------------------ *
 * Transit narrative
 * ------------------------------------------------------------------ */

export function transitReading(chart, tr) {
  const notes = [];
  for (const r of tr.rows) {
    if (['Saturn', 'Jupiter', 'Rahu', 'Ketu'].includes(r.key)) {
      const h = HOUSE_INFO[r.fromLagna - 1];
      notes.push({
        key: r.key, glyph: r.glyph, color: r.color,
        text: `${r.key} transits ${r.signName} — house ${r.fromLagna} from your lagna and ${r.fromMoon} from your Moon. ` +
          `Expect activity around ${h.themes}.`,
      });
    }
  }
  if (tr.sadeSati.active) {
    notes.unshift({
      key: 'Saturn', glyph: '♄', color: '#8b8fb0',
      text: `Sade Sati is ACTIVE — ${tr.sadeSati.phase}. Saturn is transiting house ${tr.rows.find((r) => r.key === 'Saturn').fromMoon} from your natal Moon. ` +
        `This is a 7.5-year maturation cycle: reduce commitments, honour discipline, and serve rather than resist.`,
    });
  }
  return notes;
}

/* ------------------------------------------------------------------ *
 * Remedies — chosen from the weakest real planets
 * ------------------------------------------------------------------ */

export function remedies(chart, strengths) {
  const ranked = Object.entries(strengths).sort((a, b) => a[1] - b[1]);
  const weakest = ranked.slice(0, 3);
  return weakest.map(([planet, score]) => {
    const i = GRAHA_INFO[planet];
    const p = chart.planets[planet];
    return {
      planet, score, glyph: p.glyph, color: p.color,
      reason: `${planet} scores ${score}/100 — ${p.dignity.toLowerCase()} in ${p.signName}, house ${p.house}.`,
      mantra: i.mantra,
      count: planet === 'Sun' ? '7,000' : planet === 'Moon' ? '11,000' : planet === 'Saturn' ? '23,000' : '19,000',
      day: i.day,
      gem: i.gem,
      metal: i.metal,
      direction: i.direction,
      charity: CHARITY[planet],
      practice: PRACTICE[planet],
    };
  });
}

const CHARITY = {
  Sun: 'Wheat, jaggery or copper to a temple on Sunday',
  Moon: 'Rice, milk or white cloth on Monday evening',
  Mars: 'Red lentils or coral to a Hanuman temple on Tuesday',
  Mercury: 'Green gram, books or stationery to students on Wednesday',
  Jupiter: 'Turmeric, yellow cloth or sponsoring a teacher on Thursday',
  Venus: 'White sweets, perfume or clothing on Friday',
  Saturn: 'Black sesame, iron, mustard oil or feeding labourers on Saturday',
  Rahu: 'Blankets, coconut or mustard oil on Saturday',
  Ketu: 'Multi-coloured cloth or feeding stray dogs on Tuesday',
};

const PRACTICE = {
  Sun: 'Offer water to the rising Sun (Arghya) and perform Surya Namaskar daily',
  Moon: 'Chant to Shiva on Mondays; keep a regular sleep rhythm',
  Mars: 'Recite Hanuman Chalisa on Tuesdays; channel energy into physical training',
  Mercury: 'Recite Vishnu Sahasranama; practise writing or reading daily',
  Jupiter: 'Serve or study with a teacher; keep Thursday fast if health permits',
  Venus: 'Practise an art form; maintain cleanliness and honour agreements in love',
  Saturn: 'Serve elders and workers; Saturday discipline and simple food',
  Rahu: 'Durga worship; avoid shortcuts and intoxicants',
  Ketu: 'Ganesha worship; regular meditation and periodic silence',
};

/** Gemstone advice restricted to functional benefics — the classical rule. */
export function gemstones(chart, strengths) {
  const asc = chart.ascendantSign;
  // Lords of trine houses (1,5,9) are functional benefics for the lagna.
  const trineLords = [1, 5, 9].map((h) => SIGNS[(asc + h - 1) % 12].lord);
  const unique = [...new Set(trineLords)];
  return unique.map((lord) => {
    const i = GRAHA_INFO[lord];
    const p = chart.planets[lord];
    return {
      planet: lord, gem: i.gem, metal: i.metal, day: i.day,
      strength: strengths[lord],
      finger: FINGER[lord],
      note: `${lord} rules a trine from your ${SIGNS[asc].en} lagna, making it a functional benefic. ` +
        `Currently ${p.dignity.toLowerCase()} in ${p.signName} with strength ${strengths[lord]}/100. ` +
        (strengths[lord] < 55
          ? 'Wearing its gem is supportive because the planet needs strengthening.'
          : 'The planet is already well placed; the gem will amplify existing good results.'),
    };
  });
}

const FINGER = {
  Sun: 'Ring finger', Moon: 'Little finger', Mars: 'Ring finger',
  Mercury: 'Little finger', Jupiter: 'Index finger', Venus: 'Middle finger',
  Saturn: 'Middle finger', Rahu: 'Middle finger', Ketu: 'Ring finger',
};

/* ------------------------------------------------------------------ *
 * Daily horoscope from real transits
 * ------------------------------------------------------------------ */

export function dailyHoroscope(chart, tr, pan) {
  const moonT = tr.rows.find((r) => r.key === 'Moon');
  const h = HOUSE_INFO[moonT.fromMoon - 1];
  const hl = HOUSE_INFO[moonT.fromLagna - 1];
  const dayLord = pan.weekday.lord;
  const dl = chart.planets[dayLord];

  const focus = `The Moon is transiting ${moonT.signName} — the ${ordinal(moonT.fromMoon)} house from your natal Moon. ` +
    `Today's emotional weather centres on ${h.themes}. From your lagna it activates ${hl.name.toLowerCase()}.`;

  const dayNote = `It is ${pan.weekday.en} (${pan.weekday.sa}), ruled by ${dayLord}, which in your chart occupies ` +
    `house ${dl.house} in ${dl.signName} (${dl.dignity.toLowerCase()}). ` +
    (['Exalted', 'Own Sign'].includes(dl.dignity)
      ? 'Because that lord is well placed for you, this weekday generally favours your initiatives.'
      : dl.dignity === 'Debilitated'
        ? 'Because that lord is weak in your chart, keep this weekday for maintenance rather than launches.'
        : 'That lord is neutral for you, so outcomes track your own effort closely.');

  const tithiNote = `Tithi is ${pan.tithi.paksha} ${pan.tithi.name} (${pan.tithi.percent.toFixed(0)}% elapsed) ` +
    `and the Moon rides ${pan.nakshatra.name} nakshatra, pada ${pan.nakshatra.pada}. ` +
    `${pan.tithi.paksha === 'Shukla' ? 'The waxing phase supports beginnings, growth and outreach.' : 'The waning phase suits completion, release and consolidation.'}`;

  const ratings = [
    { key: 'Overall', v: score([moonT.fromMoon], [1, 3, 5, 7, 9, 10, 11]) },
    { key: 'Work', v: score([moonT.fromLagna], [1, 2, 6, 10, 11]) },
    { key: 'Love', v: score([moonT.fromMoon], [1, 5, 7, 11]) },
    { key: 'Money', v: score([moonT.fromLagna], [2, 5, 9, 11]) },
    { key: 'Health', v: score([moonT.fromMoon], [1, 3, 6, 11]) },
  ];

  return {
    focus, dayNote, tithiNote, ratings,
    lucky: {
      color: LUCKY_COLOR[dayLord],
      number: LUCKY_NUMBER[dayLord],
      direction: GRAHA_INFO[dayLord].direction,
      time: pan.abhijit
        ? `${fmtTime(pan.abhijit.start)}–${fmtTime(pan.abhijit.end)} (Abhijit)`
        : '—',
      avoid: pan.rahuKaal
        ? `${fmtTime(pan.rahuKaal.start)}–${fmtTime(pan.rahuKaal.end)} (Rahu Kaal)`
        : '—',
    },
  };
}

function score(houses, good) {
  const h = houses[0];
  if (good.includes(h)) return 4 + (h === 1 || h === 11 ? 1 : 0);
  if ([6, 8, 12].includes(h)) return 2;
  return 3;
}
const fmtTime = (d) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });

const LUCKY_COLOR = {
  Sun: 'Saffron / deep orange', Moon: 'Pearl white', Mars: 'Coral red',
  Mercury: 'Emerald green', Jupiter: 'Turmeric yellow', Venus: 'Ivory / pastel pink',
  Saturn: 'Indigo / charcoal', Rahu: 'Smoke grey', Ketu: 'Earthy brown',
};
const LUCKY_NUMBER = { Sun: 1, Moon: 2, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 6, Saturn: 8, Rahu: 4, Ketu: 7 };

/* ------------------------------------------------------------------ *
 * Career & wealth timing from the real dasha ladder
 * ------------------------------------------------------------------ */

/** Rank the next N antardashas by their benefit to a given life area. */
export function timingWindows(chart, maha, area = 'career', from = new Date(), count = 8) {
  const houseSets = {
    career: [10, 6, 11, 2],
    wealth: [2, 11, 5, 9],
    marriage: [7, 2, 11, 5],
    property: [4, 2, 11],
    education: [4, 5, 9],
    travel: [3, 9, 12],
  };
  const target = houseSets[area] || houseSets.career;
  const rows = [];
  for (const m of maha) {
    for (const a of m.children) {
      if (a.end < from) continue;
      const p = chart.planets[a.lord];
      let s = 50;
      if (target.includes(p.house)) s += 22;
      if (p.dignity === 'Exalted') s += 16;
      else if (p.dignity === 'Own Sign') s += 10;
      else if (p.dignity === 'Debilitated') s -= 18;
      if ([6, 8, 12].includes(p.house) && !target.includes(p.house)) s -= 14;
      // Lord of a target house running its own period is strongest
      const rulesTarget = target.some((hn) => SIGNS[chart.houses[hn - 1].sign].lord === a.lord);
      if (rulesTarget) s += 18;
      rows.push({
        lord: `${m.lord}–${a.lord}`,
        start: a.start, end: a.end,
        score: Math.max(5, Math.min(98, Math.round(s))),
        note: `${a.lord} in house ${p.house} (${p.dignity})${rulesTarget ? `, and lord of a key ${area} house` : ''}.`,
      });
      if (rows.length >= count * 3) break;
    }
    if (rows.length >= count * 3) break;
  }
  return rows.slice(0, count);
}

/* ------------------------------------------------------------------ *
 * Deterministic Q&A over the real chart (offline "oracle")
 * ------------------------------------------------------------------ */

const TOPICS = [
  {
    id: 'marriage', match: /marri|spouse|wedding|partner|relationship|love|shaadi|vivah/i,
    build: (ctx) => {
      const { chart, strengths, maha } = ctx;
      const h7 = chart.houses[6];
      const lord = h7.lord, lp = chart.planets[lord];
      const venus = chart.planets.Venus;
      const occ = Object.values(chart.planets).filter((p) => p.house === 7).map((p) => p.key);
      const win = timingWindows(chart, maha, 'marriage', new Date(), 3);
      const mang = chart.planets.Mars.house;
      return [
        `Your 7th house is ${h7.signName}, ruled by ${lord}, which sits in ${lp.signName} (house ${lp.house}, ${lp.dignity.toLowerCase()}, strength ${strengths[lord]}/100).`,
        occ.length ? `${occ.join(' and ')} occupy the 7th, directly shaping partnership.` : `No graha occupies the 7th, so the lord's condition dominates.`,
        `Venus, karaka of marriage, is in ${venus.signName} house ${venus.house} (${venus.dignity.toLowerCase()}).`,
        [1, 2, 4, 7, 8, 12].includes(mang)
          ? `Mars occupies house ${mang}, so Manglik dosha applies — match with a partner who also carries it, or perform the standard Kuja remedies.`
          : `Mars is in house ${mang}, so no Manglik dosha is formed from the lagna.`,
        `Most supportive upcoming windows: ${win.map((w) => `${w.lord} (${fmtD(w.start)}–${fmtD(w.end)}, ${w.score}/100)`).join('; ')}.`,
      ];
    },
  },
  {
    id: 'career', match: /career|job|work|promot|business|profession|salary|naukri/i,
    build: (ctx) => {
      const { chart, strengths, maha } = ctx;
      const h10 = chart.houses[9];
      const lord = h10.lord, lp = chart.planets[lord];
      const occ = Object.values(chart.planets).filter((p) => p.house === 10).map((p) => p.key);
      const win = timingWindows(chart, maha, 'career', new Date(), 3);
      const d10 = ctx.d10;
      return [
        `Your 10th house of karma is ${h10.signName}, ruled by ${lord} in ${lp.signName} (house ${lp.house}, ${lp.dignity.toLowerCase()}, strength ${strengths[lord]}/100).`,
        occ.length ? `${occ.join(' and ')} sit in the 10th, colouring your public role.` : `The 10th is unoccupied, so career follows the 10th lord and the running dasha.`,
        d10 ? `In the Dasamsa (D10), your career-lagna falls in ${SIGNS[d10.ascendantSign].en}, with the Sun in ${d10.planets.Sun.signName} — this is the chart to read for professional detail.` : '',
        `Best professional windows ahead: ${win.map((w) => `${w.lord} (${fmtD(w.start)}–${fmtD(w.end)}, ${w.score}/100)`).join('; ')}.`,
        `Saturn (karma karaka) is in ${chart.planets.Saturn.signName}, house ${chart.planets.Saturn.house} — sustained effort in those matters converts into status.`,
      ].filter(Boolean);
    },
  },
  {
    id: 'wealth', match: /money|wealth|financ|rich|invest|income|dhan|paisa|saving/i,
    build: (ctx) => {
      const { chart, strengths, maha } = ctx;
      const l2 = chart.houses[1].lord, l11 = chart.houses[10].lord;
      const p2 = chart.planets[l2], p11 = chart.planets[l11];
      const win = timingWindows(chart, maha, 'wealth', new Date(), 3);
      return [
        `The 2nd house (savings) is ${chart.houses[1].signName}, lord ${l2} in house ${p2.house} (${p2.dignity.toLowerCase()}, ${strengths[l2]}/100).`,
        `The 11th house (gains) is ${chart.houses[10].signName}, lord ${l11} in house ${p11.house} (${p11.dignity.toLowerCase()}, ${strengths[l11]}/100).`,
        p2.sign === p11.sign ? `These two lords conjoin — a textbook Dhana Yoga for accumulation.` : `The two lords are in different signs, so wealth builds through separate streams rather than one windfall.`,
        `Jupiter, karaka of wealth, is in ${chart.planets.Jupiter.signName} house ${chart.planets.Jupiter.house}.`,
        `Favourable financial periods: ${win.map((w) => `${w.lord} (${fmtD(w.start)}–${fmtD(w.end)}, ${w.score}/100)`).join('; ')}.`,
      ];
    },
  },
  {
    id: 'health', match: /health|illness|disease|body|fitness|sehat|energy/i,
    build: (ctx) => {
      const { chart, strengths } = ctx;
      const asc = chart.planets[SIGNS[chart.ascendantSign].lord];
      const h6 = chart.houses[5];
      const weak = Object.entries(strengths).sort((a, b) => a[1] - b[1])[0];
      return [
        `Your lagna lord ${SIGNS[chart.ascendantSign].lord} is in ${asc.signName}, house ${asc.house}, strength ${strengths[SIGNS[chart.ascendantSign].lord]}/100 — this is the primary vitality indicator.`,
        `The 6th house of disease is ${h6.signName}, ruled by ${h6.lord} placed in house ${chart.planets[h6.lord].house}.`,
        `The weakest graha in your chart is ${weak[0]} at ${weak[1]}/100 — its significations (${GRAHA_INFO[weak[0]].karaka.toLowerCase()}) need the most care.`,
        `Practical remedy: ${PRACTICE[weak[0]]}.`,
      ];
    },
  },
  {
    id: 'education', match: /educat|study|exam|college|degree|learn|padhai/i,
    build: (ctx) => {
      const { chart, strengths, maha } = ctx;
      const l4 = chart.houses[3].lord, l5 = chart.houses[4].lord;
      const win = timingWindows(chart, maha, 'education', new Date(), 3);
      return [
        `The 4th house (formal schooling) is ${chart.houses[3].signName}, lord ${l4} in house ${chart.planets[l4].house}.`,
        `The 5th house (intelligence) is ${chart.houses[4].signName}, lord ${l5} in house ${chart.planets[l5].house}.`,
        `Mercury (learning) scores ${strengths.Mercury}/100 and Jupiter (wisdom) ${strengths.Jupiter}/100.`,
        `Strong study windows: ${win.map((w) => `${w.lord} (${fmtD(w.start)}–${fmtD(w.end)})`).join('; ')}.`,
      ];
    },
  },
  {
    id: 'foreign', match: /abroad|foreign|relocat|immigra|visa|overseas|travel|videsh/i,
    build: (ctx) => {
      const { chart, maha } = ctx;
      const rahu = chart.planets.Rahu;
      const l12 = chart.houses[11].lord, l9 = chart.houses[8].lord;
      const win = timingWindows(chart, maha, 'travel', new Date(), 3);
      return [
        `Foreign matters are read from the 12th (${chart.houses[11].signName}, lord ${l12} in house ${chart.planets[l12].house}), the 9th (${chart.houses[8].signName}, lord ${l9} in house ${chart.planets[l9].house}) and Rahu.`,
        `Rahu — the graha of foreign lands — is in ${rahu.signName}, house ${rahu.house}, ${rahu.nakshatra.name} pada ${rahu.nakshatra.pada}.`,
        [3, 9, 12].includes(rahu.house)
          ? `Rahu occupying house ${rahu.house} is a classical relocation signature.`
          : `Rahu is in house ${rahu.house}, so relocation depends more on the 12th and 9th lords activating.`,
        `Likely travel/relocation windows: ${win.map((w) => `${w.lord} (${fmtD(w.start)}–${fmtD(w.end)}, ${w.score}/100)`).join('; ')}.`,
      ];
    },
  },
  {
    id: 'gem', match: /gem|stone|ratna|sapphire|ruby|pearl|coral|wear/i,
    build: (ctx) => {
      const g = gemstones(ctx.chart, ctx.strengths);
      return [
        `From your ${SIGNS[ctx.chart.ascendantSign].en} lagna, the functional benefics are the trine lords.`,
        ...g.map((x) => `${x.planet} → ${x.gem} (${x.metal}, ${x.finger}, wear on ${x.day}). ${x.note}`),
        `Avoid gems for functional malefics; strengthening a malefic lord amplifies its difficulties.`,
      ];
    },
  },
  {
    id: 'saturn', match: /saturn|shani|sade ?sati|dhaiya/i,
    build: (ctx) => {
      const { chart, tr, strengths } = ctx;
      const s = chart.planets.Saturn;
      const t = tr.rows.find((r) => r.key === 'Saturn');
      return [
        `Natal Saturn is in ${s.signName}, house ${s.house}, ${s.dignity.toLowerCase()}, strength ${strengths.Saturn}/100.`,
        `Transiting Saturn is currently in ${t.signName} — house ${t.fromMoon} from your natal Moon and ${t.fromLagna} from your lagna.`,
        tr.sadeSati.active
          ? `Sade Sati is ACTIVE for you: ${tr.sadeSati.phase}. Treat it as a maturation cycle, not a punishment.`
          : `You are not in Sade Sati right now.`,
        `Remedy: ${PRACTICE.Saturn}. Charity: ${CHARITY.Saturn}.`,
      ];
    },
  },
  {
    id: 'dasha', match: /dasha|period|mahadasha|antardasha|timeline|when/i,
    build: (ctx) => {
      const r = dashaReading(ctx.chart, ctx.path);
      return r ? r.paragraphs : ['Dasha data unavailable.'];
    },
  },
  {
    id: 'yoga', match: /yoga|combination|special|raja|dhana|gaja/i,
    build: (ctx) => {
      const ys = ctx.yogas;
      if (!ys.length) return ['No major classical yoga is formed in this chart; results come from house lords and dasha rather than a single combination.'];
      return ys.map((y) => `${y.name} (${y.strength}) — ${y.text}`);
    },
  },
];

/**
 * Answer a natural-language question strictly from the computed chart.
 * Works fully offline; used as the fallback when no AI key is configured.
 */
export function answerQuestion(question, ctx) {
  const topic = TOPICS.find((t) => t.match.test(question));
  const chosen = topic || TOPICS.find((t) => t.id === 'dasha');
  const lines = chosen.build(ctx);
  return {
    topic: chosen.id,
    heading: TOPIC_TITLE[chosen.id] || 'Chart analysis',
    lines,
    source: 'Computed from your natal chart — Parashari method',
  };
}

const TOPIC_TITLE = {
  marriage: 'Marriage & partnership',
  career: 'Career & profession',
  wealth: 'Wealth & finance',
  health: 'Health & vitality',
  education: 'Education & learning',
  foreign: 'Foreign travel & relocation',
  gem: 'Gemstone recommendation',
  saturn: 'Saturn & Sade Sati',
  dasha: 'Current planetary period',
  yoga: 'Yogas in your chart',
};

export const SAMPLE_QUESTIONS = [
  'When is a good period for marriage?',
  'How does my career look over the next few years?',
  'Which gemstone suits my chart?',
  'Am I going through Sade Sati?',
  'Are there chances of settling abroad?',
  'What yogas does my chart form?',
];
