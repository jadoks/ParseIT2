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
  onBack,
}: {
  searchQuery?: string;
  onConversationActiveChange?: (isActive: boolean) => void;
  onBack?: () => void;
}) => {
  const { width, height } = useWindowDimensions();

  const isTinyPhone = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isDesktop = width >= 1200;

  const isSplitView = !isMobile;
  const scale = isDesktop ? 1.15 : isTablet ? 1.05 : 1;

  const messageMaxWidth: DimensionValue =
    isDesktop ? '58%' : isTablet ? '66%' : isTinyPhone ? '88%' : '80%';

  const sendWidth: DimensionValue =
    isDesktop ? 96 : isTablet ? 84 : isTinyPhone ? 54 : 72;

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
              showsVerticalScrollIndicator={false}
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
                  {ROOM_MEMBERS.map((member, index) => {
                    const checked = checkedMembers.includes(member);
                    const isCurrentUser = member === CURRENT_USER;

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
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.professionalModalScrollContent}
            >
              <View style={styles.professionalMemberList}>
                {selectedConversationMembers.map((member, index) => (
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
                          Conversation member
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
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
                borderRadius: 10,
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
                borderRadius: 10,
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
    marginTop: 25,
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
    borderBottomColor: '#e0e0e0',
    borderBottomWidth: 1,
  },
  input: {
    alignContent: 'center',
    justifyContent: 'center',
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
});

export default Messenger;