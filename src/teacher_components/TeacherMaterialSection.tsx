import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Material } from './TeacherCourseDetail2';

type Props = {
  materials: Material[];
  onCreate: () => void;
  onOpenMaterial: (material: Material) => void;
};

const TeacherMaterialSection = ({ materials, onCreate, onOpenMaterial }: Props) => {
  const { width } = useWindowDimensions();

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;

  const pagePadding = isMobile ? 14 : isTablet ? 20 : 24;
  const cardWidth = isMobile ? '100%' : isLargeScreen ? '48.8%' : '48.5%';

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { paddingHorizontal: pagePadding, paddingTop: 18, paddingBottom: 30 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={[
          styles.createBtn,
          {
            paddingHorizontal: isMobile ? 16 : 18,
            paddingVertical: isMobile ? 11 : 12,
            borderRadius: 14,
            marginBottom: isMobile ? 18 : 22,
          },
        ]}
        onPress={onCreate}
      >
        <Text style={styles.createBtnText}>+ Create Material</Text>
      </TouchableOpacity>

      <View style={styles.materialGrid}>
        {materials.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.moduleCardWide,
              {
                width: cardWidth,
                minHeight: isMobile ? 108 : 118,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => onOpenMaterial(item)}
          >
            <View style={styles.redLeftAccent} />

            <View
              style={[
                styles.cardContent,
                {
                  paddingHorizontal: isMobile ? 14 : 18,
                  paddingVertical: isMobile ? 14 : 18,
                },
              ]}
            >
              <View
                style={[
                  styles.iconBackground,
                  {
                    width: isMobile ? 48 : 54,
                    height: isMobile ? 48 : 54,
                    borderRadius: 12,
                    marginRight: isMobile ? 14 : 18,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="book-open-variant"
                  size={isMobile ? 26 : 30}
                  color="#000"
                />
              </View>

              <View style={styles.materialInfo}>
                <Text
                  style={[
                    styles.weekTitle,
                    { fontSize: isMobile ? 16 : 18 },
                  ]}
                >
                  {item.week}
                </Text>

                <Text
                  style={[
                    styles.materialTitle,
                    { fontSize: isMobile ? 14 : 15 },
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.dateText,
                    { fontSize: isMobile ? 11 : 12 },
                  ]}
                >
                  Posted: {item.posted}
                </Text>

                {!!item.fileName && (
                  <Text
                    style={[
                      styles.openHint,
                      { fontSize: isMobile ? 11 : 12 },
                    ]}
                    numberOfLines={1}
                  >
                    File: {item.fileName}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

export default TeacherMaterialSection;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 30,
  },

  createBtn: {
    backgroundColor: '#D32F2F',
    alignSelf: 'flex-start',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  createBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    width: '100%',
  },

  moduleCardWide: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
    marginBottom: 2,
  },

  redLeftAccent: {
    width: 4,
    height: '100%',
    backgroundColor: '#D32F2F',
  },

  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconBackground: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  materialInfo: {
    flex: 1,
  },

  weekTitle: {
    fontWeight: '700',
    color: '#222',
  },

  materialTitle: {
    color: '#111',
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 20,
  },

  dateText: {
    color: '#777',
    marginTop: 6,
  },

  openHint: {
    color: '#D32F2F',
    marginTop: 8,
    fontWeight: '600',
  },
});