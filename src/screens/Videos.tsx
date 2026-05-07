import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

interface VideoItem {
  id: string;
  title: string;
  description: string;
  embedUrl: string;
  watchUrl: string;
  channel: string;
  views: string;
  uploadedAt: string;
  publishedAt?: string | null;
  thumbnail: string;
}

interface VideoComment {
  userName: string;
  avatar: any;
  message: string;
  commentedAt: string;
}

interface VideosProps {
  onVideoActiveChange?: (isActive: boolean) => void;
  currentUserName?: string;
  currentUserAvatar?: any;
  currentUserId: string;
  currentUserRole?: 'student' | 'teacher' | 'admin';
  apiBaseUrl: string;
  searchQuery?: string;
  adaptiveQuery?: string;
  adaptiveReason?: string;
  queryRotationKey?: number;
}

const DEFAULT_USER_AVATAR = require('../../assets/images/pogi.jpg');
const DEFAULT_TECH_QUERY = 'educational video lesson explanation';

const normalizeImageSource = (img: any) => {
  if (!img) return DEFAULT_USER_AVATAR;
  if (typeof img === 'number') return img;
  if (img?.uri) return { uri: img.uri };
  return DEFAULT_USER_AVATAR;
};

const Videos = ({
  onVideoActiveChange,
  currentUserName = 'Student',
  currentUserAvatar = DEFAULT_USER_AVATAR,
  currentUserId,
  currentUserRole = 'student',
  apiBaseUrl,
  searchQuery = '',
  adaptiveQuery = '',
  adaptiveReason = '',
  queryRotationKey = 0,
}: VideosProps) => {
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

  const heartSize = isLargeScreen ? 24 : isTablet ? 24 : 20;
  const heartPaddingHorizontal = isLargeScreen ? 14 : isTablet ? 14 : 18;
  const heartPaddingVertical = isLargeScreen ? 8 : isTablet ? 8 : 8;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<VideoItem[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [savingVideoId, setSavingVideoId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, VideoComment[]>>({});
  const [inputText, setInputText] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [filterFav, setFilterFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeQuery, setActiveQuery] = useState(DEFAULT_TECH_QUERY);
  const debounceRef = useRef<any>(null);

  const normalizedCurrentUserAvatar = useMemo(
    () => normalizeImageSource(currentUserAvatar),
    [currentUserAvatar]
  );

  const effectiveQuery = useMemo(() => {
    return searchQuery.trim() || adaptiveQuery.trim() || DEFAULT_TECH_QUERY;
  }, [searchQuery, adaptiveQuery]);

  const displayQuery = useMemo(() => {
    const source = searchQuery.trim() || adaptiveQuery.trim() || DEFAULT_TECH_QUERY;

    const cleaned = source
      .replace(/educational video lesson explanation/gi, '')
      .replace(/educational video/gi, '')
      .replace(/lesson explanation/gi, '')
      .replace(/tutorial lesson explanation/gi, '')
      .replace(/tutorial/gi, '')
      .replace(/explained for students/gi, '')
      .replace(/for students/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned.length > 58 ? `${cleaned.slice(0, 58)}...` : cleaned;
  }, [searchQuery, adaptiveQuery]);

  const searchSourceLabel = useMemo(() => {
    if (searchQuery.trim()) return 'Search results';
    if (adaptiveReason.trim()) return adaptiveReason.trim();
    return 'Recommended videos for your courses';
  }, [searchQuery, adaptiveReason]);


  const loadFavorites = async () => {
    if (!currentUserId?.trim()) return;

    try {
      setFavoritesLoading(true);

      const url = new URL(`${apiBaseUrl}/video-favorites`);
      url.searchParams.set('userId', currentUserId.trim());
      url.searchParams.set('role', currentUserRole);

      const response = await apiFetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load favorites.');
      }

      const items = Array.isArray(data?.data) ? data.data : [];
      setFavoriteItems(items);
      setSaved(items.map((item: VideoItem) => item.id));
    } catch (err: any) {
      console.log('LOAD VIDEO FAVORITES ERROR =>', err);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const fetchVideos = async (query: string) => {
    try {
      setLoading(true);
      setError('');

      const trimmed = query.trim();
      const url = new URL(`${apiBaseUrl}/youtube/videos`);
      if (trimmed) {
        url.searchParams.set('q', trimmed);
      }
      url.searchParams.set('maxResults', '12');

      const response = await apiFetch(url.toString());
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load videos.');
      }

      const items = Array.isArray(data?.data) ? data.data : [];
      setVideos(items);
      setActiveQuery(data?.query || trimmed || DEFAULT_TECH_QUERY);

      if (items.length === 0) {
        setSelected(null);
      } else if (selected && !items.some((item: VideoItem) => item.id === selected)) {
        setSelected(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load videos.');
      setVideos([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchVideos(effectiveQuery);
    }, 450);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [effectiveQuery, queryRotationKey]);

  const list = useMemo(() => {
    return filterFav ? favoriteItems : videos;
  }, [filterFav, favoriteItems, videos]);

  const selectedVid =
    selected !== null ? videos.find((x) => x.id === selected) ?? null : null;

  const relatedVideos = useMemo(() => {
    const sourceList = filterFav ? favoriteItems : videos;
    if (!selectedVid) return sourceList;
    return sourceList.filter((v) => v.id !== selectedVid.id);
  }, [selectedVid, filterFav, favoriteItems, videos]);

  const toggleSave = async (video: VideoItem) => {
    if (!currentUserId?.trim() || savingVideoId) return;

    const videoId = video.id;
    const wasSaved = saved.includes(videoId);

    setSavingVideoId(videoId);
    setSaved((prev) =>
      wasSaved ? prev.filter((item) => item !== videoId) : [...prev, videoId]
    );
    setFavoriteItems((prev) =>
      wasSaved
        ? prev.filter((item) => item.id !== videoId)
        : [video, ...prev.filter((item) => item.id !== videoId)]
    );

    try {
      const response = await apiFetch(`${apiBaseUrl}/video-favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId.trim(),
          role: currentUserRole,
          video,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update favorite.');
      }

      if (data?.saved === false) {
        setSaved((prev) => prev.filter((item) => item !== videoId));
        setFavoriteItems((prev) => prev.filter((item) => item.id !== videoId));
      } else if (data?.saved === true) {
        const savedVideo = data?.data || video;
        setSaved((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
        setFavoriteItems((prev) => [savedVideo, ...prev.filter((item) => item.id !== videoId)]);
      }
    } catch (err: any) {
      setSaved((prev) =>
        wasSaved ? [...prev, videoId] : prev.filter((item) => item !== videoId)
      );
      setFavoriteItems((prev) =>
        wasSaved
          ? [video, ...prev.filter((item) => item.id !== videoId)]
          : prev.filter((item) => item.id !== videoId)
      );
      setError(err?.message || 'Failed to update favorite.');
    } finally {
      setSavingVideoId(null);
    }
  };

  const addComment = (id: string) => {
    const text = inputText[id]?.trim();
    if (!text) return;

    const newComment: VideoComment = {
      userName: currentUserName,
      avatar: normalizedCurrentUserAvatar,
      message: text,
      commentedAt: new Date().toLocaleString(),
    };

    setComments((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), newComment],
    }));

    setInputText((prev) => ({
      ...prev,
      [id]: '',
    }));
  };

  const openVideo = (id: string) => {
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
                src={selectedVid.embedUrl}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                title={selectedVid.title}
              />
            ) : (
              <WebView source={{ uri: selectedVid.embedUrl }} style={{ flex: 1 }} />
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
                  <Text style={styles.channelSubs}>YouTube channel</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.actionPill,
                  saved.includes(selectedVid.id) && styles.actionPillActive,
                ]}
                onPress={() => toggleSave(selectedVid)}
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
              <Text style={styles.descriptionText}>{selectedVid.description || 'No description available.'}</Text>
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
                <Image
                  source={normalizeImageSource(comment.avatar)}
                  style={styles.commentAvatarImage}
                />
                <View style={styles.commentBody}>
                  <Text style={styles.commentUser}>{comment.userName}</Text>
                  <Text style={styles.commentDate}>{comment.commentedAt}</Text>
                  <Text style={styles.commentText}>{comment.message}</Text>
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
              <Image source={{ uri: v.thumbnail }} style={styles.relatedThumb} />
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
        <View style={styles.homeHeaderTextBlock}>
          <Text style={styles.logoText}>Videos</Text>
          <Text style={styles.searchSummary} numberOfLines={2}>
            {loading
              ? 'Loading adaptive learning videos...'
              : `${searchSourceLabel}: ${displayQuery}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterFav((f) => !f)}
        >
          <Text style={styles.filterBtnText}>
            {filterFav ? 'Favorites Only' : 'My Favorite'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text style={styles.stateText}>Loading videos...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.stateWrap}>
          <Text style={styles.stateText}>
            {filterFav
              ? favoritesLoading
                ? 'Loading favorite videos...'
                : 'No favorite videos saved yet.'
              : 'No videos found for this search.'}
          </Text>
        </View>
      ) : (
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
                source={{ uri: v.thumbnail }}
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
                  onPress={() => toggleSave(v)}
                  style={[
                    styles.smallSaveBtn,
                    {
                      paddingHorizontal: heartPaddingHorizontal,
                      paddingVertical: heartPaddingVertical,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.smallSaveBtnText,
                      {
                        fontSize: heartSize,
                      },
                    ]}
                  >
                    {saved.includes(v.id) ? '♥' : '♡'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    gap: 12,
  },

  homeHeaderTextBlock: {
    flex: 1,
  },

  logoText: {
    marginTop: -10,
    marginLeft: -12,
    fontSize: 30,
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    marginBottom: 6,
  },

  searchSummary: {
    marginLeft: -12,
    color: '#606060',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
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

  stateWrap: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stateText: {
    marginTop: 12,
    color: '#606060',
    fontSize: 15,
  },

  errorText: {
    color: '#D32F2F',
    fontSize: 15,
    textAlign: 'center',
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
    marginLeft: 8,
    backgroundColor: '#e60a0a0b',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },

  smallSaveBtnText: {
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

  commentAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },

  commentBody: {
    flex: 1,
  },

  commentUser: {
    fontWeight: '700',
    color: '#111',
    marginBottom: 2,
  },

  commentDate: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },

  commentText: {
    color: '#222',
    fontSize: 14,
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
    width: 180,
    height: 100,
    borderRadius: 10,
    backgroundColor: '#ddd',
    marginRight: 12,
  },

  relatedInfo: {
    flex: 1,
    justifyContent: 'center',
  },

  relatedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111',
    lineHeight: 21,
  },

  relatedChannel: {
    marginTop: 6,
    color: '#606060',
    fontSize: 13,
  },

  relatedMeta: {
    marginTop: 4,
    color: '#606060',
    fontSize: 12,
  },
});

export default Videos;