import { describe, expect, it } from 'vitest';
import { beginCardPress, cardAtPoint, completesCardPress, phdChoiceCardRects, scenarioChoiceCardRects, upgradeCardRects } from '../src/running/phaser/choiceCards';

const landscape = { left: 0, top: 0, width: 1280, height: 720, centerX: 640, centerY: 360 };
const portrait = { left: 300, top: 40, width: 360, height: 720, centerX: 480, centerY: 400 };

describe('Running choice-card geometry', () => {
  it('uses the rendered PhD card rectangles, not broad screen bands', () => {
    const cards = phdChoiceCardRects(portrait, 3, true);
    expect(cards).toHaveLength(3);
    expect(cardAtPoint(cards, { x: portrait.centerX, y: portrait.top + 112 })).toBeNull(); // title
    expect(cardAtPoint(cards, { x: portrait.centerX, y: cards[0].y + cards[0].height + 3 })).toBeNull(); // gap
    expect(cardAtPoint(cards, { x: cards[2].x + cards[2].width / 2, y: cards[2].y + cards[2].height / 2 })).toBe(2);
  });

  it('keeps Scenario cards within their actual visible bounds in both orientations', () => {
    const landscapeCards = scenarioChoiceCardRects(landscape, 4, false);
    expect(cardAtPoint(landscapeCards, { x: 8, y: 360 })).toBeNull();
    expect(cardAtPoint(landscapeCards, { x: landscapeCards[1].x + 10, y: landscapeCards[1].y + 10 })).toBe(1);

    const portraitCards = scenarioChoiceCardRects(portrait, 3, true);
    expect(cardAtPoint(portraitCards, { x: portrait.left + 5, y: portrait.top + 30 })).toBeNull();
    expect(cardAtPoint(portraitCards, { x: portraitCards[1].x + 10, y: portraitCards[1].y + 10 })).toBe(1);
  });

  it('only commits a press released on the same card, and cancels a meaningful drag', () => {
    const cards = upgradeCardRects(landscape, false);
    const start = { x: cards[1].x + 60, y: cards[1].y + 60 };
    const press = beginCardPress(7, 1, start);
    expect(completesCardPress(press, 7, cards, start, start)).toBe(1);
    expect(completesCardPress(press, 7, cards, { x: cards[0].x + 40, y: cards[0].y + 40 }, start)).toBeNull();
    expect(completesCardPress(press, 7, cards, start, { x: start.x + 13, y: start.y })).toBeNull();
    expect(completesCardPress(press, 8, cards, start, start)).toBeNull();
  });

  it('shares the three visible upgrade rectangles in portrait mode', () => {
    const cards = upgradeCardRects(portrait, true);
    expect(cards.map((card) => card.y)).toEqual([110, 320, 530]);
    expect(cardAtPoint(cards, { x: portrait.centerX, y: 280 })).toBeNull();
  });
});
