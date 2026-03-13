import * as THREE from 'three';

export class GameEngine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 
        this.scene.fog = new THREE.Fog(0x87CEEB, 40, 300); // Fortnite atmospheric fog

        this.clock = new THREE.Clock();

        // Main Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Minimap Camera (Looking down)
        const mapSize = 150; 
        this.minimapCamera = new THREE.OrthographicCamera(mapSize / -2, mapSize / 2, mapSize / 2, mapSize / -2, 1, 1000);
        this.scene.add(this.minimapCamera);

        // 1. Main Fullscreen Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        document.body.appendChild(this.renderer.domElement);

        // 2. Dedicated Minimap Renderer (Injects into the CSS circle)
        this.mapRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.mapRenderer.setSize(220, 220); // Matches CSS width/height
        document.getElementById('minimap-container').appendChild(this.mapRenderer.domElement);

        // Game State
        this.obstacles = [];
        this.boat = new THREE.Group(); 
        this.goalZ = -600; 
        this.isGameOver = false;

        this.initLighting();
        this.buildWorld(); // Guaranteed to load instantly
    }

    initLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
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

    buildWorld() {
        // --- RIVER ---
        const waterMat = new THREE.MeshStandardMaterial({ color: 0x1ca3ec, roughness: 0.1, flatShading: true });
        const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 1500), waterMat);
        water.rotation.x = -Math.PI / 2;
        water.position.z = -500;
        water.receiveShadow = true;
        this.scene.add(water);

        // --- BANKS ---
        const bankMat = new THREE.MeshStandardMaterial({ color: 0x7cfc00, roughness: 0.9, flatShading: true });
        
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

        // --- TREES & STRUCTURES (Stylized Generation) ---
        const treeGeo = new THREE.ConeGeometry(3, 10, 5);
        const trunkGeo = new THREE.CylinderGeometry(0.8, 0.8, 3, 5);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, flatShading: true });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });

        const houseGeo = new THREE.BoxGeometry(8, 8, 8);
        const roofGeo = new THREE.ConeGeometry(7, 5, 4);
        const houseMat = new THREE.MeshStandardMaterial({ color: 0xffe4c4, flatShading: true });
        const roofMat = new THREE.MeshStandardMaterial({ color: 0xcd5c5c, flatShading: true });

        for (let i = 0; i < 80; i++) {
            const isTree = Math.random() > 0.2; // 80% trees, 20% houses
            const group = new THREE.Group();

            if (isTree) {
                const leaves = new THREE.Mesh(treeGeo, treeMat);
                leaves.position.y = 6;
                leaves.castShadow = true;
                const trunk = new THREE.Mesh(trunkGeo, trunkMat);
                trunk.position.y = 1.5;
                trunk.castShadow = true;
                group.add(leaves, trunk);
            } else {
                const base = new THREE.Mesh(houseGeo, houseMat);
                base.position.y = 4;
                base.castShadow = true;
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.y = 10.5;
                roof.rotation.y = Math.PI / 4;
                roof.castShadow = true;
                group.add(base, roof);
            }

            const isRight = Math.random() > 0.5;
            const xOffset = isRight ? (40 + Math.random() * 60) : (-40 - Math.random() * 60);
            group.position.set(xOffset, 0, -Math.random() * 1000);
            
            // Random scaling for variety
            const scale = 0.8 + Math.random() * 0.5;
            group.scale.set(scale, scale, scale);
            this.scene.add(group);
        }

        // --- BOAT & HERO ---
        const hull = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0xcd853f }));
        hull.position.y = 0.75;
        hull.castShadow = true;
        
        const hero = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xe74c3c }));
        hero.position.set(0, 2.5, -1);
        hero.castShadow = true;

        this.boat.add(hull, hero);
        this.boat.position.set(0, 0, 0);
        this.scene.add(this.boat);

        // --- OBSTACLES ---
        const obsGeo = new THREE.BoxGeometry(4, 4, 4); 
        const obsMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, flatShading: true });
        
        for (let z = -80; z >= this.goalZ; z -= 80) {
            const obs = new THREE.Mesh(obsGeo, obsMat);
            obs.position.set((Math.random() - 0.5) * 20, 2, z); 
            obs.castShadow = true;
            this.scene.add(obs);
            this.obstacles.push(obs);
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    update(sensorValue, oxygen, onScoreUpdate) {
        const time = this.clock.getElapsedTime() * 1000;

        if (!this.isGameOver) {
            // Breathing Mechanics
            if (sensorValue > 0 && oxygen > 0) {
                oxygen = Math.max(0, oxygen - (sensorValue * 0.01));
                this.boat.position.z -= (sensorValue * 0.015); 
            } else if (sensorValue < 0) {
                oxygen = Math.min(100, oxygen + (Math.abs(sensorValue) * 0.02));
            }

            // Boat Physics
            this.boat.position.y = Math.sin(time * 0.002) * 0.2;
            this.boat.rotation.z = Math.cos(time * 0.001) * 0.03;
            this.boat.rotation.x = Math.sin(time * 0.0015) * 0.03;

            // Collision Check
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

        // Render both views
        this.renderer.render(this.scene, this.camera);
        this.mapRenderer.render(this.scene, this.minimapCamera);
        
        return { newOxygen: oxygen };
    }
}