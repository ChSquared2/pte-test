import { useState, useMemo } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import AudioPlayer from '../common/AudioPlayer';
import { seededShuffle } from '../../utils/shuffle';

interface Props {
  question: any;
  onNext: () => void;
}

export default function SelectMissingWord({ question, onNext }: Props) {
  const shuffledIndices = useMemo(
    () => seededShuffle(question.options.map((_: any, i: number) => i), question.id),
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
        mode: 'practice', question_type: 'select_missing_word', section: 'listening',
        question_id: question.id, user_answer: toOriginal(selected), time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally { setSubmitting(false); }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;
  const correctOriginal = isReview ? (result.correct_answers as number) : null;

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
      title="Select Missing Word"
      instruction="Listen to the audio. The last word or group of words is replaced by a beep. Select the option that best completes the recording."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.75} maxPlays={1} />
      </div>
      <div className="space-y-2">
        {shuffledIndices.map((origIdx: number, displayIdx: number) => (
          <label key={origIdx} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(displayIdx)}`}>
            <input type="radio" checked={selected === displayIdx}
              onChange={() => !isReview && setSelected(displayIdx)}
              disabled={isReview} />
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
        <button onClick={() => setShowingScore(true)}
          className="mt-4 w-full border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          View Score
        </button>
      ) : (
        <button onClick={handleSubmit} disabled={selected === null || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </QuestionLayout>
  );
}
