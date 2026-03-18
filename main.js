import { GameEngine } from './GameEngine.js';
import { MicInput } from './MicInput.js';  

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
const mic = new MicInput();

window.addEventListener('resize', () => game.resize());

// --- BUTTON LISTENERS ---
btnPlay.addEventListener('click', async () => {
    // 🚨 SAFETY CHECK: Don't let them play if the boat hasn't loaded!
    if (game.boat.children.length === 0) {
        alert("Assets are still loading... Please wait a moment.");
        return;
    }

    
    btnPlay.innerText = "CONNECTING MIC...";
    const hasMic = await mic.init();
    if(hasMic){
        mainMenu.style.opacity = '0';
            setTimeout(() => {
        mainMenu.style.display = 'none';
        gameUI.style.display = 'block'; 
        game.gameState = 'PLAYING'; 
    }, 500); 
    }else{
        btnPlay.innerText = "MIC FAILED";
    }

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

if (game.boat.children.length > 0 && game.gameState === 'PLAYING') {
        
        // --- NEW: Read from Microphone instead of Slider ---
        const micVolume = mic.getVolume(); 
        
        // Threshold: If volume is high (> 20), treat as EXHALE. If low, treat as INHALE.
        let breathForce = 0;
        if (micVolume > 20) {
            breathForce = micVolume; // Exhale (Positive force to move boat)
        } else {
            breathForce = -30; // Inhale (Negative force to charge oxygen)
        }
        
        const result = game.update(breathForce, oxygen, (pts) => score += pts);
        oxygen = result.newOxygen;

        oxyBar.style.width = `${oxygen}%`;
    } else {
        game.renderer.render(game.scene, game.camera);
    }
}

// Start loop
animate();