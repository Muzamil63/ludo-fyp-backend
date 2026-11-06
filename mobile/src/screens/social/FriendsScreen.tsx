// Friends tab: my friends, friend requests (accept / reject), and search to add new friends.
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Search, UserMinus, UserPlus, Check, X } from 'lucide-react-native';
import ScreenBackground from '../../components/ScreenBackground';
import AppHeader from '../../components/AppHeader';
import OptionPicker from '../../components/OptionPicker';
import TextField from '../../components/TextField';
import Avatar from '../../components/Avatar';
import GameButton from '../../components/GameButton';
import EmptyState from '../../components/EmptyState';
import { friendApi, userApi } from '../../api/endpoints';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNotify } from '../../context/NotificationContext';
import { colors } from '../../theme';
import type { Friend } from '../../types';

type Tab = 'friends' | 'requests' | 'add';

function PersonRow({ person, children }: { person: Friend; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Avatar avatar={person.avatar} name={person.display_name} size={42} />
      <View style={styles.texts}>
        <Text style={styles.name}>{person.display_name}</Text>
        <Text style={styles.user}>@{person.username}</Text>
      </View>
      {children}
    </View>
  );
}

export default function FriendsScreen() {
  const { isGuest, logout } = useAuth();
  const { showToast } = useNotify();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [received, setReceived] = useState<Friend[]>([]);
  const [sent, setSent] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Friend[]>([]);
  const [requested, setRequested] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (isGuest) return;
    try {
      const [f, r] = await Promise.all([friendApi.list(), friendApi.requests()]);
      setFriends(f);
      setReceived(r.received);
      setSent(r.sent);
    } catch {
      // keep old lists
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Search as you type (waits 350 ms after the last key press)
  useEffect(() => {
    if (tab !== 'add' || query.trim().length < 1) return setResults([]);
    const timer = setTimeout(() => {
      userApi.search(query.trim()).then(setResults).catch(() => setResults([]));
    }, 350);
    return () => clearTimeout(timer);
  }, [query, tab]);

  async function run(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      showToast('success', success);
      await load();
    } catch (err) {
      showToast('error', errorMessage(err));
    }
  }

  if (isGuest) {
    return (
      <ScreenBackground safeBottom={false}>
        <AppHeader title="Friends" back={false} />
        <EmptyState emoji="🫂" title="Friends need an account" text="Create a free account to add friends and invite them to rooms and tournaments." actionLabel="Create Account" onAction={() => logout()} />
      </ScreenBackground>
    );
  }

  const friendIds = friends.map((f) => f.player_id);
  const pendingIds = [...sent, ...received].map((f) => f.player_id);

  return (
    <ScreenBackground safeBottom={false}>
      <AppHeader title="Friends" back={false} />
      <View style={styles.tabs}>
        <OptionPicker
          value={tab}
          onChange={setTab}
          options={[
            { label: `Friends (${friends.length})`, value: 'friends' },
            { label: `Requests${received.length ? ` (${received.length})` : ''}`, value: 'requests' },
            { label: 'Add', value: 'add' },
          ]}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === 'friends' &&
          (friends.length === 0 ? (
            <EmptyState emoji="👋" title="No friends yet" text="Find players by their username and send a request." actionLabel="Add Friends" onAction={() => setTab('add')} />
          ) : (
            friends.map((f) => (
              <PersonRow key={f.player_id} person={f}>
                <Pressable
                  hitSlop={10}
                  onPress={() =>
                    Alert.alert('Remove friend?', `Remove ${f.display_name} from your friends?`, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => run(() => friendApi.remove(f.player_id), 'Friend removed') },
                    ])
                  }
                >
                  <UserMinus color={colors.textMuted} size={22} />
                </Pressable>
              </PersonRow>
            ))
          ))}

        {tab === 'requests' && (
          <>
            <Text style={styles.section}>Received</Text>
            {received.length === 0 && <Text style={styles.none}>No new requests</Text>}
            {received.map((f) => (
              <PersonRow key={f.friendship_id} person={f}>
                <View style={styles.actions}>
                  <Pressable style={[styles.circle, styles.reject]} onPress={() => run(() => friendApi.respond(f.friendship_id, 'reject'), 'Request rejected')}>
                    <X color="#fff" size={18} />
                  </Pressable>
                  <Pressable style={[styles.circle, styles.accept]} onPress={() => run(() => friendApi.respond(f.friendship_id, 'accept'), `You and ${f.display_name} are now friends!`)}>
                    <Check color="#fff" size={18} />
                  </Pressable>
                </View>
              </PersonRow>
            ))}
            <Text style={styles.section}>Sent</Text>
            {sent.length === 0 && <Text style={styles.none}>No pending requests</Text>}
            {sent.map((f) => (
              <PersonRow key={f.friendship_id} person={f}>
                <Text style={styles.pending}>Pending</Text>
              </PersonRow>
            ))}
          </>
        )}

        {tab === 'add' && (
          <>
            <TextField icon={Search} placeholder="Search by username" value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} />
            {results.map((u) => {
              const status = friendIds.includes(u.player_id) ? 'Friends' : pendingIds.includes(u.player_id) || requested.includes(u.username) ? 'Requested' : null;
              return (
                <PersonRow key={u.player_id} person={u}>
                  {status ? (
                    <Text style={styles.pending}>{status}</Text>
                  ) : (
                    <GameButton
                      title="Add"
                      icon={UserPlus}
                      size="sm"
                      variant="gold"
                      onPress={() =>
                        run(async () => {
                          await friendApi.send(u.username);
                          setRequested((r) => [...r, u.username]);
                        }, `Request sent to ${u.display_name}`)
                      }
                    />
                  )}
                </PersonRow>
              );
            })}
            {query.trim().length > 0 && results.length === 0 && <Text style={styles.none}>No players found</Text>}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 30 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  texts: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  user: { color: colors.textMuted, fontSize: 12 },
  section: { color: colors.textDim, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 12, marginBottom: 4 },
  none: { color: colors.textMuted, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 10 },
  circle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  accept: { backgroundColor: colors.success },
  reject: { backgroundColor: colors.danger },
  pending: { color: colors.textMuted, fontWeight: '700' },
});
