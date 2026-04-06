import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const studentData = [
  { id: 'S-1024', name: 'Alex Johnson', subject: 'IAS', score: '88%', status: 'Excellent', img: 'https://i.pravatar.cc/150?u=alex' },
  { id: 'S-1025', name: 'Maria Garcia', subject: 'Capstone', score: '92%', status: 'Excellent', img: 'https://i.pravatar.cc/150?u=maria' },
  { id: 'S-1026', name: 'Kevin Smith', subject: 'IOT', score: '74%', status: 'Average', img: 'https://i.pravatar.cc/150?u=kevin' },
];

export const StudentTable = () => {
  return (
    <View style={styles.container}>
      {/* TABLE HEADER - Lightened to match the chart background */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerLabel, { flex: 1 }]}>ID</Text>
        <Text style={[styles.headerLabel, { flex: 2 }]}>FULL NAME</Text>
        <Text style={[styles.headerLabel, { flex: 1.5 }]}>SUBJECT</Text>
        <Text style={[styles.headerLabel, { flex: 1 }]}>SCORE</Text>
        <Text style={[styles.headerLabel, { flex: 1.2, textAlign: 'center' }]}>STATUS</Text>
      </View>

      {/* TABLE ROWS */}
      {studentData.map((item, index) => (
        <View key={item.id} style={[styles.row, index === studentData.length - 1 && { borderBottomWidth: 0 }]}>
          <Text style={[styles.idText, { flex: 1 }]}>{item.id}</Text>
          
          <View style={[styles.userInfo, { flex: 2 }]}>
            <Image source={{ uri: item.img }} style={styles.avatar} />
            <Text style={styles.userName}>{item.name}</Text>
          </View>
          
          <Text style={[styles.subjectText, { flex: 1.5 }]}>{item.subject}</Text>
          
          <Text style={[styles.scoreText, { flex: 1 }]}>{item.score}</Text>
          
          <View style={[styles.statusCell, { flex: 1.2 }]}>
            <Text style={[
              styles.statusText,
              item.status === 'Excellent' ? styles.statusTextExcellent : styles.statusTextAverage
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 12, // Slightly smoother corners like the chart
    borderWidth: 1.5,
    borderColor: '#E2E8F0', // Matched to the subtle grey border in the image
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    margin: 10,
  },
  
  tableHeader: { 
    flexDirection: 'row', 
    paddingVertical: 22, // Increased padding for better visibility
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFC', // Off-white/Ghost grey from the chart background
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLabel: { 
    color: '#475569', // Darker text for better visibility on light background
    fontSize: 13, 
    fontWeight: '800', 
    letterSpacing: 0.5,
  },
  
  row: { 
    flexDirection: 'row', 
    paddingVertical: 20, // Increased row height for "Enhanced" look
    paddingHorizontal: 18, 
    alignItems: 'center', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9' 
  },

  idText: { 
    color: '#64748B', 
    fontSize: 14, 
    fontWeight: '600' 
  },
  userInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatar: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    marginRight: 12, 
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  userName: { 
    color: '#1E293B', 
    fontWeight: '700', 
    fontSize: 15 // Made bigger
  },
  subjectText: { 
    color: '#475569', 
    fontSize: 14,
    fontWeight: '500'
  },
  scoreText: { 
    color: '#334155', // Neutral dark grey for better readability
    fontSize: 16, 
    fontWeight: '800' 
  },
  
  statusCell: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  statusText: { 
    fontSize: 14, 
    fontWeight: '700',
    letterSpacing: 0.3
  },
  statusTextExcellent: { 
    color: '#10B981' // Green to match a "positive" score like the Capstone bar
  },
  statusTextAverage: { 
    color: '#F59E0B' // Amber/Yellow to match the "Arts" bar
  }
});