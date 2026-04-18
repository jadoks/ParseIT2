import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  heightPercentageToDP as hp
} from 'react-native-responsive-screen';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { Material } from './TeacherCourseDetail2';

type Props = {
  materials: Material[];
  onCreate: () => void;
  onOpenMaterial: (material: Material) => void;
};

const TeacherMaterialSection = ({
  materials,
  onCreate,
  onOpenMaterial,
}: Props) => {
  const { width } = useWindowDimensions();

  const isSmallPhone = width < 360;
  const isTabletOrLargeScreen = width >= 768;

  const horizontalPadding = isSmallPhone ? 12 : isTabletOrLargeScreen ? 24 : 16;
  const cardPadding = isSmallPhone ? 10 : isTabletOrLargeScreen ? 18 : 14;
  const iconSize = isSmallPhone ? 42 : isTabletOrLargeScreen ? 56 : 50;
  const titleFontSize = isSmallPhone ? 13 : isTabletOrLargeScreen ? 16 : 14;
  const metaFontSize = isSmallPhone ? 11 : isTabletOrLargeScreen ? 13 : 12;
  const buttonFontSize = isSmallPhone ? 12 : isTabletOrLargeScreen ? 14 : 13;
  const chevronSize = isSmallPhone ? 18 : 20;

  const getMaterialIconName = (fileType?: string) => {
    const normalized = String(fileType || '').toLowerCase();

    if (normalized.includes('pdf')) return 'document-text-outline';
    if (normalized.includes('video')) return 'videocam-outline';
    if (normalized.includes('word') || normalized.includes('doc'))
      return 'document-outline';
    if (normalized.includes('sheet') || normalized.includes('excel'))
      return 'grid-outline';
    if (
      normalized.includes('presentation') ||
      normalized.includes('powerpoint')
    )
      return 'easel-outline';

    return 'document-outline';
  };

  const renderMaterialItem = ({ item }: { item: Material }) => (
    <TouchableOpacity
      style={[
        styles.materialCard,
        {
          padding: cardPadding,
          maxWidth: isTabletOrLargeScreen ? 900 : '100%',
          alignSelf: 'center',
        },
      ]}
      activeOpacity={0.85}
      onPress={() => onOpenMaterial(item)}
    >
      <View
        style={[
          styles.materialIcon,
          {
            width: iconSize,
            height: iconSize,
            borderRadius: isSmallPhone ? 10 : 12,
            marginRight: isSmallPhone ? 10 : 12,
          },
        ]}
      >
        <Ionicons
          name={getMaterialIconName(item.fileType)}
          size={isSmallPhone ? 20 : 24}
          color="#D32F2F"
        />
      </View>

      <View style={styles.materialInfo}>
        <Text
          style={[styles.materialTitle, { fontSize: titleFontSize }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text style={[styles.materialType, { fontSize: metaFontSize }]}>
          {item.week || 'No week'} • {item.posted || 'No date'}
        </Text>

        {!!item.fileName && (
          <Text
            style={[styles.materialFileName, { fontSize: metaFontSize }]}
            numberOfLines={1}
          >
            {item.fileName}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={chevronSize} color="#BBB" />
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: horizontalPadding,
        },
      ]}
    >
      <View
        style={[
          styles.topActionRow,
          {
            maxWidth: isTabletOrLargeScreen ? 900 : '100%',
            alignSelf: 'center',
            width: '100%',
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              minHeight: isSmallPhone ? 40 : 44,
              paddingHorizontal: isSmallPhone ? 12 : isTabletOrLargeScreen ? 18 : 14,
              paddingVertical: isSmallPhone ? 8 : 10,
            },
          ]}
          onPress={onCreate}
        >
          <Ionicons name="add" size={isSmallPhone ? 16 : 18} color="#FFF" />
          <Text style={[styles.createButtonText, { fontSize: buttonFontSize }]}>
            Create Material
          </Text>
        </TouchableOpacity>
      </View>

      {materials.length > 0 ? (
        <FlatList
          data={materials}
          renderItem={renderMaterialItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: hp('2') }}
        />
      ) : (
        <Text style={[styles.emptyText, { fontSize: isSmallPhone ? 13 : 14 }]}>
          No materials available yet
        </Text>
      )}
    </View>
  );
};

export default TeacherMaterialSection;

const styles = StyleSheet.create({
  container: {
    paddingVertical: hp('2'),
    backgroundColor: '#F5F5F5',
    flex: 1,
  },

  topActionRow: {
    marginBottom: hp('1.5'),
    alignItems: 'flex-start',
  },

  createButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  createButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },

  materialCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: hp('1.5'),
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  materialIcon: {
    backgroundColor: '#FFF1F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  materialInfo: {
    flex: 1,
    minWidth: 0,
  },

  materialTitle: {
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },

  materialType: {
    color: '#999',
  },

  materialFileName: {
    color: '#D32F2F',
    marginTop: 4,
    fontWeight: '600',
  },

  emptyText: {
    textAlign: 'center',
    color: '#777',
    marginTop: 20,
  },
});