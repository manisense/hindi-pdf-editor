import { findOcrLineAt } from './ocrHitTest';
import type { OcrLine } from '../state/editStore';

function ocrLine(id: string, xPt: number, yPt: number, wPt = 100, hPt = 12): OcrLine {
  return { id, text: id, xPt, yPt, wPt, hPt };
}

describe('findOcrLineAt', () => {
  it('returns null when no lines exist', () => {
    expect(findOcrLineAt([], 50, 50)).toBeNull();
  });

  it('returns null for a tap on empty page space', () => {
    expect(findOcrLineAt([ocrLine('a', 10, 10)], 500, 500)).toBeNull();
  });

  it('finds the line containing the tap', () => {
    const line = ocrLine('a', 10, 10);
    expect(findOcrLineAt([line], 50, 15)).toBe(line);
  });

  it('honors the tolerance just outside a box edge', () => {
    const line = ocrLine('a', 10, 10);
    // 2pt above the top edge - inside the default 3pt tolerance.
    expect(findOcrLineAt([line], 50, 8)).toBe(line);
    // 10pt above - outside it.
    expect(findOcrLineAt([line], 50, 0)).toBeNull();
  });

  it('prefers the smallest box when boxes overlap', () => {
    const big = ocrLine('big', 0, 0, 400, 50);
    const small = ocrLine('small', 10, 10, 80, 12);
    expect(findOcrLineAt([big, small], 20, 15)).toBe(small);
  });

  it('supports zero tolerance', () => {
    const line = ocrLine('a', 10, 10);
    expect(findOcrLineAt([line], 9, 15, 0)).toBeNull();
    expect(findOcrLineAt([line], 10, 15, 0)).toBe(line);
  });
});
