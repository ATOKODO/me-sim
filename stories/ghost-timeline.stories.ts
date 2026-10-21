import type { Meta, StoryObj } from "@storybook/angular";
import { GhostTimeline } from "../src/app/scene/ghost-timeline";
const meta: Meta<GhostTimeline> = {
  title: "Composants/Timeline fantôme",
  component: GhostTimeline,
  args: {
    minute: 1120,
    label: "Journée suivie",
    focusMetric: "walk",
    events: [
      {
        id: "walk",
        metric: "walk",
        label: "Marche",
        start: 1080,
        end: 1140,
        point: false,
        value: 60,
      },
      {
        id: "screen",
        metric: "screen",
        label: "Instagram",
        start: 750,
        end: 780,
        point: false,
        value: 30,
      },
      {
        id: "point",
        metric: "tobacco",
        label: "Tabac",
        start: 1020,
        end: 1020,
        point: true,
        value: 1,
      },
    ],
  },
  argTypes: {
    minute: { control: { type: "range", min: 0, max: 1439 } },
    ghost: { control: "boolean" },
  },
};
export default meta;
type Story = StoryObj<GhostTimeline>;
export const Realisee: Story = {};
export const Fantome: Story = { args: { ghost: true } };
export const Inconnue: Story = { args: { events: [] } };
