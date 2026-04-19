import { useState, useCallback, useRef, useEffect } from 'react';
import type { Question } from '../types';
import { startExam, submitExamSection, completeExam } from '../services/api';

export type ExamState = 'NOT_STARTED' | 'IN_PROGRESS' | 'SECTION_BREAK' | 'SUBMITTING' | 'COMPLETED';

interface ExamSection {
  key: string;
  label: string;
  timer_type: 'section' | 'per_question';
  time_limit_seconds: number;
  questions: Question[];
}

interface ExamAnswer {
  question_id: string;
  question_type: string;
  user_answer: unknown;
  time_spent_seconds: number;
}

export function useExamEngine() {
  const [state, setState] = useState<ExamState>('NOT_STARTED');
  const [sessionId, setSessionId] = useState<string>('');
  const [sections, setSections] = useState<ExamSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sectionAnswers, setSectionAnswers] = useState<ExamAnswer[]>([]);
  const [results, setResults] = useState<any>(null);
  const [isTrial, setIsTrial] = useState(false);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(0);
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(0);

  const questionStartTime = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentSection = sections[currentSectionIndex] || null;
  const currentQuestion = currentSection?.questions[currentQuestionIndex] || null;
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const questionsBeforeCurrentSection = sections.slice(0, currentSectionIndex).reduce((sum, s) => sum + s.questions.length, 0);
  const overallQuestionIndex = questionsBeforeCurrentSection + currentQuestionIndex;

  // Timer management
  useEffect(() => {
    if (state !== 'IN_PROGRESS' || !currentSection) return;

    if (timerRef.current) clearInterval(timerRef.current);

    if (currentSection.timer_type === 'section') {
      timerRef.current = setInterval(() => {
        setSectionTimeRemaining((prev) => {
          if (prev <= 1) {
            // Section time expired - auto-submit
            clearInterval(timerRef.current!);
            handleSectionTimeExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // per_question timer - use the question's own time limit
      // For AI-scored types, the practice component manages its own timing
      const AI_TYPES = new Set([
        'read_aloud', 'repeat_sentence', 'describe_image', 'answer_short_question',
        'retell_lecture', 'summarize_group_discussion', 'respond_to_situation',
        'essay', 'summarize_written_text', 'summarize_spoken_text',
      ]);
      if (currentQuestion && AI_TYPES.has(currentQuestion.type)) {
        // Don't run exam timer for AI-scored types — practice component handles timing
        setQuestionTimeRemaining(0);
        return;
      }
      const qTimeLimit = currentQuestion?.time_limit_seconds || 60;
      setQuestionTimeRemaining(qTimeLimit);
      timerRef.current = setInterval(() => {
        setQuestionTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            submitCurrentAnswer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, currentSectionIndex, currentQuestionIndex]);

  const handleSectionTimeExpired = useCallback(() => {
    // Auto-submit remaining questions in section as null
    if (!currentSection) return;
    const remaining = currentSection.questions.length - currentQuestionIndex;
    const autoAnswers: ExamAnswer[] = [];
    for (let i = 0; i < remaining; i++) {
      const q = currentSection.questions[currentQuestionIndex + i];
      autoAnswers.push({
        question_id: q.id,
        question_type: q.type,
        user_answer: null,
        time_spent_seconds: 0,
      });
    }
    const allAnswers = [...sectionAnswers, ...autoAnswers];
    finishSection(allAnswers);
  }, [currentSection, currentQuestionIndex, sectionAnswers]);

  const start = useCallback(async (trial: boolean = false) => {
    setIsTrial(trial);
    const data = await startExam(trial);
    setSessionId(data.session_id);
    setSections(data.sections as ExamSection[]);
    setCurrentSectionIndex(0);
    setCurrentQuestionIndex(0);
    setSectionAnswers([]);
    if (data.sections[0]) {
      setSectionTimeRemaining(data.sections[0].time_limit_seconds);
    }
    questionStartTime.current = Date.now();
    setState('IN_PROGRESS');
  }, []);

  const submitCurrentAnswer = useCallback((userAnswer: unknown) => {
    if (!currentSection) return;
    const timeSpent = Math.round((Date.now() - questionStartTime.current) / 1000);
    const question = currentSection.questions[currentQuestionIndex];

    // AI-scored questions are scored per-question by the practice component
    // They pass '__prescored__' and should NOT be included in batch submission
    const isPrescored = userAnswer === '__prescored__';
    let newAnswers = sectionAnswers;

    if (!isPrescored) {
      const answer: ExamAnswer = {
        question_id: question.id,
        question_type: question.type,
        user_answer: userAnswer,
        time_spent_seconds: timeSpent,
      };
      newAnswers = [...sectionAnswers, answer];
      setSectionAnswers(newAnswers);
    }

    if (currentQuestionIndex < currentSection.questions.length - 1) {
      // More questions in this section
      setCurrentQuestionIndex((prev) => prev + 1);
      questionStartTime.current = Date.now();
    } else {
      // Last question in section - submit section
      finishSection(newAnswers);
    }
  }, [currentSection, currentQuestionIndex, sectionAnswers]);

  const skipQuestion = useCallback(() => {
    submitCurrentAnswer(null);
  }, [submitCurrentAnswer]);

  const finishSection = useCallback(async (answers: ExamAnswer[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState('SUBMITTING');

    // Submit only batch answers (AI-scored questions were already submitted per-question)
    const sectionKey = currentSection?.key || '';
    if (answers.length > 0) {
      await submitExamSection(sessionId, sectionKey as any, answers);
    }

    if (currentSectionIndex < sections.length - 1) {
      // More sections remaining - show break
      setState('SECTION_BREAK');
    } else {
      // Last section - complete exam
      const examResults = await completeExam(sessionId);
      setResults(examResults);
      setState('COMPLETED');
    }
  }, [sessionId, currentSection, currentSectionIndex, sections]);

  const continueToNextSection = useCallback(() => {
    const nextIdx = currentSectionIndex + 1;
    setCurrentSectionIndex(nextIdx);
    setCurrentQuestionIndex(0);
    setSectionAnswers([]);
    if (sections[nextIdx]) {
      setSectionTimeRemaining(sections[nextIdx].time_limit_seconds);
    }
    questionStartTime.current = Date.now();
    setState('IN_PROGRESS');
  }, [currentSectionIndex, sections]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    sessionId,
    sections,
    currentSection,
    currentSectionIndex,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    overallQuestionIndex,
    sectionTimeRemaining,
    questionTimeRemaining,
    formatTime,
    submitCurrentAnswer,
    skipQuestion,
    continueToNextSection,
    start,
    results,
    isTrial,
  };
}
