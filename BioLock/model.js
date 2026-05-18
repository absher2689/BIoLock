export class BioModel {
    constructor() {
        this.profiles = [];
    }
    loadProfile(profileData) {
        if (profileData) {
            const existingIndex = this.profiles.findIndex(p => p.profileId === profileData.profileId);
            if (existingIndex !== -1) {
                this.profiles[existingIndex] = profileData;
            } else {
                this.profiles.push(profileData);
            }
        }
    }
    clearProfiles() {
        this.profiles = [];
    }
    getProfiles() {
        return this.profiles;
    }
    getProfile() {
        return this.profiles.length > 0 ? this.profiles[0] : {
            dwellMean: 0,
            dwellM2: 0,
            dwellCount: 0,
            velocityMean: 0,
            velocityM2: 0,
            velocityCount: 0
        };
    }
    createNewBlankProfile() {
        return {
            dwellMean: 0,
            dwellM2: 0,
            dwellCount: 0,
            velocityMean: 0,
            velocityM2: 0,
            velocityCount: 0,
            flightMean: 0,
            flightM2: 0,
            flightCount: 0
        };
    }
    update(features, profileToUpdate) {
        const profile = profileToUpdate || this.getProfile();
        if (features.avgDwell > 0) {
            profile.dwellCount++;
            const delta = features.avgDwell - profile.dwellMean;
            profile.dwellMean += delta / profile.dwellCount;
            const delta2 = features.avgDwell - profile.dwellMean;
            profile.dwellM2 += delta * delta2;
        }
        if (features.avgVelocity > 0) {
            profile.velocityCount++;
            const delta = features.avgVelocity - profile.velocityMean;
            profile.velocityMean += delta / profile.velocityCount;
            const delta2 = features.avgVelocity - profile.velocityMean;
            profile.velocityM2 += delta * delta2;
        }
        if (features.avgFlight > 0) {
            profile.flightCount++;
            const delta = features.avgFlight - profile.flightMean;
            profile.flightMean += delta / profile.flightCount;
            const delta2 = features.avgFlight - profile.flightMean;
            profile.flightM2 += delta * delta2;
        }
    }
    score(features) {
        if (this.profiles.length === 0) {
            console.log('[Model] No profiles available for scoring.');
            return 0;        }
        let minScore = Infinity;
        for (const profile of this.profiles) {
            console.log(`[Model] Scoring against Profile: ${profile.profileId || 'default'} (DwellCount=${profile.dwellCount}, VelCount=${profile.velocityCount}, FlightCount=${profile.flightCount || 0})`);
            let totalScore = 0;
            let featureCountForBatch = 0;
            if (profile.dwellCount > 2 && features.avgDwell > 0) {
                console.log(`[Model] Dwell: Val=${features.avgDwell.toFixed(3)} Mean=${profile.dwellMean.toFixed(3)} Var=${profile.dwellM2}`);
                const dwellVar = profile.dwellM2 / (profile.dwellCount - 1);
                let dwellStd = Math.sqrt(dwellVar);
                if (dwellStd < 1e-6) dwellStd = 1e-6;
                let dwellScore = Math.abs(features.avgDwell - profile.dwellMean) / dwellStd;
                totalScore += dwellScore;
                featureCountForBatch++;
            }
            if (profile.velocityCount > 2 && features.avgVelocity > 0) {
                console.log(`[Model] Vel: Val=${features.avgVelocity.toFixed(3)} Mean=${profile.velocityMean.toFixed(3)} Var=${profile.velocityM2}`);
                const velVar = profile.velocityM2 / (profile.velocityCount - 1);
                let velStd = Math.sqrt(velVar);
                if (velStd < 1e-6) velStd = 1e-6;
                let velocityScore = Math.abs(features.avgVelocity - profile.velocityMean) / velStd;
                totalScore += velocityScore;
                featureCountForBatch++;
            }
            if ((profile.flightCount || 0) > 2 && features.avgFlight > 0) {
                console.log(`[Model] Flight: Val=${features.avgFlight.toFixed(3)} Mean=${profile.flightMean.toFixed(3)} Var=${profile.flightM2}`);
                const flightVar = profile.flightM2 / (profile.flightCount - 1);
                let flightStd = Math.sqrt(flightVar);
                if (flightStd < 1e-6) flightStd = 1e-6;
                let flightScore = Math.abs(features.avgFlight - profile.flightMean) / flightStd;
                totalScore += flightScore;
                featureCountForBatch++;
            }
            if (featureCountForBatch === 0) continue;
            const currentScore = totalScore / featureCountForBatch;
            console.log(`[Scoring] Profile ${profile.profileId || 'default'}: ${currentScore.toFixed(2)} (Features: ${featureCountForBatch})`);
            if (currentScore < minScore) {
                minScore = currentScore;
            }
        }
        if (minScore === Infinity) {
            console.log(`[Scoring] No features could be scored. Defaulting to 0.`);
            return 0;
        }
        console.log(`[Scoring] Best final match: ${minScore.toFixed(2)}`);
        return minScore;
    }
}
