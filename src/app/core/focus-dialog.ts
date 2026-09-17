import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  inject,
} from "@angular/core";
@Directive({ selector: "[focusDialog]" })
export class FocusDialog implements AfterViewInit, OnDestroy {
  private host: ElementRef<HTMLElement> = inject(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private timer?: ReturnType<typeof setTimeout>;
  @Output() dismissed = new EventEmitter<void>();
  private elements() {
    return [
      ...this.host.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex="0"]',
      ),
    ];
  }
  ngAfterViewInit() {
    this.timer = setTimeout(() => this.elements()[0]?.focus());
  }
  @HostListener("keydown", ["$event"]) onKey(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.dismissed.emit();
    }
    if (e.key === "Tab") {
      const elements = this.elements(),
        first = elements[0],
        last = elements.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  }
  ngOnDestroy() {
    clearTimeout(this.timer);
    this.previous?.focus();
  }
}
