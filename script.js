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

const baseSpeed = 4;
const coffeeSpeedBoost = 1;
const coffeeShakePerCup = 1.5;
let coffeeDrank = 0;

let animationTime = 0;
const bossBobbingSpeed = 0.015;
const bossBobbingHeight = 10;
const bossRotationAmount = 0.075;

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
  fight: ["✲ Rircerca", "✲ Scrivi la tesi"],
  act: ["✲ Chiedi aiuto al prof", "✲ Chiedi aiuto ai colleghi"],
  item: ["✲ Caffè", "✲ Fragole", "✲ backup tesi"],
  mercy: ["✲ Arrenditi", "✲ Accettazione", "✲ Consegna tesi"]
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
  if (type === "fight" && option === "✲ Rircerca") {
    startRicercaMinigame();
  } else if (type === "fight" && option === "✲ Scrivi la tesi") {
    startWritingMinigame();
  } else if (type === "item" && option === "✲ Caffè") {
    drinkCoffee();
  } else {
    document.getElementById("text").innerText = `Selected ${option}.`;
  }
  closeMenu();
}

function drinkCoffee() {
  coffeeDrank += 1;
  player.speed = baseSpeed + coffeeDrank * coffeeSpeedBoost;
  document.getElementById("text").innerText =
    `You drink coffee! Speed is now ${player.speed}. Jitter level: ${coffeeDrank}.`;
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
  document.getElementById("text").innerText =
    type === "ricerca"
      ? "Studia la letteratura scientifica"
      : "Scrivi la tesi! Cogli 20 lettere prima che spariscano.";
}

function stopMinigame(message) {
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
    speed: 0.5 + Math.random() * 0.25,
    amplitude: 45 + Math.random() * 10,
    phase: Math.random() * Math.PI * 2,
    color: Math.random() < 0.33 ? "green" : "red"
  };
  papers.push(paper);
}

function updateMinigame() {
  if (!minigameActive) return;

  if (minigameType === "ricerca") {
    minigameSpawnCooldown -= 1;
    if (minigameSpawnCooldown <= 0) {
      spawnPaper();
      minigameSpawnCooldown = 125 + Math.round(Math.random() * 30);
    }

    for (let i = papers.length - 1; i >= 0; i -= 1) {
      const paper = papers[i];
      paper.y += paper.speed;
      paper.x = paper.baseX + Math.sin((paper.y * 0.08) + paper.phase) * paper.amplitude;

      if (checkPaperCollision(paper)) {
        if (paper.color === "green") {
          papersCaught += 1;
          document.getElementById("text").innerText =
            `Green paper caught! ${papersCaught}/3.`;
          if (papersCaught >= 6) {
            stopMinigame("Ti sei convinta di aver capito gli articoli che hai studiato");
            break;
          }
        } else {
          stopMinigame("L'articolo che hai letto per tutto il giorno era inutile...");
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
    letterSpawnCooldown -= 1;
    if (letterSpawnCooldown <= 0) {
      spawnLetter();
      letterSpawnCooldown = 30 + Math.round(Math.random() * 20);
    }

    for (let i = letters.length - 1; i >= 0; i -= 1) {
      const letter = letters[i];
      letter.ttl -= 1;
      if (letter.ttl <= 0) {
        letters.splice(i, 1);
        continue;
      }

      if (checkLetterCollision(letter)) {
        lettersCaught += 1;
        document.getElementById("text").innerText =
          `Lettere catturate: ${lettersCaught}/20.`;
        letters.splice(i, 1);
        if (lettersCaught >= 20) {
          stopMinigame("Hai scritto la tesi! 20 lettere catturate.");
          break;
        }
      }
    }
  }
}

function checkPaperCollision(paper) {
  const playerLeft = player.x - player.size / 2;
  const playerRight = player.x + player.size / 2;
  const playerTop = player.y - player.size / 2;
  const playerBottom = player.y + player.size / 2;

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
  letters.push({ x, y, char, size, ttl: 80 + Math.round(Math.random() * 40) });
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
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(letter.x, letter.y, letter.size, letter.size);
    ctx.strokeStyle = "white";
    ctx.strokeRect(letter.x, letter.y, letter.size, letter.size);
    ctx.fillStyle = "black";
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

function update() {
  animationTime += bossBobbingSpeed;

  // keyboard movement
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  // clamp inside arena
  player.x = Math.max(box.x, Math.min(box.x + box.w, player.x));
  player.y = Math.max(box.y, Math.min(box.y + box.h, player.y));

  updateMinigame();
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

function loop() {
  update();
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
    `You drink coffee! Speed is now ${player.speed}. Jitter level: ${coffeeDrank}.`;
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

loop();