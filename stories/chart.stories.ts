import type { Meta, StoryObj } from "@storybook/angular";
import { Chart } from "../src/app/core/chart";
const meta: Meta<Chart> = {
  title: "Composants/Courbe",
  component: Chart,
  args: {
    values: [4, 7, 3, 8, 8, 10, 6],
    color: "#bde883",
    label: "Évolution des mesures observées",
  },
  render: (args) => ({
    props: args,
    template:
      '<section class="panel ds-chart"><h2>Observations</h2><mini-chart [values]="values" [color]="color" [label]="label" /></section>',
  }),
};
export default meta;
type Story = StoryObj<Chart>;
export const Historique: Story = {};
export const SansDonnees: Story = { args: { values: [] } };
export const ValeurUnique: Story = { args: { values: [4] } };
export const Stable: Story = { args: { values: [4, 4, 4, 4] } };
