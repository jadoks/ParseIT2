import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image'; // instant caching + fade-in, same as Student CourseCard
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getCachedBannerUrl,
  setCachedBannerUrl,
} from './bannerUrlCache';
// 🔥 Use the shared apiFetch — it attaches a fresh Firebase Bearer token
// automatically. The old local apiFetch here only sent `credentials: 'include'`
// with no Authorization header at all, which is why every signed-url request
// came back 401.
import { apiFetch } from '../services/api'; // adjust path if your folder layout differs

// ---- Matches the TeacherCourseData shape used in TeacherDashboard.tsx ----
export type TeacherCourseData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
  bannerStoragePath?: string | null;
  bannerFileName?: string | null;
  bannerMimeType?: string | null;
  year?: string;
  yearSection?: string;
  semester?: string;
  schoolYear?: string | null;
  description?: string | null;
  position?: number;
  units?: number;
  themeColor?: string;
};

interface TeacherCourseCardProps {
  item: TeacherCourseData;
  cardWidth: string | number;
  copiedId: string | null;
  onOpenCourse?: (course: TeacherCourseData) => void;
  onCopyCode: (course: TeacherCourseData) => void;
  onMenuPress: (event: any, course: TeacherCourseData) => void;
}

// ---- Local fallback image map, same idea as Student CourseCard ----
const COURSE_IMAGE_MAP: { [key: string]: any } = {
  'CC111 – Introduction to Computing': require('../../assets/parseclass/CC111.jpg'),
  'CC112 – Data Structures and Algorithms': require('../../assets/parseclass/CC112.jpg'),
  'PC121 – Discrete Mathematics': require('../../assets/parseclass/PC121.jpg'),
  'GEC-US – Understanding the Self': require('../../assets/parseclass/GEC-US.jpg'),
  'NSTP1 – Civic Welfare Training Service': require('../../assets/parseclass/NSTP1.jpg'),
  'PATHFIT2 – Exercise-Based Fitness Activities': require('../../assets/parseclass/PATHFIT2.jpg'),
  'Web Development': require('../../assets/parseclass/AP1.jpg'),
  'Programming Logic': require('../../assets/parseclass/AP1.jpg'),
  'Computer Fundamentals': require('../../assets/parseclass/AP1.jpg'),
};

const getYearSectionLabel = (course: TeacherCourseData) => {
  const year = course.year?.trim() || '';
  const section = (course.yearSection || course.section || '').trim();
  if (year && section) return `${year} • ${section}`;
  if (year) return year;
  if (section) return section;
  return 'Year and section not set';
};

const getSemesterSchoolYearLabel = (course: TeacherCourseData) => {
  const semester = course.semester?.trim() || '';
  const schoolYear = course.schoolYear?.trim() || '';
  if (semester && schoolYear) return `${semester} • S.Y. ${schoolYear}`;
  if (semester) return semester;
  if (schoolYear) return `S.Y. ${schoolYear}`;
  return 'Semester and school year not set';
};

const TeacherCourseCard: React.FC<TeacherCourseCardProps> = ({
  item,
  cardWidth,
  copiedId,
  onOpenCourse,
  onCopyCode,
  onMenuPress,
}) => {
  // ---- Seed initial state straight from the shared cache. If this course's
  // banner was already fetched earlier in the session (e.g. before the user
  // navigated to another screen and back), this renders the correct image
  // on the very first frame — no blank/fallback flash, no refetch. ----
  const initialCachedUrl = item.bannerStoragePath
    ? getCachedBannerUrl(item.id, item.bannerStoragePath)
    : null;

  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);
  const [signedBannerUrl, setSignedBannerUrl] = useState<string | null>(initialCachedUrl);

  useEffect(() => {
    let isMounted = true;

    const refreshSignedBannerUrl = async () => {
      if (!item.bannerStoragePath) {
        setSignedBannerUrl(null);
        setBannerLoadFailed(false);
        return;
      }

      // ---- Cache hit: reuse it, skip the network call entirely. This is
      // what makes revisiting the Dashboard instant instead of re-fetching
      // every card's signed URL from the backend again. ----
      const cached = getCachedBannerUrl(item.id, item.bannerStoragePath);
      if (cached) {
        if (isMounted) {
          setSignedBannerUrl(cached);
          setBannerLoadFailed(false);
        }
        return;
      }

      // ---- Cache miss (first time this session, or the cached entry
      // expired): fetch a fresh signed URL and store it for next time. ----
      try {
        const response = await apiFetch('/storage/signed-url', {
          method: 'POST',
          body: JSON.stringify({
            storagePath: item.bannerStoragePath,
            classId: item.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Unable to refresh class banner.');
        }

        if (data?.url) {
          setCachedBannerUrl(item.id, item.bannerStoragePath, data.url);
          if (isMounted) {
            setSignedBannerUrl(data.url);
            setBannerLoadFailed(false);
          }
        }
      } catch {
        if (isMounted) {
          setBannerLoadFailed(true);
        }
      }
    };

    refreshSignedBannerUrl();

    return () => {
      isMounted = false;
    };
  }, [item.id, item.bannerUri, item.bannerStoragePath]);

  const getCourseImage = () => {
    const uri = signedBannerUrl || item.bannerUri;

    if (uri && !bannerLoadFailed) {
      return { uri };
    }

    // Fallback to a local asset if we recognize the course name, matching
    // the Student CourseCard behavior instead of showing a plain gray box.
    return COURSE_IMAGE_MAP[item.name] || null;
  };

  const resolvedImage = getCourseImage();

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth as any }]}
      onPress={() => onOpenCourse?.(item)}
      activeOpacity={0.9}
    >
      <View style={styles.bannerWrapper}>
        {resolvedImage ? (
          <>
            <Image
              source={resolvedImage}
              style={[StyleSheet.absoluteFillObject, styles.cardBannerImage]}
              contentFit="cover"
              transition={200}
              onError={() => setBannerLoadFailed(true)}
            />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.missingBannerBox}>
            <Text style={styles.missingBannerText} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.missingBannerSubText}>No banner stored</Text>
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.instructorLabel}>INSTRUCTOR</Text>
        <Text style={styles.instructorName}>{item.instructor}</Text>

        <View style={styles.classMetaWrap}>
          <View style={styles.classMetaPill}>
            <Ionicons name="school-outline" size={14} color="#D32F2F" />
            <Text style={styles.classMetaText} numberOfLines={1}>
              {getYearSectionLabel(item)}
            </Text>
          </View>
          <View style={styles.classMetaPill}>
            <Ionicons name="calendar-outline" size={14} color="#D32F2F" />
            <Text style={styles.classMetaText} numberOfLines={1}>
              {getSemesterSchoolYearLabel(item)}
            </Text>
          </View>
        </View>

        <View style={styles.classCodeRow}>
          <Text style={styles.bannerCode}>Class Code: {item.classCode}</Text>
          <TouchableOpacity
            onPress={() => onCopyCode(item)}
            style={styles.copyButton}
            activeOpacity={0.7}
          >
            <Ionicons
              name={copiedId === item.id ? 'checkmark-outline' : 'copy-outline'}
              size={16}
              color="#000000"
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          onPress={(event) => {
            event.stopPropagation?.();
            onMenuPress(event, item);
          }}
          style={styles.dotButton}
        >
          <MaterialCommunityIcons name="dots-vertical" size={22} color="#5f6368" />
        </TouchableOpacity>
        <View
          style={[
            styles.bottomBorder,
            { backgroundColor: item.themeColor || '#2E7D32' },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  bannerWrapper: {
    height: 140,
    width: '100%',
    overflow: 'hidden',
  },
  missingBannerBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    justifyContent: 'flex-end',
  },
  missingBannerText: { color: '#202124', fontSize: 18, fontWeight: '700' },
  missingBannerSubText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  cardBannerImage: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  bannerName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  bannerCode: {
    color: 'rgba(19, 17, 17, 0.92)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  classMetaWrap: { marginTop: 12, gap: 8 },
  classMetaPill: {
    minHeight: 32,
    borderRadius: 12,
    backgroundColor: '#FFF4F4',
    borderWidth: 1,
    borderColor: '#F8D7D7',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  classMetaText: { flex: 1, color: '#7A1F1F', fontSize: 12, fontWeight: '700' },
  classCodeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  copyButton: { marginLeft: 8, padding: 4 },
  cardContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  instructorLabel: {
    fontSize: 11,
    color: '#9AA0A6',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  instructorName: { fontSize: 15, color: '#202124', fontWeight: '700', marginTop: 4 },
  cardFooter: { position: 'relative', minHeight: 36, justifyContent: 'center' },
  dotButton: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6 },
  bottomBorder: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
});

export default TeacherCourseCard;