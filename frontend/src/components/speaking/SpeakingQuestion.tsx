import { useState } from 'react';
import type { SubmitAnswerResponse, QuestionType } from '../../types';
import { submitSpeakingAnswer } from '../../services/api';
import QuestionLayout from '../common/QuestionLayout';
import AudioRecorder from '../common/AudioRecorder';
import ScoreDisplay from '../common/ScoreDisplay';
import AudioPlayer from '../common/AudioPlayer';

interface SpeakingQuestionProps {
  id: string;
  type: QuestionType;
  title: string;
  instruction: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  scenario?: string;
  prepTime: number;
  recordTime: number;
  timeLimit?: number;
  onNext: () => void;
  mode?: 'practice' | 'exam';
  examSessionId?: string;
}

export default function SpeakingQuestion({
  id, type, title, instruction,
  text, imageUrl, audioUrl, scenario,
  prepTime, recordTime, timeLimit,
  onNext, mode = 'practice', examSessionId,
}: SpeakingQuestionProps) {
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [audioPlayed, setAudioPlayed] = useState(!audioUrl);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [showingScore, setShowingScore] = useState(true);

  const handleRecordingComplete = (blob: Blob) => {
    setRecordedBlob(blob);
    setRecordedUrl(URL.createObjectURL(blob));
  };

  const handleSubmit = async () => {
    if (!recordedBlob) return;
    setSubmitting(true);
    try {
      const res = await submitSpeakingAnswer(id, type, recordedBlob, mode, 0, examSessionId);
      setResult(res);
      setShowingScore(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (result && showingScore) {
    return <ScoreDisplay result={result} onNext={onNext} onBack={() => setShowingScore(false)} />;
  }

  if (submitting) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-10 w-10 border-4 border-[#0072CE] border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-gray-500">Scoring your response with AI...</p>
      </div>
    );
  }

  const isReview = result !== null;

  return (
    <QuestionLayout title={title} instruction={instruction} timeLimit={isReview ? undefined : timeLimit}>
      {/* Audio stimulus (listen first) */}
      {audioUrl && !audioPlayed && !isReview && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Listen to the audio, then your recording will begin:</p>
          <AudioPlayer src={audioUrl} playbackRate={0.75} maxPlays={1} onEnded={() => setAudioPlayed(true)} autoPlay />
        </div>
      )}

      {/* Text to read */}
      {text && (
        <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4">
          {text}
        </div>
      )}

      {/* Image to describe */}
      {imageUrl && (
        <div className="mb-4">
          <img src={imageUrl} alt="Describe this image" className="max-w-full rounded-lg border" />
        </div>
      )}

      {/* Scenario */}
      {scenario && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-[#003057]">{scenario}</p>
        </div>
      )}

      {/* Review mode: show recorded audio */}
      {isReview && recordedUrl && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3 mb-4">
          <p className="text-sm font-medium text-gray-700">Your Recording</p>
          <audio controls src={recordedUrl} className="w-full" />
          <button
            onClick={() => setShowingScore(true)}
            className="w-full border border-[#003057] text-[#003057] py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            View Score
          </button>
        </div>
      )}

      {/* Recording */}
      {!isReview && audioPlayed && !recordedBlob && (
        <AudioRecorder
          maxDuration={recordTime}
          prepTime={prepTime}
          autoStart={true}
          onRecordingComplete={handleRecordingComplete}
        />
      )}

      {/* Recorded audio: mini player + submit button */}
      {!isReview && recordedUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-green-800">Recording Complete</p>
          <audio controls src={recordedUrl} className="w-full" />
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] transition-colors font-medium"
            >
              Submit for Scoring
            </button>
            <button
              onClick={() => {
                setRecordedBlob(null);
                setRecordedUrl(null);
              }}
              className="px-4 border border-gray-300 text-gray-600 py-2.5 rounded-lg hover:bg-gray-100 transition-colors text-sm"
            >
              Re-record
            </button>
          </div>
        </div>
      )}
      {/* Skip button for broken questions */}
      {!isReview && (
        <button
          onClick={onNext}
          className="mt-4 w-full border border-gray-300 text-gray-500 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Skip this question
        </button>
      )}
    </QuestionLayout>
  );
}
