import { useCallback, useMemo, useState } from 'react';
import GameCanvas from './game/GameCanvas';
import { LEVELS } from './game/levels';
import { START_LIVES } from './game/constants';
import './App.css';

const INITIAL_STATS = { score: 0, lives: START_LIVES, coins: 0 };

export default function App() {
  const [screen, setScreen] = useState('menu');
  const [levelIndex, setLevelIndex] = useState(0);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [runId, setRunId] = useState(0);

  const level = LEVELS[levelIndex];
  const isLastLevel = levelIndex === LEVELS.length - 1;

  const handleStats = useCallback((s) => setStats(s), []);

  const handleLevelComplete = useCallback(
    (s) => {
      setStats(s);
      setScreen(isLastLevel ? 'win' : 'levelComplete');
    },
    [isLastLevel],
  );

  const handleGameOver = useCallback((s) => {
    setStats(s);
    setScreen('gameOver');
  }, []);

  const startGame = () => {
    setStats(INITIAL_STATS);
    setLevelIndex(0);
    setRunId((n) => n + 1);
    setScreen('playing');
  };

  const nextLevel = () => {
    setLevelIndex((i) => i + 1);
    setScreen('playing');
  };

  const canvasKey = useMemo(() => `${levelIndex}-${runId}`, [levelIndex, runId]);

  return (
    <div className="game-shell">
      <div className="viewport">
        {screen === 'playing' && (
          <>
            <GameCanvas
              key={canvasKey}
              level={level}
              initialLives={stats.lives}
              initialScore={stats.score}
              initialCoins={stats.coins}
              onStats={handleStats}
              onLevelComplete={handleLevelComplete}
              onGameOver={handleGameOver}
            />
            <div className="hud">
              <div className="hud-item">
                <span className="hud-icon">❤</span>
                <span>{stats.lives}</span>
              </div>
              <div className="hud-item">
                <span className="hud-icon">🪙</span>
                <span>{stats.coins}</span>
              </div>
              <div className="hud-item">
                <span className="hud-icon">★</span>
                <span>{stats.score}</span>
              </div>
              <div className="hud-level">
                Level {levelIndex + 1} — {level.name}
              </div>
            </div>
            <div className="touch-controls">
              <div className="touch-dpad">
                <button id="btn-left" className="touch-btn" aria-label="Move left">◀</button>
                <button id="btn-right" className="touch-btn" aria-label="Move right">▶</button>
              </div>
              <button id="btn-jump" className="touch-btn touch-jump" aria-label="Jump">⤒</button>
            </div>
          </>
        )}

        {screen === 'menu' && (
          <div className="overlay">
            <h1 className="title">Spire Jumper</h1>
            <p className="subtitle">A hand-built platforming adventure</p>
            <button className="btn-primary" onClick={startGame}>
              Start Game
            </button>
            <div className="controls-help">
              <div><strong>Move</strong> — ← → or A/D</div>
              <div><strong>Jump</strong> — ↑, W, or Space</div>
              <div>Stomp enemies from above. Avoid spikes. Collect coins.</div>
            </div>
          </div>
        )}

        {screen === 'levelComplete' && (
          <div className="overlay">
            <h2 className="title small">Level Complete!</h2>
            <p className="subtitle">Score: {stats.score} · Coins: {stats.coins} · Lives: {stats.lives}</p>
            <button className="btn-primary" onClick={nextLevel}>
              Next Level
            </button>
          </div>
        )}

        {screen === 'win' && (
          <div className="overlay">
            <h2 className="title">You Win!</h2>
            <p className="subtitle">
              Final Score: {stats.score} · Coins: {stats.coins}
            </p>
            <button className="btn-primary" onClick={startGame}>
              Play Again
            </button>
          </div>
        )}

        {screen === 'gameOver' && (
          <div className="overlay">
            <h2 className="title small danger">Game Over</h2>
            <p className="subtitle">Score: {stats.score} · Coins: {stats.coins}</p>
            <button className="btn-primary" onClick={startGame}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
