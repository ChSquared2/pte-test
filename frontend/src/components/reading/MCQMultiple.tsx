import { useState, useMemo } from 'react';
import type { MCQMultipleQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import { seededShuffle } from '../../utils/shuffle';

interface Props {
  question: MCQMultipleQuestion;
  onNext: () => void;
}

export default function MCQMultiple({ question, onNext }: Props) {
  // Shuffle options: shuffledIndices[displayPos] = originalIndex
  const shuffledIndices = useMemo(
    () => seededShuffle(question.options.map((_, i) => i), question.id),
    [question.id]
  );

  const [selected, setSelected] = useState<Set<number>>(new Set()); // display indices
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const toOriginal = (displayIdx: number) => shuffledIndices[displayIdx];

  const toggle = (displayIdx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(displayIdx)) next.delete(displayIdx);
      else next.add(displayIdx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      // Convert display indices to original indices for submission
      const originalIndices = Array.from(selected).map(toOriginal);
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: question.section,
        question_id: question.id,
        user_answer: originalIndices,
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
  const correctOriginals = isReview ? new Set(result.correct_answers as number[]) : new Set<number>();

  const getOptionStyle = (displayIdx: number) => {
    if (isReview) {
      const origIdx = toOriginal(displayIdx);
      const isCorrect = correctOriginals.has(origIdx);
      const isSelected = selected.has(displayIdx);
      if (isCorrect) return 'border-green-500 bg-green-50';
      if (isSelected && !isCorrect) return 'border-red-500 bg-red-50';
      return 'border-gray-200';
    }
    return selected.has(displayIdx) ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300';
  };

  return (
    <QuestionLayout
      title="Multiple Choice - Multiple Answers"
      instruction="Read the passage below and select ALL correct answers. Note: selecting incorrect answers will reduce your score."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-60 overflow-y-auto">
        {question.passage}
      </div>

      <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>

      <div className="space-y-2">
        {shuffledIndices.map((origIdx, displayIdx) => (
          <label
            key={origIdx}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(displayIdx)}`}
          >
            <input
              type="checkbox"
              checked={selected.has(displayIdx)}
              onChange={() => !isReview && toggle(displayIdx)}
              disabled={isReview}
              className="mt-0.5"
            />
            <span className="text-sm flex-1">{question.options[origIdx]}</span>
            {isReview && correctOriginals.has(origIdx) && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && selected.has(displayIdx) && !correctOriginals.has(origIdx) && (
              <span className="text-xs font-semibold text-red-600">Incorrect</span>
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
          disabled={selected.size === 0 || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
