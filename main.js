import { GameEngine } from './GameEngine.js';

// Game State
let oxygen = 0;
let score = 0;

// DOM Elements
const slider = document.getElementById('breath-slider');
const oxyBar = document.getElementById('oxy-bar');
const scoreText = document.getElementById('score');
const winScreen = document.getElementById('mission-complete');

// Initialize 3D Engine
const game = new GameEngine();

// Handle Window Resizing
window.addEventListener('resize', () => game.resize());

// Callbacks for Engine events
function addScore(points) {
    score += points;
    scoreText.innerText = score;
}

function handleWin() {
    winScreen.style.display = 'block';
    slider.disabled = true;
}

// Main Game Loop
function animate() {
    requestAnimationFrame(animate);

    const sensorValue = parseInt(slider.value);
    
    // Update game engine and get returned state
    const result = game.update(sensorValue, oxygen, addScore, handleWin);
    oxygen = result.newOxygen;

    // Update UI
    oxyBar.style.width = `${oxygen}%`;
    
    // Auto-return slider to 0 to simulate resting state if not interacted with
    if (Math.abs(sensorValue) > 0) {
        slider.value = sensorValue > 0 ? sensorValue - 1 : sensorValue + 1;
    }
}

// Start loop
animate();