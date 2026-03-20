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
                <Text style={styles.title}>Post Your Query</Text>

                <Pressable onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color="#555"
                  />
                </Pressable>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Describe your query in detail"
                multiline
                numberOfLines={6}
                value={query}
                onChangeText={setQuery}
                autoFocus
                textAlignVertical="top"
                placeholderTextColor="#999"
              />

              <Pressable style={styles.postBtn} onPress={handlePost}>
                <Text style={styles.postText}>Post Query</Text>
              </Pressable>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContainer: {
    width: '90%',
    maxWidth: 700,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    minHeight: 120,
    padding: 10,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    color: '#111',
  },

  postBtn: {
    marginTop: 15,
    backgroundColor: '#D32F2F',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  postText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default PostQueryModal;