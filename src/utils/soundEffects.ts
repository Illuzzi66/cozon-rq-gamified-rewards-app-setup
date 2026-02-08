// Sound effects utility for the spin wheel
// Using Web Audio API to generate sound effects

class SoundEffects {
  private audioContext: AudioContext | null = null;

  constructor() {
    // Initialize AudioContext on first user interaction
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private ensureAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (required by some browsers)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  // Spinning sound - continuous ticking sound
  playSpinSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const duration = 5; // 5 seconds spin duration
    const tickInterval = 0.1; // Tick every 100ms
    const startTime = this.audioContext.currentTime;

    for (let i = 0; i < duration / tickInterval; i++) {
      const time = startTime + i * tickInterval;
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Higher pitch as time progresses (slowing down effect)
      const frequency = 800 - (i * 10);
      oscillator.frequency.setValueAtTime(frequency, time);
      oscillator.type = 'square';

      // Short tick sound
      gainNode.gain.setValueAtTime(0.1, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

      oscillator.start(time);
      oscillator.stop(time + 0.05);
    }
  }

  // Win sound - celebratory ascending tones
  playWinSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C (major chord)

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(freq, now + index * 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, now + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.5);

      oscillator.start(now + index * 0.1);
      oscillator.stop(now + index * 0.1 + 0.5);
    });
  }

  // Big win sound - more elaborate celebration
  playBigWinSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Extended major scale

    // Play ascending notes
    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(freq, now + index * 0.08);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.25, now + index * 0.08);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.08 + 0.6);

      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.6);
    });

    // Add sparkle effect
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        oscillator.frequency.setValueAtTime(2000 + Math.random() * 1000, this.audioContext!.currentTime);
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, this.audioContext!.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + 0.2);

        oscillator.start();
        oscillator.stop(this.audioContext!.currentTime + 0.2);
      }, i * 100);
    }
  }

  // Lose sound - descending sad tones
  playLoseSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const frequencies = [392, 349.23, 293.66]; // G, F, D (descending)

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(freq, now + index * 0.15);
      oscillator.type = 'triangle';

      gainNode.gain.setValueAtTime(0.15, now + index * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.15 + 0.4);

      oscillator.start(now + index * 0.15);
      oscillator.stop(now + index * 0.15 + 0.4);
    });
  }

  // Click sound for button presses
  playClickSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(800, now);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  // Bonus claim sound
  playBonusSound() {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const frequencies = [659.25, 783.99, 1046.50]; // E, G, C

    frequencies.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.frequency.setValueAtTime(freq, now + index * 0.1);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, now + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.4);

      oscillator.start(now + index * 0.1);
      oscillator.stop(now + index * 0.1 + 0.4);
    });
  }
}

// Export singleton instance
export const soundEffects = new SoundEffects();
