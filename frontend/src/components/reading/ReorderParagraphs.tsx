import { useState } from 'react';
import type { ReorderParagraphsQuestion, SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: ReorderParagraphsQuestion;
  onNext: () => void;
}

export default function ReorderParagraphs({ question, onNext }: Props) {
  const [order, setOrder] = useState<number[]>(question.paragraphs.map((_, i) => i));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;

    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };

  const moveItem = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      [next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]];
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
        user_answer: order,
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
  const correctOrder = isReview ? (result.correct_answers as number[]) : [];

  return (
    <QuestionLayout
      title="Re-order Paragraphs"
      instruction="Arrange the text boxes in the correct order by dragging them or using the arrow buttons."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      {isReview && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          Correct order: {correctOrder.map((idx, pos) => `${pos + 1}. Paragraph ${idx + 1}`).join(' → ')}
        </div>
      )}

      <div className="space-y-2">
        {order.map((paraIdx, posIdx) => {
          const correctPos = isReview ? correctOrder.indexOf(paraIdx) : -1;
          const isCorrectPosition = isReview && correctPos === posIdx;

          return (
            <div
              key={paraIdx}
              draggable={!isReview}
              onDragStart={!isReview ? () => handleDragStart(posIdx) : undefined}
              onDragOver={!isReview ? (e) => handleDragOver(e, posIdx) : undefined}
              onDragEnd={!isReview ? () => setDragIdx(null) : undefined}
              className={`flex items-start gap-3 p-3 border-2 rounded-lg transition-colors ${
                isReview
                  ? isCorrectPosition
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : dragIdx === posIdx
                    ? 'border-[#0072CE] bg-blue-50 cursor-grab'
                    : 'border-gray-200 bg-white cursor-grab active:cursor-grabbing'
              }`}
            >
              <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                isReview
                  ? isCorrectPosition ? 'bg-green-600' : 'bg-red-600'
                  : 'bg-[#003057]'
              }`}>
                {posIdx + 1}
              </span>

              <p className="flex-1 text-sm leading-relaxed">{question.paragraphs[paraIdx]}</p>

              {!isReview && (
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <button
                    onClick={() => moveItem(posIdx, 'up')}
                    disabled={posIdx === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(posIdx, 'down')}
                    disabled={posIdx === order.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs"
                  >
                    ▼
                  </button>
                </div>
              )}

              {isReview && !isCorrectPosition && (
                <span className="text-xs text-red-600 font-semibold flex-shrink-0">
                  Should be #{correctPos + 1}
                </span>
              )}
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
          disabled={submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
