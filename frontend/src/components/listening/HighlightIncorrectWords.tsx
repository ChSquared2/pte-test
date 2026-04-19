import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import AudioPlayer from '../common/AudioPlayer';

interface Props {
  question: any;
  onNext: () => void;
}

export default function HighlightIncorrectWords({ question, onNext }: Props) {
  const words = question.transcript.split(/\s+/);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice', question_type: 'highlight_incorrect_words', section: 'listening',
        question_id: question.id, user_answer: Array.from(selected), time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally { setSubmitting(false); }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;
  const correctIndices = isReview ? new Set(result.correct_answers as number[]) : new Set<number>();

  const getWordStyle = (idx: number) => {
    if (isReview) {
      const isIncorrect = correctIndices.has(idx);
      const wasSelected = selected.has(idx);
      if (isIncorrect && wasSelected) return 'bg-green-200 text-green-800 font-medium'; // correctly identified
      if (isIncorrect && !wasSelected) return 'bg-red-200 text-red-800 font-medium'; // missed
      if (!isIncorrect && wasSelected) return 'bg-red-100 text-red-600 line-through'; // wrong click
      return '';
    }
    return selected.has(idx) ? 'bg-red-200 text-red-800 font-medium' : 'hover:bg-gray-200';
  };

  return (
    <QuestionLayout
      title="Highlight Incorrect Words"
      instruction="Listen to the audio while reading the transcript below. Click on the words that differ from what is spoken."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.75} maxPlays={1} />
      </div>
      <div className="bg-gray-50 p-4 rounded-lg leading-loose">
        {words.map((word: string, idx: number) => (
          <span key={idx}
            onClick={() => !isReview && toggle(idx)}
            className={`inline-block px-1 py-0.5 mx-0.5 rounded text-sm transition-colors ${
              isReview ? '' : 'cursor-pointer'
            } ${getWordStyle(idx)}`}>
            {word}
          </span>
        ))}
      </div>

      {isReview && (
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-200 rounded inline-block" /> Correctly identified
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-200 rounded inline-block" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-red-100 rounded inline-block" /> Wrong click
          </span>
        </div>
      )}

      {isReview ? (
        <button onClick={() => setShowingScore(true)}
          className="mt-4 w-full border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          View Score
        </button>
      ) : (
        <button onClick={handleSubmit} disabled={submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </QuestionLayout>
  );
}
