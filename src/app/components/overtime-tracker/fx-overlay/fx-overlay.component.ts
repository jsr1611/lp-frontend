import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, inject } from "@angular/core";
import { FxPreset } from "../special-days";
import { runParticles } from "../fx-particles";

export interface FxEffect {
  preset: FxPreset;
  emoji: string;
  title: string;
  subtitle?: string;
  // How long it stays up; 1-3 seconds keeps it a moment, not an interruption.
  ms?: number;
}

const DEFAULT_MS = 2800;

/**
 * A full-screen moment: a tinted backdrop, a centred message and a canvas of particles,
 * gone after a few seconds or on click. Effects queue, so a milestone and a holiday on
 * the same day play one after the other rather than on top of each other.
 *
 * Particles run outside Angular's zone; only showing and hiding the card touches change
 * detection. With reduced motion the card still shows, without the particles.
 */
@Component({
  selector: "app-fx-overlay",
  templateUrl: "./fx-overlay.component.html",
  styleUrls: ["./fx-overlay.component.css"],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false,
})
export class FxOverlayComponent implements OnDestroy {
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  current: FxEffect | null = null;
  private queue: FxEffect[] = [];
  private timer: any = null;
  private stop: (() => void) | null = null;

  play(effect: FxEffect): void {
    this.queue.push(effect);
    if (!this.current) this.next();
  }

  dismiss(): void {
    clearTimeout(this.timer);
    this.stopParticles();
    this.current = null;
    this.cdr.markForCheck();
    // A short gap so two effects read as two moments.
    if (this.queue.length) this.timer = setTimeout(() => this.next(), 250);
  }

  ngOnDestroy(): void {
    clearTimeout(this.timer);
    this.stopParticles();
  }

  private next(): void {
    const effect = this.queue.shift();
    if (!effect) return;
    this.current = effect;
    this.cdr.markForCheck();
    this.startParticles(effect.preset, effect.ms ?? DEFAULT_MS);
    this.timer = setTimeout(() => this.dismiss(), effect.ms ?? DEFAULT_MS);
  }

  private startParticles(preset: FxPreset, ms: number): void {
    this.stopParticles();
    this.stop = this.zone.runOutsideAngular(() => runParticles(preset, ms));
  }

  private stopParticles(): void {
    this.stop?.();
    this.stop = null;
  }
}
