import { GameEngine } from './GameEngine.js';

let oxygen = 0;
let score = 0;

// UI DOM Elements
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const btnPlay = document.getElementById('btn-play');
const btnSettings = document.getElementById('btn-settings');

// Game DOM Elements
const slider = document.getElementById('breath-slider');
const oxyBar = document.getElementById('oxy-bar');
const scoreText = document.getElementById('score');

// Initialize 3D Engine
const game = new GameEngine();

window.addEventListener('resize', () => game.resize());

// --- BUTTON LISTENERS ---
btnPlay.addEventListener('click', () => {
    // 🚨 SAFETY CHECK: Don't let them play if the boat hasn't loaded!
    if (game.boat.children.length === 0) {
        alert("Assets are still loading... Please wait a moment.");
        return;
    }

    mainMenu.style.opacity = '0';
    
    setTimeout(() => {
        mainMenu.style.display = 'none';
        gameUI.style.display = 'block'; 
        game.gameState = 'PLAYING'; 
    }, 500); 
});

btnSettings.addEventListener('click', () => {
    alert("Settings menu coming soon!");
});

// --- GAME LOOP ---
function addScore(points) {
    score += points;
    scoreText.innerText = score;
}

function animate() {
    requestAnimationFrame(animate);

    // 🚨 SAFETY CHECK: Only update the game if the boat exists
    if (game.boat.children.length > 0) {
        const sensorValue = parseInt(slider.value);
        
        const result = game.update(sensorValue, oxygen, addScore);
        oxygen = result.newOxygen;

        oxyBar.style.width = `${oxygen}%`;
        
        if (Math.abs(sensorValue) > 0) {
            slider.value = sensorValue > 0 ? sensorValue - 1 : sensorValue + 1;
        }
    } else {
        // If models are still loading, just render the empty water/sky
        game.renderer.render(game.scene, game.camera);
    }
}

// Start loop
animate();