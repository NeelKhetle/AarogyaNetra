/**
 * AarogyaNetra AI - App Navigator
 * Simplified 3-tab structure: Home | Doctor | Profile
 * Onboarding gate: runs full Welcome flow on first launch
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Colors, Typography, Spacing } from '../theme';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ChatbotScreen } from '../screens/ChatbotScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { DietScreen } from '../screens/DietScreen';
import { DREMScreen } from '../screens/DREMScreen';
import { WhatIfScreen } from '../screens/WhatIfScreen';
import {
  LabReportsListScreen,
  AddLabReportScreen,
  FamilyHistoryScreen,
} from '../screens/LabReportsScreen';
import { DoctorScreen } from '../screens/DoctorScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';

// Types
import type {
  RootTabParamList,
  HomeStackParamList,
  HistoryStackParamList,
  LabReportsStackParamList,
} from '../models/types';
import { useAppStore } from '../store/useAppStore';

// ─── Types for 3-tab nav ──────────────────────────────
type ProfileStackParamList = {
  ProfileMain: undefined;
  ResultDetail: { scanId: string };
};

// ─── Tab Icon ─────────────────────────────────────────
const TabIcon: React.FC<{ emoji: string; focused: boolean; color: string }> = ({ emoji, focused, color }) => (
  <View style={[tabStyles.iconContainer, focused && { backgroundColor: `${color}18` }]}>
    <Text style={{ fontSize: 20 }}>{emoji}</Text>
    {focused && <View style={[tabStyles.activeDot, { backgroundColor: color }]} />}
  </View>
);

const tabStyles = StyleSheet.create({
  iconContainer: {
    width: 48,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

// ─── Shared screen options ─────────────────────────────
const screenOptions = {
  headerStyle: { backgroundColor: Colors.background },
  headerTintColor: Colors.primary,
  headerTitleStyle: {
    ...Typography.h4,
    color: Colors.textPrimary,
    fontWeight: '700' as const,
  },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.background },
  animation: 'slide_from_right' as const,
};

// ─── Stack Navigators ──────────────────────────────────
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Health Scanner', headerBackTitle: 'Home' }}
      />
      <HomeStack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ title: 'AI Health Chat', headerBackTitle: 'Home' }}
      />
      <HomeStack.Screen
        name="Results"
        component={ResultsScreen}
        options={{ title: 'Your Results', headerBackTitle: 'Back' }}
      />
      <HomeStack.Screen
        name="DREM"
        component={DREMScreen}
        options={{ title: 'Risk Forecast', headerBackTitle: 'Results' }}
      />
      <HomeStack.Screen
        name="WhatIf"
        component={WhatIfScreen}
        options={{ title: 'What-If Simulation', headerBackTitle: 'Results' }}
      />
      <HomeStack.Screen
        name="Diet"
        component={DietScreen}
        options={{ title: 'Diet Plan', headerBackTitle: 'Results' }}
      />
    </HomeStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={screenOptions}>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="ResultDetail"
        component={ResultsScreen}
        options={{ title: 'Scan Report', headerBackTitle: 'Profile' }}
      />
    </ProfileStack.Navigator>
  );
}

// ─── Main Navigator ────────────────────────────────────
export function AppNavigator() {
  const { user, dataLoaded } = useAppStore();
  const [welcomed, setWelcomed] = React.useState(false);

  // Wait for persisted data to load before deciding
  if (!dataLoaded) return null;

  // Show full welcome/onboarding flow if no user profile exists
  if (!user && !welcomed) {
    return <WelcomeScreen onComplete={() => setWelcomed(true)} />;
  }

  // If welcomed but no user yet (shouldn't happen, but guard)
  // The WelcomeScreen's ProfileSetupStep calls setUser before onComplete

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            height: 70,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 0,
            shadowColor: '#191c1d',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.05,
            shadowRadius: 20,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginTop: 0,
          },
        }}
      >
        {/* Tab 1: Home */}
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" focused={focused} color={Colors.primary} />
            ),
          }}
        />

        {/* Tab 2: Doctor */}
        <Tab.Screen
          name="ChatbotTab"
          component={DoctorScreen}
          options={{
            tabBarLabel: 'Doctor',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👨‍⚕️" focused={focused} color={Colors.secondary} />
            ),
          }}
        />

        {/* Tab 3: Profile */}
        <Tab.Screen
          name="ProfileTab"
          component={ProfileStackNavigator}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👤" focused={focused} color={Colors.accent} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
