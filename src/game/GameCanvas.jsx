import { useEffect, useRef } from 'react';
import {
  TILE,
  GRAVITY,
  MAX_FALL_SPEED,
  MOVE_SPEED,
  ACCEL,
  DECEL,
  JUMP_VELOCITY,
  JUMP_CUT_MULTIPLIER,
  COYOTE_TIME,
  JUMP_BUFFER,
  STOMP_BOUNCE,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  INVULN_TIME,
  VIEW_WIDTH,
  VIEW_HEIGHT,
  ENEMY_SPEED,
  SOLID_TILES,
} from './constants';

const THEMES = {
  meadow: {
    sky: ['#8fd3f4', '#c6f0c2'],
    hill: '#6fbf73',
    hill2: '#4f9f57',
    ground: '#8a5a34',
    groundTop: '#6fbf73',
  },
  canyon: {
    sky: ['#f7c873', '#f0956b'],
    hill: '#c97a4a',
    hill2: '#a85c37',
    ground: '#7a4a2b',
    groundTop: '#c97a4a',
  },
  sky: {
    sky: ['#3b5da8', '#7ea3d1'],
    hill: '#5a6ea8',
    hill2: '#425089',
    ground: '#585a72',
    groundTop: '#8892c9',
  },
};

function isSolid(level, col, row) {
  if (row < 0 || row >= level.height) return false;
  if (col < 0 || col >= level.width) return true;
  return SOLID_TILES.has(level.grid[row][col]);
}

function tileAt(level, col, row) {
  if (row < 0 || row >= level.height || col < 0 || col >= level.width) return '.';
  return level.grid[row][col];
}

export default function GameCanvas({
  level,
  initialLives,
  initialScore,
  initialCoins,
  onStats,
  onLevelComplete,
  onGameOver,
}) {
  const canvasRef = useRef(null);
  const callbacksRef = useRef({ onStats, onLevelComplete, onGameOver });

  useEffect(() => {
    callbacksRef.current = { onStats, onLevelComplete, onGameOver };
  }, [onStats, onLevelComplete, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_WIDTH * dpr;
    canvas.height = VIEW_HEIGHT * dpr;
    canvas.style.width = `${VIEW_WIDTH}px`;
    canvas.style.height = `${VIEW_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const grid = level.grid.map((row) => row.slice());
    const workLevel = { ...level, grid };

    const player = {
      x: level.playerStart.col * TILE + 4,
      y: level.playerStart.row * TILE - PLAYER_HEIGHT,
      w: PLAYER_WIDTH,
      h: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      coyote: 0,
      jumpBuffer: 0,
      jumpCutApplied: true,
      invuln: 0,
      alive: true,
    };

    const spawnX = player.x;
    const spawnY = player.y;

    const enemies = level.enemies.map((e) => ({
      x: e.col * TILE + 4,
      y: e.row * TILE - (TILE - 8),
      w: TILE - 10,
      h: TILE - 8,
      minX: e.minCol * TILE,
      maxX: (e.maxCol + 1) * TILE,
      dir: 1,
      alive: true,
      squish: 0,
    }));

    const stats = {
      score: initialScore,
      lives: initialLives,
      coins: initialCoins,
    };
    callbacksRef.current.onStats({ ...stats });

    const keys = { left: false, right: false, jumpHeld: false };
    let jumpPressedEdge = false;

    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = true;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = true;
      if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) {
        if (!e.repeat) jumpPressedEdge = true;
        keys.jumpHeld = true;
        e.preventDefault();
      }
    };
    const handleKeyUp = (e) => {
      if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.left = false;
      if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.right = false;
      if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) keys.jumpHeld = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const touchState = { left: false, right: false };
    const setTouch = (dir, val) => () => {
      touchState[dir] = val;
    };
    const touchLeftBtn = document.getElementById('btn-left');
    const touchRightBtn = document.getElementById('btn-right');
    const touchJumpBtn = document.getElementById('btn-jump');
    const bind = (el, downFn, upFn) => {
      if (!el) return () => {};
      const down = (ev) => {
        ev.preventDefault();
        downFn();
      };
      const up = (ev) => {
        ev.preventDefault();
        upFn();
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('pointercancel', up);
      return () => {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointerleave', up);
        el.removeEventListener('pointercancel', up);
      };
    };
    const unbindLeft = bind(touchLeftBtn, setTouch('left', true), setTouch('left', false));
    const unbindRight = bind(touchRightBtn, setTouch('right', true), setTouch('right', false));
    const unbindJump = bind(
      touchJumpBtn,
      () => {
        jumpPressedEdge = true;
        keys.jumpHeld = true;
      },
      () => {
        keys.jumpHeld = false;
      },
    );

    let cameraX = 0;
    let simTime = 0;
    let finished = false;
    let raf = 0;
    let last = performance.now();

    function collectAt(col, row) {
      const t = tileAt(workLevel, col, row);
      if (t === 'C') {
        workLevel.grid[row][col] = '.';
        stats.coins += 1;
        stats.score += 10;
        callbacksRef.current.onStats({ ...stats });
      } else if (t === '^') {
        damagePlayer();
      } else if (t === 'F' && !finished) {
        finished = true;
        callbacksRef.current.onLevelComplete({ ...stats });
      }
    }

    function checkTileInteractions() {
      const left = Math.floor(player.x / TILE);
      const right = Math.floor((player.x + player.w - 1) / TILE);
      const top = Math.floor(player.y / TILE);
      const bottom = Math.floor((player.y + player.h - 1) / TILE);
      for (let r = top; r <= bottom; r++) {
        for (let c = left; c <= right; c++) {
          collectAt(c, r);
        }
      }
    }

    function damagePlayer() {
      if (player.invuln > 0 || finished) return;
      stats.lives -= 1;
      callbacksRef.current.onStats({ ...stats });
      if (stats.lives <= 0) {
        finished = true;
        callbacksRef.current.onGameOver({ ...stats });
        return;
      }
      player.x = spawnX;
      player.y = spawnY;
      player.vx = 0;
      player.vy = 0;
      player.invuln = INVULN_TIME;
    }

    function resolveX(dt) {
      player.x += player.vx * dt;
      const top = Math.floor(player.y / TILE);
      const bottom = Math.floor((player.y + player.h - 1) / TILE);
      if (player.vx > 0) {
        const rightCol = Math.floor((player.x + player.w - 1) / TILE);
        for (let r = top; r <= bottom; r++) {
          if (isSolid(workLevel, rightCol, r)) {
            player.x = rightCol * TILE - player.w;
            player.vx = 0;
            break;
          }
        }
      } else if (player.vx < 0) {
        const leftCol = Math.floor(player.x / TILE);
        for (let r = top; r <= bottom; r++) {
          if (isSolid(workLevel, leftCol, r)) {
            player.x = (leftCol + 1) * TILE;
            player.vx = 0;
            break;
          }
        }
      }
    }

    function resolveY(dt) {
      player.y += player.vy * dt;
      const left = Math.floor(player.x / TILE);
      const right = Math.floor((player.x + player.w - 1) / TILE);
      player.onGround = false;
      if (player.vy > 0) {
        const bottomRow = Math.floor((player.y + player.h - 1) / TILE);
        for (let c = left; c <= right; c++) {
          if (isSolid(workLevel, c, bottomRow)) {
            player.y = bottomRow * TILE - player.h;
            player.vy = 0;
            player.onGround = true;
            break;
          }
        }
      } else if (player.vy < 0) {
        const topRow = Math.floor(player.y / TILE);
        for (let c = left; c <= right; c++) {
          if (isSolid(workLevel, c, topRow)) {
            player.y = (topRow + 1) * TILE;
            player.vy = 0;
            break;
          }
        }
      }
    }

    function updateEnemies(dt) {
      for (const en of enemies) {
        if (!en.alive) {
          en.squish = Math.max(0, en.squish - dt * 3);
          continue;
        }
        en.x += en.dir * ENEMY_SPEED * dt;
        if (en.x < en.minX) {
          en.x = en.minX;
          en.dir = 1;
        } else if (en.x + en.w > en.maxX) {
          en.x = en.maxX - en.w;
          en.dir = -1;
        }
        const overlap =
          player.x < en.x + en.w &&
          player.x + player.w > en.x &&
          player.y < en.y + en.h &&
          player.y + player.h > en.y;
        if (overlap) {
          const playerBottom = player.y + player.h;
          if (player.vy > 0 && playerBottom - en.y < 20) {
            en.alive = false;
            en.squish = 1;
            player.vy = STOMP_BOUNCE;
            stats.score += 50;
            callbacksRef.current.onStats({ ...stats });
          } else {
            damagePlayer();
          }
        }
      }
    }

    function update(dt) {
      if (finished) return;
      if (player.invuln > 0) player.invuln -= dt;

      const targetVx = keys.right || touchState.right ? MOVE_SPEED : keys.left || touchState.left ? -MOVE_SPEED : 0;
      if (targetVx !== 0) {
        if (player.vx < targetVx) player.vx = Math.min(player.vx + ACCEL * dt, targetVx);
        else if (player.vx > targetVx) player.vx = Math.max(player.vx - ACCEL * dt, targetVx);
        player.facing = targetVx > 0 ? 1 : -1;
      } else if (player.vx > 0) {
        player.vx = Math.max(0, player.vx - DECEL * dt);
      } else if (player.vx < 0) {
        player.vx = Math.min(0, player.vx + DECEL * dt);
      }

      player.coyote = player.onGround ? COYOTE_TIME : Math.max(0, player.coyote - dt);
      player.jumpBuffer = Math.max(0, player.jumpBuffer - dt);
      if (jumpPressedEdge) {
        player.jumpBuffer = JUMP_BUFFER;
        jumpPressedEdge = false;
      }
      if (player.jumpBuffer > 0 && player.coyote > 0) {
        player.vy = JUMP_VELOCITY;
        player.jumpBuffer = 0;
        player.coyote = 0;
        player.onGround = false;
        player.jumpCutApplied = false;
      }
      if (!keys.jumpHeld && !player.jumpCutApplied && player.vy < 0) {
        player.vy *= JUMP_CUT_MULTIPLIER;
        player.jumpCutApplied = true;
      }

      player.vy = Math.min(player.vy + GRAVITY * dt, MAX_FALL_SPEED);

      resolveX(dt);
      resolveY(dt);
      checkTileInteractions();
      updateEnemies(dt);

      if (player.y > workLevel.height * TILE + 200) {
        damagePlayer();
      }

      const halfView = VIEW_WIDTH / 2;
      const levelPxWidth = workLevel.width * TILE;
      cameraX = Math.max(0, Math.min(player.x + player.w / 2 - halfView, levelPxWidth - VIEW_WIDTH));
    }

    function drawBackground(theme) {
      const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      grad.addColorStop(0, theme.sky[0]);
      grad.addColorStop(1, theme.sky[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

      ctx.fillStyle = theme.hill2;
      const parallax2 = cameraX * 0.25;
      for (let i = -1; i < 6; i++) {
        const bx = i * 260 - (parallax2 % 260);
        ctx.beginPath();
        ctx.arc(bx, VIEW_HEIGHT - 60, 160, Math.PI, 0);
        ctx.fill();
      }
      ctx.fillStyle = theme.hill;
      const parallax1 = cameraX * 0.5;
      for (let i = -1; i < 7; i++) {
        const bx = i * 200 - (parallax1 % 200);
        ctx.beginPath();
        ctx.arc(bx, VIEW_HEIGHT - 40, 120, Math.PI, 0);
        ctx.fill();
      }
    }

    function drawTiles(theme) {
      const startCol = Math.floor(cameraX / TILE) - 1;
      const endCol = Math.ceil((cameraX + VIEW_WIDTH) / TILE) + 1;
      for (let r = 0; r < workLevel.height; r++) {
        for (let c = Math.max(0, startCol); c <= Math.min(workLevel.width - 1, endCol); c++) {
          const t = workLevel.grid[r][c];
          const x = c * TILE - cameraX;
          const y = r * TILE;
          if (t === '#') {
            const isTop = workLevel.grid[r - 1] ? workLevel.grid[r - 1][c] === '.' || workLevel.grid[r-1][c] === undefined : true;
            ctx.fillStyle = theme.ground;
            ctx.fillRect(x, y, TILE, TILE);
            if (isTop) {
              ctx.fillStyle = theme.groundTop;
              ctx.fillRect(x, y, TILE, 8);
            }
          } else if (t === '~') {
            ctx.fillStyle = theme.groundTop;
            ctx.fillRect(x, y + TILE - 14, TILE, 14);
            ctx.fillStyle = theme.ground;
            ctx.fillRect(x, y + TILE - 6, TILE, 6);
          } else if (t === '^') {
            ctx.fillStyle = '#d94f4f';
            ctx.beginPath();
            ctx.moveTo(x, y + TILE);
            ctx.lineTo(x + TILE / 2, y + TILE - 30);
            ctx.lineTo(x + TILE, y + TILE);
            ctx.closePath();
            ctx.fill();
          } else if (t === 'C') {
            const bob = Math.sin(simTime * 4 + c) * 3;
            ctx.save();
            ctx.translate(x + TILE / 2, y + TILE / 2 + bob);
            ctx.fillStyle = '#ffd23f';
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#c9971f';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
          } else if (t === 'F') {
            ctx.fillStyle = '#8a5a34';
            ctx.fillRect(x + TILE / 2 - 3, y - TILE, 6, TILE * 2);
            ctx.fillStyle = '#ff5252';
            const wave = Math.sin(simTime * 5) * 4;
            ctx.beginPath();
            ctx.moveTo(x + TILE / 2 + 3, y - TILE + 6);
            ctx.lineTo(x + TILE / 2 + 34 + wave, y - TILE + 16);
            ctx.lineTo(x + TILE / 2 + 3, y - TILE + 26);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    function drawEnemies() {
      for (const en of enemies) {
        if (!en.alive && en.squish <= 0) continue;
        const x = en.x - cameraX;
        const y = en.y;
        ctx.save();
        if (!en.alive) {
          ctx.translate(x + en.w / 2, y + en.h);
          ctx.scale(1.3, 0.3);
          ctx.translate(-(x + en.w / 2), -(y + en.h));
        }
        ctx.fillStyle = '#7a3fbf';
        ctx.beginPath();
        ctx.ellipse(x + en.w / 2, y + en.h / 2, en.w / 2, en.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (en.alive) {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(x + en.w / 2 - 6, y + en.h / 2 - 4, 4, 5, 0, 0, Math.PI * 2);
          ctx.ellipse(x + en.w / 2 + 6, y + en.h / 2 - 4, 4, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#222';
          ctx.beginPath();
          ctx.ellipse(x + en.w / 2 - 6 + en.dir * 1.5, y + en.h / 2 - 4, 2, 2.5, 0, 0, Math.PI * 2);
          ctx.ellipse(x + en.w / 2 + 6 + en.dir * 1.5, y + en.h / 2 - 4, 2, 2.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function drawPlayer() {
      if (player.invuln > 0 && Math.floor(simTime * 12) % 2 === 0) return;
      const x = player.x - cameraX;
      const y = player.y;
      ctx.save();
      const squash = player.onGround ? 1 : Math.max(0.85, 1 - Math.abs(player.vy) / 3000);
      ctx.translate(x + player.w / 2, y + player.h);
      ctx.scale(1, squash);
      ctx.translate(-(x + player.w / 2), -(y + player.h));

      ctx.fillStyle = '#2f9e44';
      ctx.beginPath();
      ctx.roundRect(x, y, player.w, player.h, 8);
      ctx.fill();

      ctx.fillStyle = '#fff';
      const eyeX = player.facing > 0 ? x + player.w - 11 : x + 3;
      ctx.beginPath();
      ctx.ellipse(eyeX + 4, y + 12, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.ellipse(eyeX + 4 + player.facing * 1.5, y + 12, 2.2, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (Math.abs(player.vx) > 20 && player.onGround) {
        const legOffset = Math.sin(simTime * 18) * 4;
        ctx.fillStyle = '#1f6b30';
        ctx.fillRect(x + 4, y + player.h - 4, 6, 6 + legOffset * 0.3);
        ctx.fillRect(x + player.w - 10, y + player.h - 4, 6, 6 - legOffset * 0.3);
      }
      ctx.restore();
    }

    function render(theme) {
      drawBackground(theme);
      drawTiles(theme);
      drawEnemies();
      drawPlayer();
    }

    const theme = THEMES[level.theme] || THEMES.meadow;

    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.033);
      last = now;
      simTime += dt;
      update(dt);
      render(theme);
      if (!finished) {
        raf = requestAnimationFrame(loop);
      }
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      unbindLeft();
      unbindRight();
      unbindJump();
    };
    // initialLives/initialScore/initialCoins are only read once, to seed a fresh
    // engine instance when the parent remounts this component (via `key`) for a
    // new level or run. They must stay out of this dependency array: they change
    // on every coin/stomp/damage via onStats, and including them would tear down
    // and rebuild the whole engine (resetting the player to spawn) on every pickup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  return <canvas ref={canvasRef} className="game-canvas" />;
}
