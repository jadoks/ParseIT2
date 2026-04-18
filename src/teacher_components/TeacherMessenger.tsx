import Constants from 'expo-constants';
import {
  getDatabase,
  off,
  onValue,
  push,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { auth } from '../../firebaseConfig';

const DEFAULT_AVATAR = require('../../assets/images/default_profile.png');
const RTDB_URL = 'https://parseit2-4b26d-default-rtdb.firebaseio.com/';

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
const database = getDatabase(auth.app, RTDB_URL);

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
  isRoom?: boolean;
  isCreatedRoom?: boolean;
  members?: string[];
  admin?: string;
  classId?: string;
  section?: string;
};

type Message = {
  id: string;
  fromMe: boolean;
  sender: string;
  text: string;
  createdAt?: number | null;
  type?: 'system' | 'text';
};

const Messenger = ({
  searchQuery = '',
  onConversationActiveChange,
  onBack,
  courses = [],
  currentUser,
  currentUserName,
}: {
  searchQuery?: string;
  onConversationActiveChange?: (isActive: boolean) => void;
  onBack?: () => void;
  courses?: MessengerCourse[];
  currentUser: string;
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

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  const [roomName, setRoomName] = useState('');
  const [checkedMembers, setCheckedMembers] = useState<string[]>([]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredMessageTime, setHoveredMessageTime] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setCheckedMembers(currentUserName ? [currentUserName] : []);
  }, [currentUserName]);

  useEffect(() => {
    onConversationActiveChange?.(false);
  }, [onConversationActiveChange]);

  const formatConversationTime = (timestamp?: number | null) => {
    if (!timestamp) return 'Now';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatTooltipTime = (timestamp?: number | null) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString([], {
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

    if (item?.senderName && String(item.senderName).trim()) {
      return String(item.senderName).trim();
    }

    if (item?.displayName && String(item.displayName).trim()) {
      return String(item.displayName).trim();
    }

    return 'User';
  };

  const resolveCreatedAt = (item: any) => {
    if (typeof item?.createdAt === 'number') return item.createdAt;
    if (typeof item?.timestamp === 'number') return item.timestamp;
    if (typeof item?.sentAt === 'number') return item.sentAt;

    if (typeof item?.createdAt?.seconds === 'number') {
      return item.createdAt.seconds * 1000;
    }

    if (typeof item?.createdAt === 'string') {
      const parsed = Date.parse(item.createdAt);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof item?.sentAt === 'string') {
      const parsed = Date.parse(item.sentAt);
      return Number.isNaN(parsed) ? null : parsed;
    }

    if (typeof item?.timestamp === 'string') {
      const parsed = Date.parse(item.timestamp);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  };

  const normalizeMessages = (rawMessages: any[]) => {
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
          type: system ? 'system' : 'text',
        } as Message;
      })
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  };

  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/messenger-conversations?role=teacher&userId=${encodeURIComponent(
            currentUser
          )}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load conversations.');
        }

        const mappedConversations: Conversation[] = (Array.isArray(data) ? data : []).map(
          (item: any) => ({
            id: item.id,
            classId: item.classId,
            name:
              item.className && item.semester && item.schoolYear
                ? `${item.className} - ${item.semester} (${item.schoolYear})`
                : item.className || item.name || 'Conversation',
            last: item.lastMessage || 'Conversation created.',
            avatar: DEFAULT_AVATAR,
            time: 'Now',
            isRoom: true,
            isCreatedRoom: false,
            admin: item.instructorName || item.ownerName || currentUserName,
            members: Array.isArray(item.participants)
              ? item.participants
                  .map((participant: any) => participant?.name)
                  .filter(Boolean)
              : [],
            section: item.section,
          })
        );

        setConversations(mappedConversations);

        const seededMessages: Record<string, Message[]> = {};
        mappedConversations.forEach((conversation) => {
          seededMessages[conversation.id] = [
            {
              id: `seed-${conversation.id}`,
              fromMe: false,
              sender: 'System',
              text: `Conversation created for class ${conversation.name}.`,
              createdAt: Date.now(),
              type: 'system',
            },
          ];
        });

        setMessagesByConversation(seededMessages);
      } catch (error) {
        console.error('Load conversations error:', error);
      }
    };

    if (currentUser) {
      loadConversations();
    }
  }, [currentUser, currentUserName, courses]);

  useEffect(() => {
    if (!selected) return;

    const conversationMessagesRef = ref(database, `messenger/${selected.id}/messages`);

    const handleSnapshot = async (snapshot: any) => {
      try {
        const realtimeRows = snapshot.exists()
          ? Object.entries(snapshot.val() || {}).map(([key, value]) => ({
              ...(value as any),
              key,
            }))
          : [];

        let backendRows: any[] = [];

        try {
          const response = await fetch(
            `${API_BASE_URL}/messenger-messages/${selected.id}`
          );

          const data = await response.json();

          if (response.ok) {
            backendRows = Array.isArray(data) ? data : [];
          } else {
            console.error('Failed to load backend messages:', data?.error);
          }
        } catch (fetchError) {
          console.error('Backend messages fetch error:', fetchError);
        }

        const mergedMap = new Map<string, any>();

        [...backendRows, ...realtimeRows].forEach((item: any) => {
          const key =
            item?.id ||
            item?.key ||
            `${item?.senderId || item?.senderName || 'unknown'}-${item?.text || ''}-${resolveCreatedAt(item) || ''}`;

          if (!mergedMap.has(String(key))) {
            mergedMap.set(String(key), item);
          }
        });

        const mergedMessages = normalizeMessages(Array.from(mergedMap.values()));

        setMessagesByConversation((prev) => ({
          ...prev,
          [selected.id]: mergedMessages.length
            ? mergedMessages
            : [
                {
                  id: `seed-${selected.id}`,
                  fromMe: false,
                  sender: 'System',
                  text: `Conversation created for class ${selected.name}.`,
                  createdAt: Date.now(),
                  type: 'system',
                },
              ],
        }));

        const lastMessage = mergedMessages[mergedMessages.length - 1];
        if (lastMessage) {
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === selected.id
                ? {
                    ...conversation,
                    last:
                      lastMessage.type === 'system'
                        ? lastMessage.text
                        : lastMessage.text || 'Sent a message',
                    time: formatConversationTime(lastMessage.createdAt),
                  }
                : conversation
            )
          );
        }
      } catch (error) {
        console.error('Load messages error:', error);
      }
    };

    onValue(conversationMessagesRef, handleSnapshot);

    return () => {
      off(conversationMessagesRef, 'value', handleSnapshot);
    };
  }, [selected, currentUser, currentUserName]);

  const filtered = useMemo(() => {
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const currentMessages = selected ? messagesByConversation[selected.id] || [] : [];

  useEffect(() => {
    if (!selected || currentMessages.length === 0) return;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 80);

    return () => clearTimeout(timer);
  }, [selected?.id]);

  useEffect(() => {
    if (!selected || currentMessages.length === 0) return;

    const timer = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timer);
  }, [currentMessages.length, selected?.id]);

  const selectedConversationMembers =
    selected?.members && selected.members.length > 0
      ? selected.members
      : [];

  const availableRoomMembers = useMemo(() => {
    const baseMembers = selected?.members || [];
    return Array.from(new Set([currentUserName, ...baseMembers].filter(Boolean)));
  }, [selected, currentUserName]);

  const sizes = {
    sidebarWidth: isDesktop ? Math.min(width * 0.28, 380) : isTablet ? 320 : width,
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
    sendWidth,
    inputGap: isDesktop ? 12 : isTablet ? 10 : 8,
  };

  const handleSelectConversation = (item: Conversation) => {
    setSelected(item);
    onConversationActiveChange?.(true);
  };

  const handleBackFromConversation = () => {
    if (isSplitView) return;
    setSelected(null);
    setMessageText('');
    onConversationActiveChange?.(false);
  };

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selected) return;

    const createdAt = Date.now();

    const optimisticMessage: Message = {
      id: `${selected.id}-${createdAt}`,
      fromMe: true,
      sender: currentUserName,
      text: trimmed,
      createdAt,
      type: 'text',
    };

    const updatedTime = formatConversationTime(createdAt);

    setMessagesByConversation((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] || []), optimisticMessage],
    }));

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              last: trimmed,
              time: updatedTime,
            }
          : conversation
      )
    );

    setSelected((prev) =>
      prev
        ? {
            ...prev,
            last: trimmed,
            time: updatedTime,
          }
        : prev
    );

    setMessageText('');

    try {
      const newMessageRef = push(ref(database, `messenger/${selected.id}/messages`));

      await set(newMessageRef, {
        id: newMessageRef.key,
        text: trimmed,
        senderName: currentUserName,
        senderId: currentUser,
        senderUid: currentUser,
        senderRole: 'teacher',
        createdAt: serverTimestamp(),
        type: 'text',
      });
    } catch (error) {
      console.error('Realtime send message error:', error);
    }

    try {
      await fetch(`${API_BASE_URL}/messenger-send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selected.id,
          text: trimmed,
          senderName: currentUserName,
          senderId: currentUser,
          senderUid: currentUser,
          senderRole: 'teacher',
        }),
      });
    } catch (error) {
      console.error('Send message sync error:', error);
    }
  };

  const toggleMember = (member: string) => {
    if (member === currentUserName) return;

    setCheckedMembers((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  };

  const openAnchoredMenu = () => {
    if (infoButtonRef.current) {
      infoButtonRef.current.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        const menuWidth = isMobile ? 180 : 200;
        setAnchor({
          x: x + measuredWidth - menuWidth,
          y: y + measuredHeight + 6,
        });
        setShowInfoMenu(true);
      });
      return;
    }

    setAnchor({ x: width - 220, y: 70 });
    setShowInfoMenu(true);
  };

  const handleOpenInfoMenu = () => {
    openAnchoredMenu();
  };

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

    const roomMembers = Array.from(new Set([...checkedMembers, currentUserName].filter(Boolean)));

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

  const showTimeTooltip = (message: Message) => {
    const target = messageRefs.current[message.id];
    if (!target || !message.createdAt) return;

    target.measureInWindow((x, y, measuredWidth) => {
      const tooltipWidth = 150;
      const left = Math.max(
        8,
        Math.min(x + measuredWidth / 2 - tooltipWidth / 2, width - tooltipWidth - 8)
      );
      const top = Math.max(12, y - 34);

      setHoveredMessageId(message.id);
      setHoveredMessageTime(formatTooltipTime(message.createdAt));
      setTooltipPosition({ x: left, y: top });
    });
  };

  const hideTimeTooltip = () => {
    setHoveredMessageId(null);
    setHoveredMessageTime('');
  };

  const renderConversationList = () => (
    <View
      style={[
        styles.sidebar,
        isSplitView && {
          width: sizes.sidebarWidth,
        },
      ]}
    >
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

      <Text style={[styles.pageTitle, { fontSize: sizes.pageTitle }]}>Messages</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.sidebarListContent}
        showsVerticalScrollIndicator={true}
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
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.convTime, { fontSize: sizes.listTime, marginLeft: 8 }]}
                    numberOfLines={1}
                  >
                    {item.time}
                  </Text>
                </View>

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
          <Text style={[styles.backText, { fontSize: sizes.backText }]}>Back</Text>
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
              Platform.OS === 'web' && showInfoMenu && styles.headerIconButtonHover,
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

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemBubbleText}>{item.text}</Text>
          </View>
        </View>
      );
    }

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
          onHoverIn={Platform.OS === 'web' ? () => showTimeTooltip(item) : undefined}
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
        </Pressable>
      </View>
    );
  };

  const renderInfoMenu = () => {
    const menuWidth = isMobile ? 180 : 200;
    const safeLeft = Math.max(8, Math.min(anchor.x, width - menuWidth - 8));
    const safeTop = Math.max(8, Math.min(anchor.y, height - 160));

    return (
      <Modal
        transparent
        visible={showInfoMenu}
        animationType="fade"
        onRequestClose={() => setShowInfoMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowInfoMenu(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.infoMenu,
              {
                width: menuWidth,
                left: safeLeft,
                top: safeTop,
              },
            ]}
          >
            <Text style={styles.infoMenuTitle}>Choose Option</Text>

            <TouchableOpacity
              style={styles.infoMenuButton}
              activeOpacity={0.85}
              onPress={handleOpenMembersModal}
            >
              <MaterialCommunityIcons name="account-group-outline" size={16} color="#222" />
              <Text style={styles.infoMenuButtonText}>See Members</Text>
            </TouchableOpacity>

            {!selected?.isCreatedRoom && (
              <TouchableOpacity
                style={styles.infoMenuButton}
                activeOpacity={0.85}
                onPress={handleOpenCreateRoomModal}
              >
                <MaterialCommunityIcons name="forum-outline" size={16} color="#222" />
                <Text style={styles.infoMenuButtonText}>Create Room</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderCreateRoomModal = () => {
    const modalWidth = Math.min(width - (isMobile ? 24 : 40), isDesktop ? 430 : 360);
    const modalMaxHeight = Math.min(height * (isMobile ? 0.78 : 0.72), 520);

    const safeLeft = Math.max(8, Math.min(anchor.x, width - modalWidth - 8));
    const safeTop = Math.max(8, Math.min(anchor.y, height - modalMaxHeight - 16));

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
                    {
                      width: modalWidth,
                      maxHeight: modalMaxHeight,
                    },
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
                    <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                    <Text style={styles.professionalPrimaryButtonText}>Create</Text>
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
                          isCurrentUser && styles.professionalMemberRowDisabled,
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
                            <Text style={styles.professionalMemberName}>{member}</Text>
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
    const modalWidth = Math.min(width - (isMobile ? 24 : 40), isDesktop ? 420 : 350);
    const modalMaxHeight = Math.min(height * (isMobile ? 0.72 : 0.68), 460);

    const safeLeft = Math.max(8, Math.min(anchor.x, width - modalWidth - 8));
    const safeTop = Math.max(8, Math.min(anchor.y, height - modalMaxHeight - 16));

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
                    {
                      width: modalWidth,
                      maxHeight: modalMaxHeight,
                    },
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
                  <Text style={styles.conversationMetaTitle}>Conversation Info</Text>
                  <Text style={styles.conversationMetaText}>Admin: {selected.admin}</Text>
                  {selected.section ? (
                    <Text style={styles.conversationMetaText}>Section: {selected.section}</Text>
                  ) : null}
                </View>
              )}

              <View style={styles.professionalMemberList}>
                {selectedConversationMembers.map((member, index) => {
                  const isAdmin = member === selected?.admin;
                  const isCurrentUser = member === currentUserName;

                  return (
                    <View key={`${member}-${index}`} style={styles.professionalMemberRowStatic}>
                      <View style={styles.professionalMemberInfo}>
                        <View style={styles.professionalMemberAvatar}>
                          <MaterialCommunityIcons
                            name="account"
                            size={16}
                            color="#666"
                          />
                        </View>

                        <View style={styles.professionalMemberTextWrap}>
                          <Text style={styles.professionalMemberName}>{member}</Text>
                          <Text style={styles.professionalMemberMeta}>
                            {isAdmin ? 'Admin' : isCurrentUser ? 'Member (You)' : 'Member'}
                          </Text>
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
      <View style={styles.chatPane}>
        {renderChatHeader()}

        <FlatList
          ref={flatListRef}
          data={currentMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingHorizontal: sizes.horizontalPadding,
            paddingTop: 18 * scale,
            paddingBottom: 24 * scale,
            flexGrow: 1,
            justifyContent: 'flex-end',
          }}
          showsVerticalScrollIndicator={true}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {hoveredMessageId && hoveredMessageTime ? (
          <View
            pointerEvents="none"
            style={[
              styles.timeTooltip,
              {
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              },
            ]}
          >
            <Text style={styles.timeTooltipText}>{hoveredMessageTime}</Text>
          </View>
        ) : null}

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
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Write a message..."
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
                borderRadius: 18,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleSend}
          >
            {isTinyPhone ? (
              <MaterialCommunityIcons name="send" size={16} color="#fff" />
            ) : (
              <Text style={[styles.sendBtnText, { fontSize: sizes.inputText }]}>
                Send
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {renderInfoMenu()}
        {renderCreateRoomModal()}
        {renderMembersModal()}
      </View>
    );
  };

  if (isMobile) {
    if (selected) {
      return <SafeAreaView style={styles.mobileScreen}>{renderChatPane()}</SafeAreaView>;
    }

    return <SafeAreaView style={styles.mobileScreen}>{renderConversationList()}</SafeAreaView>;
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

const styles = StyleSheet.create({
  mobileScreen: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  desktopScreen: {
    flex: 1,
    backgroundColor: '#eef1f5',
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#eef1f5',
    padding: 12,
    gap: 12,
  },

  sidebar: {
    backgroundColor: '#fff',
    flexShrink: 0,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sidebarListContent: {
    paddingBottom: 14,
    paddingHorizontal: 10,
  },
  screenBackButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 4,
  },
  screenBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginLeft: 2,
  },
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
  convCardActive: {
    backgroundColor: '#fff6f6',
    borderColor: '#f1c3c0',
  },
  convContent: {
    flex: 1,
    minWidth: 0,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  convName: {
    fontWeight: '700',
    color: '#111',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  convTime: {
    color: '#888',
    flexShrink: 0,
  },
  convLast: {
    color: '#666',
    marginTop: 4,
  },

  chatPane: {
    flex: 1,
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
  backButton: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#333',
  },
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
  headerIconButtonHover: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  infoMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ececec',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  infoMenuTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  infoMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  infoMenuButtonText: {
    fontSize: 12,
    color: '#222',
    fontWeight: '500',
  },

  messageRow: {},
  messageRowThem: {
    alignSelf: 'flex-start',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  senderName: {
    color: '#666',
    marginBottom: 4,
    fontWeight: '600',
  },
  senderNameThem: {
    textAlign: 'left',
    marginLeft: 4,
  },
  bubble: {},
  bubbleThem: {
    backgroundColor: '#f0f2f5',
    borderTopLeftRadius: 6,
  },
  bubbleMe: {
    backgroundColor: '#d94c43',
    borderTopRightRadius: 6,
  },
  bubbleText: {
    color: '#111',
  },
  bubbleTextMe: {
    color: '#fff',
  },

  systemRow: {
    alignItems: 'center',
    marginBottom: 18,
  },
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
  timeTooltipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },

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
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
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
  centeredProfessionalModal: {
    position: 'relative',
  },
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
  professionalModalHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
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
  professionalSection: {
    marginBottom: 18,
  },
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
  professionalInputStack: {
    width: '100%',
  },
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
  professionalPrimaryButtonStack: {
    width: '100%',
  },
  professionalPrimaryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  professionalMemberList: {
    gap: 10,
  },
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
  professionalMemberRowDisabled: {
    opacity: 0.92,
  },
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
  professionalMemberTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  professionalMemberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  professionalMemberMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#7a7a7a',
  },
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
  conversationMetaText: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
});

export default Messenger;