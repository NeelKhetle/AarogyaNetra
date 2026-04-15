/**
 * ArogyaNetra AI - Navigation Setup
 * Tab + Stack navigation structure with Lab Reports and Diet screens
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

// Screens
import { HomeScreen } from '../screens/HomeScreen';
import { ScannerScreen } from '../screens/ScannerScreen';
import { ResultsScreen } from '../screens/ResultsScreen';
import { DREMScreen } from '../screens/DREMScreen';
import { WhatIfScreen } from '../screens/WhatIfScreen';
import { DietScreen } from '../screens/DietScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { LabReportsListScreen, AddLabReportScreen, FamilyHistoryScreen } from '../screens/LabReportsScreen';

// Types
import type {
  RootTabParamList,
  HomeStackParamList,
  HistoryStackParamList,
  LabReportsStackParamList,
} from '../models/types';

// ─── Tab Icon ──────────────────────────────────────────
const TabIcon: React.FC<{ emoji: string; focused: boolean }> = ({ emoji, focused }) => (
  <View style={[tabStyles.iconContainer, focused && tabStyles.iconActive]}>
    <Text style={tabStyles.icon}>{emoji}</Text>
  </View>
);

const tabStyles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: `${Colors.primary}20`,
  },
  icon: {
    fontSize: 20,
  },
});

// ─── Stack Navigators ──────────────────────────────────
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();
const LabReportsStack = createNativeStackNavigator<LabReportsStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const screenOptions = {
  headerStyle: {
    backgroundColor: Colors.background,
  },
  headerTintColor: Colors.textPrimary,
  headerTitleStyle: {
    ...Typography.h4,
    color: Colors.textPrimary,
  },
  headerShadowVisible: false,
  contentStyle: {
    backgroundColor: Colors.background,
  },
  animation: 'slide_from_right' as const,
};

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
        options={{
          title: '🔬 Health Scanner',
          headerBackTitle: 'Home',
        }}
      />
      <HomeStack.Screen
        name="Results"
        component={ResultsScreen}
        options={{
          title: '📊 Results',
          headerBackTitle: 'Scanner',
        }}
      />
      <HomeStack.Screen
        name="DREM"
        component={DREMScreen}
        options={{
          title: '📈 DREM Trajectory',
          headerBackTitle: 'Results',
        }}
      />
      <HomeStack.Screen
        name="WhatIf"
        component={WhatIfScreen}
        options={{
          title: '🔄 What-If',
          headerBackTitle: 'Results',
        }}
      />
      <HomeStack.Screen
        name="Diet"
        component={DietScreen}
        options={{
          title: '🍽️ Diet Plan',
          headerBackTitle: 'Results',
        }}
      />
    </HomeStack.Navigator>
  );
}

function HistoryStackNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ headerShown: false }}
      />
      <HistoryStack.Screen
        name="ResultDetail"
        component={ResultsScreen}
        options={{
          title: '📊 Scan Details',
          headerBackTitle: 'History',
        }}
      />
    </HistoryStack.Navigator>
  );
}

function LabReportsStackNavigator() {
  return (
    <LabReportsStack.Navigator screenOptions={screenOptions}>
      <LabReportsStack.Screen
        name="LabReportsList"
        component={LabReportsListScreen}
        options={{ headerShown: false }}
      />
      <LabReportsStack.Screen
        name="AddLabReport"
        component={AddLabReportScreen}
        options={{
          title: '📋 Add Lab Report',
          headerBackTitle: 'Reports',
        }}
      />
      <LabReportsStack.Screen
        name="FamilyHistory"
        component={FamilyHistoryScreen}
        options={{
          title: '🧬 Family History',
          headerBackTitle: 'Reports',
        }}
      />
    </LabReportsStack.Navigator>
  );
}

// ─── Main Navigator ────────────────────────────────────
export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.backgroundLight,
            borderTopColor: Colors.surfaceBorder,
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textTertiary,
          tabBarLabelStyle: {
            ...Typography.caption,
            fontSize: 11,
            fontWeight: '500',
          },
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStackNavigator}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="LabReportsTab"
          component={LabReportsStackNavigator}
          options={{
            tabBarLabel: 'Reports',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="HistoryTab"
          component={HistoryStackNavigator}
          options={{
            tabBarLabel: 'History',
            tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="ProfileTab"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
            headerShown: false,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
