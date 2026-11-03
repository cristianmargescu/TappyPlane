import Phaser from 'phaser';
import FlightScene from './game';
import './style.css';

const gameContainer = document.getElementById('game');
const restartButton = document.getElementById('restart');

if (!gameContainer || !restartButton) {
  throw new Error('The game container or restart button is missing.');
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  width: 800,
  height: 480,
  parent: gameContainer,
  backgroundColor: '#d7edf7',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [FlightScene],
  render: {
    antialias: false,
    roundPixels: true,
  },
});

restartButton.addEventListener('click', () => {
  game.events.emit('restart-game');
});
