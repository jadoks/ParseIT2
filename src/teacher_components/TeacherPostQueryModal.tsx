import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPost: (query: string) => void;
}

const TeacherPostQueryModal: React.FC<Props> = ({
  visible,
  onClose,
  onPost,
}) => {
  const [query, setQuery] = useState('');

  const handlePost = () => {
    const trimmed = query.trim();

    if (!trimmed) {
      onClose();
      return;
    }

    onPost(trimmed); // ONLY send data
    setQuery('');    // reset input
    onClose();       // close modal ONLY
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              {/* Title */}
              <Text style={styles.title}>Ask a Question</Text>

              {/* Input */}
              <TextInput
                style={styles.input}
                placeholder="Type your question here..."
                placeholderTextColor="#999"
                multiline
                value={query}
                onChangeText={setQuery}
                textAlignVertical="top"
              />

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.postBtn}
                  onPress={handlePost}
                >
                  <Text style={styles.postText}>Post</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default TeacherPostQueryModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#222',
  },

  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#222',
    marginBottom: 16,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },

  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },

  cancelText: {
    color: '#666',
    fontWeight: '600',
  },

  postBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },

  postText: {
    color: '#FFF',
    fontWeight: '700',
  },
});