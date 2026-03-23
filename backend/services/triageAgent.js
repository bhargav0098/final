/**
 * MediQueueAI V6 — AI Symptom Triage Agent
 * 3-Layer Pipeline:
 *   Layer 1: Text Normalization + spell correction
 *   Layer 2: NLP Symptom Extraction (natural + fuse.js + keyword spotting)
 *   Layer 3: Severity Classification + Emergency Safety Override
 */

let natural, Fuse;
try { natural = require('natural'); } catch(e) { natural = null; }
try { Fuse = require('fuse.js'); } catch(e) { Fuse = null; }

// ─────────────────────────────────────────────────────────
// SYMPTOM DICTIONARY  (severity → aliases)
// ─────────────────────────────────────────────────────────
const SYMPTOM_DICTIONARY = {

  // ══════════ EMERGENCY ══════════
  breathing_difficulty: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'cant breathe','cannot breathe','cant able to breathe','unable to breathe',
      'cant able to breath','unable to breath','cant breath','cannot breath',
      'difficulty breathing','trouble breathing','breathing difficulty',
      'shortness of breath','short of breath','short breath','breath problem',
      'breath issue','breathing problem','not able to breathe','no breath',
      'breathlessness','dyspnea','respiratory distress','labored breathing',
      'breathing trouble','cant catch breath','hard to breathe',
      'struggling to breathe','suffocating','suffocation','breathing fast',
      'not breathing normally','breathing discomfort severe',
      'unable to breath from','cant breathe from','stopped breathing',
      'breathing stopped','stop breathing','can not breathe',
    ],
    department: 'Emergency Medicine',
    action: 'Call emergency services immediately. Go to Emergency Room NOW.'
  },
  chest_pain: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'chest pain','chest ache','chest tightness','chest pressure','chest discomfort',
      'pain in chest','tightness in chest','heart pain','chest hurt','chest hurts',
      'chest burning','pressure in chest','chest squeezing','heart attack',
      'left chest pain','chest pounding','cardiac pain','pain chest',
      'tight chest','heavy chest','squeezing chest',
    ],
    department: 'Emergency Medicine',
    action: 'Call 911 immediately. Could be cardiac emergency.'
  },
  severe_bleeding: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'severe bleeding','heavy bleeding','uncontrolled bleeding','profuse bleeding',
      'lots of blood','bleeding heavily','blood not stopping','excessive bleeding',
      'hemorrhage','bleeding wont stop','blood everywhere','massive bleeding',
      'cant stop bleeding',
    ],
    department: 'Emergency Medicine',
    action: 'Apply pressure and go to Emergency Room immediately.'
  },
  unconscious: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'unconscious','passed out','fainted','unresponsive','not responding',
      'lost consciousness','blacked out','collapsed','fainting','blackout',
      'syncope','fell unconscious','found unconscious','wont wake up',
      'not waking up','person collapsed',
    ],
    department: 'Emergency Medicine',
    action: 'Call 911 immediately.'
  },
  stroke: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'stroke','face drooping','arm weakness','speech difficulty','face numb',
      'sudden numbness','sudden confusion','sudden headache worst','vision loss sudden',
      'slurred speech','sudden weakness one side','face dropping','dropping face',
      'arm dropping','trouble speaking','sudden dizziness severe',
      'cant speak','cant talk suddenly',
    ],
    department: 'Emergency Medicine',
    action: 'FAST — Call 911 immediately. Every minute matters for stroke.'
  },
  severe_allergic: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'anaphylaxis','anaphylactic','severe allergic reaction','throat closing',
      'throat swelling','tongue swelling','lips swelling','hives spreading rapidly',
      'epipen needed','severe allergy attack','allergic shock',
    ],
    department: 'Emergency Medicine',
    action: 'Use EpiPen if available. Call 911 immediately.'
  },
  seizure: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'seizure','convulsion','convulsing','having fits','epileptic episode',
      'shaking uncontrollably','body shaking violently','severe spasm',
      'twitching and falling','fits and falls','grand mal',
    ],
    department: 'Emergency Medicine',
    action: 'Call 911. Keep patient safe from injury.'
  },
  overdose: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'overdose','drug overdose','medication overdose','took too many pills',
      'poisoning','swallowed poison','ingested chemicals','toxic ingestion',
      'pill overdose',
    ],
    department: 'Emergency Medicine',
    action: 'Call Poison Control and 911 immediately.'
  },
  severe_burns: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'severe burns','major burns','chemical burn','third degree burn',
      'large burn area','burn over body','electrical burn','fire burn severe',
    ],
    department: 'Emergency Medicine',
    action: 'Cool the burn and go to Emergency Room immediately.'
  },
  head_injury_severe: {
    severity: 'EMERGENCY', priority: 1,
    aliases: [
      'head injury','head trauma','skull fracture','hit head hard','head wound severe',
      'concussion severe','brain injury','head accident serious',
    ],
    department: 'Emergency Medicine',
    action: 'Go to Emergency Room immediately. Do not move patient if spinal injury possible.'
  },

  // ══════════ HIGH ══════════
  high_fever: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'high fever','very high temperature','fever 103','fever 104','fever 105',
      'very high fever','extreme fever','burning up','103 fever','104 temperature',
      'fever above 103','fever greater than 103','severe fever','dangerously high fever',
    ],
    department: 'General Medicine',
    action: 'See a doctor within 2 hours.'
  },
  severe_abdominal_pain: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'severe abdominal pain','severe stomach pain','intense stomach pain',
      'sharp abdominal pain','unbearable stomach pain','severe belly pain',
      'abdominal cramps severe','appendix pain','appendicitis',
      'excruciating stomach pain',
    ],
    department: 'General Medicine',
    action: 'See a doctor urgently within 2 hours.'
  },
  vomiting_blood: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'vomiting blood','blood in vomit','hematemesis','throwing up blood',
      'blood when vomiting','black vomit',
    ],
    department: 'Emergency Medicine',
    action: 'Go to Emergency Room.'
  },
  persistent_vomiting: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'persistent vomiting','cant stop vomiting','continuous vomiting',
      'vomiting all day','vomiting for hours','nonstop vomiting',
    ],
    department: 'General Medicine',
    action: 'See a doctor within 2-4 hours.'
  },
  severe_dehydration: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'severe dehydration','extreme thirst','no urination for hours','dark urine extreme',
      'dizzy and dehydrated','sunken eyes','dry mouth severe and dizzy',
    ],
    department: 'General Medicine',
    action: 'Seek medical attention promptly.'
  },
  broken_bone: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'broken bone','fracture','bone fracture','broken arm','broken leg',
      'broken wrist','possible fracture','bone sticking out','deformed limb',
      'compound fracture',
    ],
    department: 'Orthopedics',
    action: 'Go to urgent care or Emergency Room.'
  },
  mental_health_crisis: {
    severity: 'HIGH', priority: 2,
    aliases: [
      'suicidal','want to die','self harm','hurting myself','mental breakdown',
      'severe panic attack','psychosis','hallucinations','severe anxiety attack',
    ],
    department: 'Psychiatry',
    action: 'Seek immediate mental health support or go to Emergency Room.'
  },

  // ══════════ MEDIUM ══════════
  moderate_fever: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'fever','moderate fever','high temperature','temperature','running fever',
      'low grade fever','fever 101','fever 102','slightly high temperature',
      'feeling feverish','body temperature high','mild fever',
    ],
    department: 'General Medicine',
    action: 'Schedule appointment within 24 hours.'
  },
  mild_breathing_discomfort: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'mild breathing discomfort','slight breathing issue','a bit short of breath',
      'minor shortness of breath','mildly short of breath','breathing slight discomfort',
      'mild breathlessness',
    ],
    department: 'Pulmonology',
    action: 'Schedule appointment within 24 hours.'
  },
  infection: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'infection','wound infection','ear infection','sinus infection',
      'urinary tract infection','urinary infection','bacterial infection','inflamed wound',
      'infected cut','throat infection','tonsillitis','skin infection',
    ],
    department: 'General Medicine',
    action: 'Schedule appointment within 24 hours.'
  },
  vomiting_moderate: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'vomiting','nausea and vomiting','throwing up','vomited','nausea',
      'feeling nauseous','stomach upset vomiting','puking',
    ],
    department: 'General Medicine',
    action: 'Schedule appointment within 24 hours.'
  },
  abdominal_pain_moderate: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'stomach pain','stomach ache','abdominal pain','belly pain','cramps',
      'moderate stomach pain','stomach discomfort',
    ],
    department: 'General Medicine',
    action: 'Schedule appointment within 24 hours.'
  },
  back_pain: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'back pain','lower back pain','severe back pain','spine pain',
      'back ache','backache',
    ],
    department: 'General Medicine',
    action: 'Schedule appointment within 24 hours.'
  },
  rash: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'rash','skin rash','hives','urticaria','itchy rash','red patches',
      'eczema flare','skin eruption',
    ],
    department: 'Dermatology',
    action: 'Schedule appointment within 24-48 hours.'
  },
  diarrhea: {
    severity: 'MEDIUM', priority: 3,
    aliases: [
      'diarrhea','loose stool','watery stool','diarrhoea','prolonged diarrhea',
      'diarrhea for days','frequent loose motions',
    ],
    department: 'Gastroenterology',
    action: 'Schedule appointment within 24 hours.'
  },

  // ══════════ LOW ══════════
  mild_headache: {
    severity: 'LOW', priority: 5,
    aliases: [
      'headache','mild headache','head ache','slight headache','minor headache',
      'tension headache','head pain mild','mild head pain',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment.'
  },
  common_cold: {
    severity: 'LOW', priority: 5,
    aliases: [
      'cold','common cold','runny nose','stuffy nose','sneezing','congestion',
      'nasal congestion','blocked nose','sore throat mild','cold symptoms',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment.'
  },
  cough_mild: {
    severity: 'LOW', priority: 5,
    aliases: [
      'cough','mild cough','dry cough','slight cough','coughing',
      'persistent cough mild',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment if persists.'
  },
  fatigue: {
    severity: 'LOW', priority: 5,
    aliases: [
      'fatigue','tired','tiredness','weakness mild','exhausted','low energy',
      'feeling weak','lack of energy','lethargy','feeling tired',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment.'
  },
  minor_pain: {
    severity: 'LOW', priority: 5,
    aliases: [
      'minor pain','mild pain','slight pain','mild ache','minor ache',
      'discomfort mild','mild discomfort',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment.'
  },
  routine: {
    severity: 'LOW', priority: 5,
    aliases: [
      'checkup','routine','follow up','follow-up','prescription refill',
      'annual visit','regular checkup','routine visit','general checkup',
    ],
    department: 'General Medicine',
    action: 'Book a regular appointment.'
  },
};

// ─────────────────────────────────────────────────────────
// LAYER 1 — TEXT NORMALIZATION
// ─────────────────────────────────────────────────────────
const SPELL_MAP = [
  // Breathing — most important, checked first (longest patterns)
  ['cant able to breathe',   'cannot breathe'],
  ['cant able to breath',    'cannot breathe'],
  ['not able to breathe',    'cannot breathe'],
  ['not able to breath',     'cannot breathe'],
  ['unable to breath',       'cannot breathe'],
  ['unable to breathe',      'cannot breathe'],
  ['hard to breathe',        'difficulty breathing'],
  ['hard to breath',         'difficulty breathing'],
  ['difficult to breathe',   'difficulty breathing'],
  ['trouble breathing',      'difficulty breathing'],
  ['trouble breath',         'difficulty breathing'],
  ['short of breath',        'shortness of breath'],
  ['short breath',           'shortness of breath'],
  ['cant breath',            'cannot breathe'],
  ['can not breathe',        'cannot breathe'],
  ['cant breathe',           'cannot breathe'],
  ['breathing problem',      'difficulty breathing'],
  ['breathing issue',        'difficulty breathing'],
  ['breath problem',         'difficulty breathing'],
  ['breath issue',           'difficulty breathing'],
  // Chest
  ['chest hurt',             'chest pain'],
  ['chest hurts',            'chest pain'],
  ['heart hurts',            'chest pain'],
  ['heart is hurting',       'chest pain'],
  // Vomiting
  ['threw up',               'vomiting'],
  ['throwing up',            'vomiting'],
  ['puke',                   'vomiting'],
  ['puking',                 'vomiting'],
  // Spelling fixes
  ['cheast',                 'chest'],
  ['stomac',                 'stomach'],
  ['stomack',                'stomach'],
  ['stomich',                'stomach'],
  ['seazure',                'seizure'],
  ['seziure',                'seizure'],
  ['alergic',                'allergic'],
  ['alergy',                 'allergy'],
  ['temperture',             'temperature'],
  ['temprature',             'temperature'],
  ['unconshus',              'unconscious'],
  ['unconcious',             'unconscious'],
  ['feverish',               'fever'],
  ['fevr',                   'fever'],
  ['faver',                  'fever'],
  ['headach',                'headache'],
  ['hedache',                'headache'],
  ['diarrhoea',              'diarrhea'],
  ['diareha',                'diarrhea'],
  ['nausia',                 'nausea'],
  ['nausious',               'nauseous'],
  ['sweling',                'swelling'],
  ['dizzy',                  'dizziness'],
  ['giddy',                  'dizziness'],
  ['high bp',                'high blood pressure'],
];

function normalizeText(text) {
  if (!text) return '';
  let t = text.toLowerCase().trim();
  t = t.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Apply corrections — longest first (already ordered above)
  for (const [from, to] of SPELL_MAP) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(escaped, 'g'), to);
  }
  return t.replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────
// EMERGENCY KEYWORD FAST-PATH
// (checked BEFORE full NLP — instant detection)
// ─────────────────────────────────────────────────────────
const EMERGENCY_FAST_KEYWORDS = [
  // breathing
  'cannot breathe','cant breathe','difficulty breathing','unable to breathe',
  'stopped breathing','not breathing','shortness of breath',
  // chest
  'chest pain','heart attack',
  // neuro
  'seizure','convulsion','stroke','unconscious','passed out','unresponsive',
  // other
  'overdose','anaphylaxis','anaphylactic','throat closing','throat swelling',
  'severe bleeding','bleeding heavily','hemorrhage',
  'severe burn','severe burns',
];

function emergencyFastPath(normalized) {
  for (const kw of EMERGENCY_FAST_KEYWORDS) {
    if (normalized.includes(kw)) {
      // Don't trigger emergency if clearly qualified as mild/slight/minor
      const idx = normalized.indexOf(kw);
      const before = normalized.slice(Math.max(0, idx - 20), idx);
      const after  = normalized.slice(idx + kw.length, idx + kw.length + 30);
      const context2 = before + ' ' + after;
      if (/\b(mild|slight|minor|little|bit|barely|small|mildly|slightly)\b/.test(context2)) continue;
      return kw;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// LAYER 2 — NLP SYMPTOM EXTRACTION
// ─────────────────────────────────────────────────────────
const _fuseItems = Object.entries(SYMPTOM_DICTIONARY).flatMap(([key, data]) =>
  data.aliases.map(alias => ({ symptomKey: key, text: alias, severity: data.severity, priority: data.priority }))
);

function extractSymptoms(normalizedText) {
  const detected = new Map();

  // Method A: direct substring match (highest confidence: 95)
  const MILD_QUALIFIERS = /\b(slight|mild|minor|little|bit|barely|small|mildly|slightly)\b/;
  for (const [key, data] of Object.entries(SYMPTOM_DICTIONARY)) {
    for (const alias of data.aliases) {
      if (normalizedText.includes(alias)) {
        // For emergency symptoms, don't trigger if clearly mild-qualified
        const idx = normalizedText.indexOf(alias);
        const context = normalizedText.slice(Math.max(0, idx - 20), idx + alias.length + 10);
        const isMildQualified = MILD_QUALIFIERS.test(context);
        // Downgrade emergency to medium if mild-qualified
        if (isMildQualified && data.severity === 'EMERGENCY') {
          const downgraded = { ...data, severity:'MEDIUM', priority:3, symptomKey:key, matchedAlias:alias, confidence:70, method:'exact-mild' };
          if (!detected.has(key) || detected.get(key).confidence < 70) detected.set(key, downgraded);
        } else if (!detected.has(key) || detected.get(key).confidence < 95) {
          detected.set(key, { ...data, symptomKey: key, matchedAlias: alias, confidence: 95, method: 'exact' });
        }
      }
    }
  }

  // Method B: Fuse.js fuzzy matching (confidence scaled by score)
  if (Fuse && _fuseItems.length > 0) {
    const fuse = new Fuse(_fuseItems, { keys: ['text'], threshold: 0.32, includeScore: true, minMatchCharLength: 4 });
    const words = normalizedText.split(' ');
    for (let len = 5; len >= 2; len--) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        if (phrase.length < 4) continue;
        const results = fuse.search(phrase);
        if (results.length > 0 && results[0].score < 0.28) {
          const match = results[0].item;
          const conf  = Math.round((1 - results[0].score) * 88);
          const existing = detected.get(match.symptomKey);
          if (!existing || existing.confidence < conf) {
            const data = SYMPTOM_DICTIONARY[match.symptomKey];
            detected.set(match.symptomKey, { ...data, symptomKey: match.symptomKey, matchedAlias: phrase, confidence: conf, method: 'fuzzy' });
          }
        }
      }
    }
  }

  // Method C: Porter stemmer token match (natural)
  if (natural && detected.size < 2) {
    const stemmer = natural.PorterStemmer;
    const inputStems = normalizedText.split(' ').map(w => stemmer.stem(w));
    for (const [key, data] of Object.entries(SYMPTOM_DICTIONARY)) {
      if (detected.has(key)) continue;
      for (const alias of data.aliases) {
        const aliasStems = alias.split(' ').map(w => stemmer.stem(w));
        let matchCount = 0;
        for (const as of aliasStems) {
          if (as.length > 2 && inputStems.includes(as)) matchCount++;
        }
        const ratio = matchCount / Math.max(aliasStems.length, 1);
        if (ratio >= 0.65) {
          const conf = Math.round(ratio * 78);
          if (!detected.has(key) || detected.get(key).confidence < conf) {
            detected.set(key, { ...data, symptomKey: key, matchedAlias: alias, confidence: conf, method: 'stem' });
          }
          break;
        }
      }
    }
  }

  // Method D: Number-based clinical rules
  // Fever > 102 → HIGH priority
  const feverMatch = normalizedText.match(/fever\s*(\d+)|temperature\s*(\d+)|(\d+)\s*degree|(\d+)\s*fever/i);
  if (feverMatch) {
    const temp = parseInt(feverMatch[1] || feverMatch[2] || feverMatch[3] || feverMatch[4]);
    if (!isNaN(temp) && temp >= 103) {
      if (!detected.has('high_fever')) {
        const data = SYMPTOM_DICTIONARY['high_fever'];
        detected.set('high_fever', { ...data, symptomKey:'high_fever', matchedAlias:`fever ${temp}`, confidence:90, method:'numeric' });
      }
      // Remove moderate_fever if high_fever is detected
      detected.delete('moderate_fever');
    }
  }

  // Remove routine/checkup if more specific symptoms found
  if (detected.size > 1 && detected.has('routine')) detected.delete('routine');
  // If no symptoms detected at all, default to LOW/routine
  if (detected.size === 0) {
    const data = SYMPTOM_DICTIONARY['routine'];
    detected.set('routine', { ...data, symptomKey:'routine', matchedAlias:'unspecified', confidence:45, method:'default' });
  }
  // If only routine, keep as LOW
  if (detected.size === 1 && detected.has('routine')) {
    detected.get('routine').severity = 'LOW';
    detected.get('routine').priority = 5;
  }

  return Array.from(detected.values());
}

// ─────────────────────────────────────────────────────────
// LAYER 3 — SEVERITY CLASSIFICATION + EMERGENCY OVERRIDE
// ─────────────────────────────────────────────────────────
const W = { EMERGENCY: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const SEVERITY_FROM_W = { 4:'EMERGENCY', 3:'HIGH', 2:'MEDIUM', 1:'LOW' };
const PRIORITY_MAP = { EMERGENCY: 1, HIGH: 2, MEDIUM: 3, LOW: 5 };

function classifySeverity(symptoms) {
  if (symptoms.length === 0) return { severity:'LOW', priority_score:5, confidence:50, reason:'No symptoms detected' };

  // EMERGENCY SAFETY OVERRIDE — if any emergency symptom found → ALWAYS EMERGENCY
  const emergencySymptoms = symptoms.filter(s => s.severity === 'EMERGENCY');
  if (emergencySymptoms.length > 0) {
    const best = emergencySymptoms.sort((a, b) => b.confidence - a.confidence)[0];
    const avgConf = Math.round(emergencySymptoms.reduce((s, x) => s + x.confidence, 0) / emergencySymptoms.length);
    return {
      severity: 'EMERGENCY', priority_score: 1,
      confidence: Math.max(avgConf, 85),
      primarySymptom: best.symptomKey,
      reason: `EMERGENCY OVERRIDE: ${emergencySymptoms.map(s => s.symptomKey.replace(/_/g,' ')).join(', ')}`,
    };
  }

  // Weight-based for non-emergency
  let maxW = 0, dominant = null, totalConf = 0;
  for (const s of symptoms) {
    const w = W[s.severity] || 1;
    if (w > maxW || (w === maxW && s.confidence > (dominant?.confidence || 0))) { maxW = w; dominant = s; }
    totalConf += s.confidence;
  }
  const severity = SEVERITY_FROM_W[maxW] || 'LOW';
  const sameLevel = symptoms.filter(s => s.severity === severity).length;
  let conf = Math.round(totalConf / symptoms.length);
  if (sameLevel > 1) conf = Math.min(conf + 5 * sameLevel, 98);
  return { severity, priority_score: PRIORITY_MAP[severity] || 5, confidence: conf, primarySymptom: dominant?.symptomKey, reason: `${sameLevel} symptom(s) at ${severity}` };
}

// ─────────────────────────────────────────────────────────
// MAIN TRIAGE FUNCTION
// ─────────────────────────────────────────────────────────
async function triagePatient(reason = '', description = '', patientAge = 30, medicalHistory = []) {
  const raw        = [reason, description].filter(Boolean).join(' ');
  const normalized = normalizeText(raw);

  // Fast-path emergency check
  const fastEmergency = emergencyFastPath(normalized);
  if (fastEmergency) {
    // Find which symptom key it maps to
    let matchedKey = 'breathing_difficulty';
    for (const [key, data] of Object.entries(SYMPTOM_DICTIONARY)) {
      if (data.aliases.some(a => normalized.includes(a)) && data.severity === 'EMERGENCY') {
        matchedKey = key; break;
      }
    }
    const data = SYMPTOM_DICTIONARY[matchedKey];
    return {
      severity: 'EMERGENCY', priority_score: 1, confidence: 92,
      detected_symptoms: [matchedKey.replace(/_/g,' ')],
      symptom_details: [{ name: matchedKey.replace(/_/g,' '), method: 'fast-path', confidence: 92 }],
      recommended_department: data.department,
      recommended_action: data.action,
      reason: `Emergency fast-path: "${fastEmergency}" detected`,
      normalized_input: normalized,
      is_emergency: true,
      age_vulnerable: patientAge < 5 || patientAge > 75,
      possible_conditions: [],
      additional_advice: '',
      estimated_consult_minutes: 30,
      triaged_at: new Date().toISOString(),
      triage_version: 'v6.1',
    };
  }

  // Full NLP extraction
  const symptoms = extractSymptoms(normalized);

  // Age escalation: vulnerable patients with multiple medium symptoms → HIGH
  const isVulnerable = patientAge < 5 || patientAge > 75;
  if (isVulnerable) {
    const medCount = symptoms.filter(s => s.severity === 'MEDIUM').length;
    if (medCount >= 2) symptoms.forEach(s => { if (s.severity === 'MEDIUM') s.confidence = Math.min(s.confidence + 8, 98); });
  }

  // Medical history risk escalation
  const HIGH_RISK_CONDITIONS = ['heart disease','asthma','diabetes','copd','hypertension','epilepsy','cancer','kidney disease'];
  const hasRisk = medicalHistory.some(h => HIGH_RISK_CONDITIONS.some(r => h.toLowerCase().includes(r)));
  if (hasRisk) {
    symptoms.forEach(s => { if (s.severity === 'HIGH') s.confidence = Math.min(s.confidence + 10, 98); });
  }

  const classification = classifySeverity(symptoms);
  const primary = symptoms[0] || {};
  const dept   = primary.department  || getDept(classification.severity);
  const action = primary.action || getAction(classification.severity);

  // Optional Gemini insight
  let geminiInsight = null;
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_optional'
      && classification.severity !== 'EMERGENCY') {
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      const prompt = `Triage: "${raw}", age ${patientAge}. Classified: ${classification.severity}. Return ONLY JSON: {"possibleConditions":["c1"],"additionalAdvice":"text","estimatedConsultMinutes":15}`;
      const result = await Promise.race([model.generateContent(prompt), new Promise((_,r) => setTimeout(() => r(new Error('timeout')), 5000))]);
      geminiInsight = JSON.parse(result.response.text().replace(/```json|```/g,'').trim());
    } catch(_) {}
  }

  return {
    severity: classification.severity,
    priority_score: classification.priority_score,
    confidence: classification.confidence,
    detected_symptoms: symptoms.map(s => s.symptomKey.replace(/_/g,' ')),
    symptom_details: symptoms.slice(0,3).map(s => ({ name: s.symptomKey.replace(/_/g,' '), method: s.method, confidence: s.confidence })),
    recommended_department: dept,
    recommended_action: action,
    reason: classification.reason,
    normalized_input: normalized,
    is_emergency: classification.severity === 'EMERGENCY',
    age_vulnerable: isVulnerable,
    possible_conditions: geminiInsight?.possibleConditions || [],
    additional_advice: geminiInsight?.additionalAdvice || '',
    estimated_consult_minutes: geminiInsight?.estimatedConsultMinutes || getConsultTime(classification.severity),
    triaged_at: new Date().toISOString(),
    triage_version: 'v6.1',
  };
}

function getDept(severity)     { return { EMERGENCY:'Emergency Medicine', HIGH:'General Medicine', MEDIUM:'General Medicine', LOW:'General Medicine' }[severity] || 'General Medicine'; }
function getAction(severity)   { return { EMERGENCY:'Go to Emergency Room IMMEDIATELY. Call 911 if needed.', HIGH:'See a doctor within 2 hours.', MEDIUM:'Schedule appointment within 24 hours.', LOW:'Book a regular appointment.' }[severity] || 'Book a regular appointment.'; }
function getConsultTime(severity) { return { EMERGENCY:30, HIGH:20, MEDIUM:15, LOW:10 }[severity] || 15; }

module.exports = { triagePatient, normalizeText, extractSymptoms, classifySeverity, SYMPTOM_DICTIONARY };
