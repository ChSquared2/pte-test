import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: any;
  onNext: () => void;
}

export default function GrammarSelectBlanks({ question, onNext }: Props) {
  const [answers, setAnswers] = useState<string[]>(new Array(question.items.length).fill(''));
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const handleChange = (idx: number, val: string) => {
    const next = [...answers];
    next[idx] = val;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: question.section,
        question_id: question.id,
        user_answer: answers,
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
  const correctAnswers = isReview ? (result.correct_answers as string[]) : [];

  return (
    <QuestionLayout
      title="Select Blanks"
      instruction="Select a word or phrase to fill the gaps."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="space-y-4">
        {question.items.map((item: any, idx: number) => {
          const userAnswer = answers[idx];
          const correct = isReview ? correctAnswers[idx] : null;
          const isCorrect = isReview && userAnswer === correct;

          return (
            <div key={idx} className="flex items-center flex-wrap gap-1 bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
              <span className="font-medium text-gray-500 mr-2">{idx + 1}</span>
              <span>{item.text_before}</span>
              <span className="inline-block mx-1">
                <select
                  value={userAnswer}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  disabled={isReview}
                  className={`inline-block px-3 py-1.5 border-2 rounded text-sm font-medium ${
                    isReview
                      ? isCorrect
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-[#0072CE] bg-blue-50'
                  }`}
                >
                  <option value="">Select an option</option>
                  {item.options.map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {isReview && !isCorrect && correct && (
                  <span className="ml-1 text-xs text-green-600 font-semibold">{correct}</span>
                )}
              </span>
              <span>{item.text_after}</span>
            </div>
          );
        })}
      </div>

      {isReview ? (
        <button
          onClick={() => setShowingScore(true)}
          className="mt-4 w-full border border-[#003057] text-[#003057] py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Score
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={answers.some((a) => !a) || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
