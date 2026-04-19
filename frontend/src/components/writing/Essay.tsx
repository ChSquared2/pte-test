import { useState } from 'react';
import type { EssayQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: EssayQuestion;
  onNext: () => void;
  mode?: 'practice' | 'exam';
  examSessionId?: string;
}

export default function Essay({ question, onNext, mode = 'practice', examSessionId }: Props) {
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
        question_type: 'essay',
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
      title="Essay"
      instruction="You will have 20 minutes to write an essay of 200-300 words on the given topic. Support your response with reasons and examples."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-medium text-[#003057]">{question.prompt}</p>
      </div>

      <textarea
        value={text}
        onChange={(e) => !isReview && setText(e.target.value)}
        readOnly={isReview}
        placeholder="Write your essay here..."
        className={`w-full h-64 p-4 border rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-[#0072CE] focus:border-transparent ${
          isReview ? 'bg-gray-50' : ''
        }`}
      />

      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm ${wordCount < 200 ? 'text-yellow-600' : wordCount > 300 ? 'text-red-600' : 'text-green-600'}`}>
          Word count: {wordCount} {wordCount < 200 ? '(min 200)' : wordCount > 300 ? '(max 300)' : ''}
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
            {submitting ? 'Scoring with AI...' : 'Submit Essay'}
          </button>
        )}
      </div>
    </QuestionLayout>
  );
}
