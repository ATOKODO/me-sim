import { test, expect } from "@playwright/test";
import { chartPath } from "../src/app/core/chart-path";

test("empty, single and two-sample histories retain their existing meaning", () => {
  expect(chartPath([], true)).toBe("");
  expect(chartPath([0], true)).toBe("M0,85");
  expect(chartPath([0, 1], true)).toBe("M0,85 L400,20");
  expect(chartPath([0, 1, 0])).toBe("M0,85 L200,20 L400,85");
});

for (const values of [
  [0, 2, 9, 10],
  [10, 7, 6, 0],
  [2, 8, 1, 1, 5, 0],
  [0, 0, 0, 0],
]) {
  test(
    "smooth curve preserves samples and segment bounds: " + values.join(","),
    () => {
      const path = chartPath(values, true);
      const numbers = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const min = Math.min(...values),
        span = Math.max(...values) - min || 1;
      const expectedY = values.map((value) => 85 - ((value - min) / span) * 65);
      expect(path.match(/C/g)).toHaveLength(values.length - 1);
      let x = numbers[0],
        y = numbers[1];
      for (let i = 1; i < values.length; i++) {
        const [x1, y1, x2, y2, endX, endY] = numbers.slice(
          2 + (i - 1) * 6,
          2 + i * 6,
        );
        expect(endX).toBeCloseTo((i * 400) / (values.length - 1), 2);
        expect(endY).toBeCloseTo(expectedY[i], 2);
        expect(x1).toBeGreaterThan(x);
        expect(x2).toBeGreaterThan(x1);
        expect(endX).toBeGreaterThan(x2);
        for (let sample = 0; sample <= 100; sample++) {
          const t = sample / 100,
            a = 1 - t;
          const interpolated =
            a ** 3 * y +
            3 * a ** 2 * t * y1 +
            3 * a * t ** 2 * y2 +
            t ** 3 * endY;
          expect(interpolated).toBeGreaterThanOrEqual(
            Math.min(y, endY) - 0.001,
          );
          expect(interpolated).toBeLessThanOrEqual(Math.max(y, endY) + 0.001);
        }
        x = endX;
        y = endY;
      }
    },
  );
}
