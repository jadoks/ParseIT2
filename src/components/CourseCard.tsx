import React, { useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Assignment, MOCK_ASSIGNMENTS } from '../data/mockAssignments';

interface CourseCardProps {
  title?: string;
  instructor?: string;
  section?: string;
  onPress?: () => void;
  onAssignmentPress?: () => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  title = 'CC112 – Data Structures and Algorithms',
  instructor = 'Prof. Maria L. Santos, MIT',
  section = 'Section A',
  onPress,
  onAssignmentPress,
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;

  const [showAssignments, setShowAssignments] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Dropdown state for triple-dot
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Ref for the triple-dot to position dropdown if needed
  const tripleDotRef = useRef<View>(null);

  const courseAssignments = MOCK_ASSIGNMENTS.filter(a => a.courseName === title);

  // Responsive columns
  let cols: number;
  if (isLargeTablet) cols = 4;
  else if (isTablet) cols = 3;
  else if (width >= 500) cols = 2;
  else cols = 1;

  const horizontalPadding = 16;
  const gap = 16;
  const cardWidth =
    cols === 1
      ? width - horizontalPadding * 2
      : Math.max(
          200,
          Math.floor((width - horizontalPadding * 2 - gap * (cols - 1)) / cols)
        );

  const bannerHeight = isSmallScreen ? 120 : 140;

  const getCourseImage = () => {
    const imageMap: { [key: string]: any } = {
      'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
      'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
      'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
      'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
      'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
      'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
    };
    return imageMap[title] || require('../../assets/parseclass/AP1.jpg');
  };

  return (
    <TouchableWithoutFeedback onPress={() => setDropdownVisible(false)}>
      <View>
        <TouchableOpacity
          style={[styles.card, { width: cardWidth }]}
          activeOpacity={0.9}
          onPress={onPress}
        >
          {/* Banner */}
          <View style={{ height: bannerHeight }}>
            <Image
              source={getCourseImage()}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{title}</Text>
              {section && <Text style={styles.sectionLabel}>{section}</Text>}
              <Text style={styles.bannerInstructor}>{instructor}</Text>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setShowAssignments(!showAssignments)}
              >
                <MaterialCommunityIcons
                  name="clipboard-list-outline"
                  size={22}
                  color="#5f6368"
                />
              </TouchableOpacity>

              {/* Triple-dot for dropdown */}
              <View style={{ position: 'relative', marginLeft: 8 }}>
                <TouchableOpacity
                  onPress={(e) => {
                    setDropdownVisible(!dropdownVisible);
                  }}
                  ref={tripleDotRef}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={22}
                    color="#5f6368"
                  />
                </TouchableOpacity>

                {dropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        Alert.alert('Leave', 'Leave clicked!');
                        setDropdownVisible(false);
                      }}
                    >
                      <MaterialCommunityIcons name="exit-to-app" size={16} color="#fff" />
                      <Text style={styles.menuText}>Leave</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Assignment Modal */}
        {showAssignments && (
          <Modal
            visible={showAssignments}
            animationType="slide"
            transparent
            onRequestClose={() => setShowAssignments(false)}
          >
            <ScrollView contentContainerStyle={modalStyles.container}>
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>
                  Assignments — {title}
                </Text>
                <TouchableOpacity onPress={() => setShowAssignments(false)}>
                  <Text style={modalStyles.close}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={courseAssignments}
                keyExtractor={i => i.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={modalStyles.assignmentCard}
                    onPress={() => setSelectedAssignment(item)}
                  >
                    <Text style={modalStyles.assignmentTitle}>{item.title}</Text>
                    <Text style={modalStyles.assignmentSubtitle}>
                      {item.dueDate} • {item.status}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </ScrollView>
          </Modal>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    borderBottomColor: 'rgba(250, 0, 0, 0.67)',
    borderBottomWidth: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bannerTextContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bannerInstructor: {
    color: '#eee',
    fontSize: 13,
    marginTop: 2,
  },
  cardFooter: {
    padding: 12,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 6,
  },
  dropdownMenu: {
    position: 'absolute',
    marginTop: -40,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 6,
    width: 80,
    elevation: 6,
    borderColor: '#E53935',
    borderWidth: 2,

    zIndex: 999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  menuText: {
    color: '#E53935',
    fontWeight: '600',
    marginLeft: 6,
  },
});

const modalStyles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    fontSize: 20,
    color: '#666',
  },
  assignmentCard: {
    backgroundColor: '#f1f3f4',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  assignmentTitle: {
    fontWeight: '600',
  },
  assignmentSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
  },
});

export default CourseCard;