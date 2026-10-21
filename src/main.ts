import { bootstrapApplication } from "@angular/platform-browser";
import {
  provideRouter,
  withHashLocation,
  withInMemoryScrolling,
} from "@angular/router";
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import fr from "@angular/common/locales/fr";
import { App } from "./app/app";
import { applyPresentation, readPresentation } from "./app/core/presentation";
registerLocaleData(fr);
applyPresentation(readPresentation());
bootstrapApplication(App, {
  providers: [
    { provide: LOCALE_ID, useValue: "fr-FR" },
    provideRouter(
      [
        {
          path: "",
          loadComponent: () =>
            import("./app/pages/dashboard").then((m) => m.Dashboard),
        },
        {
          path: "journal",
          loadComponent: () =>
            import("./app/pages/journal").then((m) => m.Journal),
        },
        {
          path: "habitudes",
          loadComponent: () =>
            import("./app/pages/habits").then((m) => m.Habits),
        },
        {
          path: "fantome",
          loadComponent: () =>
            import("./app/pages/ghost").then((m) => m.GhostPage),
        },
        {
          path: "futurs",
          loadComponent: () =>
            import("./app/pages/futures").then((m) => m.Futures),
        },
        {
          path: "profils",
          loadComponent: () =>
            import("./app/pages/profiles").then((m) => m.Profiles),
        },
        {
          path: "donnees",
          loadComponent: () =>
            import("./app/pages/data").then((m) => m.DataPage),
        },
        {
          path: "parametres",
          loadComponent: () =>
            import("./app/pages/settings").then((m) => m.SettingsPage),
        },
        { path: "**", redirectTo: "" },
      ],
      withHashLocation(),
      withInMemoryScrolling({ scrollPositionRestoration: "enabled" }),
    ),
  ],
}).catch(console.error);
