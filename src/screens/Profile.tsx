import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const Profile = () => {
  return (
    <ScrollView contentContainerStyle={{ padding: 20 }} style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={{ position: 'relative' }}>
            <Image source={require('../../assets/images/default_profile.png')} style={styles.avatar} />
          </TouchableOpacity>
          <Text style={styles.name}>Jade M. Lisondra</Text>
          <View style={styles.emailRow}>
            <Text style={styles.emailIcon}>✉️</Text>
            <Text style={styles.email}>jade.lisondra@gmail.com</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.rowLabel}>Student ID</Text>
          <Text style={styles.rowValue}>2025-00123</Text>

          <Text style={[styles.rowLabel, { marginTop: 12 }]}>School Year</Text>
          <Text style={styles.rowValue}>S.Y. 2025 - 2026 (First Semester)</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 18 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#eee' },
  name: { marginTop: 12, fontSize: 20, fontWeight: '700' },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  emailIcon: { marginRight: 8 },
  email: { color: '#666' },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  rowLabel: { color: '#666', fontWeight: '600' },
  rowValue: { fontSize: 15, fontWeight: '700', color: '#222' },
});

export default Profile;
