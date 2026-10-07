import { moduleMetadata, type Meta, type StoryObj } from "@storybook/angular";
import { Icon, ICON_NAMES } from "../src/app/core/icon";
const meta: Meta = {
  title: "Composants/Icônes",
  decorators: [moduleMetadata({ imports: [Icon] })],
  parameters: {
    docs: {
      description: {
        component:
          "Catalogue dérivé du composant Icon réel. Les SVG sont décoratifs ; donner un nom accessible au bouton qui les contient.",
      },
    },
  },
};
export default meta;
export const Catalogue: StoryObj = {
  render: () => ({
    props: { names: ICON_NAMES },
    template:
      '<div class="ds-stack"><h1>Icônes locales</h1><div class="ds-grid">@for (name of names; track name) { <div class="ds-icon"><ui-icon [name]="name" /><span>{{ name }}</span></div> }</div></div>',
  }),
};
