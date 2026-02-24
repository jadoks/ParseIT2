import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const YEARS = ['2023 - 2024', '2024 - 2025', '2025 - 2026'];
const SEMS = ['First Semester', 'Second Semester', 'Summer'];

const SAMPLE_COURSES = [
  { subject: 'MATH101', description: 'Algebra I', unit: 3, grade: '88' },
  { subject: 'ENG101', description: 'English Composition', unit: 3, grade: '91' },
  { subject: 'CS101', description: 'Intro to Programming', unit: 4, grade: '95' },
];

const MyJourney = () => {
  const [year, setYear] = useState(YEARS[2]);
  const [sem, setSem] = useState(SEMS[0]);
  const [show, setShow] = useState(false);

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20 }}
      style={{ flex: 1, backgroundColor: '#f5f5f7' }}
    >
      <Text style={styles.pageTitle}>My Journey</Text>

      <View style={styles.controlsRow}>
        {/* Academic Year Dropdown */}
        <View style={styles.selectWrap}>
          <Text style={styles.selectLabel}>Academic Year</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={year}
              onValueChange={(itemValue) => setYear(itemValue)}
              style={styles.picker}
            >
              {YEARS.map((y) => (
                <Picker.Item key={y} label={y} value={y} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Semester Dropdown */}
        <View style={styles.selectWrap}>
          <Text style={styles.selectLabel}>Semester</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={sem}
              onValueChange={(itemValue) => setSem(itemValue)}
              style={styles.picker}
            >
              {SEMS.map((s) => (
                <Picker.Item key={s} label={s} value={s} />
              ))}
            </Picker>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.showBtn}
        onPress={() => setShow(true)}
      >
        <Text style={{ color: '#fff', fontWeight: '700' }}>
          Show My Journey
        </Text>
      </TouchableOpacity>

      {show && (
        <View style={styles.paper}>
          <Image
            source={require('../../assets/images/myjourney-header-template-1.png')}
            style={styles.headerImage}
          />

          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Student ID:</Text>
            <Text style={styles.infoValue}>2025-00123</Text>

            <Text style={[styles.infoLabel, { marginTop: 12 }]}>
              Student Name:
            </Text>
            <Text style={styles.infoValue}>Jade M. Lisondra</Text>

            <Text style={[styles.infoLabel, { marginTop: 12 }]}>
              School Year:
            </Text>
            <Text style={styles.infoValue}>
              S.Y. {year} ({sem})
            </Text>
          </View>

          <View style={styles.tableWrap}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.td, styles.th]}>Subject</Text>
              <Text style={[styles.td, styles.th]}>Description</Text>
              <Text style={[styles.td, styles.th]}>Unit</Text>
              <Text style={[styles.td, styles.th]}>Grade</Text>
            </View>

            {SAMPLE_COURSES.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.td}>{c.subject}</Text>
                <Text style={styles.td}>{c.description}</Text>
                <Text style={styles.td}>{String(c.unit)}</Text>
                <Text style={styles.td}>{c.grade}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.linkBtn}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              Get Link
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  selectWrap: {
    flex: 1,
    maxWidth: 180,
  },

  selectLabel: {
    color: '#666',
    marginBottom: 6,
    paddingHorizontal: 4,
  },

  pickerWrapper: {
  overflow: 'hidden',
  paddingRight: 18,
},

  picker: {
    height: 50,
    borderRadius: 15,
    paddingLeft: 8, 
    width: '100%',    
  },

  showBtn: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 18,
  },

  paper: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
  },

  headerImage: {
    width: '100%',
    height: 90,
    resizeMode: 'contain',
    marginBottom: 12,
  },

  infoCol: {
    marginBottom: 12,
  },

  infoLabel: {
    color: '#666',
    fontWeight: '600',
  },

  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },

  tableWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 6,
    overflow: 'hidden',
  },

  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
  },

  tableHeader: {
    backgroundColor: '#fafafa',
  },

  td: {
    flex: 1,
    fontSize: 14,
    color: '#222',
  },

  th: {
    fontWeight: '700',
    color: '#444',
  },

  linkBtn: {
    marginTop: 16,
    alignSelf: 'flex-end',
    backgroundColor: '#1976d2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
});

export default MyJourney;