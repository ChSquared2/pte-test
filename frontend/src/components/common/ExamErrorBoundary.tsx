import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  /** When this value changes, the boundary resets (e.g. moving to next question). */
  resetKey: unknown;
  /** Called when the user chooses to skip a question that failed to render. */
  onSkip: () => void;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render crashes in a single exam question so one bad question can be
 * skipped instead of white-screening the whole exam.
 */
export default class ExamErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: Props) {
    // Reset when navigating to a different question.
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-10">
          <div className="text-4xl mb-3">&#9888;&#65039;</div>
          <p className="text-gray-700 font-medium mb-1">This question couldn't be displayed.</p>
          <p className="text-sm text-gray-400 mb-6">You can skip it and continue the exam.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onSkip();
            }}
            className="tap-target bg-[#0072CE] text-white py-2.5 px-6 rounded-lg hover:bg-[#005fa3] active:bg-[#004f8a] transition-colors font-medium"
          >
            Skip this question &rarr;
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
