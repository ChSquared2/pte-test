import { useState } from 'react';
import type { SummarizeWrittenTextQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: SummarizeWrittenTextQuestion;
  onNext: () => void;
  mode?: 'practice' | 'exam';
  examSessionId?: string;
}

export default function SummarizeWrittenText({ question, onNext, mode = 'practice', examSessionId }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = async () => {
    if (wordCount < 1) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: mode,
        exam_session_id: examSessionId,
        question_type: 'summarize_written_text',
        section: 'writing',
        question_id: question.id,
        user_answer: text,
        time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;

  return (
    <QuestionLayout
      title="Summarize Written Text"
      instruction="Read the passage below. Write a single sentence (5-75 words) that summarizes the main idea and key supporting points."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-60 overflow-y-auto">
        {question.passage}
      </div>

      <textarea
        value={text}
        onChange={(e) => !isReview && setText(e.target.value)}
        readOnly={isReview}
        placeholder="Write your summary in a single sentence..."
        className={`w-full h-24 p-4 border rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent ${
          isReview ? 'bg-gray-50' : ''
        }`}
      />

      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm ${wordCount < 5 ? 'text-yellow-600' : wordCount > 75 ? 'text-red-600' : 'text-green-600'}`}>
          Word count: {wordCount} {wordCount < 5 ? '(min 5)' : wordCount > 75 ? '(max 75)' : ''}
        </span>
        {isReview ? (
          <button
            onClick={() => setShowingScore(true)}
            className="border border-[#003057] text-[#003057] py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Score
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={wordCount < 1 || submitting}
            className="bg-[#0072CE] text-white py-2 px-6 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Scoring with AI...' : 'Submit Summary'}
          </button>
        )}
      </div>
    </QuestionLayout>
  );
}
