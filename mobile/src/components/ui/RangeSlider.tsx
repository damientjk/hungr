import { useRef } from "react";
import { View, Animated, PanResponder, StyleSheet } from "react-native";
import { colors } from "@/src/theme/colors";

interface Props {
  min: number;
  max: number;
  low: number;
  high: number;
  step: number;
  onValueChange: (low: number, high: number) => void;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 24;
const HIT_SLOP = 12;

export function RangeSlider({ min, max, low, high, step, onValueChange }: Props) {
  const trackWidthRef = useRef(0);

  const valueToPixel = (v: number) =>
    ((v - min) / (max - min)) * trackWidthRef.current;

  const pixelToValue = (px: number): number => {
    if (trackWidthRef.current === 0) return min;
    const ratio = Math.max(0, Math.min(1, px / trackWidthRef.current));
    const raw = min + ratio * (max - min);
    return Math.round(raw / step) * step;
  };

  // Animated pixel positions — stored as translateX so the native driver can handle them.
  const lowPos = useRef(new Animated.Value(0)).current;
  const highPos = useRef(new Animated.Value(0)).current;

  // Current pixel positions as plain refs (no _value access).
  const lowPxRef = useRef(0);
  const highPxRef = useRef(0);

  // Keep latest committed low/high in refs so PanResponder closures stay current.
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;

  // Sync animated positions when props change (e.g. parent reset).
  const prevLow = useRef(low);
  const prevHigh = useRef(high);
  if (prevLow.current !== low) {
    prevLow.current = low;
    const px = valueToPixel(low);
    lowPxRef.current = px;
    lowPos.setValue(px);
  }
  if (prevHigh.current !== high) {
    prevHigh.current = high;
    const px = valueToPixel(high);
    highPxRef.current = px;
    highPos.setValue(px);
  }

  const makePanResponder = (thumb: "low" | "high") => {
    const startPx = useRef(0);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPx.current =
          thumb === "low" ? lowPxRef.current : highPxRef.current;
      },
      onPanResponderMove: (_evt, gs) => {
        const raw = startPx.current + gs.dx;
        if (thumb === "low") {
          const clamped = Math.max(0, Math.min(raw, highPxRef.current));
          lowPxRef.current = clamped;
          lowPos.setValue(clamped);
        } else {
          const clamped = Math.min(
            trackWidthRef.current,
            Math.max(raw, lowPxRef.current)
          );
          highPxRef.current = clamped;
          highPos.setValue(clamped);
        }
      },
      onPanResponderRelease: (_evt, gs) => {
        const raw = startPx.current + gs.dx;
        if (thumb === "low") {
          const val = Math.max(min, Math.min(pixelToValue(raw), highRef.current));
          const snappedPx = valueToPixel(val);
          lowPxRef.current = snappedPx;
          lowPos.setValue(snappedPx);
          onValueChange(val, highRef.current);
        } else {
          const val = Math.min(max, Math.max(pixelToValue(raw), lowRef.current));
          const snappedPx = valueToPixel(val);
          highPxRef.current = snappedPx;
          highPos.setValue(snappedPx);
          onValueChange(lowRef.current, val);
        }
      },
    });
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const lowPan = useRef(makePanResponder("low")).current;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const highPan = useRef(makePanResponder("high")).current;

  const onLayout = (width: number) => {
    trackWidthRef.current = width;
    // Set initial pixel positions now that we know the track width.
    const lx = valueToPixel(lowRef.current);
    const hx = valueToPixel(highRef.current);
    lowPxRef.current = lx;
    highPxRef.current = hx;
    lowPos.setValue(lx);
    highPos.setValue(hx);
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => onLayout(e.nativeEvent.layout.width - THUMB_SIZE)}
    >
      {/* Inactive full track */}
      <View style={styles.track} />

      {/* Active track segment — JS-driven (width/left can't use native driver),
          but it's a background fill so minor lag is imperceptible. */}
      <Animated.View
        style={[
          styles.trackActive,
          { left: lowPos, width: Animated.subtract(highPos, lowPos) },
        ]}
      />

      {/* Low thumb — translateX runs on native thread */}
      <Animated.View
        style={[
          styles.thumbHit,
          { transform: [{ translateX: lowPos }] },
        ]}
        hitSlop={HIT_SLOP}
        {...lowPan.panHandlers}
      >
        <View style={styles.thumb} />
      </Animated.View>

      {/* High thumb — translateX runs on native thread */}
      <Animated.View
        style={[
          styles.thumbHit,
          { transform: [{ translateX: highPos }] },
        ]}
        hitSlop={HIT_SLOP}
        {...highPan.panHandlers}
      >
        <View style={styles.thumb} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: THUMB_SIZE + 8,
    justifyContent: "center",
    marginVertical: 8,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.border,
  },
  trackActive: {
    position: "absolute",
    height: TRACK_HEIGHT,
    backgroundColor: colors.primary,
    top: "50%",
    marginTop: -(TRACK_HEIGHT / 2),
    left: THUMB_SIZE / 2,
  },
  thumbHit: {
    position: "absolute",
    left: 0,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
