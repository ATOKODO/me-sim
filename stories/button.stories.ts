import { moduleMetadata, type Meta, type StoryObj } from "@storybook/angular";
import { UiButton } from "../src/app/ui/button";
import { Icon } from "../src/app/core/icon";
const meta: Meta = {
  title: "Composants/Boutons",
  decorators: [moduleMetadata({ imports: [UiButton, Icon] })],
  args: {
    variant: "primary",
    label: "Enregistrer ma journée",
    disabled: false,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "danger"],
    },
    label: { control: "text" },
    disabled: { control: "boolean" },
  },
  render: (args) => ({
    props: args,
    template:
      '<button type="button" [uiButton]="variant" [disabled]="disabled"><ui-icon name="check" />{{ label }}</button>',
  }),
  parameters: {
    docs: {
      description: {
        component:
          "Directive UiButton utilisée par le tableau de bord. Utiliser un bouton pour une action et un lien pour la navigation. disabled et le focus restent natifs.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;
export const Principal: Story = {};
export const Secondaire: Story = { args: { variant: "secondary" } };
export const Danger: Story = {
  args: { variant: "danger", label: "Supprimer le profil" },
};
export const Desactive: Story = { args: { disabled: true } };
export const Galerie: Story = {
  render: () => ({
    template:
      '<div class="ds-stack"><h1>Actions et états</h1><div class="button-row"><button uiButton="primary">Enregistrer</button><button uiButton="secondary">Annuler</button><button uiButton="ghost">Plus tard</button><button uiButton="danger">Supprimer</button></div><div class="button-row"><button uiButton="primary" disabled>Enregistrer</button><button uiButton="secondary" disabled>Annuler</button><button uiButton="danger" disabled>Supprimer</button></div></div>',
  }),
};
