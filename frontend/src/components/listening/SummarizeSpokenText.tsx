import { useState } from 'react';
import type { SubmitAnswerResponse } from '../../types';
import { submitAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import ScoreDisplay from '../common/ScoreDisplay';
import AudioPlayer from '../common/AudioPlayer';

interface Props {
  question: any;
  onNext: () => void;
  mode?: 'practice' | 'exam';
  examSessionId?: string;
}

export default function SummarizeSpokenText({ question, onNext, mode = 'practice', examSessionId }: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitAnswer({
        mode: mode,
        exam_session_id: examSessionId,
        question_type: 'summarize_spoken_text',
        section: 'listening',
        question_id: question.id,
        user_answer: text,
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

  return (
    <QuestionLayout
      title="Summarize Spoken Text"
      instruction="Listen to the audio and write a summary of 50-70 words."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.75} maxPlays={1} onEnded={() => setAudioPlayed(true)} />
        {!audioPlayed && !isReview && <p className="text-xs text-gray-400 mt-1">Listen to the audio before writing your summary.</p>}
      </div>

      <textarea
        value={text}
        onChange={(e) => !isReview && setText(e.target.value)}
        readOnly={isReview}
        placeholder="Write your summary here (50-70 words)..."
        className={`w-full h-40 p-4 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0072CE] ${
          isReview ? 'bg-gray-50' : ''
        }`}
      />

      <div className="flex items-center justify-between mt-2">
        <span className={`text-sm ${wordCount < 50 ? 'text-yellow-600' : wordCount > 70 ? 'text-red-600' : 'text-green-600'}`}>
          Words: {wordCount} {wordCount < 50 ? '(min 50)' : wordCount > 70 ? '(max 70)' : ''}
        </span>
        {isReview ? (
          <button onClick={() => setShowingScore(true)}
            className="border border-[#003057] text-[#003057] py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors">
            View Score
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={wordCount < 1 || submitting}
            className="bg-[#0072CE] text-white py-2 px-6 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
            {submitting ? 'Scoring...' : 'Submit'}
          </button>
        )}
      </div>
    </QuestionLayout>
  );
}
