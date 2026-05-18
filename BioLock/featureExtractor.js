export class FeatureExtractor {
    constructor() {
        this.keydowns = new Map();
        this.lastMouse = null;
        this.lastKeydown = null;
    }
    processBatch(events) {
        const features = {};
        const flightTimes = [];
        const dwellTimes = [];
        const velocities = [];
        events.forEach(e => {
            if (e.type === 'keydown') {
                if (this.lastKeydown) {
                    flightTimes.push(e.ts - this.lastKeydown);
                }
                this.lastKeydown = e.ts;
                this.keydowns.set(e.code, e.ts);
            } else if (e.type === 'keyup') {
                if (this.keydowns.has(e.code)) {
                    const downTime = this.keydowns.get(e.code);
                    dwellTimes.push(e.ts - downTime);
                    this.keydowns.delete(e.code);
                }
            }
            if (e.type === 'mousemove') {
                if (this.lastMouse) {
                    const dx = e.x - this.lastMouse.x;
                    const dy = e.y - this.lastMouse.y;
                    const dt = e.ts - this.lastMouse.ts;
                    if (dt > 0) {
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        velocities.push(dist / dt);
                    }
                }
                this.lastMouse = { x: e.x, y: e.y, ts: e.ts };
            }
        });
        features.avgDwell = this.mean(dwellTimes);
        features.avgVelocity = this.mean(velocities);
        features.avgFlight = this.mean(flightTimes);
        features.eventCount = events.length;
        return features;
    }
    detectBurst(velocities) {
        return velocities.filter(v => v > 1.0).length;
    }
    mean(arr) {
        if (arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}
