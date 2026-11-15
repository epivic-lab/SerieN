// Distances along the Journey ribbon, in layout millimetres. Both ends of
// each coupling share the same path coordinate. Catalogued native and
// imported pairs use explicit end points; uncatalogued legacy pairs keep 64mm.
function couplingDistance(a, b) {
  if (!a?.assetDimensions && !b?.assetDimensions && !a?.stock && !b?.stock) return 64;
  const rear = -(a?.couplers?.back?.x ?? -32);
  const front = b?.couplers?.front?.x ?? 32;
  if (![rear, front].every((n) => Number.isFinite(n) && n > 0)) throw new RangeError("Invalid coupling dimensions");
  return rear + front;
}
function consistLayout(vehicles) {
  const offsets = vehicles.map(() => 0);
  for (let i = 1; i < vehicles.length; i++) {
    const previous=vehicles[i-1],next=vehicles[i];
    // The drawbar and the tender guide occupy overlapping protected extents.
    // Their measured mounting pitch sets the ribbon origins for this pair.
    const pitch=previous.stock?.id==='br01-engine' && next.stock?.id==='br01-tender'
      ? previous.stock.tenderPitch : undefined;
    if(pitch!==undefined && (!Number.isFinite(pitch)||pitch<=0))throw new RangeError("Invalid drawbar pitch");
    offsets[i]=offsets[i-1]+(pitch??couplingDistance(previous,next));
  }
  const last = vehicles.at(-1);
  const rear = (last?.assetDimensions || last?.stock) ? -(last.couplers?.back?.x ?? -32) : 38;
  return { offsets, tail: (offsets.at(-1) ?? 0) + rear };
}
export { couplingDistance, consistLayout };

export function couplingMatch(expected, parked, tolerance=3.5) {
  return Math.hypot(parked.x-expected.x,parked.z-expected.z)<=tolerance && Math.cos(parked.angle-expected.angle)>.98;
}
