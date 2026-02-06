// ArchiLum POC - Main Application Logic

class ArchiLumApp {
    constructor() {
        // Application state
        this.state = {
            mode: 'bim', // 'bim' or 'render'
            activeTool: 'wall',
            sceneObjects: [],
            materials: {},
            lights: {},
            currentProject: null,
            apiConnected: false
        };

        // Three.js variables
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();
        
        // DOM Elements
        this.canvas = null;
        this.canvasContainer = null;
        
        // Stats
        this.stats = {
            fps: 60,
            triangles: 0,
            objects: 0,
            lastUpdate: Date.now()
        };

        // API Configuration
        this.apiConfig = {
            baseUrl: 'http://localhost:3000/api',
            endpoints: {
                projects: '/projects',
                export: '/export',
                render: '/render',
                assets: '/assets'
            }
        };

        this.init();
    }

    async init() {
        console.log('🔄 Initialisation ArchiLum POC...');
        
        // Initialize UI
        this.initUI();
        
        // Initialize Three.js
        this.initThreeJS();
        
        // Initialize API connection
        await this.initAPI();
        
        // Load initial scene
        this.createDefaultScene();
        
        // Start animation loop
        this.animate();
        
        console.log('✅ ArchiLum POC prêt !');
        this.showToast('Application chargée avec succès !', 'success');
    }

    initUI() {
        console.log('Initialisation de l\'interface...');
        
        // Get DOM elements
        this.canvas = document.getElementById('sceneCanvas');
        this.canvasContainer = document.getElementById('canvasContainer');
        
        // Mode toggle
        document.getElementById('bimModeBtn').addEventListener('click', () => this.setMode('bim'));
        document.getElementById('renderModeBtn').addEventListener('click', () => this.setMode('render'));
        
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tool = e.currentTarget.dataset.tool;
                this.setActiveTool(tool);
            });
        });
        
        // Material selection
        document.getElementById('materialSelect').addEventListener('change', (e) => {
            this.updateSelectedMaterial(e.target.value);
        });
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            document.getElementById('colorValue').textContent = e.target.value;
            this.updateSelectedColor(e.target.value);
        });
        
        // Height slider
        document.getElementById('heightSlider').addEventListener('input', (e) => {
            const height = parseFloat(e.target.value);
            document.getElementById('heightValue').textContent = `${height}m`;
            this.updateSelectedHeight(height);
        });
        
        // Time of day
        document.getElementById('timeOfDay').addEventListener('input', (e) => {
            const hour = parseFloat(e.target.value);
            const timeStr = this.formatTime(hour);
            document.getElementById('timeValue').textContent = timeStr;
            this.updateTimeOfDay(hour);
        });
        
        // Weather
        document.getElementById('weatherSelect').addEventListener('change', (e) => {
            this.updateWeather(e.target.value);
        });
        
        // Shadow intensity
        document.getElementById('shadowIntensity').addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            document.getElementById('shadowValue').textContent = `${value}%`;
            this.updateShadowIntensity(value / 100);
        });
        
        // Asset buttons
        document.querySelectorAll('.asset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const asset = e.currentTarget.dataset.asset;
                this.addAsset(asset);
            });
        });
        
        // View controls
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.changeView(view);
            });
        });
        
        // Action buttons
        document.getElementById('toggleGrid').addEventListener('click', () => this.toggleGrid());
        document.getElementById('toggleAxes').addEventListener('click', () => this.toggleAxes());
        document.getElementById('clearScene').addEventListener('click', () => this.clearScene());
        
        // Export buttons
        document.getElementById('renderImage').addEventListener('click', () => this.renderImage());
        document.getElementById('exportAllBtn').addEventListener('click', () => this.showExportModal());
        document.getElementById('confirmExport').addEventListener('click', () => this.exportProject());
        document.getElementById('cancelExport').addEventListener('click', () => this.hideExportModal());
        document.querySelector('.modal-close').addEventListener('click', () => this.hideExportModal());
        
        // Modal close on background click
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target.id === 'exportModal') {
                this.hideExportModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Canvas click for object placement
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        
        // Update stats periodically
        setInterval(() => this.updateStats(), 1000);
    }

    initThreeJS() {
        console.log('Initialisation de Three.js...');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvasContainer.clientWidth / this.canvasContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(10, 10, 10);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.canvasContainer.clientWidth, this.canvasContainer.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Raycaster for mouse interactions
        this.raycaster = new THREE.Raycaster();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Hide loading overlay
        setTimeout(() => {
            document.getElementById('loadingOverlay').style.display = 'none';
        }, 1000);
    }

    async initAPI() {
        console.log('Connexion à l\'API...');
        
        try {
            // Test API connection
            const response = await fetch(`${this.apiConfig.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                this.state.apiConnected = true;
                document.getElementById('apiStatus').innerHTML = '<i class="fas fa-plug"></i> API: Connecté';
                console.log('✅ API connectée');
            } else {
                throw new Error('API non disponible');
            }
        } catch (error) {
            console.warn('⚠️ API hors ligne, mode hors ligne activé');
            document.getElementById('apiStatus').innerHTML = '<i class="fas fa-plug"></i> API: Hors ligne';
            this.state.apiConnected = false;
        }
    }

    createDefaultScene() {
        console.log('Création de la scène par défaut...');
        
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        this.state.lights.ambient = ambientLight;
        
        // Directional light (sun)
        const sunLight = new THREE.DirectionalLight(0xffffff, 1);
        sunLight.position.set(10, 20, 5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
        this.state.lights.sun = sunLight;
        
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x334155,
            roughness: 0.8,
            metalness: 0.2
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grid helper
        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);
        this.state.grid = gridHelper;
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
        this.state.axes = axesHelper;
        
        // Add some demo objects
        this.createDemoBuilding();
        
        // Update stats
        this.updateObjectCount();
    }

    createDemoBuilding() {
        // Create a simple house for demo
        const materials = {
            wall: new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.7 }),
            roof: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 }),
            window: new THREE.MeshStandardMaterial({ color: 0x87ceeb, transparent: true, opacity: 0.3 }),
            door: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
        };

        // Main building
        const buildingGeometry = new THREE.BoxGeometry(8, 6, 8);
        const building = new THREE.Mesh(buildingGeometry, materials.wall);
        building.position.y = 3;
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);
        this.state.sceneObjects.push({ type: 'building', mesh: building });

        // Roof
        const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
        const roof = new THREE.Mesh(roofGeometry, materials.roof);
        roof.position.y = 9;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        this.scene.add(roof);
        this.state.sceneObjects.push({ type: 'roof', mesh: roof });

        // Windows
        for (let i = 0; i < 4; i++) {
            const windowGeometry = new THREE.BoxGeometry(1, 1.5, 0.1);
            const windowMesh = new THREE.Mesh(windowGeometry, materials.window);
            const angle = (i * Math.PI) / 2;
            windowMesh.position.x = Math.cos(angle) * 4.1;
            windowMesh.position.z = Math.sin(angle) * 4.1;
            windowMesh.position.y = 3;
            this.scene.add(windowMesh);
            this.state.sceneObjects.push({ type: 'window', mesh: windowMesh });
        }

        // Door
        const doorGeometry = new THREE.BoxGeometry(1.2, 2.2, 0.2);
        const door = new THREE.Mesh(doorGeometry, materials.door);
        door.position.set(0, 1, 4.1);
        this.scene.add(door);
        this.state.sceneObjects.push({ type: 'door', mesh: door });

        // Update materials object
        this.state.materials = materials;
    }

    setMode(mode) {
        this.state.mode = mode;
        
        // Update UI
        document.getElementById('bimModeBtn').classList.toggle('active', mode === 'bim');
        document.getElementById('renderModeBtn').classList.toggle('active', mode === 'render');
        
        // Show/hide panels
        document.getElementById('bimPanel').style.display = mode === 'bim' ? 'block' : 'none';
        document.getElementById('renderPanel').style.display = mode === 'render' ? 'block' : 'none';
        
        // Update scene based on mode
        if (mode === 'render') {
            this.activateRenderMode();
        } else {
            this.activateBIMMode();
        }
        
        this.showToast(`Mode ${mode === 'bim' ? 'BIM' : 'Rendu'} activé`, 'success');
    }

    activateRenderMode() {
        // Enhance lighting for render mode
        if (this.state.lights.sun) {
            this.state.lights.sun.intensity = 1.5;
        }
        
        // Add some post-processing effects (simulated)
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
    }

    activateBIMMode() {
        // Reset lighting for BIM mode
        if (this.state.lights.sun) {
            this.state.lights.sun.intensity = 1;
        }
        
        // Reset tone mapping
        this.renderer.toneMapping = THREE.NoToneMapping;
    }

    setActiveTool(tool) {
        this.state.activeTool = tool;
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        this.showToast(`Outil ${tool} sélectionné`, 'info');
    }

    addWall(position) {
        const height = parseFloat(document.getElementById('heightSlider').value);
        const color = document.getElementById('colorPicker').value;
        const materialType = document.getElementById('materialSelect').value;
        
        // Create wall geometry
        const geometry = new THREE.BoxGeometry(3, height, 0.3);
        
        // Create material based on selection
        let material;
        switch(materialType) {
            case 'brick':
                material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.8,
                    bumpScale: 0.05
                });
                break;
            case 'concrete':
                material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.9,
                    metalness: 0.1
                });
                break;
            case 'wood':
                material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.7,
                    metalness: 0.0
                });
                break;
            case 'glass':
                material = new THREE.MeshStandardMaterial({ 
                    color: color,
                    transparent: true,
                    opacity: 0.7,
                    roughness: 0.1
                });
                break;
            default:
                material = new THREE.MeshStandardMaterial({ color: color });
        }
        
        const wall = new THREE.Mesh(geometry, material);
        wall.position.copy(position || new THREE.Vector3(0, height/2, 0));
        wall.castShadow = true;
        wall.receiveShadow = true;
        
        this.scene.add(wall);
        this.state.sceneObjects.push({
            type: 'wall',
            mesh: wall,
            material: materialType,
            color: color,
            height: height
        });
        
        this.updateObjectCount();
        this.updateSurfaceArea();
        
        this.showToast('Mur ajouté', 'success');
    }

    addWindow(position) {
        const geometry = new THREE.BoxGeometry(1.5, 1.2, 0.1);
        const material = new THREE.MeshStandardMaterial({
            color: 0x87ceeb,
            transparent: true,
            opacity: 0.3,
            roughness: 0.1,
            metalness: 0.5
        });
        
        const windowMesh = new THREE.Mesh(geometry, material);
        windowMesh.position.copy(position || new THREE.Vector3(2, 1.5, 0));
        
        this.scene.add(windowMesh);
        this.state.sceneObjects.push({
            type: 'window',
            mesh: windowMesh
        });
        
        this.updateObjectCount();
        this.showToast('Fenêtre ajoutée', 'success');
    }

    addDoor(position) {
        const geometry = new THREE.BoxGeometry(1.2, 2.2, 0.2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.8
        });
        
        const door = new THREE.Mesh(geometry, material);
        door.position.copy(position || new THREE.Vector3(-2, 1.1, 0));
        
        this.scene.add(door);
        this.state.sceneObjects.push({
            type: 'door',
            mesh: door
        });
        
        this.updateObjectCount();
        this.showToast('Porte ajoutée', 'success');
    }

    addAsset(assetType) {
        let mesh;
        
        switch(assetType) {
            case 'tree':
                // Simple tree representation
                const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 3);
                const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                
                const leavesGeometry = new THREE.ConeGeometry(2, 4, 8);
                const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
                const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                leaves.position.y = 4;
                
                mesh = new THREE.Group();
                mesh.add(trunk);
                mesh.add(leaves);
                break;
                
            case 'person':
                const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.8);
                const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3498db });
                mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
                break;
                
            case 'car':
                const carGeometry = new THREE.BoxGeometry(2, 0.8, 4);
                const carMaterial = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
                mesh = new THREE.Mesh(carGeometry, carMaterial);
                break;
                
            case 'plant':
                const plantGeometry = new THREE.SphereGeometry(0.5);
                const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
                mesh = new THREE.Mesh(plantGeometry, plantMaterial);
                break;
        }
        
        if (mesh) {
            // Position near camera
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            const position = this.camera.position.clone().add(cameraDirection.multiplyScalar(5));
            position.y = 0;
            
            mesh.position.copy(position);
            mesh.castShadow = true;
            this.scene.add(mesh);
            
            this.state.sceneObjects.push({
                type: 'asset',
                assetType: assetType,
                mesh: mesh
            });
            
            this.updateObjectCount();
            this.showToast(`${assetType} ajouté`, 'success');
        }
    }

    updateSelectedMaterial(material) {
        // Update selected objects or prepare for new objects
        const selectedColor = document.getElementById('colorPicker').value;
        
        // Update material preview
        const previewElement = document.querySelector('.tool-btn.active');
        if (previewElement) {
            previewElement.style.borderColor = selectedColor;
        }
    }

    updateSelectedColor(color) {
        // Update color of selected objects or prepare for new objects
        console.log('Couleur mise à jour:', color);
    }

    updateSelectedHeight(height) {
        // Update height of selected objects or prepare for new objects
        console.log('Hauteur mise à jour:', height);
    }

    updateTimeOfDay(hour) {
        // Update sun position based on time
        if (this.state.lights.sun) {
            const sunAngle = (hour / 24) * Math.PI * 2;
            const sunX = Math.cos(sunAngle) * 20;
            const sunY = Math.sin(sunAngle) * 10 + 10;
            const sunZ = Math.sin(sunAngle) * 20;
            
            this.state.lights.sun.position.set(sunX, sunY, sunZ);
            
            // Update light color based on time
            if (hour < 6 || hour > 18) {
                // Night - blueish light
                this.state.lights.sun.color.setHex(0x4444ff);
                this.state.lights.sun.intensity = 0.5;
            } else if (hour < 8 || hour > 16) {
                // Morning/Evening - warm light
                this.state.lights.sun.color.setHex(0xffaa66);
                this.state.lights.sun.intensity = 0.8;
            } else {
                // Day - white light
                this.state.lights.sun.color.setHex(0xffffff);
                this.state.lights.sun.intensity = 1.2;
            }
        }
    }

    updateWeather(weather) {
        console.log('Météo mise à jour:', weather);
        
        // Update scene atmosphere based on weather
        switch(weather) {
            case 'sunny':
                this.scene.background = new THREE.Color(0x87ceeb);
                break;
            case 'cloudy':
                this.scene.background = new THREE.Color(0xb0c4de);
                break;
            case 'overcast':
                this.scene.background = new THREE.Color(0x778899);
                break;
            case 'foggy':
                this.scene.background = new THREE.Color(0xd3d3d3);
                // Add fog effect
                this.scene.fog = new THREE.Fog(0xd3d3d3, 10, 50);
                break;
        }
    }

    updateShadowIntensity(intensity) {
        if (this.state.lights.sun) {
            this.state.lights.sun.shadow.darkness = 1 - intensity;
        }
    }

    changeView(view) {
        // Update UI
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        
        // Move camera based on view
        switch(view) {
            case '3d':
                this.camera.position.set(10, 10, 10);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'top':
                this.camera.position.set(0, 20, 0.1);
                this.camera.lookAt(0, 0, 0);
                break;
            case 'front':
                this.camera.position.set(0, 5, 20);
                this.camera.lookAt(0, 5, 0);
                break;
        }
        
        this.controls.update();
    }

    toggleGrid() {
        if (this.state.grid) {
            this.state.grid.visible = !this.state.grid.visible;
        }
    }

    toggleAxes() {
        if (this.state.axes) {
            this.state.axes.visible = !this.state.axes.visible;
        }
    }

    clearScene() {
        if (confirm('Êtes-vous sûr de vouloir tout effacer ?')) {
            // Remove all user-added objects
            this.state.sceneObjects.forEach(obj => {
                this.scene.remove(obj.mesh);
            });
            
            // Reset state
            this.state.sceneObjects = [];
            
            // Keep only default objects
            this.createDemoBuilding();
            
            this.updateObjectCount();
            this.updateSurfaceArea();
            
            this.showToast('Scène réinitialisée', 'success');
        }
    }

    async renderImage() {
        this.showToast('Génération du rendu en cours...', 'info');
        
        try {
            // Get quality setting
            const quality = document.querySelector('.quality-btn.active')?.dataset.quality || 'medium';
            
            // Create a high-res render
            const originalSize = {
                width: this.renderer.domElement.width,
                height: this.renderer.domElement.height
            };
            
            // Set high resolution based on quality
            let multiplier = 1;
            switch(quality) {
                case 'low': multiplier = 1; break;
                case 'medium': multiplier = 2; break;
                case 'high': multiplier = 4; break;
            }
            
            this.renderer.setSize(
                originalSize.width * multiplier,
                originalSize.height * multiplier
            );
            
            // Render one frame
            this.renderer.render(this.scene, this.camera);
            
            // Get image data
            const dataURL = this.renderer.domElement.toDataURL('image/png');
            
            // Reset size
            this.renderer.setSize(originalSize.width, originalSize.height);
            
            // Create download link
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = `archilum-rendu-${Date.now()}.png`;
            link.click();
            
            this.showToast('Rendu exporté avec succès !', 'success');
            
            // If API is connected, save to cloud
            if (this.state.apiConnected) {
                await this.saveRenderToAPI(dataURL);
            }
            
        } catch (error) {
            console.error('Erreur lors du rendu:', error);
            this.showToast('Erreur lors du rendu', 'error');
        }
    }

    async saveRenderToAPI(dataURL) {
        try {
            const response = await fetch(`${this.apiConfig.baseUrl}${this.apiConfig.endpoints.render}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: dataURL,
                    timestamp: Date.now(),
                    projectId: this.state.currentProject?.id || 'demo'
                })
            });
            
            if (response.ok) {
                console.log('✅ Rendu sauvegardé sur le cloud');
            }
        } catch (error) {
            console.warn('⚠️ Impossible de sauvegarder sur le cloud:', error);
        }
    }

    showExportModal() {
        document.getElementById('exportModal').classList.add('active');
        
        // Update preview
        this.updateExportPreview();
    }

    hideExportModal() {
        document.getElementById('exportModal').classList.remove('active');
    }

    updateExportPreview() {
        const preview = document.getElementById('exportPreview');
        preview.innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-cube" style="font-size: 48px; color: #3b82f6; margin-bottom: 16px;"></i>
                <p>Projet prêt à exporter</p>
                <p style="font-size: 0.875rem; color: #94a3b8;">
                    ${this.state.sceneObjects.length} objets<br>
                    ${this.stats.triangles.toLocaleString()} triangles
                </p>
            </div>
        `;
    }

    async exportProject() {
        const format = document.querySelector('.format-card.active')?.dataset.format || 'json';
        
        try {
            this.showToast(`Export ${format} en cours...`, 'info');
            
            let data, filename, mimeType;
            
            switch(format) {
                case 'image':
                    await this.renderImage();
                    return;
                    
                case 'gltf':
                    // Export as GLTF (simplified)
                    data = this.exportAsGLTF();
                    filename = `archilum-project-${Date.now()}.gltf`;
                    mimeType = 'model/gltf+json';
                    break;
                    
                case 'json':
                    // Export as JSON
                    data = this.exportAsJSON();
                    filename = `archilum-project-${Date.now()}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'ifc':
                    // Export as IFC (simulated)
                    data = this.exportAsIFC();
                    filename = `archilum-project-${Date.now()}.ifc`;
                    mimeType = 'application/ifc';
                    break;
            }
            
            // Create download
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);
            
            this.showToast(`Projet exporté en ${format.toUpperCase()}`, 'success');
            this.hideExportModal();
            
        } catch (error) {
            console.error('Erreur d\'export:', error);
            this.showToast('Erreur lors de l\'export', 'error');
        }
    }

    exportAsJSON() {
        const projectData = {
            metadata: {
                version: '1.0',
                created: new Date().toISOString(),
                application: 'ArchiLum POC'
            },
            scene: {
                objects: this.state.sceneObjects.map(obj => ({
                    type: obj.type,
                    position: obj.mesh.position.toArray(),
                    rotation: obj.mesh.rotation.toArray(),
                    scale: obj.mesh.scale.toArray(),
                    material: obj.material,
                    color: obj.color,
                    height: obj.height
                })),
                lights: {
                    ambient: this.state.lights.ambient?.intensity,
                    sun: this.state.lights.sun?.position.toArray()
                }
            },
            stats: {
                objectCount: this.state.sceneObjects.length,
                triangleCount: this.stats.triangles
            }
        };
        
        return JSON.stringify(projectData, null, 2);
    }

    exportAsGLTF() {
        // Simplified GLTF export
        const gltf = {
            asset: {
                version: "2.0",
                generator: "ArchiLum POC"
            },
            scenes: [{
                nodes: [0]
            }],
            nodes: [{
                mesh: 0
            }],
            meshes: [{
                primitives: [{
                    attributes: {
                        POSITION: 0
                    },
                    indices: 1,
                    mode: 4
                }]
            }],
            // Note: In a real implementation, you would use THREE.GLTFExporter
        };
        
        return JSON.stringify(gltf, null, 2);
    }

    exportAsIFC() {
        // Simplified IFC export (simulated)
        const ifcData = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ArchiLum Export'),'2;1');
FILE_NAME('archilum_export.ifc','${new Date().toISOString()}',(''),(''),'ArchiLum POC','','');
FILE_SCHEMA(('IFC4'));
ENDSEC;

DATA;
#1=IFCPROJECT('0w8$qLr6z44PARMpzvT0zx',#2,'Projet ArchiLum','Description',$,$,$,(#7),#8);
#2=IFCOWNERHISTORY(#3,#6,$,.NOCHANGE.,$,$,$,0);
#3=IFCPERSONANDORGANIZATION(#4,#5,$);
#4=IFCPERSON($,'Architect','User',$,$,$);
#5=IFCORGANIZATION($,'ArchiLum','$');
#6=IFCAPPLICATION(#5,'1.0','ArchiLum','POC');
#7=IFCUNITASSIGNMENT((#9,#10));
#8=IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,1.0E-5,#11,$);
#9=IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.);
#10=IFCSIUNIT(*,.AREAUNIT.,$,.SQUARE_METRE.);
#11=IFCAXIS2PLACEMENT3D(#12,#13,#14);
#12=IFCCARTESIANPOINT((0.,0.,0.));
#13=IFCDIRECTION((0.,0.,1.));
#14=IFCDIRECTION((1.,0.,0.));

/* Building elements would go here */

ENDSEC;
END-ISO-10303-21;`;
        
        return ifcData;
    }

    handleCanvasClick(event) {
        // Calculate mouse position in normalized device coordinates
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Update the picking ray with the camera and mouse position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Calculate objects intersecting the picking ray
        const intersects = this.raycaster.intersectObjects(
            this.scene.children.filter(obj => obj !== this.state.grid && obj !== this.state.axes),
            true
        );
        
        if (intersects.length > 0) {
            // Clicked on an object
            const intersect = intersects[0];
            
            // If in BIM mode and using a tool, place new object at intersection
            if (this.state.mode === 'bim') {
                const position = intersect.point.clone();
                position.y += 0.01; // Slightly above surface
                
                switch(this.state.activeTool) {
                    case 'wall':
                        this.addWall(position);
                        break;
                    case 'window':
                        this.addWindow(position);
                        break;
                    case 'door':
                        this.addDoor(position);
                        break;
                    case 'furniture':
                        // For furniture, we could add at intersection point
                        this.showToast('Cliquez pour placer le mobilier', 'info');
                        break;
                }
            }
        } else {
            // Clicked on empty space - could place object at ground level
            if (this.state.mode === 'bim' && this.state.activeTool === 'furniture') {
                // Cast ray to ground plane
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
                const target = new THREE.Vector3();
                this.raycaster.ray.intersectPlane(plane, target);
                
                // Add furniture at target position
                // This would be implemented based on furniture type
                this.showToast('Sélectionnez un type de mobilier', 'info');
            }
        }
    }

    handleMouseMove(event) {
        // Could implement hover effects or preview placement here
    }

    handleKeyPress(event) {
        // Keyboard shortcuts
        switch(event.key.toLowerCase()) {
            case 'h':
                // Toggle help/panels
                event.preventDefault();
                this.togglePanels();
                break;
                
            case '1':
                event.preventDefault();
                this.setActiveTool('wall');
                break;
                
            case '2':
                event.preventDefault();
                this.setActiveTool('window');
                break;
                
            case '3':
                event.preventDefault();
                this.setActiveTool('door');
                break;
                
            case 'escape':
                this.hideExportModal();
                break;
                
            case ' ':
                // Space to switch mode
                event.preventDefault();
                this.setMode(this.state.mode === 'bim' ? 'render' : 'bim');
                break;
        }
    }

    togglePanels() {
        const leftPanel = document.getElementById('bimPanel');
        const rightPanel = document.getElementById('renderPanel');
        
        leftPanel.classList.toggle('active');
        rightPanel.classList.toggle('active');
    }

    updateObjectCount() {
        const count = this.state.sceneObjects.length;
        document.getElementById('objectCount').textContent = count;
        this.stats.objects = count;
    }

    updateSurfaceArea() {
        // Calculate approximate surface area (simplified)
        let area = 0;
        this.state.sceneObjects.forEach(obj => {
            if (obj.type === 'wall' && obj.height) {
                // Assume walls are 3m wide (default)
                area += 3 * obj.height;
            }
        });
        
        document.getElementById('surfaceArea').textContent = `${area.toFixed(1)} m²`;
    }

    updateStats() {
        // Calculate FPS
        const now = Date.now();
        const delta = now - this.stats.lastUpdate;
        this.stats.fps = Math.round(1000 / delta);
        this.stats.lastUpdate = now;
        
        // Update triangle count
        this.stats.triangles = 0;
        this.scene.traverse((object) => {
            if (object.isMesh) {
                if (object.geometry.index) {
                    this.stats.triangles += object.geometry.index.count / 3;
                } else if (object.geometry.attributes.position) {
                    this.stats.triangles += object.geometry.attributes.position.count / 3;
                }
            }
        });
        
        // Update UI
        document.getElementById('fpsCounter').textContent = `${this.stats.fps} FPS`;
        document.getElementById('triangleCount').textContent = `${this.stats.triangles.toLocaleString()} triangles`;
    }

    formatTime(hour) {
        const hours = Math.floor(hour);
        const minutes = Math.round((hour - hours) * 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    onWindowResize() {
        const width = this.canvasContainer.clientWidth;
        const height = this.canvasContainer.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update controls
        this.controls.update();
        
        // Simple rotation for demo objects
        this.state.sceneObjects.forEach(obj => {
            if (obj.type === 'asset' && obj.assetType === 'tree') {
                // Gentle swaying for trees
                obj.mesh.rotation.y += 0.001;
            }
        });
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    getToastIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }
}

// API Server (Node.js/Express) - api-server.js
const apiServerCode = `
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
const projectsDir = path.join(dataDir, 'projects');
const rendersDir = path.join(dataDir, 'renders');

async function ensureDirectories() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(projectsDir, { recursive: true });
    await fs.mkdir(rendersDir, { recursive: true });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Projects endpoints
app.post('/api/projects', async (req, res) => {
    try {
        await ensureDirectories();
        
        const project = req.body;
        const projectId = 'project_' + Date.now();
        const filename = path.join(projectsDir, \`\${projectId}.json\`);
        
        await fs.writeFile(filename, JSON.stringify(project, null, 2));
        
        res.json({
            success: true,
            projectId: projectId,
            message: 'Project saved successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/projects/:id', async (req, res) => {
    try {
        const filename = path.join(projectsDir, \`\${req.params.id}.json\`);
        const data = await fs.readFile(filename, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(404).json({ error: 'Project not found' });
    }
});

// Export endpoint
app.post('/api/export', async (req, res) => {
    try {
        await ensureDirectories();
        
        const { format, data, projectId } = req.body;
        const timestamp = Date.now();
        const filename = \`export_\${projectId}_\${timestamp}.\${format}\`;
        const filepath = path.join(projectsDir, filename);
        
        if (format === 'json') {
            await fs.writeFile(filepath, JSON.stringify(data, null, 2));
        } else {
            await fs.writeFile(filepath, data);
        }
        
        res.json({
            success: true,
            filename: filename,
            downloadUrl: \`/api/download/\${filename}\`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Render endpoint
app.post('/api/render', async (req, res) => {
    try {
        await ensureDirectories();
        
        const { image, timestamp, projectId } = req.body;
        const filename = \`render_\${projectId}_\${timestamp}.png\`;
        const filepath = path.join(rendersDir, filename);
        
        // Remove data URL prefix
        const base64Data = image.replace(/^data:image\\/png;base64,/, '');
        await fs.writeFile(filepath, base64Data, 'base64');
        
        res.json({
            success: true,
            filename: filename,
            previewUrl: \`/api/renders/\${filename}\`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Assets endpoints
app.get('/api/assets', async (req, res) => {
    try {
        const assets = {
            furniture: [
                { id: 'chair', name: 'Chaise', type: 'furniture' },
                { id: 'table', name: 'Table', type: 'furniture' },
                { id: 'bed', name: 'Lit', type: 'furniture' },
                { id: 'sofa', name: 'Canapé', type: 'furniture' }
            ],
            vegetation: [
                { id: 'tree_oak', name: 'Chêne', type: 'tree' },
                { id: 'tree_pine', name: 'Pin', type: 'tree' },
                { id: 'bush', name: 'Buisson', type: 'vegetation' },
                { id: 'flower', name: 'Fleur', type: 'vegetation' }
            ],
            vehicles: [
                { id: 'car_sedan', name: 'Voiture', type: 'vehicle' },
                { id: 'bicycle', name: 'Vélo', type: 'vehicle' }
            ],
            people: [
                { id: 'person_standing', name: 'Personne debout', type: 'person' },
                { id: 'person_sitting', name: 'Personne assise', type: 'person' }
            ]
        };
        
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// File download endpoints
app.get('/api/download/:filename', async (req, res) => {
    try {
        const filepath = path.join(projectsDir, req.params.filename);
        res.download(filepath);
    } catch (error) {
        res.status(404).json({ error: 'File not found' });
    }
});

app.get('/api/renders/:filename', async (req, res) => {
    try {
        const filepath = path.join(rendersDir, req.params.filename);
        res.sendFile(filepath);
    } catch (error) {
        res.status(404).json({ error: 'Render not found' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(\`🚀 API Server running on http://localhost:\${PORT}\`);
    console.log(\`📁 Data directory: \${dataDir}\`);
});

module.exports = app;
`;

// Instructions for setup
const setupInstructions = `
=== INSTRUCTIONS DE MISE EN PLACE ===

1. Créez les fichiers :
   - index.html
   - style.css
   - script.js
   - api-server.js (optionnel)

2. Pour le frontend seul :
   - Ouvrez simplement index.html dans un navigateur
   - L'application fonctionnera en mode hors ligne

3. Pour l'API backend (optionnel) :
   a) Installez Node.js si ce n'est pas fait
   b) Dans le dossier du projet, exécutez :
      npm init -y
      npm install express cors
   
   c) Créez le fichier api-server.js avec le code fourni
   d) Exécutez : node api-server.js
   e) Accédez à : http://localhost:3000

4. Fonctionnalités incluses :
   - Interface BIM (style ArchiCAD)
   - Interface Rendu (style Lumion)
   - Modélisation 3D basique
   - Export d'images
   - Simulation jour/nuit
   - API REST complète
   - Mode hors ligne

5. Lien entre frontend et backend :
   - Frontend : script.js contient toute la logique 3D
   - Backend : api-server.js gère sauvegarde/export
   - Communication via fetch() API

=== BON DÉVELOPPEMENT ! ===
`;

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ArchiLumApp();
    
    // Log setup instructions
    console.log(setupInstructions);
});

// Export setup instructions for the API server
console.log(`
=== POUR CRÉER L'API SERVER ===

1. Créez un fichier api-server.js
2. Copiez ce code :

${apiServerCode}

3. Exécutez : node api-server.js
4. Accédez à : http://localhost:3000
`);