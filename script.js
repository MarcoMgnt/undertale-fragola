const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// fullscreen canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// PLAYER (fragola)
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 12,
  speed: 5
};

// INPUT PC
const keys = {};
window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);

// INPUT MOBILE (touch drag)
let touching = false;

canvas.addEventListener("touchstart", (e) => {
  touching = true;
});

canvas.addEventListener("touchmove", (e) => {
  if (!touching) return;

  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];

  player.x = touch.clientX - rect.left;
  player.y = touch.clientY - rect.top;
});

canvas.addEventListener("touchend", () => {
  touching = false;
});

// UPDATE
function update() {
  // PC movement
  if (keys["ArrowUp"] || keys["w"]) player.y -= player.speed;
  if (keys["ArrowDown"] || keys["s"]) player.y += player.speed;
  if (keys["ArrowLeft"] || keys["a"]) player.x -= player.speed;
  if (keys["ArrowRight"] || keys["d"]) player.x += player.speed;

  // limiti schermo
  player.x = Math.max(0, Math.min(canvas.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height, player.y));
}

// DRAW fragola
function drawStrawberry() {
  // corpo
  ctx.fillStyle = "red";
  ctx.beginPath();
  ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
  ctx.fill();

  // semi fissi
  ctx.fillStyle = "#ffcccc";
  const seeds = [
    [-4, -2],
    [3, -1],
    [-2, 3],
    [4, 2],
    [-4, 2],
    [2, -4]
  ];

  seeds.forEach(s => {
    ctx.fillRect(player.x + s[0], player.y + s[1], 2, 2);
  });

  // foglia
  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.moveTo(player.x, player.y - 12);
  ctx.lineTo(player.x - 6, player.y - 20);
  ctx.lineTo(player.x + 6, player.y - 20);
  ctx.closePath();
  ctx.fill();
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawStrawberry();
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();