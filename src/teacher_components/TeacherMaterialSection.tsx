import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { Material } from './TeacherCourseDetail2';

type Props = {
  materials: Material[];
  onCreate: () => void;
  onOpenMaterial: (material: Material) => void;
};

const TeacherMaterialSection = ({ materials, onCreate, onOpenMaterial }: Props) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.createBtn} onPress={onCreate}>
        <Text style={styles.createBtnText}>+ Create Material</Text>
      </TouchableOpacity>

      {materials.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.moduleCardWide}
          activeOpacity={0.85}
          onPress={() => onOpenMaterial(item)}
        >
          <View style={styles.redLeftAccent} />
          <View style={styles.cardContent}>
            <View style={styles.iconBackground}>
              <MaterialCommunityIcons name="book-open-variant" size={32} color="#000" />
            </View>

            <View style={styles.materialInfo}>
              <Text style={styles.weekTitle}>{item.week}</Text>
              <Text style={styles.materialTitle}>{item.title}</Text>
              <Text style={styles.dateText}>Posted: {item.posted}</Text>
              {!!item.fileName && <Text style={styles.openHint}>File: {item.fileName}</Text>}
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

export default TeacherMaterialSection;

const styles = StyleSheet.create({
  scrollContent: {
    padding: 25,
    alignItems: 'flex-start',
  },
  createBtn: {
    backgroundColor: '#C62828',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 30,
  },
  createBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  moduleCardWide: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 15,
    minHeight: 110,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
    marginBottom: 15,
    width: '48%',
    alignSelf: 'flex-start',
  },
  redLeftAccent: { width: 4, height: '100%', backgroundColor: '#C62828' },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  iconBackground: {
    width: 55,
    height: 55,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 25,
  },
  materialInfo: { flex: 1 },
  weekTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  materialTitle: { fontSize: 15, color: '#111', fontWeight: '600', marginTop: 4 },
  dateText: { fontSize: 12, color: '#777', marginTop: 6 },
  openHint: {
    fontSize: 12,
    color: '#C62828',
    marginTop: 8,
    fontWeight: '600',
  },
});