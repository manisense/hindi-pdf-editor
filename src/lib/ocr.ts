import * as Crypto from 'expo-crypto';
import TextRecognition from 'text-recognition';

import { imagePxSizeToPt, imagePxToPt } from './coordinateMath';
import { mergeOcrLines } from './mergeOcrLines';
import type { OcrLine, PageState } from '../state/editStore';

/**
 * App-side entry point for on-device OCR (spec: OCR-assisted tap-to-edit). This is the only
 * file that should ever import from the `text-recognition` native module directly - same
 * isolation rule as `pdfToImages.ts` for `pdf-page-image`, so the OCR engine can be swapped
 * (or a cloud pass added) by editing only this file's callers' dependency.
 *
 * Runs BOTH bundled script models over the page's background image - ML Kit needs one pass
 * per script, and this app's documents mix Hindi and English on the same page - then merges
 * the two line lists (`mergeOcrLines.ts`) and converts every bounding box from image px to
 * PDF points, the app's canonical stored unit.
 *
 * Fails open to "no lines detected" is deliberately NOT done here: a thrown error propagates
 * to the caller so the UI can distinguish "OCR failed" from "page genuinely has no text" -
 * same never-assume posture as `legacyFontDetector.ts` (AGENTS.md).
 */

/**
 * Detects text lines on one page's rasterized background image, returning them in reading
 * order with all positions/sizes in PDF points.
 *
 * @param page The page whose `backgroundImageUri` (JPEG, `imagePxWidth` px wide) to scan.
 */
export async function detectTextLines(page: PageState): Promise<OcrLine[]> {
  // The two passes are independent native calls - run them concurrently; ML Kit serializes
  // internally if it must, and this halves wall-clock time when it doesn't.
  const [devanagariLines, latinLines] = await Promise.all([
    TextRecognition.recognizeText(page.backgroundImageUri, 'devanagari'),
    TextRecognition.recognizeText(page.backgroundImageUri, 'latin'),
  ]);

  return mergeOcrLines(devanagariLines, latinLines).map((line) => {
    const { xPt, yPt } = imagePxToPt(line.x, line.y, page.imagePxWidth, page.widthPt);
    const { wPt, hPt } = imagePxSizeToPt(line.width, line.height, page.imagePxWidth, page.widthPt);
    return { id: Crypto.randomUUID(), text: line.text, xPt, yPt, wPt, hPt };
  });
}
