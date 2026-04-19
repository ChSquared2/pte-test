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

export default function WriteFromDictation({ question, onNext }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: 'practice', question_type: 'write_from_dictation', section: 'listening',
        question_id: question.id, user_answer: text, time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally { setSubmitting(false); }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;
  const correctText = isReview ? (result.correct_answers as string) : '';

  return (
    <QuestionLayout
      title="Write from Dictation"
      instruction="Listen to the sentence and type exactly what you hear."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.9} maxPlays={1} />
      </div>
      <input type="text" value={text}
        onChange={(e) => !isReview && setText(e.target.value)}
        readOnly={isReview}
        placeholder="Type the sentence you heard..."
        className={`w-full p-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0072CE] ${
          isReview ? 'bg-gray-50' : ''
        }`} />

      {isReview && correctText && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-xs font-semibold text-green-700 mb-1">Correct sentence:</p>
          <p className="text-sm text-green-800">{correctText}</p>
        </div>
      )}

      {isReview ? (
        <button onClick={() => setShowingScore(true)}
          className="mt-4 w-full border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          View Score
        </button>
      ) : (
        <button onClick={handleSubmit} disabled={!text.trim() || submitting}
          className="mt-4 w-full bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </QuestionLayout>
  );
}
