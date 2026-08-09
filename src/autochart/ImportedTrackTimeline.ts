export interface ImportedTimelineSnapshot {
  audioTime: number;
  songTimeSec: number;
  playing: boolean;
}

/**
 * Maps imported-song seconds to the authoritative AudioContext timeline.
 * BPM/beat grids are deliberately absent: they are annotations, not clocks.
 */
export class ImportedTrackTimeline {
  private audioAnchor = 0;
  private songAnchor = 0;
  private playing = false;

  constructor(private readonly getAudioTime: () => number) {}

  start(songTimeSec = 0, audioTime = this.getAudioTime()): void {
    this.songAnchor = Math.max(0, songTimeSec);
    this.audioAnchor = audioTime;
    this.playing = true;
  }

  pause(audioTime = this.getAudioTime()): void {
    if (!this.playing) return;
    this.songAnchor = this.audioTimeToSongTime(audioTime);
    this.audioAnchor = audioTime;
    this.playing = false;
  }

  resume(audioTime = this.getAudioTime()): void {
    if (this.playing) return;
    this.audioAnchor = audioTime;
    this.playing = true;
  }

  seek(songTimeSec: number, audioTime = this.getAudioTime()): void {
    this.songAnchor = Math.max(0, songTimeSec);
    this.audioAnchor = audioTime;
  }

  reset(audioTime = this.getAudioTime()): void {
    this.songAnchor = 0;
    this.audioAnchor = audioTime;
    this.playing = false;
  }

  songTimeToAudioTime(songTimeSec: number): number {
    return this.audioAnchor + (songTimeSec - this.songAnchor);
  }

  audioTimeToSongTime(audioTime: number): number {
    if (!this.playing) return this.songAnchor;
    return this.songAnchor + (audioTime - this.audioAnchor);
  }

  snapshot(audioTime = this.getAudioTime()): ImportedTimelineSnapshot {
    return { audioTime, songTimeSec: this.audioTimeToSongTime(audioTime), playing: this.playing };
  }
}

