import type { OcrLine } from '../state/editStore';

/**
 * Pure hit-testing for OCR-assisted tap-to-edit: given where the user tapped (PDF points,
 * same space `PdfPageViewer`'s `onTap` reports in), find the detected text line they meant.
 *
 * Kept separate from `mergeOcrLines.ts` deliberately: that module works entirely in image px
 * (the native module's space), this one entirely in PDF points (the store's space) - one unit
 * system per file, per AGENTS.md's unit-confusion warning.
 */

/**
 * Returns the detected line whose box contains the tapped point, or `null` if the tap landed
 * on empty page. When boxes overlap (nested/adjacent detections), the smallest containing box
 * wins - it's the most specific thing under the finger.
 *
 * @param lines Detected lines for the page, boxes in PDF points.
 * @param xPt Tapped X, page-relative, in PDF points.
 * @param yPt Tapped Y, page-relative, in PDF points.
 * @param tolerancePt Padding added around every box before testing, in PDF points - fingers
 *   are imprecise and OCR boxes hug glyphs tightly, so a few points of slack makes short or
 *   thin lines actually tappable. Defaults to 3pt.
 */
export function findOcrLineAt(
  lines: OcrLine[],
  xPt: number,
  yPt: number,
  tolerancePt = 3,
): OcrLine | null {
  let best: OcrLine | null = null;
  let bestArea = Infinity;
  for (const line of lines) {
    const within =
      xPt >= line.xPt - tolerancePt &&
      xPt <= line.xPt + line.wPt + tolerancePt &&
      yPt >= line.yPt - tolerancePt &&
      yPt <= line.yPt + line.hPt + tolerancePt;
    if (!within) continue;
    const area = line.wPt * line.hPt;
    if (area < bestArea) {
      best = line;
      bestArea = area;
    }
  }
  return best;
}
