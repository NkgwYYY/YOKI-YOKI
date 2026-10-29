import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { RamenArt, RamenSteam } from "./RamenArt";
import { WorldPill } from "@/components/world/WorldPill";
/** Presentation only. The feeding transaction completes before the served mode starts. */
export function RamenServing({
  active,
  reduceMotion,
  preview = false,
  onComplete,
}: {
  active: boolean;
  reduceMotion: boolean;
  preview?: boolean;
  onComplete: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width - 28, height * 0.48, 450);
  const progress = useRef(new Animated.Value(0)).current;
  const elapsed = useRef(0),
    finished = useRef(false),
    complete = useRef(onComplete);
  complete.current = onComplete;
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const finish = useCallback(() => {
    if (!finished.current) {
      finished.current = true;
      complete.current();
    }
  }, []);
  useEffect(() => {
    const listener = progress.addListener(({ value }) => {
      elapsed.current = value;
    });
    return () => {
      progress.removeListener(listener);
      progress.stopAnimation();
    };
  }, [progress]);
  useEffect(() => {
    if (!active || !ready || failed) {
      progress.stopAnimation();
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: (reduceMotion ? 2200 : 5200) * (1 - elapsed.current),
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished: ended }) => {
      if (ended && !preview) finish();
    });
    return () => animation.stop();
  }, [active, ready, failed, reduceMotion, preview, progress, finish]);
  const bowlStyle = reduceMotion
    ? {}
    : {
        opacity: progress.interpolate({
          inputRange: [0, 0.06, 1],
          outputRange: [0, 1, 1],
        }),
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 0.23, 0.3, 1],
              outputRange: [-100, 5, 0, 0],
            }),
          },
          {
            scale: progress.interpolate({
              inputRange: [0, 0.24, 1],
              outputRange: [0.48, 1, 1.045],
            }),
          },
        ],
      };
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={finish}
    >
      <View
        testID="ramen-serving-scene"
        accessibilityViewIsModal
        style={s.root}
      >
        <Image
          source={require("@/assets/images/world/village-ramen.jpg")}
          blurRadius={18}
          resizeMode="cover"
          style={[StyleSheet.absoluteFill, { opacity: 0.24 }]}
        />
        <View style={s.content}>
          <Text style={s.eyebrow}>MOFUMOFU RAMEN</Text>
          <Text style={s.title}>
            {preview ? "できたての、しあわせ。" : "おまちどうさま。"}
          </Text>
          <Text style={s.description}>
            とろけるチャーシューと半熟たまご。{"\n"}あたたかいうちに、どうぞ。
          </Text>
          <View style={{ width: size, height: size + 12 }}>
            <View
              style={[
                s.tray,
                {
                  width: size * 0.92,
                  height: size * 0.34,
                  left: size * 0.04,
                  top: size * 0.59,
                },
              ]}
            />
            <Animated.View style={bowlStyle}>
              <RamenArt
                size={size}
                onLoad={() => setReady(true)}
                onError={() => setFailed(true)}
              />
              {ready && (
                <RamenSteam
                  size={size}
                  active={active}
                  reduceMotion={reduceMotion}
                />
              )}
            </Animated.View>
          </View>
          {failed && (
            <Text accessibilityRole="alert" style={s.description}>
              画像を読み込めませんでした。食事はそのまま続けられます。
            </Text>
          )}
          <WorldPill
            testID="ramen-serving-finish"
            label={preview ? "メニューに戻る" : "いただきます"}
            icon={preview ? "arrow-left" : "heart"}
            onPress={finish}
            style={{ minWidth: 168 }}
          />
          {preview && (
            <Text style={s.preview}>
              お料理の紹介です。ポイントは使いません。
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#261C31",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 20,
    gap: 12,
    maxWidth: 600,
  },
  eyebrow: {
    color: "#D9C1E6",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 3,
  },
  title: {
    color: "#FFF5DF",
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: 1,
  },
  description: {
    color: "#E2D2D8",
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
  },
  tray: {
    position: "absolute",
    backgroundColor: "#AA7651",
    borderRadius: 100,
    borderWidth: 4,
    borderColor: "#C79968",
    transform: [{ rotate: "-4deg" }],
    shadowColor: "#09000F",
    shadowOpacity: 0.7,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  preview: { fontSize: 10, color: "#C6B6CC" },
});
