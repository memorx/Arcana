"use client";

// Sound system using Web Audio API
// Sounds are generated programmatically to avoid external dependencies

type SoundType = "shuffle" | "flip" | "reveal";

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = false;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.enabled = localStorage.getItem("arcana_sounds") === "true";
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    return this.audioContext;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== "undefined") {
      localStorage.setItem("arcana_sounds", String(this.enabled));
    }
    return this.enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
    if (typeof window !== "undefined") {
      localStorage.setItem("arcana_sounds", String(value));
    }
  }

  async play(type: SoundType): Promise<void> {
    if (!this.enabled) return;

    const ctx = this.getContext();
    if (!ctx) return;

    // Resume context if suspended (required for autoplay policy)
    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    switch (type) {
      case "shuffle":
        this.playShuffle(ctx);
        break;
      case "flip":
        this.playFlip(ctx);
        break;
      case "reveal":
        this.playReveal(ctx);
        break;
    }
  }

  private playShuffle(ctx: AudioContext): void {
    // Soft whoosh/shuffle sound
    const duration = 0.3;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      100,
      ctx.currentTime + duration
    );

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(
      200,
      ctx.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  private playFlip(ctx: AudioContext): void {
    // Quick flip/click sound
    const duration = 0.1;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      400,
      ctx.currentTime + duration
    );

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  private playReveal(ctx: AudioContext): void {
    // Mystical reveal sound (ascending tone)
    const duration = 0.5;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      600,
      ctx.currentTime + duration * 0.5
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      500,
      ctx.currentTime + duration
    );

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime + duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      ctx.currentTime + duration
    );

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }
}

// Singleton instance
export const soundManager =
  typeof window !== "undefined" ? new SoundManager() : null;

// Hook for React components
export function useSounds() {
  return {
    isEnabled: () => soundManager?.isEnabled() ?? false,
    toggle: () => soundManager?.toggle() ?? false,
    setEnabled: (value: boolean) => soundManager?.setEnabled(value),
    play: (type: SoundType) => soundManager?.play(type),
  };
}
