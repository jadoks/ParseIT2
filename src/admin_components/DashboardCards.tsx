import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const DashboardCards = () => {
  return (
    <View style={styles.grid}>
      <ManageCard title="Manage Admin" sub="34 Active Administrators" icon="account-cog-outline" />
      <ManageCard title="Create Groupchat" sub="Departmental communication hubs" icon="chat-outline" />
      
      {/* Manage Chatbot now starts white/gray like the others */}
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

const ManageCard = ({ title, sub, icon, isSpecial }: any) => {
  const isGroupChat = title === "Create Groupchat";

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
            {/* UPDATED: Chatbot buttons now start white and turn red on press */}
            <TouchableOpacity 
              style={styles.btnSpecial} 
              activeOpacity={0.7}
            >
              <Text style={styles.btnSpecialText}>Train</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.btnSpecial} 
              activeOpacity={0.7}
            >
              <Text style={styles.btnSpecialText}>Modify</Text>
            </TouchableOpacity>
          </>
        ) : isGroupChat ? (
          <>
            <TouchableOpacity style={styles.miniBtn}><Text style={styles.miniBtnText}>1st</Text></TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn}><Text style={styles.miniBtnText}>2nd</Text></TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn}><Text style={styles.miniBtnText}>3rd</Text></TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn}><Text style={styles.miniBtnText}>4th</Text></TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.miniBtn}><Text style={styles.miniBtnText}>+ Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn}>
              <Icon name="eye-outline" size={16} color="#64748B" />
              <Text style={styles.miniBtnText}> View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn}>
              <Icon name="delete-outline" size={16} color="#ff4d4d" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
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
  
  // Standard Button Style
  miniBtn: { 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 10, 
    borderRadius: 8, 
    flex: 1, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  miniBtnText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  
  // UPDATED: Chatbot Button Style (Starts white, borders like others)
  btnSpecial: { 
    backgroundColor: '#F8FAFC', 
    paddingVertical: 10, 
    borderRadius: 8, 
    flex: 1, 
    marginHorizontal: 4, 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  btnSpecialText: { color: '#64748B', fontSize: 12, fontWeight: '700' },

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