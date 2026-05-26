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
let coffeeDrank = 0;

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
const menuButtons = {
  fight: document.getElementById("fight-button"),
  act: document.getElementById("act-button"),
  item: document.getElementById("item-button"),
  mercy: document.getElementById("mercy-button")
};
const menuOptions = {
  fight: ["✲ Raccogli le fragole", "✲ Rircerca", "✲ Scrivi la tesi"],
  act: ["✲ Manda la tesi al prof"],
  item: ["✲ Caffè", "✲ Fragole"],
  mercy: ["✲ Abbandona", "✲ Accettazione", "✲ Consegna tesi"]
};

let activeMenu = null;
let selectedOption = null;

// Status state
let statusHP = 10; // 1..10
let statusMotivation = 6; // 1..10
let statusAnxiety = 2; // 1..10

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
let tesicorretta = false

function levelFromValue(v) {
  const n = Math.max(1, Math.min(10, Math.round(v)));
  if (n <= 3) return "low";
  if (n <= 7) return "medium";
  return "high";
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function renderStatusBar() {
  const hpEl = document.getElementById("status-hp");
  const motEl = document.getElementById("status-motivation");
  const anxEl = document.getElementById("status-anxiety");
  if (hpEl) hpEl.innerText = Math.max(1, Math.min(10, Math.round(statusHP)));

  if (motEl) {
    const level = levelFromValue(statusMotivation);
    motEl.innerText = level === "medium" ? "Med" : capitalize(level);
    motEl.classList.remove("status-low", "status-medium", "status-high");
    motEl.classList.add(`status-${level}`);
  }

  if (anxEl) {
    const level = levelFromValue(statusAnxiety);
    anxEl.innerText = level === "medium" ? "Med" : capitalize(level);
    anxEl.classList.remove("status-low", "status-medium", "status-high");
    anxEl.classList.add(`status-${level}`);
  }

  const wordsEl = document.getElementById("status-words");
  if (wordsEl) wordsEl.innerText = wordsWritten.toLocaleString();
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
  } else if (type === "fight" && option === "✲ Rircerca") {
    startRicercaMinigame();
  } else if (type === "fight" && option === "✲ Scrivi la tesi") {
    startWritingMinigame();
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
  statusMotivation = Math.min(10, statusMotivation + 1);
  statusAnxiety = Math.min(10, statusAnxiety + 1);
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `Bevi il caffè delle macchinette, fa schifo ma ti senti più sveglia`;
}


function mangiaFragole() {
  if (strawberriesCollected <= 0) {
    document.getElementById("text").innerText =
      `Non hai fragole da mangiare! Raccoglile prima`;
    return;
  }
  strawberriesCollected -= 1;
  statusHP = Math.min(10, statusHP + 2);
  statusMotivation = Math.min(10, statusMotivation + 1);
  statusAnxiety = Math.max(1, statusAnxiety - 1);
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `Mangi le fragole che avresti dovuto analizzare...`;
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
    const pb = getPlayerCollisionBounds(0.2);
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
        stopMinigame(`Proprio un bel raccolto di fragole!`);
        return;
      }
    }
  }

  // check pillar collisions with player
  for (let i = 0; i < pillars.length; i++) {
    const p = pillars[i];
    const pb = getPlayerCollisionBounds(0.2);
    const pillarLeft = p.x - p.width / 2;
    const pillarRight = p.x + p.width / 2;
    const pillarTop = p.y;
    const pillarBottom = box.y + box.h;
    if (!(pb.right < pillarLeft || pb.left > pillarRight || pb.bottom < pillarTop || pb.top > pillarBottom)) {
      stopMinigame("Hai rotto una pianta!", true);
      return;
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

  // HUD: collected
  ctx.fillStyle = "white";
  ctx.font = "16px sans-serif";
  ctx.fillText(`Fragole: ${strawberriesCollected}/${FRAGOLE_TARGET}`, box.x + 10, box.y + 20);
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

function abbandona()  {
  statusHP = Math.max(1, statusHP - 2);
  statusMotivation = Math.max(1, statusMotivation - 3);
  statusAnxiety = Math.min(10, statusAnxiety + 3);
  document.getElementById("text").innerText =
    `Hai deciso di abbandonare... ma ormai non puoi tornare indietro`;
}

function accettazione() {
  targetParole = 10000;
  statusHP = Math.max(1, statusHP - 1);
  statusMotivation = Math.max(1, statusMotivation - 2);
  statusAnxiety = Math.max(1, statusAnxiety - 3);
  document.getElementById("text").innerText =
    `Accetti che la tesi non sara mai perfetta, la fine è in vista`;
}

function submitThesis() {
  if (wordsWritten >= targetParole && tesicorretta === true) {
    document.getElementById("text").innerText =
      `Hai consegnato la tesi con ${wordsWritten.toLocaleString()} parole. Hai vinto!`;
  } else {
    statusMotivation = Math.max(1, statusMotivation - 1);
    statusAnxiety = Math.min(10, statusAnxiety + 1);
    document.getElementById("text").innerText =
      `Non sei ancora pronto. Hai solo ${wordsWritten.toLocaleString()} parole`;
  }
}

function stopMinigame(message, lost = false) {
  if (minigameType === "ricerca" && lost) {
    statusHP = Math.max(1, statusHP - 1);
    statusMotivation = Math.max(1, statusMotivation - 1);
    statusAnxiety = Math.min(10, statusAnxiety + 1);
  }
  if (minigameType === "fragole" && lost) {
    statusHP = Math.max(1, statusHP - 1);
    statusMotivation = Math.max(1, statusMotivation - 1);
    statusAnxiety = Math.min(10, statusAnxiety + 1);
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
          if (papersCaught >= 3) {
            ricercaWins += 1;
            stopMinigame("Ti sei convinta di aver capito gli articoli che hai studiato");
            break;
          }
        } else {
          stopMinigame("L'articolo che hai letto per tutto il giorno era inutile...", true);
          break;
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
      spawnLetter();
      letterSpawnCooldown = 0.5 + Math.random() * 0.3;
    }

    for (let i = letters.length - 1; i >= 0; i -= 1) {
      const letter = letters[i];
      letter.ttl -= deltaTime;
      if (letter.ttl <= 0) {
        letters.splice(i, 1);
        continue;
      }

      if (checkLetterCollision(letter)) {
        lettersCaught += 1;
        letters.splice(i, 1);
        if (lettersCaught >= 20) {
          const addedWords = calculateWordsFromWriting();
          wordsWritten += addedWords;
          stopMinigame(
            `Oggi hai scritto ${addedWords.toLocaleString()} parole! Totale: ${wordsWritten.toLocaleString()}.`
          );
          break;
        }
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
  const playerBounds = getPlayerCollisionBounds(0.75);
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

function spawnLetter() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const char = alphabet[Math.floor(Math.random() * alphabet.length)];
  const size = 30;
  const x = box.x + 10 + Math.random() * (box.w - size - 20);
  const y = box.y + 10 + Math.random() * (box.h - size - 20);
  letters.push({ x, y, char, size, ttl: 1.5 + Math.random() * 0.8 });
}

function checkLetterCollision(letter) {
  const playerLeft = player.x - player.size / 2;
  const playerRight = player.x + player.size / 2;
  const playerTop = player.y - player.size / 2;
  const playerBottom = player.y + player.size / 2;

  const letterLeft = letter.x;
  const letterRight = letter.x + letter.size;
  const letterTop = letter.y;
  const letterBottom = letter.y + letter.size;

  return !(
    playerRight < letterLeft ||
    playerLeft > letterRight ||
    playerBottom < letterTop ||
    playerTop > letterBottom
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

  letters.forEach((letter) => {
    ctx.fillStyle = "black";
    ctx.fillRect(letter.x, letter.y, letter.size, letter.size);
    ctx.strokeStyle = "black";
    ctx.strokeRect(letter.x, letter.y, letter.size, letter.size);
    ctx.fillStyle = "white";
    ctx.font = "bold 20px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter.char, letter.x + letter.size / 2, letter.y + letter.size / 2);
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
}

/* =========================
   DRAW ARENA
========================= */

function drawArena() {
  ctx.strokeStyle = "white";
  ctx.lineWidth = 4;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

/* =========================
   DRAW PLAYER
========================= */

function drawPlayer() {
  let drawX = player.x - player.size / 2;
  let drawY = player.y - player.size / 3;

  if (coffeeDrank > 0) {
    const maxShake = coffeeDrank * coffeeShakePerCup;
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
   BUTTON ACTIONS
========================= */

function fight() {
  document.getElementById("text").innerText =
    "You try to FIGHT... but the thesis is unbreakable.";
}

function act() {
  document.getElementById("text").innerText =
    "You ACT: you procrastinate strategically.";
}

function item() {
  coffeeDrank += 1;
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `Bevi il caffè delle macchinette, fa schifo`;
}

function mercy() {
  document.getElementById("text").innerText =
    "The Laurea is not ready to forgive yet.";
}

/* =========================
   INIT
========================= */

resize();
player.x = canvas.width / 2;
player.y = canvas.height / 2;

requestAnimationFrame(loop);