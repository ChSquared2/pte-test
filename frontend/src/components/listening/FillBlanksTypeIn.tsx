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

export default function FillBlanksTypeIn({ question, onNext }: Props) {
  const blanksCount = (question.transcript_with_blanks.match(/___BLANK\d+___/g) || []).length;
  const [answers, setAnswers] = useState<string[]>(new Array(blanksCount).fill(''));
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
        mode: 'practice', question_type: 'fill_blanks_type_in', section: 'listening',
        question_id: question.id, user_answer: answers, time_spent_seconds: 0,
      });
      setResult(res);
      setShowingScore(true);
    } finally { setSubmitting(false); }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  const isReview = result !== null;
  const correctAnswers = isReview ? (result.correct_answers as string[]) : [];

  const parts = question.transcript_with_blanks.split(/___BLANK(\d+)___/);

  return (
    <QuestionLayout
      title="Fill in the Blanks (Listening)"
      instruction="Listen to the audio and type the missing words."
      timeLimit={isReview ? undefined : question.time_limit_seconds}
      onTimeExpire={handleSubmit}
    >
      <div className="mb-4">
        <AudioPlayer src={question.audio_url} playbackRate={0.75} maxPlays={1} />
      </div>
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-loose">
        {parts.map((part: string, i: number) => {
          if (i % 2 === 1) {
            const bi = parseInt(part);
            const userAnswer = answers[bi] || '';
            const correct = isReview ? correctAnswers[bi] : null;
            const isCorrect = isReview && userAnswer.trim().toLowerCase() === (correct || '').trim().toLowerCase();

            return (
              <span key={`b-${bi}`} className="inline-block mx-1">
                <input type="text" value={userAnswer}
                  onChange={(e) => handleChange(bi, e.target.value)}
                  readOnly={isReview}
                  className={`inline-block px-2 py-1 w-28 border-2 rounded text-sm text-center ${
                    isReview
                      ? isCorrect
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-[#0072CE] bg-blue-50'
                  }`}
                  placeholder="..." />
                {isReview && !isCorrect && correct && (
                  <span className="ml-1 text-xs text-green-600 font-semibold">{correct}</span>
                )}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
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
