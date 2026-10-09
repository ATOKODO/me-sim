import { registerLocaleData } from "@angular/common";
import fr from "@angular/common/locales/fr";
import { signal } from "@angular/core";
import {
  applicationConfig,
  componentWrapperDecorator,
  type Preview,
} from "@storybook/angular";
import type { ViewportMap } from "storybook/viewport";
import { REFERENCE_VIEWPORTS } from "../config/viewports";
import { Store } from "../src/app/core/store";
import { emptySnapshot } from "../src/app/core/models";
registerLocaleData(fr);
// Presentation-only provider. No real Store, native IPC, health data or disk access.
const presentation = { data: signal(emptySnapshot()) };
const preview: Preview = {
  tags: ["autodocs", "visual"],
  initialGlobals: { theme: "dark", language: "fr" },
  globalTypes: {
    theme: {
      description: "Thème de l’application",
      toolbar: {
        title: "Thème",
        icon: "paintbrush",
        items: [
          { value: "dark", title: "Sombre" },
          { value: "light", title: "Clair" },
        ],
        dynamicTitle: true,
      },
    },
    language: {
      description: "Langue de l’application",
      toolbar: {
        title: "Langue",
        icon: "globe",
        items: [
          { value: "fr", title: "Français" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    applicationConfig({
      providers: [{ provide: Store, useValue: presentation }],
    }),
    (story, context) => {
      const theme = context.globals["theme"] === "light" ? "light" : "dark";
      const language = context.globals["language"] === "en" ? "en" : "fr";
      document.documentElement.dataset["theme"] = theme;
      document.documentElement.lang = language;
      document.documentElement.style.colorScheme = theme;
      presentation.data.update((s) => ({
        ...s,
        settings: { ...s.settings, theme, language },
      }));
      return story();
    },
    componentWrapperDecorator(
      (story) => '<div class="ds-story" data-visual-ready>' + story + "</div>",
    ),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    backgrounds: { disable: true },
    viewport: {
      options: Object.fromEntries(
        Object.entries(REFERENCE_VIEWPORTS).map(([key, viewport]) => [
          key,
          {
            name: viewport.name,
            styles: {
              width: viewport.width + "px",
              height: viewport.height + "px",
            },
            type: viewport.type,
          },
        ]),
      ) satisfies ViewportMap,
    },
    options: { storySort: { order: ["Fondations", "Composants", "États"] } },
    a11y: { test: "error" },
    docs: {
      description: {
        component:
          "Composants et styles partagés avec Me-Sim. Les données présentées sont fictives. Thèmes et langues via la barre d’outils.",
      },
    },
  },
};
export default preview;
