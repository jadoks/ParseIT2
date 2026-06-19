import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  Clipboard,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  UIManager,
  useWindowDimensions,
  View
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const DEFAULT_AVATAR = require('../../assets/images/default_profile.png');

function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = possibleHost.split(':')[0];
  if (host) {
    return `http://${host}:5000`;
  }
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();
const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

type MessengerCourse = {
  id: string;
  name: string;
  instructor: string;
  semester: string;
  schoolYear: string;
  section?: string;
};

type Conversation = {
  id: string;
  name: string;
  last: string;
  avatar: any;
  time: string;
  unreadCount: number;
  isRoom?: boolean;
  isCreatedRoom?: boolean;
  members?: string[];
  memberDetails?: { name: string; studentId?: string }[];
  admin?: string;
  classId?: string;
  section?: string;
  lastMessageAt?: any;
  updatedAt?: any;
  createdAt?: any;
};

type Message = {
  id: string;
  fromMe: boolean;
  sender: string;
  text: string;
  createdAt?: number | null;
  type?: 'system' | 'text' | 'file';
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  storagePath?: string;
};

// ---------------------------------------------------------------------------
// Stable helpers
// ---------------------------------------------------------------------------
const toMillis = (value: any): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value > 0 ? value : 0;
  if (typeof value?.toDate === 'function') {
    const parsed = value.toDate().getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value?._seconds === 'number') return value._seconds * 1000;
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatConversationTime = (timestamp?: any) => {
  const time = toMillis(timestamp);
  if (!time) return '';
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diff < 0)
    return new Date(time).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  if (diff < minute) return 'Now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < week) return `${Math.floor(diff / day)}d ago`;
  return new Date(time).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

const formatTooltipTime = (timestamp?: any) => {
  const time = toMillis(timestamp);
  if (!time) return '';
  return new Date(time).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const isSystemMessage = (item: any) => {
  return (
    item?.type === 'system' ||
    item?.senderRole === 'system' ||
    item?.isSystem === true ||
    (!item?.senderName &&
      typeof item?.text === 'string' &&
      item.text.toLowerCase().includes('conversation created'))
  );
};

const resolveSenderName = (item: any) => {
  if (isSystemMessage(item)) return 'System';
  if (item?.senderName && String(item.senderName).trim())
    return String(item.senderName).trim();
  if (item?.displayName && String(item.displayName).trim())
    return String(item.displayName).trim();
  return 'User';
};

const resolveCreatedAt = (item: any) => {
  return (
    toMillis(item?.createdAt) ||
    toMillis(item?.lastMessageAt) ||
    toMillis(item?.updatedAt) ||
    toMillis(item?.timestamp) ||
    toMillis(item?.sentAt) ||
    null
  );
};

const getShortCourseName = (value?: string) => {
  const raw = String(value || '').trim();
  if (!raw) return 'Conversation';
  return raw.split(' - ')[0].trim() || raw;
};

const formatConversationName = (item: any) => {
  const shortName = getShortCourseName(item.className || item.name);
  const section = String(item.section || '').trim();
  const subjectWithSection = section
    ? `${shortName} (${section})`
    : shortName;
  if (item.semester && item.schoolYear)
    return `${subjectWithSection} - ${item.semester} (${item.schoolYear})`;
  if (item.semester) return `${subjectWithSection} - ${item.semester}`;
  if (item.schoolYear) return `${subjectWithSection} (${item.schoolYear})`;
  return subjectWithSection;
};

const getFileIcon = (fileType?: string) => {
  if (!fileType) return 'file-outline';
  if (fileType.startsWith('image/')) return 'file-image-outline';
  if (fileType.includes('pdf')) return 'file-pdf-box';
  if (fileType.includes('word') || fileType.includes('document'))
    return 'file-word';
  if (fileType.includes('excel') || fileType.includes('spreadsheet'))
    return 'file-excel';
  if (fileType.includes('powerpoint') || fileType.includes('presentation'))
    return 'file-powerpoint';
  if (fileType.includes('zip') || fileType.includes('compressed'))
    return 'file-zip';
  if (fileType.startsWith('text/')) return 'file-document-outline';
  return 'file-outline';
};

const messagesEqual = (a: Message[], b: Message[]): boolean => {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].text !== b[i].text ||
      a[i].createdAt !== b[i].createdAt ||
      a[i].type !== b[i].type ||
      a[i].storagePath !== b[i].storagePath ||
      a[i].fileName !== b[i].fileName
    ) {
      return false;
    }
  }

  return true;
};

const conversationChanged = (a: Conversation, b: Conversation): boolean => {
  return (
    a.name !== b.name ||
    a.last !== b.last ||
    a.unreadCount !== b.unreadCount ||
    toMillis(a.lastMessageAt) !== toMillis(b.lastMessageAt)
  );
};

// ---------------------------------------------------------------------------
const Messenger = ({
  searchQuery = '',
  onConversationActiveChange,
  onUnreadCountChanged,
  onBack,
  courses = [],
  currentUser,
  currentUserUid,
  currentUserName,
}: {
  searchQuery?: string;
  onConversationActiveChange?: (isActive: boolean) => void;
  onUnreadCountChanged?: () => void;
  onBack?: () => void;
  courses?: MessengerCourse[];
  currentUser: string;
  currentUserUid: string;
  currentUserName: string;
}) => {
  const { width, height } = useWindowDimensions();
  const flatListRef = useRef<FlatList<Message>>(null);
  const infoButtonRef = useRef<View>(null);
  const messageRefs = useRef<Record<string, View | null>>({});

  const isTinyPhone = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;
  const isSplitView = !isMobile;

  const scale = isDesktop ? 1.15 : isTablet ? 1.05 : 1;
  const messageMaxWidth: DimensionValue =
    isDesktop ? '56%' : isTablet ? '64%' : isTinyPhone ? '88%' : '80%';
  const sendWidth: DimensionValue =
    isDesktop ? 96 : isTablet ? 84 : isTinyPhone ? 54 : 72;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Message[]>>({});
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const handleCopyStudentId = (studentId: string) => {
    Clipboard.setString(studentId);
    setCopiedId(studentId);
    if (Platform.OS === 'android') {
      ToastAndroid.show('User ID copied!', ToastAndroid.SHORT);
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [checkedMembers, setCheckedMembers] = useState<string[]>([]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredMessageTime, setHoveredMessageTime] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Image Preview States
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewName, setImagePreviewName] = useState<string>('');
  const [imagePreviewStoragePath, setImagePreviewStoragePath] = useState<
    string | null
  >(null);
  const [refreshingImages, setRefreshingImages] = useState<Set<string>>(
    new Set()
  );

  // Pending File State
  const [pendingFile, setPendingFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    base64: string;
  } | null>(null);

  // 👇 NEW STATES FOR MOBILE SEARCH
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  const toggleMobileSearch = (expand: boolean) => {
    setIsMobileSearchExpanded(expand);
    if (!expand) {
      setLocalSearchQuery('');
      Keyboard.dismiss();
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const selectedRef = useRef<Conversation | null>(null);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    setCheckedMembers(currentUserName ? [currentUserName] : []);
  }, [currentUserName]);

  useEffect(() => {
    onConversationActiveChange?.(false);
  }, [onConversationActiveChange]);

  useEffect(() => {
    if (onUnreadCountChanged) {
      onUnreadCountChanged();
    }
  }, [unreadIds.size, onUnreadCountChanged]);

  // ---------------------------------------------------------------------------
  // MARK AS READ
  // ---------------------------------------------------------------------------
  const markConversationAsRead = useCallback(
    async (conversationId: string) => {
      if (!conversationId || (!currentUser && !currentUserUid)) return;
      try {
        await apiFetch(`${API_BASE_URL}/messenger-mark-read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            userId: currentUser || undefined,
            userUid: currentUserUid || undefined,
          }),
        });
      } catch (error) {
        console.warn('Mark conversation as read error:', error);
      }
    },
    [currentUser, currentUserUid]
  );

  // ---------------------------------------------------------------------------
  // normalizeMessages
  // ---------------------------------------------------------------------------
  const normalizeMessages = useCallback(
    (rawMessages: any[]): Message[] => {
      return rawMessages
        .map((item: any) => {
          const createdAt = resolveCreatedAt(item);
          const senderName = resolveSenderName(item);
          const system = isSystemMessage(item);
          const fromMe =
            !system &&
            (item?.senderUid === currentUser ||
              item?.senderId === currentUser ||
              item?.senderIdentifier === currentUser ||
              senderName.toLowerCase() === currentUserName.toLowerCase());

          return {
            id: String(item?.id || item?.key || `msg-${Math.random()}`),
            fromMe,
            sender: senderName,
            text: item?.text || '',
            createdAt,
            type: system
              ? 'system'
              : item?.type === 'file'
              ? 'file'
              : 'text',
            fileName: item?.fileName || '',
            fileUrl: item?.fileUrl || '',
            fileType: item?.fileType || '',
            storagePath: item?.storagePath || '',
          } as Message;
        })
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    },
    [currentUser, currentUserName]
  );

  // ---------------------------------------------------------------------------
  // LOAD CONVERSATIONS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await apiFetch(
          `${API_BASE_URL}/messenger-conversations?role=teacher&userId=${encodeURIComponent(
            currentUser
          )}&userUid=${encodeURIComponent(currentUserUid)}`
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error || 'Failed to load conversations.');

        const incoming: Conversation[] = (
          Array.isArray(data) ? data : []
        ).map((item: any) => ({
          id: item.id,
          classId: item.classId,
          name: formatConversationName(item),
          last: item.lastMessage || 'Conversation created.',
          avatar: DEFAULT_AVATAR,
          time: formatConversationTime(
            item.lastMessageAt || item.updatedAt || item.createdAt
          ),
          unreadCount: item.unreadCount || 0,
          lastMessageAt: item.lastMessageAt || null,
          updatedAt: item.updatedAt || null,
          createdAt: item.createdAt || null,
          isRoom: true,
          isCreatedRoom: false,
          admin:
            item.instructorName ||
            item.ownerName ||
            item.className ||
            'Teacher',
          members: Array.isArray(item.participants)
            ? item.participants.map((p: any) => p?.name).filter(Boolean)
            : [],
          memberDetails: Array.isArray(item.participants)
            ? item.participants.map((p: any) => ({
                name: p?.name || '',
                studentId: p?.studentId || p?.id || p?.userId || '',
              })).filter((p: { name: string }) => p.name)
            : [],
          section: item.section,
        }));

        setConversations((prev) => {
          const prevMap: Record<string, Conversation> = {};
          prev.forEach((c) => (prevMap[c.id] = c));

          const merged = incoming.map((next) => {
            const existing = prevMap[next.id];
            if (existing && !conversationChanged(existing, next))
              return existing;
            return next;
          });

          const serverIds = new Set(incoming.map((c) => c.id));
          prev
            .filter((c) => c.isCreatedRoom && !serverIds.has(c.id))
            .forEach((c) => merged.push(c));

          if (
            merged.length === prev.length &&
            merged.every((c, i) => c === prev[i])
          )
            return prev;

          return merged;
        });

        setMessagesByConversation((prev) => {
          const next = { ...prev };
          let changed = false;
          incoming.forEach((conversation) => {
            if (!next[conversation.id]) {
              next[conversation.id] = [
                {
                  id: `seed-${conversation.id}`,
                  fromMe: false,
                  sender: 'System',
                  text: `Conversation created for class ${conversation.name}.`,
                  createdAt:
                    toMillis(conversation.createdAt) ||
                    toMillis(conversation.updatedAt) ||
                    toMillis(conversation.lastMessageAt) ||
                    null,
                  type: 'system',
                },
              ];
              changed = true;
            }
          });
          return changed ? next : prev;
        });

        setSelected((prev) => {
          if (!prev) return prev;
          const updated = incoming.find((c) => c.id === prev.id);
          if (!updated) return prev;
          if (!conversationChanged(prev, updated)) return prev;
          return { ...updated, isCreatedRoom: prev.isCreatedRoom };
        });

        setUnreadIds((prev) => {
          const currentSelectedId = selectedRef.current?.id;
          const next = new Set(prev);
          incoming.forEach((c) => {
            if (c.id === currentSelectedId) {
              next.delete(c.id);
            } else if (c.unreadCount > 0) {
              next.add(c.id);
            } else {
              next.delete(c.id);
            }
          });
          return next;
        });
      } catch (error) {
        console.error('Load conversations error:', error);
      }
    };

    if (currentUser) loadConversations();
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [currentUser, currentUserName]);

  // ---------------------------------------------------------------------------
  // MESSAGE POLLING
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await apiFetch(
          `${API_BASE_URL}/messenger-messages/${selected.id}`
        );
        const data = await response.json();
        if (!response.ok || cancelled) return;

        const backendRows: any[] = Array.isArray(data) ? data : [];
        if (backendRows.length === 0) {
          setMessagesByConversation((prev) => {
            if (prev[selected.id]?.length) return prev;
            const seed: Message = {
              id: `seed-${selected.id}`,
              fromMe: false,
              sender: 'System',
              text: `Conversation created for class ${selected.name}.`,
              createdAt:
                toMillis(selected.createdAt) ||
                toMillis(selected.updatedAt) ||
                toMillis(selected.lastMessageAt) ||
                null,
              type: 'system',
            };
            return { ...prev, [selected.id]: [seed] };
          });
          return;
        }

        const allNormalized = normalizeMessages(backendRows);

        const textMessages = allNormalized.filter((m) => m.type !== 'system');
        const lastMessage = textMessages[textMessages.length - 1];
        if (lastMessage) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== selected.id) return c;
              const newLast =
                lastMessage.type === 'system'
                  ? lastMessage.text
                  : lastMessage.type === 'file'
                  ? `Sent a file: ${lastMessage.fileName}`
                  : lastMessage.text || 'Sent a message';
              const newLastAt = lastMessage.createdAt;
              if (
                c.last === newLast &&
                toMillis(c.lastMessageAt) === toMillis(newLastAt)
              )
                return c;
              return {
                ...c,
                last: newLast,
                time: formatConversationTime(newLastAt),
                lastMessageAt: newLastAt,
              };
            })
          );
        }

        setMessagesByConversation((prev) => {
          const existing = prev[selected.id] || [];
          if (messagesEqual(existing, allNormalized)) return prev;
          return { ...prev, [selected.id]: allNormalized };
        });
      } catch (error) {
        console.error('Load messages error:', error);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selected?.id, normalizeMessages]);

  // ---------------------------------------------------------------------------
  // FILE URL REFRESH
  // ---------------------------------------------------------------------------
  const refreshFileUrl = useCallback(
    async (storagePath: string, conversationId: string): Promise<string | null> => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/messenger-file-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath, conversationId }),
        });
        const data = await response.json();
        if (response.ok && data.success) return data.url;
        return null;
      } catch (error) {
        console.error('Refresh file URL error:', error);
        return null;
      }
    },
    []
  );

  const messagesByConversationRef = useRef(messagesByConversation);
  useEffect(() => {
    messagesByConversationRef.current = messagesByConversation;
  });

  // ---------------------------------------------------------------------------
  // Relative-time ticker
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setConversations((prev) =>
        prev.map((c) => {
          const newTime = formatConversationTime(
            c.lastMessageAt || c.updatedAt || c.createdAt
          );
          if (c.time === newTime) return c;
          return { ...c, time: newTime };
        })
      );
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Filtered conversation list
  // ---------------------------------------------------------------------------
  const filtered = useMemo(() => {
    const queryToUse = isMobileSearchExpanded ? localSearchQuery : searchQuery;
    if (!queryToUse || !queryToUse.trim()) return conversations;
    const lowerQuery = queryToUse.toLowerCase().trim();
    return conversations.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(lowerQuery);
      const lastMessageMatch = c.last?.toLowerCase().includes(lowerQuery);
      const memberMatch = c.members?.some((member) =>
        member?.toLowerCase().includes(lowerQuery)
      );
      return nameMatch || lastMessageMatch || memberMatch;
    });
  }, [conversations, searchQuery, localSearchQuery, isMobileSearchExpanded]);

  const currentMessages = selected
    ? messagesByConversation[selected.id] || []
    : [];

  // Scroll to bottom
  useEffect(() => {
    if (!selected || currentMessages.length === 0) return;
    const timer = setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: false }),
      80
    );
    return () => clearTimeout(timer);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || currentMessages.length === 0) return;
    const timer = setTimeout(
      () => flatListRef.current?.scrollToEnd({ animated: true }),
      80
    );
    return () => clearTimeout(timer);
  }, [currentMessages.length, selected?.id]);

  // Mark as read when conversation selected
  useEffect(() => {
    if (!selected) return;
    setUnreadIds((prev) => {
      if (!prev.has(selected.id)) return prev;
      const next = new Set(prev);
      next.delete(selected.id);
      return next;
    });

    markConversationAsRead(selected.id);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === selected.id && c.unreadCount > 0
          ? { ...c, unreadCount: 0 }
          : c
      )
    );
  }, [selected?.id, markConversationAsRead]);

  const selectedConversationMembers =
    selected?.members && selected.members.length > 0 ? selected.members : [];

  const availableRoomMembers = useMemo(() => {
    const baseMembers = selected?.members || [];
    return Array.from(
      new Set([currentUserName, ...baseMembers].filter(Boolean))
    );
  }, [selected?.id, currentUserName]);

  const sizes = {
    sidebarWidth: isDesktop
      ? Math.min(width * 0.28, 380)
      : isTablet
      ? 320
      : width,
    pageTitle: isDesktop ? 26 : isTablet ? 23 : isTinyPhone ? 20 : 22,
    headerHeight: isDesktop ? 64 : isTablet ? 60 : isTinyPhone ? 52 : 56,
    headerTitle: isDesktop ? 19 : isTablet ? 17 : isTinyPhone ? 14 : 16,
    backText: isTinyPhone ? 11 : 12,
    headerIcon: isDesktop ? 22 : isTablet ? 20 : 18,
    listAvatar: isDesktop ? 50 : isTablet ? 46 : isTinyPhone ? 38 : 42,
    listName: isDesktop ? 15 : isTablet ? 14 : isTinyPhone ? 12 : 13,
    listTime: isDesktop ? 12 : isTablet ? 11 : 10,
    listLast: isDesktop ? 13 : isTablet ? 12 : isTinyPhone ? 11 : 12,
    listRowVertical: isDesktop ? 12 : isTablet ? 11 : isTinyPhone ? 8 : 10,
    bubbleText: isDesktop ? 13 : isTablet ? 12 : isTinyPhone ? 11 : 12,
    senderName: isDesktop ? 11 : isTablet ? 10 : 9,
    messageGap: isDesktop ? 22 : isTablet ? 18 : isTinyPhone ? 12 : 14,
    messageMaxWidth,
    horizontalPadding: isDesktop ? 18 : isTablet ? 14 : isTinyPhone ? 8 : 10,
    verticalPadding: isDesktop ? 14 : isTablet ? 12 : isTinyPhone ? 8 : 10,
    inputText: isDesktop ? 14 : isTablet ? 13 : isTinyPhone ? 12 : 13,
    inputHeight: isDesktop ? 46 : isTablet ? 44 : isTinyPhone ? 40 : 42,
    sendHeight: isDesktop ? 46 : isTablet ? 44 : isTinyPhone ? 40 : 42,
    sendWidth: isDesktop ? 46 : isTablet ? 44 : isTinyPhone ? 40 : 42,
    inputGap: isDesktop ? 12 : isTablet ? 10 : 8,
  };

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSelectConversation = useCallback(
    (item: Conversation) => {
      setSelected(item);
      onConversationActiveChange?.(true);
    },
    [onConversationActiveChange]
  );

  const handleBackFromConversation = useCallback(() => {
    if (isSplitView) return;
    setSelected(null);
    setMessageText('');
    setPendingFile(null);
    onConversationActiveChange?.(false);
  }, [isSplitView, onConversationActiveChange]);

  // ---------------------------------------------------------------------------
  // File helpers
  // ---------------------------------------------------------------------------
  const getBase64FromUri = async (uri: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') {
            reject(new Error('Failed to read file as base64.'));
            return;
          }
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () =>
          reject(new Error('Failed to convert blob to base64.'));
        reader.readAsDataURL(blob);
      });
    }
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const getRealMimeType = async (uri: string, fallbackType: string) => {
    if (Platform.OS === 'web') return fallbackType;
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists && fallbackType === 'application/octet-stream') {
        const name = uri.split('/').pop()?.toLowerCase() || '';
        if (name.endsWith('.pdf')) return 'application/pdf';
        if (name.endsWith('.docx'))
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        if (name.endsWith('.doc')) return 'application/msword';
        if (name.endsWith('.txt')) return 'text/plain';
        if (name.endsWith('.md')) return 'text/markdown';
        if (name.endsWith('.csv')) return 'text/csv';
        if (name.endsWith('.json')) return 'application/json';
        if (name.endsWith('.pptx'))
          return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        if (name.endsWith('.xlsx'))
          return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        if (name.endsWith('.png')) return 'image/png';
        if (name.endsWith('.jpg') || name.endsWith('.jpeg'))
          return 'image/jpeg';
        if (name.endsWith('.webp')) return 'image/webp';
        if (name.endsWith('.gif')) return 'image/gif';
        if (name.endsWith('.bmp')) return 'image/bmp';
      }
    } catch (e) {
      console.warn('MIME detection failed:', e);
    }
    return fallbackType;
  };

  const handlePickFile = async () => {
    if (!selected) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;
      const asset = result.assets[0];

      if (asset.mimeType && asset.mimeType.startsWith('video/')) {
        alert('Video files are not allowed.');
        return;
      }

      const realType = await getRealMimeType(
        asset.uri,
        asset.mimeType || 'application/octet-stream'
      );

      if (realType.startsWith('video/')) {
        alert('Video files are not allowed.');
        return;
      }

      const base64 = await getBase64FromUri(asset.uri);

      setPendingFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: realType,
        base64,
      });
    } catch (error) {
      console.error('Pick file error:', error);
      alert('Failed to select file. Please try again.');
    }
  };

  const handleRemovePendingFile = useCallback(() => setPendingFile(null), []);

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed && !pendingFile) return;
    if (!selected) return;

    const createdAt = Date.now();
    setMessageText('');
    const currentPendingFile = pendingFile;
    if (currentPendingFile) setPendingFile(null);

    // 1. File upload
    if (currentPendingFile) {
      try {
        const fileBase64 = `data:${currentPendingFile.mimeType};base64,${currentPendingFile.base64}`;

        const optimisticFileMsg: Message = {
          id: `temp-file-${createdAt}`,
          fromMe: true,
          sender: currentUserName,
          text: `Sent a file: ${currentPendingFile.name}`,
          createdAt,
          type: 'file',
          fileName: currentPendingFile.name,
          fileUrl: currentPendingFile.uri,
          fileType: currentPendingFile.mimeType,
          storagePath: '',
        };

        setMessagesByConversation((prev) => ({
          ...prev,
          [selected.id]: [...(prev[selected.id] || []), optimisticFileMsg],
        }));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selected.id
              ? {
                  ...c,
                  last: optimisticFileMsg.text,
                  time: formatConversationTime(createdAt),
                  lastMessageAt: createdAt,
                }
              : c
          )
        );

        const response = await apiFetch(
          `${API_BASE_URL}/messenger-upload-file`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: selected.id,
              fileBase64,
              fileName: currentPendingFile.name,
              fileType: currentPendingFile.mimeType,
              senderId: currentUser,
              senderName: currentUserName,
              senderUid: currentUserUid,
              senderRole: 'teacher',
            }),
          }
        );

        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error || 'Failed to upload file.');

        setMessagesByConversation((prev) => ({
          ...prev,
          [selected.id]: prev[selected.id].map((msg) =>
            msg.id === optimisticFileMsg.id
              ? {
                  ...msg,
                  id: data.data.id,
                  fileUrl: data.data.fileUrl,
                  storagePath: data.data.storagePath,
                }
              : msg
          ),
        }));
      } catch (error) {
        console.error('File upload error:', error);
        alert('Failed to send file. Please try again.');
      }
    }

    // 2. Text message
    if (trimmed) {
      const textCreatedAt = Date.now();
      const optimisticTextMsg: Message = {
        id: `${selected.id}-text-${textCreatedAt}`,
        fromMe: true,
        sender: currentUserName,
        text: trimmed,
        createdAt: textCreatedAt,
        type: 'text',
      };

      setMessagesByConversation((prev) => ({
        ...prev,
        [selected.id]: [...(prev[selected.id] || []), optimisticTextMsg],
      }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selected.id
            ? {
                ...c,
                last: trimmed,
                time: formatConversationTime(textCreatedAt),
                lastMessageAt: textCreatedAt,
              }
            : c
        )
      );
      setSelected((prev) =>
        prev
          ? {
              ...prev,
              last: trimmed,
              time: formatConversationTime(textCreatedAt),
              lastMessageAt: textCreatedAt,
            }
          : prev
      );

      try {
        await apiFetch(`${API_BASE_URL}/messenger-send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: selected.id,
            text: trimmed,
            senderName: currentUserName,
            senderId: currentUser,
            senderUid: currentUserUid,
            senderRole: 'teacher',
          }),
        });
      } catch (error) {
        console.error('Send message sync error:', error);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Image preview
  // ---------------------------------------------------------------------------
  const openImagePreview = async (item: Message) => {
    if (!selected) return;
    let url = item.fileUrl;
    let path = item.storagePath;
    if (item.storagePath) {
      const freshUrl = await refreshFileUrl(item.storagePath, selected.id);
      if (freshUrl) {
        url = freshUrl;
        setMessagesByConversation((prev) => ({
          ...prev,
          [selected.id]: prev[selected.id].map((msg) =>
            msg.id === item.id ? { ...msg, fileUrl: freshUrl } : msg
          ),
        }));
      }
    }
    setImagePreviewUrl(url || null);
    setImagePreviewName(item.fileName || 'Image');
    setImagePreviewStoragePath(path || null);
  };

  const closeImagePreview = useCallback(() => {
    setImagePreviewUrl(null);
    setImagePreviewName('');
    setImagePreviewStoragePath(null);
  }, []);

  const handleDownloadImage = async () => {
    if (!imagePreviewUrl || !selected) return;

    let fileName = imagePreviewName || 'image';
    if (!fileName.includes('.')) fileName += '.jpg';

    try {
      if (Platform.OS === 'web') {
        if (!imagePreviewStoragePath) {
          alert('Cannot download: file path missing.');
          return;
        }
        const proxyUrl = `${API_BASE_URL}/messenger-download/${selected.id}/${encodeURIComponent(imagePreviewStoragePath)}`;
        const res = await fetch(proxyUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const blob = await res.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objUrl);
        return;
      }

      // Mobile: get a fresh signed URL
      let downloadUrl = imagePreviewUrl;
      if (imagePreviewStoragePath) {
        const fresh = await refreshFileUrl(imagePreviewStoragePath, selected.id);
        if (fresh) downloadUrl = fresh;
      }
      if (!downloadUrl) { alert('Cannot download: URL missing.'); return; }

      const cacheUri = FileSystem.cacheDirectory + fileName;
      const { uri: localUri, status } = await FileSystem.downloadAsync(downloadUrl, cacheUri);
      if (status !== 200) throw new Error(`Download HTTP status ${status}`);

      if (Platform.OS === 'ios') {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (!perm.granted) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(localUri, {
              mimeType: 'image/jpeg',
              UTI: 'public.image',
              dialogTitle: `Save ${fileName}`,
            });
          } else {
            alert('Permission denied and sharing is unavailable.');
          }
          return;
        }
        await MediaLibrary.saveToLibraryAsync(localUri);
        alert('Image saved to your Photos!');
      } else {
        // Android: SAF folder picker
        const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeMap: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg',
          png: 'image/png', gif: 'image/gif',
          webp: 'image/webp', bmp: 'image/bmp',
        };
        const mimeType = mimeMap[ext] || 'image/jpeg';

        const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(localUri, { mimeType, dialogTitle: `Save ${fileName}` });
          }
          return;
        }

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perms.directoryUri,
          fileName,
          mimeType,
        );
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        alert('Image saved to your selected folder!');
      }
    } catch (err: any) {
      console.error('Download image error:', err);
      alert('Failed to download image. Please try again.');
    }
  };

  const handleFileDownload = async (item: Message) => {
    if (!selected) return;

    let url = item.fileUrl;
    if (item.storagePath) {
      const fresh = await refreshFileUrl(item.storagePath, selected.id);
      if (fresh) {
        url = fresh;
        setMessagesByConversation((prev) => ({
          ...prev,
          [selected.id]: prev[selected.id].map((msg) =>
            msg.id === item.id ? { ...msg, fileUrl: fresh } : msg
          ),
        }));
      } else {
        alert('Failed to get file URL. It may have expired.');
        return;
      }
    }
    if (!url) return;

    let fileName = item.fileName || 'file';
    if (!fileName.includes('.')) {
      const ext = item.fileType?.split('/').pop()?.split(';')[0] || 'bin';
      fileName += `.${ext}`;
    }

    const mimeType = item.fileType || 'application/octet-stream';

    try {
      if (Platform.OS === 'web') {
        if (!item.storagePath) { alert('Cannot download: file path missing.'); return; }
        const proxyUrl = `${API_BASE_URL}/messenger-download/${selected.id}/${encodeURIComponent(item.storagePath)}`;
        const res = await fetch(proxyUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const objUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(objUrl);
        return;
      }

      const cacheUri = FileSystem.cacheDirectory + fileName;
      const { uri: localUri, status } = await FileSystem.downloadAsync(url, cacheUri);
      if (status !== 200) throw new Error(`Download HTTP status ${status}`);

      if (Platform.OS === 'ios') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(localUri, {
            mimeType,
            UTI: mimeType,
            dialogTitle: `Save ${fileName}`,
          });
        } else {
          alert(`File cached at:\n${localUri}`);
        }
      } else {
        // Android: SAF folder picker
        const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!perms.granted) {
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(localUri, { mimeType, dialogTitle: `Save ${fileName}` });
          }
          return;
        }

        const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
          perms.directoryUri,
          fileName,
          mimeType,
        );
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await FileSystem.writeAsStringAsync(destUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        alert('File saved to your selected folder!');
      }
    } catch (err: any) {
      console.error('Download file error:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Room / member helpers
  // ---------------------------------------------------------------------------
  const toggleMember = useCallback(
    (member: string) => {
      if (member === currentUserName) return;
      setCheckedMembers((prev) =>
        prev.includes(member)
          ? prev.filter((m) => m !== member)
          : [...prev, member]
      );
    },
    [currentUserName]
  );

  const openAnchoredMenu = () => {
    if (infoButtonRef.current) {
      infoButtonRef.current.measureInWindow(
        (x, y, measuredWidth, measuredHeight) => {
          const menuWidth = isMobile ? 180 : 200;
          setAnchor({
            x: x + measuredWidth - menuWidth,
            y: y + measuredHeight + 6,
          });
          setShowInfoMenu(true);
        }
      );
      return;
    }
    setAnchor({ x: width - 220, y: 70 });
    setShowInfoMenu(true);
  };

  const handleOpenInfoMenu = () => openAnchoredMenu();

  const handleOpenCreateRoomModal = () => {
    if (selected?.isCreatedRoom) return;
    setShowInfoMenu(false);
    setCheckedMembers(currentUserName ? [currentUserName] : []);
    setRoomName('');
    setShowCreateRoomModal(true);
  };

  const handleOpenMembersModal = () => {
    setShowInfoMenu(false);
    setShowMembersModal(true);
  };

  const handleCreateRoom = () => {
    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName || !selected) return;
    const conversationName = `${trimmedRoomName} - ${selected.name}`;
    const newConversationId = `room-${Date.now()}`;
    const nowLabel = formatConversationTime(Date.now());
    const roomMembers = Array.from(
      new Set([...checkedMembers, currentUserName].filter(Boolean))
    );
    const systemMessage: Message = {
      id: `msg-${Date.now()}`,
      fromMe: false,
      sender: 'System',
      text: 'Discussion room created.',
      createdAt: Date.now(),
      type: 'system',
    };

    const newConversation: Conversation = {
      id: newConversationId,
      name: conversationName,
      last: systemMessage.text,
      avatar: DEFAULT_AVATAR,
      time: nowLabel,
      unreadCount: 0,
      lastMessageAt: Date.now(),
      createdAt: Date.now(),
      isRoom: true,
      isCreatedRoom: true,
      members: roomMembers,
      admin: currentUserName,
      classId: selected.classId,
      section: selected.section,
    };

    setConversations((prev) => [newConversation, ...prev]);
    setMessagesByConversation((prev) => ({
      ...prev,
      [newConversationId]: [systemMessage],
    }));
    setSelected(newConversation);
    onConversationActiveChange?.(true);
    setShowCreateRoomModal(false);
    setRoomName('');
    setCheckedMembers(currentUserName ? [currentUserName] : []);
  };

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------
  const showTimeTooltip = (message: Message) => {
    const target = messageRefs.current[message.id];
    if (!target || !message.createdAt) return;
    target.measureInWindow((x, y, measuredWidth) => {
      const tooltipWidth = 150;
      const left = Math.max(
        8,
        Math.min(
          x + measuredWidth / 2 - tooltipWidth / 2,
          width - tooltipWidth - 8
        )
      );
      const top = Math.max(12, y - 34);
      setHoveredMessageId(message.id);
      setHoveredMessageTime(formatTooltipTime(message.createdAt));
      setTooltipPosition({ x: left, y: top });
    });
  };

  const hideTimeTooltip = useCallback(() => {
    setHoveredMessageId(null);
    setHoveredMessageTime('');
  }, []);

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderConversationList = () => {
    // If search is expanded on mobile, render full-screen search
    if (isMobile && isMobileSearchExpanded) {
      return (
        <View style={styles.fullScreenSearchContainer}>
          <View style={styles.fullScreenSearchHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => toggleMobileSearch(false)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#000" />
            </TouchableOpacity>
            
            <View style={styles.fullScreenSearchInputContainer}>
              <TextInput
                ref={searchInputRef}
                autoFocus
                placeholder="Search"
                placeholderTextColor="#888"
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                style={styles.fullScreenSearchInput}
                returnKeyType="search"
              />
              {localSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setLocalSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  style={{ padding: 4 }}
                >
                  <MaterialCommunityIcons name="close-circle" size={20} color="#888" />
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.searchIconButton}
              onPress={() => {
                if (localSearchQuery.trim()) {
                  Keyboard.dismiss();
                }
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="magnify"
                size={24}
                color={localSearchQuery.trim() ? '#D32F2F' : '#888'}
              />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            style={styles.sidebarList}
            contentContainerStyle={styles.sidebarListContent}
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const active = selected?.id === item.id;
              return (
                <TouchableOpacity
                  style={[
                    styles.convCard,
                    {
                      paddingHorizontal: sizes.horizontalPadding,
                      paddingVertical: sizes.listRowVertical,
                    },
                    active && styles.convCardActive,
                  ]}
                  onPress={() => {
                    handleSelectConversation(item);
                    toggleMobileSearch(false);
                  }}
                  activeOpacity={0.88}
                >
                  <Image
                    source={item.avatar}
                    style={{
                      width: sizes.listAvatar,
                      height: sizes.listAvatar,
                      borderRadius: sizes.listAvatar / 2,
                      marginRight: isTinyPhone ? 8 : 12,
                    }}
                  />
                  <View style={styles.convContent}>
                    <View style={styles.convTopRow}>
                      <Text
                        style={[styles.convName, { fontSize: sizes.listName }]}
                        numberOfLines={1}
                      >
                        {item.name.split(' - ')[0]}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {item.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {item.unreadCount > 99 ? '99+' : item.unreadCount}
                            </Text>
                          </View>
                        )}
                        <Text
                          style={[styles.convTime, { fontSize: sizes.listTime }]}
                          numberOfLines={1}
                        >
                          {item.time}
                        </Text>
                      </View>
                    </View>
                    {item.name.includes(' - ') && (
                      <Text
                        style={[styles.convSemester, { fontSize: sizes.listTime }]}
                        numberOfLines={1}
                      >
                        {item.name.split(' - ').slice(1).join(' - ')}
                      </Text>
                    )}
                    <Text
                      style={[styles.convLast, { fontSize: sizes.listLast }]}
                      numberOfLines={1}
                    >
                      {item.last}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      );
    }

    // Normal conversation list view
    return (
      <View
        style={[
          styles.sidebar,
          isMobile && styles.sidebarMobile,
          isSplitView && { width: sizes.sidebarWidth },
        ]}
      >
        <View style={{ position: 'relative' }}>
          {isMobile && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.screenBackButton}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="chevron-left" size={22} color="#111" />
              <Text style={styles.screenBackText}>Back</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.pageTitle, { fontSize: sizes.pageTitle }]}>
            Messages
          </Text>
          {isMobile && (
            <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => toggleMobileSearch(true)}
              >
              <MaterialCommunityIcons name="magnify" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.sidebarList}
          contentContainerStyle={styles.sidebarListContent}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = selected?.id === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.convCard,
                  {
                    paddingHorizontal: sizes.horizontalPadding,
                    paddingVertical: sizes.listRowVertical,
                  },
                  active && styles.convCardActive,
                ]}
                onPress={() => handleSelectConversation(item)}
                activeOpacity={0.88}
              >
                <Image
                  source={item.avatar}
                  style={{
                    width: sizes.listAvatar,
                    height: sizes.listAvatar,
                    borderRadius: sizes.listAvatar / 2,
                    marginRight: isTinyPhone ? 8 : 12,
                  }}
                />
                <View style={styles.convContent}>
                  <View style={styles.convTopRow}>
                    <Text
                      style={[styles.convName, { fontSize: sizes.listName }]}
                      numberOfLines={1}
                    >
                      {item.name.split(' - ')[0]}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {item.unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </Text>
                        </View>
                      )}
                      <Text
                        style={[styles.convTime, { fontSize: sizes.listTime }]}
                        numberOfLines={1}
                      >
                        {item.time}
                      </Text>
                    </View>
                  </View>
                  {item.name.includes(' - ') && (
                    <Text
                      style={[styles.convSemester, { fontSize: sizes.listTime }]}
                      numberOfLines={1}
                    >
                      {item.name.split(' - ').slice(1).join(' - ')}
                    </Text>
                  )}
                  <Text
                    style={[styles.convLast, { fontSize: sizes.listLast }]}
                    numberOfLines={1}
                  >
                    {item.last}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  const renderChatHeader = () => (
    <View style={[styles.chatHeader, { height: sizes.headerHeight }]}>
      {isMobile ? (
        <TouchableOpacity
          onPress={handleBackFromConversation}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="chevron-left"
            size={sizes.headerIcon}
            color="#333"
          />
          <Text style={[styles.backText, { fontSize: sizes.backText }]}>
            Back
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text
        style={[styles.chatTitle, { fontSize: sizes.headerTitle }]}
        numberOfLines={1}
      >
        {selected?.name || 'Select a conversation'}
      </Text>
      <View style={styles.plusButtonArea}>
        <View ref={infoButtonRef} collapsable={false}>
          <Pressable
            style={[
              styles.headerIconButton,
              Platform.OS === 'web' &&
                showInfoMenu &&
                styles.headerIconButtonHover,
            ]}
            onPress={handleOpenInfoMenu}
          >
            <MaterialCommunityIcons
              name="information-outline"
              size={sizes.headerIcon}
              color="#111"
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (item.type === 'system') {
        return (
          <View style={styles.systemRow}>
            <View style={styles.systemBubble}>
              <Text style={styles.systemBubbleText}>{item.text}</Text>
            </View>
            {item.createdAt && (
              <Text style={styles.messageTimestampSystem}>
                {formatConversationTime(item.createdAt)}
              </Text>
            )}
          </View>
        );
      }

      const timestampText = item.createdAt
        ? formatConversationTime(item.createdAt)
        : '';

      if (item.type === 'file') {
        const isImage = item.fileType?.startsWith('image/');
        const hasUrl = !!item.fileUrl;

        return (
          <View
            style={[
              styles.messageRow,
              {
                marginBottom: sizes.messageGap,
                maxWidth: sizes.messageMaxWidth,
              },
              item.fromMe ? styles.messageRowMe : styles.messageRowThem,
            ]}
          >
            {!item.fromMe ? (
              <Text
                style={[
                  styles.senderName,
                  { fontSize: sizes.senderName },
                  styles.senderNameThem,
                ]}
              >
                {item.sender}
              </Text>
            ) : null}

            <Pressable
              ref={(node) => {
                messageRefs.current[item.id] = node;
              }}
              collapsable={false}
              onHoverIn={
                Platform.OS === 'web'
                  ? () => showTimeTooltip(item)
                  : undefined
              }
              onHoverOut={
                Platform.OS === 'web' ? hideTimeTooltip : undefined
              }
              onLongPress={() => showTimeTooltip(item)}
              onPressOut={
                Platform.OS !== 'web' ? hideTimeTooltip : undefined
              }
              delayLongPress={220}
            >
              <View
                style={[
                  styles.bubble,
                  item.fromMe ? styles.bubbleMe : styles.bubbleThem,
                  {
                    padding: 8,
                    borderRadius: isTinyPhone ? 10 : 16,
                    overflow: 'hidden',
                  },
                ]}
              >
                {isImage ? (
                  <Pressable
                    onPress={() => openImagePreview(item)}
                    style={{ width: 200, height: 200 }}
                  >
                    {hasUrl ? (
                      <>
                        <Image
                          source={{ uri: item.fileUrl }}
                          style={{ width: 200, height: 200, borderRadius: 12 }}
                          onError={async () => {
                            if (!item.storagePath || !selected) return;
                            if (refreshingImages.has(item.id)) return;
                            setRefreshingImages((prev) => {
                              const next = new Set(prev);
                              next.add(item.id);
                              return next;
                            });
                            try {
                              const freshUrl = await refreshFileUrl(
                                item.storagePath,
                                selected.id
                              );
                              if (freshUrl && freshUrl !== item.fileUrl) {
                                setMessagesByConversation((prev) => ({
                                  ...prev,
                                  [selected.id]: prev[selected.id].map((msg) =>
                                    msg.id === item.id
                                      ? { ...msg, fileUrl: freshUrl }
                                      : msg
                                  ),
                                }));
                              }
                            } catch (error) {
                              console.error(
                                'Failed to refresh image URL:',
                                error
                              );
                            } finally {
                              setRefreshingImages((prev) => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                              });
                            }
                          }}
                        />
                        <View style={styles.fileImageOverlay}>
                          <MaterialCommunityIcons
                            name="file-image-outline"
                            size={16}
                            color="#fff"
                          />
                          <Text
                            style={styles.fileImageName}
                            numberOfLines={1}
                          >
                            {item.fileName}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View
                        style={{
                          width: 200,
                          height: 200,
                          borderRadius: 12,
                          backgroundColor: 'rgba(0,0,0,0.1)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialCommunityIcons
                          name="image-off-outline"
                          size={32}
                          color={item.fromMe ? '#fff' : '#666'}
                        />
                        <Text
                          style={{
                            color: item.fromMe ? '#fff' : '#666',
                            marginTop: 8,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          Tap to load
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => handleFileDownload(item)}
                    style={styles.fileBubbleContent}
                  >
                    <MaterialCommunityIcons
                      name={getFileIcon(item.fileType)}
                      size={32}
                      color={item.fromMe ? '#fff' : '#d32f2f'}
                    />
                    <View style={styles.fileTextContainer}>
                      <Text
                        style={[
                          styles.fileNameText,
                          {
                            color: item.fromMe ? '#fff' : '#111',
                            fontSize: sizes.bubbleText,
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {item.fileName}
                      </Text>
                      <Text
                        style={[
                          styles.fileSizeText,
                          {
                            color: item.fromMe
                              ? 'rgba(255,255,255,0.8)'
                              : '#666',
                          },
                        ]}
                      >
                        Tap to download
                      </Text>
                    </View>
                  </Pressable>
                )}
              </View>

              {timestampText ? (
                <Text
                  style={[
                    styles.messageTimestamp,
                    item.fromMe
                      ? styles.messageTimestampMe
                      : styles.messageTimestampThem,
                  ]}
                >
                  {timestampText}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      }

      // Regular text message
      return (
        <View
          style={[
            styles.messageRow,
            {
              marginBottom: sizes.messageGap,
              maxWidth: sizes.messageMaxWidth,
            },
            item.fromMe ? styles.messageRowMe : styles.messageRowThem,
          ]}
        >
          {!item.fromMe ? (
            <Text
              style={[
                styles.senderName,
                { fontSize: sizes.senderName },
                styles.senderNameThem,
              ]}
            >
              {item.sender}
            </Text>
          ) : null}

          <Pressable
            ref={(node) => {
              messageRefs.current[item.id] = node;
            }}
            collapsable={false}
            onHoverIn={
              Platform.OS === 'web' ? () => showTimeTooltip(item) : undefined
            }
            onHoverOut={Platform.OS === 'web' ? hideTimeTooltip : undefined}
            onLongPress={() => showTimeTooltip(item)}
            onPressOut={Platform.OS !== 'web' ? hideTimeTooltip : undefined}
            delayLongPress={220}
          >
            <View
              style={[
                styles.bubble,
                item.fromMe ? styles.bubbleMe : styles.bubbleThem,
                {
                  paddingHorizontal: isTinyPhone ? 10 : 12,
                  paddingVertical: isTinyPhone ? 8 : 10,
                  borderRadius: isTinyPhone ? 10 : 16,
                },
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { fontSize: sizes.bubbleText },
                  item.fromMe && styles.bubbleTextMe,
                ]}
              >
                {item.text}
              </Text>
            </View>

            {timestampText ? (
              <Text
                style={[
                  styles.messageTimestamp,
                  item.fromMe
                    ? styles.messageTimestampMe
                    : styles.messageTimestampThem,
                ]}
              >
                {timestampText}
              </Text>
            ) : null}
          </Pressable>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sizes.messageGap,
      sizes.messageMaxWidth,
      sizes.senderName,
      sizes.bubbleText,
      isTinyPhone,
      hideTimeTooltip,
      refreshingImages,
      selected?.id,
    ]
  );

  const renderImagePreviewModal = () => {
    if (!imagePreviewUrl) return null;
    return (
      <Modal
        transparent
        visible={!!imagePreviewUrl}
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <View style={styles.imagePreviewOverlay}>
          <View style={styles.imagePreviewHeader}>
            <Text style={styles.imagePreviewTitle} numberOfLines={1}>
              {imagePreviewName}
            </Text>
            <View style={styles.imagePreviewActions}>
              <TouchableOpacity
                onPress={handleDownloadImage}
                style={styles.imagePreviewIconButton}
              >
                <MaterialCommunityIcons
                  name="download"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={closeImagePreview}
                style={styles.imagePreviewIconButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.imagePreviewContent}>
            <Image
              source={{ uri: imagePreviewUrl }}
              style={styles.imagePreviewImage}
              resizeMode="contain"
            />
          </View>
        </View>
      </Modal>
    );
  };

  const renderPendingFilePreview = () => {
    if (!pendingFile) return null;
    const isImage = pendingFile.mimeType.startsWith('image/');
    return (
      <View style={styles.pendingFileContainer}>
        <View style={styles.pendingFileInfo}>
          {isImage ? (
            <Image
              source={{ uri: pendingFile.uri }}
              style={styles.pendingImagePreview}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.pendingFileIcon}>
              <MaterialCommunityIcons
                name={getFileIcon(pendingFile.mimeType)}
                size={32}
                color="#d32f2f"
              />
            </View>
          )}
          <View style={styles.pendingFileDetails}>
            <Text style={styles.pendingFileName} numberOfLines={1}>
              {pendingFile.name}
            </Text>
            <Text style={styles.pendingFileSize}>
              {(pendingFile.base64.length * 0.75 / 1024).toFixed(1)} KB
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRemovePendingFile}
            style={styles.removeFileButton}
          >
            <MaterialCommunityIcons
              name="close-circle"
              size={24}
              color="#999"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderInfoMenu = () => {
    const modalWidth = Math.min(
      width - (isMobile ? 24 : 40),
      isDesktop ? 360 : 320
    );
    const modalMaxHeight = Math.min(
      height * (isMobile ? 0.52 : 0.48),
      320
    );
    const safeLeft = Math.max(
      8,
      Math.min(anchor.x, width - modalWidth - 8)
    );
    const safeTop = Math.max(
      8,
      Math.min(anchor.y, height - modalMaxHeight - 16)
    );
    return (
      <Modal
        transparent
        visible={showInfoMenu}
        animationType="fade"
        onRequestClose={() => setShowInfoMenu(false)}
      >
        <Pressable
          style={[styles.modalOverlay, styles.professionalOverlay]}
          onPress={() => setShowInfoMenu(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.professionalModalCard,
              isMobile
                ? [
                    styles.centeredProfessionalModal,
                    { width: modalWidth, maxHeight: modalMaxHeight },
                  ]
                : {
                    position: 'absolute',
                    width: modalWidth,
                    maxHeight: modalMaxHeight,
                    left: safeLeft,
                    top: safeTop,
                  },
            ]}
          >
            <View style={styles.professionalModalHeader}>
              <View style={styles.professionalModalHeaderTextWrap}>
                <Text style={styles.professionalModalTitle}>
                  Choose Option
                </Text>
                <Text style={styles.professionalModalSubtitle}>
                  Choose what you want to do in this class conversation.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.professionalCloseButton}
                onPress={() => setShowInfoMenu(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.professionalModalScrollContent}>
              <TouchableOpacity
                style={styles.infoActionCard}
                activeOpacity={0.85}
                onPress={handleOpenMembersModal}
              >
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={18}
                  color="#222"
                />
                <Text style={styles.infoActionCardText}>See Members</Text>
              </TouchableOpacity>
              {!selected?.isCreatedRoom && (
                <TouchableOpacity
                  style={styles.infoActionCard}
                  activeOpacity={0.85}
                  onPress={handleOpenCreateRoomModal}
                >
                  <MaterialCommunityIcons
                    name="forum-outline"
                    size={18}
                    color="#222"
                  />
                  <Text style={styles.infoActionCardText}>Create Room</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCreateRoomModal = () => {
    const modalWidth = Math.min(
      width - (isMobile ? 24 : 40),
      isDesktop ? 430 : 360
    );
    const modalMaxHeight = Math.min(
      height * (isMobile ? 0.78 : 0.72),
      520
    );
    const safeLeft = Math.max(
      8,
      Math.min(anchor.x, width - modalWidth - 8)
    );
    const safeTop = Math.max(
      8,
      Math.min(anchor.y, height - modalMaxHeight - 16)
    );
    return (
      <Modal
        transparent
        visible={showCreateRoomModal}
        animationType="fade"
        onRequestClose={() => setShowCreateRoomModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, styles.professionalOverlay]}
          onPress={() => setShowCreateRoomModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.professionalModalCard,
              isMobile
                ? [
                    styles.centeredProfessionalModal,
                    { width: modalWidth, maxHeight: modalMaxHeight },
                  ]
                : {
                    position: 'absolute',
                    width: modalWidth,
                    maxHeight: modalMaxHeight,
                    left: safeLeft,
                    top: safeTop,
                  },
            ]}
          >
            <View style={styles.professionalModalHeader}>
              <View style={styles.professionalModalHeaderTextWrap}>
                <Text style={styles.professionalModalTitle}>Create Room</Text>
                <Text style={styles.professionalModalSubtitle}>
                  Start a focused discussion with selected members.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.professionalCloseButton}
                onPress={() => setShowCreateRoomModal(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.professionalModalScrollContent}
            >
              <View style={styles.professionalSection}>
                <Text style={styles.professionalLabel}>Room name</Text>
                <View
                  style={[
                    styles.professionalInputRow,
                    isTinyPhone && styles.professionalInputRowStack,
                  ]}
                >
                  <TextInput
                    value={roomName}
                    onChangeText={setRoomName}
                    placeholder="Enter room name"
                    placeholderTextColor="#9a9a9a"
                    style={[
                      styles.professionalInput,
                      isTinyPhone && styles.professionalInputStack,
                    ]}
                  />
                  <TouchableOpacity
                    style={[
                      styles.professionalPrimaryButton,
                      isTinyPhone && styles.professionalPrimaryButtonStack,
                    ]}
                    activeOpacity={0.9}
                    onPress={handleCreateRoom}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={16}
                      color="#fff"
                    />
                    <Text style={styles.professionalPrimaryButtonText}>
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.professionalSection}>
                <Text style={styles.professionalLabel}>Members</Text>
                <Text style={styles.professionalHelperText}>
                  Select who will be included in this discussion room.
                </Text>
                <View style={styles.professionalMemberList}>
                  {availableRoomMembers.map((member, index) => {
                    const checked = checkedMembers.includes(member);
                    const isCurrentUser = member === currentUserName;
                    return (
                      <TouchableOpacity
                        key={`${member}-${index}`}
                        style={[
                          styles.professionalMemberRow,
                          checked && styles.professionalMemberRowActive,
                          isCurrentUser &&
                            styles.professionalMemberRowDisabled,
                        ]}
                        activeOpacity={0.85}
                        onPress={() => toggleMember(member)}
                      >
                        <View style={styles.professionalMemberInfo}>
                          <View style={styles.professionalMemberAvatar}>
                            <MaterialCommunityIcons
                              name="account"
                              size={16}
                              color="#666"
                            />
                          </View>
                          <View style={styles.professionalMemberTextWrap}>
                            <Text style={styles.professionalMemberName}>
                              {member}
                            </Text>
                            <Text style={styles.professionalMemberMeta}>
                              {isCurrentUser
                                ? 'Required member'
                                : checked
                                ? 'Selected'
                                : 'Tap to select'}
                            </Text>
                          </View>
                        </View>
                        <MaterialCommunityIcons
                          name={
                            checked
                              ? 'checkbox-marked-circle'
                              : 'checkbox-blank-circle-outline'
                          }
                          size={22}
                          color={checked ? '#d32f2f' : '#b8b8b8'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderMembersModal = () => {
    const modalWidth = Math.min(
      width - (isMobile ? 24 : 40),
      isDesktop ? 420 : 350
    );
    const modalMaxHeight = Math.min(
      height * (isMobile ? 0.72 : 0.68),
      460
    );
    const safeLeft = Math.max(
      8,
      Math.min(anchor.x, width - modalWidth - 8)
    );
    const safeTop = Math.max(
      8,
      Math.min(anchor.y, height - modalMaxHeight - 16)
    );
    return (
      <Modal
        transparent
        visible={showMembersModal}
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <Pressable
          style={[styles.modalOverlay, styles.professionalOverlay]}
          onPress={() => setShowMembersModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.professionalModalCard,
              isMobile
                ? [
                    styles.centeredProfessionalModal,
                    { width: modalWidth, maxHeight: modalMaxHeight },
                  ]
                : {
                    position: 'absolute',
                    width: modalWidth,
                    maxHeight: modalMaxHeight,
                    left: safeLeft,
                    top: safeTop,
                  },
            ]}
          >
            <View style={styles.professionalModalHeader}>
              <View style={styles.professionalModalHeaderTextWrap}>
                <Text style={styles.professionalModalTitle}>Members</Text>
                <Text style={styles.professionalModalSubtitle}>
                  People included in this conversation.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.professionalCloseButton}
                onPress={() => setShowMembersModal(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="close" size={18} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.professionalModalScrollContent}
            >
              {selected?.admin && (
                <View style={styles.conversationMetaCard}>
                  <Text style={styles.conversationMetaTitle}>
                    Conversation Info
                  </Text>
                  <Text style={styles.conversationMetaText}>
                    Admin: {selected.admin}
                  </Text>
                  {selected.section ? (
                    <Text style={styles.conversationMetaText}>
                      Section: {selected.section}
                    </Text>
                  ) : null}
                </View>
              )}
              <View style={styles.professionalMemberList}>
                {selectedConversationMembers.map((member, index) => {
                  const isAdmin = member === selected?.admin;
                  const isCurrentUser = member === currentUserName;
                  const detail = selected?.memberDetails?.find((d) => d.name === member);
                  const studentId = detail?.studentId;
                  return (
                    <View
                      key={`${member}-${index}`}
                      style={styles.professionalMemberRowStatic}
                    >
                      <View style={styles.professionalMemberInfo}>
                        <View style={styles.professionalMemberAvatar}>
                          <MaterialCommunityIcons
                            name="account"
                            size={16}
                            color="#666"
                          />
                        </View>
                        <View style={styles.professionalMemberTextWrap}>
                          <Text style={styles.professionalMemberName}>
                            {member}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={styles.professionalMemberMeta}>
                              {isAdmin ? 'Admin' : isCurrentUser ? 'Member (You)' : 'Member'}
                            </Text>
                            {studentId ? (
                              <>
                                <Text style={styles.professionalMemberMeta}>·</Text>
                                <Text style={[styles.professionalMemberMeta, { color: '#444', fontWeight: '600' }]}>
                                  {studentId}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => handleCopyStudentId(studentId)}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <MaterialCommunityIcons
                                    name={copiedId === studentId ? 'check' : 'content-copy'}
                                    size={13}
                                    color={copiedId === studentId ? '#22a355' : '#999'}
                                  />
                                </TouchableOpacity>
                              </>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderChatPane = () => {
    if (!selected) {
      return (
        <View style={styles.emptyPane}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={52}
            color="#bbb"
          />
          <Text style={styles.emptyPaneTitle}>Select a conversation</Text>
          <Text style={styles.emptyPaneSubtitle}>
            Choose a message thread from the left to start chatting.
          </Text>
        </View>
      );
    }
    return (
      <View
        style={[styles.chatPane, isMobile && styles.chatPaneMobile]}
      >
        {renderChatHeader()}

        <FlatList
          ref={flatListRef}
          data={currentMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messagesList}
          contentContainerStyle={{
            paddingHorizontal: sizes.horizontalPadding,
            paddingTop: 18 * scale,
            paddingBottom: 24 * scale,
            flexGrow: 1,
            justifyContent: currentMessages.length ? 'flex-end' : 'center',
          }}
          showsVerticalScrollIndicator={true}
          indicatorStyle="black"
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        />

        {hoveredMessageId && hoveredMessageTime ? (
          <View
            pointerEvents="none"
            style={[
              styles.timeTooltip,
              { left: tooltipPosition.x, top: tooltipPosition.y },
            ]}
          >
            <Text style={styles.timeTooltipText}>{hoveredMessageTime}</Text>
          </View>
        ) : null}

        {renderPendingFilePreview()}

        <View
          style={[
            styles.inputArea,
            {
              paddingHorizontal: sizes.horizontalPadding,
              paddingTop: sizes.verticalPadding,
              paddingBottom: isDesktop ? 18 : 12,
              gap: sizes.inputGap,
            },
          ]}
        >
          <TouchableOpacity
            onPress={handlePickFile}
            style={styles.attachButton}
          >
            <MaterialCommunityIcons name="paperclip" size={24} color="#666" />
          </TouchableOpacity>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder={
              pendingFile
                ? 'Add a caption (optional)...'
                : 'Write a message...'
            }
            placeholderTextColor="#9a9a9a"
            multiline={false}
            style={[
              styles.input,
              {
                height: sizes.inputHeight,
                minHeight: sizes.inputHeight,
                fontSize: sizes.inputText,
                borderRadius: 18,
                paddingHorizontal: isDesktop ? 14 : isTablet ? 12 : 10,
                paddingVertical: 0,
              },
            ]}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                height: sizes.sendHeight,
                width: sizes.sendWidth,
                paddingHorizontal: isDesktop ? 18 : isTablet ? 14 : 10,
                borderRadius: sizes.sendHeight / 2,
                opacity: !messageText.trim() && !pendingFile ? 0.5 : 1,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleSend}
            disabled={!messageText.trim() && !pendingFile}
          >
            <MaterialCommunityIcons name="send" size={isTinyPhone ? 16 : 20} color="#fff" />
          </TouchableOpacity>
        </View>

        {renderInfoMenu()}
        {renderCreateRoomModal()}
        {renderMembersModal()}
        {renderImagePreviewModal()}
      </View>
    );
  };

  // ---------------------------------------------------------------------------
  // Root render
  // ---------------------------------------------------------------------------
  
  if (isMobile) {
    if (selected) {
      return (
        <View style={[styles.mobileScreen]}>
          <KeyboardAvoidingView
            style={styles.mobileContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight ?? 0}
          >
            {renderChatPane()}
          </KeyboardAvoidingView>
        </View>
      );
    }
    return (
      <View style={[styles.mobileScreen]}>
        <View style={styles.mobileContent}>{renderConversationList()}</View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.desktopScreen}>
      <View style={styles.splitLayout}>
        {renderConversationList()}
        {renderChatPane()}
      </View>
    </SafeAreaView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  mobileScreen: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  mobileContent: { flex: 1, minHeight: 0 },
  desktopScreen: { flex: 1, backgroundColor: '#eef1f5' },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#eef1f5',
    padding: 12,
    gap: 12,
  },
  sidebar: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
    flexShrink: 0,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sidebarList: { flex: 1, minHeight: 0 },
  sidebarListContent: { paddingBottom: 14, paddingHorizontal: 10 },
  sidebarMobile: { borderRadius: 0, shadowOpacity: 0, elevation: 0 },
  screenBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headerActionButton: {
  position: 'absolute',
  paddingTop: 14,
  right: 12,
  justifyContent: 'center',
  alignItems: 'center',
  width: 40,
  height: 40,
},
  screenBackText: { fontSize: 14, fontWeight: '600', color: '#111', marginLeft: 2 },
  pageTitle: {
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    marginTop: 20,
    paddingHorizontal: 18,
    color: '#111',
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  convCardActive: { backgroundColor: '#fff6f6', borderColor: '#f1c3c0' },
  convContent: { flex: 1, minWidth: 0 },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: { fontWeight: '700', color: '#111', flex: 1, minWidth: 0, marginRight: 8 },
  unreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ea1111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  convTime: { color: '#888', flexShrink: 0 },
  convLast: { color: '#666', marginTop: 4 },
  convSemester: {
    color: '#0c0c0c',
    fontSize: 11,
    marginTop: 1,
    marginBottom: 2,
  },
  fullScreenSearchContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullScreenSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#fff',
    gap: 8,
  },
  fullScreenSearchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F1F1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  fullScreenSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  searchIconButton: {
    padding: 8,
  },
  chatPane: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#fff',
    minWidth: 0,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    overflow: 'hidden',
  },
  messagesList: { flex: 1, minHeight: 0 },
  chatPaneMobile: { borderRadius: 0, shadowOpacity: 0, elevation: 0 },
  chatHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#ececec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    overflow: 'visible',
    zIndex: 20,
  },
  backButton: { minWidth: 60, flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#333' },
  chatTitle: {
    fontWeight: '700',
    color: '#111',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  plusButtonArea: {
    minWidth: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  headerIconButtonHover: { backgroundColor: 'rgba(0,0,0,0.05)' },
  infoActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ededed',
    backgroundColor: '#fafafa',
    marginBottom: 10,
  },
  infoActionCardText: { fontSize: 14, fontWeight: '600', color: '#222' },
  messageRow: {},
  messageRowThem: { alignSelf: 'flex-start' },
  messageRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderName: { color: '#666', marginBottom: 4, fontWeight: '600' },
  senderNameThem: { textAlign: 'left', marginLeft: 4 },
  bubble: {},
  bubbleThem: { backgroundColor: '#f0f2f5', borderTopLeftRadius: 6 },
  bubbleMe: { backgroundColor: '#d94c43', borderTopRightRadius: 6 },
  bubbleText: { color: '#111' },
  bubbleTextMe: { color: '#fff' },
  systemRow: { alignItems: 'center', marginBottom: 18 },
  systemBubble: {
    backgroundColor: '#d9928d',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '78%',
  },
  systemBubbleText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 13,
  },
  messageTimestamp: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  messageTimestampMe: { textAlign: 'right' },
  messageTimestampThem: { textAlign: 'left' },
  messageTimestampSystem: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  timeTooltip: {
    position: 'absolute',
    backgroundColor: 'rgba(17,17,17,0.94)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 50,
    width: 150,
    alignItems: 'center',
  },
  timeTooltipText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ececec',
  },
  input: {
    alignContent: 'center',
    justifyContent: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e4e8',
    color: '#111',
    backgroundColor: '#f7f8fa',
  },
  sendBtn: {
    backgroundColor: '#ea1111',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  sendBtnText: { color: '#fff', fontWeight: '700' },
  emptyPane: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  emptyPaneTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
  },
  emptyPaneSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    maxWidth: 320,
  },
  modalOverlay: { flex: 1, backgroundColor: 'transparent' },
  professionalOverlay: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  professionalModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    overflow: 'hidden',
  },
  centeredProfessionalModal: { position: 'relative' },
  professionalModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  professionalModalHeaderTextWrap: { flex: 1, paddingRight: 12 },
  professionalModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  professionalModalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
  },
  professionalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  professionalModalScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  professionalSection: { marginBottom: 18 },
  professionalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  professionalHelperText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
    marginBottom: 12,
  },
  professionalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  professionalInputRowStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  professionalInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#d6d6d6',
    backgroundColor: '#fafafa',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#111',
  },
  professionalInputStack: { width: '100%' },
  professionalPrimaryButton: {
    height: 44,
    minWidth: 108,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  professionalPrimaryButtonStack: { width: '100%' },
  professionalPrimaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  professionalMemberList: { gap: 10 },
  professionalMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fff',
  },
  professionalMemberRowActive: {
    borderColor: '#f2b2b2',
    backgroundColor: '#fff7f7',
  },
  professionalMemberRowDisabled: { opacity: 0.92 },
  professionalMemberRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ececec',
    backgroundColor: '#fbfbfb',
  },
  professionalMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  professionalMemberAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f2f2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  professionalMemberTextWrap: { flex: 1, minWidth: 0 },
  professionalMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  professionalMemberMeta: { marginTop: 2, fontSize: 11, color: '#7a7a7a' },
  conversationMetaCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff7f7',
    borderWidth: 1,
    borderColor: '#f5d0d0',
  },
  conversationMetaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
    marginBottom: 6,
  },
  conversationMetaText: { fontSize: 12, color: '#555', marginTop: 2 },
  attachButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#f0f2f5',
  },
  fileBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    minWidth: 200,
    gap: 12,
  },
  fileTextContainer: { flex: 1 },
  fileNameText: { fontWeight: '600' },
  fileSizeText: { fontSize: 11, marginTop: 2 },
  fileImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  fileImageName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  imagePreviewTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  imagePreviewActions: { flexDirection: 'row', gap: 15 },
  imagePreviewIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreviewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: { width: '100%', height: '100%' },
  pendingFileContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pendingFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pendingImagePreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  pendingFileIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pendingFileDetails: { flex: 1, marginRight: 10 },
  pendingFileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  pendingFileSize: { fontSize: 11, color: '#666' },
  removeFileButton: { padding: 4 },
});

export default Messenger;