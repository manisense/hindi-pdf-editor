import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderInstance,
} from 'react-native';

import { dpSizeToPt, dpToPt, ptSizeToDp, ptToDp } from '../lib/coordinateMath';
import type { MaskEdit } from '../state/editStore';

export type DrawnMaskRect = { xPt: number; yPt: number; wPt: number; hPt: number };

type Props = {
  /** Already-committed masks on this page, rendered as filled rectangles so the live view
   * matches what `htmlCompositor.ts`'s `maskLayerHtml` produces at export time. */
  masks: MaskEdit[];
  /** The `PdfPageViewer`'s currently measured width, in dp - see that component's docstring. */
  viewWidthDp: number;
  /** The source page's width, in PDF points. */
  pageWidthPt: number;
  /** Replace-mode toggle (spec Section 10, Phase 3): when true, dragging on this overlay draws
   * a new mask selection; when false, this only displays existing masks and lets touches pass
   * through to `PdfPageViewer`'s own tap-to-add-text handler underneath. */
  active: boolean;
  /** Minimum drag distance, in dp, before a drag commits as a mask - filters out accidental taps. */
  minDragDp?: number;
  /** Called with the drawn rectangle, in PDF points, once the user releases a large-enough drag. */
  onMaskDrawn: (rect: DrawnMaskRect) => void;
};

const DEFAULT_MIN_DRAG_DP = 12;

type LatestProps = {
  viewWidthDp: number;
  pageWidthPt: number;
  active: boolean;
  minDragDp: number;
  onMaskDrawn: (rect: DrawnMaskRect) => void;
};

/**
 * Renders committed `MaskEdit`s as filled rectangles, and - in replace mode - lets the user
 * drag out a new rectangle over existing burned-in text to mask (spec Section 6's `MaskOverlay`
 * spec). Reports the drawn rectangle in PDF points to the caller on release; sampling the
 * surrounding background color and committing the `MaskEdit`/replacement `TextEdit` themselves
 * happens in the caller (`App.tsx`), since this component only knows about drawing the
 * selection, not about `editStore` or the native color-sampling call.
 */
export function MaskOverlay({
  masks,
  viewWidthDp,
  pageWidthPt,
  active,
  minDragDp = DEFAULT_MIN_DRAG_DP,
  onMaskDrawn,
}: Props) {
  const [dragRectDp, setDragRectDp] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // `PanResponder.create`'s handlers are constructed once (below) and would otherwise close
  // over this render's props/state forever - this ref is the one mutable escape hatch they
  // read from, kept in sync via the effect underneath rather than during render itself
  // (react-hooks/refs: ref writes belong in effects/event handlers, not render).
  const latestRef = useRef<LatestProps>({
    viewWidthDp,
    pageWidthPt,
    active,
    minDragDp,
    onMaskDrawn,
  });
  useEffect(() => {
    latestRef.current = { viewWidthDp, pageWidthPt, active, minDragDp, onMaskDrawn };
  });

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragRectRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  // Built inside an effect (not directly during render) so the ref reads in its callbacks
  // are unambiguously "outside render" per react-hooks/refs - PanResponder's identity only
  // needs to be stable for the component's lifetime, so an empty dependency array is correct;
  // `latestRef` (kept fresh by the effect above) is how the callbacks still see current values.
  const [panResponder, setPanResponder] = useState<PanResponderInstance | null>(null);
  useEffect(() => {
    setPanResponder(
      PanResponder.create({
        onStartShouldSetPanResponder: () => latestRef.current.active,
        onMoveShouldSetPanResponder: () => latestRef.current.active,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          const { locationX, locationY } = event.nativeEvent;
          dragStartRef.current = { x: locationX, y: locationY };
          const rect = { x: locationX, y: locationY, w: 0, h: 0 };
          dragRectRef.current = rect;
          setDragRectDp(rect);
        },
        onPanResponderMove: (event: GestureResponderEvent) => {
          const start = dragStartRef.current;
          if (!start) return;
          const { locationX, locationY } = event.nativeEvent;
          const rect = {
            x: Math.min(start.x, locationX),
            y: Math.min(start.y, locationY),
            w: Math.abs(locationX - start.x),
            h: Math.abs(locationY - start.y),
          };
          dragRectRef.current = rect;
          setDragRectDp(rect);
        },
        onPanResponderRelease: () => {
          const rect = dragRectRef.current;
          dragStartRef.current = null;
          dragRectRef.current = null;
          setDragRectDp(null);

          const {
            viewWidthDp: viewWidth,
            pageWidthPt: pageWidthPtValue,
            minDragDp: minDrag,
            onMaskDrawn: notify,
          } = latestRef.current;
          if (!rect || viewWidth === 0) return;
          if (rect.w < minDrag || rect.h < minDrag) return;

          const { xPt, yPt } = dpToPt(rect.x, rect.y, viewWidth, pageWidthPtValue);
          const { wPt, hPt } = dpSizeToPt(rect.w, rect.h, viewWidth, pageWidthPtValue);
          notify({ xPt, yPt, wPt, hPt });
        },
        onPanResponderTerminate: () => {
          dragStartRef.current = null;
          dragRectRef.current = null;
          setDragRectDp(null);
        },
      }),
    );
  }, []);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={active ? 'auto' : 'box-none'}
      {...(active && panResponder ? panResponder.panHandlers : {})}
    >
      {masks.map((mask) => {
        const { xDp, yDp } = ptToDp(mask.xPt, mask.yPt, viewWidthDp, pageWidthPt);
        const { wDp, hDp } = ptSizeToDp(mask.wPt, mask.hPt, viewWidthDp, pageWidthPt);
        return (
          <View
            key={mask.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: xDp,
              top: yDp,
              width: wDp,
              height: hDp,
              backgroundColor: mask.color,
            }}
          />
        );
      })}
      {dragRectDp && (
        <View
          pointerEvents="none"
          style={[
            styles.dragPreview,
            { left: dragRectDp.x, top: dragRectDp.y, width: dragRectDp.w, height: dragRectDp.h },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dragPreview: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#1a73e8',
    backgroundColor: 'rgba(26, 115, 232, 0.15)',
  },
});
