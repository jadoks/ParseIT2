import React, { useState } from 'react';
import { StyleSheet, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Added interface for the props
interface DashboardCardsProps {
  onOpenAddAdmin: () => void;
}

export const DashboardCards = ({ onOpenAddAdmin }: DashboardCardsProps) => {
  return (
    <View style={styles.grid}>
      {/* Pass the trigger to the Manage Admin card */}
      <ManageCard 
        title="Manage Admin" 
        sub="34 Active Administrators" 
        icon="account-cog-outline" 
        onAddPress={onOpenAddAdmin} 
      />
      
      <ManageCard title="Create Groupchat" sub="Departmental communication hubs" icon="chat-outline" />
      <ManageCard title="Manage Chatbot" sub="AI Tutor Training & Configuration" icon="robot-outline" isSpecial />
      <ManageCard title="Manage Student" sub="1,248 Undergraduate students" icon="school-outline" />
      <ManageCard title="Manage Teacher" sub="86 Registered Faculty members" icon="account-tie-outline" />
      
      <TouchableOpacity style={styles.addCard} activeOpacity={0.6}>
        <Icon name="plus" size={30} color="#CBD5E1" />
        <Text style={styles.addCardText}>Add New Resource</Text>
      </TouchableOpacity>
    </View>
  );
};

const ManageCard = ({ title, sub, icon, isSpecial, onAddPress }: any) => {
  const isGroupChat = title === "Create Groupchat";
  const isManageAdmin = title === "Manage Admin";

  // INTERNAL COMPONENT: Now properly handles the onPress prop
  const ActionButton = ({ children, isDelete, onPress }: { children: any, isDelete?: boolean, onPress?: () => void }) => {
    const [isPressed, setIsPressed] = useState(false);

    return (
      <TouchableHighlight
        style={[styles.miniBtn, isPressed && styles.btnPressed]}
        underlayColor="#FF4D4D" 
        onHideUnderlay={() => setIsPressed(false)}
        onShowUnderlay={() => setIsPressed(true)}
        onPress={onPress || (() => {})} // Executes the passed function
      >
        <View style={styles.btnContent}>
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              const element = child as React.ReactElement<any>;
              return React.cloneElement(element, { 
                color: isPressed ? "#FFF" : (element.props.color || (isDelete ? "#ff4d4d" : "#64748B")) 
              });
            }
            if (typeof child === 'string') {
              return <Text style={[styles.miniBtnText, isPressed && styles.textWhite]}>{child}</Text>;
            }
            return child;
          })}
        </View>
      </TouchableHighlight>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconBox}>
          <Icon name={icon} size={22} color="#ff4d4d" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{sub}</Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        {isSpecial ? (
          <>
            <ActionButton>Train</ActionButton>
            <ActionButton>Modify</ActionButton>
          </>
        ) : isGroupChat ? (
          <>
            <ActionButton>1st</ActionButton>
            <ActionButton>2nd</ActionButton>
            <ActionButton>3rd</ActionButton>
            <ActionButton>4th</ActionButton>
          </>
        ) : (
          <>
            {/* Logic: If it's the Admin card, trigger the modal function */}
            <ActionButton onPress={isManageAdmin ? onAddPress : undefined}>
                + Add
            </ActionButton>
            
            <ActionButton>
              <Icon name="eye-outline" size={16} />
              <Text> View</Text>
            </ActionButton>
            
            {!isManageAdmin && (
              <ActionButton isDelete>
                <Icon name="delete-outline" size={16} />
              </ActionButton>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    backgroundColor: '#FFFFFF', 
    width: '31%', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9', 
  },
  cardHeader: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  cardIconBox: { 
    width: 44, 
    height: 44, 
    backgroundColor: '#FFF5F5', 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cardTitle: { color: '#1E293B', fontWeight: 'bold', fontSize: 16 },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 5 },
  miniBtn: { 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 10, 
    borderRadius: 8, 
    flex: 1, 
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden'
  },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnPressed: { borderColor: '#FF4D4D' },
  miniBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  textWhite: { color: '#FFF' },
  addCard: { 
    width: '31%', 
    height: 145, 
    borderStyle: 'dashed', 
    borderWidth: 2, 
    borderColor: '#E2E8F0', 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'transparent'
  },
  addCardText: { color: '#94A3B8', fontWeight: '700', marginTop: 12, fontSize: 14 },
});