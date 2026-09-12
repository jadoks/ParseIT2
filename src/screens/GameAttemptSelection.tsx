import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';

// One completed attempt, as returned by the backend
// (POST /game-ai/submit-game-assignment or GET /game-ai/attempts/:assignmentId).
export interface GameAttemptSummary {
  id: string;
  attemptNumber: number;
  rawScore: number;
  totalQuestions: number;
  scaledScore: number;
  maxPoints: number;
  completedAt?: any;
}

interface GameAttemptSelectionProps {
  assignmentTitle: string;
  attempts: GameAttemptSummary[];
  // Attempt already saved as the official final score, if any (e.g. the
  // student is revisiting this screen without a fresh attempt just played).
  selectedAttemptId?: string | null;
  // True when the current final score was picked automatically (the
  // student used every attempt without choosing one themselves, so the
  // backend fell back to their highest score). Purely informational — the
  // student can still pick a different attempt from here.
  selectedAutomatically?: boolean;
  // How many more times the student is allowed to play. Pass Infinity for
  // "unlimited". 0 hides the "Play Again" option.
  attemptsRemaining: number;
  onSelectFinal: (attemptId: string) => Promise<void> | void;
  onPlayAgain: () => void;
  onDecideLater: () => void;
}

const GameAttemptSelection: React.FC<GameAttemptSelectionProps> = ({
  assignmentTitle,
  attempts,
  selectedAttemptId = null,
  selectedAutomatically = false,
  attemptsRemaining,
  onSelectFinal,
  onPlayAgain,
  onDecideLater,
}) => {
  // Default the picker to the most recent attempt (the one the student just
  // finished) so a single tap of "Submit as Final Score" does the obvious
  // thing, while still letting them pick an earlier, better attempt instead.
  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => (a.attemptNumber || 0) - (b.attemptNumber || 0)),
    [attempts]
  );
  const mostRecentId = sortedAttempts.length
    ? sortedAttempts[sortedAttempts.length - 1].id
    : null;

  const [pickedId, setPickedId] = useState<string | null>(
    selectedAttemptId || mostRecentId
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ On large screens (tablet/web/desktop) the attempts list shouldn't
  // stretch edge-to-edge — cap it at 75% width, centered, same breakpoint
  // used elsewhere in the app (StudentApp's isLargeScreen).
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const canPlayAgain = attemptsRemaining > 0;

  const handleSubmit = async () => {
    if (!pickedId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSelectFinal(pickedId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const actionButtons = (
    <>
      <TouchableOpacity
        style={isLargeScreen ? styles.decideLaterButtonHeader : styles.decideLaterButton}
        onPress={onDecideLater}
        disabled={isSubmitting}
      >
        <Text style={isLargeScreen ? styles.decideLaterTextHeader : styles.decideLaterText}>Decide Later</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          isLargeScreen ? styles.submitButtonHeader : styles.submitButton,
          (!pickedId || isSubmitting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!pickedId || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={isLargeScreen ? styles.submitButtonTextHeader : styles.submitButtonText}>Submit as Final Score</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle} numberOfLines={2}>{assignmentTitle}</Text>
          <Text style={styles.headerSubtitle}>Choose your final score</Text>
        </View>
        {/* ✅ On large screens the action buttons live in the top bar instead
            of a bottom footer, so they're reachable without scrolling. */}
        {isLargeScreen && <View style={styles.headerActions}>{actionButtons}</View>}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.scrollContentLarge]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.helperText}>
          You've completed {sortedAttempts.length} {sortedAttempts.length === 1 ? 'attempt' : 'attempts'}.
          Pick the score you want submitted as your official grade for this assignment.
        </Text>

        {selectedAutomatically && !canPlayAgain && (
          <Text style={styles.autoBanner}>
            You've used all your attempts, so your highest score was submitted automatically.
            You can still choose a different attempt below if you'd rather that one count.
          </Text>
        )}

        {sortedAttempts.map((attempt) => {
          const isPicked = pickedId === attempt.id;
          const isCurrentlyFinal = selectedAttemptId === attempt.id;
          const percent = attempt.totalQuestions > 0
            ? Math.round((attempt.rawScore / attempt.totalQuestions) * 100)
            : 0;

          return (
            <TouchableOpacity
              key={attempt.id}
              style={[styles.attemptCard, isPicked && styles.attemptCardPicked]}
              activeOpacity={0.85}
              onPress={() => setPickedId(attempt.id)}
            >
              <View style={styles.attemptCardLeft}>
                <View style={[styles.radioOuter, isPicked && styles.radioOuterPicked]}>
                  {isPicked && <View style={styles.radioInner} />}
                </View>
                <View>
                  <Text style={styles.attemptLabel}>Attempt {attempt.attemptNumber}</Text>
                  {isCurrentlyFinal && (
                    <Text style={styles.currentFinalTag}>
                      {selectedAutomatically ? 'Auto-submitted as your final score' : 'Currently your final score'}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.attemptCardRight}>
                <Text style={styles.attemptScore}>
                  {attempt.rawScore}/{attempt.totalQuestions}
                </Text>
                <Text style={styles.attemptPercent}>{percent}%</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {canPlayAgain && (
          <TouchableOpacity style={styles.playAgainButton} onPress={onPlayAgain} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color="#D32F2F" />
            <Text style={styles.playAgainText}>
              Play Again{Number.isFinite(attemptsRemaining) ? ` (${attemptsRemaining} left)` : ''}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!isLargeScreen && (
        <View style={styles.footer}>
          {actionButtons}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F9' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  // ✅ On large screens the header becomes a row so the action buttons can
  // sit at the right, in line with the title.
  headerLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: { flexShrink: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 20,
  },
  headerTitle: { fontFamily: FONT_TITLE, fontSize: 20, fontWeight: WEIGHT_TITLE, color: '#222' },
  headerSubtitle: { fontFamily: FONT_BODY, fontSize: 14, color: '#777', marginTop: 4, fontWeight: WEIGHT_EMPHASIS },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  // ✅ Constrains and centers the attempts list on large screens (tablet/
  // web/desktop) instead of letting the cards stretch full width.
  scrollContentLarge: {
    width: '75%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  helperText: { fontFamily: FONT_BODY, fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 20 },
  autoBanner: { fontFamily: FONT_BODY, 
    fontSize: 13,
    color: '#8A6D00',
    backgroundColor: '#FFF6DA',
    borderWidth: 1,
    borderColor: '#F0DFA0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    lineHeight: 18,
    fontWeight: WEIGHT_EMPHASIS,
  },
  attemptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#EEE',
    padding: 16,
    marginBottom: 12,
  },
  attemptCardPicked: { borderColor: '#D32F2F', backgroundColor: '#FFF5F5' },
  attemptCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterPicked: { borderColor: '#D32F2F' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D32F2F' },
  attemptLabel: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#222' },
  currentFinalTag: { fontFamily: FONT_BODY, fontSize: 12, color: '#2E7D32', fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  attemptCardRight: { alignItems: 'flex-end' },
  attemptScore: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#222' },
  attemptPercent: { fontFamily: FONT_BODY, fontSize: 13, color: '#777', fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  playAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 12,
    marginTop: 8,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null),
  },
  playAgainText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: WEIGHT_EMPHASIS, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  decideLaterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  decideLaterText: { fontFamily: FONT_BODY, color: '#555', fontWeight: WEIGHT_EMPHASIS, fontSize: 15 },
  submitButton: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
  },
  submitButtonDisabled: { backgroundColor: '#E7A9A9' },
  submitButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 15 },
  // ✅ Compact variants of the same two buttons, used inline in the header
  // on large screens instead of the full-width footer versions above.
  decideLaterButtonHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  decideLaterTextHeader: { fontFamily: FONT_BODY, color: '#555', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  submitButtonHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#D32F2F',
  },
  submitButtonTextHeader: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
});

export default GameAttemptSelection;