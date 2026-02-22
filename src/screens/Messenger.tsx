import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CONVERSATIONS = [
  { id: 'c1', name: 'Alex Cruz', last: 'See you in class!', avatar: require('../../assets/images/default_profile.png'), time: '2:15 PM' },
  { id: 'c2', name: 'Maria Lopez', last: 'Thanks!', avatar: require('../../assets/images/default_profile.png'), time: '1:02 PM' },
  { id: 'c3', name: 'Professor Tan', last: 'Assignment due tomorrow.', avatar: require('../../assets/images/default_profile.png'), time: 'Yesterday' },
];

const SAMPLE_MESSAGES = [
  { id: 'm1', fromMe: false, text: 'Hi Jade, are you attending the review?' },
  { id: 'm2', fromMe: true, text: 'Yes, I will be there at 3pm.' },
  { id: 'm3', fromMe: false, text: 'Great — bring your notes.' },
];

const Messenger = ({ searchQuery = '', onConversationActiveChange }: { searchQuery?: string; onConversationActiveChange?: (isActive: boolean) => void }) => {
  const [selected, setSelected] = useState<any | null>(null);

  const filtered = CONVERSATIONS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.last.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectConversation = (item: any) => {
    setSelected(item);
    onConversationActiveChange?.(true);
  };

  const handleBackFromConversation = () => {
    setSelected(null);
    onConversationActiveChange?.(false);
  };

  if (selected) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={() => handleBackFromConversation()}><Text style={{ color: '#1976d2' }}>Back</Text></TouchableOpacity>
          <Text style={styles.chatTitle}>{selected.name}</Text>
          <View style={{ width: 48 }} />
        </View>
        <FlatList
          data={SAMPLE_MESSAGES}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={{ color: item.fromMe ? '#fff' : '#000' }}>{item.text}</Text>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput placeholder="Write a message..." style={styles.input} />
          <TouchableOpacity style={styles.sendBtn}><Text style={{ color: '#fff' }}>Send</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.convRow} onPress={() => handleSelectConversation(item)}>
            <Image source={item.avatar} style={styles.convAvatar} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.convName}>{item.name}</Text>
                <Text style={styles.convTime}>{item.time}</Text>
              </View>
              <Text style={styles.convLast}>{item.last}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  convRow: { flexDirection: 'row', padding: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  convAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  convName: { fontWeight: '700' },
  convTime: { color: '#888', fontSize: 12 },
  convLast: { color: '#666', marginTop: 4 },
  chatHeader: { height: 64, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee' },
  chatTitle: { fontWeight: '700' },
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 12, marginBottom: 8 },
  bubbleMe: { backgroundColor: '#1976d2', alignSelf: 'flex-end' },
  bubbleThem: { backgroundColor: '#f0f0f0', alignSelf: 'flex-start' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
  sendBtn: { backgroundColor: '#1976d2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, marginLeft: 8 }
});

export default Messenger;
