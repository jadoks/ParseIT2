import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SidebarProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
  clusters: any[]; 
}

export const Sidebar = ({ onLogout, onTabChange, activeTab, clusters = [] }: SidebarProps) => {
  
  const sortedClusters = Array.isArray(clusters) 
    ? [...clusters].sort((a, b) => (a.year || 0) - (b.year || 0)) 
    : [];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="pulse" size={28} color="#ff4d4d" />
        <Text style={styles.logo}>PasersHub 2.0</Text>
      </View>

      {/* Cluster Label - Plus Button Removed */}
      <View style={styles.labelContainer}>
        <Text style={styles.label}>MY CLUSTERS</Text>
      </View>

      {/* Cluster List */}
      <View style={styles.clusterListWrapper}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {sortedClusters.length === 0 ? (
            <Text style={styles.noClustersText}>
              No clusters added yet.
            </Text>
          ) : (
            sortedClusters.map((cluster, index) => {
              const isActive = activeTab === cluster.title;
              const showYearLabel = index === 0 || sortedClusters[index - 1].year !== cluster.year;

              return (
                <View key={cluster.id}>
                  {showYearLabel && (
                    <Text style={styles.yearDivider}>
                      {cluster.year}{cluster.year === 1 ? 'ST' : cluster.year === 2 ? 'ND' : cluster.year === 3 ? 'RD' : 'TH'} YEAR
                    </Text>
                  )}
                  <TouchableOpacity 
                    style={[styles.clusterItem, isActive && styles.clusterActive]}
                    onPress={() => onTabChange(cluster.title)}
                  >
                    <Icon name={cluster.icon || 'folder'} size={18} color={isActive ? "#fff" : "#94A3B8"} />
                    <Text style={[styles.clusterText, isActive && styles.clusterActiveText]}>
                      {cluster.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* System Section */}
      <View style={styles.systemSection}>
        <View style={styles.separator} /> 
        <Text style={styles.label}>SYSTEM</Text>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'Settings' && styles.activeNavItem]} 
          onPress={() => onTabChange('Settings')}
        >
          <Icon name="cog-outline" size={20} color={activeTab === 'Settings' ? "#ff4d4d" : "#94A3B8"} />
          <Text style={[styles.navText, activeTab === 'Settings' && styles.activeNavText]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOut} onPress={onLogout}>
        <Icon name="logout" size={22} color="#ff4d4d" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: 260, backgroundColor: '#FFFFFF', padding: 25, height: '100%', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, marginTop: 10 },
  logo: { color: '#1E293B', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  labelContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  label: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15 },
  noClustersText: { color: '#94A3B8', fontSize: 12, fontStyle: 'italic', marginLeft: 5 },
  clusterListWrapper: { maxHeight: 350 }, 
  yearDivider: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 15, marginBottom: 10, marginLeft: 5 },
  clusterItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 4 },
  clusterActive: { backgroundColor: '#ff4d4d' },
  clusterText: { color: '#64748B', fontWeight: '500', marginLeft: 12, fontSize: 14 },
  clusterActiveText: { color: '#fff', fontWeight: '700' },
  systemSection: { marginTop: 20 },
  separator: { height: 3, backgroundColor: '#FFCACA', marginBottom: 20, width: '100%', borderRadius: 2 },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10 },
  activeNavItem: { backgroundColor: '#FFF5F5' },
  navText: { color: '#64748B', marginLeft: 12, fontSize: 14, fontWeight: '500' },
  activeNavText: { color: '#ff4d4d', fontWeight: '700' },
  signOut: { position: 'absolute', bottom: 50, left: 25, flexDirection: 'row', alignItems: 'center' },
  signOutText: { color: '#ff4d4d', fontSize: 15, fontWeight: '600', marginLeft: 15 },
});