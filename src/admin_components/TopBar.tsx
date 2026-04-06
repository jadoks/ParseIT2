import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface TopBarProps {
  activeTab: string;
  onTabChange: (tabName: string) => void;
  onLogout: () => void;
}

export const TopBar = ({ activeTab, onTabChange }: TopBarProps) => {
  const tabs = [
    { name: 'Dashboard', icon: 'view-dashboard-outline' },
    { name: 'Admin', icon: 'shield-check-outline' },
    { name: 'Students', icon: 'school-outline' },
    { name: 'Teacher', icon: 'account-tie-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <TouchableOpacity 
              key={tab.name} 
              onPress={() => onTabChange(tab.name)} 
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Icon 
                  name={tab.icon} 
                  size={22} 
                  color={isActive ? "#1E293B" : "#94A3B8"} 
                  style={styles.tabIcon}
                />
                <Text style={isActive ? styles.activeTabText : styles.tabText}>
                  {tab.name}
                </Text>
              </View>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    height: 80, 
    flexDirection: 'row',
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', // Reverted to White
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9', 
    paddingHorizontal: 10
  },
  tabContainer: { 
    flex: 1, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around', 
  },
  tabItem: { 
    paddingVertical: 10, 
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    flex: 1, 
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabIcon: {
    marginRight: 10,
  },
  tabText: { 
    color: '#94A3B8', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  activeTabText: { 
    color: '#1E293B', // Dark slate for better contrast on white
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  indicator: { 
    position: 'absolute', 
    bottom: -15, 
    width: '60%', 
    height: 4, 
    backgroundColor: '#ff4d4d', // Keeping the red indicator to match sidebar
    borderRadius: 2 
  },
});