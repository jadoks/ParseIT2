import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import YoutubePlayer from "react-native-youtube-iframe";

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
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher' | 'admin' | string;
  content: string;
  createdAt: string;
  updatedAt?: string;
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
  const isMobile = width < 768;

  const playerHeight = isLargeScreen ? 500 : isTablet ? 350 : width * 0.5625;

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

  const [videoComments, setVideoComments] = useState<VideoComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRefs = useRef<{ [key: string]: any }>({});

  const [inputText, setInputText] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [filterFav, setFilterFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeQuery, setActiveQuery] = useState(DEFAULT_TECH_QUERY);
  
  const [playbackError, setPlaybackError] = useState(false);
  
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
      if (!response.ok) throw new Error(data?.error || 'Failed to load favorites.');
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
      if (trimmed) url.searchParams.set('q', trimmed);
      url.searchParams.set('maxResults', '12');

      const response = await apiFetch(url.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load videos.');

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

  const fetchComments = async (videoId: string) => {
    if (!videoId) return;
    try {
      setCommentsLoading(true);
      const response = await apiFetch(`${apiBaseUrl}/video-comments/${videoId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load comments.');
      setVideoComments(Array.isArray(data?.data) ? data.data : []);
    } catch (err: any) {
      
      setVideoComments([]);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, [currentUserId, currentUserRole]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchVideos(effectiveQuery);
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [effectiveQuery, queryRotationKey]);

  const list = useMemo(() => {
    return filterFav ? favoriteItems : videos;
  }, [filterFav, favoriteItems, videos]);

  const selectedVid = selected !== null ? videos.find((x) => x.id === selected) ?? null : null;

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
    setSaved((prev) => (wasSaved ? prev.filter((item) => item !== videoId) : [...prev, videoId]));
    setFavoriteItems((prev) =>
      wasSaved ? prev.filter((item) => item.id !== videoId) : [video, ...prev.filter((item) => item.id !== videoId)]
    );

    try {
      const response = await apiFetch(`${apiBaseUrl}/video-favorites/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId.trim(), role: currentUserRole, video }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update favorite.');

      if (data?.saved === false) {
        setSaved((prev) => prev.filter((item) => item !== videoId));
        setFavoriteItems((prev) => prev.filter((item) => item.id !== videoId));
      } else if (data?.saved === true) {
        const savedVideo = data?.data || video;
        setSaved((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
        setFavoriteItems((prev) => [savedVideo, ...prev.filter((item) => item.id !== videoId)]);
      }
    } catch (err: any) {
      setSaved((prev) => (wasSaved ? [...prev, videoId] : prev.filter((item) => item !== videoId)));
      setFavoriteItems((prev) =>
        wasSaved ? [video, ...prev.filter((item) => item.id !== videoId)] : prev.filter((item) => item.id !== videoId)
      );
      setError(err?.message || 'Failed to update favorite.');
    } finally {
      setSavingVideoId(null);
    }
  };

  const postComment = async (videoId: string) => {
    const text = inputText[videoId]?.trim();
    if (!text || postingComment) return;
    try {
      setPostingComment(true);
      const response = await apiFetch(`${apiBaseUrl}/video-comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, content: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to post comment.');
      setInputText((prev) => ({ ...prev, [videoId]: '' }));
      await fetchComments(videoId);
    } catch (err: any) {
      setError(err?.message || 'Failed to post comment.');
    } finally {
      setPostingComment(false);
    }
  };

  const saveEditComment = async (commentId: string, videoId: string) => {
    const text = editText.trim();
    if (!text || savingEdit) return;
    try {
      setSavingEdit(true);
      const response = await apiFetch(`${apiBaseUrl}/video-comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update comment.');
      setEditingCommentId(null);
      setEditText('');
      await fetchComments(videoId);
    } catch (err: any) {
      setError(err?.message || 'Failed to update comment.');
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteComment = async (commentId: string, videoId: string) => {
    try {
      const response = await apiFetch(`${apiBaseUrl}/video-comments/${commentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete comment.');
      await fetchComments(videoId);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete comment.');
    }
  };

  const openVideo = (id: string) => {
    setSelected(id);
    setPlaybackError(false);
    setEditingCommentId(null);
    setEditText('');
    setOpenMenuCommentId(null);
    setMenuPosition(null);
    fetchComments(id);
    onVideoActiveChange?.(true);
  };

  const closeVideo = () => {
    setSelected(null);
    setPlaybackError(false);
    setVideoComments([]);
    setEditingCommentId(null);
    setEditText('');
    setOpenMenuCommentId(null);
    setMenuPosition(null);
    onVideoActiveChange?.(false);
  };

  // 👇 ROBUST CROSS-PLATFORM POSITIONING LOGIC
  const handleMenuPress = (commentId: string) => {
    if (openMenuCommentId === commentId) {
      closeMenu();
      return;
    }

    const buttonRef = buttonRefs.current[commentId];
    if (buttonRef) {
      // measureInWindow gets exact screen coordinates on iOS, Android, and Web
      buttonRef.measureInWindow((x: number, y: number, btnWidth: number, btnHeight: number) => {
        const menuWidth = 160;
        
        // Fallback if measurement fails (e.g., component not mounted yet)
        if (btnWidth === 0 || btnHeight === 0) {
          setMenuPosition({ x: width / 2 - menuWidth / 2, y: 100 });
          setOpenMenuCommentId(commentId);
          return;
        }

        const menuTop = y + btnHeight + 8; // 8px gap below button
        
        // Align right edge of menu with right edge of button
        let menuLeft = x + btnWidth - menuWidth;
        
        // Ensure it stays within screen bounds (never goes off-screen)
        if (menuLeft < 10) menuLeft = 10;
        if (menuLeft + menuWidth > width - 10) menuLeft = width - menuWidth - 10;

        setMenuPosition({ x: menuLeft, y: menuTop });
        setOpenMenuCommentId(commentId);
      });
    } else {
      // Fallback if ref is not available
      setOpenMenuCommentId(commentId);
      setMenuPosition({ x: width / 2 - 80, y: 100 });
    }
  };

  const closeMenu = () => {
    setOpenMenuCommentId(null);
    setMenuPosition(null);
  };

  if (selectedVid) {
    const currentComments = videoComments;
    const activeMenuComment = currentComments.find((c) => c.id === openMenuCommentId) || null;

    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={styles.watchPage} contentContainerStyle={styles.watchContent}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={closeVideo} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.playerCard}>
            <View style={[styles.playerWrapper, { height: playerHeight }]}>
              {Platform.OS === 'web' ? (
                <iframe
                  src={selectedVid.embedUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                  title={selectedVid.title}
                />
              ) : playbackError ? (
                <View style={[styles.errorFallback, { height: playerHeight }]}>
                  <Text style={styles.errorFallbackTitle}>Video Unavailable</Text>
                  <Text style={styles.errorFallbackText}>
                    The creator has restricted this video from playing in external apps.
                  </Text>
                  <TouchableOpacity 
                    style={styles.watchOnYoutubeBtn}
                    onPress={() => Linking.openURL(selectedVid.watchUrl)}
                  >
                    <Text style={styles.watchOnYoutubeText}>Watch on YouTube</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <YoutubePlayer
                  height={playerHeight}
                  play={true}
                  videoId={selectedVid.id}
                  onError={(e: any) => {
                    console.warn("YouTube Player Error:", e);
                    setPlaybackError(true);
                  }}
                />
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
                    <Text style={styles.channelAvatarText}>{selectedVid.channel.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.channelName}>{selectedVid.channel}</Text>
                    <Text style={styles.channelSubs}>YouTube channel</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionPill, saved.includes(selectedVid.id) && styles.actionPillActive]}
                  onPress={() => toggleSave(selectedVid)}
                >
                  <Text style={[styles.actionPillText, saved.includes(selectedVid.id) && styles.actionPillTextActive]}>
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
                onChangeText={(t) => setInputText((prev) => ({ ...prev, [selectedVid.id]: t }))}
                style={styles.commentInput}
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                onPress={() => postComment(selectedVid.id)}
                style={[styles.commentPostBtn, postingComment && styles.commentPostBtnDisabled]}
                disabled={postingComment}
              >
                <Text style={styles.commentPostBtnText}>{postingComment ? 'Posting...' : 'Post'}</Text>
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <View style={styles.commentsLoadingWrap}>
                <ActivityIndicator size="small" color="#D32F2F" />
              </View>
            ) : currentComments.length === 0 ? (
              <Text style={styles.noComments}>No comments yet.</Text>
            ) : (
              currentComments.map((comment) => {
                const isOwner = comment.userId === currentUserId;
                const canManage = isOwner || currentUserRole === 'admin';
                const isEditing = editingCommentId === comment.id;
                const wasEdited = !!comment.updatedAt && comment.updatedAt !== comment.createdAt;

                return (
                  <View key={comment.id} style={styles.commentCard}>
                    <Image
                      source={isOwner ? normalizedCurrentUserAvatar : DEFAULT_USER_AVATAR}
                      style={styles.commentAvatarImage}
                    />
                    <View style={styles.commentBody}>
                      <View style={styles.commentHeaderRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.commentUser}>{comment.userName}</Text>
                          <Text style={styles.commentDate}>
                            {comment.createdAt}{wasEdited ? ' (edited)' : ''}
                          </Text>
                        </View>
                        {canManage && (
                          // 👇 CRUCIAL: Wrapping in View with collapsable={false} for Android measurement
                          <View
                            ref={(ref) => { if (ref) buttonRefs.current[comment.id] = ref; }}
                            collapsable={false} 
                          >
                            <TouchableOpacity
                              onPress={() => handleMenuPress(comment.id)}
                              style={styles.commentMenuBtn}
                            >
                              <MaterialCommunityIcons name="dots-vertical" size={20} color="#606060" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>

                      {isEditing ? (
                        <View style={styles.editRow}>
                          <TextInput
                            value={editText}
                            onChangeText={setEditText}
                            style={styles.editInput}
                            placeholderTextColor="#888"
                            autoFocus
                            multiline
                          />
                          <View style={styles.editActionsRow}>
                            <TouchableOpacity
                              onPress={() => { setEditingCommentId(null); setEditText(''); }}
                              style={styles.editCancelBtn}
                            >
                              <Text style={styles.editCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => saveEditComment(comment.id, selectedVid.id)}
                              style={[styles.editSaveBtn, savingEdit && styles.commentPostBtnDisabled]}
                              disabled={savingEdit}
                            >
                              <Text style={styles.editSaveText}>{savingEdit ? 'Saving...' : 'Save'}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.commentText}>{comment.content}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>Up next</Text>
            {relatedVideos.map((v) => (
              <TouchableOpacity key={v.id} style={styles.relatedCard} activeOpacity={0.9} onPress={() => openVideo(v.id)}>
                <Image source={{ uri: v.thumbnail }} style={styles.relatedThumb} />
                <View style={styles.relatedInfo}>
                  <Text numberOfLines={2} style={styles.relatedTitle}>{v.title}</Text>
                  <Text style={styles.relatedChannel}>{v.channel}</Text>
                  <Text style={styles.relatedMeta}>{v.views} • {v.uploadedAt}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        {/* 👇 CROSS-PLATFORM DROPDOWN: Rendered OUTSIDE ScrollView using a transparent Modal */}
        <Modal
          transparent
          visible={!!openMenuCommentId}
          animationType="fade"
          onRequestClose={closeMenu}
          statusBarTranslucent={Platform.OS === 'android'}
        >
          <View style={styles.menuModalContainer}>
            {/* Invisible backdrop that closes menu when tapped */}
            <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
            
            {/* Actual Dropdown Menu */}
            {menuPosition && (
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    left: menuPosition.x,
                    top: menuPosition.y,
                  }
                ]}
              >
                {activeMenuComment && activeMenuComment.userId === currentUserId && (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      setEditingCommentId(activeMenuComment.id);
                      setEditText(activeMenuComment.content);
                      closeMenu();
                    }}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={18} color="#111" />
                    <Text style={styles.dropdownOptionText}>Edit</Text>
                  </TouchableOpacity>
                )}
                {activeMenuComment && (
                  <TouchableOpacity
                    style={styles.dropdownOption}
                    onPress={() => {
                      const commentId = activeMenuComment.id;
                      closeMenu();
                      deleteComment(commentId, selectedVid.id);
                    }}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#D32F2F" />
                    <Text style={[styles.dropdownOptionText, styles.dropdownOptionDangerText]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.homeContent}>
      <View style={styles.homeHeader}>
        <View style={styles.homeHeaderTextBlock}>
          <Text style={styles.logoText}>Videos</Text>
          <Text style={styles.searchSummary} numberOfLines={2}>
            {loading ? 'Loading adaptive learning videos...' : `${searchSourceLabel}: ${displayQuery}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterFav((f) => !f)}>
          <Text style={styles.filterBtnText}>{filterFav ? 'Favorites Only' : 'My Favorite'}</Text>
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
            {filterFav ? (favoritesLoading ? 'Loading favorite videos...' : 'No favorite videos saved yet.') : 'No videos found for this search.'}
          </Text>
        </View>
      ) : (
        <View style={[styles.feedGrid, { gap }]}>
          {list.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.feedCard, { width: cardWidth }]}
              activeOpacity={0.95}
              onPress={() => openVideo(v.id)}
            >
              <Image source={{ uri: v.thumbnail }} style={[styles.feedThumbnail, { height: columns === 1 ? 320 : 220 }]} />
              <View style={styles.feedInfoRow}>
                <View style={styles.feedAvatar}>
                  <Text style={styles.feedAvatarText}>{v.channel.charAt(0)}</Text>
                </View>
                <View style={styles.feedTextBlock}>
                  <Text style={styles.feedTitle} numberOfLines={2}>{v.title}</Text>
                  <Text style={styles.feedMeta}>{v.channel}</Text>
                  <Text style={styles.feedMeta}>{v.views} • {v.uploadedAt}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => toggleSave(v)}
                  style={[styles.smallSaveBtn, { paddingHorizontal: heartPaddingHorizontal, paddingVertical: heartPaddingVertical }]}
                >
                  <Text style={[styles.smallSaveBtnText, { fontSize: heartSize }]}>{saved.includes(v.id) ? '♥' : '♡'}</Text>
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
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  homeContent: { paddingBottom: 24 },
  homeHeader: { paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', gap: 12 },
  homeHeaderTextBlock: { flex: 1 },
  logoText: { marginTop: -10, marginLeft: -12, fontSize: 30, fontWeight: 'bold', paddingBottom: 10, textAlign: 'left', marginBottom: 6 },
  searchSummary: { marginLeft: -12, color: '#606060', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  filterBtn: { backgroundColor: '#f2f2f2', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18 },
  filterBtnText: { fontWeight: '600', color: '#111', fontSize: 13 },
  stateWrap: { paddingVertical: 48, alignItems: 'center', justifyContent: 'center' },
  stateText: { marginTop: 12, color: '#606060', fontSize: 15 },
  errorText: { color: '#D32F2F', fontSize: 15, textAlign: 'center' },
  feedGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', marginTop: 18 },
  feedCard: { marginBottom: 18, backgroundColor: '#fff' },
  feedThumbnail: { width: '100%', resizeMode: 'cover', backgroundColor: '#ddd', borderRadius: 12 },
  feedInfoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingTop: 10 },
  feedAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  feedAvatarText: { color: '#fff', fontWeight: '700' },
  feedTextBlock: { flex: 1 },
  feedTitle: { fontSize: 16, fontWeight: '700', color: '#111', lineHeight: 22 },
  feedMeta: { marginTop: 2, color: '#606060', fontSize: 13 },
  smallSaveBtn: { marginLeft: 8, backgroundColor: '#e60a0a0b', borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
  smallSaveBtnText: { color: '#e60a0a' },
  watchPage: { flex: 1, backgroundColor: '#fff' },
  watchContent: { paddingBottom: 40 },
  topBar: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f2f2f2' },
  backBtnText: { fontWeight: '700', color: '#111' },
  playerCard: { backgroundColor: '#fff' },
  playerWrapper: { width: '100%', backgroundColor: '#000', overflow: 'hidden' },
  
  errorFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#111', padding: 20 },
  errorFallbackTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  errorFallbackText: { color: '#aaa', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  watchOnYoutubeBtn: { backgroundColor: '#DA1318', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  watchOnYoutubeText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  videoMetaSection: { paddingHorizontal: 14, paddingTop: 14 },
  watchTitle: { fontSize: 20, fontWeight: '800', color: '#111', lineHeight: 28 },
  watchSubMeta: { marginTop: 6, fontSize: 13, color: '#606060' },
  channelRow: { marginTop: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  channelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  channelAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  channelAvatarText: { color: '#fff', fontWeight: '700' },
  channelName: { fontSize: 15, fontWeight: '700', color: '#111' },
  channelSubs: { fontSize: 12, color: '#606060', marginTop: 2 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  actionPill: { backgroundColor: '#f2f2f2', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22 },
  actionPillActive: { backgroundColor: '#111' },
  actionPillText: { fontWeight: '600', color: '#111' },
  actionPillTextActive: { color: '#fff' },
  descriptionCard: { backgroundColor: '#f7f7f7', borderRadius: 14, padding: 12 },
  descriptionText: { color: '#222', fontSize: 14, lineHeight: 20 },
  commentsSection: { marginTop: 18, paddingHorizontal: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 12 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  commentInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, color: '#111', backgroundColor: '#fff' },
  commentPostBtn: { backgroundColor: '#DA1318', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  commentPostBtnDisabled: { opacity: 0.6 },
  commentPostBtnText: { color: '#fff', fontWeight: '700' },
  commentsLoadingWrap: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  noComments: { color: '#707070', fontStyle: 'italic', marginTop: 4 },
  commentCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  commentAvatarImage: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  commentBody: { flex: 1 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  commentMenuBtn: { padding: 4, marginLeft: 8 },
  commentUser: { fontWeight: '700', color: '#111', marginBottom: 2 },
  commentDate: { color: '#888', fontSize: 12, marginBottom: 4 },
  commentText: { color: '#222', fontSize: 14, lineHeight: 20 },
  editRow: { marginTop: 4 },
  editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, color: '#111', backgroundColor: '#fff', fontSize: 14, lineHeight: 20 },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  editCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f2f2f2' },
  editCancelText: { fontWeight: '600', color: '#111', fontSize: 13 },
  editSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#DA1318' },
  editSaveText: { fontWeight: '700', color: '#fff', fontSize: 13 },
  
  // 👇 UPDATED CROSS-PLATFORM STYLES
  menuModalContainer: {
    flex: 1,
    // Transparent background so we can see the content behind
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
    width: 160, // Fixed width for consistent positioning across devices
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000, // Ensure it's above the backdrop
    borderWidth: Platform.OS === 'web' ? 1 : 0, // Border for web visibility
    borderColor: '#e5e5e5',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOptionText: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#111',
    flex: 1,
  },
  dropdownOptionDangerText: { 
    color: '#D32F2F',
  },
  
  relatedSection: { marginTop: 20, paddingHorizontal: 14 },
  relatedCard: { flexDirection: 'row', marginBottom: 14 },
  relatedThumb: { width: 180, height: 100, borderRadius: 10, backgroundColor: '#ddd', marginRight: 12 },
  relatedInfo: { flex: 1, justifyContent: 'center' },
  relatedTitle: { fontSize: 15, fontWeight: '700', color: '#111', lineHeight: 21 },
  relatedChannel: { marginTop: 6, color: '#606060', fontSize: 13 },
  relatedMeta: { marginTop: 4, color: '#606060', fontSize: 12 },
});

export default Videos;