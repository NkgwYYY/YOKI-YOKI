import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, colors, elevation, radius, space, typography } from '@/constants/theme';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  scroll = true,
  maxHeightRatio = 0.88,
  contentStyle,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  maxHeightRatio?: number;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const paddingBottom = Platform.OS === 'web' ? space.xl : insets.bottom + space.lg;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={[styles.sheet, { maxHeight: `${maxHeightRatio * 100}%` }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <PressScale onPress={onClose} hitSlop={space.sm} accessibilityLabel="閉じる">
                <Icon name="x" size={iconSize.md} color={colors.subtleForeground} />
              </PressScale>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              contentContainerStyle={[styles.body, { paddingBottom }, contentStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingBottom }, contentStyle]}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function CenterDialog({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.dialogOverlay}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={styles.dialog}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: border.width,
    borderTopColor: colors.borderStrong,
    paddingTop: space.md,
    ...elevation.overlay,
  },
  handle: {
    height: 4,
    width: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  headerCopy: { flex: 1 },
  title: { ...typography.heading, color: colors.foreground },
  subtitle: { ...typography.caption, color: colors.mutedForeground, marginTop: space.xs },
  body: { paddingHorizontal: space.xl, paddingTop: space.lg, gap: space.lg },

  dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    backgroundColor: colors.sheet,
    ...border.hairline,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    padding: space.xl,
    gap: space.md,
    ...elevation.overlay,
  },
});
