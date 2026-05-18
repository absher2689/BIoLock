console.log('BioLock Content Script Active');
class BehaviorCollector {
    constructor() {
        this.buffer = [];
        this.isCollecting = false;
        this.bufferLimit = 50;
        this.sendInterval = 1000;
        this.timer = null;
        this.handlers = {
            keydown: this.handleKey.bind(this),
            keyup: this.handleKey.bind(this),
            mousemove: this.handleMouse.bind(this),
            click: this.handleMouse.bind(this),
            scroll: this.handleScroll.bind(this)
        };
    }
    start() {
        if (this.isCollecting) return;
        this.isCollecting = true;
        this.log('Collection Started');
        document.addEventListener('keydown', this.handlers.keydown, true);
        document.addEventListener('keyup', this.handlers.keyup, true);
        document.addEventListener('mousemove', this.handlers.mousemove, true);
        document.addEventListener('click', this.handlers.click, true);
        document.addEventListener('scroll', this.handlers.scroll, true);
        this.timer = setInterval(() => this.flush(), this.sendInterval);
    }
    stop() {
        if (!this.isCollecting) return;
        this.isCollecting = false;
        this.log('Collection Stopped');
        document.removeEventListener('keydown', this.handlers.keydown, true);
        document.removeEventListener('keyup', this.handlers.keyup, true);
        document.removeEventListener('mousemove', this.handlers.mousemove, true);
        document.removeEventListener('click', this.handlers.click, true);
        document.removeEventListener('scroll', this.handlers.scroll, true);
        clearInterval(this.timer);
        this.flush();
    }
    log(msg) {
        chrome.runtime.sendMessage({ action: 'DEBUG_LOG', message: msg }).catch(() => { });
    }
    handleKey(e) {
        if (!this.isCollecting) return;
        console.log(`[Content] Key: ${e.type} ${e.code}`); // Kept for user verification
        this.buffer.push({
            type: e.type,
            key: e.key,
            code: e.code,
            ts: Date.now()
        });
        this.checkBuffer();
    }
    handleMouse(e) {
        if (!this.isCollecting) return;
        this.buffer.push({
            type: e.type,
            x: e.clientX,
            y: e.clientY,
            ts: Date.now()
        });
        this.checkBuffer();
    }
    handleScroll(e) {
        if (!this.isCollecting) return;
        this.buffer.push({
            type: 'scroll',
            ts: Date.now()
        });
        this.checkBuffer();
    }
    checkBuffer() {
        if (this.buffer.length >= this.bufferLimit) {
            this.flush();
        }
    }
    flush() {
        if (this.buffer.length === 0) return;
        console.log(`[Content] Flushing ${this.buffer.length} events to Background`);
        const data = [...this.buffer];
        this.buffer = [];
        chrome.runtime.sendMessage({
            action: 'SAVE_SAMPLE',
            data: data
        });
    }
}
const collector = new BehaviorCollector();
chrome.runtime.sendMessage({ action: 'DEBUG_LOG', message: 'Content Script Loaded' }).catch(() => { });
chrome.runtime.onMessage.addListener((message) => {
    console.log(`[Content] Received message: ${message.action}`);
    if (message.action === 'START_ENROLLMENT' || message.action === 'START_MONITORING') {
        collector.start();
    } else if (message.action === 'STOP_ENROLLMENT' || message.action === 'STOP_MONITORING') {
        collector.stop();
    }
});
chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
    if (response && (response.isEnrollmentActive || response.isMonitoringActive)) {
        collector.start();
    }
});
chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'SHOW_WARNING') {
        console.log('[CONTENT] Received SHOW_WARNING command', message.level);
        if (message.level === 'LOCK') {
            collector.stop();
        }
        showOverlay(message.level);
    }
});
let overlayTimer = null;
function showOverlay(level) {
    if (overlayTimer) clearTimeout(overlayTimer);
    let overlay = document.getElementById('biolock-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'biolock-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '20px';
        overlay.style.right = '20px';
        overlay.style.zIndex = '999999';
        overlay.style.padding = '15px';
        overlay.style.borderRadius = '8px';
        overlay.style.fontFamily = 'system-ui';
        overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
        overlay.style.maxWidth = '300px';
        document.body.appendChild(overlay);
    }
    if (level === 'WARN') {
        overlay.style.backgroundColor = '#fff';
        overlay.style.color = '#333';
        overlay.style.border = '1px solid #ddd';
        overlay.style.borderLeft = '4px solid #f0ad4e';
        overlay.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        overlay.style.borderRadius = '4px';
        overlay.style.padding = '12px 16px';
        overlay.style.minWidth = '250px';
        overlay.style.fontSize = '14px';
        overlay.style.top = '20px';
        overlay.style.right = '20px';
        overlay.style.left = 'auto'; 
        overlay.style.width = 'auto';
        overlay.style.height = 'auto';
        overlay.style.display = 'block';

        overlay.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 18px;">⚠️</span>
                <div>
                    <strong style="display: block; font-size: 13px; color: #f0ad4e;">BioLock Warning</strong>
                    <span style="font-size: 12px; color: #666;">Unusual behavior detected.</span>
                </div>
            </div>
        `;

        overlayTimer = setTimeout(() => {
            if (overlay) overlay.style.display = 'none';
        }, 3000);

    } else if (level === 'LOCK') {
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.maxWidth = 'none';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.95)'; 
        overlay.style.color = 'white';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.flexDirection = 'column';
        overlay.style.right = 'auto'; 

        overlay.innerHTML = `
            <div style="text-align: center; background: #222; padding: 40px; border-radius: 10px; box-shadow: 0 0 20px rgba(255,0,0,0.3);">
                <h1 style="font-size: 2.5rem; margin-bottom: 10px; color: #ff4444;">🔒 LOCKED</h1>
                <p style="margin-bottom: 20px; color: #ccc;">Unusual behavior detected. Identify yourself.</p>
                
                <input type="password" id="biolock-pass" placeholder="Enter Password" 
                       style="padding: 12px; font-size: 1.2rem; border-radius: 5px; border: none; width: 250px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">
                
                <button id="biolock-unlock-btn" 
                        style="padding: 10px 30px; font-size: 1.1rem; cursor: pointer; background: #1a73e8; color: white; border: none; border-radius: 5px; font-weight: bold;">
                    UNLOCK
                </button>
                <div id="biolock-msg" style="margin-top: 15px; height: 20px; color: #ff4444;"></div>
            </div>
        `;
        document.body.style.overflow = 'hidden';
        const btn = document.getElementById('biolock-unlock-btn');
        const input = document.getElementById('biolock-pass');
        const msg = document.getElementById('biolock-msg');
        const attemptUnlock = () => {
            const pass = input.value;
            chrome.runtime.sendMessage({ action: 'UNLOCK_ATTEMPT', password: pass });
            msg.textContent = "Verifying...";
        };
        btn.onclick = attemptUnlock;
        input.onkeydown = (e) => { if (e.key === 'Enter') attemptUnlock(); };
        input.focus();
    }
}
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'UNLOCK_SUCCESS') {
        const overlay = document.getElementById('biolock-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
        collector.start(); 
    } else if (msg.action === 'UNLOCK_FAIL') {
        const el = document.getElementById('biolock-msg');
        if (el) el.textContent = "❌ Incorrect Password";
    }
});
