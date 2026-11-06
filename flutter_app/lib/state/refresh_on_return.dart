// Lets a screen reload its data when the user comes back to it (after closing a screen on top of it).
import 'package:flutter/material.dart';

final RouteObserver<PageRoute<dynamic>> routeObserver = RouteObserver<PageRoute<dynamic>>();

/// Add `with RefreshOnReturn` to a State and implement onReturn().
mixin RefreshOnReturn<T extends StatefulWidget> on State<T> implements RouteAware {
  void onReturn();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) routeObserver.subscribe(this, route);
  }

  @override
  void dispose() {
    routeObserver.unsubscribe(this);
    super.dispose();
  }

  @override
  void didPopNext() => onReturn();
  @override
  void didPush() {}
  @override
  void didPop() {}
  @override
  void didPushNext() {}
}
