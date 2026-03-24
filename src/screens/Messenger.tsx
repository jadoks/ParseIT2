import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CURRENT_USER = 'Jade Lisondra';
const DEFAULT_AVATAR = require('../../assets/images/default_profile.png');

const INITIAL_CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Networking 1',
    last: "Yes ma'am",
    avatar: DEFAULT_AVATAR,
    time: '2:15 PM',
  },
  {
    id: 'c2',
    name: 'Programming 1',
    last: 'Thanks!',
    avatar: DEFAULT_AVATAR,
    time: '1:02 PM',
  },
  {
    id: 'c3',
    name: 'Web Dev',
    last: 'Assignment due tomorrow.',
    avatar: DEFAULT_AVATAR,
    time: 'Yesterday',
  },
];

const INITIAL_MESSAGES: Record<
  string,
  { id: string; fromMe: boolean; sender: string; text: string }[]
> = {
  c1: [
    {
      id: 'm1',
      fromMe: false,
      sender: 'Ramcee Bading',
      text: 'Hello, does everyone attending the review?',
    },
    {
      id: 'm2',
      fromMe: true,
      sender: 'Ramcee Buyot',
      text: "Yes ma'am",
    },
  ],
  c2: [
    {
      id: 'm3',
      fromMe: false,
      sender: 'Programming 1',
      text: 'Thanks!',
    },
  ],
  c3: [
    {
      id: 'm4',
      fromMe: false,
      sender: 'Web Dev',
      text: 'Assignment due tomorrow.',
    },
  ],
};

const ROOM_MEMBERS = [
  CURRENT_USER,
  'Abai Clipord',
  'Abai Clipord 2',
  'Abai Clipord 3',
  'Lude Lisendra',
];

type Conversation = {
  id: string;
  name: string;
  last: string;
  avatar: any;
  time: string;
};

type Message = {
  id: string;
  fromMe: boolean;
  sender: string;
  text: string;
};

const Messenger = ({
  searchQuery = '',
  onConversationActiveChange,
}: {
  searchQuery?: string;
  onConversationActiveChange?: (isActive: boolean) => void;
}) => {
  const { width, height } = useWindowDimensions();

  const isSmallPhone = width < 480;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;

  const scale = isDesktop ? 1.25 : isTablet ? 1.1 : 1;
  const isSplitView = !isMobile;

  const [conversations, setConversations] =
    useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Message[]>>(INITIAL_MESSAGES);

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [checkedMembers, setCheckedMembers] = useState<string[]>([CURRENT_USER]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [showPlusTooltip, setShowPlusTooltip] = useState(false);

  const plusButtonRef = useRef<View>(null);

  useEffect(() => {
    onConversationActiveChange?.(false);
  }, [onConversationActiveChange]);

  const filtered = useMemo(() => {
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.last.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const currentMessages = selected ? messagesByConversation[selected.id] || [] : [];

  const sizes = {
    sidebarWidth: isDesktop ? 360 : 300,
    pageTitle: 25 * scale,
    headerHeight: 58 * scale,
    headerTitle: 18 * scale,
    backText: 12 * scale,
    headerIcon: 20 * scale,
    listAvatar: 48 * scale,
    listName: 15 * scale,
    listTime: 12 * scale,
    listLast: 13 * scale,
    bubbleText: 12 * scale,
    senderName: 10 * scale,
    inputText: isDesktop ? 12 * scale : isTablet ? 11 * scale : isSmallPhone ? 9 : 10,
    sendText: isDesktop ? 13 * scale : isTablet ? 12 : isSmallPhone ? 10 : 11,
    inputHeight: isDesktop ? 42 * scale : isTablet ? 40 : isSmallPhone ? 34 : 36,
    sendHeight: isDesktop ? 42 * scale : isTablet ? 40 : isSmallPhone ? 34 : 36,
    sendWidth: isDesktop ? 86 * scale : isTablet ? 72 : isSmallPhone ? 52 : 60,
    messageGap: 22 * scale,
    horizontalPadding: isDesktop ? 18 * scale : isTablet ? 14 : 10,
    inputGap: isDesktop ? 12 : isTablet ? 10 : 8,
  };

  const getCurrentTimeLabel = () => {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
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

  const handleSend = () => {
    const trimmed = messageText.trim();
    if (!trimmed || !selected) return;

    const newMessage: Message = {
      id: `${selected.id}-${Date.now()}`,
      fromMe: true,
      sender: 'You',
      text: trimmed,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [selected.id]: [...(prev[selected.id] || []), newMessage],
    }));

    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              last: trimmed,
              time: getCurrentTimeLabel(),
            }
          : conversation
      )
    );

    setMessageText('');
  };

  const toggleMember = (member: string) => {
    if (member === CURRENT_USER) return;

    setCheckedMembers((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  };

  const handleOpenCreateRoomModal = () => {
    setShowPlusTooltip(false);

    if (plusButtonRef.current) {
      plusButtonRef.current.measureInWindow((x, y, measuredWidth, measuredHeight) => {
        const modalWidth = isMobile ? 210 : 230;
        setAnchor({
          x: x + measuredWidth - modalWidth,
          y: y + measuredHeight + 6,
        });
        setShowCreateRoomModal(true);
      });
      return;
    }

    setAnchor({ x: width - 240, y: 70 });
    setShowCreateRoomModal(true);
  };

  const handleCreateRoom = () => {
    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName || !selected) return;

    const conversationName = `${trimmedRoomName} - ${selected.name}`;
    const newConversationId = `room-${Date.now()}`;
    const nowLabel = getCurrentTimeLabel();

    const systemMessage: Message = {
      id: `msg-${Date.now()}`,
      fromMe: false,
      sender: conversationName,
      text: 'Discussion room created.',
    };

    const newConversation: Conversation = {
      id: newConversationId,
      name: conversationName,
      last: systemMessage.text,
      avatar: DEFAULT_AVATAR,
      time: nowLabel,
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
    setCheckedMembers([CURRENT_USER]);
  };

  const renderConversationList = () => (
    <View
      style={[
        styles.sidebar,
        isSplitView && {
          width: sizes.sidebarWidth,
          borderRightWidth: 1,
          borderRightColor: '#e7e7e7',
        },
      ]}
    >
      <Text style={[styles.pageTitle, { fontSize: sizes.pageTitle }]}>Messages</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = selected?.id === item.id;

          return (
            <TouchableOpacity
              style={[
                styles.convRow,
                {
                  paddingHorizontal: sizes.horizontalPadding,
                  paddingVertical: 12 * scale,
                },
                active && styles.convRowActive,
              ]}
              onPress={() => handleSelectConversation(item)}
              activeOpacity={0.85}
            >
              <Image
                source={item.avatar}
                style={{
                  width: sizes.listAvatar,
                  height: sizes.listAvatar,
                  borderRadius: sizes.listAvatar / 2,
                  marginRight: 12,
                }}
              />

              <View style={styles.convContent}>
                <View style={styles.convTopRow}>
                  <Text style={[styles.convName, { fontSize: sizes.listName }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.convTime, { fontSize: sizes.listTime }]}>
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
        <View ref={plusButtonRef} collapsable={false}>
          <Pressable
            style={[
              styles.headerIconButton,
              Platform.OS === 'web' && showPlusTooltip && styles.headerIconButtonHover,
            ]}
            onPress={handleOpenCreateRoomModal}
            onHoverIn={() => {
              if (Platform.OS === 'web') {
                setShowPlusTooltip(true);
              }
            }}
            onHoverOut={() => {
              if (Platform.OS === 'web') {
                setShowPlusTooltip(false);
              }
            }}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={sizes.headerIcon}
              color="#111"
            />
          </Pressable>
        </View>

        {Platform.OS === 'web' && showPlusTooltip && (
          <View style={styles.plusTooltip}>
            <Text style={styles.plusTooltipText}>Create room</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageRow,
        {
          marginBottom: sizes.messageGap,
          maxWidth: isDesktop ? '60%' : isTablet ? '68%' : '78%',
        },
        item.fromMe ? styles.messageRowMe : styles.messageRowThem,
      ]}
    >
      <Text
        style={[
          styles.senderName,
          { fontSize: sizes.senderName },
          item.fromMe ? styles.senderNameMe : styles.senderNameThem,
        ]}
      >
        {item.sender}
      </Text>

      <View
        style={[
          styles.bubble,
          item.fromMe ? styles.bubbleMe : styles.bubbleThem,
          {
            paddingHorizontal: 12 * scale,
            paddingVertical: 9 * scale,
            borderRadius: 8 * scale,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { fontSize: sizes.bubbleText }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const renderCreateRoomModal = () => {
    const modalWidth = isMobile ? 210 : 230;
    const safeLeft = Math.max(8, Math.min(anchor.x, width - modalWidth - 8));
    const safeTop = Math.max(8, Math.min(anchor.y, height - 260));

    return (
      <Modal
        transparent
        visible={showCreateRoomModal}
        animationType="fade"
        onRequestClose={() => setShowCreateRoomModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCreateRoomModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.createRoomModal,
              {
                width: modalWidth,
                left: safeLeft,
                top: safeTop,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                style={styles.modalHeaderButton}
                onPress={() => setShowCreateRoomModal(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="chevron-left" size={16} color="#222" />
                <Text style={styles.modalTitle}>Create Discussion Room</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputRow}>
              <TextInput
                value={roomName}
                onChangeText={setRoomName}
                placeholder="Room Name"
                placeholderTextColor="#9a9a9a"
                style={styles.modalInput}
              />
              <TouchableOpacity
                style={styles.modalCreateBtn}
                activeOpacity={0.85}
                onPress={handleCreateRoom}
              >
                <Text style={styles.modalCreateBtnText}>Create</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.memberList}>
              {ROOM_MEMBERS.map((member, index) => {
                const checked = checkedMembers.includes(member);
                const isCurrentUser = member === CURRENT_USER;

                return (
                  <TouchableOpacity
                    key={`${member}-${index}`}
                    style={[styles.memberRow, isCurrentUser && styles.memberRowDisabled]}
                    activeOpacity={0.8}
                    onPress={() => toggleMember(member)}
                  >
                    <MaterialCommunityIcons
                      name={
                        checked ? 'checkbox-marked-outline' : 'checkbox-blank-outline'
                      }
                      size={15}
                      color={checked ? '#8e8e8e' : '#b5b5b5'}
                    />
                    <Text
                      style={[
                        styles.memberText,
                        isCurrentUser && styles.memberTextDisabled,
                      ]}
                    >
                      {member}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
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
          data={currentMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{
            paddingHorizontal: sizes.horizontalPadding,
            paddingTop: 18 * scale,
            paddingBottom: 24 * scale,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        />

        <View
          style={[
            styles.inputArea,
            {
              paddingHorizontal: sizes.horizontalPadding,
              paddingTop: isDesktop ? 10 * scale : 8,
              paddingBottom: isDesktop ? 18 * scale : 12,
              gap: sizes.inputGap,
            },
          ]}
        >
          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Write a message..."
            placeholderTextColor="#9a9a9a"
            style={[
              styles.input,
              {
                height: sizes.inputHeight,
                fontSize: sizes.inputText,
                borderRadius: 6 * scale,
                paddingHorizontal: isDesktop ? 14 : isTablet ? 12 : 10,
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
                minWidth: sizes.sendWidth,
                paddingHorizontal: isDesktop ? 18 : isTablet ? 14 : 10,
                borderRadius: 6 * scale,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleSend}
          >
            <Text style={[styles.sendBtnText, { fontSize: sizes.sendText }]}>
              Send
            </Text>
          </TouchableOpacity>
        </View>

        {renderCreateRoomModal()}
      </View>
    );
  };

  if (isMobile) {
    if (selected) {
      return (
        <SafeAreaView style={styles.mobileScreen}>
          {renderChatPane()}
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.mobileScreen}>
        {renderConversationList()}
      </SafeAreaView>
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

const styles = StyleSheet.create({
  mobileScreen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  desktopScreen: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
  },

  sidebar: {
    backgroundColor: '#fff',
  },
  pageTitle: {
    fontWeight: 'bold',
    paddingBottom: 10,
    textAlign: 'left',
    marginTop: 20,
    paddingHorizontal: 12,
    marginLeft: 10,
    color: '#111',
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  convRowActive: {
    backgroundColor: '#f6f6f6',
  },
  convContent: {
    flex: 1,
    minWidth: 0,
  },
  convTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  convName: {
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  convTime: {
    color: '#888',
  },
  convLast: {
    color: '#666',
    marginTop: 4,
  },

  chatPane: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#d9d9d9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    overflow: 'visible',
    zIndex: 20,
  },
  backButton: {
    width: 80,
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
    width: 80,
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
  plusTooltip: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 999,
    elevation: 10,
    minWidth: 92,
    alignItems: 'center',
  },
  plusTooltipText: {
    color: '#fff',
    fontSize: 12,
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
    color: '#222',
    marginBottom: 2,
  },
  senderNameThem: {
    textAlign: 'left',
    marginLeft: 2,
  },
  senderNameMe: {
    textAlign: 'right',
    marginRight: 2,
  },
  bubble: {},
  bubbleThem: {
    backgroundColor: '#de938d',
    borderTopLeftRadius: 4,
  },
  bubbleMe: {
    backgroundColor: '#d94c43',
    borderTopRightRadius: 4,
  },
  bubbleText: {
    color: '#fff',
  },

  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8a8a8a',
    color: '#111',
    backgroundColor: '#fff',
  },
  sendBtn: {
    backgroundColor: '#ea1111',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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
  createRoomModal: {
    position: 'absolute',
    backgroundColor: '#f3f3f3',
    borderRadius: 6,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: '#cfcfcf',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 3,
  },
  modalHeaderButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#222',
  },
  modalInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalInput: {
    flex: 1,
    height: 28,
    borderWidth: 1,
    borderColor: '#bdbdbd',
    backgroundColor: '#fff',
    borderRadius: 2,
    paddingHorizontal: 8,
    fontSize: 9,
    color: '#111',
  },
  modalCreateBtn: {
    backgroundColor: '#ef1d1d',
    minWidth: 52,
    height: 28,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  modalCreateBtnText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  memberList: {
    gap: 5,
    paddingTop: 2,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 18,
  },
  memberRowDisabled: {
    opacity: 0.75,
  },
  memberText: {
    fontSize: 10,
    color: '#555',
  },
  memberTextDisabled: {
    color: '#666',
    fontWeight: '600',
  },
});

export default Messenger;