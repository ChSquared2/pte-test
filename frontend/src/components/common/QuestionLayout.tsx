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
      {/* Sticky header + timer: stays visible while the question scrolls on mobile */}
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 pt-1 pb-2 sm:pb-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:bg-transparent sm:backdrop-blur-none space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-[#003057] leading-tight">{title}</h2>
          {questionNumber && totalQuestions && (
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
              {questionNumber} / {totalQuestions}
            </span>
          )}
        </div>

        {/* Timer */}
        {timeLimit && <Timer formattedTime={timer.formattedTime} progress={timer.progress} />}
      </div>

      {/* Instruction */}
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">{instruction}</p>

      {/* Question Content */}
      <div>{children}</div>
    </div>
  );
}
