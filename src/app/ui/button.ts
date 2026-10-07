import { Directive, input } from "@angular/core";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
/** Apply the same visual contract to native buttons and links; semantics stay native. */
@Directive({
  selector: "button[uiButton],a[uiButton]",
  host: {
    class: "button",
    "[class.primary]": 'variant() === "primary"',
    "[class.secondary]": 'variant() === "secondary"',
    "[class.ghost]": 'variant() === "ghost"',
    "[class.danger]": 'variant() === "danger"',
  },
})
export class UiButton {
  variant = input<ButtonVariant>("secondary", { alias: "uiButton" });
}
