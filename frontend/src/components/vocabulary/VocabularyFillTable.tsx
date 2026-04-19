import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: any;
  onNext: () => void;
}

export default function VocabularyFillTable({ question, onNext }: Props) {
  // Count total blanks
  const blanks: { row: number; col: number }[] = [];
  question.rows.forEach((row: any, ri: number) => {
    row.cells.forEach((cell: any, ci: number) => {
      if (cell.blank) blanks.push({ row: ri, col: ci });
    });
  });

  const [answers, setAnswers] = useState<string[]>(new Array(blanks.length).fill(''));
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

  let blankIdx = 0;

  return (
    <QuestionLayout
      title="Fill the Table"
      instruction="Write a word or phrase to fill the gaps."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-[#003057] text-white">
              {question.columns.map((col: string, i: number) => (
                <th key={i} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {question.rows.map((row: any, ri: number) => (
              <tr key={ri} className="hover:bg-gray-50">
                {row.cells.map((cell: any, ci: number) => {
                  if (cell.blank) {
                    const bi = blankIdx++;
                    const userAnswer = answers[bi];
                    const correct = isReview ? correctAnswers[bi] : null;
                    const isCorrect = isReview && userAnswer.trim().toLowerCase() === (correct || '').trim().toLowerCase();

                    return (
                      <td key={ci} className="border border-gray-300 px-2 py-2">
                        <input
                          type="text"
                          value={userAnswer}
                          onChange={(e) => handleChange(bi, e.target.value)}
                          readOnly={isReview}
                          className={`w-full px-2 py-1 border-2 rounded text-sm ${
                            isReview
                              ? isCorrect
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-red-500 bg-red-50 text-red-700'
                              : 'border-[#0072CE] bg-blue-50'
                          }`}
                          placeholder="Type here..."
                        />
                        {isReview && !isCorrect && correct && (
                          <span className="text-xs text-green-600 font-semibold block mt-1">{correct}</span>
                        )}
                      </td>
                    );
                  }
                  return (
                    <td key={ci} className="border border-gray-300 px-4 py-2 text-sm">
                      {cell.value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
          disabled={answers.some((a) => !a.trim()) || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
