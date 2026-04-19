import { useMemo, useState } from 'react';
import type { FillBlanksDragQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import { seededShuffle } from '../../utils/shuffle';

interface Props {
  question: FillBlanksDragQuestion;
  onNext: () => void;
}

export default function FillBlanksDrag({ question, onNext }: Props) {
  const [placedWords, setPlacedWords] = useState<(string | null)[]>(
    new Array(question.blank_positions.length).fill(null)
  );
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [showingScore, setShowingScore] = useState(true);

  const shuffledOptions = useMemo<string[]>(
    () => seededShuffle(question.options, question.id),
    [question.id]
  );
  const usedWords = new Set(placedWords.filter(Boolean));
  const availableWords = shuffledOptions.filter((w) => !usedWords.has(w));

  const handleDrop = (blankIndex: number) => {
    if (!draggedWord) return;
    setPlacedWords((prev) => {
      const next = [...prev];
      next[blankIndex] = draggedWord;
      return next;
    });
    setDraggedWord(null);
  };

  const handleRemove = (blankIndex: number) => {
    setPlacedWords((prev) => {
      const next = [...prev];
      next[blankIndex] = null;
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
        user_answer: placedWords,
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

  // Parse text: split by ___BLANKX___
  const renderText = () => {
    const parts = question.text.split(/___BLANK(\d+)___/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const blankIndex = parseInt(part);
        const word = placedWords[blankIndex];
        const correct = isReview ? correctAnswers[blankIndex] : null;
        const isCorrect = isReview && word === correct;

        return (
          <span key={`blank-${blankIndex}`} className="inline-block mx-1">
            <span
              className={`inline-block px-3 py-1 min-w-[80px] border-2 rounded text-center text-sm ${
                isReview
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                    : 'border-red-500 bg-red-50 text-red-700 font-medium'
                  : word
                    ? 'border-[#0072CE] bg-blue-50 font-medium cursor-pointer border-dashed'
                    : 'border-gray-400 bg-gray-100 border-dashed'
              }`}
              onDragOver={!isReview ? (e) => e.preventDefault() : undefined}
              onDrop={!isReview ? () => handleDrop(blankIndex) : undefined}
              onClick={!isReview && word ? () => handleRemove(blankIndex) : undefined}
              title={isReview ? undefined : word ? 'Click to remove' : 'Drop a word here'}
            >
              {word || '___'}
            </span>
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
      title="Fill in the Blanks (Drag & Drop)"
      instruction="Drag words from the box below and drop them into the blanks. Click a placed word to remove it."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-loose mb-4">
        {renderText()}
      </div>

      {/* Word bank */}
      {!isReview && (
        <div className="flex flex-wrap gap-2 p-3 bg-white border rounded-lg">
          <span className="text-xs text-gray-400 w-full mb-1">Word Bank:</span>
          {availableWords.map((word) => (
            <span
              key={word}
              draggable
              onDragStart={() => setDraggedWord(word)}
              onClick={() => {
                const emptyIdx = placedWords.findIndex((w) => w === null);
                if (emptyIdx !== -1) {
                  setPlacedWords((prev) => {
                    const next = [...prev];
                    next[emptyIdx] = word;
                    return next;
                  });
                }
              }}
              className="px-3 py-1.5 bg-[#003057] text-white rounded text-sm cursor-grab active:cursor-grabbing hover:bg-[#004080] transition-colors"
            >
              {word}
            </span>
          ))}
          {availableWords.length === 0 && (
            <span className="text-xs text-gray-400">All words placed</span>
          )}
        </div>
      )}

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
          disabled={placedWords.some((w) => w === null) || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
