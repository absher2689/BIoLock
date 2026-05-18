**BioLock: Behavioral Biometric Browser Login Shield**
BioLock is a high-performance, local-first Google Chrome Extension (Manifest V3) that shifts web security from static, "point-of-entry" passwords to continuous behavioral biometric authentication. By silently monitoring subconscious interaction habits, BioLock establishes an invisible identity shield that mitigates session hijacking, credential sharing, and unauthorized physical workstation access in real time—all without interrupting user workflows.
Unlike traditional security systems that rely on resource-heavy cloud-based AI, BioLock processes behavioral patterns completely on-device, offering enterprise-grade zero-trust security with sub-millisecond inference latency and total data privacy.

**🚀 Key Features**
Continuous Behavioral Tracking: Captures fine-grained interaction metrics across all active tabs, logging Dwell Time (key-press durations), Flight Time (inter-key latency rhythms), and Mouse Velocity with millisecond precision.
Ultra-Lightweight Statistical Engine: Swaps CPU-heavy neural networks for an incremental implementation of Welford’s Online Algorithm, allowing the system to update behavioral means and variances on-the-fly with a footprint under 100MB of RAM.
Progressive Multi-Threshold Security: Uses an adaptive Z-Score deviation policy to trigger subtle user alerts for minor rhythm shifts or issue an immediate, un-bypassable lock overlay for high-probability session threats.
Continuous Auto-Learning: Features a rolling 50-action buffer that adapts to natural human changes (like fatigue or rushed typing), dynamically absorbing valid rhythm variations upon successful password re-verification.
Leak-Proof Process Persistence: Architected around Chrome's Offscreen Document API to maintain mathematical execution states securely in the background, rendering the engine immune to tab switching or heavy browser workloads.
Hardened Action Protection: Secures administrative checkpoints (such as extension toggles or data purges) behind strict password prompts to prevent bypass attempts by localized intruders.

**📊 How It Works**
1. Data Capture & ProfilingWhen typing or navigating, content scripts evaluate subconscious neuromuscular patterns. Non-alphanumeric keyboard keys are systematically filtered to preserve data privacy while focusing purely on user rhythm:
Dwell Time: The absolute duration a key remains depressed.  
Flight Time: The speed of transition between consecutive key releases and strikes.
Mouse Velocity: The pixel distance traveled per millisecond (px/ms).  

2. The Anomaly Detection Math
Every data payload generated during a session is evaluated against a dynamic local baseline profile. Rather than compiling raw log files, Welford's algorithm incrementally recalculates variance limits. The engine computes a real-time statistical proximity score (Z-Score) for incoming feature metrics:  

                            **Z = \frac{|x - \mu|}{\sigma}**
 
Where x represents the live feature layer average , \mu represents the historical mean template , and \sigma represents the calculated standard deviation baseline. 

**🛠️ Tech Stack**
Core Architecture: Vanilla JavaScript (ES6+), HTML5, CSS3   
Browser Integration: Google Chrome Extension Framework (Manifest Version 3)   
Primary APIs: chrome.offscreen, chrome.storage.local, Web Crypto API (AES-GCM encryption)   
Database Storage: IndexedDB (Client-Side)   

**🚀 Installation & Local Setup**
Clone the Repository:
   Bash git clone https://github.com/yourusername/BioLock.git
        cd BioLock
2. Open Chrome Extensions Management:
Navigate to chrome://extensions/ in your Google Chrome browser.
Enable Developer mode using the toggle switch in the top right-hand corner.
3. Load the Extension Source:
Click the Load unpacked button in the upper left.
Select the root project folder containing your manifest.json file.  
4. Enroll and Initialize:
Click the BioLock pinned extension widget to view your dashboard popup.  
Select Start Enrollment and interact naturally until the engine registers exactly 30 valid verification samples to form your user identity baseline.  
