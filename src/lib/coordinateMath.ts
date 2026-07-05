/**
 * Pure coordinate conversions between the three coexisting unit systems in this app
 * (see hindi-pdf-editor-spec.md Sections 7-8):
 *
 * - dp:  device-independent pixels, the unit React Native views/TextInputs are laid out in.
 * - pt:  PDF points, the canonical unit every stored `Edit` is persisted in, taken from the
 *        source document's real page size (`@cantoo/pdf-lib`'s `getSize()`).
 * - px:  pixels of the rasterized background PNG for a page (`pdfToImages.ts`'s output),
 *        rendered at 2-3x the page's point-dimensions.
 *
 * All three share a top-left origin (no Y-flip anywhere in this pipeline - only raw PDF
 * content-stream drawing operations use a bottom-left origin, and this architecture never
 * writes to a content stream directly, per ADR 0001). Every conversion here is therefore a
 * single uniform linear scale derived from the width ratio between the two unit systems,
 * applied identically to both axes - there is no rotation or baseline-offset math anywhere
 * in Plan A.
 */

/**
 * Converts a point tapped/typed in the live on-screen overlay (dp) to PDF points.
 *
 * @param xDp Horizontal position, in dp, relative to the page view's left edge.
 * @param yDp Vertical position, in dp, relative to the page view's top edge.
 * @param viewWidthDp Width of the on-screen page view, in dp.
 * @param pageWidthPt Width of the source PDF page, in points.
 */
export function dpToPt(
  xDp: number,
  yDp: number,
  viewWidthDp: number,
  pageWidthPt: number,
): { xPt: number; yPt: number } {
  const scale = pageWidthPt / viewWidthDp;
  return { xPt: xDp * scale, yPt: yDp * scale };
}

/**
 * Converts a stored edit's position (PDF points) back to dp, to place it on the live
 * on-screen overlay.
 *
 * @param xPt Horizontal position, in PDF points, relative to the page's left edge.
 * @param yPt Vertical position, in PDF points, relative to the page's top edge.
 * @param viewWidthDp Width of the on-screen page view, in dp.
 * @param pageWidthPt Width of the source PDF page, in points.
 */
export function ptToDp(
  xPt: number,
  yPt: number,
  viewWidthDp: number,
  pageWidthPt: number,
): { xDp: number; yDp: number } {
  const scale = viewWidthDp / pageWidthPt;
  return { xDp: xPt * scale, yDp: yPt * scale };
}

/**
 * Converts a stored edit's position (PDF points) to background-image pixels, for
 * `htmlCompositor.ts` to position an absolutely-positioned layer at export time.
 *
 * @param xPt Horizontal position, in PDF points, relative to the page's left edge.
 * @param yPt Vertical position, in PDF points, relative to the page's top edge.
 * @param imagePxWidth Width of the rendered background PNG, in px.
 * @param pageWidthPt Width of the source PDF page, in points.
 */
export function ptToImagePx(
  xPt: number,
  yPt: number,
  imagePxWidth: number,
  pageWidthPt: number,
): { x: number; y: number } {
  const scale = imagePxWidth / pageWidthPt;
  return { x: xPt * scale, y: yPt * scale };
}
