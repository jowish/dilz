export function shouldDismissSheet(distance, velocity = 0) {
  const dragged = Math.max(0, Number(distance) || 0);
  const speed = Math.max(0, Number(velocity) || 0);
  return dragged >= 72 || (dragged >= 36 && speed >= 0.5);
}
