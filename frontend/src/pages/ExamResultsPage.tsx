import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getExamResults } from '../services/api';

export default function ExamResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      getExamResults(sessionId).then(setResults);
    }
  }, [sessionId]);

  if (!results) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#003057] mb-6">Exam Results</h1>

      <div className="bg-white rounded-xl shadow-md p-8 text-center mb-6">
        <div className="text-5xl font-bold text-[#0072CE]">{results.overall_score}</div>
        <div className="text-sm text-gray-500 mt-1">PTE Score (10-90)</div>
      </div>

      {results.section_scores && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Section Breakdown</h2>
          {Object.entries(results.section_scores).map(([section, score]) => (
            <div key={section} className="flex justify-between items-center py-2 border-b last:border-0">
              <span className="capitalize text-gray-600">{section}</span>
              <span className="font-semibold text-[#003057]">{score as number}%</span>
            </div>
          ))}
        </div>
      )}

      {results.attempts && results.attempts.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Question Details</h2>
          <div className="space-y-2">
            {results.attempts.map((a: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg bg-gray-50 text-sm">
                <span className="text-gray-600 capitalize">{a.question_type.replace(/_/g, ' ')}</span>
                <span className={`font-medium ${a.total_score >= 70 ? 'text-green-600' : a.total_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {Math.round(a.total_score)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Link to="/dashboard" className="flex-1 text-center bg-[#003057] text-white py-2.5 rounded-lg hover:bg-[#004080]">
          Dashboard
        </Link>
        <Link to="/practice" className="flex-1 text-center border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50">
          Practice
        </Link>
      </div>
    </div>
  );
}
