const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

export function formatCategoryLabel(
  priceLevel: number,
  cuisines: string[]
): string {
  const price = PRICE_LABELS[priceLevel] ?? "$";
  const type = (cuisines[0] ?? "restaurant").toUpperCase().replace(/_/g, " ");
  return `${price} · ${type}`;
}

export function formatWalkLocationLine(
  distanceMeters: number | undefined,
  address: string | undefined
): string {
  const mins =
    distanceMeters != null
      ? Math.max(1, Math.round(distanceMeters / 80))
      : null;
  const place = (address ?? "")
    .split(",")[0]
    .trim()
    .toUpperCase()
    .slice(0, 28);
  if (mins != null && place) {
    return `${mins} MIN WALK · ${place}`;
  }
  if (place) return place;
  return mins != null ? `${mins} MIN WALK` : "";
}

export function formatGroupHungryLabel(done: number, total: number): string {
  return `${done}/${total} hungry`;
}
