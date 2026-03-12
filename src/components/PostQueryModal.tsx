import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
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
    if (onPost) {
      onPost(query);
    }
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">

      <View style={styles.overlay}>

        <View style={styles.modalContainer}>

          {/* Header */}
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

          {/* Textarea */}
          <TextInput
            style={styles.input}
            placeholder="Describe your query in detail"
            multiline
            numberOfLines={6}
            value={query}
            onChangeText={setQuery}
          />

          {/* Button */}
          <TouchableOpacity style={styles.postBtn} onPress={handlePost}>
            <Text style={styles.postText}>Post Query</Text>
          </TouchableOpacity>

        </View>

      </View>

    </Modal>
  );
};

const styles = StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '90%',
    maxWidth: 700,
    backgroundColor: '#fff',
    borderRadius: 8,
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
    height: 120,
    padding: 10,
    textAlignVertical: 'top',
  },

  postBtn: {
    marginTop: 15,
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
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