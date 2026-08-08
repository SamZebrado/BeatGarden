// Deterministic mock clock for testing Transport/Scheduler/Judge without a
// real AudioContext. Exposes manual advanceClock() and a stable `now()`.

export class MockAudioClock {
  private t: number = 0;

  constructor(startSeconds: number = 0) {
    this.t = startSeconds;
  }

  now(): number {
    return this.t;
  }

  advanceSeconds(seconds: number): number {
    this.t += seconds;
    return this.t;
  }

  advanceMs(ms: number): number {
    return this.advanceSeconds(ms / 1000);
  }

  set(seconds: number): void {
    this.t = seconds;
  }
}
