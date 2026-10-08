/** A visual 100-light scale only; excess energy remains in the authoritative balance. */
export function energyTankLevel(energy: number) {
  const amount=Number.isFinite(energy)?Math.max(0,energy):0;
  return {amount,fraction:Math.min(1,amount/100)};
}
