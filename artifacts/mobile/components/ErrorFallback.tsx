import React, { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reloadAppAsync } from 'expo';
import {
  border,
  colors,
  control,
  radius,
  space,
  typography,
} from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Icon, iconSize } from '@/components/ui/Icon';
import { PressScale } from '@/components/ui/PressScale';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error('Failed to restart app:', restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  });

  return (
    <View style={styles.container}>
      {__DEV__ ? (
        <PressScale
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          style={[styles.topButton, { top: insets.top + space.lg }]}
        >
          <Icon name="alert-circle" size={iconSize.md} color={colors.foreground} />
        </PressScale>
      ) : null}

      <View style={styles.content}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>Please reload the app to continue.</Text>
        <Button label="Try Again" icon="refresh-cw" onPress={handleRestart} style={styles.button} />
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Error Details</Text>
                <PressScale
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  style={styles.closeButton}
                >
                  <Icon name="x" size={iconSize.lg} color={colors.foreground} />
                </PressScale>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: insets.bottom + space.lg },
                ]}
                showsVerticalScrollIndicator
              >
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { fontFamily: monoFont }]} selectable>
                    {formatErrorDetails()}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    width: '100%',
    maxWidth: 600,
  },
  title: { ...typography.display, color: colors.foreground, textAlign: 'center' },
  message: { ...typography.body, color: colors.mutedForeground, textAlign: 'center' },
  topButton: {
    position: 'absolute',
    right: space.lg,
    width: control.minTouch,
    height: control.minTouch,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    ...border.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  button: { marginTop: space.sm, minWidth: 200 },
  modalOverlay: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  modalContainer: {
    width: '100%',
    height: '90%',
    backgroundColor: colors.sheet,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: border.width,
    borderBottomColor: colors.border,
  },
  modalTitle: { ...typography.heading, color: colors.foreground },
  closeButton: {
    width: control.minTouch,
    height: control.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollView: { flex: 1 },
  modalScrollContent: { padding: space.lg },
  errorContainer: {
    width: '100%',
    backgroundColor: colors.card,
    ...border.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
    padding: space.lg,
  },
  errorText: { ...typography.caption, color: colors.foreground, lineHeight: 18, width: '100%' },
});
