// The 4 bottom tabs after login: Home, Tournaments, Friends, Profile.
import 'package:flutter/material.dart';
import '../theme.dart';
import 'home/home_screen.dart';
import 'social/friends_screen.dart';
import 'social/profile_screen.dart';
import 'tournaments/tournaments_screen.dart';

class MainTabs extends StatefulWidget {
  const MainTabs({super.key});

  /// The selected tab. Other screens can switch tabs: MainTabs.selectedTab.value = 1;
  static final ValueNotifier<int> selectedTab = ValueNotifier(0);

  @override
  State<MainTabs> createState() => _MainTabsState();
}

class _MainTabsState extends State<MainTabs> {
  @override
  void initState() {
    super.initState();
    MainTabs.selectedTab.value = 0;
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: MainTabs.selectedTab,
      builder: (context, index, _) => Scaffold(
        body: IndexedStack(index: index, children: const [HomeScreen(), TournamentsScreen(), FriendsScreen(), ProfileScreen()]),
        bottomNavigationBar: NavigationBarTheme(
          data: NavigationBarThemeData(
            backgroundColor: const Color(0xFF10163A),
            indicatorColor: AppColors.gold.withAlpha(38),
            labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: states.contains(WidgetState.selected) ? AppColors.gold : AppColors.textMuted,
                )),
            iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
                  color: states.contains(WidgetState.selected) ? AppColors.gold : AppColors.textMuted,
                )),
          ),
          child: Container(
            decoration: BoxDecoration(border: Border(top: BorderSide(color: AppColors.gold.withAlpha(64)))),
            child: NavigationBar(
              selectedIndex: index,
              onDestinationSelected: (i) => MainTabs.selectedTab.value = i,
              destinations: const [
                NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
                NavigationDestination(icon: Icon(Icons.emoji_events_outlined), selectedIcon: Icon(Icons.emoji_events), label: 'Tournaments'),
                NavigationDestination(icon: Icon(Icons.people_outline), selectedIcon: Icon(Icons.people), label: 'Friends'),
                NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
