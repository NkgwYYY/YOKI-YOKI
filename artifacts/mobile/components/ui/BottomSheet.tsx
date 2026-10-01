import React from 'react';
import {
  Modal,
  KeyboardAvoidingView,
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
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={[styles.sheet, { maxHeight: `${maxHeightRatio * 100}%` }]}>
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text accessibilityRole="header" style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <PressScale onPress={onClose} style={styles.closeButton} accessibilityLabel="閉じる">
                <Icon name="x" size={iconSize.md} color={colors.subtleForeground} />
              </PressScale>
            </View>
          ) : null}
          {scroll ? (
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[styles.body, { paddingBottom }, contentStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={[styles.body, { paddingBottom }, contentStyle]}>{children}</View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={[styles.dialogOverlay, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.lg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="閉じる" />
        <View style={styles.dialog}>
          <View style={styles.dialogHeader}>
            <PressScale onPress={onClose} style={styles.closeButton} accessibilityLabel="閉じる">
              <Icon name="x" size={iconSize.md} color={colors.subtleForeground} />
            </PressScale>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.dialogBody} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
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
  scroll: { flexShrink: 1, minHeight: 0 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  dialogOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '100%',
    overflow: 'hidden',
    backgroundColor: colors.sheet,
    ...border.hairline,
    borderColor: colors.borderStrong,
    borderRadius: radius.xl,
    ...elevation.overlay,
  },
  dialogHeader: { alignItems: 'flex-end', paddingHorizontal: space.sm, paddingTop: space.xs },
  dialogBody: { paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.md },
});
