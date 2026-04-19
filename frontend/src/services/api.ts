import axios from 'axios';
import type { Question, Section, QuestionType, SubmitAnswerResponse, ProgressOverview, ExamSession } from '../types';
import { getStoredUserId } from '../context/UserContext';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const userId = getStoredUserId();
  const method = (config.method || 'get').toLowerCase();
  if (method === 'get' || method === 'delete') {
    config.params = { ...(config.params || {}), user_id: userId };
  } else if (config.data instanceof FormData) {
    if (!config.data.has('user_id')) config.data.append('user_id', userId);
  } else if (config.data && typeof config.data === 'object') {
    config.data = { ...config.data, user_id: userId };
  } else if (config.data == null) {
    config.data = { user_id: userId };
  }
  return config;
});

// Questions
export async function getQuestions(section: Section, type?: QuestionType): Promise<Question[]> {
  const params: Record<string, string> = { section };
  if (type) params.type = type;
  const res = await api.get('/questions', { params });
  return res.data;
}

// Scoring
export async function submitAnswer(data: {
  mode: 'exam' | 'practice';
  exam_session_id?: string;
  question_type: QuestionType;
  section: Section;
  question_id: string;
  user_answer: unknown;
  time_spent_seconds: number;
}): Promise<SubmitAnswerResponse> {
  const res = await api.post('/scoring/submit', data);
  return res.data;
}

export async function submitSpeakingAnswer(
  questionId: string,
  questionType: QuestionType,
  audioBlob: Blob,
  mode: 'exam' | 'practice',
  timeSpent: number,
  examSessionId?: string,
): Promise<SubmitAnswerResponse> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('question_id', questionId);
  formData.append('question_type', questionType);
  formData.append('mode', mode);
  formData.append('time_spent_seconds', timeSpent.toString());
  if (examSessionId) formData.append('exam_session_id', examSessionId);
  const res = await api.post('/scoring/speaking', formData);
  return res.data;
}

// Exam sessions
export async function startExam(isTrial: boolean = false): Promise<{
  session_id: string;
  sections: { key: string; label: string; timer_type: string; time_limit_seconds: number; questions: Question[] }[];
  is_trial: boolean;
}> {
  const res = await api.post('/exam/start', { is_trial: isTrial });
  return res.data;
}

export async function submitExamSection(sessionId: string, section: Section, answers: unknown[]): Promise<void> {
  await api.post('/exam/submit-section', { session_id: sessionId, section, answers });
}

export async function completeExam(sessionId: string): Promise<ExamSession> {
  const res = await api.post('/exam/complete', { session_id: sessionId });
  return res.data;
}

export async function getExamResults(sessionId: string): Promise<ExamSession> {
  const res = await api.get(`/exam/${sessionId}/results`);
  return res.data;
}

// Progress
export async function getProgress(): Promise<ProgressOverview> {
  const res = await api.get('/progress/overview');
  return res.data;
}

export async function resetProgress(): Promise<void> {
  await api.delete('/progress/reset');
}
