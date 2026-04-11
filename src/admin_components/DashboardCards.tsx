import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface DashboardCardsProps {
  onOpenAddAdmin: () => void;
}

interface ClassItem {
  id: string;
  courseCode: string;
  courseName: string;
  sections: string[];
  semester: string;
  instructor: string;
  banner: string;
}

interface SchoolYear {
  id: string;
  label: string;
  isActive: boolean;
}

// ==================== YOUR ORIGINAL DATA ====================
const adminsList = [
  { id: "ADM-9921", name: "Jonathan Vercetti", email: "jvercetti@pasershub.com" },
  { id: "ADM-8842", name: "Sarah Montgomery", email: "s.montgomery@pasershub.com" },
  { id: "ADM-7731", name: "Marcus Thorne", email: "m.thorne@pasershub.com" },
  { id: "ADM-6621", name: "Elena Rodriguez", email: "e.rodriguez@pasershub.com" },
  { id: "ADM-5542", name: "David Chen", email: "d.chen@pasershub.com" },
  { id: "ADM-4431", name: "Sophia Williams", email: "s.williams@pasershub.com" },
  { id: "ADM-3321", name: "Liam Anderson", email: "l.anderson@pasershub.com" },
];

const studentsList = [
  { id: "#102931", name: "Alexander Wright", email: "a.wright@univ.edu", program: "BSCS - 4B" },
  { id: "#102945", name: "Elena Rodriguez", email: "e.rodriguez@univ.edu", program: "BSIT - 3B" },
  { id: "#102958", name: "Marcus Thorne", email: "m.thorne@univ.edu", program: "BSDS - 2A" },
  { id: "#102960", name: "Sarah Jenkins", email: "s.jenkins@univ.edu", program: "BSCS - 1A" },
  { id: "#102965", name: "David Miller", email: "d.miller@univ.edu", program: "BSIT - 2C" },
  { id: "#102970", name: "Sophia Chen", email: "s.chen@univ.edu", program: "BSDS - 4B" },
  { id: "#102975", name: "Liam Wilson", email: "l.wilson@univ.edu", program: "BSCS - 3A" },
  { id: "#102980", name: "Olivia Brown", email: "o.brown@univ.edu", program: "BSIT - 1B" },
  { id: "#102985", name: "Noah Davis", email: "n.davis@univ.edu", program: "BSDS - 3C" },
  { id: "#102990", name: "Emma Garcia", email: "e.garcia@univ.edu", program: "BSCS - 2B" },
];

const teachersList = [
  { id: "T-88210", name: "Dr. Elena Rodriguez", email: "e.rodriguez@univ.edu", subject: "Advanced Mathematics" },
  { id: "T-88245", name: "Prof. Marcus Thorne", email: "m.thorne@univ.edu", subject: "Data Structures & Alg" },
  { id: "T-88262", name: "Sarah Jenkins", email: "s.jenkins@univ.edu", subject: "Full-Stack Web Dev" },
  { id: "T-88270", name: "Dr. James Wilson", email: "j.wilson@univ.edu", subject: "Cybersecurity" },
  { id: "T-88285", name: "Prof. Linda Chen", email: "l.chen@univ.edu", subject: "Artificial Intelligence" },
  { id: "T-88290", name: "Robert Miller", email: "r.miller@univ.edu", subject: "Database Systems" },
  { id: "T-88310", name: "Dr. Sophia Varga", email: "s.varga@univ.edu", subject: "Cloud Computing" },
  { id: "T-88325", name: "Michael Scott", email: "m.scott@univ.edu", subject: "Management Info Systems" },
  { id: "T-88340", name: "Laura Palmer", email: "l.palmer@univ.edu", subject: "Human Computer Interaction" },
  { id: "T-88355", name: "David Lynch", email: "d.lynch@univ.edu", subject: "Network Engineering" },
];

const classBanners = [
  "https://picsum.photos/id/1/400/200", "https://picsum.photos/id/10/400/200",
  "https://picsum.photos/id/20/400/200", "https://picsum.photos/id/48/400/200",
  "https://picsum.photos/id/60/400/200", "https://picsum.photos/id/119/400/200",
  "https://picsum.photos/id/160/400/200", "https://picsum.photos/id/180/400/200",
  "https://picsum.photos/id/201/400/200", "https://picsum.photos/id/250/400/200"
];

const defaultCourseCodes = [
  "CS101", "CS102", "IT201", "DS301", "MATH10", "ENG20", "HIST01", "SCI50",
  "NET101", "CYB202", "AI303", "DB404", "WEB505", "SOFT101", "DATA202",
  "ALG303", "ARCH404", "OS505", "DISC101", "ETHICS202"
];

const sections = ['1A', '1B', '1C', '2A', '2B', '3A', '3B', '4A', '4B'];
const semesterOptions = ["1st Semester", "2nd Semester"];

// ==================== MAIN COMPONENT ====================
export const DashboardCards = ({ onOpenAddAdmin }: DashboardCardsProps) => {
  // ==================== YOUR ORIGINAL STATES ====================
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [studentModalVisible, setStudentModalVisible] = useState(false);
  const [teacherModalVisible, setTeacherModalVisible] = useState(false);
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [addTeacherModalVisible, setAddTeacherModalVisible] = useState(false);
  const [addAdminModalVisible, setAddAdminModalVisible] = useState(false);

  const [manageClassModalVisible, setManageClassModalVisible] = useState(false);
  const [viewClassModalVisible, setViewClassModalVisible] = useState(false);

  const [selectedBanner, setSelectedBanner] = useState(classBanners[0]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedCourseCode, setGeneratedCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState(semesterOptions[0]);
  const [showSemesterDropdown, setShowSemesterDropdown] = useState(false);
  const [instructor, setInstructor] = useState('');
  const [classesList, setClassesList] = useState<ClassItem[]>([]);

  const [trainModalVisible, setTrainModalVisible] = useState(false);
  const [modifyModalVisible, setModifyModalVisible] = useState(false);

  const [greetingMessage, setGreetingMessage] = useState("Hello! I'm your AI Tutor. How can I help you today?");
  const [knowledgeTopics, setKnowledgeTopics] = useState("Programming, Data Structures, Algorithms, Database Systems, Web Development, Artificial Intelligence, Networking, Cybersecurity");
  const [sampleQuestions, setSampleQuestions] = useState("What is React Hooks?\nExplain time complexity of binary search\nHow does SQL JOIN work?\nWhat is the difference between AI and Machine Learning?");

  // Academic Year States
  const [academicYearModalVisible, setAcademicYearModalVisible] = useState(false);
  const [addSchoolYearModalVisible, setAddSchoolYearModalVisible] = useState(false);
  const [newSchoolYearLabel, setNewSchoolYearLabel] = useState('');
  const [selectedSemester, setSelectedSemester] = useState("1st Semester");
  const [showSemesterSelector, setShowSemesterSelector] = useState(false);

  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([
    { id: '1', label: 'S.Y. 2021 - 2022', isActive: false },
    { id: '2', label: 'S.Y. 2022 - 2023', isActive: false },
    { id: '3', label: 'S.Y. 2023 - 2024', isActive: false },
    { id: '4', label: 'S.Y. 2024 - 2025', isActive: false },
    { id: '5', label: 'S.Y. 2025 - 2026', isActive: false },
    { id: '6', label: 'S.Y. 2026 - 2027', isActive: true },
  ]);

  const activeYear = schoolYears.find(y => y.isActive);

  // ==================== YOUR ORIGINAL USEEFFECT ====================
  useEffect(() => {
    if (manageClassModalVisible) {
      const randomCode = defaultCourseCodes[Math.floor(Math.random() * defaultCourseCodes.length)];
      setGeneratedCourseCode(randomCode);
      setCourseName('');
      setSelectedSections([]);
      setSemester(semesterOptions[0]);
      setInstructor('');
      setSelectedBanner(classBanners[0]);
    }
  }, [manageClassModalVisible]);

  // Academic Year Functions
  const handleAddSchoolYear = () => {
    if (!newSchoolYearLabel.trim()) {
      Alert.alert("Error", "Please enter a school year (e.g. S.Y. 2026 - 2027)");
      return;
    }
    const newYear: SchoolYear = {
      id: Date.now().toString(),
      label: newSchoolYearLabel.trim(),
      isActive: false,
    };
    setSchoolYears([...schoolYears, newYear]);
    setNewSchoolYearLabel('');
    setAddSchoolYearModalVisible(false);
  };

  const handleDeleteSchoolYear = (id: string) => {
    if (schoolYears.length === 1) {
      Alert.alert("Warning", "You must have at least one school year.");
      return;
    }
    setSchoolYears(schoolYears.filter(year => year.id !== id));
  };

  const handleSetActive = (id: string) => {
    const year = schoolYears.find(y => y.id === id);
    if (!year) return;
    setSchoolYears(schoolYears.map(y => ({ ...y, isActive: y.id === id })));
    Alert.alert("School Year Activated", `${year.label}, ${selectedSemester}`, [{ text: "OK" }]);
  };

  // ==================== NEW CONFIRMATION HANDLERS ====================
  const confirmSetActive = (id: string) => {
    const year = schoolYears.find(y => y.id === id);
    if (!year) return;

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to set ${year.label} as the active academic year?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Set It", 
          style: "destructive",
          onPress: () => handleSetActive(id)
        }
      ]
    );
  };

  const confirmDelete = () => {
    if (!activeYear) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${activeYear.label}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Delete", 
          style: "destructive",
          onPress: () => handleDeleteSchoolYear(activeYear.id)
        }
      ]
    );
  };

  // ==================== YOUR ORIGINAL FUNCTIONS ====================
  const toggleSection = (section: string) => {
    if (selectedSections.includes(section)) {
      setSelectedSections(selectedSections.filter(s => s !== section));
    } else {
      setSelectedSections([...selectedSections, section]);
    }
  };

  const handleAddClass = () => {
    if (!courseName.trim() || selectedSections.length === 0 || !instructor.trim()) {
      alert("Please fill all required fields");
      return;
    }
    const newClass: ClassItem = {
      id: `CLS-${Date.now().toString().slice(-6)}`,
      courseCode: generatedCourseCode,
      courseName: courseName.trim(),
      sections: [...selectedSections],
      semester: semester,
      instructor: instructor.trim(),
      banner: selectedBanner,
    };
    setClassesList([...classesList, newClass]);
    setManageClassModalVisible(false);
  };

  const handleTrainChatbot = () => {
    alert("✅ Chatbot has been successfully trained!");
    setTrainModalVisible(false);
  };

  const handleSaveModifications = () => {
    alert("✅ Chatbot modifications saved successfully!");
    setModifyModalVisible(false);
  };

  return (
    <View style={styles.grid}>
      {/* Row 1 */}
      <ManageCard 
        title="Set Up Academic Year" 
        sub={activeYear ? activeYear.label : "No S.Y. yet"} 
        icon="calendar-month" 
        onAddPress={() => setAcademicYearModalVisible(true)}
        isAcademicYear={true}
      />

      <ManageCard 
        title="Manage Admin" 
        sub="34 Active Administrators" 
        icon="account-cog-outline" 
        onAddPress={() => setAddAdminModalVisible(true)}
        onViewPress={() => setAdminModalVisible(true)}
      />
      
      <ManageCard 
        title="Manage Class" 
        sub="Create and manage student classes" 
        icon="school-outline" 
        onAddPress={() => setManageClassModalVisible(true)} 
        onViewPress={() => setViewClassModalVisible(true)}
      />

      {/* Row 2 */}
      <ManageCard 
        title="Manage Chatbot" 
        sub="AI Tutor Training & Configuration" 
        icon="robot-outline" 
        isSpecial 
        onTrainPress={() => setTrainModalVisible(true)}
        onModifyPress={() => setModifyModalVisible(true)}
      />

      <ManageCard 
        title="Manage Student" 
        sub="1,248 Undergraduate students" 
        icon="account-multiple" 
        onAddPress={() => setAddStudentModalVisible(true)}
        onViewPress={() => setStudentModalVisible(true)}
      />
      
      <ManageCard 
        title="Manage Teacher" 
        sub="86 Registered Faculty members" 
        icon="account-tie-outline" 
        onAddPress={() => setAddTeacherModalVisible(true)}
        onViewPress={() => setTeacherModalVisible(true)}
      />

      {/* Academic Year Modal */}
      <Modal visible={academicYearModalVisible} transparent animationType="slide" onRequestClose={() => setAcademicYearModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Up Academic Year</Text>
              <TouchableOpacity onPress={() => setAcademicYearModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SELECT SEMESTER</Text>
              <TouchableOpacity style={styles.dropdownFake} onPress={() => setShowSemesterSelector(!showSemesterSelector)}>
                <Text style={{ color: '#1E293B', fontWeight: '600' }}>{selectedSemester}</Text>
                <Icon name={showSemesterSelector ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
              </TouchableOpacity>
              {showSemesterSelector && (
                <View style={styles.dropdownPicker}>
                  {semesterOptions.map((sem) => (
                    <TouchableOpacity key={sem} style={styles.dropdownItem} onPress={() => { setSelectedSemester(sem); setShowSemesterSelector(false); }}>
                      <Text style={styles.dropdownItemText}>{sem}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              {schoolYears.map((year) => (
                <TouchableOpacity key={year.id} style={styles.schoolYearItem} onPress={() => handleSetActive(year.id)}>
                  <View style={styles.radioContainer}>
                    <View style={[styles.radioCircle, year.isActive && styles.radioActive]}>
                      {year.isActive && <View style={styles.radioInner} />}
                    </View>
                  </View>
                  <Text style={[styles.schoolYearLabel, year.isActive && styles.activeLabel]}>{year.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.bottomButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={() => setAddSchoolYearModalVisible(true)}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={confirmDelete}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.setButton]} 
                onPress={() => activeYear && confirmSetActive(activeYear.id)}
              >
                <Text style={styles.buttonText}>Set</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add School Year Modal */}
      <Modal visible={addSchoolYearModalVisible} transparent animationType="fade" onRequestClose={() => setAddSchoolYearModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 280 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New School Year</Text>
              <TouchableOpacity onPress={() => setAddSchoolYearModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. S.Y. 2026 - 2027"
              placeholderTextColor="#94A3B8"
              value={newSchoolYearLabel}
              onChangeText={setNewSchoolYearLabel}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddSchoolYear}>
              <Text style={styles.submitBtnText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================== YOUR ORIGINAL MODALS (100% UNCHANGED) ==================== */}
      {/* Manage Class Modal */}
      <Modal visible={manageClassModalVisible} transparent animationType="fade" onRequestClose={() => setManageClassModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Class</Text>
              <TouchableOpacity onPress={() => setManageClassModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputSection}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>YEAR & SECTION (CHECKBOX)</Text>
                  <View style={styles.checkboxRow}>
                    {sections.map((item) => (
                      <TouchableOpacity 
                        key={item} 
                        style={[styles.checkboxItem, selectedSections.includes(item) && { borderColor: '#FF4D4D', borderWidth: 1 }]} 
                        onPress={() => toggleSection(item)}
                      >
                        <Icon name={selectedSections.includes(item) ? "checkbox-marked" : "checkbox-blank-outline"} size={20} color={selectedSections.includes(item) ? "#FF4D4D" : "#94A3B8"} />
                        <Text style={styles.checkboxText}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>COURSE CODE & NAME</Text>
                  <View style={styles.courseInputRow}>
                    <View style={styles.readOnlyCode}><Text style={styles.codeText}>{generatedCourseCode}</Text></View>
                    <TextInput style={styles.courseNameInput} placeholder="Input Subject Name" placeholderTextColor="#94A3B8" value={courseName} onChangeText={setCourseName} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SEMESTER SELECTION (DROPDOWN)</Text>
                  <TouchableOpacity style={styles.dropdownFake} onPress={() => setShowSemesterDropdown(!showSemesterDropdown)}>
                    <Text style={{ color: '#1E293B' }}>{semester}</Text>
                    <Icon name={showSemesterDropdown ? "chevron-up" : "chevron-down"} size={20} color="#64748B" />
                  </TouchableOpacity>
                  {showSemesterDropdown && (
                    <View style={styles.dropdownPicker}>
                      {semesterOptions.map((opt) => (
                        <TouchableOpacity key={opt} style={styles.dropdownItem} onPress={() => { setSemester(opt); setShowSemesterDropdown(false); }}>
                          <Text style={styles.dropdownItemText}>{opt}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>INSTRUCTOR NAME OR ID</Text>
                  <TextInput style={styles.input} placeholder="Enter Name or ID" placeholderTextColor="#94A3B8" value={instructor} onChangeText={setInstructor} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>SELECT BANNER IMAGE</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll}>
                    {classBanners.map((url, index) => (
                      <TouchableOpacity key={index} onPress={() => setSelectedBanner(url)}>
                        <Image source={{ uri: url }} style={[styles.bannerThumb, selectedBanner === url && styles.activeBanner]} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setManageClassModalVisible(false)}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleAddClass}>
                <Text style={styles.saveBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Train Chatbot Modal */}
      <Modal visible={trainModalVisible} transparent animationType="fade" onRequestClose={() => setTrainModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Train AI Tutor</Text>
              <TouchableOpacity onPress={() => setTrainModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GREETING MESSAGE</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline value={greetingMessage} onChangeText={setGreetingMessage} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>KNOWLEDGE TOPICS</Text>
                <TextInput style={[styles.input, { height: 100 }]} multiline value={knowledgeTopics} onChangeText={setKnowledgeTopics} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SAMPLE QUESTIONS</Text>
                <TextInput style={[styles.input, { height: 120 }]} multiline value={sampleQuestions} onChangeText={setSampleQuestions} />
              </View>
            </ScrollView>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setTrainModalVisible(false)}>
                <Text style={styles.discardBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleTrainChatbot}>
                <Text style={styles.saveBtnText}>Train Chatbot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modify Chatbot Modal */}
      <Modal visible={modifyModalVisible} transparent animationType="fade" onRequestClose={() => setModifyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modify AI Tutor</Text>
              <TouchableOpacity onPress={() => setModifyModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>GREETING MESSAGE</Text>
                <TextInput style={[styles.input, { height: 80 }]} multiline value={greetingMessage} onChangeText={setGreetingMessage} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>KNOWLEDGE BASE</Text>
                <TextInput style={[styles.input, { height: 140 }]} multiline value={knowledgeTopics} onChangeText={setKnowledgeTopics} />
              </View>
            </ScrollView>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setModifyModalVisible(false)}>
                <Text style={styles.discardBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSaveModifications}>
                <Text style={styles.saveBtnText}>Save Modifications</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Class Modal */}
      <Modal visible={viewClassModalVisible} transparent animationType="slide" onRequestClose={() => setViewClassModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Class List</Text>
              <TouchableOpacity onPress={() => setViewClassModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {classesList.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: '#94A3B8', fontSize: 16 }}>No classes added yet.</Text>
                </View>
              ) : (
                classesList.map((cls, index) => (
                  <View key={index} style={styles.classItem}>
                    <Image source={{ uri: cls.banner }} style={styles.classBanner} />
                    <View style={styles.classInfo}>
                      <Text style={styles.classCode}>{cls.courseCode}</Text>
                      <Text style={styles.className}>{cls.courseName}</Text>
                      <Text style={styles.classSemester}>{cls.semester}</Text>
                      <Text style={styles.classInstructor}>Instructor: {cls.instructor}</Text>
                      <Text style={styles.classSections}>Sections: {cls.sections.join(', ')}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setViewClassModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin List Modal */}
      <Modal visible={adminModalVisible} transparent animationType="slide" onRequestClose={() => setAdminModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Admin List</Text>
              <TouchableOpacity onPress={() => setAdminModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {adminsList.map((admin, index) => (
                <View key={index} style={styles.adminItem}>
                  <View style={styles.adminInfo}>
                    <Text style={styles.adminId}>{admin.id}</Text>
                    <Text style={styles.adminName}>{admin.name}</Text>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setAdminModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Admin Modal */}
      <Modal visible={addAdminModalVisible} transparent animationType="fade" onRequestClose={() => setAddAdminModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Admin</Text>
              <TouchableOpacity onPress={() => setAddAdminModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ADMIN ID</Text>
                <TextInput style={styles.input} placeholder="e.g. ADM-9921" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput style={styles.input} placeholder="e.g. Jonathan Vercetti" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput style={styles.input} placeholder="e.g. jvercetti@pasershub.com" placeholderTextColor="#94A3B8" keyboardType="email-address" />
              </View>
            </View>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setAddAdminModalVisible(false)}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={() => setAddAdminModalVisible(false)}>
                <Text style={styles.saveBtnText}>Save Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Student Modal */}
      <Modal visible={addStudentModalVisible} transparent animationType="fade" onRequestClose={() => setAddStudentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Student</Text>
              <TouchableOpacity onPress={() => setAddStudentModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>STUDENT ID</Text>
                <TextInput style={styles.input} placeholder="e.g. #102931" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput style={styles.input} placeholder="e.g. Alexander Wright" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PROGRAM / YEAR</Text>
                <TextInput style={styles.input} placeholder="e.g. BSCS - 4B" placeholderTextColor="#94A3B8" />
              </View>
            </View>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setAddStudentModalVisible(false)}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={() => setAddStudentModalVisible(false)}>
                <Text style={styles.saveBtnText}>Save Student</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Teacher Modal */}
      <Modal visible={addTeacherModalVisible} transparent animationType="fade" onRequestClose={() => setAddTeacherModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register Teacher</Text>
              <TouchableOpacity onPress={() => setAddTeacherModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <View style={styles.inputSection}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>TEACHER ID</Text>
                <TextInput style={styles.input} placeholder="e.g. T-88210" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>FULL NAME</Text>
                <TextInput style={styles.input} placeholder="e.g. Dr. Elena Rodriguez" placeholderTextColor="#94A3B8" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>SUBJECT</Text>
                <TextInput style={styles.input} placeholder="e.g. Advanced Mathematics" placeholderTextColor="#94A3B8" />
              </View>
            </View>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.discardBtn]} onPress={() => setAddTeacherModalVisible(false)}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={() => setAddTeacherModalVisible(false)}>
                <Text style={styles.saveBtnText}>Save Teacher</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student List Modal */}
      <Modal visible={studentModalVisible} transparent animationType="slide" onRequestClose={() => setStudentModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student List</Text>
              <TouchableOpacity onPress={() => setStudentModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {studentsList.map((student, index) => (
                <View key={index} style={styles.studentItem}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentId}>{student.id}</Text>
                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentEmail}>{student.email}</Text>
                    <Text style={styles.studentProgram}>{student.program}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setStudentModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Teacher List Modal */}
      <Modal visible={teacherModalVisible} transparent animationType="slide" onRequestClose={() => setTeacherModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teacher List</Text>
              <TouchableOpacity onPress={() => setTeacherModalVisible(false)}>
                <Icon name="close" size={28} color="#1E293B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {teachersList.map((teacher, index) => (
                <View key={index} style={styles.teacherItem}>
                  <View style={styles.teacherInfo}>
                    <Text style={styles.teacherId}>{teacher.id}</Text>
                    <Text style={styles.teacherName}>{teacher.name}</Text>
                    <Text style={styles.teacherEmail}>{teacher.email}</Text>
                    <Text style={styles.teacherSubject}>{teacher.subject}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeButton} onPress={() => setTeacherModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ManageCard Component
const ManageCard = ({ 
  title, 
  sub, 
  icon, 
  isSpecial, 
  isAcademicYear,
  onAddPress,
  onViewPress,
  onTrainPress,
  onModifyPress 
}: any) => {
  const ActionButton = ({ children, onPress }: any) => {
    const [isPressed, setIsPressed] = useState(false);
    return (
      <TouchableHighlight
        style={[styles.miniBtn, isPressed && styles.btnPressed]}
        underlayColor="#1E293B"
        onHideUnderlay={() => setIsPressed(false)}
        onShowUnderlay={() => setIsPressed(true)}
        onPress={onPress}
      >
        <View style={styles.btnContent}>
          {typeof children === 'string' ? (
            <Text style={[styles.miniBtnText, isPressed && styles.textWhite]}>{children}</Text>
          ) : children}
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
        {isAcademicYear ? (
          <ActionButton onPress={onAddPress}>+ Create Semester</ActionButton>
        ) : isSpecial ? (
          <>
            <ActionButton onPress={onTrainPress}>Train</ActionButton>
            <ActionButton onPress={onModifyPress}>Modify</ActionButton>
          </>
        ) : (
          <>
            <ActionButton onPress={onAddPress}>+ Add</ActionButton>
            {onViewPress && (
              <ActionButton onPress={onViewPress}>
                <Icon name="eye-outline" size={16} /> View
              </ActionButton>
            )}
          </>
        )}
      </View>
    </View>
  );
};

// ==================== STYLES (All fixed) ====================
const styles = StyleSheet.create({
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    paddingHorizontal: 10,
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
  cardIconBox: { width: 44, height: 44, backgroundColor: '#FFF5F5', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardTitle: { color: '#1E293B', fontWeight: 'bold', fontSize: 16 },
  cardSub: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 6 },

  miniBtn: { backgroundColor: '#F8FAFC', paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8, flex: 1, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  btnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnPressed: { borderColor: '#FF4D4D', backgroundColor: '#FF4D4D' },
  miniBtnText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  textWhite: { color: '#FFF' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 25, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E293B' },

  semesterHeader: { backgroundColor: '#FF4D4D', flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 20 },
  semesterHeaderText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 10 },

  schoolYearItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  radioContainer: { marginRight: 15 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#94A3B8', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#FF4D4D' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4D4D' },
  schoolYearLabel: { fontSize: 16, color: '#1E293B' },
  activeLabel: { fontWeight: '700', color: '#FF4D4D' },

  bottomButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  actionButton: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  setButton: { backgroundColor: '#FF4D4D', borderColor: '#FF4D4D' },
  buttonText: { color: '#1E293B', fontWeight: '600' },

  submitBtn: { backgroundColor: '#FF4D4D', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  inputSection: { marginBottom: 20 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#94A3B8', marginBottom: 8, letterSpacing: 0.5 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, color: '#1E293B', fontSize: 15 },

  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10 },
  discardBtn: { backgroundColor: 'transparent' },
  discardBtnText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 15 },
  saveBtn: { backgroundColor: '#FF4D4D' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },

  checkboxRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  checkboxItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  checkboxText: { fontSize: 14, color: '#1E293B', fontWeight: '600' },
  courseInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  readOnlyCode: { backgroundColor: '#F1F5F9', paddingHorizontal: 15, height: 50, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  codeText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 },
  courseNameInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 50, color: '#1E293B' },
  dropdownFake: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 15, height: 50 },
  dropdownPicker: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginTop: 5, overflow: 'hidden', elevation: 4 },
  dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { color: '#1E293B', fontSize: 14 },
  bannerScroll: { marginTop: 5 },
  bannerThumb: { width: 100, height: 60, borderRadius: 8, marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  activeBanner: { borderColor: '#FF4D4D' },

  classItem: { backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  classBanner: { width: '100%', height: 160, resizeMode: 'cover' },
  classInfo: { padding: 16 },
  classCode: { fontSize: 15, fontWeight: '700', color: '#FF4D4D' },
  className: { fontSize: 18, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  classSemester: { fontSize: 14, color: '#64748B', marginTop: 6 },
  classInstructor: { fontSize: 14, color: '#1E293B', marginTop: 4 },
  classSections: { fontSize: 13, color: '#2563EB', marginTop: 6, fontWeight: '500' },

  adminItem: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  adminInfo: { gap: 4 },
  adminId: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  adminName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 2 },
  adminEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },

  studentItem: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  studentInfo: { gap: 4 },
  studentId: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  studentName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  studentEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  studentProgram: { fontSize: 14, color: '#2563EB', fontWeight: '600', marginTop: 6 },

  teacherItem: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  teacherInfo: { gap: 4 },
  teacherId: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  teacherName: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginTop: 4 },
  teacherEmail: { fontSize: 14, color: '#64748B', marginTop: 2 },
  teacherSubject: { fontSize: 14, color: '#8B5CF6', fontWeight: '600', marginTop: 6 },

  closeButton: { backgroundColor: '#1E293B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  closeButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default DashboardCards;