import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';

interface Props {
  question: any;
  onNext: () => void;
}

export default function VocabularyWordOrder({ question, onNext }: Props) {
  const [orders, setOrders] = useState<number[][]>(
    question.items.map((item: any) => item.words.map((_: any, i: number) => i))
  );
  const [placed, setPlaced] = useState<number[][]>(
    question.items.map(() => [] as number[])
  );
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const addWord = (itemIdx: number, wordIdx: number) => {
    const nextPlaced = [...placed];
    const nextOrders = [...orders];
    nextPlaced[itemIdx] = [...nextPlaced[itemIdx], wordIdx];
    nextOrders[itemIdx] = nextOrders[itemIdx].filter((i) => i !== wordIdx);
    setPlaced(nextPlaced);
    setOrders(nextOrders);
  };

  const removeWord = (itemIdx: number, posIdx: number) => {
    const nextPlaced = [...placed];
    const nextOrders = [...orders];
    const wordIdx = nextPlaced[itemIdx][posIdx];
    nextPlaced[itemIdx] = nextPlaced[itemIdx].filter((_, i) => i !== posIdx);
    nextOrders[itemIdx] = [...nextOrders[itemIdx], wordIdx];
    setPlaced(nextPlaced);
    setOrders(nextOrders);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: question.section,
        question_id: question.id,
        user_answer: placed,
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
  const correctOrders = isReview ? (result.correct_answers as number[][]) : [];

  return (
    <QuestionLayout
      title="Word Order"
      instruction="Rearrange the words to make sentences."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="space-y-8">
        {question.items.map((item: any, itemIdx: number) => {
          const userOrder = placed[itemIdx];
          const correctOrder = isReview ? correctOrders[itemIdx] : [];
          const isCorrect = isReview && JSON.stringify(userOrder) === JSON.stringify(correctOrder);

          return (
            <div key={itemIdx} className={`border rounded-lg p-4 ${
              isReview
                ? isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                : ''
            }`}>
              <span className="text-sm font-bold text-[#003057] mb-3 block">{itemIdx + 1}</span>

              {/* Available words */}
              {!isReview && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {orders[itemIdx].map((wordIdx: number) => (
                    <button
                      key={wordIdx}
                      onClick={() => addWord(itemIdx, wordIdx)}
                      className="px-3 py-1.5 bg-[#F2A900] text-[#003057] rounded text-sm font-medium hover:bg-[#e09d00] transition-colors"
                    >
                      {item.words[wordIdx]}
                    </button>
                  ))}
                </div>
              )}

              {/* Placed sentence */}
              <div className={`flex flex-wrap items-center gap-1 min-h-[44px] p-3 rounded-lg border-2 border-dashed ${
                isReview
                  ? isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                  : 'border-gray-300 bg-gray-50'
              }`}>
                {userOrder.length === 0 ? (
                  <span className="text-gray-400 text-sm italic">Click words above to build the sentence...</span>
                ) : (
                  userOrder.map((wordIdx: number, posIdx: number) => (
                    <button
                      key={posIdx}
                      onClick={() => !isReview && removeWord(itemIdx, posIdx)}
                      disabled={isReview}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        isReview
                          ? 'bg-gray-600 text-white cursor-default'
                          : 'bg-[#003057] text-white hover:bg-red-600'
                      }`}
                    >
                      {item.words[wordIdx]}
                    </button>
                  ))
                )}
                {userOrder.length > 0 && (
                  <span className="text-lg font-bold text-gray-500 ml-1">{item.punctuation}</span>
                )}
              </div>

              {/* Show correct order when wrong */}
              {isReview && !isCorrect && correctOrder.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <span className="text-xs font-semibold text-green-700">Correct: </span>
                  <span className="text-green-800">
                    {correctOrder.map((wi: number) => item.words[wi]).join(' ')}{item.punctuation}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isReview ? (
        <button
          onClick={() => setShowingScore(true)}
          className="mt-6 w-full border border-[#003057] text-[#003057] py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Score
        </button>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={placed.some((p) => p.length === 0) || submitting}
          className="mt-6 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
