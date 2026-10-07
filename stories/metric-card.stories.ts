import type { Meta, StoryObj } from "@storybook/angular";
import { MetricCard } from "../src/app/ui/metric-card";
const meta: Meta<MetricCard> = {
  title: "Composants/Mesure",
  component: MetricCard,
  args: {
    label: "Poids",
    unit: "kg",
    icon: "weight",
    color: "#ccb3e7",
    value: 75.9,
    date: "2026-10-01",
    demo: true,
    values: [76.8, 76.3, 76.5, 76.1, 75.9],
  },
  argTypes: {
    value: { control: "number" },
    label: { control: "text" },
    unit: { control: "text" },
    color: { control: "color" },
    date: { control: "text" },
    demo: { control: "boolean" },
  },
  render: (args) => ({
    props: args,
    template:
      '<div class="ds-metric"><ui-metric-card [label]="label" [unit]="unit" [icon]="icon" [color]="color" [value]="value" [date]="date" [demo]="demo" [values]="values" /></div>',
  }),
};
export default meta;
type Story = StoryObj<MetricCard>;
export const Connue: Story = {};
export const Inconnue: Story = {
  args: { value: null, date: null, values: [], demo: false },
};
export const ZeroDeclare: Story = {
  args: {
    label: "Tabac",
    unit: "cigarette",
    icon: "cigarette",
    value: 0,
    values: [2, 1, 3, 0],
  },
};
