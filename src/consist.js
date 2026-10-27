// Distances along the Journey ribbon, in layout millimetres. Both ends of
// each coupling share the same path coordinate. Native/native keeps its
// historical pitch; imported and mixed pairs use their measured end points.
function couplingDistance(a, b) {
  if (!a?.assetDimensions && !b?.assetDimensions) return 64;
  const rear = -(a?.couplers?.back?.x ?? -32);
  const front = b?.couplers?.front?.x ?? 32;
  if (![rear, front].every((n) => Number.isFinite(n) && n > 0)) throw new RangeError("Invalid coupling dimensions");
  return rear + front;
}
function consistLayout(vehicles) {
  const offsets = vehicles.map(() => 0);
  for (let i = 1; i < vehicles.length; i++) offsets[i] = offsets[i - 1] + couplingDistance(vehicles[i - 1], vehicles[i]);
  const last = vehicles.at(-1);
  const rear = last?.assetDimensions ? -(last.couplers?.back?.x ?? -32) : 38;
  return { offsets, tail: (offsets.at(-1) ?? 0) + rear };
}
export { couplingDistance, consistLayout };
