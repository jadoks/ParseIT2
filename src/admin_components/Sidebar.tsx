import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SidebarProps {
  onLogout: () => void;
  onTabChange: (tab: string) => void;
  activeTab: string;
}

export const Sidebar = ({ onLogout, onTabChange, activeTab }: SidebarProps) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="pulse" size={28} color="#ff4d4d" />
        <Text style={styles.logo}>PasersHub 2.0</Text>
      </View>

      {/* System Section */}
      <View style={styles.systemSection}>
        <View style={styles.separator} /> 
        <Text style={styles.label}>SYSTEM</Text>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'Settings' && styles.activeNavItem]} 
          onPress={() => onTabChange('Settings')}
        >
          <Icon 
            name="cog-outline" 
            size={20} 
            color={activeTab === 'Settings' ? "#ff4d4d" : "#94A3B8"} 
          />
          <Text style={[styles.navText, activeTab === 'Settings' && styles.activeNavText]}>
            Settings
          </Text>
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
  container: { 
    width: 260, 
    backgroundColor: '#FFFFFF', 
    padding: 25, 
    height: '100%', 
    borderRightWidth: 1, 
    borderRightColor: '#F1F5F9' 
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
  label: { 
    color: '#CBD5E1', 
    fontSize: 11, 
    fontWeight: '900', 
    letterSpacing: 1.5, 
    marginBottom: 15 
  },
  systemSection: { 
    marginTop: 20 
  },
  separator: { 
    height: 3, 
    backgroundColor: '#FFCACA', 
    marginBottom: 20, 
    width: '100%', 
    borderRadius: 2 
  },
  navItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    borderRadius: 10 
  },
  activeNavItem: { 
    backgroundColor: '#FFF5F5' 
  },
  navText: { 
    color: '#64748B', 
    marginLeft: 12, 
    fontSize: 14, 
    fontWeight: '500' 
  },
  activeNavText: { 
    color: '#ff4d4d', 
    fontWeight: '700' 
  },
  signOut: { 
    position: 'absolute', 
    bottom: 50, 
    left: 25, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  signOutText: { 
    color: '#ff4d4d', 
    fontSize: 15, 
    fontWeight: '600', 
    marginLeft: 15 
  },
});