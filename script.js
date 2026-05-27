const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* =========================
   RESIZE + ARENA
========================= */

const box = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  box.x = canvas.width * 0.125;
  box.y = canvas.height * 0.4;
  box.w = canvas.width * 0.75;
  box.h = canvas.height * 0.35;

  boss.x = canvas.width / 2;
  boss.y = canvas.height * 0.15;

  updateBoxMenuPosition();  updateUITextPosition();}

window.addEventListener("resize", resize);

/* =========================
   PLAYER (strawberry)
========================= */

const baseSpeed = 240;
const coffeeSpeedBoost = 60;
const coffeeShakePerCup = 1.5;
const COFFEE_SHAKE_DECAY_INTERVAL = 30;
let coffeeDrank = 0;
let coffeeShakeLevel = 0;
let coffeeShakeDecayTimer = COFFEE_SHAKE_DECAY_INTERVAL;

let animationTime = 0;
const bossBobbingSpeed = 0.9*2;
const bossBobbingHeight = 10;
const bossRotationAmount = 0.075;
let lastTimestamp = 0;

const player = {
  x: 0,
  y: 0,
  size: 50,
  speed: baseSpeed
};

const strawberryImg = new Image();
strawberryImg.src = "assets/strawberry.png";

const boxMenu = document.getElementById("box-menu");
const ui = document.getElementById("ui");
let textClearTimeout = null;

function showText(message, duration = 0) {
  const textEl = document.getElementById("text");
  if (!textEl) return;
  textEl.innerText = message;
  if (textClearTimeout) {
    clearTimeout(textClearTimeout);
    textClearTimeout = null;
  }
  if (duration > 0) {
    textClearTimeout = setTimeout(() => {
      textEl.innerText = "";
      textClearTimeout = null;
    }, duration);
  }
}

const menuButtons = {
  fight: document.getElementById("fight-button"),
  act: document.getElementById("act-button"),
  item: document.getElementById("item-button"),
  mercy: document.getElementById("mercy-button")
};
const menuOptions = {
  fight: ["✲ Raccogli le fragole", "✲ Studia", "✲ Scrivi la tesi"],
  act: ["✲ Discuti la tesi con il prof"],
  item: ["✲ Caffè", "✲ Fragole"],
  mercy: ["✲ Abbandona", "✲ Accettazione", "✲ Consegna tesi"]
};

let activeMenu = null;
let selectedOption = null;

// Status state
let statusHP = 10; // 1..10
let statusMotivation = 6; // 1..10
let statusAnxiety = 2; // 1..10

// Status shake timers for positive and negative changes
let hpShakeTimerPositive = 0;
let hpShakeTimerNegative = 0;
let motivationShakeTimerPositive = 0;
let motivationShakeTimerNegative = 0;
let anxietyShakeTimerPositive = 0;
let anxietyShakeTimerNegative = 0;
const STATUS_ELEMENT_SHAKE_DURATION = 1.0;
const STATUS_ELEMENT_SHAKE_INTENSITY = 20;

// Minigame state
let minigameActive = false;
let minigameType = null;
let papers = [];
let papersCaught = 0;
let letters = [];
let lettersCaught = 0;
let minigameSpawnCooldown = 0;
let letterSpawnCooldown = 0;
let ricercaWins = 0;
let wordsWritten = 0;
// Fragole minigame state
let pillars = [];
let strawberries = [];
let strawberriesCollected = 0;
let fragoleSpawnCooldown = 0;
let fragoleWins = 0;
const FRAGOLE_TARGET = 16;
let targetParole = 100000;
let tesicorretta = false;
let boxShakeTimer = 0;
const BOX_SHAKE_DURATION = 1.0;
const BOX_SHAKE_INTENSITY = 20;
const STATUS_SHAKE_INTENSITY = 6;

function levelFromValue(v) {
  const n = Math.max(1, Math.min(10, Math.round(v)));
  if (n <= 3) return "low";
  if (n <= 7) return "medium";
  return "high";
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Status setter functions that trigger shake on change
function setHP(newValue) {
  const oldValue = statusHP;
  statusHP = newValue;
  if (newValue > oldValue) {
    hpShakeTimerPositive = STATUS_ELEMENT_SHAKE_DURATION;
  } else if (newValue < oldValue) {
    hpShakeTimerNegative = STATUS_ELEMENT_SHAKE_DURATION;
  }
}

function setMotivation(newValue) {
  const oldValue = statusMotivation;
  statusMotivation = newValue;
  if (newValue > oldValue) {
    motivationShakeTimerPositive = STATUS_ELEMENT_SHAKE_DURATION;
  } else if (newValue < oldValue) {
    motivationShakeTimerNegative = STATUS_ELEMENT_SHAKE_DURATION;
  }
}

function setAnxiety(newValue) {
  const oldValue = statusAnxiety;
  statusAnxiety = newValue;
  // For anxiety: positive change is when it DECREASES (good for player)
  if (newValue < oldValue) {
    anxietyShakeTimerPositive = STATUS_ELEMENT_SHAKE_DURATION;
  } else if (newValue > oldValue) {
    anxietyShakeTimerNegative = STATUS_ELEMENT_SHAKE_DURATION;
  }
}

function renderStatusBar() {
  const hpEl = document.getElementById("status-hp");
  const hpLabel = hpEl ? hpEl.previousElementSibling : null;
  const motEl = document.getElementById("status-motivation");
  const motLabel = motEl ? motEl.previousElementSibling : null;
  const anxEl = document.getElementById("status-anxiety");
  const anxLabel = anxEl ? anxEl.previousElementSibling : null;

  // Helper function to apply shake and color
  function applyShakeEffect(element, label, positiveTimer, negativeTimer) {
    if (!element) return;
    
    let shakeFactor = 0;
    let shakeColor = "";
    
    if (positiveTimer > 0) {
      shakeFactor = positiveTimer / STATUS_ELEMENT_SHAKE_DURATION;
      shakeColor = "#7CFC00"; // Green
    } else if (negativeTimer > 0) {
      shakeFactor = negativeTimer / STATUS_ELEMENT_SHAKE_DURATION;
      shakeColor = "red";
    }
    
    if (shakeFactor > 0) {
      const offsetX = (Math.random() - 0.5) * STATUS_ELEMENT_SHAKE_INTENSITY * shakeFactor;
      const offsetY = (Math.random() - 0.5) * STATUS_ELEMENT_SHAKE_INTENSITY * shakeFactor;
      element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      element.style.color = shakeColor;
      if (label) {
        label.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        label.style.color = shakeColor;
      }
    } else {
      element.style.transform = "";
      element.style.color = "";
      if (label) {
        label.style.transform = "";
        label.style.color = "";
      }
    }
  }

  if (hpEl) {
    hpEl.innerText = Math.max(1, Math.min(10, Math.round(statusHP)));
    applyShakeEffect(hpEl, hpLabel, hpShakeTimerPositive, hpShakeTimerNegative);
  }

  if (motEl) {
    const level = levelFromValue(statusMotivation);
    motEl.innerText = level === "medium" ? "Med" : capitalize(level);
    motEl.classList.remove("status-low", "status-medium", "status-high");
    motEl.classList.add(`status-${level}`);
    applyShakeEffect(motEl, motLabel, motivationShakeTimerPositive, motivationShakeTimerNegative);
  }

  if (anxEl) {
    const level = levelFromValue(statusAnxiety);
    anxEl.innerText = level === "medium" ? "Med" : capitalize(level);
    anxEl.classList.remove("status-low", "status-medium", "status-high");
    anxEl.classList.add(`status-${level}`);
    applyShakeEffect(anxEl, anxLabel, anxietyShakeTimerPositive, anxietyShakeTimerNegative);
  }

  const wordsEl = document.getElementById("status-words");
  if (wordsEl) wordsEl.innerText = wordsWritten.toLocaleString();

  const statusBar = document.getElementById("status-bar");
  if (statusBar) {
    if (boxShakeTimer > 0) {
      const shakeFactor = boxShakeTimer / BOX_SHAKE_DURATION;
      const offsetX = (Math.random() - 0.5) * STATUS_SHAKE_INTENSITY * shakeFactor;
      const offsetY = (Math.random() - 0.5) * STATUS_SHAKE_INTENSITY * shakeFactor;
      statusBar.style.transform = `translate(-50%, ${offsetY}px) translateX(${offsetX}px)`;
    } else {
      statusBar.style.transform = "translateX(-50%)";
    }
  }
}

const playerSprite = document.getElementById("player-sprite");
function updatePlayerSprite() {
  if (!playerSprite) return;
  playerSprite.style.left = `${player.x}px`;
  playerSprite.style.top = `${player.y}px`;
  playerSprite.style.width = `${player.size}px`;
  playerSprite.style.height = `${player.size}px`;
}

function setActiveMenuButton(type) {
  Object.keys(menuButtons).forEach((key) => {
    const button = menuButtons[key];
    if (!button) return;
    button.classList.toggle("selected", key === type);
  });
}

function updateBoxMenuPosition() {
  if (!boxMenu) return;
  const padding = 20;
  boxMenu.style.left = `${box.x}px`;
  boxMenu.style.top = `${box.y}px`;
  boxMenu.style.width = `${box.w}px`;
  boxMenu.style.height = `${box.h}px`;
  boxMenu.style.padding = `${padding}px`;
}

function updateUITextPosition() {
  if (!ui) return;
  const padding = 20;
  ui.style.left = `${box.x + padding}px`;
  ui.style.top = `${box.y + padding}px`;
  ui.style.width = `${Math.max(200, box.w - padding * 2)}px`;
}

function renderMenuOptions() {
  if (!activeMenu || !boxMenu) return;
  const options = menuOptions[activeMenu] || [];
  boxMenu.innerHTML = `${options
    .map(
      (option) =>
        `<button class="menu-option${selectedOption === option ? " selected" : ""}" onclick="selectMenuOption('${activeMenu}','${option}')">${option}</button>`
    )
    .join("")}`;
}

function openMenu(type) {
  if (minigameActive) return;
  activeMenu = type;
  setActiveMenuButton(type);
  updateBoxMenuPosition();
  renderMenuOptions();
  document.getElementById("text").innerText = "";
  boxMenu.classList.remove("hidden");
}

function closeMenu() {
  activeMenu = null;
  boxMenu.classList.add("hidden");
  setActiveMenuButton(null);
}

function selectMenuOption(type, option) {
  selectedOption = option;
  renderMenuOptions();
  if (type === "fight" && option === "✲ Raccogli le fragole") {
    startFragoleMinigame();
  } else if (type === "fight" && option === "✲ Studia") {
    startRicercaMinigame();
  } else if (type === "fight" && option === "✲ Scrivi la tesi") {
    startWritingMinigame();
  } else if (type === "act" && option === "✲ Discuti la tesi con il prof") {
    correzionetesi();
  } else if (type === "item" && option === "✲ Caffè") {
    drinkCoffee();
  } else if (type === "item" && option === "✲ Fragole") {
    mangiaFragole();
  } else if (type === "mercy" && option === "✲ Abbandona") {
    abbandona();
  } else if (type === "mercy" && option === "✲ Accettazione") {
    accettazione();
  } else if (type === "mercy" && option === "✲ Consegna tesi") {
    submitThesis();
  } else {
    document.getElementById("text").innerText = `Selected ${option}.`;
  }
  closeMenu();
}

function drinkCoffee() {
  coffeeDrank += 1;
  coffeeShakeLevel += 1;
  coffeeShakeDecayTimer = COFFEE_SHAKE_DECAY_INTERVAL;
  setHP(Math.min(10, statusHP + 1));
  setMotivation(Math.min(10, statusMotivation + 1));
  setAnxiety(Math.min(10, statusAnxiety + 1));
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `✲ Bevi il caffè delle macchinette, fa schifo ma ti senti più sveglia`;
}


function mangiaFragole() {
  if (fragoleWins <= 0) {
    document.getElementById("text").innerText =
      `✲ Non hai fragole da mangiare! Raccoglile prima`;
    return;
  }
  fragoleWins -= 1;
  setHP(Math.min(10, statusHP + 2));
  setMotivation(Math.min(10, statusMotivation + 1));
  setAnxiety(Math.max(1, statusAnxiety - 1));
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `✲ Mangi le fragole che avresti dovuto analizzare...`;
}

function startRicercaMinigame() {
  startMinigame("ricerca");
}

function startWritingMinigame() {
  startMinigame("scrivi");
}

function startMinigame(type) {
  minigameActive = true;
  minigameType = type;
  papers = [];
  letters = [];
  papersCaught = 0;
  lettersCaught = 0;
  minigameSpawnCooldown = 0;
  letterSpawnCooldown = 0;
  // initialize fragole state when starting any minigame
  pillars = [];
  strawberries = [];
  strawberriesCollected = 0;
  fragoleSpawnCooldown = 0;
}

function startFragoleMinigame() {
  startMinigame("fragole");
}

function spawnPillar() {
  const pillarWidth = 8;
  const height = 60 + Math.random() * (box.h * 0.5);
  const pillar = {
    x: box.x + box.w + pillarWidth,
    width: pillarWidth,
    height: height,
    y: box.y + box.h - height,
    speed: 140 + Math.random() * 40
  };
  // add two strawberries near the top corners of the pillar (fixed near top of box)
  const sSize = 28;
  const leftBerry = { side: 'left', size: sSize, pillarRef: pillar, y: box.y + box.h - height + sSize/2, x: 0 };
  const rightBerry = { side: 'right', size: sSize, pillarRef: pillar, y: box.y + box.h - height + sSize/2, x: 0 };
  pillars.push(pillar);
  strawberries.push(leftBerry, rightBerry);
}

function updateFragole(deltaTime) {
  fragoleSpawnCooldown -= deltaTime;
  if (fragoleSpawnCooldown <= 0) {
    spawnPillar();
    fragoleSpawnCooldown = 1.0 + Math.random() * 0.8;
  }

  for (let i = pillars.length - 1; i >= 0; i--) {
    const p = pillars[i];
    p.x -= p.speed * deltaTime;
    if (p.x + p.width < box.x) {
      // remove pillar and any associated strawberries
      pillars.splice(i, 1);
      for (let j = strawberries.length - 1; j >= 0; j--) {
        if (strawberries[j].pillarRef === p) strawberries.splice(j, 1);
      }
    }
  }

  // move strawberries with their pillar
  for (let i = strawberries.length - 1; i >= 0; i--) {
    const s = strawberries[i];
    const p = s.pillarRef;
    s.x = p.x + (s.side === 'left' ? -(p.width / 2 + 20) : (p.width / 2 + 20));
    s.y = s.y; // fixed near top of box

    // simple collision check with player
    const pb = getPlayerCollisionBounds(0.4);
    const sLeft = s.x - s.size / 2;
    const sRight = s.x + s.size / 2;
    const sTop = s.y - s.size / 2;
    const sBottom = s.y + s.size / 2;
    if (!(pb.right < sLeft || pb.left > sRight || pb.bottom < sTop || pb.top > sBottom)) {
      strawberriesCollected += 1;
      strawberries.splice(i, 1);
      if (strawberriesCollected >= FRAGOLE_TARGET) {
        // increment fragoleWins which will boost writing later
        fragoleWins += 1;
        stopMinigame(`✲ Proprio un bel raccolto di fragole!`);
        return;
      }
    }
  }

  // check pillar collisions with player
  for (let i = pillars.length - 1; i >= 0; i--) {
    const p = pillars[i];
    const pb = getPlayerCollisionBounds(0.2);
    const pillarLeft = p.x - p.width / 2;
    const pillarRight = p.x + p.width / 2;
    const pillarTop = p.y;
    const pillarBottom = box.y + box.h;
    if (!(pb.right < pillarLeft || pb.left > pillarRight || pb.bottom < pillarTop || pb.top > pillarBottom)) {
      setHP(Math.max(1, statusHP - 1));
      setMotivation(Math.max(1, statusMotivation - 1));
      setAnxiety(Math.min(10, statusAnxiety + 1));
      boxShakeTimer = BOX_SHAKE_DURATION;
      showText("✲ Hai rotto una pianta!", 1000);
      const collidedPillar = pillars.splice(i, 1)[0];
      for (let j = strawberries.length - 1; j >= 0; j--) {
        if (strawberries[j].pillarRef === collidedPillar) strawberries.splice(j, 1);
      }
    }
  }
}

function drawFragole(ctx) {
  // draw pillars (from bottom)
  pillars.forEach(p => {
    ctx.fillStyle = "#2c6f2c";
    ctx.fillRect(p.x - p.width / 2, p.y, p.width, p.height);
  });

  // draw strawberries using the player image rotated
  strawberries.forEach(s => {
    const angle = s.side === 'left' ? Math.PI / 4 : -Math.PI / 4;
    if (strawberryImg.complete) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(angle);
      ctx.drawImage(strawberryImg, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    } else {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.size / 2, s.size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "white";
      ctx.stroke();
    }
  });
}

function calculateWordsFromWriting() {
  const ricercaBonus = 2000;
  const motivationBonus = statusMotivation * 220;
  const anxietyBonus = statusAnxiety * 140;
  const randomBonus = Math.round(Math.random() * 200);
  const base = ricercaWins * (ricercaBonus + motivationBonus + anxietyBonus + randomBonus * coffeeDrank);
  const fragoleMultiplier = fragoleWins * 1; // each fragole win gives +20% writing output
  return Math.round(base * fragoleMultiplier);
}

function correzionetesi() {
  if (wordsWritten <= 2000) {
    document.getElementById("text").innerText =
      `✲ Ma non hai ancora scritto niente! Non mi fare perdere tempo...`;
    setHP(Math.max(1, statusHP - 1));
  } else if (wordsWritten <= 10000) {
    wordsWritten = Math.max(0, wordsWritten - Math.round(Math.random() * 500 + 500)); // lose some words due to corrections
    document.getElementById("text").innerText =
      `✲ Non hai ancora scritto abbastanza! Ma intanto rimuovi questa parte... Totale parole: ${wordsWritten.toLocaleString()}`;
    setHP(Math.max(1, statusHP - 1));
    setMotivation(Math.max(1, statusMotivation - 1));
    setAnxiety(Math.min(10, statusAnxiety + 1));
  } else if (wordsWritten > 10000) {
    tesicorretta = true;
    setHP(Math.max(1, statusHP - 1));
    setMotivation(Math.max(1, statusMotivation - 1));
    setAnxiety(Math.min(10, statusAnxiety + 1));
    wordsWritten = Math.max(0, wordsWritten - Math.round(Math.random() * 500 + 500)); // lose some words due to corrections
    document.getElementById("text").innerText =
      `✲ Non male ma cambia la struttura... Totale parole: ${wordsWritten.toLocaleString()}`;
  }
}

function abbandona()  {
  setHP(Math.max(1, statusHP - 2));
  setMotivation(Math.max(1, statusMotivation - 3));
  setAnxiety(Math.min(10, statusAnxiety + 3));
  document.getElementById("text").innerText =
    `✲ Hai deciso di abbandonare... ma ormai non puoi tornare indietro`;
}

function accettazione() {
  if (wordsWritten > 10000) {
  targetParole = 10000;
  setHP(Math.max(1, statusHP - 1));
  setMotivation(Math.max(1, statusMotivation - 2));
  setAnxiety(Math.max(1, statusAnxiety - 3));
  document.getElementById("text").innerText =
    `✲ Accetti che l'unica buona tesi è una tesi finita`;
  } else {
  setHP(Math.max(1, statusHP - 1));
  setMotivation(Math.max(1, statusMotivation - 1));
  setAnxiety(Math.min(10, statusAnxiety + 1));
    document.getElementById("text").innerText =
    `✲ La tua tesi ti fa ancora schifo...`;
  }
}

function submitThesis() {
  if (wordsWritten >= targetParole && tesicorretta === true) {
    document.getElementById("text").innerText =
      `✲ Hai consegnato la tesi con ${wordsWritten.toLocaleString()} parole. Hai vinto!`;
  } else {
    setMotivation(Math.max(1, statusMotivation - 1));
    setAnxiety(Math.min(10, statusAnxiety + 1));
    document.getElementById("text").innerText =
      `✲ Non sei ancora pronto. Hai solo ${wordsWritten.toLocaleString()} parole`;
  }
}

function stopMinigame(message, lost = false) {
  if (minigameType === "ricerca" && lost) {
    setHP(Math.max(1, statusHP - 1));
    setMotivation(Math.max(1, statusMotivation - 1));
    setAnxiety(Math.min(10, statusAnxiety + 1));
  }
  if (minigameType === "fragole" && lost) {
    setHP(Math.max(1, statusHP - 1));
    setMotivation(Math.max(1, statusMotivation - 1));
    setAnxiety(Math.min(10, statusAnxiety + 1));
  }
  if (lost) {
    boxShakeTimer = BOX_SHAKE_DURATION;
  }
  minigameActive = false;
  minigameType = null;
  papers = [];
  letters = [];
  document.getElementById("text").innerText = message;
}

function spawnPaper() {
  const width = 32;
  const baseX = box.x + width / 2 + Math.random() * (box.w - width);
  const paper = {
    baseX,
    x: baseX,
    y: box.y*0 - 40,
    width,
    height: 40,
    speed: (2 + Math.random() * 1) * 60,
    amplitude: 45 + Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    color: Math.random() < 0.33 ? "green" : "red"
  };
  papers.push(paper);
}

function updateMinigame(deltaTime) {
  if (!minigameActive) return;

  if (minigameType === "fragole") {
    updateFragole(deltaTime);
    return;
  }

  if (minigameType === "ricerca") {
    minigameSpawnCooldown -= deltaTime;
    if (minigameSpawnCooldown <= 0) {
      spawnPaper();
      minigameSpawnCooldown = 0.6 + Math.random() * 0.4;
    }

    for (let i = papers.length - 1; i >= 0; i -= 1) {
      const paper = papers[i];
      paper.y += paper.speed * deltaTime;
      paper.x = paper.baseX + Math.sin((paper.y * 0.08) + paper.phase) * paper.amplitude;

      if (checkPaperCollision(paper)) {
        if (paper.color === "green") {
          papersCaught += 1;
          if (papersCaught >= 6) {
            ricercaWins += 1;
            stopMinigame("✲ Ti sei convinta di aver capito gli articoli che hai studiato");
            break;
          }
        } else {
          setHP(Math.max(1, statusHP - 1));
          setMotivation(Math.max(1, statusMotivation - 1));
          setAnxiety(Math.min(10, statusAnxiety + 1));
          boxShakeTimer = BOX_SHAKE_DURATION;
          showText("✲ L'articolo che hai letto per tutto il giorno era inutile...", 1000);
        }
        papers.splice(i, 1);
        continue;
      }

      if (paper.y > box.y + box.h + paper.height) {
        papers.splice(i, 1);
      }
    }
  } else if (minigameType === "scrivi") {
    letterSpawnCooldown -= deltaTime;
    if (letterSpawnCooldown <= 0) {
      spawnWord();
      letterSpawnCooldown = 0.075;
    }

    for (let i = letters.length - 1; i >= 0; i -= 1) {
      const word = letters[i];
      word.x -= word.speed * deltaTime;

      if (checkWordCollision(word)) {
        if (word.color === "white") {
          lettersCaught += 1;
          letters.splice(i, 1);
          if (lettersCaught >= 75) {
            const addedWords = calculateWordsFromWriting();
            wordsWritten += addedWords;
            if (addedWords === 0) {
              stopMinigame(
                `✲ Non hai niente su cui scrivere...`
              );
            } else {  
              stopMinigame(
              `✲ Oggi hai scritto ${addedWords.toLocaleString()} parole! Totale: ${wordsWritten.toLocaleString()}.`
            );
            }
            break;
          }
        } else {
          setHP(Math.max(1, statusHP - 1));
          setMotivation(Math.max(1, statusMotivation - 1));
          setAnxiety(Math.min(10, statusAnxiety + 1));
          boxShakeTimer = BOX_SHAKE_DURATION;
          showText("✲ Hai scritto una frase sbagliata!", 1000);
          letters.splice(i, 1);
        }
        continue;
      }

      if (word.x + word.width < box.x) {
        letters.splice(i, 1);
      }
    }
  }
}

function getPlayerCollisionBounds(shrinkFactor = 0) {
  const halfSize = (player.size / 2) * (1 - shrinkFactor);
  return {
    left: player.x - halfSize,
    right: player.x + halfSize,
    top: player.y - halfSize,
    bottom: player.y + halfSize
  };
}

function checkPaperCollision(paper) {
  const playerBounds = getPlayerCollisionBounds(0.6);
  const playerLeft = playerBounds.left;
  const playerRight = playerBounds.right;
  const playerTop = playerBounds.top;
  const playerBottom = playerBounds.bottom;

  const paperLeft = paper.x - paper.width / 2;
  const paperRight = paper.x + paper.width / 2;
  const paperTop = paper.y;
  const paperBottom = paper.y + paper.height;

  return !(
    playerRight < paperLeft ||
    playerLeft > paperRight ||
    playerBottom < paperTop ||
    playerTop > paperBottom
  );
}

function spawnWord() {
  const words = ["impact", "fertilization", "regimes", "vegetative", "growth", "yield", "organoleptic", "nutritional", "quality", "vaccinium", "corymbosum", "duke", "federica", "mecozzi", "alessandro", "gasparrini", "luca", "mazzoni", "bruno", "mezzetti", "davide", "raffaelli", "micol", "marcellini", "francesca", "balducci", "valeria", "pergolotti", "rohullah", "qaderi", "gianni", "malavolta", "franco", "capocasa", "academiceditor", "antonios", "koutelidakis", "received", "revised", "accepted", "published", "copyright", "authors", "licensee", "switzerland", "article", "open", "access", "distributed", "terms", "conditions", "creative", "commons", "attribution", "department", "agricultural", "food", "environmental", "sciences", "polytechnic", "university", "marche", "ancona", "berries", "corso", "mazzini", "cesena", "salvi", "vivai", "strada", "provinciale", "boschetto", "lagosanto", "azienda", "agricola", "contrada", "lapedona", "correspondence", "small", "fruits", "increasingly", "popular", "consumers", "producers", "blueberries", "standing", "flavour", "benefits", "specific", "growing", "requirements", "cultivation", "challenging", "areas", "alkaline", "soils", "plant", "limited", "soilless", "provides", "practical", "profitable", "solution", "issues", "higher", "initial", "costs", "study", "examined", "grown", "conditions", "region", "using", "different", "concentrations", "nutrient", "solutions", "measured", "electrical", "conductivity", "fertigation", "treatments", "compared", "irrigation", "water", "results", "showed", "produced", "highest", "numbers", "wood", "flower", "shoots", "greatest", "although", "levels", "significantly", "affect", "parameters", "plants", "lower", "intake", "displayed", "anthocyanin", "content", "antioxidant", "capacity", "contrast", "greater", "supply", "polyphenol", "overall", "findings", "highlight", "potential", "optimize", "production", "suboptimal", "recommended", "dietary", "guidelines", "worldwide", "several", "studies", "shown", "rich", "health", "protective", "against", "various", "diseases", "therefore", "considered", "functional", "foods", "among", "essential", "mention", "most", "cover", "large", "part", "market", "strawberry", "fragaria", "ananassa", "raspberry", "rubus", "idaeus", "blueberry", "blackberry", "black", "cranberry", "oxycoccus", "many", "others", "consumed", "either", "fresh", "processed", "form", "unique", "shape", "colour", "chemical", "composition", "boast", "remarkable", "wide", "range", "phytochemicals", "phenolic", "compounds", "activate", "biochemical", "mechanisms", "counteract", "development", "progression", "chronic", "within", "broad", "group", "gained", "particular", "attention", "due", "rapid", "expansion", "cultivated", "value", "documented", "promoting", "properties", "between", "trade", "experienced", "significant", "global", "driven", "demand", "healthier", "conscious", "trend", "remained", "consistent", "subsequent", "years", "european", "situation", "increase", "widespread", "species", "highbush", "belongs", "ericaceae", "family", "main", "groups", "recognized", "northern", "mainly", "originating", "cooler", "north", "america", "southern", "transition", "traditional", "cultivars", "transformative", "developments", "industry", "varieties", "long", "dominant", "climates", "require", "chilling", "hours", "produce", "fruit", "winter", "allowing", "growers", "establish", "plantations", "warmer", "including", "peru", "mexico", "morocco", "parts", "africa", "asia", "turned", "truly", "crop", "enabling", "seasonal", "year", "round", "major", "markets", "like", "europe", "peculiar", "soil", "factor", "spread", "adapted", "fact", "require", "tend", "acidic", "organic", "matter", "drainage", "ensure", "performance", "according", "conducted", "china", "values", "exceeding", "support", "ideal", "combined", "agronomic", "thrive", "climatic", "cold", "guaranteeing", "dormancy", "success", "however", "haze", "damage", "especially", "during", "flowering", "sudden", "temperature", "drop", "occurs", "characteristics", "key", "understanding", "origin", "adaptation", "began", "early", "century", "canada", "united", "states", "southeastern", "arkansas", "florida", "georgia", "carolina", "maine", "michigan", "jersey", "washington", "geographic", "distribution", "characterized", "markedly", "pedoclimatic", "extension", "harvesting", "period", "commercial", "supported", "presence", "naturally", "suited", "optimal", "ranging", "typically", "sandy", "loam", "texture", "where", "present", "practices", "commonly", "adopted", "heavy", "mulching", "improve", "structure", "application", "elemental", "sulphur", "reduce", "pacific", "northwest", "demonstrates", "climate", "formation", "determines", "suitability", "environments", "precipitation", "west", "cascade", "promotes", "east", "result", "less", "frequently", "artificially", "acidified", "amended", "taking", "account", "hemisphere", "south", "introduced", "chile", "argentina", "complementary", "windows", "country", "zones", "types", "accumulation", "generally", "increasing", "humid", "low", "improved", "through", "incorporation", "sugarcane", "residues", "additional", "takes", "place", "entrerios", "buenos", "aires", "favourable", "provide", "risks", "associated", "frost", "hail", "events", "spring", "international", "organization", "report", "emerging", "zones", "notably", "compensated", "reduced", "output", "demonstrating", "resilience", "adaptability", "diversification", "sourcing", "mitigates", "stable", "prices"];
  const word = words[Math.floor(Math.random() * words.length)];
  const isWhite = Math.random() < 0.825; // 70% white, 30% red
  const fontSize = 16;
  const lineHeight = (box.h) / 9; // 5 rows
  const row = Math.floor(Math.random() * 9);
  const y = box.y + row * lineHeight;
  
  const textWidth = word.length * fontSize * 0.6; // rough estimate
  
  letters.push({
    text: word,
    x: box.x + box.w,
    y: y,
    width: textWidth,
    height: fontSize,
    speed: 300,
    color: isWhite ? "white" : "red",
    size: fontSize
  });
}

function checkWordCollision(word) {
  const playerBounds = getPlayerCollisionBounds(0.4);
  const wordLeft = word.x;
  const wordRight = word.x + word.width;
  const wordTop = word.y - word.size / 2;
  const wordBottom = word.y + word.size / 2;

  return !(
    playerBounds.right < wordLeft ||
    playerBounds.left > wordRight ||
    playerBounds.bottom < wordTop ||
    playerBounds.top > wordBottom
  );
}

function drawMinigame() {
  if (!minigameActive) return;

  if (minigameType === "fragole") {
    drawFragole(ctx);
    return;
  }

  papers.forEach((paper) => {
    ctx.fillStyle = paper.color;
    ctx.fillRect(
      paper.x - paper.width / 2,
      paper.y,
      paper.width,
      paper.height
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      paper.x - paper.width / 2,
      paper.y,
      paper.width,
      paper.height
    );
  });

  letters.forEach((word) => {
    ctx.fillStyle = word.color;
    ctx.font = `bold ${word.size}px monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(word.text, word.x, word.y);
  });
}

/* =========================
   BOSS
========================= */

const boss = {
  x: 0,
  y: 0,
  size: 240
};

const bossImg = new Image();
bossImg.src = "assets/boss.png";

/* =========================
   INPUT (keyboard)
========================= */

const keys = {};

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

/* =========================
   INPUT (touch)
========================= */

let touching = false;

canvas.addEventListener("touchstart", () => {
  touching = true;
});

canvas.addEventListener("touchmove", (e) => {
  if (!touching) return;

  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];

  player.x = t.clientX - rect.left;
  player.y = t.clientY - rect.top;
});

canvas.addEventListener("touchend", () => {
  touching = false;
});

/* =========================
   UPDATE LOGIC
========================= */

function update(deltaTime) {
  animationTime += bossBobbingSpeed * deltaTime;

  // keyboard movement
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed * deltaTime;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed * deltaTime;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed * deltaTime;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed * deltaTime;

  // clamp inside arena
  player.x = Math.max(box.x, Math.min(box.x + box.w, player.x));
  player.y = Math.max(box.y, Math.min(box.y + box.h, player.y));

  updateMinigame(deltaTime);
  if (boxShakeTimer > 0) {
    boxShakeTimer = Math.max(0, boxShakeTimer - deltaTime);
  }
  // Decrement individual status shake timers
  if (hpShakeTimerPositive > 0) {
    hpShakeTimerPositive = Math.max(0, hpShakeTimerPositive - deltaTime);
  }
  if (hpShakeTimerNegative > 0) {
    hpShakeTimerNegative = Math.max(0, hpShakeTimerNegative - deltaTime);
  }
  if (motivationShakeTimerPositive > 0) {
    motivationShakeTimerPositive = Math.max(0, motivationShakeTimerPositive - deltaTime);
  }
  if (motivationShakeTimerNegative > 0) {
    motivationShakeTimerNegative = Math.max(0, motivationShakeTimerNegative - deltaTime);
  }
  if (anxietyShakeTimerPositive > 0) {
    anxietyShakeTimerPositive = Math.max(0, anxietyShakeTimerPositive - deltaTime);
  }
  if (anxietyShakeTimerNegative > 0) {
    anxietyShakeTimerNegative = Math.max(0, anxietyShakeTimerNegative - deltaTime);
  }
  if (coffeeShakeLevel > 0) {
    coffeeShakeDecayTimer -= deltaTime;
    if (coffeeShakeDecayTimer <= 0) {
      coffeeShakeLevel = Math.max(0, coffeeShakeLevel - 1);
      coffeeShakeDecayTimer += COFFEE_SHAKE_DECAY_INTERVAL;
    }
  }
}

/* =========================
   DRAW ARENA
========================= */

function drawArena() {
  const shakeFactor = boxShakeTimer > 0 ? boxShakeTimer / BOX_SHAKE_DURATION : 0;
  const offsetX = boxShakeTimer > 0 ? (Math.random() - 0.5) * BOX_SHAKE_INTENSITY * shakeFactor : 0;
  const offsetY = boxShakeTimer > 0 ? (Math.random() - 0.5) * BOX_SHAKE_INTENSITY * shakeFactor : 0;
  ctx.strokeStyle = boxShakeTimer > 0 ? "red" : "white";
  ctx.lineWidth = 4;
  ctx.strokeRect(box.x + offsetX, box.y + offsetY, box.w, box.h);
}

/* =========================
   DRAW PLAYER
========================= */

function drawPlayer() {
  let drawX = player.x - player.size / 2;
  let drawY = player.y - player.size / 3;

  if (coffeeShakeLevel > 0) {
    const maxShake = coffeeShakeLevel * coffeeShakePerCup;
    drawX += (Math.random() - 0.5) * maxShake;
    drawY += (Math.random() - 0.5) * maxShake;
  }

  if (strawberryImg.complete) {
    ctx.drawImage(
      strawberryImg,
      drawX,
      drawY,
      player.size,
      player.size
    );
  } else {
    ctx.fillStyle = "red";
    ctx.fillRect(drawX, drawY, 10, 10);
  }
}

/* =========================
   DRAW BOSS
========================= */

function drawBoss() {
  const bobOffset = Math.sin(animationTime) * bossBobbingHeight;
  const rotation = Math.sin(animationTime * 0.5) * bossRotationAmount;
  
  const bossScreenX = boss.x;
  const bossScreenY = boss.y + bobOffset;

  ctx.save();
  ctx.translate(bossScreenX, bossScreenY);
  ctx.rotate(rotation);
  ctx.translate(-bossScreenX, -bossScreenY);

  if (bossImg.complete) {
    ctx.drawImage(
      bossImg,
      bossScreenX - boss.size / 2,
      bossScreenY - boss.size / 3,
      boss.size,
      boss.size
    );
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(bossScreenX - 40, bossScreenY - 40, 80, 80);
  }

  ctx.restore();
}

/* =========================
   DRAW FRAME
========================= */

function draw() {
  // background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawArena();
  drawBoss();
  drawMinigame();
  drawPlayer();
}

/* =========================
   LOOP
========================= */

function loop(timestamp) {
  if (!lastTimestamp) lastTimestamp = timestamp;
  const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  update(deltaTime);
  draw();
  updatePlayerSprite();
  renderStatusBar();
  requestAnimationFrame(loop);
}


/* =========================
   INIT
========================= */

resize();
player.x = canvas.width / 2;
player.y = canvas.height / 2;

requestAnimationFrame(loop);