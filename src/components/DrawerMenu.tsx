import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';

interface DrawerMenuProps {
  isFixed: boolean;
  onClose?: () => void;
}

const MenuItem = ({ iconSource, label }: { iconSource: any, label: string }) => (
  <TouchableOpacity style={styles.menuItem}>
    <Image source={iconSource} style={styles.menuIcon} />
    <Text style={styles.menuLabel}>{label}</Text>
  </TouchableOpacity>
);

const DrawerMenu = ({ isFixed, onClose }: DrawerMenuProps) => {
  const { width } = useWindowDimensions();

  return (
    <View style={[
      styles.drawerContainer, 
      !isFixed && styles.mobileDrawer
    ]}>
      
      {/* Close Button for Mobile Overlay */}
      {!isFixed && (
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
      )}

      {/* User Profile Section */}
      <View style={styles.profileSection}>
        <Image 
          source={require('../../assets/images/default_profile.png')} 
          style={styles.avatar} 
        />
        <View>
          <Text style={styles.userName}>Jade M. Lisondra</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <MenuItem 
          iconSource={require('../../assets/images/person.png')} 
          label="Profile" 
        />
        <MenuItem 
          iconSource={require('../../assets/images/clipboard.png')} 
          label="Assignments" 
        />
        <MenuItem 
          iconSource={require('../../assets/images/calendar.png')} 
          label="My Journey" 
        />
        <MenuItem 
          iconSource={require('../../assets/images/users-solid.png')} 
          label="Community" 
        />
        <MenuItem 
          iconSource={require('../../assets/images/Analytics.png')} 
          label="Analytics" 
        />
        <MenuItem 
          iconSource={require('../../assets/images/gear-solid.png')} 
          label="Settings" 
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: { 
    width: 260, 
    height: '100%',
    borderRightWidth: 1, 
    borderRightColor: '#EEE', 
    padding: 25, 
    backgroundColor: '#FFF' 
  },
  mobileDrawer: { 
    width: 300, 
    elevation: 10, 
    shadowColor: '#000',
    shadowOffset: { width: 5, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  closeBtn: { 
    marginBottom: 20, 
    alignSelf: 'flex-end',
    padding: 5 
  },
  closeText: { color: '#D32F2F', fontWeight: 'bold' },
  profileSection: { 
    marginBottom: 40, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    marginRight: 15,
    backgroundColor: '#f0f0f0' 
  },
  userName: { 
    fontWeight: '700', 
    fontSize: 18, 
    color: '#333' 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 18 
  },
  menuIcon: { 
    width: 22, 
    height: 22, 
    marginRight: 20, 
    resizeMode: 'contain' 
  },
  menuLabel: { 
    fontSize: 17, 
    color: '#444',
    fontWeight: '500'
  },
});

export default DrawerMenu;