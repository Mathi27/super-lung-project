export class MicInput {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.isInitialized = false;
        this.volume = 0;
    }

    async init() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            
            // Tweak these for performance vs accuracy
            this.analyser.fftSize = 256; 
            this.analyser.smoothingTimeConstant = 0.8; // Smooths out sudden spikes
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isInitialized = true;
            
            console.log("✅ Microphone successfully connected!");
            return true;
        } catch (error) {
            console.error("❌ Microphone access denied or failed:", error);
            alert("Microphone access is required to play with breath controls.");
            return false;
        }
    }

    getVolume() {
        if (!this.isInitialized) return 0;

        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate average volume across all frequencies
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        
        let average = sum / this.dataArray.length;

        // Map the raw volume (usually 0-100) to a percentage.
        // You may need to tweak the multiplier based on testing with a real mic.
        this.volume = Math.min(100, average * 1.5); 
        
        return this.volume;
    }
}