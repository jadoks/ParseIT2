import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface VideoItem {
  id: number;
  title: string;
  description: string;
  url: string;
  channel: string;
  views: string;
  uploadedAt: string;
}

const getYoutubeThumbnail = (url: string) => {
  const id = url.split('/embed/')[1];
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
};

const Videos = ({
  onVideoActiveChange,
}: {
  onVideoActiveChange?: (isActive: boolean) => void;
}) => {
  const { width } = useWindowDimensions();

  const isLargeScreen = width >= 1200;
  const isTablet = width >= 768 && width < 1200;

  const columns = isLargeScreen ? 3 : isTablet ? 2 : 1;
  const gap = 18;
  const horizontalPadding = 20;
  const cardWidth =
    columns === 1
      ? '100%'
      : (width - horizontalPadding * 2 - gap * (columns - 1)) / columns - 120;

  const initial: VideoItem[] = [
    {
      id: 1,
      title: 'Intro to Flip IT!',
      description:
        'Gameplay walkthrough for Flip IT! Learn the mechanics, strategies, and flow of the game.',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      channel: 'Flip IT Official',
      views: '24K views',
      uploadedAt: '2 weeks ago',
    },
    {
      id: 2,
      title: 'FruitMania Tips',
      description: 'Solve puzzles faster with these FruitMania tips and tricks.',
      url: 'https://www.youtube.com/embed/3JZ_D3ELwOQ',
      channel: 'FruitMania Play',
      views: '18K views',
      uploadedAt: '5 days ago',
    },
    {
      id: 3,
      title: 'Quiz Masters Promo',
      description: 'Try a sample quiz and discover how Quiz Masters works.',
      url: 'https://www.youtube.com/embed/V-_O7nl0Ii0',
      channel: 'Quiz Masters',
      views: '41K views',
      uploadedAt: '1 month ago',
    },
  ];

  const [videos] = useState<VideoItem[]>(initial);
  const [saved, setSaved] = useState<number[]>([]);
  const [liked, setLiked] = useState<number[]>([]);
  const [comments, setComments] = useState<Record<number, string[]>>({});
  const [inputText, setInputText] = useState<Record<number, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [filterFav, setFilterFav] = useState(false);

  const list = useMemo(() => {
    return filterFav ? videos.filter((v) => saved.includes(v.id)) : videos;
  }, [filterFav, saved, videos]);

  const selectedVid =
    selected !== null ? videos.find((x) => x.id === selected) ?? null : null;

  const relatedVideos = useMemo(() => {
    if (!selectedVid) return list;
    return videos.filter((v) => v.id !== selectedVid.id);
  }, [selectedVid, videos, list]);

  const toggleSave = (id: number) => {
    setSaved((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleLike = (id: number) => {
    setLiked((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const addComment = (id: number) => {
    const text = inputText[id]?.trim();
    if (!text) return;

    setComments((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), text],
    }));

    setInputText((prev) => ({
      ...prev,
      [id]: '',
    }));
  };

  const openVideo = (id: number) => {
    setSelected(id);
    onVideoActiveChange?.(true);
  };

  const closeVideo = () => {
    setSelected(null);
    onVideoActiveChange?.(false);
  };

  if (selectedVid) {
    const currentComments = comments[selectedVid.id] || [];

    return (
      <ScrollView style={styles.watchPage} contentContainerStyle={styles.watchContent}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={closeVideo} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.playerCard}>
          <View style={styles.playerWrapper}>
            {Platform.OS === 'web' ? (
              <iframe
                src={selectedVid.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title={selectedVid.title}
              />
            ) : (
              <WebView source={{ uri: selectedVid.url }} style={{ flex: 1 }} />
            )}
          </View>

          <View style={styles.videoMetaSection}>
            <Text style={styles.watchTitle}>{selectedVid.title}</Text>
            <Text style={styles.watchSubMeta}>
              {selectedVid.views} • {selectedVid.uploadedAt}
            </Text>

            <View style={styles.channelRow}>
              <View style={styles.channelLeft}>
                <View style={styles.channelAvatar}>
                  <Text style={styles.channelAvatarText}>
                    {selectedVid.channel.charAt(0)}
                  </Text>
                </View>
                <View>
                  <Text style={styles.channelName}>{selectedVid.channel}</Text>
                  <Text style={styles.channelSubs}>12.4K subscribers</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionPill,
                  saved.includes(selectedVid.id) && styles.actionPillActive,
                ]}
                onPress={() => toggleSave(selectedVid.id)}
              >
                <Text
                  style={[
                    styles.actionPillText,
                    saved.includes(selectedVid.id) && styles.actionPillTextActive,
                  ]}
                >
                  📁 {saved.includes(selectedVid.id) ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{selectedVid.description}</Text>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <Text style={styles.sectionTitle}>Comments ({currentComments.length})</Text>

          <View style={styles.commentComposer}>
            <TextInput
              placeholder="Add a comment..."
              value={inputText[selectedVid.id] || ''}
              onChangeText={(t) =>
                setInputText((prev) => ({ ...prev, [selectedVid.id]: t }))
              }
              style={styles.commentInput}
              placeholderTextColor="#888"
            />
            <TouchableOpacity
              onPress={() => addComment(selectedVid.id)}
              style={styles.commentPostBtn}
            >
              <Text style={styles.commentPostBtnText}>Post</Text>
            </TouchableOpacity>
          </View>

          {currentComments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet.</Text>
          ) : (
            currentComments.map((comment, idx) => (
              <View key={idx} style={styles.commentCard}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>U</Text>
                </View>
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>User</Text>
                  <Text style={styles.commentText}>{comment}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.relatedSection}>
          <Text style={styles.sectionTitle}>Up next</Text>

          {relatedVideos.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.relatedCard}
              activeOpacity={0.9}
              onPress={() => openVideo(v.id)}
            >
              <Image
                source={{ uri: getYoutubeThumbnail(v.url) }}
                style={styles.relatedThumb}
              />
              <View style={styles.relatedInfo}>
                <Text numberOfLines={2} style={styles.relatedTitle}>
                  {v.title}
                </Text>
                <Text style={styles.relatedChannel}>{v.channel}</Text>
                <Text style={styles.relatedMeta}>
                  {v.views} • {v.uploadedAt}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.homeContent}>
      <View style={styles.homeHeader}>
        <Text style={styles.logoText}>Videos</Text>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterFav((f) => !f)}
        >
          <Text style={styles.filterBtnText}>
            {filterFav ? 'Favorites Only' : 'My Favorite'}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.feedGrid,
          {
            gap,
          },
        ]}
      >
        {list.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[
              styles.feedCard,
              {
                width: cardWidth,
              },
            ]}
            activeOpacity={0.95}
            onPress={() => openVideo(v.id)}
          >
            <Image
              source={{ uri: getYoutubeThumbnail(v.url) }}
              style={[
                styles.feedThumbnail,
                {
                  height: columns === 1 ? 320 : 220,
                },
              ]}
            />

            <View style={styles.feedInfoRow}>
              <View style={styles.feedAvatar}>
                <Text style={styles.feedAvatarText}>{v.channel.charAt(0)}</Text>
              </View>

              <View style={styles.feedTextBlock}>
                <Text style={styles.feedTitle} numberOfLines={2}>
                  {v.title}
                </Text>
                <Text style={styles.feedMeta}>{v.channel}</Text>
                <Text style={styles.feedMeta}>
                  {v.views} • {v.uploadedAt}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => toggleSave(v.id)}
                style={styles.smallSaveBtn}
              >
                <Text style={styles.smallSaveBtnText}>
                  {saved.includes(v.id) ? '♥' : '♡'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },

  homeContent: {
    paddingBottom: 24,
  },

  homeHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  logoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#000000',
  },

  filterBtn: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },

  filterBtnText: {
    fontWeight: '600',
    color: '#111',
    fontSize: 13,
  },

  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 18,
  },

  feedCard: {
    marginBottom: 18,
    backgroundColor: '#fff',
  },

  feedThumbnail: {
    width: '100%',
    resizeMode: 'cover',
    backgroundColor: '#ddd',
    borderRadius: 12,
  },

  feedInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 10,
  },

  feedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  feedAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },

  feedTextBlock: {
    flex: 1,
  },

  feedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    lineHeight: 22,
  },

  feedMeta: {
    marginTop: 2,
    color: '#606060',
    fontSize: 13,
  },

  smallSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 8,
    backgroundColor: '#e60a0a0b',
    borderRadius: 50,
  },

  smallSaveBtnText: {
    fontSize: 18,
    color: '#e60a0a',
  },

  watchPage: {
    flex: 1,
    backgroundColor: '#fff',
  },

  watchContent: {
    paddingBottom: 40,
  },

  topBar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },

  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#f2f2f2',
  },

  backBtnText: {
    fontWeight: '700',
    color: '#111',
  },

  playerCard: {
    backgroundColor: '#fff',
  },

  playerWrapper: {
    width: '100%',
    height: 500,
    backgroundColor: '#000',
  },

  videoMetaSection: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },

  watchTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    lineHeight: 28,
  },

  watchSubMeta: {
    marginTop: 6,
    fontSize: 13,
    color: '#606060',
  },

  channelRow: {
    marginTop: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  channelAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  channelAvatarText: {
    color: '#fff',
    fontWeight: '700',
  },

  channelName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
  },

  channelSubs: {
    fontSize: 12,
    color: '#606060',
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  actionPill: {
    backgroundColor: '#f2f2f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
  },

  actionPillActive: {
    backgroundColor: '#111',
  },

  actionPillText: {
    fontWeight: '600',
    color: '#111',
  },

  actionPillTextActive: {
    color: '#fff',
  },

  descriptionCard: {
    backgroundColor: '#f7f7f7',
    borderRadius: 14,
    padding: 12,
  },

  descriptionText: {
    color: '#222',
    fontSize: 14,
    lineHeight: 20,
  },

  commentsSection: {
    marginTop: 18,
    paddingHorizontal: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 12,
  },

  commentComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    color: '#111',
    backgroundColor: '#fff',
  },

  commentPostBtn: {
    backgroundColor: '#DA1318',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },

  commentPostBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  noComments: {
    color: '#707070',
    fontStyle: 'italic',
    marginTop: 4,
  },

  commentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },

  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },

  commentAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },

  commentBody: {
    flex: 1,
  },

  commentUser: {
    fontWeight: '700',
    color: '#111',
    marginBottom: 3,
  },

  commentText: {
    color: '#222',
    lineHeight: 20,
  },

  relatedSection: {
    marginTop: 20,
    paddingHorizontal: 14,
  },

  relatedCard: {
    flexDirection: 'row',
    marginBottom: 14,
  },

  relatedThumb: {
    width: 160,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#ddd',
    marginRight: 10,
  },

  relatedInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },

  relatedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    lineHeight: 20,
  },

  relatedChannel: {
    marginTop: 6,
    fontSize: 12,
    color: '#606060',
  },

  relatedMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#606060',
  },
});

export default Videos;