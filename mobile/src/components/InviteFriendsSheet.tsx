// Bottom sheet listing my friends with an "Invite" button each (used by rooms and tournaments).
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BottomSheet from './BottomSheet';
import Avatar from './Avatar';
import GameButton from './GameButton';
import EmptyState from './EmptyState';
import LoadingView from './LoadingView';
import { friendApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useNotify } from '../context/NotificationContext';
import { colors } from '../theme';
import type { Friend } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onInvite: (friendId: number) => Promise<unknown>;
  excludeIds?: number[]; // friends already in the room / tournament
}

export default function InviteFriendsSheet({ visible, onClose, onInvite, excludeIds = [] }: Props) {
  const { showToast } = useNotify();
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [invited, setInvited] = useState<number[]>([]);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    friendApi.list().then(setFriends).catch(() => setFriends([]));
  }, [visible]);

  async function invite(id: number) {
    setBusy(id);
    try {
      await onInvite(id);
      setInvited((list) => [...list, id]);
    } catch (err) {
      showToast('error', 'Invite failed', errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  const list = (friends || []).filter((f) => !excludeIds.includes(f.player_id));

  return (
    <BottomSheet visible={visible} title="Invite friends" onClose={onClose}>
      {!friends ? (
        <LoadingView />
      ) : list.length === 0 ? (
        <EmptyState emoji="🫂" title="No friends to invite" text="Add friends in the Friends tab, then invite them here." />
      ) : (
        list.map((f) => (
          <View key={f.player_id} style={styles.row}>
            <Avatar avatar={f.avatar} name={f.display_name} size={38} />
            <View style={styles.texts}>
              <Text style={styles.name}>{f.display_name}</Text>
              <Text style={styles.user}>@{f.username}</Text>
            </View>
            <GameButton
              title={invited.includes(f.player_id) ? 'Invited ✓' : 'Invite'}
              size="sm"
              variant={invited.includes(f.player_id) ? 'success' : 'gold'}
              disabled={invited.includes(f.player_id)}
              loading={busy === f.player_id}
              onPress={() => invite(f.player_id)}
            />
          </View>
        ))
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  texts: { flex: 1, marginLeft: 12 },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  user: { color: colors.textMuted, fontSize: 12 },
});
