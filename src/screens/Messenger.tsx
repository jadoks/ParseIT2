import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DimensionValue } from 'react-native';
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

type Conversation = {
  id: string;
  name: string;
  last: string;
  avatar: any;
  time: string;
  isRoom?: boolean;
  members?: string[];
};

type Message = {
  id: string;
  fromMe: boolean;
  sender: string;
  text: string;
};

const ROOM_MEMBERS = [
  CURRENT_USER,
  'Abai Clipord',
  'Abai Clipord 2',
  'Abai Clipord 3',
  'Lude Lisendra',
];

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Networking 1',
    last: "Yes ma'am",
    avatar: DEFAULT_AVATAR,
    time: '2:15 PM',
    isRoom: false,
    members: ['Ramcee Bading', 'Ramcee Buyot'],
  },
  {
    id: 'c2',
    name: 'Programming 1',
    last: 'Thanks!',
    avatar: DEFAULT_AVATAR,
    time: '1:02 PM',
    isRoom: false,
    members: ['Programming 1'],
  },
  {
    id: 'c3',
    name: 'Web Dev',
    last: 'Assignment due tomorrow.',
    avatar: DEFAULT_AVATAR,
    time: 'Yesterday',
    isRoom: false,
    members: ['Web Dev'],
  },
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
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

const Messenger = ({
  searchQuery = '',
  onConversationActiveChange,
}: {
  searchQuery?: string;
  onConversationActiveChange?: (isActive: boolean) => void;
}) => {
  const { width, height } = useWindowDimensions();

  const isTinyPhone = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;

  const isSplitView = !isMobile;
  const isCompactInput = width < 420;
  const scale = isDesktop ? 1.15 : isTablet ? 1.05 : 1;

  const messageMaxWidth: DimensionValue =
    isDesktop ? '58%' : isTablet ? '66%' : isTinyPhone ? '88%' : '80%';

  const sendWidth: DimensionValue =
    isDesktop ? 96 : isTablet ? 84 : isTinyPhone ? '100%' : 72;

  const [conversations, setConversations] =
    useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messagesByConversation, setMessagesByConversation] =
    useState<Record<string, Message[]>>(INITIAL_MESSAGES);

  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showInfoMenu, setShowInfoMenu] = useState(false);

  const [roomName, setRoomName] = useState('');
  const [checkedMembers, setCheckedMembers] = useState<string[]>([CURRENT_USER]);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });

  const infoButtonRef = useRef<View>(null);

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

  const selectedConversationMembers =
    selected?.members && selected.members.length > 0
      ? selected.members
      : selected
      ? [selected.name]
      : [];

  const sizes = {
    sidebarWidth: isDesktop ? Math.min(width * 0.28, 380) : isTablet ? 320 : width,
    pageTitle: isDesktop ? 26 : isTablet ? 23 : isTinyPhone ? 20 : 22,
    headerHeight: isDesktop ? 64 : isTablet ? 60 : isTinyPhone ? 52 : 56,
    headerTitle: isDesktop ? 19 : isTablet ? 17 : isTinyPhone ? 14 : 16,
    backText: isTinyPhone ? 11 : 12,
    headerIcon: isDesktop ? 22 : isTablet ? 20 : 18,

    listAvatar: isDesktop ? 52 : isTablet ? 48 : isTinyPhone ? 38 : 42,
    listName: isDesktop ? 15 : isTablet ? 14 : isTinyPhone ? 12 : 13,
    listTime: isDesktop ? 12 : isTablet ? 11 : 10,
    listLast: isDesktop ? 13 : isTablet ? 12 : isTinyPhone ? 11 : 12,
    listRowVertical: isDesktop ? 14 : isTablet ? 12 : isTinyPhone ? 8 : 10,

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

    const updatedTime = getCurrentTimeLabel();

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
  };

  const toggleMember = (member: string) => {
    if (member === CURRENT_USER) return;

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
    if (selected?.isRoom) return;
    setShowInfoMenu(false);
    setCheckedMembers([CURRENT_USER]);
    setRoomName('');
    setShowCreateRoomModal(true);
  };

  const handleOpenMembersModal = () => {
    setShowInfoMenu(false);
    setShowMembersModal(true);
  };

  const handleCreateRoom = () => {
    const trimmedRoomName = roomName.trim();
    if (!trimmedRoomName || !selected || selected.isRoom) return;

    const conversationName = `${trimmedRoomName} - ${selected.name}`;
    const newConversationId = `room-${Date.now()}`;
    const nowLabel = getCurrentTimeLabel();
    const roomMembers = [...checkedMembers];

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
      isRoom: true,
      members: roomMembers,
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
                  paddingVertical: sizes.listRowVertical,
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

  const renderMessage = ({ item }: { item: Message }) => (
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
            paddingHorizontal: isTinyPhone ? 10 : 12,
            paddingVertical: isTinyPhone ? 8 : 10,
            borderRadius: isTinyPhone ? 10 : 12,
          },
        ]}
      >
        <Text style={[styles.bubbleText, { fontSize: sizes.bubbleText }]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

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

            {!selected?.isRoom && (
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

  const renderMembersModal = () => {
    const modalWidth = isMobile ? 210 : 230;
    const safeLeft = Math.max(8, Math.min(anchor.x, width - modalWidth - 8));
    const safeTop = Math.max(8, Math.min(anchor.y, height - 260));

    return (
      <Modal
        transparent
        visible={showMembersModal}
        animationType="fade"
        onRequestClose={() => setShowMembersModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowMembersModal(false)}>
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
                onPress={() => setShowMembersModal(false)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="chevron-left" size={16} color="#222" />
                <Text style={styles.modalTitle}>Chat Members</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.memberList}>
              {selectedConversationMembers.map((member, index) => (
                <View key={`${member}-${index}`} style={styles.memberRow}>
                  <MaterialCommunityIcons
                    name="account-circle-outline"
                    size={16}
                    color="#8e8e8e"
                  />
                  <Text style={styles.memberText}>{member}</Text>
                </View>
              ))}
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
            isCompactInput && styles.inputAreaCompact,
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
            multiline={!isCompactInput}
            style={[
              styles.input,
              isCompactInput && styles.inputCompact,
              {
                height: isCompactInput ? undefined : sizes.inputHeight,
                minHeight: sizes.inputHeight,
                fontSize: sizes.inputText,
                borderRadius: 10,
                paddingHorizontal: isDesktop ? 14 : isTablet ? 12 : 10,
                paddingVertical: isCompactInput ? 10 : 0,
              },
            ]}
            onSubmitEditing={!isCompactInput ? handleSend : undefined}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              isCompactInput && styles.sendBtnCompact,
              {
                height: sizes.sendHeight,
                width: sizes.sendWidth,
                paddingHorizontal: isDesktop ? 18 : isTablet ? 14 : 10,
                borderRadius: 10,
              },
            ]}
            activeOpacity={0.85}
            onPress={handleSend}
          >
            <Text style={[styles.sendBtnText, { fontSize: sizes.inputText }]}>
              Send
            </Text>
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
    flexShrink: 0,
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
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  headerIconButtonHover: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  infoMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
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
    borderRadius: 6,
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
  inputAreaCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#8a8a8a',
    color: '#111',
    backgroundColor: '#fff',
  },
  inputCompact: {
    width: '100%',
    flex: 0,
  },
  sendBtn: {
    backgroundColor: '#ea1111',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  sendBtnCompact: {
    width: '100%',
    alignSelf: 'stretch',
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