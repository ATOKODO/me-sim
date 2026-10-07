import { Component, input } from "@angular/core";
const PATHS: Record<string, string> = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3Z",
  journal: "M5 3h14v18H5z M8 7h8 M8 11h8 M8 15h5",
  future: "M4 12h16 M14 6l6 6-6 6 M4 5v14",
  data: "M4 7c0-5 16-5 16 0s-16 5-16 0v10c0 5 16 5 16 0V7 M4 12c0 5 16 5 16 0",
  profiles:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 3a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-3-4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  lock: "M6 10h12v11H6z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3",
  moon: "M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z",
  steps:
    "M8 3c4 0 4 8 1 9S3 4 8 3 M8 15l2 5-3 1-2-5 M17 6c4 0 4 8 1 9s-6-8-1-9 M17 18l2 3",
  weight: "M5 5h14l2 16H3Z M9 9a3 3 0 0 1 6 0 M12 9l2-3",
  activity: "M2 12h5l3-8 4 16 3-8h5",
  heart: "M20 5c-3-3-7-1-8 2-1-3-5-5-8-2-4 5 3 11 8 15 5-4 12-10 8-15Z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 1v3 M12 20v3 M1 12h3 M20 12h3",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  upload: "M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5",
  check: "M4 12l5 5L20 6",
  info: "M12 11v6 M12 7v1 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  trash: "M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  edit: "m4 16 12-12 4 4L8 20H4Z M14 6l4 4",
  play: "m8 4 12 8-12 8Z",
  pause: "M8 4v16 M16 4v16",
  users:
    "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3 M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 3a4 4 0 0 1 0 8 M22 21v-3a4 4 0 0 0-3-4",
  gamepad:
    "M6 8h12a4 4 0 0 1 3.8 5.2l-1.1 4a2.5 2.5 0 0 1-4.5.7l-1-1.4H8.8l-1 1.4a2.5 2.5 0 0 1-4.5-.7l-1.1-4A4 4 0 0 1 6 8Z M7 11v4 M5 13h4 M16 12h.01 M19 14h.01",
  phone: "M6 2h12v20H6z M10 18h4",
  book: "M4 4a3 3 0 0 1 3-1h12v18H7a3 3 0 0 0-3 1z M4 4v17 M8 7h7 M8 11h7",
  briefcase: "M3 7h18v13H3z M8 7V4h8v3 M3 12h18 M10 12v2h4v-2",
  glass: "M6 3h12l-1 8a5 5 0 0 1-4 4v5h4v2H7v-2h4v-5a5 5 0 0 1-4-4Z",
  cigarette:
    "M3 14h15v4H3z M18 14h2v4h-2z M6 14V9a3 3 0 0 1 3-3 M20 6v3 M22 6v3",
  vape: "M8 3h8v14H8z M10 17h4v4h-4z M10 7h4 M18 5c2 2 2 4 0 6 M20 3c3 3 3 7 0 10",
  chair: "M6 4h12v7H6z M4 11h16v4H4z M6 15v6 M18 15v6",
};
export const ICON_NAMES = Object.keys(PATHS);
@Component({
  selector: "ui-icon",
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()"/></svg>',
  styles: [
    ":host{display:inline-flex;width:20px;height:20px;flex:none}svg{width:100%;height:100%}",
  ],
})
export class Icon {
  name = input("home");
  path = () => PATHS[this.name()] ?? PATHS["info"];
}
