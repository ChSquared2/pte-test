interface TimerProps {
  formattedTime: string;
  progress: number;
  isWarning?: boolean;
}

export default function Timer({ formattedTime, progress, isWarning }: TimerProps) {
  const barColor = isWarning || progress < 20 ? 'bg-red-500' : progress < 40 ? 'bg-yellow-500' : 'bg-[#0072CE]';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-sm font-mono font-medium min-w-[48px] ${progress < 20 ? 'text-red-600' : 'text-gray-600'}`}>
        {formattedTime}
      </span>
    </div>
  );
}
