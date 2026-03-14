import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class GameEngine {
    constructor() {
        // --- 1. SCENE SETUP ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 
        this.scene.fog = new THREE.Fog(0x87CEEB, 40, 300); 

        this.clock = new THREE.Clock();

        // --- 2. CAMERAS ---
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        const mapSize = 150; 
        this.minimapCamera = new THREE.OrthographicCamera(mapSize / -2, mapSize / 2, mapSize / 2, mapSize / -2, 1, 1000);
        this.scene.add(this.minimapCamera);

        // --- 3. RENDERERS ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        document.body.appendChild(this.renderer.domElement);

        this.mapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.mapRenderer.setSize(220, 220); 
        document.getElementById('minimap-container').appendChild(this.mapRenderer.domElement);

        // --- 4. GAME STATE ---
        this.obstacles = [];
        this.boat = new THREE.Group(); 
        this.goalZ = -600; 
        this.isGameOver = false;
        
        // --- 5. ASSET MANAGEMENT ---
        this.loadedModels = {};
        this.gltfLoader = new GLTFLoader();

        this.initLighting();
        this.buildBaseEnvironment(); // Builds water/ground immediately
        this.preloadAssets();        // Starts downloading your .glb files
    }

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfffaeb, 1.2); 
        sunLight.position.set(100, 200, 50);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        sunLight.shadow.camera.left = -150;
        sunLight.shadow.camera.right = 150;
        sunLight.shadow.camera.top = 150;
        sunLight.shadow.camera.bottom = -150;
        this.scene.add(sunLight);
    }

    buildBaseEnvironment() {
        // Water
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x1ca3ec, roughness: 0.1, flatShading: true });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 1500), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.z = -500;
        water.receiveShadow = true;
        this.scene.add(water);

        // Banks (Sand/Grass color)
        const bankMat = new THREE.MeshStandardMaterial({ color: 0xedc9af, roughness: 0.9, flatShading: true }); 
        
        const rightBank = new THREE.Mesh(new THREE.PlaneGeometry(200, 1500), bankMat);
        rightBank.rotation.x = -Math.PI / 2;
        rightBank.position.set(130, 0.2, -500);
        rightBank.receiveShadow = true;
        this.scene.add(rightBank);

        const leftBank = new THREE.Mesh(new THREE.PlaneGeometry(200, 1500), bankMat);
        leftBank.rotation.x = -Math.PI / 2;
        leftBank.position.set(-130, 0.2, -500);
        leftBank.receiveShadow = true;
        this.scene.add(leftBank);
        
        this.scene.add(this.boat);
    }

    preloadAssets() {
        // The exact files we need to load
        const filesToLoad = [
            { id: 'boat', file: 'boat-row-small.glb' },
            { id: 'tower', file: 'tower-watch.glb' },
            { id: 'palm', file: 'palm-detailed-straight.glb' },
            { id: 'grass', file: 'grass-patch.glb' },
            { id: 'dock', file: 'structure-platform-dock.glb' },
            { id: 'barrel', file: 'barrel.glb' }
        ];

        let loadedCount = 0;

        filesToLoad.forEach(item => {
            this.gltfLoader.load(
                `assets/models/${item.file}`, 
                (gltf) => {
                    const model = gltf.scene;
                    
                    // Ensure the model casts shadows
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.loadedModels[item.id] = model;
                    loadedCount++;
                    console.log(`✅ Loaded: ${item.file}`);

                    // Build the world once everything is downloaded
                    if (loadedCount === filesToLoad.length) {
                        this.populateWorldWithGLBs();
                    }
                }, 
                undefined, 
                (error) => {
                    console.error(`❌ ERROR: Could not load assets/models/${item.file}`, error);
                }
            );
        });
    }

    populateWorldWithGLBs() {
        // --- 1. THE PLAYER BOAT ---
        const playerBoat = this.loadedModels['boat'].clone();
        playerBoat.scale.set(4, 4, 4); // Scaled up so it's visible
        playerBoat.position.y = 0.5;   // Keep it above water
        playerBoat.rotation.y = Math.PI; // Face forward
        this.boat.add(playerBoat);

        // --- 2. RIGHT BANK SCENERY (Attractive setup) ---
        for (let i = 0; i < 45; i++) {
            const zPos = -Math.random() * 800;
            const randomPick = Math.random();
            let prop;

            if (randomPick < 0.3) {
                // Watchtowers
                prop = this.loadedModels['tower'].clone();
                prop.scale.set(3, 3, 3);
                prop.position.set(45 + Math.random() * 20, 0, zPos);
            } else if (randomPick < 0.6) {
                // Palm Trees
                prop = this.loadedModels['palm'].clone();
                prop.scale.set(3.5, 3.5, 3.5);
                prop.position.set(35 + Math.random() * 20, 0, zPos);
            } else if (randomPick < 0.8) {
                // Grass patches
                prop = this.loadedModels['grass'].clone();
                prop.scale.set(5, 5, 5);
                prop.position.set(35 + Math.random() * 30, 0, zPos);
            } else {
                // Docks on the water's edge
                prop = this.loadedModels['dock'].clone();
                prop.scale.set(3, 3, 3);
                prop.position.set(28, 0.5, zPos); 
            }

            prop.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(prop);
        }

        // --- 3. LEFT BANK SCENERY (Mostly nature to balance) ---
        for (let i = 0; i < 30; i++) {
            const zPos = -Math.random() * 800;
            const prop = Math.random() > 0.5 ? this.loadedModels['palm'].clone() : this.loadedModels['grass'].clone();
            prop.scale.set(3.5, 3.5, 3.5);
            prop.position.set(-35 - Math.random() * 30, 0, zPos);
            prop.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(prop);
        }

        // --- 4. OBSTACLES (Barrels) ---
        for (let z = -80; z >= this.goalZ; z -= 80) {
            const barrel = this.loadedModels['barrel'].clone();
            barrel.scale.set(4, 4, 4); 
            barrel.position.set((Math.random() - 0.5) * 20, 0, z); 
            this.scene.add(barrel);
            this.obstacles.push(barrel);
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(sensorValue, oxygen, onScoreUpdate) {
        const time = this.clock.getElapsedTime() * 1000;

        // Only run game logic if the boat model has actually loaded
        if (!this.isGameOver && this.boat.children.length > 0) { 
            // Breathing Mechanics
            if (sensorValue > 0 && oxygen > 0) {
                oxygen = Math.max(0, oxygen - (sensorValue * 0.01));
                this.boat.position.z -= (sensorValue * 0.015); 
            } else if (sensorValue < 0) {
                oxygen = Math.min(100, oxygen + (Math.abs(sensorValue) * 0.02));
            }

            // Boat bobbing physics
            this.boat.position.y = Math.sin(time * 0.002) * 0.2;
            this.boat.rotation.z = Math.cos(time * 0.001) * 0.03;
            this.boat.rotation.x = Math.sin(time * 0.0015) * 0.03;

            // Collision Check with Barrels
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
                const obs = this.obstacles[i];
                const dist = Math.sqrt(Math.pow(this.boat.position.x - obs.position.x, 2) + Math.pow(this.boat.position.z - obs.position.z, 2));

                if (dist < 4) { 
                    if (sensorValue > 60) {
                        this.scene.remove(obs);
                        this.obstacles.splice(i, 1);
                        onScoreUpdate(100);
                    } else {
                        this.boat.position.z += 0.5; // Bounce back
                    }
                }
            }
        }

        // --- CINEMATIC CHASE CAMERA ---
        const idealOffset = new THREE.Vector3(0, 8, 22).add(this.boat.position);
        const idealLookAt = new THREE.Vector3(0, 2, -10).add(this.boat.position);
        this.camera.position.lerp(idealOffset, 0.1);
        this.camera.lookAt(idealLookAt);

        // --- MINIMAP CAMERA ---
        this.minimapCamera.position.set(this.boat.position.x, 100, this.boat.position.z);
        this.minimapCamera.lookAt(this.boat.position.x, 0, this.boat.position.z);

         // both view will be rendered...on screen
        this.renderer.render(this.scene, this.camera);
        this.mapRenderer.render(this.scene, this.minimapCamera);
        

        return { newOxygen: oxygen };
    }
}