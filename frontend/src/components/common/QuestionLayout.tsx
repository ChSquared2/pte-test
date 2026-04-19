import Timer from './Timer';
import { useTimer } from '../../hooks/useTimer';
import type { ReactNode } from 'react';

interface QuestionLayoutProps {
  title: string;
  instruction: string;
  timeLimit?: number;
  onTimeExpire?: () => void;
  children: ReactNode;
  questionNumber?: number;
  totalQuestions?: number;
}

export default function QuestionLayout({
  title,
  instruction,
  timeLimit,
  onTimeExpire,
  children,
  questionNumber,
  totalQuestions,
}: QuestionLayoutProps) {
  const timer = useTimer({
    initialSeconds: timeLimit || 120,
    onExpire: onTimeExpire,
    autoStart: !!timeLimit,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#003057]">{title}</h2>
          {questionNumber && totalQuestions && (
            <span className="text-xs text-gray-400">
              Question {questionNumber} of {totalQuestions}
            </span>
          )}
        </div>
      </div>

      {/* Timer */}
      {timeLimit && <Timer formattedTime={timer.formattedTime} progress={timer.progress} />}

      {/* Instruction */}
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{instruction}</p>

      {/* Question Content */}
      <div>{children}</div>
    </div>
  );
}
