import Phaser from 'phaser';
import backgroundUrl from '../Assets/Textures/background.png';
import playerUrl from '../Assets/Textures/player.png';
import rockUrl from '../Assets/Textures/rock.png';
import rockDownUrl from '../Assets/Textures/rockDown.png';

const WIDTH = 800;
const HEIGHT = 480;
const PLAYER_X = 135;
const PLAYER_HALF_WIDTH = 24;
const PLAYER_HALF_HEIGHT = 20;
const PIPE_WIDTH = 108;
const PIPE_HEIGHT = 239;
const GAP_HEIGHT = 172;
const GRAVITY = 1050;
const FLAP_VELOCITY = -390;
const MAX_FALL_SPEED = 690;
const PIPE_SPEED = 235;
const PIPE_INTERVAL = 1.48;
const BEST_SCORE_KEY = 'tappy-plane-best';

type FlightState = 'ready' | 'playing' | 'gameover';

interface ObstaclePair {
  x: number;
  gapTop: number;
  gapBottom: number;
  top: Phaser.GameObjects.Image;
  bottom: Phaser.GameObjects.Image;
  passed: boolean;
}

export default class FlightScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private instruction!: Phaser.GameObjects.Text;
  private scoreElement!: HTMLElement;
  private bestElement!: HTMLElement;
  private statusElement!: HTMLElement;
  private obstacles: ObstaclePair[] = [];
  private state: FlightState = 'ready';
  private score = 0;
  private bestScore = 0;
  private playerVelocity = 0;
  private spawnElapsed = 0;
  private idleElapsed = 0;

  constructor() {
    super('FlightScene');
  }

  preload(): void {
    this.load.image('background', backgroundUrl);
    this.load.image('player', playerUrl);
    this.load.image('rock', rockUrl);
    this.load.image('rock-down', rockDownUrl);
  }

  create(): void {
    const scoreElement = document.getElementById('score-value');
    const bestElement = document.getElementById('best-value');
    const statusElement = document.getElementById('game-status');
    if (!scoreElement || !bestElement || !statusElement) {
      throw new Error('The flight score display is missing.');
    }

    this.scoreElement = scoreElement;
    this.bestElement = bestElement;
    this.statusElement = statusElement;

    const savedBest = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    this.bestScore = Number.isFinite(savedBest) ? Math.max(0, savedBest) : 0;

    this.add.image(WIDTH / 2, HEIGHT / 2, 'background')
      .setDisplaySize(WIDTH, HEIGHT)
      .setDepth(-1);

    this.player = this.add.image(PLAYER_X, HEIGHT / 2, 'player')
      .setDisplaySize(72, 60)
      .setDepth(2);

    this.overlay = this.add.rectangle(WIDTH / 2, HEIGHT / 2, 438, 166, 0x14243a, 0.86)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setDepth(10);

    this.title = this.add.text(WIDTH / 2, HEIGHT / 2 - 28, '', {
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '38px',
      fontStyle: 'bold',
      stroke: '#14243a',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(11);

    this.instruction = this.add.text(WIDTH / 2, HEIGHT / 2 + 28, '', {
      color: '#eff8ff',
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      stroke: '#14243a',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(11);

    this.input.on('pointerdown', this.handleInput, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleKeyboardInput, this);
    this.game.events.on('restart-game', this.resetGame, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('restart-game', this.resetGame, this);
    });

    this.resetGame();
  }

  update(_time: number, delta: number): void {
    const seconds = Math.min(delta, 50) / 1000;

    if (this.state === 'ready') {
      this.idleElapsed += seconds;
      this.player.y = HEIGHT / 2 + Math.sin(this.idleElapsed * 2.8) * 8;
      return;
    }

    if (this.state !== 'playing') {
      return;
    }

    this.playerVelocity = Math.min(this.playerVelocity + GRAVITY * seconds, MAX_FALL_SPEED);
    this.player.y += this.playerVelocity * seconds;
    this.player.setAngle(Phaser.Math.Clamp(this.playerVelocity * 0.055, -18, 42));

    if (this.player.y - PLAYER_HALF_HEIGHT < 0 || this.player.y + PLAYER_HALF_HEIGHT > HEIGHT) {
      this.endGame();
      return;
    }

    this.spawnElapsed += seconds;
    if (this.spawnElapsed >= PIPE_INTERVAL) {
      this.spawnElapsed -= PIPE_INTERVAL;
      this.spawnObstacle();
    }

    this.updateObstacles(seconds);
  }

  private readonly handleInput = (): void => {
    if (this.state === 'gameover') {
      this.resetGame();
      this.startGame();
    } else if (this.state === 'ready') {
      this.startGame();
    }

    if (this.state === 'playing') {
      this.flap();
    }
  };

  private readonly handleKeyboardInput = (event: KeyboardEvent): void => {
    event.preventDefault();
    this.handleInput();
  };

  private startGame(): void {
    this.state = 'playing';
    this.spawnElapsed = PIPE_INTERVAL - 0.82;
    this.overlay.setVisible(false);
    this.title.setVisible(false);
    this.instruction.setVisible(false);
    this.updateHud();
  }

  private flap(): void {
    this.playerVelocity = FLAP_VELOCITY;
  }

  private spawnObstacle(): void {
    const gapCenter = Phaser.Math.Between(158, HEIGHT - 158);
    const gapTop = gapCenter - GAP_HEIGHT / 2;
    const gapBottom = gapCenter + GAP_HEIGHT / 2;
    const x = WIDTH + PIPE_WIDTH;

    const top = this.add.image(x, gapTop - PIPE_HEIGHT / 2, 'rock-down').setDepth(1);
    const bottom = this.add.image(x, gapBottom + PIPE_HEIGHT / 2, 'rock').setDepth(1);

    this.obstacles.push({
      x,
      gapTop,
      gapBottom,
      top,
      bottom,
      passed: false,
    });
  }

  private updateObstacles(seconds: number): void {
    for (let index = this.obstacles.length - 1; index >= 0; index -= 1) {
      const obstacle = this.obstacles[index];
      obstacle.x -= PIPE_SPEED * seconds;
      obstacle.top.x = obstacle.x;
      obstacle.bottom.x = obstacle.x;

      const playerLeft = PLAYER_X - PLAYER_HALF_WIDTH;
      const playerRight = PLAYER_X + PLAYER_HALF_WIDTH;
      const playerTop = this.player.y - PLAYER_HALF_HEIGHT;
      const playerBottom = this.player.y + PLAYER_HALF_HEIGHT;
      const overlapsPipe = playerRight > obstacle.x - PIPE_WIDTH / 2
        && playerLeft < obstacle.x + PIPE_WIDTH / 2;

      if (overlapsPipe && (playerTop < obstacle.gapTop || playerBottom > obstacle.gapBottom)) {
        this.endGame();
        return;
      }

      if (!obstacle.passed && obstacle.x + PIPE_WIDTH / 2 < playerLeft) {
        obstacle.passed = true;
        this.score += 1;
        this.updateHud();
      }

      if (obstacle.x + PIPE_WIDTH / 2 < 0) {
        obstacle.top.destroy();
        obstacle.bottom.destroy();
        this.obstacles.splice(index, 1);
      }
    }
  }

  private endGame(): void {
    this.state = 'gameover';
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      window.localStorage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    }

    this.overlay.setVisible(true);
    this.title.setText('FLIGHT OVER').setVisible(true);
    this.instruction.setText('Click or press Space to fly again').setVisible(true);
    this.updateHud();
  }

  private resetGame(): void {
    for (const obstacle of this.obstacles) {
      obstacle.top.destroy();
      obstacle.bottom.destroy();
    }
    this.obstacles = [];
    this.state = 'ready';
    this.score = 0;
    this.playerVelocity = 0;
    this.spawnElapsed = 0;
    this.player.setPosition(PLAYER_X, HEIGHT / 2).setAngle(0);
    this.overlay.setVisible(true);
    this.title.setText('TAPPY PLANE').setVisible(true);
    this.instruction.setText('Click or press Space to take off').setVisible(true);
    this.updateHud();
  }

  private updateHud(): void {
    this.scoreElement.textContent = String(this.score);
    this.bestElement.textContent = String(this.bestScore);
    this.statusElement.textContent = this.state === 'ready'
      ? 'Ready for takeoff'
      : this.state === 'playing' ? 'In flight' : 'Flight complete';
  }
}
