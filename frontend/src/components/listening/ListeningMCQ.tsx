import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import AudioPlayer from '../common/AudioPlayer';

interface Props {
  question: any;
  onNext: () => void;
  multiple?: boolean;
}

export default function ListeningMCQ({ question, onNext, multiple = false }: Props) {
  const [selectedSingle, setSelectedSingle] = useState<number | null>(null);
  const [selectedMulti, setSelectedMulti] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const toggleMulti = (idx: number) => {
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const userAnswer = multiple ? Array.from(selectedMulti) : selectedSingle;
      const res = await submitAnswer({
        mode: 'practice',
        question_type: question.type,
        section: 'listening',
        question_id: question.id,
        user_answer: userAnswer,
        time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally { setSubmitting(false); }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;

  const isHighlightSummary = question.type === 'highlight_correct_summary';
  const title = isHighlightSummary
    ? 'Highlight Correct Summary'
    : multiple ? 'Multiple Choice - Multiple Answers' : 'Multiple Choice - Single Answer';
  const instructionText = isHighlightSummary
    ? 'Listen to the audio, then select the paragraph that best summarizes it.'
    : multiple ? 'Listen and select ALL correct answers.' : 'Listen and select the single best answer.';
  const disabled = multiple ? selectedMulti.size === 0 : selectedSingle === null;

  // Correct answer highlighting
  const correctSingle = isReview && !multiple ? (result.correct_answers as number) : null;
  const correctMultiSet = isReview && multiple ? new Set(result.correct_answers as number[]) : new Set<number>();

  const getOptionStyle = (idx: number) => {
    if (isReview) {
      if (multiple) {
        const isCorrect = correctMultiSet.has(idx);
        const isSelected = selectedMulti.has(idx);
        if (isCorrect) return 'border-green-500 bg-green-50';
        if (isSelected && !isCorrect) return 'border-red-500 bg-red-50';
        return 'border-gray-200';
      } else {
        if (idx === correctSingle) return 'border-green-500 bg-green-50';
        if (idx === selectedSingle) return 'border-red-500 bg-red-50';
        return 'border-gray-200';
      }
    }
    const isSelected = multiple ? selectedMulti.has(idx) : selectedSingle === idx;
    return isSelected ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300';
  };

  return (
    <QuestionLayout
      title={title}
      instruction={instructionText}
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.75} maxPlays={1} />
      </div>
      {question.prompt && <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>}
      <div className="space-y-2">
        {question.options.map((opt: string, idx: number) => (
          <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(idx)}`}>
            {multiple
              ? <input type="checkbox" checked={selectedMulti.has(idx)} onChange={() => !isReview && toggleMulti(idx)} disabled={isReview} className="mt-0.5" />
              : <input type="radio" checked={selectedSingle === idx} onChange={() => !isReview && setSelectedSingle(idx)} disabled={isReview} className="mt-0.5" />
            }
            <span className="text-sm flex-1">{opt}</span>
            {isReview && !multiple && idx === correctSingle && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && !multiple && idx === selectedSingle && idx !== correctSingle && (
              <span className="text-xs font-semibold text-red-600">Your answer</span>
            )}
            {isReview && multiple && correctMultiSet.has(idx) && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && multiple && selectedMulti.has(idx) && !correctMultiSet.has(idx) && (
              <span className="text-xs font-semibold text-red-600">Incorrect</span>
            )}
          </label>
        ))}
      </div>
      {isReview ? (
        <button onClick={() => setShowingScore(true)}
          className="mt-4 w-full border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          View Score
        </button>
      ) : (
        <button onClick={handleSubmit} disabled={disabled || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </QuestionLayout>
  );
}
