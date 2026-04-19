import { useState } from 'react';
import type { MCQSingleQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: MCQSingleQuestion;
  onNext: () => void;
}

export default function MCQSingle({ question, onNext }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const handleSubmit = async () => {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: question.section,
        question_id: question.id,
        user_answer: selected,
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
  const correctAnswer = isReview ? (result.correct_answers as number) : null;

  const getOptionStyle = (idx: number) => {
    if (isReview) {
      if (idx === correctAnswer) return 'border-green-500 bg-green-50';
      if (idx === selected) return 'border-red-500 bg-red-50';
      return 'border-gray-200';
    }
    return selected === idx ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300';
  };

  return (
    <QuestionLayout
      title="Multiple Choice - Single Answer"
      instruction="Read the passage below and select the single best answer to the question."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      {/* Passage */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-60 overflow-y-auto">
        {question.passage}
      </div>

      {/* Question */}
      <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((option, idx) => (
          <label
            key={idx}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(idx)}`}
          >
            <input
              type="radio"
              name="mcq-single"
              checked={selected === idx}
              onChange={() => !isReview && setSelected(idx)}
              disabled={isReview}
              className="mt-0.5"
            />
            <span className="text-sm flex-1">{option}</span>
            {isReview && idx === correctAnswer && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && idx === selected && idx !== correctAnswer && (
              <span className="text-xs font-semibold text-red-600">Your answer</span>
            )}
          </label>
        ))}
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
          disabled={selected === null || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
