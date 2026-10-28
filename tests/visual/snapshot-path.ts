import { REFERENCE_VIEWPORTS } from "../../config/viewports";

/** Keep baselines browsable by suite, viewport, locale and theme. */
/** @spec TECH-TOOLING-TESTS */
export function snapshotPath(
  category: string,
  width: number,
  height: number,
  language: string,
  theme: string,
  ...file: string[]
) {
  const device = Object.entries(REFERENCE_VIEWPORTS).find(
    ([, viewport]) => viewport.width === width && viewport.height === height,
  )?.[0];
  const viewport = device
    ? `${device}-${width}x${height}`
    : `${width}x${height}`;
  return [category, viewport, language, theme, ...file];
}
