import type { Meta, StoryObj } from "@storybook/angular";
const meta: Meta = {
  title: "Fondations/Repères",
  parameters: {
    docs: {
      description: {
        component:
          "Source des couleurs et espacements : src/design-system/tokens.css. Les deux thèmes partagent les mêmes composants.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;
const swatches = [
  ["Fond", "--ds-background"],
  ["Surface", "--ds-surface"],
  ["Texte", "--ds-text"],
  ["Accent", "--accent"],
  ["Texte secondaire", "--muted"],
  ["Bordure", "--line"],
  ["Écart / erreur", "--ds-negative"],
];
export const Palette: Story = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Couleurs</h1><p>La palette utilisée par l’application, sans copie de valeurs dans les stories.</p><div class="ds-grid">' +
      swatches
        .map(
          ([label, token]) =>
            '<div class="ds-swatch"><div class="ds-swatch-color" style="background:var(' +
            token +
            ')"></div><div class="ds-swatch-label"><strong>' +
            label +
            "</strong><code>" +
            token +
            "</code></div></div>",
        )
        .join("") +
      "</div></div>",
  }),
};
export const Typographie: Story = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Un peu plus toi, chaque jour.</h1><h2>Mes habitudes et mon cap souhaité</h2><h3>Observations de la journée</h3><p>Les données absentes restent inconnues. Les tendances décrivent ton historique sans prédire ta santé.</p><span class="eyebrow">CONÇU POUR RESTER CHEZ TOI</span><p class="ds-description">Police système : Segoe UI, Arial, sans téléchargement.</p></div>',
  }),
};
export const Espacements: Story = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Espacements</h1>' +
      [1, 2, 3, 4, 6, 8]
        .map(
          (n) =>
            "<div><code>--ds-space-" +
            n +
            '</code><div class="ds-space" style="width:var(--ds-space-' +
            n +
            ')"></div></div>',
        )
        .join("") +
      "</div>",
  }),
};
