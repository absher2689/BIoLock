export class SecurityPolicy {
    constructor() {
        this.thresholds = {
            warn: 0.8,
            lock: 1.3
        };
    }

    evaluate(score) {
        if (score > this.thresholds.lock) {
            return 'LOCK';
        } else if (score > this.thresholds.warn) {
            return 'WARN';
        } else {
            return 'ALLOW';
        }
    }
}
