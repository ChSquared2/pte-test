import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: any;
  onNext: () => void;
}

export default function GrammarErrorCorrection({ question, onNext }: Props) {
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

  // Highlight the underlined word in the sentence
  const parts = question.sentence.split(question.underlined_word);

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
        {question.options.map((option: string, idx: number) => (
          <label
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(idx)}`}
          >
            <input type="radio" checked={selected === idx}
              onChange={() => !isReview && setSelected(idx)}
              disabled={isReview} className="mt-0.5" />
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
