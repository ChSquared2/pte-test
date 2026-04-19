import { useState } from 'react';
import type { FillBlanksDropdownQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: FillBlanksDropdownQuestion;
  onNext: () => void;
}

export default function FillBlanksDropdown({ question, onNext }: Props) {
  const [answers, setAnswers] = useState<string[]>(new Array(question.blanks.length).fill(''));
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const handleChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
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

  // Parse text and replace ___BLANKX___ with dropdowns
  const renderText = () => {
    const parts = question.text.split(/___BLANK(\d+)___/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const blankIndex = parseInt(part);
        const blank = question.blanks.find((b) => b.index === blankIndex);
        if (!blank) return null;

        const userAnswer = answers[blankIndex];
        const correct = isReview && correctAnswers[blankIndex];
        const isCorrect = isReview && userAnswer === correct;

        return (
          <span key={`blank-${blankIndex}`} className="inline-block mx-1">
            <select
              value={userAnswer}
              onChange={(e) => handleChange(blankIndex, e.target.value)}
              disabled={isReview}
              className={`inline-block px-2 py-1 border-2 rounded text-sm font-medium ${
                isReview
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-[#0072CE] bg-blue-50'
              }`}
            >
              <option value="">-- Select --</option>
              {blank.options.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {isReview && !isCorrect && correct && (
              <span className="ml-1 text-xs text-green-600 font-semibold">{correct}</span>
            )}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <QuestionLayout
      title="Fill in the Blanks (Dropdown)"
      instruction="Read the passage and select the appropriate word from each dropdown menu to complete the text."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
        {renderText()}
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
