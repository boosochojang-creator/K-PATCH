/**
 * K-PATCH ULTIMATE — one-shot rebuild from source.
 * Stage-based progression with explicit visible screens.
 * No legacy flow, no duplicated blocks, no mixed runtime paths.
 */

'use strict';

// =============================================================================
// Environment rules
// =============================================================================

function isFileProtocol() {
  return window.location.protocol === 'file:';
}

function isAllowedOrigin() {
  const { protocol, hostname } = window.location;
  if (protocol === 'https:') return true;
  if (protocol !== 'http:') return false;

  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function $(id) {
  return document.getElementById(id);
}

function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = String(msg || '');
  t.hidden = false;
  window.clearTimeout(toast._tm);
  toast._tm = window.setTimeout(() => {
    t.hidden = true;
  }, 2800);
}

/** Short-lived lock during intro→stage / stage→quiz transitions (no global pointer-events). */
let transitionLock = false;

/** True after a user-gesture warmup speak(); required for HTTPS/mobile speechSynthesis. */
let ttsUnlocked = false;

// =============================================================================
// Screens / phases
// =============================================================================

const PHASE = {
  INTRO_MAIN: 'intro-main',
  STAGE_INTRO: 'stage-intro',
  QUIZ: 'quiz',
  STAGE_CLEAR: 'stage-clear',
  CERT_CARD: 'cert-card',
  SURVEY: 'survey',
  SUBSCRIBE_UNLOCK: 'subscribe-unlock',
  ENDING: 'ending',
};

const PHASE_TO_SECTION_ID = {
  [PHASE.INTRO_MAIN]: 'phase-intro',
  [PHASE.STAGE_INTRO]: 'phase-stage-intro',
  [PHASE.QUIZ]: 'phase-quiz',
  [PHASE.STAGE_CLEAR]: 'phase-stage-clear',
  [PHASE.CERT_CARD]: 'phase-cert',
  [PHASE.SURVEY]: 'phase-survey',
  [PHASE.SUBSCRIBE_UNLOCK]: 'phase-subscribe',
  [PHASE.ENDING]: 'phase-ending',
};

function showPhase(phaseId) {
  const showId = PHASE_TO_SECTION_ID[phaseId];
  document.querySelectorAll('main#app section.phase').forEach((el) => {
    const on = el.id === showId;
    el.hidden = !on;
    el.classList.toggle('is-visible', on);
  });
  state.currentPhase = phaseId;
  if (phaseId !== PHASE.INTRO_MAIN) {
    hideResumeModal();
  }
  if (phaseId !== PHASE.QUIZ) {
    state.quizChoicesEnabled = false;
    updateHintVideo(null);
    const qp = $('phase-quiz');
    if (qp) qp.classList.remove('phase-quiz--general');
  }
}

// =============================================================================
// Stage table (hard-coded, explicit)
// =============================================================================

const STAGES = [
  {
    key: 'recruit',
    label_kr: '훈련병',
    label_en: 'RECRUIT',
    startId: 1,
    endId: 10,
    introTitle: '훈련병',
    introDescription: '기초 반응 표현 구간입니다. 1~10번 문제를 풀며 워밍업합니다.',
    clearTitle: '훈련병 구간 정복',
    clearDescription: '훈련병 구간(1~10)을 완료했습니다.',
    certTitle: '훈련병 인증카드',
    certSubtitle: '훈련병 단계 완료.',
    tone_en: 'Fast · light · instant reaction.',
    tone_kr: '빠르고 가볍게, 즉각 반응.',
    bgmIntro: null,
    bgmQuiz: 'bg_recruit',
    imagePoolKey: 'recruit',
  },
  {
    key: 'soldier',
    label_kr: '병사',
    label_en: 'SOLDIER',
    startId: 11,
    endId: 25,
    introTitle: '병사',
    introDescription: '일상 반응 표현 구간입니다. 11~25번 문제를 진행합니다.',
    clearTitle: '병사 구간 정복',
    clearDescription: '병사 구간(11~25)을 완료했습니다.',
    certTitle: '병사 인증카드',
    certSubtitle: '병사 단계 완료.',
    tone_en: 'Fun · casual · reactive.',
    tone_kr: '재미·캐주얼, 반응 중심.',
    bgmIntro: null,
    bgmQuiz: 'bg_soldier',
    imagePoolKey: 'soldier',
  },
  {
    key: 'nco',
    label_kr: '부사관',
    label_en: 'NCO',
    startId: 26,
    endId: 45,
    introTitle: '부사관',
    introDescription: '뉘앙스와 관계 반응이 강화되는 구간입니다. 26~45번 문제를 진행합니다.',
    clearTitle: '부사관 구간 정복',
    clearDescription: '부사관 구간(26~45)을 완료했습니다.',
    certTitle: '부사관 인증카드',
    certSubtitle: '부사관 단계 완료.',
    tone_en: 'Emotion · relationship · nuance.',
    tone_kr: '감정·관계·뉘앙스.',
    bgmIntro: null,
    bgmQuiz: 'bg_nco',
    imagePoolKey: 'nco',
  },
  {
    key: 'officer',
    label_kr: '위관',
    label_en: 'OFFICER',
    startId: 46,
    endId: 70,
    introTitle: '위관',
    introDescription: '압박과 속도감이 높아지는 구간입니다. 46~70번 문제를 진행합니다.',
    clearTitle: '위관 구간 정복',
    clearDescription: '위관 구간(46~70)을 완료했습니다.',
    certTitle: '위관 인증카드',
    certSubtitle: '위관 단계 완료.',
    tone_en: 'Judgment · interpretation.',
    tone_kr: '판단·해석.',
    bgmIntro: null,
    bgmQuiz: 'bg_officer',
    imagePoolKey: 'officer',
  },
  {
    key: 'major',
    label_kr: '영관',
    label_en: 'MAJOR',
    startId: 71,
    endId: 85,
    introTitle: '영관',
    introDescription: '숙련자 구간입니다. 71~85번 문제를 진행합니다.',
    clearTitle: '영관 구간 정복',
    clearDescription: '영관 구간(71~85)을 완료했습니다.',
    certTitle: '영관 인증카드',
    certSubtitle: '영관 단계 완료.',
    tone_en: 'Self-awareness · critique.',
    tone_kr: '자기 인식·비평.',
    bgmIntro: null,
    bgmQuiz: 'bg_major',
    imagePoolKey: 'major',
  },
  {
    key: 'general',
    label_kr: '장군',
    label_en: 'GENERAL',
    startId: 86,
    endId: 95,
    introTitle: '장군',
    introDescription: '최종 구간입니다. 86~95번 문제를 진행합니다.',
    clearTitle: '장군 구간 정복',
    clearDescription: '장군 구간(86~95)을 완료했습니다.',
    certTitle: '최종 인증카드',
    certSubtitle: '전체 임무 완료.',
    tone_en: 'Insight · reflection · closure.',
    tone_kr: '통찰·성찰·마무리.',
    bgmIntro: null,
    bgmQuiz: 'bg_general',
    imagePoolKey: 'general',
  },
];

function stageByIndex(i) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, i))];
}

function stageStartIndex(stageIdx) {
  return stageByIndex(stageIdx).startId - 1;
}

function stageEndIndex(stageIdx) {
  return stageByIndex(stageIdx).endId - 1;
}

function stageLen(stageIdx) {
  const s = stageByIndex(stageIdx);
  return s.endId - s.startId + 1;
}

// =============================================================================
// Images (explicit pools per stage)
// =============================================================================

const IMAGE_POOLS = {
  intro: ['assets/img/img_intro_01_korea_landscape.jpg'],
  recruit: [
    'assets/img/img_recruit_01_hadong_fog.jpg',
    'assets/img/img_recruit_02_seomjingang_morning.jpg',
    'assets/img/img_recruit_03_hanok_raindrop.jpg',
    'assets/img/img_recruit_04_rural_alley.jpg',
    'assets/img/img_recruit_05_market_entrance.jpg',
  ],
  soldier: [
    'assets/img/img_soldier_01_convenience_night.jpg',
    'assets/img/img_soldier_02_bus_stop.jpg',
    'assets/img/img_soldier_03_cafe_street.jpg',
    'assets/img/img_soldier_05_subway_entrance.jpg',
    'assets/img/img_soldier_06_street_food.jpg',
  ],
  nco: [
    'assets/img/img_nco_01_office.jpg',
    'assets/img/img_nco_02_company_dinner.jpg',
    'assets/img/img_nco_03_cafe_talk.jpg',
    'assets/img/img_nco_04_restaurant.jpg',
    'assets/img/img_nco_05_phone_scene.jpg',
    'assets/img/img_nco_06_waiting.jpg',
    'assets/img/img_nco_07_social_awareness.jpg',
    'assets/img/img_nco_08_conflict.jpg',
  ],
  officer: [
    'assets/img/img_officer_01_thinking.jpg',
    'assets/img/img_officer_02_conflict.jpg',
    'assets/img/img_officer_03_discussion.jpg',
    'assets/img/img_officer_04_night_street.jpg',
    'assets/img/img_officer_05_rain_street.jpg',
    'assets/img/img_officer_06_cafe_alone.jpg',
    'assets/img/img_officer_07_meeting.jpg',
    'assets/img/img_officer_08_emotion_closeup.jpg',
    'assets/img/img_officer_09_worry.jpg',
    'assets/img/img_officer_10_decision.jpg',
  ],
  major: [
    'assets/img/img_major_01_meeting_table.jpg',
    'assets/img/img_major_02_presentation.jpg',
    'assets/img/img_major_03_planning.jpg',
    'assets/img/img_major_04_map_analysis.jpg',
    'assets/img/img_major_05_team_talk.jpg',
    'assets/img/img_major_06_direction.jpg',
  ],
  general: [
    'assets/img/img_general_01_hallasan.jpg',
    'assets/img/img_general_02_south_sea.jpg',
    'assets/img/img_general_03_west_sunset.jpg',
    'assets/img/img_general_04_east_sunrise.jpg',
    'assets/img/img_general_05_ulleung_cliff.jpg',
  ],
  ending: ['assets/img/img_ending_01_dokdo_sunrise.jpg'],
};

function setBackground(url) {
  const el = $('bg-layer');
  if (!el) return;
  const u = String(url || '');
  el.style.backgroundImage = `linear-gradient(165deg, rgba(6,6,6,0.55), rgba(6,6,6,0.35)), url("${u}")`;
}

function backgroundForStage(stageIdx, localIndex) {
  const s = stageByIndex(stageIdx);
  const pool = IMAGE_POOLS[s.imagePoolKey] || IMAGE_POOLS.recruit;
  const i = Math.max(0, Number(localIndex) || 0) % pool.length;
  return pool[i];
}

// =============================================================================
// Audio manager (centralized, no overlap)
// =============================================================================
// BGM direction hooks (asset filenames map here; swap files without code changes):
// - bg_intro: cinematic hybrid Gukak tension trailer
// - bg_* quiz keys: minimal lo-fi Korean instrumental focus loop per stage
// - sfx_stage_clear / sfx_final_clear: Korean percussion victory fanfare short
// - bg_ending: emotional Gayageum cinematic ambient outro

const AUDIO_FILES = {
  bg_intro: 'assets/audio/bg_intro.mp3',
  bg_recruit: 'assets/audio/bg_recruit.mp3',
  bg_soldier: 'assets/audio/bg_soldier.mp3',
  bg_nco: 'assets/audio/bg_nco.mp3',
  bg_officer: 'assets/audio/bg_officer.mp3',
  bg_major: 'assets/audio/bg_major.mp3',
  bg_general: 'assets/audio/bg_general.mp3',
  bg_ending: 'assets/audio/bg_ending.mp3',
  sfx_opening: 'assets/audio/sfx_opening.mp3',
  sfx_correct: 'assets/audio/sfx_correct.mp3',
  sfx_fail: 'assets/audio/sfx_fail.mp3',
  sfx_stage_clear: 'assets/audio/sfx_stage_clear.mp3',
  sfx_final_clear: 'assets/audio/sfx_final_clear.mp3',
  sfx_correct_react: 'assets/audio/sfx_correct_react.mp3',
};

function stopSpeech() {
  try {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  } catch (_) {}
}

const AudioManager = (() => {
  const pool = new Map();
  let currentBgmKey = null;

  function get(key) {
    if (!pool.has(key)) {
      const a = new Audio(AUDIO_FILES[key]);
      a.preload = 'auto';
      pool.set(key, a);
      if (key === 'sfx_opening') {
        try {
          a.addEventListener('error', () => {
            console.error('[K-PATCH] Missing audio file:', AUDIO_FILES.sfx_opening);
          });
        } catch (_) {}
      }
    }
    return pool.get(key);
  }

  function stopAll({ keepBgm = false } = {}) {
    stopSpeech();
    pool.forEach((a, key) => {
      try {
        if (!key.startsWith('bg_')) {
          a.pause();
          a.currentTime = 0;
        }
      } catch (_) {}
    });
    if (!keepBgm) {
      currentBgmKey = null;
    }
  }

  function playBgm(key) {
    pool.forEach((a, k) => {
      if (k.startsWith('bg_') && k !== key) {
        try {
          a.pause();
          a.currentTime = 0;
        } catch (_) {}
      }
    });
    if (currentBgmKey === key) return;
    stopAll();
    const a = get(key);
    currentBgmKey = key;
    a.loop = true;
    a.volume = 0.12;
    const _p = a.play();
    if (_p && typeof _p.catch === 'function') {
      _p.catch(() => {
        // Autoplay blocked — reset so user-gesture retry works
        currentBgmKey = null;
      });
    }
  }

  function playSfxOnce(key, { resumeBgmKey } = {}) {
    stopSpeech();
    const a = new Audio(AUDIO_FILES[key]);
    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        resolve();
      };
      const t = window.setTimeout(finish, 2800);
      a.addEventListener('ended', () => {
        window.clearTimeout(t);
        finish();
      }, { once: true });
      try {
        a.loop = false;
        a.volume = 0.9;
        a.currentTime = 0;
        const p = a.play();
        if (p && typeof p.catch === 'function') p.catch(() => finish());
      } catch (_) {
        finish();
      }
    });
  }

  return { stopAll, playBgm, playSfxOnce };
})();

// =============================================================================
// TTS normalization (speech only)
// =============================================================================

const __ttsVoicePack = { en: null, ko: null, initDone: false };

/** Slightly slower than default, still natural (not stretched / not syllable-split). */
const TTS_RATE_NATURAL = 0.9;
const TTS_PITCH_NEUTRAL = 1.0;

// Korean TTS: slightly slower + slightly lower pitch reduces robotic feel
const TTS_RATE_KO = 0.80;
const TTS_PITCH_KO = 0.90;
const TTS_RATE_EN = TTS_RATE_NATURAL;
const TTS_PITCH_EN = TTS_PITCH_NEUTRAL;

function detectInAppBrowser() {
  const ua = navigator.userAgent || '';
  if (/KAKAOTALK/i.test(ua)) return 'kakao';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAV|FBAN/i.test(ua)) return 'facebook';
  if (/Line\//i.test(ua)) return 'line';
  if (/wv\b/.test(ua) && /Android/i.test(ua)) return 'android-webview';
  return null;
}

function normalizeForTTS(text) {
  let t = String(text || '');
  const pairs = [
    ['8282', '빨리빨리'],
    ['ㅠㅠ', '유유'],
    ['ㄴㄴ', '노노'],
    ['ㅎㅎ', '헤헤'],
    ['ㅋㅋ', '크크'],
  ];
  for (const [from, to] of pairs) t = t.split(from).join(to);
  return t;
}

function delayMs(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function finalizeKoreanTtsPhrase(s) {
  if (!s) return s;
  let out = String(s)
    .replace(/\s+/g, ' ')
    .replace(/[\u00B7\u22C5\u318D\u318E]/g, '')
    .trim();
  out = out.replace(/\.{2,}/g, '');
  return out.trim();
}

/** Single canonical Korean string for all TTS (question hint + answers + repeats). */
function koreanTtsTokenFromAnswer(raw) {
  let s = normalizeForTTS(String(raw || '').trim());
  if (!s) return s;
  const idx = s.search(/\s[\(（]/);
  if (idx > 0) s = s.slice(0, idx).trim();
  return finalizeKoreanTtsPhrase(s);
}

function pickPreferredVoices(voices) {
  const list = voices || [];
  const en =
    list.find((v) => /^en-US$/i.test(v.lang || '') && /Google|Microsoft|Zira|Samantha|Aria/i.test(v.name || '')) ||
    list.find((v) => /^en-GB$/i.test(v.lang || '') && /Google|Microsoft|Libby|George/i.test(v.name || '')) ||
    list.find((v) => /^en/i.test(v.lang || ''));
  const ko =
    list.find((v) => /^ko-KR$/i.test(v.lang || '') && /Google|Microsoft|Heami|Yuna|Female|Korean|Sun-Hi/i.test(v.name || '')) ||
    list.find((v) => /^ko/i.test(v.lang || ''));
  return { en, ko };
}

let __ttsVoicesHooked = false;

function initTtsVoices() {
  if (!window.speechSynthesis) return;
  const apply = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;
    const { en, ko } = pickPreferredVoices(voices);
    __ttsVoicePack.en = en || null;
    __ttsVoicePack.ko = ko || null;
    __ttsVoicePack.initDone = true;
  };
  apply();
  if (!__ttsVoicesHooked) {
    __ttsVoicesHooked = true;
    try {
      window.speechSynthesis.addEventListener('voiceschanged', apply);
    } catch (_) {}
  }
}

function attachPreferredVoice(utterance, lang) {
  if (lang === 'ko-KR' && __ttsVoicePack.ko) utterance.voice = __ttsVoicePack.ko;
  if (lang === 'en-US' && __ttsVoicePack.en) utterance.voice = __ttsVoicePack.en;
}

async function unlockTtsOnce() {
  if (ttsUnlocked) return true;
  if (!window.speechSynthesis) return false;

  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    u.rate = 1;
    u.pitch = 1;
    u.lang = 'ko-KR';

    await new Promise((resolve) => {
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
      // Same user-gesture stack as tap; allow immediate follow-up speaks (e.g. renderQuiz).
      ttsUnlocked = true;
      window.setTimeout(resolve, 120);
    });

    window.speechSynthesis.cancel();
    console.log('[K-PATCH] TTS unlocked');
    return true;
  } catch (e) {
    console.error('[K-PATCH ERROR] TTS unlock failed', e);
    return false;
  }
}

function speakAsync(text, lang, rateOverride) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !text) {
      resolve();
      return;
    }
    let payload;
    if (lang === 'ko-KR') {
      payload = finalizeKoreanTtsPhrase(normalizeForTTS(String(text)));
    } else {
      payload = String(text).replace(/\s+/g, ' ').trim();
    }
    if (!payload) {
      resolve();
      return;
    }
    if (!ttsUnlocked) {
      console.warn('[K-PATCH] TTS skipped because not unlocked yet');
      resolve();
      return;
    }
    const u = new SpeechSynthesisUtterance(payload);
    u.lang = lang;
    const isKo = lang === 'ko-KR';
    if (rateOverride !== undefined && rateOverride !== null) {
      u.rate = Math.min(1.1, Math.max(0.75, Number(rateOverride)));
      u.pitch = TTS_PITCH_NEUTRAL;
    } else {
      u.rate = isKo ? TTS_RATE_KO : TTS_RATE_EN;
      u.pitch = isKo ? TTS_PITCH_KO : TTS_PITCH_EN;
    }
    attachPreferredVoice(u, lang);
    const done = () => {
      u.onend = null;
      u.onerror = null;
      resolve();
    };
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

function speak(text, lang, rateOverride) {
  void speakAsync(text, lang, rateOverride);
}

function pacingGeneral() {
  return stageByIndex(state.currentStage).key === 'general';
}

function pacingMajor() {
  return stageByIndex(state.currentStage).key === 'major';
}

async function ttsQuestion(row) {
  stopSpeech();
  const sk = stageByIndex(state.currentStage).key;
  const gapEnToKo = sk === 'general' ? 2600 : sk === 'major' ? 1900 : sk === 'officer' ? 1500 : 1200;
  await speakAsync(String(row.context_en || ''), 'en-US');
  await delayMs(gapEnToKo);
  const koTok = koreanTtsTokenFromAnswer(row.correct);
  await speakAsync(koTok, 'ko-KR');
}

async function ttsCorrectTwice(row) {
  const token = koreanTtsTokenFromAnswer(row.correct);
  const sk = stageByIndex(state.currentStage).key;
  const betweenRep = sk === 'general' ? 2400 : sk === 'major' ? 1800 : sk === 'officer' ? 1400 : 1050;
  stopSpeech();
  await speakAsync(token, 'ko-KR');
  await delayMs(betweenRep);
  await speakAsync(token, 'ko-KR');
  await delayMs(sk === 'general' ? 650 : 400);
}

function triggerConfetti() {
  const root = $('confetti-root');
  if (!root) return;
  root.innerHTML = '';
  const colors = ['#ffd700', '#ffffff', '#ff8fa3', '#7ee8fa', '#c9ff7a'];
  for (let i = 0; i < 48; i += 1) {
    const b = document.createElement('span');
    b.className = 'confetti-bit';
    b.style.left = `${Math.random() * 100}%`;
    b.style.background = colors[i % colors.length];
    b.style.setProperty('--dx', `${(Math.random() - 0.5) * 180}px`);
    b.style.animationDuration = `${1.5 + Math.random() * 0.9}s`;
    b.style.animationDelay = `${Math.random() * 0.15}s`;
    root.appendChild(b);
  }
  window.setTimeout(() => {
    root.innerHTML = '';
  }, 2600);
}

function hapticCorrect() {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  } catch (_) {}
}

function hapticFail() {
  try {
    if (navigator.vibrate) navigator.vibrate([200]);
  } catch (_) {}
}

function syncIntroActionButtons() {
  /* Resume / restart handled by #modal-resume on Start Mission */
}

function showResumeModal() {
  const m = $('modal-resume');
  if (m) m.hidden = false;
}

function hideResumeModal() {
  const m = $('modal-resume');
  if (m) m.hidden = true;
}

function backToMainIntro() {
  showPhase(PHASE.INTRO_MAIN);
  setBackground(IMAGE_POOLS.intro[0]);
  AudioManager.playBgm('bg_intro');
  syncIntroActionButtons();
}

function backFromStageClearToQuiz() {
  state.choiceLocked = false;
  showPhase(PHASE.QUIZ);
  try {
    AudioManager.playBgm(stageByIndex(state.currentStage).bgmQuiz);
  } catch (_) {}
  renderQuiz();
}

function backFromCertToStageClear() {
  const s = stageByIndex(state.currentStage);
  const st = $('stage-clear-title');
  if (st) st.textContent = `${s.label_en} · ${s.label_kr}`;
  const descEl = $('stage-clear-desc');
  if (descEl) descEl.textContent = s.clearDescription;
  setBackground(backgroundForStage(state.currentStage, stageLen(state.currentStage) - 1));
  initPronTest();
  showPhase(PHASE.STAGE_CLEAR);
  try { AudioManager.playBgm('bg_intro'); } catch (_) {}
}

function usageLevelWarningText(row) {
  const u = String(row.usage_level || 'SAFE').toUpperCase();
  if (u === 'CASUAL') return '⚠️ Casual only';
  if (u === 'STREET') return '⚠️ Friends only / slang';
  return '';
}

// =============================================================================
// State model
// =============================================================================

const EXPECTED_COUNT = 95;
const DELAY_CORRECT_REVEAL_MS = 950;
const DELAY_AFTER_CORRECT_SFX_MS = 520;
const DELAY_BEFORE_CLEAR_SFX_GENERAL_MS = 900;
const DELAY_AFTER_TTS_BEFORE_NEXT_MS = 1100;
const DELAY_AFTER_TTS_BEFORE_NEXT_MAJOR_MS = 1500;
const DELAY_AFTER_TTS_BEFORE_NEXT_GENERAL_MS = 2600;

const state = {
  currentStage: 0,
  currentQuestionIndex: 0,
  currentPhase: PHASE.INTRO_MAIN,
  /** False until quiz DOM is painted; blocks stray clicks during stage→quiz. */
  quizChoicesEnabled: false,
  bank: [],
  dataReady: false,
  stageCorrect: Object.create(null),
  totalCorrect: 0,
  choiceLocked: false,
  pronScore: 0,
  pronPassed: false,
  pronTarget: '',
  pronScores: [],
  pronQuestions: [],
  pronCurrentIdx: 0,
  survey: {
    age: '',
    duration: '',
    theme: '',
    hardest: '',
    country: '',
    countryOther: '',
    email: '',
    suggestions: '',
  },
};

const LS_KEY = 'kpatch_quiz_progress_v1';
let bootResumeAvailable = false;

function persistProgress() {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        currentStage: state.currentStage,
        currentQuestionIndex: state.currentQuestionIndex,
        totalCorrect: state.totalCorrect,
      }),
    );
  } catch (_) {}
}

function clearPersistedProgress() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (_) {}
}

function loadPersistedProgress() {
  bootResumeAvailable = false;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return;
    let st = Number(o.currentStage);
    let qi = Number(o.currentQuestionIndex);
    let tc = Number(o.totalCorrect);
    if (!Number.isFinite(st)) st = 0;
    if (!Number.isFinite(qi)) qi = 0;
    if (!Number.isFinite(tc)) tc = 0;
    st = Math.max(0, Math.min(STAGES.length - 1, st));
    qi = Math.max(0, Math.min(EXPECTED_COUNT - 1, qi));
    tc = Math.max(0, Math.min(EXPECTED_COUNT, tc));
    state.currentStage = st;
    state.currentQuestionIndex = qi;
    state.totalCorrect = tc;
    bootResumeAvailable = st !== 0 || qi !== 0 || tc !== 0;
  } catch (_) {}
}

function alignStageToQuestionIndex() {
  const qi = state.currentQuestionIndex;
  for (let i = 0; i < STAGES.length; i += 1) {
    const a = stageStartIndex(i);
    const b = stageEndIndex(i);
    if (qi >= a && qi <= b) {
      state.currentStage = i;
      return;
    }
  }
}

function clampIndex(i) {
  return Math.max(0, Math.min((state.bank.length || 1) - 1, i));
}

function stageLocalIndex() {
  return state.currentQuestionIndex - stageStartIndex(state.currentStage);
}

function currentRow() {
  return state.bank[state.currentQuestionIndex] || null;
}

// =============================================================================
// Data load
// =============================================================================

async function loadBank() {
  state.dataReady = false;
  state.bank = [];

  if (isFileProtocol()) {
    toast('Open via local server.');
    return false;
  }
  if (!isAllowedOrigin()) {
    toast('Run this app via local server.');
    return false;
  }

  try {
    const res = await fetch('questions_bank.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bank = await res.json();

    if (!Array.isArray(bank) || bank.length !== EXPECTED_COUNT) {
      throw new Error(`Expected ${EXPECTED_COUNT} questions, got ${Array.isArray(bank) ? bank.length : 'non-array'}`);
    }

    const sorted = [...bank].sort((a, b) => Number(a.id) - Number(b.id));
    for (let i = 0; i < sorted.length; i += 1) {
      const expectedId = i + 1;
      const got = Number(sorted[i]?.id);
      if (got !== expectedId) {
        throw new Error(`Question id mismatch at index ${i}: expected ${expectedId}, got ${got}`);
      }
      if (!validateQuestionRow(sorted[i], { silent: true })) {
        throw new Error(`Invalid question row id ${sorted[i]?.id}`);
      }
      const ul = String(sorted[i].usage_level || 'SAFE').toUpperCase();
      sorted[i].usage_level = ['SAFE', 'CASUAL', 'STREET'].includes(ul) ? ul : 'SAFE';
    }

    state.bank = sorted;
    state.dataReady = true;
    console.log('[K-PATCH] questions_bank.json loaded OK', { count: state.bank.length });
    return true;
  } catch (e) {
    console.error('[K-PATCH ERROR] questions_bank.json load failed:', e?.message || e);
    toast('Data failed to load.');
    state.bank = [];
    state.dataReady = false;
    return false;
  }
}

// =============================================================================
// Quiz engine
// =============================================================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function validateQuestionRow(row, { silent } = {}) {
  if (!row) {
    if (!silent) toast('Question missing.');
    return false;
  }
  const cor = row.correct;
  if (cor === undefined || cor === null || String(cor).trim() === '') {
    if (!silent) toast('Question invalid (no correct).');
    return false;
  }
  const ch = row.choices;
  if (!Array.isArray(ch) || ch.length < 2) {
    if (!silent) toast('Question invalid (choices).');
    return false;
  }
  return true;
}

function updateHintVideo(row) {
  const box = $('hint-video-box');
  const vid = $('hint-video');
  if (!box || !vid) return;
  const src = row && (row.hint_video || row.video) ? String(row.hint_video || row.video).trim() : '';
  if (!src) {
    box.hidden = true;
    try {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
    } catch (_) {}
    return;
  }
  box.hidden = false;
  try {
    const path = 'assets/video/' + src;
    if (vid.getAttribute('src') !== path) {
      vid.src = path;
      vid.load();
    }
  } catch (_) {}
}

function flashWrong() {
  const flash = $('red-flash');
  if (!flash) return;
  flash.classList.add('is-on');
  window.setTimeout(() => flash.classList.remove('is-on'), 110);
}

function renderStageIntro() {
  const s = stageByIndex(state.currentStage);

  const title = $('stage-intro-title');
  const range = $('stage-intro-range');
  const desc = $('stage-intro-desc');

  if (!title || !range || !desc) {
    console.error('[K-PATCH ERROR] Stage-intro DOM missing');
    return;
  }

  title.textContent = `${s.introTitle} (${s.label_en})`;
  range.textContent = `${s.startId} – ${s.endId}`;
  desc.textContent = s.introDescription;

  const tone = $('stage-intro-tone');
  if (tone) {
    tone.style.whiteSpace = 'pre-line';
    tone.textContent = `${s.tone_en}\n${s.tone_kr}`;
  }
  const tut = $('usage-tutorial-stage');
  if (tut) tut.hidden = state.currentStage !== 0;

  setBackground(backgroundForStage(state.currentStage, 0));
}

function renderQuiz() {
  if (!state.dataReady) {
    toast('Questions not loaded yet.');
    return;
  }

  const s = stageByIndex(state.currentStage);
  const row = currentRow();
  if (!validateQuestionRow(row)) {
    return;
  }

  state.quizChoicesEnabled = false;

  const id = Number(row.id);
  const local = stageLocalIndex();
  const total = stageLen(state.currentStage);

  $('quiz-stage-badge').textContent = `${s.label_kr} (${s.label_en})`;
  $('quiz-stage-range').textContent = `${s.startId}–${s.endId}`;
  $('quiz-local-pos').textContent = String(local + 1);
  $('quiz-local-total').textContent = String(total);
  $('quiz-global-id').textContent = ` · id ${id}`;

  $('quiz-prompt-en').textContent = String(row.context_en || '');
  $('quiz-prompt-ko').textContent = String(row.context_kr || '').trim();

  const uw = $('quiz-usage-warning');
  const uwt = usageLevelWarningText(row);
  if (uw) {
    uw.textContent = uwt;
    uw.hidden = !uwt;
  }

  const qp = $('phase-quiz');
  if (qp) qp.classList.toggle('phase-quiz--general', s.key === 'general');

  setBackground(backgroundForStage(state.currentStage, local));

  const choiceVals = row.choices.map(String);
  const labelsIn = Array.isArray(row.choice_labels) ? row.choice_labels.map(String) : choiceVals.slice();
  const pairs = choiceVals.map((value, i) => ({
    value,
    label: labelsIn[i] !== undefined ? String(labelsIn[i]) : value,
  }));
  const shuffled = shuffle(pairs);

  const wrap = $('options-wrap');
  wrap.innerHTML = '';

  shuffled.forEach(({ value, label }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-option glass-panel';
    b.textContent = label;
    b.addEventListener('click', () => onPick(value));
    wrap.appendChild(b);
  });

  updateHintVideo(row);
  void ttsQuestion(row).catch((e) => {
    console.error('[K-PATCH ERROR] Question TTS failed', e);
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (state.currentPhase !== PHASE.QUIZ) return;
      state.quizChoicesEnabled = true;
    });
  });
}

function goToStageClear() {
  const s = stageByIndex(state.currentStage);
  const st = $('stage-clear-title');
  if (st) st.textContent = `${s.label_en} · ${s.label_kr}`;
  $('stage-clear-desc').textContent = s.clearDescription;
  setBackground(backgroundForStage(state.currentStage, stageLen(state.currentStage) - 1));
  initPronTest();
  showPhase(PHASE.STAGE_CLEAR);
}

function computeRank() {
  const total = EXPECTED_COUNT;
  const correct = Math.max(0, Math.min(state.totalCorrect, total));
  const acc = total ? Math.round((correct / total) * 100) : 0;
  // Stage-based rank: P-1(훈련병) → P-2(병) → P-3(부사관) → P-4(위관) → P-6(영관) → P-8(장군)
  const STAGE_RANKS = ['P-1', 'P-2', 'P-3', 'P-4', 'P-6', 'P-8'];
  const rank = STAGE_RANKS[Math.min(state.currentStage, STAGE_RANKS.length - 1)];
  return { rank, acc, correct, total };
}

function renderCert() {
  const s = stageByIndex(state.currentStage);
  const stKey = s.key;
  const stCorrect = Number(state.stageCorrect[stKey] || 0);
  const stTotal = stageLen(state.currentStage);
  const { rank, acc, correct, total } = computeRank();

  $('cert-title').textContent = `${s.certTitle} / ${s.label_en} Cert`;
  $('cert-subtitle').textContent = s.certSubtitle;
  $('cert-rank').textContent = rank;
  $('cert-stage-label').textContent = s.label_kr;
  const certEnEl = $('cert-stage-label-en');
  if (certEnEl) certEnEl.textContent = s.label_en;
  $('cert-stage-range').textContent = `${s.startId}–${s.endId}`;
  $('cert-stage-correct').textContent = String(stCorrect);
  $('cert-stage-total').textContent = String(stTotal);
  $('cert-total-correct').textContent = String(correct);
  $('cert-total-total').textContent = String(total);
  $('cert-acc').textContent = String(acc);
  const pronEl = $('cert-pron-score');
  if (pronEl) {
    pronEl.textContent = state.pronPassed ? `${state.pronScore}%` : '—';
  }

  setBackground(IMAGE_POOLS.ending[0]);
  showPhase(PHASE.CERT_CARD);
}

function onPick(choice) {
  if (transitionLock) return;
  if (state.choiceLocked) return;
  if (state.currentPhase !== PHASE.QUIZ) return;
  if (!state.quizChoicesEnabled) return;

  const row = currentRow();
  if (!row) return;
  if (!validateQuestionRow(row)) return;

  const koPrompt = $('quiz-prompt-ko');

  void unlockTtsOnce();

  if (String(choice) === String(row.correct)) {
    state.choiceLocked = true;
    state.totalCorrect += 1;

    const sk = stageByIndex(state.currentStage).key;
    state.stageCorrect[sk] = Number(state.stageCorrect[sk] || 0) + 1;
    persistProgress();

    const endIdx = stageEndIndex(state.currentStage);
    const isLastInStage = state.currentQuestionIndex >= endIdx;
    const isFinalOverall = state.currentStage === STAGES.length - 1 && isLastInStage;

    const rowSnap = row;

    void (async () => {
      await delayMs(DELAY_CORRECT_REVEAL_MS);
      if (koPrompt) koPrompt.textContent = String(rowSnap.correct);
      triggerConfetti();
      hapticCorrect();
      await delayMs(380);
      await AudioManager.playSfxOnce('sfx_correct');
      await AudioManager.playSfxOnce('sfx_correct_react');
      await delayMs(DELAY_AFTER_CORRECT_SFX_MS);
      await ttsCorrectTwice(rowSnap).catch((e) => {
        console.error('[K-PATCH ERROR] Correct TTS failed', e);
      });
      let pauseNext = DELAY_AFTER_TTS_BEFORE_NEXT_MS;
      if (pacingMajor()) pauseNext = DELAY_AFTER_TTS_BEFORE_NEXT_MAJOR_MS;
      if (pacingGeneral()) pauseNext = DELAY_AFTER_TTS_BEFORE_NEXT_GENERAL_MS;
      await delayMs(pauseNext);
      if (isLastInStage) {
        const preClear = pacingGeneral() ? DELAY_BEFORE_CLEAR_SFX_GENERAL_MS : 420;
        await delayMs(preClear);
        const clearSfx = isFinalOverall ? 'sfx_final_clear' : 'sfx_stage_clear';
        await AudioManager.playSfxOnce(clearSfx, {});
        state.choiceLocked = false;
        goToStageClear();
        return;
      }

      state.currentQuestionIndex = clampIndex(state.currentQuestionIndex + 1);
      state.choiceLocked = false;
      persistProgress();
      showPhase(PHASE.QUIZ);
      renderQuiz();
    })();

    return;
  }

  flashWrong();
  hapticFail();
  if (koPrompt) koPrompt.textContent = `정답: ${String(row.correct)}`;
  toast('Incorrect. Try again.');

  const resumeBgmKey = stageByIndex(state.currentStage).bgmQuiz;
  void AudioManager.playSfxOnce('sfx_fail', { resumeBgmKey }).then(async () => {
    await speakAsync('에바지', 'ko-KR');
  });
}

function quizBack() {
  const start = stageStartIndex(state.currentStage);
  if (state.currentQuestionIndex <= start) {
    state.choiceLocked = false;
    showPhase(PHASE.STAGE_INTRO);
    AudioManager.playBgm('bg_intro');
    renderStageIntro();
    return;
  }

  state.currentQuestionIndex = clampIndex(state.currentQuestionIndex - 1);
  state.choiceLocked = false;
  persistProgress();
  showPhase(PHASE.QUIZ);
  AudioManager.playBgm(stageByIndex(state.currentStage).bgmQuiz);
  renderQuiz();
}

// =============================================================================
// Survey UI
// =============================================================================

function syncSurveyUI() {
  function syncRow(containerId, val) {
    const host = $(containerId);
    if (!host) return;
    const v = val || '';
    host.querySelectorAll('.chip').forEach((b) => {
      b.classList.toggle('is-active', v && b.getAttribute('data-value') === v);
    });
  }

  syncRow('survey-age', state.survey.age);
  syncRow('survey-duration', state.survey.duration);
  syncRow('survey-theme', state.survey.theme);
  syncRow('survey-hardest', state.survey.hardest);

  const sel = $('survey-country');
  const other = $('survey-country-other');

  if (sel) sel.value = state.survey.country || '';
  if (other) {
    other.value = state.survey.countryOther || '';
    other.hidden = (sel?.value || '') !== 'Other';
  }

  const em = $('survey-email');
  if (em) em.value = state.survey.email || '';
}

function bindSurveyChips() {
  function bindRow(containerId, key) {
    const host = $(containerId);
    if (!host) return;
    host.addEventListener('click', (e) => {
      if (transitionLock) return;
      const btn = e.target?.closest?.('button.chip');
      if (!btn) return;
      const val = btn.getAttribute('data-value') || '';
      state.survey[key] = val;
      host.querySelectorAll('.chip').forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-value') === val);
      });
    });
  }

  bindRow('survey-age', 'age');
  bindRow('survey-duration', 'duration');
  bindRow('survey-theme', 'theme');
  bindRow('survey-hardest', 'hardest');

  const sel = $('survey-country');
  const other = $('survey-country-other');

  if (sel) {
    sel.addEventListener('change', () => {
      state.survey.country = sel.value || '';
      if (other) other.hidden = sel.value !== 'Other';
    });
  }

  if (other) {
    other.addEventListener('input', () => {
      state.survey.countryOther = other.value || '';
    });
  }

  const em = $('survey-email');
  if (em) {
    em.addEventListener('input', () => {
      state.survey.email = em.value || '';
    });
  }
}

// =============================================================================
// Navigation
// =============================================================================

function goIntroMain() {
  hideResumeModal();
  clearPersistedProgress();
  try { localStorage.removeItem('kpatch_phase'); } catch (_) {}
  bootResumeAvailable = false;
  state.currentStage = 0;
  state.currentQuestionIndex = 0;
  state.totalCorrect = 0;
  state.stageCorrect = Object.create(null);
  state.choiceLocked = false;
  state.pronScore = 0;
  state.pronPassed = false;
  state.pronTarget = '';
  state.pronScores = [];
  state.pronQuestions = [];
  state.pronCurrentIdx = 0;
  showPhase(PHASE.INTRO_MAIN);
  setBackground(IMAGE_POOLS.intro[0]);
  AudioManager.playBgm('bg_intro');
  $('btn-battle-start').disabled = !state.dataReady;

  const v = $('hero-video');
  if (v) {
    try {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }
  syncIntroActionButtons();
}

function goStageIntro(stageIdx) {
  state.currentStage = Math.max(0, Math.min(STAGES.length - 1, stageIdx));
  state.currentQuestionIndex = stageStartIndex(state.currentStage);
  state.choiceLocked = false;
  showPhase(PHASE.STAGE_INTRO);
  renderStageIntro();
  try {
    if (state.currentStage !== STAGES.length - 1) {
      AudioManager.playBgm('bg_intro');
    }
  } catch (e) {
    console.error('[K-PATCH ERROR] goStageIntro: playBgm failed', e?.message || e);
  }
  persistProgress();
  syncIntroActionButtons();
}

function goQuiz() {
  if (!state.dataReady) {
    toast('Questions are not ready.');
    return;
  }
  showPhase(PHASE.QUIZ);
  try {
    AudioManager.playBgm(stageByIndex(state.currentStage).bgmQuiz);
  } catch (e) {
    console.error('[K-PATCH ERROR] goQuiz: playBgm failed', e?.message || e);
  }
  try {
    renderQuiz();
  } catch (e) {
    console.error('[K-PATCH ERROR] goQuiz: renderQuiz failed', e?.message || e);
  }
  persistProgress();
}

function goSurvey() {
  showPhase(PHASE.SURVEY);
  syncSurveyUI();
  setBackground(IMAGE_POOLS.ending[0]);
  AudioManager.stopAll();
}

function goSubscribe() {
  showPhase(PHASE.SUBSCRIBE_UNLOCK);
  setBackground(IMAGE_POOLS.ending[0]);
  AudioManager.stopAll();
  try { localStorage.setItem('kpatch_phase', 'subscribe'); } catch (_) {}
  // Reset subscribe screen state
  const continueBtn = $('btn-subscribe-continue');
  if (continueBtn) continueBtn.disabled = true;
  const confirmedBtn = $('btn-subscribe-confirmed');
  if (confirmedBtn) {
    confirmedBtn.style.opacity = '';
    confirmedBtn.disabled = true;
  }
  // Check if user already clicked YouTube (persisted across navigation)
  window.setTimeout(() => checkYoutubeSubscribeTimer(), 100);
}

function goEnding() {
  showPhase(PHASE.ENDING);
  setBackground(IMAGE_POOLS.ending[0]);
  // Emotional Gayageum-style ambient outro (see AUDIO_FILES hook: bg_ending)
  AudioManager.playBgm('bg_ending');
}

function afterCertContinue() {
  const s = stageByIndex(state.currentStage);
  if (s.key === 'recruit') {
    clearPersistedProgress();
    bootResumeAvailable = false;
    goSurvey();
    return;
  }
  if (s.key === 'nco') {
    clearPersistedProgress();
    bootResumeAvailable = false;
    goSubscribe();
    return;
  }
  if (s.key === 'general') {
    clearPersistedProgress();
    bootResumeAvailable = false;
    goEnding();
    return;
  }
  goStageIntro(state.currentStage + 1);
}

// =============================================================================
// Video fallback
// =============================================================================

function wireVideoFallback() {
  const video = $('hero-video');
  const fallback = $('video-fallback');
  if (!video || !fallback) return;

  const showFallback = () => {
    try { video.style.display = 'none'; } catch (_) {}
    fallback.hidden = false;
  };

  video.addEventListener('error', showFallback);
  window.addEventListener('load', () => {
    const src = video.querySelector('source')?.getAttribute('src') || '';
    if (!src) showFallback();
  });
}

// =============================================================================
// Pronunciation Test Engine  (5 random expressions per stage)
// =============================================================================

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j :
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] :
        1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function pronunciationScore(expected, heard) {
  const e = (expected || '').trim().replace(/\s+/g, '').replace(/[…\.?!]/g, '');
  const h = (heard || '').trim().replace(/\s+/g, '');
  if (!e) return 100;
  if (!h) return 0;
  if (e === h) return 100;
  const dist = levenshtein(e, h);
  return Math.max(0, Math.round((1 - dist / Math.max(e.length, h.length)) * 100));
}

function getPronTargets(count) {
  const startIdx = stageStartIndex(state.currentStage);
  const endIdx = stageEndIndex(state.currentStage);
  const pool = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const expr = state.bank[i]?.correct;
    if (expr) pool.push(expr);
  }
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function renderPronQuestion() {
  const idx = state.pronCurrentIdx;
  const total = state.pronQuestions.length;
  const target = state.pronQuestions[idx] || '—';
  state.pronTarget = target;

  const targetEl = $('pron-target');
  if (targetEl) targetEl.textContent = target;

  const progressEl = $('pron-progress');
  if (progressEl) progressEl.textContent = `${idx + 1} / ${total}`;

  const resultEl = $('pron-result');
  if (resultEl) resultEl.hidden = true;

  const finalEl = $('pron-final');
  if (finalEl) finalEl.hidden = true;

  const nextBtn = $('btn-pron-next');
  if (nextBtn) nextBtn.hidden = true;

  const recordBtn = $('btn-pron-record');
  if (recordBtn) recordBtn.hidden = false;

  const enLbl = $('pron-btn-label-en');
  const koLbl = $('pron-btn-label-ko');
  if (enLbl) enLbl.textContent = '🎤 TAP TO SPEAK';
  if (koLbl) koLbl.textContent = '탭하여 말하기';

  // Update NEXT button label for last question
  const nextEnLbl = $('pron-next-label-en');
  const nextKoLbl = $('pron-next-label-ko');
  if (nextEnLbl) nextEnLbl.textContent = idx >= total - 1 ? 'FINISH ✓' : 'NEXT →';
  if (nextKoLbl) nextKoLbl.textContent = idx >= total - 1 ? '완료' : '다음';
}

function showPronFinal() {
  const scores = state.pronScores;
  const avg = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;
  state.pronScore = avg;
  state.pronPassed = true; // Always unlock after attempting all questions

  const finalEl = $('pron-final');
  if (finalEl) finalEl.hidden = false;

  const finalScoreEl = $('pron-final-score');
  if (finalScoreEl) {
    const passed = avg >= 60;
    finalScoreEl.textContent = passed
      ? `🎖️ Average ${avg}pts — PASS! / 합격!`
      : `💪 Average ${avg}pts — Keep practicing! / 계속 도전!`;
    finalScoreEl.style.color = passed
      ? 'rgba(100,255,120,0.95)'
      : 'rgba(255,210,80,0.95)';
  }

  // Hide speak button, result row
  const recordBtn = $('btn-pron-record');
  if (recordBtn) recordBtn.hidden = true;
  const resultEl = $('pron-result');
  if (resultEl) resultEl.hidden = true;

  // Enable cert button
  const certBtn = $('btn-stage-clear-next');
  if (certBtn) certBtn.disabled = false;

  if (avg >= 60) {
    triggerConfetti();
    AudioManager.playSfxOnce('sfx_stage_clear');
  } else {
    AudioManager.playSfxOnce('sfx_fail');
  }
}

let _lastPronScore = 0;
let _lastPronHeard = '';

function onPronResult(score, heard) {
  _lastPronScore = score;
  _lastPronHeard = heard;

  const resultEl = $('pron-result');
  if (resultEl) resultEl.hidden = false;

  const scoreLine = $('pron-score-line');
  if (scoreLine) {
    const emoji = score >= 60 ? '✅' : score >= 40 ? '🟡' : '❌';
    scoreLine.textContent = `${emoji} ${score}pts`;
    scoreLine.style.color = score >= 60
      ? 'rgba(100,255,120,0.9)'
      : score >= 40 ? 'rgba(255,220,80,0.9)' : 'rgba(255,110,110,0.9)';
  }

  const heardLine = $('pron-heard-line');
  if (heardLine) heardLine.textContent = heard ? `"${heard}"` : '';

  // Show NEXT/FINISH button
  const nextBtn = $('btn-pron-next');
  if (nextBtn) nextBtn.hidden = false;
}

function initPronTest() {
  state.pronScores = [];
  state.pronQuestions = getPronTargets(5);
  state.pronCurrentIdx = 0;
  state.pronScore = 0;
  state.pronPassed = false;

  const certBtn = $('btn-stage-clear-next');
  if (certBtn) certBtn.disabled = true;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const noSupportWrap = $('pron-no-support-wrap');

  if (!SR) {
    if (noSupportWrap) noSupportWrap.hidden = false;
    const recordBtn = $('btn-pron-record');
    if (recordBtn) recordBtn.hidden = true;
    const targetEl = $('pron-target');
    if (targetEl) targetEl.textContent = '—';
    const progressEl = $('pron-progress');
    if (progressEl) progressEl.textContent = '—';
  } else {
    if (noSupportWrap) noSupportWrap.hidden = true;
    renderPronQuestion();
  }
}

let _pronRecognition = null;

function startPronRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  if (_pronRecognition) {
    try { _pronRecognition.abort(); } catch (_) {}
    _pronRecognition = null;
  }

  const enLbl = $('pron-btn-label-en');
  const koLbl = $('pron-btn-label-ko');
  if (enLbl) enLbl.textContent = '🎙️ LISTENING…';
  if (koLbl) koLbl.textContent = '듣는 중…';

  const recognition = new SR();
  recognition.lang = 'ko-KR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.onresult = (event) => {
    const alts = Array.from(event.results[0]).map((r) => r.transcript.trim());
    const bestScore = alts.reduce((best, h) => Math.max(best, pronunciationScore(state.pronTarget, h)), 0);
    const bestHeard = alts.reduce((bh, h) =>
      pronunciationScore(state.pronTarget, h) >= pronunciationScore(state.pronTarget, bh) ? h : bh
    , alts[0] || '');
    onPronResult(bestScore, bestHeard);
    _pronRecognition = null;
    if (enLbl) enLbl.textContent = '🎤 SPEAK AGAIN';
    if (koLbl) koLbl.textContent = '다시 말하기';
  };

  recognition.onerror = (e) => {
    _pronRecognition = null;
    if (enLbl) enLbl.textContent = '🎤 TAP TO SPEAK';
    if (koLbl) koLbl.textContent = '탭하여 말하기';
    const scoreLine = $('pron-score-line');
    const resultEl = $('pron-result');
    if (resultEl) resultEl.hidden = false;
    const nextBtn = $('btn-pron-next');
    if (nextBtn) nextBtn.hidden = false;
    if (scoreLine) {
      scoreLine.textContent = e.error === 'no-speech'
        ? '⚠️ No speech detected. Try again. / 소리가 감지되지 않았어요.'
        : `⚠️ Try again. / 다시 시도해주세요.`;
      scoreLine.style.color = 'rgba(255,200,80,0.9)';
    }
    _lastPronScore = 0;
    _lastPronHeard = '';
  };

  recognition.onend = () => { _pronRecognition = null; };

  try {
    recognition.start();
    _pronRecognition = recognition;
  } catch (e) {
    console.error('[K-PATCH] SpeechRecognition start failed:', e);
  }
}

// =============================================================================
function bindPrimaryTap(el, handler) {
  if (!el) return;

  let handledAt = 0;

  const wrapped = (e) => {
    const now = Date.now();

    if (transitionLock) return;

    // dedupe near-duplicate events
    if (now - handledAt < 450) return;
    handledAt = now;

    try {
      e.stopPropagation();
      if (e.type === 'touchend') e.preventDefault();
    } catch (_) {}

    try {
      handler(e);
    } catch (err) {
      console.error('[K-PATCH ERROR] bindPrimaryTap handler', err?.message || err);
    }
  };

  if (window.PointerEvent) {
    el.addEventListener('pointerup', wrapped, { passive: true });
  }

  el.addEventListener('click', wrapped, { passive: false });

  if (!window.PointerEvent) {
    el.addEventListener('touchend', wrapped, { passive: false });
  }
}

// =============================================================================
// Subscribe Timer (global scope — accessible from goSubscribe)
// =============================================================================

function checkYoutubeSubscribeTimer() {
  const clicked = Number(localStorage.getItem('kpatch_yt_clicked') || 0);
  if (!clicked) return;
  const elapsed = (Date.now() - clicked) / 1000;
  const WAIT = 5;
  const confirmedBtn = $('btn-subscribe-confirmed');
  const wrap = $('subscribe-countdown-wrap');
  const txt = $('subscribe-countdown-text');
  if (elapsed >= WAIT) {
    if (confirmedBtn) confirmedBtn.disabled = false;
    if (wrap) wrap.hidden = false;
    if (txt) txt.textContent = '✅ 구독 완료 후 아래 버튼을 눌러주세요! / Tap below after subscribing!';
  } else {
    if (wrap) wrap.hidden = false;
    let remaining = Math.ceil(WAIT - elapsed);
    if (txt) txt.textContent = `${remaining}초 후 활성화됩니다… / Activating in ${remaining}s…`;
    const iv = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(iv);
        if (confirmedBtn) confirmedBtn.disabled = false;
        if (txt) txt.textContent = '✅ 구독 완료 후 아래 버튼을 눌러주세요! / Tap below after subscribing!';
      } else {
        if (txt) txt.textContent = `${remaining}초 후 활성화됩니다… / Activating in ${remaining}s…`;
      }
    }, 1000);
  }
}

// =============================================================================
// Wire UI
// =============================================================================

function resumeMission() {
  if (!state.dataReady) {
    toast('Questions are not ready.');
    return;
  }
  alignStageToQuestionIndex();
  bootResumeAvailable = false;
  syncIntroActionButtons();
  showPhase(PHASE.QUIZ);
  try {
    AudioManager.playBgm(stageByIndex(state.currentStage).bgmQuiz);
  } catch (e) {
    console.error('[K-PATCH ERROR] resumeMission BGM failed', e?.message || e);
  }
  renderQuiz();
  persistProgress();
}

function startMissionOpeningSequence() {
  if (!state.dataReady) {
    toast('Questions are not ready.');
    return;
  }

  const btn = $('btn-battle-start');
  if (btn) btn.disabled = true;

  try {
    $('intro-sync-hint')?.removeAttribute('hidden');
  } catch (_) {}

  (async () => {
    try {
      await AudioManager.playSfxOnce('sfx_opening');
      await delayMs(300);
    } catch (e) {
      console.error('[K-PATCH ERROR] Opening SFX failed', e);
    }

    try {
      $('intro-sync-hint')?.setAttribute('hidden', 'true');
      goStageIntro(0);
    } catch (e) {
      console.error('[K-PATCH ERROR] Transition failed', e);
    }

    if (btn) btn.disabled = false;
  })();
}

function wireUI() {
  const hintVideo = document.getElementById('hint-video');
  if (hintVideo) {
    hintVideo.addEventListener('play', () => {
      // 아무것도 하지 않음 (BGM 유지)
    });
    hintVideo.addEventListener('ended', () => {
      if (state && state.currentStage !== undefined) {
        const bgmKey = stageByIndex(state.currentStage).bgmQuiz;
        AudioManager.playBgm(bgmKey);
      }
    });
    hintVideo.addEventListener('pause', () => {
      if (!hintVideo.ended) return;
      const bgmKey = stageByIndex(state.currentStage).bgmQuiz;
      AudioManager.playBgm(bgmKey);
    });
  }

  $('btn-intro-audio')?.addEventListener('click', () => {
    if (transitionLock) return;
    AudioManager.playBgm('bg_intro');
  });

  const battleStartBtn = $('btn-battle-start');
  bindPrimaryTap(battleStartBtn, () => {
    if (transitionLock) return;
    if (!state.dataReady) {
      console.error('[K-PATCH ERROR] Battle Start: data not ready');
      toast('Questions are not ready.');
      return;
    }
    if (bootResumeAvailable) {
      showResumeModal();
      return;
    }
    transitionLock = true;
    void unlockTtsOnce();
    startMissionOpeningSequence();
    window.setTimeout(() => {
      transitionLock = false;
    }, 800);
  });

  $('btn-modal-resume')?.addEventListener('click', () => {
    if (transitionLock) return;
    hideResumeModal();
    resumeMission();
  });
  $('btn-modal-restart')?.addEventListener('click', () => {
    if (transitionLock) return;
    hideResumeModal();
    goIntroMain();
  });
  $('btn-modal-cancel')?.addEventListener('click', () => {
    if (transitionLock) return;
    hideResumeModal();
  });

  const modalResume = $('modal-resume');
  if (modalResume) {
    modalResume.addEventListener('click', (e) => {
      if (transitionLock) return;
      if (e.target === modalResume) hideResumeModal();
    });
  }

  $('btn-stage-intro-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  $('btn-stage-intro-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    const s = stageByIndex(state.currentStage);
    if (state.currentStage === 0) {
      // recruit → go to intro
      backToMainIntro();
    } else if (s.key === 'soldier') {
      // soldier came from survey
      goSurvey();
    } else if (s.key === 'officer') {
      // officer came from subscribe
      goSubscribe();
    } else {
      // other stages came from cert of previous stage
      const prevStage = state.currentStage - 1;
      state.currentStage = prevStage;
      showPhase(PHASE.CERT_CARD);
      renderCert();
    }
  });

  const stageStartBtn = $('btn-stage-intro-start');
  bindPrimaryTap(stageStartBtn, () => {
    if (transitionLock) return;
    void unlockTtsOnce();
    transitionLock = true;
    if (stageStartBtn) stageStartBtn.disabled = true;
    try {
      goQuiz();
    } catch (err) {
      console.error('[K-PATCH ERROR] Stage Intro Start failed:', err?.message || err);
    } finally {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          transitionLock = false;
          if (stageStartBtn) stageStartBtn.disabled = false;
        });
      });
    }
  });

  $('btn-quiz-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    quizBack();
  });
  $('btn-quiz-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });

  $('btn-stage-clear-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  $('btn-stage-clear-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    backFromStageClearToQuiz();
  });
  $('btn-stage-clear-next')?.addEventListener('click', () => {
    if (transitionLock) return;
    renderCert();
  });

  $('btn-cert-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  $('btn-cert-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    backFromCertToStageClear();
  });
  $('btn-cert-continue')?.addEventListener('click', () => {
    if (transitionLock) return;
    afterCertContinue();
  });

  $('btn-survey-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    // Survey is always the checkpoint after Recruit (stage 0).
    // Reset to stage 0 so BACK always shows Recruit cert, not the next stage's cert.
    state.currentStage = 0;
    renderCert();
  });
  $('btn-survey-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  async function submitSurveyData() {
    try {
      await fetch('https://formspree.io/f/mdabggnd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          age: state.survey.age,
          country: state.survey.country || state.survey.countryOther,
          duration: state.survey.duration,
          theme: state.survey.theme,
          hardest: state.survey.hardest,
          suggestions: state.survey.suggestions || '',
          email: state.survey.email || '',
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (_) {}
  }

  $('btn-survey-continue')?.addEventListener('click', () => {
    if (transitionLock) return;
    submitSurveyData();
    goStageIntro(1);
  });

  $('btn-subscribe-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  $('btn-subscribe-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    // stage=3(officer) means user came via: NCO cert→subscribe→officer stage intro→BACK→subscribe
    // → must show NCO cert (stage 2)
    // stage=5(general) means user came via: ending→BACK→subscribe
    // → show general cert (stage 5)
    // stage=2(nco) means user just arrived at subscribe from NCO cert directly
    // → show NCO cert (stage 2)
    if (state.currentStage === 3) {
      state.currentStage = 2;
    }
    renderCert();
  });
  $('btn-subscribe-continue')?.addEventListener('click', () => {
    if (transitionLock) return;
    try { localStorage.removeItem('kpatch_phase'); } catch (_) {}
    goStageIntro(3); // officer (46–70)
  });

  $('btn-ending-home')?.addEventListener('click', () => {
    if (transitionLock) return;
    goIntroMain();
  });
  $('btn-ending-back')?.addEventListener('click', () => {
    if (transitionLock) return;
    goSubscribe();
  });

  // ── Pronunciation test handlers ──
  $('btn-pron-record')?.addEventListener('click', () => {
    if (transitionLock) return;
    startPronRecognition();
  });

  $('btn-pron-retry')?.addEventListener('click', () => {
    // Hide result, re-show speak button for same question (don't commit score)
    const resultEl = $('pron-result');
    if (resultEl) resultEl.hidden = true;
    const nextBtn = $('btn-pron-next');
    if (nextBtn) nextBtn.hidden = true;
    const enLbl = $('pron-btn-label-en');
    const koLbl = $('pron-btn-label-ko');
    if (enLbl) enLbl.textContent = '🎤 TAP TO SPEAK';
    if (koLbl) koLbl.textContent = '탭하여 말하기';
  });

  $('btn-pron-next')?.addEventListener('click', () => {
    // Commit score for current question
    state.pronScores.push(_lastPronScore);

    const idx = state.pronCurrentIdx;
    const total = state.pronQuestions.length;

    if (idx >= total - 1) {
      // Last question done → confetti + sfx → show final
      triggerConfetti();
      AudioManager.playSfxOnce('sfx_correct');
      showPronFinal();
    } else {
      // Advance to next question
      state.pronCurrentIdx++;
      renderPronQuestion();
    }
  });

  // No-support skip: fill 0s and show final
  $('btn-pron-skip-nosupport')?.addEventListener('click', () => {
    const remaining = state.pronQuestions.length - state.pronCurrentIdx;
    for (let i = 0; i < remaining; i++) state.pronScores.push(0);
    showPronFinal();
  });

  // ── Subscribe: YouTube link → save timestamp to localStorage ──
  $('btn-youtube-link')?.addEventListener('click', () => {
    localStorage.setItem('kpatch_yt_clicked', String(Date.now()));
    const wrap = $('subscribe-countdown-wrap');
    const txt = $('subscribe-countdown-text');
    if (wrap) wrap.hidden = false;
    if (txt) txt.textContent = '유튜브 구독 후 돌아오세요! / Come back after subscribing!';
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkYoutubeSubscribeTimer();
    }
  });

  // ── Subscribe: confirmed button unlocks continue ──
  $('btn-subscribe-confirmed')?.addEventListener('click', () => {
    if (transitionLock) return;
    localStorage.removeItem('kpatch_yt_clicked');
    const continueBtn = $('btn-subscribe-continue');
    if (continueBtn) continueBtn.disabled = false;
    toast('구독 확인! 잠금 해제 / Subscription confirmed! Unlocked.');
    const confirmedBtn = $('btn-subscribe-confirmed');
    if (confirmedBtn) confirmedBtn.style.opacity = '0.5';
  });

  // ── InApp browser: copy URL ──
  $('btn-copy-url')?.addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url)
        .then(() => toast('URL 복사됨! Chrome에 붙여넣기 하세요. / Copied! Paste in Chrome.'))
        .catch(() => toast(url));
    } else {
      toast(url);
    }
  });

  // ── Survey suggestions ──
  const suggestionsEl = $('survey-suggestions');
  if (suggestionsEl) {
    suggestionsEl.addEventListener('input', () => {
      state.survey.suggestions = suggestionsEl.value || '';
    });
  }
}

// =============================================================================
// Boot
// =============================================================================

async function boot() {
  bindSurveyChips();
  wireUI();
  wireVideoFallback();

  // InApp browser detection
  const inAppType = detectInAppBrowser();
  if (inAppType) {
    const banner = $('inapp-banner');
    if (banner) banner.hidden = false;
    console.log('[K-PATCH] InApp browser detected:', inAppType);
  }

  setBackground(IMAGE_POOLS.intro[0]);
  showPhase(PHASE.INTRO_MAIN);
  AudioManager.playBgm('bg_intro');

  initTtsVoices();

  const ok = await loadBank();
  if (ok) {
    loadPersistedProgress();
    alignStageToQuestionIndex();
  }
  $('btn-battle-start').disabled = !ok;
  syncIntroActionButtons();

  // Check if user was on subscribe screen
  const savedPhase = (() => { try { return localStorage.getItem('kpatch_phase'); } catch (_) { return null; } })();
  if (savedPhase === 'subscribe') {
    window.setTimeout(() => goSubscribe(), 500);
  } else if (ok && bootResumeAvailable) {
    window.setTimeout(() => {
      if (bootResumeAvailable) showResumeModal();
    }, 800);
  }

  // ── Cert share button ──
  function showShareModal(blob, shareText) {
    const modal = $('modal-share');
    if (!modal) return;

    // Populate text preview
    const textEl = $('share-modal-text');
    if (textEl) textEl.textContent = shareText;

    // Download button
    const dlBtn = $('btn-share-download');
    if (dlBtn) {
      dlBtn.onclick = () => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'kpatch-cert.png';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
        toast('✅ 인증카드 저장됨! / Card downloaded!');
      };
    }

    // Copy link button
    const copyBtn = $('btn-share-copy');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const url = 'https://k-patch.pages.dev';
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(`${shareText}\n${url}`)
            .then(() => toast('✅ 복사됨! / Copied!'))
            .catch(() => toast(url));
        } else {
          toast(url);
        }
      };
    }

    // X (Twitter) button
    const xBtn = $('btn-share-x');
    if (xBtn) {
      xBtn.onclick = () => {
        const url = encodeURIComponent('https://k-patch.pages.dev');
        const text = encodeURIComponent(shareText);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
      };
    }

    // Facebook button
    const fbBtn = $('btn-share-facebook');
    if (fbBtn) {
      fbBtn.onclick = () => {
        const url = encodeURIComponent('https://k-patch.pages.dev');
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
      };
    }

    // Close button
    const closeBtn = $('btn-share-close');
    if (closeBtn) closeBtn.onclick = () => { modal.hidden = true; };
    modal.onclick = (e) => { if (e.target === modal) modal.hidden = true; };

    modal.hidden = false;
  }

  $('btn-cert-share')?.addEventListener('click', async () => {
    const rank = $('cert-rank')?.textContent || '';
    const stageLabel = $('cert-stage-label')?.textContent || '';
    const stageEn = $('cert-stage-label-en')?.textContent || '';
    const stageRange = $('cert-stage-range')?.textContent || '';
    const stageCorrect = $('cert-stage-correct')?.textContent || '0';
    const stageTotal = $('cert-stage-total')?.textContent || '10';
    const acc = $('cert-acc')?.textContent || '0';
    const pron = $('cert-pron-score')?.textContent || '—';
    const shareText = `🎖️ K-PATCH ${stageEn}/${stageLabel} 완료! 정확도 ${acc}% | 발음 ${pron} 👉 https://k-patch.pages.dev`;

    // Update hidden premium share card
    const shareCard = document.getElementById('share-card-hidden');
    if (shareCard) {
      const el = (id) => document.getElementById(id);
      if (el('sc-rank')) el('sc-rank').textContent = rank;
      if (el('sc-stage')) el('sc-stage').textContent = `${stageEn} · ${stageLabel} · ${stageRange}`;
      if (el('sc-stage-score')) el('sc-stage-score').textContent = `${stageCorrect} / ${stageTotal}`;
      if (el('sc-acc')) el('sc-acc').textContent = `${acc}%`;
      if (el('sc-pron')) el('sc-pron').textContent = pron;
      const stageData = stageByIndex(state.currentStage);
      const imgPool = IMAGE_POOLS[stageData.imagePoolKey] || IMAGE_POOLS.recruit;
      const randomImg = imgPool[Math.floor(Math.random() * imgPool.length)];
      shareCard.style.backgroundImage = [
        'linear-gradient(145deg, rgba(8,6,0,0.72), rgba(20,14,0,0.60))',
        `url('${randomImg}')`,
      ].join(', ');
      shareCard.style.backgroundSize = 'cover';
      shareCard.style.backgroundPosition = 'center';
    }

    // Capture hidden premium card with html2canvas
    let capturedBlob = null;
    if (shareCard && typeof window.html2canvas === 'function') {
      try {
        toast('🎖️ 카드 생성 중… / Creating card…');
        shareCard.style.left = '-500px';
        shareCard.style.top = '0px';
        const canvas = await window.html2canvas(shareCard, {
          useCORS: true, backgroundColor: '#0a0800', scale: 2, logging: false,
        });
        shareCard.style.left = '-9999px';
        shareCard.style.top = '-9999px';
        capturedBlob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      } catch (_) {
        shareCard.style.left = '-9999px';
        shareCard.style.top = '-9999px';
      }
    }

    // Mobile: try native Web Share API
    if (capturedBlob && navigator.share && navigator.canShare) {
      const file = new File([capturedBlob], 'kpatch-cert.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `K-PATCH ${rank} ${stageLabel}`, text: shareText });
          return;
        } catch (_) {}
      }
    }
    if (!capturedBlob && navigator.share) {
      try {
        await navigator.share({ title: `K-PATCH ${rank} ${stageLabel}`, text: shareText, url: 'https://k-patch.pages.dev' });
        return;
      } catch (_) {}
    }

    // Desktop fallback: show custom share modal
    showShareModal(capturedBlob, shareText);
  });

  const v = $('hero-video');
  if (v) {
    try {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }
}

void boot();