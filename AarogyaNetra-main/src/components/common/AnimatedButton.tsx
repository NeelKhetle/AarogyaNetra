/**
 * ArogyaNetra AI - AnimatedButton Component
 * Premium CTA button with press animations
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { Colors, Typography, BorderRadius, Spacing, Shadow } from '../../theme';

interface AnimatedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: Colors.primary,
          borderColor: Colors.primary,
        };
      case 'secondary':
        return {
          backgroundColor: Colors.secondary,
          borderColor: Colors.secondary,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: Colors.primary,
          borderWidth: 1.5,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: Colors.danger,
          borderColor: Colors.danger,
        };
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return Colors.primary;
      default:
        return Colors.white;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'large':
        return { paddingVertical: 16, paddingHorizontal: 32 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        getVariantStyle(),
        getSizeStyle(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        variant === 'primary' && Shadow.small,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={[
              size === 'small' ? Typography.buttonSmall : Typography.button,
              { color: getTextColor() },
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
});
