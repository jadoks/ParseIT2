import React, { useMemo, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type ClassStatus = 'Active' | 'Archived' | 'Draft';

interface ClassItem {
  id: string;
  className: string;
  section: string;
  adviser: string;
  students: number;
  subjectCount: number;
  room: string;
  schedule: string;
  status: ClassStatus;
}

const initialClasses: ClassItem[] = [
  {
    id: 'CLS-101',
    className: 'BSIT 1A',
    section: 'Morning',
    adviser: 'Prof. Linda Chen',
    students: 42,
    subjectCount: 8,
    room: 'Room 204',
    schedule: 'Mon - Fri / 8:00 AM',
    status: 'Active',
  },
  {
    id: 'CLS-102',
    className: 'BSIT 2B',
    section: 'Afternoon',
    adviser: 'Dr. James Wilson',
    students: 38,
    subjectCount: 7,
    room: 'Room 305',
    schedule: 'Mon - Fri / 1:00 PM',
    status: 'Active',
  },
  {
    id: 'CLS-103',
    className: 'BSCS 3A',
    section: 'Morning',
    adviser: 'Sarah Jenkins',
    students: 35,
    subjectCount: 9,
    room: 'Lab 2',
    schedule: 'Tue - Sat / 9:00 AM',
    status: 'Draft',
  },
  {
    id: 'CLS-104',
    className: 'BSEMC 4A',
    section: 'Evening',
    adviser: 'Marcus Thorne',
    students: 29,
    subjectCount: 6,
    room: 'Room 118',
    schedule: 'Mon - Thu / 5:30 PM',
    status: 'Archived',
  },
  {
    id: 'CLS-105',
    className: 'BSIT 1C',
    section: 'Morning',
    adviser: 'Robert Miller',
    students: 40,
    subjectCount: 8,
    room: 'Room 210',
    schedule: 'Mon - Fri / 10:00 AM',
    status: 'Active',
  },
];

const statusColors: Record<ClassStatus, { bg: string; text: string }> = {
  Active: { bg: '#ECFDF5', text: '#047857' },
  Archived: { bg: '#F1F5F9', text: '#475569' },
  Draft: { bg: '#FEF3C7', text: '#B45309' },
};

export default function ClassManagement() {
  const [classes, setClasses] = useState<ClassItem[]>(initialClasses);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'All' | ClassStatus>('All');

  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  const [form, setForm] = useState<ClassItem>({
    id: '',
    className: '',
    section: '',
    adviser: '',
    students: 0,
    subjectCount: 0,
    room: '',
    schedule: '',
    status: 'Active',
  });

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(search.toLowerCase()) ||
        item.className.toLowerCase().includes(search.toLowerCase()) ||
        item.adviser.toLowerCase().includes(search.toLowerCase()) ||
        item.room.toLowerCase().includes(search.toLowerCase());

      const matchesFilter = filter === 'All' ? true : item.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [classes, search, filter]);

  const totalClasses = classes.length;
  const totalStudents = classes.reduce((sum, item) => sum + item.students, 0);
  const activeClasses = classes.filter((item) => item.status === 'Active').length;
  const totalSubjects = classes.reduce((sum, item) => sum + item.subjectCount, 0);

  const resetForm = () => {
    setForm({
      id: '',
      className: '',
      section: '',
      adviser: '',
      students: 0,
      subjectCount: 0,
      room: '',
      schedule: '',
      status: 'Active',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setAddVisible(true);
  };

  const handleOpenEdit = (item: ClassItem) => {
    setForm(item);
    setEditVisible(true);
  };

  const handleAddClass = () => {
    if (!form.id || !form.className || !form.adviser) return;

    setClasses((prev) => [form, ...prev]);
    setAddVisible(false);
    resetForm();
  };

  const handleSaveEdit = () => {
    setClasses((prev) =>
      prev.map((item) => (item.id === form.id ? form : item))
    );
    setEditVisible(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setClasses((prev) => prev.filter((item) => item.id !== id));
  };

  const renderStatCard = (
    icon: string,
    label: string,
    value: string | number,
    accent: string
  ) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: accent }]}>
        <Icon name={icon} size={22} color="#FFFFFF" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderFormModal = (
    visible: boolean,
    onClose: () => void,
    onSubmit: () => void,
    title: string,
    actionText: string,
    isEdit?: boolean
  ) => (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CLASS ID</Text>
              <TextInput
                value={form.id}
                editable={!isEdit}
                onChangeText={(v) => setForm({ ...form, id: v })}
                style={[styles.input, isEdit && styles.readOnlyInput]}
                placeholder="Enter class ID"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CLASS NAME</Text>
              <TextInput
                value={form.className}
                onChangeText={(v) => setForm({ ...form, className: v })}
                style={styles.input}
                placeholder="Enter class name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SECTION</Text>
              <TextInput
                value={form.section}
                onChangeText={(v) => setForm({ ...form, section: v })}
                style={styles.input}
                placeholder="Enter section"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ADVISER</Text>
              <TextInput
                value={form.adviser}
                onChangeText={(v) => setForm({ ...form, adviser: v })}
                style={styles.input}
                placeholder="Enter adviser name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STUDENTS</Text>
              <TextInput
                value={String(form.students)}
                onChangeText={(v) =>
                  setForm({ ...form, students: Number(v.replace(/[^0-9]/g, '')) || 0 })
                }
                keyboardType="numeric"
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SUBJECT COUNT</Text>
              <TextInput
                value={String(form.subjectCount)}
                onChangeText={(v) =>
                  setForm({
                    ...form,
                    subjectCount: Number(v.replace(/[^0-9]/g, '')) || 0,
                  })
                }
                keyboardType="numeric"
                style={styles.input}
                placeholder="0"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ROOM</Text>
              <TextInput
                value={form.room}
                onChangeText={(v) => setForm({ ...form, room: v })}
                style={styles.input}
                placeholder="Enter room"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SCHEDULE</Text>
              <TextInput
                value={form.schedule}
                onChangeText={(v) => setForm({ ...form, schedule: v })}
                style={styles.input}
                placeholder="Enter schedule"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>STATUS</Text>
              <View style={styles.statusPickerRow}>
                {(['Active', 'Draft', 'Archived'] as ClassStatus[]).map((status) => {
                  const isActive = form.status === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        isActive && styles.statusOptionActive,
                      ]}
                      onPress={() => setForm({ ...form, status })}
                    >
                      <Text
                        style={[
                          styles.statusOptionText,
                          isActive && styles.statusOptionTextActive,
                        ]}
                      >
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={onSubmit}>
              <Text style={styles.saveBtnText}>{actionText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Class Management</Text>
          <Text style={styles.subtitle}>
            Organize class sections, advisers, student capacity, and schedules.
          </Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleOpenAdd}>
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Class</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {renderStatCard('google-classroom', 'Total Classes', totalClasses, '#EF4444')}
        {renderStatCard('account-group-outline', 'Total Students', totalStudents, '#0EA5E9')}
        {renderStatCard('check-decagram-outline', 'Active Classes', activeClasses, '#10B981')}
        {renderStatCard('book-open-page-variant-outline', 'Subjects', totalSubjects, '#8B5CF6')}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Icon name="magnify" size={20} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by class, adviser, room, or ID"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filterRow}>
          {(['All', 'Active', 'Draft', 'Archived'] as Array<'All' | ClassStatus>).map(
            (item) => {
              const active = filter === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setFilter(item)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active && styles.filterChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>
      </View>

      <View style={styles.tableCard}>
        <View style={styles.tableHeader}>
          <Text style={[styles.hText, { flex: 1.1 }]}>CLASS ID</Text>
          <Text style={[styles.hText, { flex: 1.8 }]}>CLASS</Text>
          <Text style={[styles.hText, { flex: 1.5 }]}>ADVISER</Text>
          <Text style={[styles.hText, { flex: 0.9 }]}>STUDENTS</Text>
          <Text style={[styles.hText, { flex: 1.1 }]}>ROOM</Text>
          <Text style={[styles.hText, { flex: 1.3 }]}>STATUS</Text>
          <Text style={[styles.hText, { width: 90, textAlign: 'center' }]}>ACTIONS</Text>
        </View>

        <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
          {filteredClasses.length > 0 ? (
            filteredClasses.map((item) => (
              <View key={item.id} style={styles.row}>
                <Text style={[styles.idText, { flex: 1.1 }]}>{item.id}</Text>

                <View style={{ flex: 1.8 }}>
                  <Text style={styles.primaryText}>{item.className}</Text>
                  <Text style={styles.secondaryText}>
                    {item.section} • {item.schedule}
                  </Text>
                </View>

                <View style={{ flex: 1.5 }}>
                  <Text style={styles.primaryText}>{item.adviser}</Text>
                  <Text style={styles.secondaryText}>
                    {item.subjectCount} subjects
                  </Text>
                </View>

                <Text style={[styles.cellText, { flex: 0.9 }]}>{item.students}</Text>
                <Text style={[styles.cellText, { flex: 1.1 }]}>{item.room}</Text>

                <View style={{ flex: 1.3 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColors[item.status].bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColors[item.status].text },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionCell}>
                  <TouchableOpacity onPress={() => handleOpenEdit(item)}>
                    <Icon name="pencil-outline" size={20} color="#475569" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Icon name="trash-can-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Icon name="folder-search-outline" size={42} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No classes found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filter settings.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {renderFormModal(
        addVisible,
        () => setAddVisible(false),
        handleAddClass,
        'Create New Class',
        'Save Class'
      )}

      {renderFormModal(
        editVisible,
        () => setEditVisible(false),
        handleSaveEdit,
        'Edit Class',
        'Save Changes',
        true
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#64748B',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    gap: 16,
  },
  searchBox: {
    flex: 1,
    maxWidth: 430,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    color: '#0F172A',
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  filterChipText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#DC2626',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 22,
    paddingVertical: 18,
  },
  hText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollArea: {
    maxHeight: 520,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  idText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: '800',
  },
  primaryText: {
    color: '#0F172A',
    fontSize: 14.5,
    fontWeight: '700',
  },
  secondaryText: {
    color: '#64748B',
    fontSize: 12.5,
    marginTop: 3,
  },
  cellText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionCell: {
    width: 90,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: '#334155',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 26,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  inputGroup: {
    width: '48.5%',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    color: '#0F172A',
  },
  readOnlyInput: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
  statusPickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOptionActive: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  statusOptionTextActive: {
    color: '#DC2626',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF4444',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});