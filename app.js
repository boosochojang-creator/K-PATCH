"use strict";

const db = { steps: [] };

const ammoByRank = [
  {
    rank: "훈련병",
    keywordLabel: "한국 시골, 하동, 논밭, 한옥 (Rural Korea)",
    unsplashKeywords: "Korean rural Hadong rice field hanok",
    terms: [
      "헐",
      "대박",
      "설마",
      "진짜?",
      "완전웃겨",
      "아싸",
      "우와",
      "에휴",
      "에이",
      "아니",
      "엥?",
      "응응",
      "참나",
      "음...",
      "그치?"
    ]
  },
  {
    rank: "병사",
    keywordLabel: "한국 고궁, 경복궁, 한옥마을 (Heritage)",
    unsplashKeywords: "Korean heritage Gyeongbokgung hanok village palace",
    terms: [
      "킹받네",
      "뭥미",
      "어쩔",
      "인정",
      "개이득",
      "멘붕",
      "현타",
      "떡상",
      "떡락",
      "실화냐",
      "깔끔",
      "국룰",
      "오지네",
      "지리네",
      "노답",
      "기모찌",
      "급발진",
      "사이다",
      "답답",
      "아깝다",
      "오~",
      "껌이지",
      "메롱",
      "관심없음",
      "정답"
    ]
  },
  {
    rank: "부사관",
    keywordLabel: "서울 도심, 남산타워, 한강 (Urban)",
    unsplashKeywords: "Seoul downtown Namsan tower Han river urban",
    terms: [
      "갓생",
      "폼미쳤다",
      "머선129",
      "어질어질",
      "킹정",
      "쌉가능",
      "에바야",
      "노어이",
      "솔까",
      "근황",
      "레전드",
      "찐이다",
      "텐션",
      "현웃",
      "웃참",
      "무야호",
      "럭키비키",
      "소름",
      "뇌정지",
      "기빨려"
    ]
  },
  {
    rank: "위관급",
    keywordLabel: "서울 야경, 강남, 마천루 (Cyberpunk)",
    unsplashKeywords: "Seoul night Gangnam skyline cyberpunk skyscraper",
    terms: [
      "찢었다",
      "심쿵",
      "선 넘네",
      "눈치챙겨",
      "안 봐도 비디오",
      "솔직히",
      "진짜로",
      "갑분싸",
      "말도 안 돼",
      "존예",
      "존멋",
      "힝",
      "상관없어",
      "귀차니즘",
      "완전 찬성",
      "괜찮아요",
      "슬슬 빡치네",
      "당당하게",
      "혹시",
      "대단해"
    ]
  },
  {
    rank: "영관급",
    keywordLabel: "한국의 바다, 동해, 일출 (Sea)",
    unsplashKeywords: "East sea Korea sunrise coast ocean",
    terms: [
      "죽겠다",
      "눈물나",
      "역시",
      "감동이야",
      "아 시발",
      "왜 저래?",
      "힘들다",
      "가보자고",
      "말이 돼?",
      "나 잘 살고 있는 거 맞지?"
    ]
  },
  {
    rank: "장성급",
    keywordLabel: "독도(Dokdo Island), 장엄한 일출",
    unsplashKeywords: "Dokdo island sunrise majestic Korea",
    terms: ["정신 차려", "보스급", "가즈아", "한(Han)", "K-PATCH 클리어!"]
  }
];

const videoPool = [
  "5mZ_6_zO2fM",
  "pSUydWEqKwE",
  "fLexgOxsZu0",
  "QH2-TGUlwu4",
  "aqz-KE-bpKQ"
];

let globalStepId = 1;
ammoByRank.forEach((bucket) => {
  bucket.terms.forEach((term) => {
    db.steps.push({
      id: globalStepId,
      rank: bucket.rank,
      q: `AMMO #${globalStepId}: 가장 적절한 전술 탄알을 고르세요.`,
      a: term,
      keywordLabel: bucket.keywordLabel,
      bg: `https://source.unsplash.com/1600x900/?${encodeURIComponent(bucket.unsplashKeywords)}&sig=${globalStepId}`,
      // 일부 단계는 intentionally 빈 슬롯로 두어 백업 화면 로직을 강제 테스트
      v: globalStepId % 4 === 0 ? "" : videoPool[globalStepId % videoPool.length]
    });
    globalStepId += 1;
  });
});

if (db.steps.length !== 95) {
  throw new Error(`db.steps must include 95 entries. got=${db.steps.length}`);
}

const app = document.getElementById("app");
const introScreen = document.getElementById("introScreen");
const gameScreen = document.getElementById("gameScreen");
const battleStartBtn = document.getElementById("battleStartBtn");
const introNotice = document.getElementById("introNotice");
const rankLabel = document.getElementById("rankLabel");
const themeLabel = document.getElementById("themeLabel");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const questionId = document.getElementById("questionId");
const questionText = document.getElementById("questionText");
const optionsWrap = document.getElementById("options");
const feedbackText = document.getElementById("feedbackText");
const nextBtn = document.getElementById("nextBtn");
const videoSlot = document.getElementById("videoSlot");
const surveyModal = document.getElementById("surveyModal");
const surveyForm = document.getElementById("surveyForm");
const subscribeModal = document.getElementById("subscribeModal");
const confirmSubscribeBtn = document.getElementById("confirmSubscribeBtn");
const dogTagModal = document.getElementById("dogTagModal");
const dogTagStageText = document.getElementById("dogTagStageText");
const dogTagPreviewWrap = document.getElementById("dogTagPreviewWrap");
const dogTagDownload = document.getElementById("dogTagDownload");
const closeDogTagBtn = document.getElementById("closeDogTagBtn");
const dogTagCard = document.getElementById("dogTagCard");
const dogTagCheckpoint = document.getElementById("dogTagCheckpoint");
const dogTagTimestamp = document.getElementById("dogTagTimestamp");

const welcomeTrumpetUrl = "https://assets.mixkit.co/sfx/preview/mixkit-gladiator-victory-trumpet-598.mp3";
const welcomeCrowdUrl = "https://assets.mixkit.co/sfx/preview/mixkit-crowd-moderate-applause-498.mp3";
const successChimeUrl = "https://assets.mixkit.co/sfx/preview/mixkit-winning-chime-2064.mp3";
const failTrumpetUrl = "https://assets.mixkit.co/sfx/preview/mixkit-low-ebenezer-sci-fi-tone-2127.mp3";

const backupGridHtml = `
  <div class="backup-grid">
    <div>
      <strong>다크 그리드 백업 화면</strong><br />
      비디오 슬롯 복구 모드
    </div>
  </div>
`;

let currentIndex = 0;
let selectedAnswer = "";
let hasAnswered = false;
let surveyDone = false;
let subscribeGateDone = false;
let pendingAdvance = false;
let welcomeSfx = [];
let introPlayer = null;

function shuffle(arr) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDistractors(answer) {
  const pool = db.steps.map((step) => step.a).filter((term) => term !== answer);
  return shuffle(pool).slice(0, 3);
}

function setBackupVideoSlot() {
  videoSlot.innerHTML = backupGridHtml;
}

function renderVideoSlot(videoId) {
  if (!videoId) {
    setBackupVideoSlot();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`;
  iframe.title = "K-PATCH tactical slot";
  iframe.allow = "autoplay; encrypted-media";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.style.border = "0";

  let loaded = false;
  const timeout = setTimeout(() => {
    if (!loaded) setBackupVideoSlot();
  }, 4500);

  iframe.addEventListener("load", () => {
    loaded = true;
    clearTimeout(timeout);
  });
  iframe.addEventListener("error", () => {
    loaded = false;
    clearTimeout(timeout);
    setBackupVideoSlot();
  });

  videoSlot.innerHTML = "";
  videoSlot.appendChild(iframe);
}

function setBackground(step) {
  app.style.backgroundImage = `linear-gradient(rgba(2,4,10,0.62), rgba(2,4,10,0.72)), url("${step.bg}")`;
}

function renderStep() {
  const step = db.steps[currentIndex];
  setBackground(step);
  renderVideoSlot(step.v);
  selectedAnswer = "";
  hasAnswered = false;
  pendingAdvance = false;
  nextBtn.disabled = true;
  feedbackText.className = "";
  feedbackText.textContent = "";

  rankLabel.textContent = step.rank;
  themeLabel.textContent = step.keywordLabel;
  progressText.textContent = `${step.id} / ${db.steps.length}`;
  progressFill.style.width = `${(step.id / db.steps.length) * 100}%`;
  questionId.textContent = `AMMO #${step.id}`;
  questionText.textContent = step.q;

  const options = shuffle([step.a, ...getDistractors(step.a)]);
  optionsWrap.innerHTML = "";
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-btn";
    button.textContent = option;
    button.addEventListener("click", () => {
      if (hasAnswered) return;
      selectedAnswer = option;
      evaluateAnswer(button, step);
    });
    optionsWrap.appendChild(button);
  });
}

function playAudioParallel(url, volume = 1) {
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(() => {});
  return audio;
}

function runWelcomeSequence() {
  const trumpet = playAudioParallel(welcomeTrumpetUrl, 0.9);
  const crowd = playAudioParallel(welcomeCrowdUrl, 0.65);
  welcomeSfx = [trumpet, crowd];
  setTimeout(() => {
    welcomeSfx.forEach((audio) => {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (_err) {
        // no-op
      }
    });
  }, 5000);

  if ("speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(
      "Welcome to K-PATCH! We've been waiting for a hero like you. Ready to master the REAL Korean?"
    );
    utter.lang = "en-US";
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  }

  if (navigator.vibrate) {
    navigator.vibrate([200, 100, 200, 100, 500]);
  }
}

function spawnGoldDust() {
  for (let i = 0; i < 28; i += 1) {
    const p = document.createElement("span");
    p.className = "gold-particle";
    p.style.left = `${Math.random() * window.innerWidth}px`;
    p.style.top = `${Math.max(40, Math.random() * 220)}px`;
    p.style.setProperty("--x-shift", `${(Math.random() - 0.5) * 120}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }
}

function playSuccessFeedback() {
  playAudioParallel(successChimeUrl, 0.85);
  feedbackText.className = "feedback-success";
  feedbackText.textContent = "Perfect!";
  spawnGoldDust();
}

function playFailFeedback() {
  const fail = new Audio(failTrumpetUrl);
  fail.volume = 1;
  fail.playbackRate = 0.78;
  fail.play().catch(() => {});

  // 앞은 크게, 뒤는 작게: 1초 동안 감쇠
  const started = performance.now();
  const timer = setInterval(() => {
    const elapsed = performance.now() - started;
    const t = Math.min(elapsed / 1000, 1);
    fail.volume = Math.max(0.12, 1 - t * 0.88);
    if (t >= 1) {
      clearInterval(timer);
      fail.pause();
      fail.currentTime = 0;
    }
  }, 40);

  feedbackText.className = "feedback-fail";
  feedbackText.textContent = "뿌~우~";
}

function evaluateAnswer(button, step) {
  hasAnswered = true;
  selectedAnswer = button.textContent || "";
  const all = Array.from(optionsWrap.querySelectorAll(".option-btn"));
  all.forEach((btn) => {
    btn.disabled = true;
    if (btn.textContent === step.a) btn.classList.add("correct");
  });

  if (selectedAnswer === step.a) {
    button.classList.add("correct");
    playSuccessFeedback();
  } else {
    button.classList.add("wrong");
    playFailFeedback();
  }
  nextBtn.disabled = false;
}

function openSurvey() {
  surveyForm.reset();
  surveyModal.classList.remove("hidden");
}

function openSubscribeGate() {
  subscribeModal.classList.remove("hidden");
}

function shouldOpenInterruptAfterStep(stepId) {
  if (stepId === 15 && !surveyDone) return "survey";
  if (stepId === 40 || stepId === 80) return "dogtag";
  if (stepId === 59 && !subscribeGateDone) return "subscribe";
  return "";
}

function moveNext() {
  if (!hasAnswered || pendingAdvance) return;
  const cleared = db.steps[currentIndex].id;
  const interrupt = shouldOpenInterruptAfterStep(cleared);
  if (interrupt === "survey") {
    pendingAdvance = true;
    openSurvey();
    return;
  }
  if (interrupt === "dogtag") {
    pendingAdvance = true;
    issueDogTag(cleared);
    return;
  }
  if (interrupt === "subscribe") {
    pendingAdvance = true;
    openSubscribeGate();
    return;
  }

  currentIndex += 1;
  if (currentIndex >= db.steps.length) {
    renderMissionClear();
    return;
  }
  renderStep();
}

function renderMissionClear() {
  questionId.textContent = "MISSION STATUS";
  questionText.textContent = "K-PATCH 클리어! 95발 전술 탄알 전량 소모 완료.";
  optionsWrap.innerHTML = "<p>작전을 완수했습니다. 새로고침으로 재도전 가능합니다.</p>";
  renderVideoSlot("");
  feedbackText.className = "feedback-success";
  feedbackText.textContent = "Perfect! FINAL CLEAR";
  nextBtn.disabled = true;
}

async function issueDogTag(stepId) {
  dogTagStageText.textContent = `${stepId}단계 직후 인증 카드 발급`;
  dogTagCheckpoint.textContent = `CHECKPOINT: ${stepId}`;
  dogTagTimestamp.textContent = new Date().toLocaleString("ko-KR");
  dogTagCard.style.backgroundImage = app.style.backgroundImage;
  dogTagPreviewWrap.innerHTML = "<p class='small muted'>렌더링 중...</p>";
  dogTagModal.classList.remove("hidden");

  try {
    const canvas = await html2canvas(dogTagCard, { scale: 2, useCORS: true, backgroundColor: null });
    const dataUrl = canvas.toDataURL("image/png");
    dogTagPreviewWrap.innerHTML = `<img src="${dataUrl}" alt="Dog Tag preview" />`;
    dogTagDownload.href = dataUrl;
  } catch (_err) {
    // 기술적 제약 대비: 외부 이미지 CORS 실패 시 백업 카드 생성
    dogTagCard.style.backgroundImage =
      "linear-gradient(135deg, rgba(7,14,28,1), rgba(21,33,55,1)), repeating-linear-gradient(0deg, rgba(150,170,200,0.15) 0 1px, transparent 1px 20px)";
    const backupCanvas = await html2canvas(dogTagCard, { scale: 2, backgroundColor: null });
    const backupUrl = backupCanvas.toDataURL("image/png");
    dogTagPreviewWrap.innerHTML = `<img src="${backupUrl}" alt="Dog Tag preview backup" />`;
    dogTagDownload.href = backupUrl;
  }
}

function startBattle() {
  runWelcomeSequence();
  battleStartBtn.disabled = true;
  introNotice.textContent = "환대 시퀀스 실행 중... 5초 후 전술 화면으로 전환됩니다.";
  setTimeout(() => {
    introScreen.classList.remove("active");
    gameScreen.classList.add("active");
    renderStep();
  }, 5000);
}

battleStartBtn.addEventListener("click", () => {
  startBattle();
});

nextBtn.addEventListener("click", moveNext);

surveyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(surveyForm);
  const gender = String(formData.get("surveyGender") || "").trim();
  const country = String(formData.get("surveyCountry") || "").trim();
  const purpose = String(formData.get("surveyPurpose") || "").trim();
  if (!gender || !country || !purpose) return;

  surveyDone = true;
  surveyModal.classList.add("hidden");
  currentIndex += 1;
  pendingAdvance = false;
  if (currentIndex >= db.steps.length) {
    renderMissionClear();
  } else {
    renderStep();
  }
});

confirmSubscribeBtn.addEventListener("click", () => {
  subscribeGateDone = true;
  subscribeModal.classList.add("hidden");
  currentIndex += 1;
  pendingAdvance = false;
  if (currentIndex >= db.steps.length) {
    renderMissionClear();
  } else {
    renderStep();
  }
});

closeDogTagBtn.addEventListener("click", () => {
  dogTagModal.classList.add("hidden");
  currentIndex += 1;
  pendingAdvance = false;
  if (currentIndex >= db.steps.length) {
    renderMissionClear();
  } else {
    renderStep();
  }
});

window.onYouTubeIframeAPIReady = () => {
  try {
    introPlayer = new YT.Player("introVideo", {
      events: {
        onReady: (event) => {
          event.target.mute();
          event.target.playVideo();
          try {
            event.target.setPlaybackRate(0.5);
          } catch (_err) {
            // 일부 환경은 재생속도 조절 미지원
          }
        },
        onError: () => {
          // 인트로가 실패해도 작전 진행에는 영향 없음
        }
      }
    });
  } catch (_err) {
    // API 실패 시 기본 iframe 사용
  }
};
