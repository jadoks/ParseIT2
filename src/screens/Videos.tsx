import React, { useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface VideoItem {
  id: number;
  title: string;
  description: string;
  url: string;
  image: any;
}

const Videos = () => {
  const initial: VideoItem[] = [
    { id: 1, title: 'Intro to Flip IT!', description: 'Gameplay walkthrough', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', image: require('../../assets/images/flipit.png') },
    { id: 2, title: 'FruitMania Tips', description: 'Solve puzzles faster', url: 'https://www.youtube.com/embed/3JZ_D3ELwOQ', image: require('../../assets/images/fruitmania.png') },
    { id: 3, title: 'Quiz Masters Promo', description: 'Try a sample quiz', url: 'https://www.youtube.com/embed/V-_O7nl0Ii0', image: require('../../assets/images/quizmasters.png') },
  ];

  const [videos] = useState<VideoItem[]>(initial);
  const [saved, setSaved] = useState<number[]>([]);
  const [comments, setComments] = useState<Record<number, string[]>>({});
  const [filterFav, setFilterFav] = useState(false);
  const [inputText, setInputText] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);

  const toggleSave = (id: number) => {
    setSaved((s) => (s.includes(id) ? s.filter((i) => i !== id) : [...s, id]));
  };

  const addComment = (id: number) => {
    const text = inputText[id]?.trim();
    if (!text) return;
    setComments((c) => ({ ...c, [id]: [...(c[id] || []), text] }));
    setInputText((it) => ({ ...it, [id]: '' }));
  };

  const list = filterFav ? videos.filter((v) => saved.includes(v.id)) : videos;

  // compute selected video outside JSX to avoid IIFE-in-JSX type issues
  const selectedVid = selected !== null ? videos.find((x) => x.id === selected) ?? null : null;
  const commentCount = selectedVid ? (comments[selectedVid.id] || []).length : 0;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Videos</Text>
        <TouchableOpacity style={styles.favBtn} onPress={() => setFilterFav((f) => !f)}>
          <Text style={styles.favBtnText}>{filterFav ? 'All Videos' : 'My Favorite'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {list.map((v) => (
          <TouchableOpacity key={v.id} style={styles.card} onPress={() => setSelected(v.id)} activeOpacity={0.9}>
            <View style={styles.thumb}>
              <Image source={v.image} style={styles.thumbImage} />
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.title}>{v.title}</Text>
              <Text style={styles.desc}>{v.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {selectedVid && (
        <View style={styles.overlay}>
          <View style={styles.detail}>
            <View style={styles.detailThumb}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={selectedVid.url}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                  title={selectedVid.title}
                />
              ) : (
                <WebView source={{ uri: selectedVid.url }} style={{ width: '100%', height: '100%' }} />
              )}
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn}>
              <Text style={{ fontSize: 18 }}>✕</Text>
            </TouchableOpacity>

            <ScrollView style={styles.detailBodyScroll} nestedScrollEnabled contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <View style={styles.detailBody}>
                <View style={styles.detailHeaderRow}>
                  <Text style={[styles.title, { fontSize: 20, fontWeight: '800' }]}>{selectedVid.title}</Text>
                </View>

                <Text style={[styles.desc, { fontSize: 15, marginTop: 12 }]}>{selectedVid.description}</Text>

                <View style={styles.detailActionsRow}>
                  <TouchableOpacity onPress={() => toggleSave(selectedVid.id)} style={styles.saveBtnLarge}>
                    <Text style={{ color: saved.includes(selectedVid.id) ? '#D32F2F' : '#000000', fontSize: 20 }}>{saved.includes(selectedVid.id) ? '♥ Saved' : '♡ Save'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.commentInputRow}>
                  <TextInput
                    placeholder="Leave a comment"
                    value={inputText[selectedVid.id] || ''}
                    onChangeText={(t) => setInputText((it) => ({ ...it, [selectedVid.id]: t }))}
                    style={styles.input}
                  />
                  <TouchableOpacity onPress={() => addComment(selectedVid.id)} style={styles.commentBtn}>
                    <Text style={styles.commentBtnText}>Comment</Text>
                  </TouchableOpacity>
                </View>

                {/* Comments moved below video details inside the scrollable detail body */}
                <View style={styles.commentsContainer}>
                  <Text style={styles.commentsLabel}>Comments</Text>
                  <ScrollView
                    style={styles.comments}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {(comments[selectedVid.id] || []).map((c, idx) => (
                      <Text key={idx} style={styles.commentItem}>• {c}</Text>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  pageTitle:  { fontSize: 25, fontWeight: 'bold'},
  favBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#EDEDED', borderRadius: 8 },
  favBtnText: { fontWeight: '600' },
  list: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  card: { backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, elevation: 2, width: '31%', minWidth: 180, margin: 6 },
  thumb: { height: 240, backgroundColor: '#DDD', justifyContent: 'center', alignItems: 'center' },
  thumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbText: { fontWeight: '700' },
  cardBody: { padding: 12 },
  title: { fontSize: 16, fontWeight: '700' },
  desc: { color: '#555', marginVertical: 6 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  saveBtn: { padding: 8 },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  detail: { bottom: -250, width: '95%', maxHeight: '280%', backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', position: 'relative', shadowColor: '#000', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 5 }, shadowRadius: 15, elevation: 10 },
  detailThumb: { height: 550, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#F0F0F0' },
  detailThumbImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  detailBodyScroll: { flex: 1 },
  detailBody: { padding: 15, paddingBottom: 32 },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 40, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20, padding: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4 },
  saveBtnLarge: { paddingVertical: 12, paddingHorizontal: 10, backgroundColor: '#F5F5F5', borderRadius: 8, marginBottom: 16 },
  detailActionsRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' },

  /* comments */
  commentsContainer: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', marginTop: 12, backgroundColor: '#FFF' },
  commentsLabel: { fontWeight: '700', marginBottom: 8, color: '#333' },
  comments: { marginTop: 8, maxHeight: 280, flexGrow: 0 },
  commentsScroll: { maxHeight: 180 },
  commentsScrollTall: { maxHeight: 300 },
  commentItem: { color: '#333', marginBottom: 8 },
  noComments: { color: '#888', fontStyle: 'italic' },

  commentInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#EEE', padding: 8, borderRadius: 8, marginRight: 8 },
  commentBtn: { backgroundColor: '#D32F2F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  commentBtnText: { color: '#FFF', fontWeight: '600' },
});

export default Videos;
