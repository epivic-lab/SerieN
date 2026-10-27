function fitTrainDimensions(size, locomotive = false) {
  if (![size.x, size.y, size.z].every((v) => Number.isFinite(v) && v > 0)) {
    throw new Error("Invalid train model bounds");
  }
  const limits = locomotive ? { length: 58, width: 15, height: 42 } : { length: 50, width: 13, height: 30 };
  const scale = Math.min(limits.width / size.x, limits.height / size.y, limits.length / size.z);
  return {
    scale,
    length: size.z * scale,
    width: size.x * scale,
    height: size.y * scale,
    bottom: locomotive ? -1.5 : 1.5,
    limits
  };
}
function trainCouplers(dimensions) {
  const y = dimensions.bottom + Math.min(7, dimensions.height * 0.25);
  return {
    front: { x: dimensions.length / 2 + 2, y, z: 0 },
    back: { x: -dimensions.length / 2 - 2, y, z: 0 }
  };
}
export {
  fitTrainDimensions,
  trainCouplers
};
