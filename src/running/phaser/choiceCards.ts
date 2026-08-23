/**
 * The rendered choice cards and their hit targets deliberately share this
 * geometry.  A choice is only actionable inside the visible card itself;
 * overlay titles, gaps, and the dimmed background are not implicit buttons.
 */
export interface ChoiceViewport {
  left: number;
  top: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface ChoiceCardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CardPoint {
  x: number;
  y: number;
}

export interface CardPress {
  pointerId: number;
  index: number;
  startX: number;
  startY: number;
}

const UPGRADE_COUNT = 3;
const DRAG_CANCEL_DISTANCE = 12;

export function phdChoiceCardRects(view: ChoiceViewport, count: number, portrait: boolean): ChoiceCardRect[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  if (portrait) {
    const slotHeight = (view.height - 150) / count;
    return Array.from({ length: count }, (_, index) => ({
      x: view.left + 24,
      y: view.top + 140 + index * slotHeight,
      width: view.width - 48,
      height: slotHeight - 8,
    }));
  }
  const slotWidth = view.width / count;
  return Array.from({ length: count }, (_, index) => ({
    x: view.left + index * slotWidth + 16,
    y: view.centerY - 130,
    width: slotWidth - 32,
    height: 260,
  }));
}

export function scenarioChoiceCardRects(view: ChoiceViewport, count: number, portrait: boolean): ChoiceCardRect[] {
  if (!Number.isInteger(count) || count <= 0) return [];
  if (portrait) {
    const slotHeight = view.height / count;
    return Array.from({ length: count }, (_, index) => ({
      x: view.left + 24,
      y: view.top + index * slotHeight + 14,
      width: view.width - 48,
      height: slotHeight - 28,
    }));
  }
  const slotWidth = view.width / count;
  return Array.from({ length: count }, (_, index) => ({
    x: view.left + index * slotWidth + 17,
    y: view.centerY - 135,
    width: slotWidth - 34,
    height: 270,
  }));
}

export function upgradeCardRects(view: ChoiceViewport, portrait: boolean): ChoiceCardRect[] {
  if (portrait) {
    return Array.from({ length: UPGRADE_COUNT }, (_, index) => ({
      x: view.centerX - 140,
      y: view.top + 70 + index * 210,
      width: 280,
      height: 155,
    }));
  }
  return Array.from({ length: UPGRADE_COUNT }, (_, index) => ({
    x: 95 + index * 355,
    y: 205,
    width: 300,
    height: 300,
  }));
}

export function cardAtPoint(cards: readonly ChoiceCardRect[], point: CardPoint): number | null {
  const index = cards.findIndex((card) => point.x >= card.x && point.x <= card.x + card.width && point.y >= card.y && point.y <= card.y + card.height);
  return index === -1 ? null : index;
}

export function beginCardPress(pointerId: number, index: number, point: CardPoint): CardPress {
  return { pointerId, index, startX: point.x, startY: point.y };
}

export function cardPressMovedTooFar(press: CardPress, point: CardPoint): boolean {
  return Math.hypot(point.x - press.startX, point.y - press.startY) > DRAG_CANCEL_DISTANCE;
}

export function completesCardPress(press: CardPress | null, pointerId: number, cards: readonly ChoiceCardRect[], cardPoint: CardPoint, movementPoint: CardPoint = cardPoint): number | null {
  if (!press || press.pointerId !== pointerId || cardPressMovedTooFar(press, movementPoint)) return null;
  return cardAtPoint(cards, cardPoint) === press.index ? press.index : null;
}
