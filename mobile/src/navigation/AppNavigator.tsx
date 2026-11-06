// All screens. Logged out → Welcome / Login / Register. Logged in → bottom tabs + game, room and tournament screens.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Trophy, Users, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import ScreenBackground from '../components/ScreenBackground';
import Logo from '../components/Logo';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ServerSettingsScreen from '../screens/auth/ServerSettingsScreen';
import HomeScreen from '../screens/home/HomeScreen';
import BotSetupScreen from '../screens/game/BotSetupScreen';
import MatchmakingScreen from '../screens/game/MatchmakingScreen';
import GameScreen from '../screens/game/GameScreen';
import CreateRoomScreen from '../screens/rooms/CreateRoomScreen';
import JoinRoomScreen from '../screens/rooms/JoinRoomScreen';
import RoomLobbyScreen from '../screens/rooms/RoomLobbyScreen';
import TournamentsScreen from '../screens/tournaments/TournamentsScreen';
import TournamentDetailScreen from '../screens/tournaments/TournamentDetailScreen';
import TournamentFormScreen from '../screens/tournaments/TournamentFormScreen';
import InvitesScreen from '../screens/social/InvitesScreen';
import FriendsScreen from '../screens/social/FriendsScreen';
import ProfileScreen from '../screens/social/ProfileScreen';
import LeaderboardScreen from '../screens/social/LeaderboardScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS = { Home, Tournaments: Trophy, Friends: Users, Profile: UserRound };

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 11 },
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + 8 }],
        tabBarIcon: ({ color, focused }) => {
          const Icon = TAB_ICONS[route.name];
          return (
            <View style={focused ? styles.iconFocused : undefined}>
              <Icon color={color} size={focused ? 24 : 22} strokeWidth={focused ? 2.6 : 2} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Tournaments" component={TournamentsScreen} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function SplashScreen() {
  return (
    <ScreenBackground style={styles.splash}>
      <Logo />
    </ScreenBackground>
  );
}

export default function AppNavigator() {
  const { player, booting } = useAuth();
  if (booting) return <SplashScreen />;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.bg } }}>
      {!player ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="BotSetup" component={BotSetupScreen} />
          <Stack.Screen name="Matchmaking" component={MatchmakingScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Game" component={GameScreen} options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="CreateRoom" component={CreateRoomScreen} />
          <Stack.Screen name="JoinRoom" component={JoinRoomScreen} />
          <Stack.Screen name="RoomLobby" component={RoomLobbyScreen} />
          <Stack.Screen name="TournamentDetail" component={TournamentDetailScreen} />
          <Stack.Screen name="TournamentForm" component={TournamentFormScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Invites" component={InvitesScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="ServerSettings" component={ServerSettingsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: '#10163A', borderTopColor: 'rgba(255,201,60,0.25)', borderTopWidth: 1, paddingTop: 8, elevation: 20 },
  iconFocused: { backgroundColor: 'rgba(255,201,60,0.15)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4 },
  splash: { alignItems: 'center', justifyContent: 'center' },
});
