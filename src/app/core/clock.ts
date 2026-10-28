import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from "@angular/core";
import { localDate } from "./habit-tracking";

@Injectable({ providedIn: "root" })
export class LocalClock {
  readonly now = signal(Date.now());
  readonly today = computed(() => localDate(new Date(this.now())));
  /** @spec TECH-FRONTEND-CLOCK-101 */
  constructor() {
    let timer: ReturnType<typeof setTimeout>;
    /** @spec TECH-FRONTEND-CLOCK-101 */
    const refresh = () => {
      this.now.set(Date.now());
      clearTimeout(timer);
      // Journal times have minute precision. Align refresh with local day boundaries.
      timer = setTimeout(refresh, 60_000 - (Date.now() % 60_000) + 1);
    };
    /** @spec TECH-FRONTEND-CLOCK-101 */
    const visible = () => {
      if (!document.hidden) refresh();
    };
    refresh();
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    });
  }
}
