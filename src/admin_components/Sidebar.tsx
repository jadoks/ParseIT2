import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SidebarProps {
  onLogout: () => void;
  // onTabChange and activeTab are kept in props to avoid breaking AdminApp, 
  // even if not used for direct navigation here.
  onTabChange?: (tab: string) => void;
  activeTab: string;
}

export const Sidebar = ({ onLogout, onTabChange, activeTab }: SidebarProps) => {
  return (
    <View style={styles.container}>
      {/* LOGO SECTION */}
      <View style={styles.header}>
        <Icon name="pulse" size={28} color="#ff4d4d" />
        <Text style={styles.logo}>PasersHub 2.0</Text>
      </View>

      {/* CLUSTERS SECTION HEADER */}
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>MY CLUSTERS</Text>
        <TouchableOpacity 
          onPress={() => console.log("Add Cluster Pressed")}
          activeOpacity={0.5}
        >
          <Text style={styles.addPlusText}>+</Text>
        </TouchableOpacity>
      </View>
      
      {/* 4B - Laravel (Active State) */}
      <TouchableOpacity style={styles.clusterActive}>
        <Icon name="view-grid" size={18} color="#fff" />
        <Text style={styles.clusterActiveText}>4B - Laravel</Text>
      </TouchableOpacity>
      
      <NavItem icon="xml" title="3B - Java" />
      <NavItem icon="chart-timeline-variant" title="2A - Algorithm" />
      <NavItem icon="microsoft-windows" title="1A - Microsoft" />

      {/* SYSTEM SECTION */}
      <Text style={[styles.label, {marginTop: 35, paddingHorizontal: 0}]}>SYSTEM</Text>
      <NavItem icon="cog-outline" title="Settings" />

      {/* SIGN OUT BUTTON */}
      <TouchableOpacity 
        style={styles.signOut} 
        onPress={onLogout}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Icon name="logout-variant" size={22} color="#ff4d4d" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const NavItem = ({ icon, title }: any) => (
  <TouchableOpacity style={styles.navItem} activeOpacity={0.6}>
    <Icon name={icon} size={20} color="#94A3B8" />
    <Text style={styles.navText}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { 
    width: 260, 
    backgroundColor: '#FFFFFF', 
    padding: 25, 
    height: '100%', 
    borderRightWidth: 1, 
    borderRightColor: '#F1F5F9',
    zIndex: 100, 
    elevation: 10,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 40,
    marginTop: 10
  },
  logo: { 
    color: '#1E293B', 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginLeft: 12 
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  label: { 
    color: '#CBD5E1', 
    fontSize: 11, 
    fontWeight: '900', 
    letterSpacing: 1.5
  },
  addPlusText: {
    color: '#ff4d4d',
    fontSize: 18,
    fontWeight: '900',
    paddingHorizontal: 5,
  },
  clusterActive: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ff4d4d', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 12,
    shadowColor: '#ff4d4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4
  },
  clusterActiveText: { 
    color: '#fff', 
    fontWeight: '700', 
    marginLeft: 12,
    fontSize: 14
  },
  navItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    marginBottom: 5,
    borderRadius: 10
  },
  navText: { 
    color: '#64748B', 
    marginLeft: 12, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  signOut: { 
    position: 'absolute', 
    bottom: 50, 
    left: 25, 
    flexDirection: 'row', 
    alignItems: 'center',
    padding: 10,
    zIndex: 999,
    ...Platform.select({
      web: { cursor: 'pointer' }
    })
  },
  signOutText: { 
    color: '#ff4d4d', 
    fontSize: 15, 
    fontWeight: '600',
    marginLeft: 15 
  }
});