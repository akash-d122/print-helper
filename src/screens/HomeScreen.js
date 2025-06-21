import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../styles/theme';

const HomeScreen = ({ navigation }) => {
  const handleStartProject = () => {
    navigation.navigate('ImagePicker');
  };

  const handleStartScan = () => {
    navigation.navigate('Scan');
  };

  const handleBatchProcess = () => {
    navigation.navigate('BatchProcessing');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>A4 Print Studio</Text>
        <Text style={styles.subtitle}>
          Professional image to PDF conversion for print shops
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="print" size={100} color={colors.primary} />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStartScan}
          >
            <Ionicons name="camera" size={24} color="white" />
            <Text style={styles.primaryButtonText}>Start New Scan</Text>
          </TouchableOpacity>

           <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleStartProject}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Start New Project</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleBatchProcess}
          >
            <Ionicons name="layers" size={24} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Batch Processing</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleSettings}
          >
            <Ionicons name="settings" size={24} color={colors.primary} />
            <Text style={styles.secondaryButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Optimize your printing workflow with professional tools
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.xxl,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryButtonText: {
    ...typography.body1,
    color: 'white',
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.body1,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default HomeScreen; 