/** Interpolate observed samples without overshooting the range of either neighbour. */
export function chartPath(values: readonly number[], smooth = false): string {
  if (!values.length) return "";
  const min = Math.min(...values),
    max = Math.max(...values);
  const span = max - min || 1;
  const y = values.map((value) => 85 - ((value - min) / span) * 65);
  const step = 400 / Math.max(values.length - 1, 1);
  const coordinate = (value: number) => Number(value.toFixed(3));
  let path = "M0," + coordinate(y[0]);
  if (!smooth || values.length < 3) {
    return (
      path +
      y
        .slice(1)
        .map(
          (value, i) =>
            " L" + coordinate((i + 1) * step) + "," + coordinate(value),
        )
        .join("")
    );
  }
  const differences = y.slice(1).map((value, i) => value - y[i]);
  // Harmonic tangents flatten at extrema and plateaus, retaining every observed point.
  const tangents = y.map((_, i) => {
    if (i === 0) return differences[0];
    if (i === y.length - 1) return differences[i - 1];
    const before = differences[i - 1],
      after = differences[i];
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  for (let i = 1; i < y.length; i++) {
    path +=
      " C" +
      coordinate((i - 1 + 1 / 3) * step) +
      "," +
      coordinate(y[i - 1] + tangents[i - 1] / 3) +
      " " +
      coordinate((i - 1 / 3) * step) +
      "," +
      coordinate(y[i] - tangents[i] / 3) +
      " " +
      coordinate(i * step) +
      "," +
      coordinate(y[i]);
  }
  return path;
}
