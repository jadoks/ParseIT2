import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPost?: (query: string) => void;
}

const PostQueryModal: React.FC<Props> = ({ visible, onClose, onPost }) => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const canPost = query.trim().length > 0;

  const handlePost = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    onPost?.(trimmed);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <View style={styles.iconDisc}>
                  <MaterialCommunityIcons name="forum-outline" size={20} color="#8B0000" />
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Post your query</Text>
                  <Text style={styles.subtitle}>Ask a question. Teachers and classmates can answer.</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#7A4A4A" />
                </Pressable>
              </View>

              <TextInput
                style={[styles.input, focused && styles.inputFocused]}
                placeholder="Describe your query in detail"
                multiline
                numberOfLines={6}
                value={query}
                onChangeText={setQuery}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                textAlignVertical="top"
                placeholderTextColor="#A58F8F"
              />

              <View style={styles.footer}>
                <Pressable style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.postBtn, !canPost && styles.postBtnDisabled]}
                  onPress={handlePost}
                  disabled={!canPost}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#fff" />
                  <Text style={styles.postText}>Post query</Text>
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(43,17,17,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContainer: {
    width: '92%',
    maxWidth: 640,
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EBD4D4',
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },

  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F7EDED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2B1111',
  },

  subtitle: {
    fontSize: 12.5,
    color: '#8A6F6F',
    marginTop: 2,
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#FAF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E8CCCC',
    borderRadius: 14,
    minHeight: 130,
    padding: 14,
    fontSize: 14.5,
    lineHeight: 21,
    textAlignVertical: 'top',
    backgroundColor: '#FAF7F7',
    color: '#2B1111',
  },

  inputFocused: {
    borderColor: '#8B0000',
    backgroundColor: '#FFFFFF',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },

  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F6F1F1',
  },

  cancelText: {
    color: '#6B4A4A',
    fontWeight: '700',
    fontSize: 14,
  },

  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },

  postBtnDisabled: {
    backgroundColor: '#C9A3A3',
  },

  postText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});

export default PostQueryModal;