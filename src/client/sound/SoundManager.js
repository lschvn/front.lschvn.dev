import { Howl } from "howler";
import of4 from "../../../proprietary/sounds/music/of4.mp3";
import openfront from "../../../proprietary/sounds/music/openfront.mp3";
import war from "../../../proprietary/sounds/music/war.mp3";
import kaChingSound from "/sounds/effects/ka-ching.mp3?url";
export var SoundEffect;
(function (SoundEffect) {
    SoundEffect["KaChing"] = "ka-ching";
})(SoundEffect || (SoundEffect = {}));
class SoundManager {
    constructor() {
        this.backgroundMusic = [];
        this.currentTrack = 0;
        this.soundEffects = new Map();
        this.soundEffectsVolume = 1;
        this.backgroundMusicVolume = 0;
        this.backgroundMusic = [
            new Howl({
                src: [of4],
                loop: false,
                onend: this.playNext.bind(this),
                volume: 0,
            }),
            new Howl({
                src: [openfront],
                loop: false,
                onend: this.playNext.bind(this),
                volume: 0,
            }),
            new Howl({
                src: [war],
                loop: false,
                onend: this.playNext.bind(this),
                volume: 0,
            }),
        ];
        this.loadSoundEffect(SoundEffect.KaChing, kaChingSound);
    }
    playBackgroundMusic() {
        if (this.backgroundMusic.length > 0 &&
            !this.backgroundMusic[this.currentTrack].playing()) {
            this.backgroundMusic[this.currentTrack].play();
        }
    }
    stopBackgroundMusic() {
        if (this.backgroundMusic.length > 0) {
            this.backgroundMusic[this.currentTrack].stop();
        }
    }
    setBackgroundMusicVolume(volume) {
        this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
        this.backgroundMusic.forEach((track) => {
            track.volume(this.backgroundMusicVolume);
        });
    }
    playNext() {
        this.currentTrack = (this.currentTrack + 1) % this.backgroundMusic.length;
        this.playBackgroundMusic();
    }
    loadSoundEffect(name, src) {
        if (!this.soundEffects.has(name)) {
            const sound = new Howl({
                src: [src],
                volume: this.soundEffectsVolume,
            });
            this.soundEffects.set(name, sound);
        }
    }
    playSoundEffect(name) {
        const sound = this.soundEffects.get(name);
        if (sound) {
            sound.play();
        }
    }
    setSoundEffectsVolume(volume) {
        this.soundEffectsVolume = Math.max(0, Math.min(1, volume));
        this.soundEffects.forEach((sound) => {
            sound.volume(this.soundEffectsVolume);
        });
    }
    stopSoundEffect(name) {
        const sound = this.soundEffects.get(name);
        if (sound) {
            sound.stop();
        }
    }
    unloadSoundEffect(name) {
        const sound = this.soundEffects.get(name);
        if (sound) {
            sound.unload();
            this.soundEffects.delete(name);
        }
    }
}
export default new SoundManager();
//# sourceMappingURL=SoundManager.js.map