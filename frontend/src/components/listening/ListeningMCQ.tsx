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
  multiple?: boolean;
}

export default function ListeningMCQ({ question, onNext, multiple = false }: Props) {
  // Shuffle options: shuffledIndices[displayPos] = originalIndex
  const shuffledIndices = useMemo(
    () => seededShuffle(question.options.map((_: any, i: number) => i), question.id),
    [question.id]
  );

  const [selectedSingle, setSelectedSingle] = useState<number | null>(null); // display index
  const [selectedMulti, setSelectedMulti] = useState<Set<number>>(new Set()); // display indices
  const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showingScore, setShowingScore] = useState(true);

  const toOriginal = (displayIdx: number) => shuffledIndices[displayIdx];

  const toggleMulti = (displayIdx: number) => {
    setSelectedMulti((prev) => {
      const next = new Set(prev);
      if (next.has(displayIdx)) next.delete(displayIdx); else next.add(displayIdx);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const userAnswer = multiple
        ? Array.from(selectedMulti).map(toOriginal)
        : selectedSingle !== null ? toOriginal(selectedSingle) : null;
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
  const correctSingleOrig = isReview && !multiple ? (result.correct_answers as number) : null;
  const correctMultiOrigSet = isReview && multiple ? new Set(result.correct_answers as number[]) : new Set<number>();

  const getOptionStyle = (displayIdx: number) => {
    if (isReview) {
      const origIdx = toOriginal(displayIdx);
      if (multiple) {
        const isCorrect = correctMultiOrigSet.has(origIdx);
        const isSelected = selectedMulti.has(displayIdx);
        if (isCorrect) return 'border-green-500 bg-green-50';
        if (isSelected && !isCorrect) return 'border-red-500 bg-red-50';
        return 'border-gray-200';
      } else {
        if (origIdx === correctSingleOrig) return 'border-green-500 bg-green-50';
        if (displayIdx === selectedSingle) return 'border-red-500 bg-red-50';
        return 'border-gray-200';
      }
    }
    const isSelected = multiple ? selectedMulti.has(displayIdx) : selectedSingle === displayIdx;
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
        {shuffledIndices.map((origIdx: number, displayIdx: number) => (
          <label key={origIdx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${getOptionStyle(displayIdx)}`}>
            {multiple
              ? <input type="checkbox" checked={selectedMulti.has(displayIdx)} onChange={() => !isReview && toggleMulti(displayIdx)} disabled={isReview} className="mt-0.5" />
              : <input type="radio" checked={selectedSingle === displayIdx} onChange={() => !isReview && setSelectedSingle(displayIdx)} disabled={isReview} className="mt-0.5" />
            }
            <span className="text-sm flex-1">{question.options[origIdx]}</span>
            {isReview && !multiple && toOriginal(displayIdx) === correctSingleOrig && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && !multiple && displayIdx === selectedSingle && toOriginal(displayIdx) !== correctSingleOrig && (
              <span className="text-xs font-semibold text-red-600">Your answer</span>
            )}
            {isReview && multiple && correctMultiOrigSet.has(origIdx) && (
              <span className="text-xs font-semibold text-green-600">Correct</span>
            )}
            {isReview && multiple && selectedMulti.has(displayIdx) && !correctMultiOrigSet.has(origIdx) && (
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
