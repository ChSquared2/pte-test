import { useState, useMemo } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import { seededShuffle } from '../../utils/shuffle';

interface Props {
  question: any;
  onNext: () => void;
}

export default function GrammarErrorCorrection({ question, onNext }: Props) {
  const shuffledIndices = useMemo(
    () => seededShuffle<number>(question.options.map((_: any, i: number) => i), question.id),
    [question.id]
  );

  const [selected, setSelected] = useState<number | null>(null); // display index
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const toOriginal = (displayIdx: number) => shuffledIndices[displayIdx];

  const handleSubmit = async () => {
    if (selected === null) return;
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: question.section,
        question_id: question.id,
        user_answer: toOriginal(selected),
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
  const correctOriginal = isReview ? (result.correct_answers as number) : null;

  // Highlight the underlined word in the sentence
  const parts = question.sentence.split(question.underlined_word);

  const getOptionStyle = (displayIdx: number) => {
    if (isReview) {
      const origIdx = toOriginal(displayIdx);
      if (origIdx === correctOriginal) return 'border-green-500 bg-green-50';
      if (displayIdx === selected) return 'border-red-500 bg-red-50';
      return 'border-gray-200';
    }
    return selected === displayIdx ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300';
  };

  return (
    <QuestionLayout
      title="Error Correction"
      instruction="The sentence below has a mistake. Choose the best option to correct the mistake."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-gray-50 p-4 rounded-lg text-lg mb-6">
        {parts[0]}
        <span className="underline decoration-red-500 decoration-2 font-semibold text-red-700">
          {question.underlined_word}
        </span>
        {parts.slice(1).join(question.underlined_word)}
      </div>

      <div className="space-y-2">
        {shuffledIndices.map((origIdx: number, displayIdx: number) => (
          <label
            key={origIdx}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(displayIdx)}`}
          >
            <input type="radio" checked={selected === displayIdx}
              onChange={() => !isReview && setSelected(displayIdx)}
              disabled={isReview} className="mt-0.5" />
            <span className="text-sm flex-1">{question.options[origIdx]}</span>
            {isReview && toOriginal(displayIdx) === correctOriginal && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && displayIdx === selected && toOriginal(displayIdx) !== correctOriginal && (
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
