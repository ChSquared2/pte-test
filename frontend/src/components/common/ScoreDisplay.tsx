import type { SubmitAnswerResponse } from '../../types';

interface ScoreDisplayProps {
  result: SubmitAnswerResponse;
  onNext?: () => void;
  onBack?: () => void;
}

interface WordResult {
  word: string;
  status: 'correct' | 'wrong' | 'missing';
}

export default function ScoreDisplay({ result, onNext, onBack }: ScoreDisplayProps) {
  const percentage = Math.round(result.total_score);
  const color = percentage >= 70 ? 'text-green-600' : percentage >= 40 ? 'text-yellow-600' : 'text-red-600';
  const bgColor = percentage >= 70 ? 'bg-green-50' : percentage >= 40 ? 'bg-yellow-50' : 'bg-red-50';

  const wordResults = result.score_details.word_results as unknown as WordResult[] | undefined;
  const wordsCorrect = result.score_details.words_correct as number | undefined;
  const wordsExpected = result.score_details.words_expected as number | undefined;
  const isSpeakingStrict = wordResults && wordResults.length > 0;

  // Filter out word-level keys from general details display
  const generalDetails = Object.entries(result.score_details).filter(
    ([key]) => !['word_results', 'words_correct', 'words_wrong', 'words_missing', 'words_expected'].includes(key)
  );

  return (
    <div className={`rounded-xl p-6 ${bgColor} border`}>
      {/* Score header */}
      <div className="text-center mb-4">
        {isSpeakingStrict ? (
          <>
            <div className={`text-4xl font-bold ${color}`}>
              {wordsCorrect}/{wordsExpected}
            </div>
            <div className="text-sm text-gray-500 mt-1">Words Correct</div>
            <div className="text-lg font-semibold text-gray-600 mt-1">{percentage}% overall</div>
          </>
        ) : (
          <>
            <div className={`text-4xl font-bold ${color}`}>{percentage}%</div>
            <div className="text-sm text-gray-500 mt-1">Score</div>
          </>
        )}
      </div>

      {/* Word-by-word results with color highlighting */}
      {isSpeakingStrict && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Word Analysis</h4>
          <div className="bg-white rounded-lg p-4 leading-loose">
            {wordResults.map((wr, i) => {
              let className = '';
              let title = '';
              if (wr.status === 'correct') {
                className = 'text-green-700 bg-green-100 font-medium';
                title = 'Correct';
              } else if (wr.status === 'wrong') {
                className = 'text-red-700 bg-red-100 font-medium line-through';
                title = 'Mispronounced';
              } else {
                className = 'text-red-400 bg-red-50 opacity-60';
                title = 'Not said';
              }
              return (
                <span
                  key={i}
                  className={`inline-block px-1 py-0.5 mx-0.5 rounded ${className}`}
                  title={title}
                >
                  {wr.word}
                </span>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-green-100 rounded inline-block" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-100 rounded inline-block" /> Mispronounced
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-50 rounded inline-block border" /> Not said
            </span>
          </div>
        </div>
      )}

      {/* Feedback */}
      {result.feedback && (
        <p className="text-sm text-gray-700 mb-4 text-center">{result.feedback}</p>
      )}

      {/* General details (pronunciation, fluency, etc.) */}
      {generalDetails.length > 0 && (
        <div className="border-t pt-3 mt-3">
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Details</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {generalDetails.map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 border border-[#003057] text-[#003057] py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
          >
            &larr; Review Question
          </button>
        )}
        {onNext && (
          <button
            onClick={onNext}
            className="flex-1 bg-[#003057] text-white py-2 px-4 rounded-lg hover:bg-[#004080] transition-colors"
          >
            Next Question &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
