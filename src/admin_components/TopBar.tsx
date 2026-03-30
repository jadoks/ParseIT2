import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TopBarProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
  onLogout: () => void;
}

export const TopBar = ({ activeTab, onTabChange, onLogout }: TopBarProps) => {
  const tabs = ['Dashboard', 'Admin', 'Students', 'Teacher'];

  return (
    <View style={styles.container}>
      {/* 1. LEFT SPACER (to keep tabs centered) */}
      <View style={styles.sideSection} />

      {/* 2. CENTERED TABS */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity 
              key={tab} 
              onPress={() => onTabChange(tab)} 
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <Text style={isActive ? styles.activeTabText : styles.tabText}>
                {tab}
              </Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. RIGHT SECTION (Profile & Logout) */}
      <View style={styles.sideSection}>
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Icon name="bell-outline" size={22} color="#94A3B8" />
            <View style={styles.badge} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.profileBox} onPress={onLogout}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>CL</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    height: 80, 
    flexDirection: 'row',
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', // Pure White
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9', // Very light slate border
    paddingHorizontal: 30
  },
  sideSection: {
    width: 200, 
  },
  tabContainer: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: { 
    marginHorizontal: 45, 
    paddingVertical: 10, 
    alignItems: 'center',
    position: 'relative'
  },
  tabText: { 
    color: '#94A3B8', // Muted Slate grey
    fontSize: 18, 
    fontWeight: '600' 
  },
  activeTabText: { 
    color: '#1E293B', // Deep Slate for active text
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  indicator: { 
    position: 'absolute', 
    bottom: -12, 
    width: 40, 
    height: 4, 
    backgroundColor: '#ff4d4d', 
    borderRadius: 2 
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconBtn: {
    marginRight: 25,
    position: 'relative'
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    backgroundColor: '#ff4d4d',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFF'
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12, // Modern "Squircle" Look
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatarText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: 'bold',
  }
});