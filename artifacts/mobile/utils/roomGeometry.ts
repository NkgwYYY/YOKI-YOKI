/** Foot positions in the illustrated room; independent of screen size. */
export type RoomPoint = { x: number; y: number };
export const ROOM_STOPS: RoomPoint[] = [
  { x: 0.48, y: 0.64 }, // rug
  { x: 0.30, y: 0.55 }, // window
  { x: 0.65, y: 0.57 }, // beside bed, never inside its painted footprint
  { x: 0.53, y: 0.76 }, // clear aisle between desk and player
];
export function safeRoomPoint(point: RoomPoint): RoomPoint {
  const x = Math.max(0.22, Math.min(0.76, point.x));
  const y = Math.max(0.54, Math.min(0.86, point.y));
  // Furniture collision: keep feet outside the desk, player and dining place.
  if ((y > 0.70 && x < 0.41) || (y > 0.66 && x > 0.64)) return { x: 0.52, y };
  return { x, y };
}
export function fitRoom(width: number, height: number) {
  const roomWidth = Math.max(0, Math.min(width, height * 2 / 3));
  return { width: roomWidth, height: roomWidth * 1.5 };
}
