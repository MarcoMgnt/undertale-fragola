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

  box.x = canvas.width * 0.3;
  box.y = canvas.height * 0.25;
  box.w = canvas.width * 0.4;
  box.h = canvas.height * 0.35;

  boss.x = canvas.width / 2;
  boss.y = canvas.height * 0.15;

  updateBoxMenuPosition();
}

window.addEventListener("resize", resize);

/* =========================
   PLAYER (strawberry)
========================= */

const baseSpeed = 5;
const coffeeSpeedBoost = 2;
const coffeeShakePerCup = 2;
let coffeeDrank = 0;

const player = {
  x: 0,
  y: 0,
  size: 50,
  speed: baseSpeed
};

const strawberryImg = new Image();
strawberryImg.src = "assets/strawberry.png";

const boxMenu = document.getElementById("box-menu");
const menuOptions = {
  fight: ["Attack", "Stare", "Charge", "Wait"],
  act: ["Compliment", "Tease", "Check", "Hug"],
  item: ["Coffee", "Placeholder 2", "Placeholder 3", "Placeholder 4"],
  mercy: ["Spare", "Plead", "Surrender", "Escape"]
};
let activeMenu = null;

function updateBoxMenuPosition() {
  if (!boxMenu) return;
  const padding = 20;
  boxMenu.style.left = `${box.x + padding}px`;
  boxMenu.style.top = `${box.y + padding}px`;
  boxMenu.style.width = `${Math.min(260, box.w - padding * 2)}px`;
}

function renderMenuOptions() {
  if (!activeMenu || !boxMenu) return;
  const options = menuOptions[activeMenu] || [];
  boxMenu.innerHTML = `
    <div class="box-menu-header">${activeMenu.toUpperCase()}</div>
    ${options
      .map(
        (option) =>
          `<button class="menu-option" onclick="selectMenuOption('${activeMenu}','${option}')">${option}</button>`
      )
      .join("")}
  `;
}

function openMenu(type) {
  activeMenu = type;
  updateBoxMenuPosition();
  renderMenuOptions();
  boxMenu.classList.remove("hidden");
  document.getElementById("text").innerText =
    `Choose an option from ${type.toUpperCase()}...`;
}

function closeMenu() {
  activeMenu = null;
  boxMenu.classList.add("hidden");
}

function selectMenuOption(type, option) {
  if (type === "item" && option === "Coffee") {
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
  // keyboard movement
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  // clamp inside arena
  player.x = Math.max(box.x, Math.min(box.x + box.w, player.x));
  player.y = Math.max(box.y, Math.min(box.y + box.h, player.y));
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
  let drawY = player.y - player.size / 2;

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
  if (bossImg.complete) {
    ctx.drawImage(
      bossImg,
      boss.x - boss.size / 2,
      boss.y - boss.size / 2,
      boss.size,
      boss.size
    );
  } else {
    ctx.fillStyle = "white";
    ctx.fillRect(boss.x - 40, boss.y - 40, 80, 80);
  }
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
  drawPlayer();
}

/* =========================
   LOOP
========================= */

function loop() {
  update();
  draw();
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