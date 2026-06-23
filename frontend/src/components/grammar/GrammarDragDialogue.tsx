import { useMemo, useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import { seededShuffle } from '../../utils/shuffle';

interface Props {
  question: any;
  onNext: () => void;
}

export default function GrammarDragDialogue({ question, onNext }: Props) {
  const blankMap = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 0;
    question.lines.forEach((line: any, lineIdx: number) => {
      line.parts.forEach((part: any, partIdx: number) => {
        if (part.blank) {
          map.set(`${lineIdx}:${partIdx}`, counter++);
        }
      });
    });
    return map;
  }, [question.id]);

  const blankCount = blankMap.size;

  const shuffledBank = useMemo<string[]>(
    () => seededShuffle(question.word_bank, question.id),
    [question.id]
  );

  const [placed, setPlaced] = useState<(string | null)[]>(new Array(blankCount).fill(null));
  const [dragWord, setDragWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const used = new Set(placed.filter(Boolean));
  const available = shuffledBank.filter((w: string) => !used.has(w));

  const drop = (idx: number) => {
    if (!dragWord) return;
    const next = [...placed]; next[idx] = dragWord; setPlaced(next); setDragWord(null);
  };

  const remove = (idx: number) => {
    const next = [...placed]; next[idx] = null; setPlaced(next);
  };

  // Tap-to-select a word, then tap a gap to place it (mobile), alongside drag.
  const tapWord = (word: string) => {
    setSelectedWord((prev) => (prev === word ? null : word));
  };

  const tapBlank = (idx: number) => {
    if (selectedWord) {
      const next = [...placed]; next[idx] = selectedWord; setPlaced(next);
      setSelectedWord(null);
    } else if (placed[idx]) {
      remove(idx);
    }
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
  const correctAnswers = isReview ? (result.correct_answers as string[]) : [];

  return (
    <QuestionLayout
      title="Complete the Dialogue"
      instruction="Tap a word then tap a gap to place it (or drag on desktop). Tap a placed word to remove it."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      {/* Word bank */}
      {!isReview && (
        <div className="flex flex-wrap gap-2.5 p-3 bg-white border rounded-lg mb-6">
          <span className="text-xs text-gray-400 w-full mb-1">
            Word Bank{' '}
            <span className="text-gray-300">— tap a word, then tap a gap (or drag on desktop)</span>
          </span>
          {available.map((w: string) => {
            const isSelected = selectedWord === w;
            return (
              <span
                key={w}
                draggable
                onDragStart={() => setDragWord(w)}
                onClick={() => tapWord(w)}
                className={`tap-target inline-flex items-center px-3.5 py-2 rounded text-sm cursor-grab font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#0072CE] text-white ring-2 ring-offset-1 ring-[#0072CE]'
                    : 'bg-[#F2A900] text-[#003057] hover:bg-[#e09d00]'
                }`}
              >
                {w}
              </span>
            );
          })}
        </div>
      )}

      {/* Dialogue */}
      <div className="space-y-3">
        {question.lines.map((line: any, lineIdx: number) => (
          <div key={lineIdx} className="flex gap-3">
            <span className="font-bold text-sm text-[#003057] min-w-[80px] text-right pt-1">
              {line.speaker}:
            </span>
            <div className="flex-1 text-sm leading-loose">
              {line.parts.map((part: any, partIdx: number) => {
                if (part.blank) {
                  const bi = blankMap.get(`${lineIdx}:${partIdx}`)!;
                  const word = placed[bi];
                  const correct = isReview ? correctAnswers[bi] : null;
                  const isCorrect = isReview && word === correct;

                  return (
                    <span key={partIdx} className="inline-block mx-1">
                      <span
                        className={`inline-block px-3 py-1.5 min-w-[88px] border-2 rounded text-center text-sm align-middle ${
                          isReview
                            ? isCorrect
                              ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                              : 'border-red-500 bg-red-50 text-red-700 font-medium'
                            : word
                              ? 'border-[#0072CE] bg-blue-50 font-medium cursor-pointer border-dashed'
                              : selectedWord
                                ? 'border-[#0072CE] bg-blue-50/40 border-dashed cursor-pointer'
                                : 'border-gray-400 bg-gray-100 border-dashed cursor-pointer'
                        }`}
                        onDragOver={!isReview ? (e) => e.preventDefault() : undefined}
                        onDrop={!isReview ? () => drop(bi) : undefined}
                        onClick={!isReview ? () => tapBlank(bi) : undefined}
                      >
                        {word || '___'}
                      </span>
                      {isReview && !isCorrect && correct && (
                        <span className="ml-1 text-xs text-green-600 font-semibold">{correct}</span>
                      )}
                    </span>
                  );
                }
                return <span key={partIdx}>{part.text}</span>;
              })}
            </div>
          </div>
        ))}
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
          disabled={placed.some((w) => w === null) || submitting}
          className="mt-6 w-full bg-[#0072CE] text-white py-2.5 px-4 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      )}
    </QuestionLayout>
  );
}
