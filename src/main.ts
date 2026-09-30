import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter, withHashLocation } from "@angular/router";
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import fr from "@angular/common/locales/fr";
import { App } from "./app/app";
registerLocaleData(fr);
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
    ),
  ],
}).catch(console.error);
