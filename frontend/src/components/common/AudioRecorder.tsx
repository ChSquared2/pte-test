import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { useTimer } from '../../hooks/useTimer';
import Timer from './Timer';
import { useEffect, useRef } from 'react';

interface AudioRecorderProps {
  maxDuration: number; // seconds
  onRecordingComplete: (blob: Blob) => void;
  autoStart?: boolean;
  prepTime?: number; // seconds of preparation before recording starts
}

export default function AudioRecorder({ maxDuration, onRecordingComplete, autoStart = false, prepTime = 0 }: AudioRecorderProps) {
  const recorder = useAudioRecorder();
  const hasStarted = useRef(false);
  const hasCompleted = useRef(false);

  const prepTimer = useTimer({
    initialSeconds: prepTime,
    autoStart: prepTime > 0 && autoStart,
    onExpire: () => {
      if (!hasStarted.current) {
        hasStarted.current = true;
        recorder.startRecording();
      }
    },
  });

  const recordTimer = useTimer({
    initialSeconds: maxDuration,
    autoStart: false,
    onExpire: async () => {
      const blob = await recorder.stopRecording();
      if (blob && !hasCompleted.current) {
        hasCompleted.current = true;
        onRecordingComplete(blob);
      }
    },
  });

  // Start recording timer when recording begins
  useEffect(() => {
    if (recorder.isRecording && !recordTimer.isRunning) {
      recordTimer.start();
    }
  }, [recorder.isRecording]);

  // Auto-start without prep time
  useEffect(() => {
    if (autoStart && prepTime === 0 && !hasStarted.current) {
      hasStarted.current = true;
      recorder.startRecording();
    }
  }, [autoStart, prepTime]);

  const handleStop = async () => {
    const blob = await recorder.stopRecording();
    if (blob && !hasCompleted.current) {
      hasCompleted.current = true;
      onRecordingComplete(blob);
    }
  };

  const handleStart = () => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      recorder.startRecording();
    }
  };

  // Preparation phase
  if (prepTime > 0 && prepTimer.secondsLeft > 0 && !recorder.isRecording && !recorder.audioBlob) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm font-medium text-yellow-800 mb-2">Preparation Time</p>
        <Timer formattedTime={prepTimer.formattedTime} progress={prepTimer.progress} />
        <p className="text-xs text-yellow-600 mt-2">Recording will start automatically when preparation time ends.</p>
        <button
          onClick={() => {
            prepTimer.reset(0);
            if (!hasStarted.current) {
              hasStarted.current = true;
              recorder.startRecording();
            }
          }}
          className="mt-3 bg-[#0072CE] text-white py-1.5 px-4 rounded-lg text-sm hover:bg-[#005fa3] transition-colors"
        >
          Start Recording Now
        </button>
      </div>
    );
  }

  // Recording phase
  if (recorder.isRecording) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-red-800">Recording...</span>
        </div>
        <Timer formattedTime={recordTimer.formattedTime} progress={recordTimer.progress} isWarning />
        <button
          onClick={handleStop}
          className="mt-3 bg-red-600 text-white py-1.5 px-4 rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Stop Recording
        </button>
      </div>
    );
  }

  // Not started - show start button
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
      <button
        onClick={handleStart}
        className="bg-[#0072CE] text-white py-2 px-6 rounded-lg hover:bg-[#005fa3] transition-colors"
      >
        Start Recording
      </button>
    </div>
  );
}
