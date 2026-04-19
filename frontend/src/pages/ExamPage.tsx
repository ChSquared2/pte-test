import { useNavigate } from 'react-router-dom';
import { useExamEngine } from '../hooks/useExamEngine';
import { useState } from 'react';
import type { Question } from '../types';

// Practice components reused in exam mode for AI-scored types
import SpeakingQuestion from '../components/speaking/SpeakingQuestion';
import Essay from '../components/writing/Essay';
import SummarizeWrittenText from '../components/writing/SummarizeWrittenText';
import SummarizeSpokenText from '../components/listening/SummarizeSpokenText';

const AI_SCORED_TYPES = new Set([
  'read_aloud', 'repeat_sentence', 'describe_image', 'answer_short_question',
  'retell_lecture', 'summarize_group_discussion', 'respond_to_situation',
  'essay', 'summarize_written_text', 'summarize_spoken_text',
]);

export default function ExamPage() {
  const navigate = useNavigate();
  const exam = useExamEngine();
  const [isTrial, setIsTrial] = useState(false);

  // ─── NOT STARTED ───
  if (exam.state === 'NOT_STARTED') {
    return (
      <div className="min-h-screen bg-[#003057] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg text-center">
          <h1 className="text-3xl font-bold text-[#003057] mb-4">PTE Academic</h1>
          <h2 className="text-lg text-gray-600 mb-4">Full Exam Simulation</h2>
          <div className="text-sm text-gray-500 mb-4 space-y-2">
            <p>This exam simulates the real PTE Academic experience.</p>
            <p>4 sections: Speaking & Writing, Reading, Grammar & Vocabulary, Listening</p>
            <p>Total time: approximately 2 hours.</p>
          </div>
          <div className="text-xs text-gray-400 mb-6 bg-gray-50 p-3 rounded-lg space-y-1">
            <p><strong>Section 1:</strong> Speaking & Writing (40 min) - per-question timers</p>
            <p><strong>Section 2:</strong> Reading (20 min) - section timer</p>
            <p><strong>Section 3:</strong> Grammar & Vocabulary (15 min) - section timer</p>
            <p><strong>Section 4:</strong> Listening (25 min) - per-question timers</p>
          </div>

          <label className="flex items-center justify-center gap-3 mb-6 cursor-pointer group">
            <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-[#F2A900] focus:ring-[#F2A900]" />
            <span className="text-sm text-gray-600 group-hover:text-gray-800">
              Test session <span className="text-xs text-gray-400">(results not saved)</span>
            </span>
          </label>

          <button onClick={() => exam.start(isTrial)}
            className="bg-[#F2A900] text-[#003057] font-bold py-3 px-8 rounded-lg hover:bg-[#e09d00] transition-colors text-lg">
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  // ─── SUBMITTING ───
  if (exam.state === 'SUBMITTING') {
    return (
      <div className="min-h-screen bg-[#003057] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-[#0072CE] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-lg text-gray-600">Scoring your answers...</p>
        </div>
      </div>
    );
  }

  // ─── SECTION BREAK ───
  if (exam.state === 'SECTION_BREAK') {
    const nextSection = exam.sections[exam.currentSectionIndex + 1];
    return (
      <div className="min-h-screen bg-[#003057] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg text-center">
          <div className="text-green-600 text-5xl mb-4">&#10003;</div>
          <h2 className="text-xl font-bold text-[#003057] mb-2">
            Section {exam.currentSectionIndex + 1} Complete
          </h2>
          <p className="text-gray-500 mb-6">{exam.currentSection?.label}</p>

          {nextSection && (
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600">Next Section:</p>
              <p className="text-lg font-bold text-[#003057]">{nextSection.label}</p>
              <p className="text-sm text-gray-500">
                {nextSection.questions.length} questions &middot; {exam.formatTime(nextSection.time_limit_seconds)}
                {nextSection.timer_type === 'section' ? ' (section timer)' : ' (per-question timers)'}
              </p>
            </div>
          )}

          <button onClick={exam.continueToNextSection}
            className="bg-[#F2A900] text-[#003057] font-bold py-3 px-8 rounded-lg hover:bg-[#e09d00] transition-colors text-lg">
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ─── COMPLETED ───
  if (exam.state === 'COMPLETED' && exam.results) {
    return (
      <div className="min-h-screen bg-[#003057] flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg text-center">
          <h1 className="text-2xl font-bold text-[#003057] mb-2">Exam Complete</h1>
          {exam.isTrial && (
            <div className="inline-block bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Test Session — Results not saved
            </div>
          )}
          <div className="my-8">
            <div className="text-6xl font-bold text-[#0072CE]">{exam.results.overall_score}</div>
            <div className="text-sm text-gray-500 mt-1">PTE Score (10-90)</div>
          </div>
          {exam.results.section_scores && (
            <div className="border-t pt-4 mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">Section Scores</h3>
              {Object.entries(exam.results.section_scores as Record<string, number>).map(([section, score]) => (
                <div key={section} className="flex justify-between text-sm py-1">
                  <span className="capitalize text-gray-600">{section.replace('_', ' & ')}</span>
                  <span className="font-medium">{score}%</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            {!exam.isTrial && (
              <button onClick={() => navigate('/dashboard')}
                className="flex-1 bg-[#003057] text-white py-2.5 rounded-lg hover:bg-[#004080]">
                View Dashboard
              </button>
            )}
            <button onClick={() => navigate('/practice')}
              className="flex-1 border border-[#003057] text-[#003057] py-2.5 rounded-lg hover:bg-gray-50">
              Practice More
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── IN PROGRESS ───
  const timerDisplay = exam.currentSection?.timer_type === 'section'
    ? exam.formatTime(exam.sectionTimeRemaining)
    : exam.formatTime(exam.questionTimeRemaining);

  const timerColor = (() => {
    const t = exam.currentSection?.timer_type === 'section' ? exam.sectionTimeRemaining : exam.questionTimeRemaining;
    if (t <= 30) return 'text-red-400';
    if (t <= 60) return 'text-yellow-400';
    return 'text-gray-300';
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Exam header */}
      <div className="bg-[#003057] text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm">PTE Academic</span>
            {exam.isTrial && (
              <span className="bg-amber-400 text-[#003057] text-xs font-bold px-2 py-0.5 rounded">TEST</span>
            )}
            <span className="text-xs text-gray-400">|</span>
            <span className="text-sm text-[#F2A900] font-medium">
              Section {exam.currentSectionIndex + 1}/{exam.sections.length}: {exam.currentSection?.label}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-300">
              Q{exam.currentQuestionIndex + 1}/{exam.currentSection?.questions.length || 0}
            </span>
            <div className={`text-sm font-mono font-bold ${timerColor}`}>
              {timerDisplay}
            </div>
            <div className="w-24 bg-gray-600 rounded-full h-2">
              <div className="bg-[#F2A900] h-2 rounded-full transition-all"
                style={{ width: `${((exam.overallQuestionIndex + 1) / exam.totalQuestions) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          {AI_SCORED_TYPES.has(exam.currentQuestion!.type) ? (
            <AIScoredQuestionRenderer
              question={exam.currentQuestion!}
              onNext={() => exam.submitCurrentAnswer('__prescored__')}
              sessionId={exam.sessionId}
            />
          ) : (
            <ExamQuestionRenderer
              question={exam.currentQuestion!}
              onAnswer={exam.submitCurrentAnswer}
              onSkip={exam.skipQuestion}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI-SCORED QUESTION RENDERER (uses practice components with their own submit flow) ───
function AIScoredQuestionRenderer({ question, onNext, sessionId }: {
  question: Question; onNext: () => void; sessionId: string;
}) {
  const speakingTitles: Record<string, { title: string; instruction: string }> = {
    read_aloud: { title: 'Read Aloud', instruction: 'Read the text below aloud. You have time to prepare before recording begins.' },
    repeat_sentence: { title: 'Repeat Sentence', instruction: 'Listen to the sentence and repeat it exactly as you hear it.' },
    describe_image: { title: 'Describe Image', instruction: 'Describe the image in detail. You have time to prepare.' },
    answer_short_question: { title: 'Answer Short Question', instruction: 'Listen to the question and give a short spoken answer.' },
    retell_lecture: { title: 'Re-tell Lecture', instruction: 'Listen to the lecture, then retell it in your own words.' },
    summarize_group_discussion: { title: 'Summarize Discussion', instruction: 'Listen to the discussion and summarize it in your own words.' },
    respond_to_situation: { title: 'Respond to Situation', instruction: 'Read the situation and give an appropriate spoken response.' },
  };

  const q = question as any;

  // Speaking types
  if (speakingTitles[question.type]) {
    const { title, instruction } = speakingTitles[question.type];
    return (
      <SpeakingQuestion
        key={q.id}
        id={q.id}
        type={question.type as any}
        title={title}
        instruction={instruction}
        text={q.text}
        audioUrl={q.audio_url}
        imageUrl={q.image_url}
        scenario={q.scenario}
        prepTime={q.prep_time || (question.type === 'repeat_sentence' || question.type === 'answer_short_question' ? 0 : 25)}
        recordTime={q.record_time || 40}
        onNext={onNext}
        mode="exam"
        examSessionId={sessionId}
      />
    );
  }

  // Essay
  if (question.type === 'essay') {
    return <Essay key={q.id} question={q} onNext={onNext} mode="exam" examSessionId={sessionId} />;
  }

  // Summarize Written Text
  if (question.type === 'summarize_written_text') {
    return <SummarizeWrittenText key={q.id} question={q} onNext={onNext} mode="exam" examSessionId={sessionId} />;
  }

  // Summarize Spoken Text
  if (question.type === 'summarize_spoken_text') {
    return <SummarizeSpokenText key={q.id} question={q} onNext={onNext} mode="exam" examSessionId={sessionId} />;
  }

  return <p className="text-gray-500">Unsupported AI-scored type: {question.type}</p>;
}

// ─── DETERMINISTIC QUESTION RENDERER (collects answers, batch-scored at section end) ───
function ExamQuestionRenderer({ question, onAnswer, onSkip }: {
  question: Question; onAnswer: (answer: unknown) => void; onSkip: () => void;
}) {
  const [answer, setAnswer] = useState<unknown>(null);

  const renderQuestion = () => {
    switch (question.type) {
      // Reading
      case 'mcq_single_reading':
      case 'mcq_single_listening':
      case 'highlight_correct_summary':
      case 'select_missing_word':
      case 'grammar_error_correction':
        return <ExamMCQSingle question={question as any} onAnswer={setAnswer} />;
      case 'mcq_multiple_reading':
      case 'mcq_multiple_listening':
        return <ExamMCQMultiple question={question as any} onAnswer={setAnswer} />;
      case 'fill_blanks_dropdown':
      case 'grammar_select_blanks':
        return <ExamDropdown question={question as any} onAnswer={setAnswer} />;
      case 'fill_blanks_drag':
      case 'grammar_drag_dialogue':
        return <ExamDrag question={question as any} onAnswer={setAnswer} />;
      case 'reorder_paragraphs':
        return <ExamReorder question={question as any} onAnswer={setAnswer} />;
      // Writing (AI-scored — handled by AIScoredQuestionRenderer, but fallback here)
      case 'essay':
      case 'summarize_written_text':
        return <ExamWriting question={question as any} onAnswer={setAnswer} />;
      // Speaking (AI-scored — handled by AIScoredQuestionRenderer, but fallback here)
      case 'read_aloud':
      case 'repeat_sentence':
      case 'describe_image':
      case 'answer_short_question':
      case 'retell_lecture':
      case 'summarize_group_discussion':
      case 'respond_to_situation':
        return <ExamSpeaking question={question as any} onAnswer={setAnswer} />;
      // Listening
      case 'summarize_spoken_text':
        return <ExamWriting question={question as any} onAnswer={setAnswer} isListening />;
      case 'fill_blanks_type_in':
        return <ExamTypeIn question={question as any} onAnswer={setAnswer} />;
      case 'highlight_incorrect_words':
        return <ExamHighlightWords question={question as any} onAnswer={setAnswer} />;
      case 'write_from_dictation':
        return <ExamDictation question={question as any} onAnswer={setAnswer} />;
      // Vocabulary
      case 'vocabulary_fill_table':
        return <ExamFillTable question={question as any} onAnswer={setAnswer} />;
      case 'vocabulary_word_order':
        return <ExamWordOrder question={question as any} onAnswer={setAnswer} />;
      default:
        return <p className="text-gray-500">Unsupported type: {question.type}</p>;
    }
  };

  return (
    <div>
      {renderQuestion()}
      <div className="flex gap-3 mt-6">
        <button onClick={() => onAnswer(answer)} disabled={answer === null}
          className="flex-1 bg-[#0072CE] text-white py-2.5 rounded-lg hover:bg-[#005fa3] disabled:opacity-50 transition-colors">
          Next
        </button>
        <button onClick={onSkip} className="px-4 text-sm text-gray-500 hover:text-gray-700">Skip</button>
      </div>
    </div>
  );
}

// ─── EXAM COMPONENTS ───

function ExamMCQSingle({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const title = question.type === 'grammar_error_correction' ? 'Error Correction'
    : question.type === 'highlight_correct_summary' ? 'Highlight Correct Summary'
    : question.type === 'select_missing_word' ? 'Select Missing Word'
    : 'Multiple Choice - Single Answer';

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">{title}</h2>
      {question.passage && (
        <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-60 overflow-y-auto">{question.passage}</div>
      )}
      {question.sentence && (
        <div className="bg-gray-50 p-4 rounded-lg text-lg mb-4">
          {question.sentence.split(question.underlined_word)[0]}
          <span className="underline decoration-red-500 decoration-2 font-semibold text-red-700">{question.underlined_word}</span>
          {question.sentence.split(question.underlined_word).slice(1).join(question.underlined_word)}
        </div>
      )}
      {question.audio_url && (
        <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>
      )}
      {question.prompt && <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>}
      {question.transcript && question.type !== 'highlight_incorrect_words' && (
        <p className="text-sm text-gray-500 italic mb-3">{question.transcript}</p>
      )}
      <div className="space-y-2">
        {question.options.map((opt: string, idx: number) => (
          <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            selected === idx ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" checked={selected === idx} onChange={() => { setSelected(idx); onAnswer(idx); }} className="mt-0.5" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ExamMCQMultiple({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelected(next);
    onAnswer(Array.from(next));
  };
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Multiple Choice - Multiple Answers</h2>
      {question.passage && <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-60 overflow-y-auto">{question.passage}</div>}
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      {question.prompt && <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>}
      <div className="space-y-2">
        {question.options.map((opt: string, idx: number) => (
          <label key={idx} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            selected.has(idx) ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="checkbox" checked={selected.has(idx)} onChange={() => toggle(idx)} className="mt-0.5" />
            <span className="text-sm">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ExamDropdown({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const isGrammar = question.type === 'grammar_select_blanks';
  const blankCount = isGrammar ? question.items.length : question.blanks.length;
  const [answers, setAnswers] = useState<string[]>(new Array(blankCount).fill(''));
  const handleChange = (idx: number, val: string) => {
    const next = [...answers]; next[idx] = val; setAnswers(next); onAnswer(next);
  };

  if (isGrammar) {
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#003057] mb-2">Select Blanks</h2>
        <div className="space-y-4">
          {question.items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center flex-wrap gap-1 bg-gray-50 p-4 rounded-lg text-sm">
              <span className="font-medium text-gray-500 mr-2">{idx + 1}</span>
              <span>{item.text_before}</span>
              <select value={answers[idx]} onChange={(e) => handleChange(idx, e.target.value)}
                className="inline-block mx-1 px-2 py-1 border-2 border-[#0072CE] rounded bg-blue-50 text-sm">
                <option value="">-- Select --</option>
                {item.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
              <span>{item.text_after}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const parts = question.text.split(/___BLANK(\d+)___/);
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Fill in the Blanks (Dropdown)</h2>
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed">
        {parts.map((part: string, i: number) => {
          if (i % 2 === 1) {
            const bi = parseInt(part);
            const blank = question.blanks.find((b: any) => b.index === bi);
            if (!blank) return null;
            return (
              <select key={`b-${bi}`} value={answers[bi]} onChange={(e) => handleChange(bi, e.target.value)}
                className="inline-block mx-1 px-2 py-1 border-2 border-[#0072CE] rounded bg-blue-50 text-sm">
                <option value="">-- Select --</option>
                {blank.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
              </select>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}

function ExamDrag({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const isDialogue = question.type === 'grammar_drag_dialogue';
  const blankCount = isDialogue ? question.correct_answers.length : question.blank_positions.length;
  const [placed, setPlaced] = useState<(string | null)[]>(new Array(blankCount).fill(null));
  const [dragWord, setDragWord] = useState<string | null>(null);
  const used = new Set(placed.filter(Boolean));
  const wordList = isDialogue ? question.word_bank : question.options;
  const available = wordList.filter((w: string) => !used.has(w));

  const drop = (idx: number) => {
    if (!dragWord) return;
    const next = [...placed]; next[idx] = dragWord; setPlaced(next); setDragWord(null); onAnswer(next);
  };
  const remove = (idx: number) => {
    const next = [...placed]; next[idx] = null; setPlaced(next); onAnswer(next);
  };
  const clickPlace = (word: string) => {
    const emptyIdx = placed.findIndex((w) => w === null);
    if (emptyIdx !== -1) { const next = [...placed]; next[emptyIdx] = word; setPlaced(next); onAnswer(next); }
  };

  if (isDialogue) {
    let blankIdx = 0;
    return (
      <div>
        <h2 className="text-lg font-semibold text-[#003057] mb-2">Complete the Dialogue</h2>
        <div className="flex flex-wrap gap-2 p-3 bg-white border rounded-lg mb-4">
          <span className="text-xs text-gray-400 w-full mb-1">Word Bank:</span>
          {available.map((w: string) => (
            <span key={w} draggable onDragStart={() => setDragWord(w)} onClick={() => clickPlace(w)}
              className="px-3 py-1.5 bg-[#F2A900] text-[#003057] rounded text-sm cursor-grab hover:bg-[#e09d00] font-medium">{w}</span>
          ))}
        </div>
        <div className="space-y-3">
          {question.lines.map((line: any, li: number) => {
            const hasBlank = line.parts?.some((p: any) => p.blank);
            const bi = hasBlank ? blankIdx++ : -1;
            return (
              <div key={li} className="flex gap-3">
                <span className="font-bold text-sm text-[#003057] min-w-[80px] text-right pt-1">{line.speaker}:</span>
                <div className="flex-1 text-sm leading-loose">
                  {line.parts?.map((part: any, pi: number) => {
                    if (part.blank) {
                      const word = placed[bi];
                      return (
                        <span key={pi} className={`inline-block mx-1 px-3 py-0.5 min-w-[80px] border-2 border-dashed rounded text-center text-sm ${
                          word ? 'border-[#0072CE] bg-blue-50 font-medium cursor-pointer' : 'border-gray-400 bg-gray-100'}`}
                          onDragOver={(e) => e.preventDefault()} onDrop={() => drop(bi)} onClick={() => word && remove(bi)}>
                          {word || '___'}
                        </span>
                      );
                    }
                    return <span key={pi}>{part.text}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Standard fill_blanks_drag
  const parts = question.text.split(/___BLANK(\d+)___/);
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Fill in the Blanks (Drag & Drop)</h2>
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-loose mb-4">
        {parts.map((part: string, i: number) => {
          if (i % 2 === 1) {
            const bi = parseInt(part);
            const word = placed[bi];
            return (
              <span key={`b-${bi}`} className={`inline-block mx-1 px-3 py-1 min-w-[80px] border-2 border-dashed rounded text-center text-sm ${
                word ? 'border-[#0072CE] bg-blue-50 font-medium cursor-pointer' : 'border-gray-400 bg-gray-100'}`}
                onDragOver={(e) => e.preventDefault()} onDrop={() => drop(bi)} onClick={() => word && remove(bi)}>
                {word || '___'}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      <div className="flex flex-wrap gap-2 p-3 bg-white border rounded-lg">
        <span className="text-xs text-gray-400 w-full mb-1">Word Bank:</span>
        {available.map((w: string) => (
          <span key={w} draggable onDragStart={() => setDragWord(w)} onClick={() => clickPlace(w)}
            className="px-3 py-1.5 bg-[#003057] text-white rounded text-sm cursor-grab hover:bg-[#004080]">{w}</span>
        ))}
      </div>
    </div>
  );
}

function ExamReorder({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const [order, setOrder] = useState<number[]>(question.paragraphs.map((_: any, i: number) => i));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...order]; const [moved] = next.splice(dragIdx, 1); next.splice(idx, 0, moved);
    setOrder(next); setDragIdx(idx); onAnswer(next);
  };
  const move = (from: number, dir: 'up' | 'down') => {
    const to = dir === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= order.length) return;
    const next = [...order]; [next[from], next[to]] = [next[to], next[from]]; setOrder(next); onAnswer(next);
  };
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Re-order Paragraphs</h2>
      <div className="space-y-2">
        {order.map((paraIdx: number, posIdx: number) => (
          <div key={paraIdx} draggable onDragStart={() => setDragIdx(posIdx)} onDragOver={(e) => handleDragOver(e, posIdx)} onDragEnd={() => setDragIdx(null)}
            className={`flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-grab ${dragIdx === posIdx ? 'border-[#0072CE] bg-blue-50' : 'border-gray-200'}`}>
            <span className="flex-shrink-0 w-7 h-7 bg-[#003057] text-white rounded-full flex items-center justify-center text-xs font-bold">{posIdx + 1}</span>
            <p className="flex-1 text-sm">{question.paragraphs[paraIdx]}</p>
            <div className="flex flex-col gap-1">
              <button onClick={() => move(posIdx, 'up')} disabled={posIdx === 0} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs">&#9650;</button>
              <button onClick={() => move(posIdx, 'down')} disabled={posIdx === order.length - 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 text-xs">&#9660;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamWriting({ question, onAnswer, isListening }: { question: any; onAnswer: (a: unknown) => void; isListening?: boolean }) {
  const [text, setText] = useState('');
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isEssay = question.type === 'essay';
  const title = isEssay ? 'Essay' : isListening ? 'Summarize Spoken Text' : 'Summarize Written Text';
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">{title}</h2>
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      {question.passage && <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4 max-h-48 overflow-y-auto">{question.passage}</div>}
      {question.prompt && <p className="font-medium text-[#003057] mb-3">{question.prompt}</p>}
      <textarea value={text} onChange={(e) => { setText(e.target.value); onAnswer(e.target.value); }}
        rows={isEssay ? 12 : 6} placeholder="Type your answer here..."
        className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:border-[#0072CE] focus:outline-none" />
      <div className="text-right text-xs text-gray-400 mt-1">Words: {wordCount}</div>
    </div>
  );
}

function ExamSpeaking({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const titles: Record<string, string> = {
    read_aloud: 'Read Aloud', repeat_sentence: 'Repeat Sentence', describe_image: 'Describe Image',
    answer_short_question: 'Answer Short Question', retell_lecture: 'Re-tell Lecture',
    summarize_group_discussion: 'Summarize Discussion', respond_to_situation: 'Respond to Situation',
  };
  // In exam mode without real audio recording, just collect text input as proxy
  const [response, setResponse] = useState('');
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">{titles[question.type] || 'Speaking'}</h2>
      <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mb-4">
        In the real exam, you would record your audio response. Type your response below for scoring.
      </p>
      {question.text && <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed mb-4">{question.text}</div>}
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      {question.image_url && <img src={question.image_url} alt="Describe this" className="max-w-full rounded-lg mb-4 border" />}
      {question.scenario && <div className="bg-amber-50 p-4 rounded-lg text-sm mb-4 border border-amber-200">{question.scenario}</div>}
      <textarea value={response} onChange={(e) => { setResponse(e.target.value); onAnswer(e.target.value); }}
        rows={4} placeholder="Type your spoken response here..."
        className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:border-[#0072CE] focus:outline-none" />
    </div>
  );
}

function ExamTypeIn({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const blankCount = (question.transcript_with_blanks?.match(/___BLANK\d+___/g) || []).length;
  const [answers, setAnswers] = useState<string[]>(new Array(blankCount).fill(''));
  const handleChange = (idx: number, val: string) => {
    const next = [...answers]; next[idx] = val; setAnswers(next); onAnswer(next);
  };
  const parts = question.transcript_with_blanks?.split(/___BLANK(\d+)___/) || [];
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Fill Blanks (Type In)</h2>
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      <div className="bg-gray-50 p-4 rounded-lg text-sm leading-loose">
        {parts.map((part: string, i: number) => {
          if (i % 2 === 1) {
            const bi = parseInt(part);
            return <input key={`b-${bi}`} type="text" value={answers[bi] || ''} onChange={(e) => handleChange(bi, e.target.value)}
              className="inline-block mx-1 px-2 py-1 w-28 border-2 border-[#0072CE] rounded bg-blue-50 text-sm" placeholder="..." />;
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}

function ExamHighlightWords({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const words = question.transcript?.split(/\s+/) || [];
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx); else next.add(idx);
    setSelected(next); onAnswer(Array.from(next));
  };
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Highlight Incorrect Words</h2>
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      <div className="bg-gray-50 p-4 rounded-lg leading-loose">
        {words.map((word: string, idx: number) => (
          <span key={idx} onClick={() => toggle(idx)}
            className={`inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer text-sm ${
              selected.has(idx) ? 'bg-red-200 text-red-800 font-medium' : 'hover:bg-gray-200'}`}>
            {word}
          </span>
        ))}
      </div>
    </div>
  );
}

function ExamDictation({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const [text, setText] = useState('');
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Write from Dictation</h2>
      {question.audio_url && <audio controls className="w-full mb-4"><source src={question.audio_url} /></audio>}
      <input type="text" value={text} onChange={(e) => { setText(e.target.value); onAnswer(e.target.value); }}
        placeholder="Type the sentence you hear..."
        className="w-full border-2 border-gray-300 rounded-lg p-3 text-sm focus:border-[#0072CE] focus:outline-none" />
    </div>
  );
}

function ExamFillTable({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const blanks: { row: number; col: number }[] = [];
  question.rows.forEach((row: any, ri: number) => {
    row.cells.forEach((cell: any, ci: number) => { if (cell.blank) blanks.push({ row: ri, col: ci }); });
  });
  const [answers, setAnswers] = useState<string[]>(new Array(blanks.length).fill(''));
  const handleChange = (idx: number, val: string) => {
    const next = [...answers]; next[idx] = val; setAnswers(next); onAnswer(next);
  };
  let blankIdx = 0;
  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Fill the Table</h2>
      <table className="w-full border-collapse border border-gray-300">
        <thead><tr className="bg-[#003057] text-white">
          {question.columns.map((col: string, i: number) => (
            <th key={i} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">{col}</th>
          ))}
        </tr></thead>
        <tbody>
          {question.rows.map((row: any, ri: number) => (
            <tr key={ri} className="hover:bg-gray-50">
              {row.cells.map((cell: any, ci: number) => {
                if (cell.blank) {
                  const bi = blankIdx++;
                  return <td key={ci} className="border border-gray-300 px-2 py-2">
                    <input type="text" value={answers[bi]} onChange={(e) => handleChange(bi, e.target.value)}
                      className="w-full px-2 py-1 border-2 border-[#0072CE] rounded bg-blue-50 text-sm" placeholder="..." />
                  </td>;
                }
                return <td key={ci} className="border border-gray-300 px-4 py-2 text-sm">{cell.value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExamWordOrder({ question, onAnswer }: { question: any; onAnswer: (a: unknown) => void }) {
  const [orders, setOrders] = useState<number[][]>(question.items.map((item: any) => item.words.map((_: any, i: number) => i)));
  const [placed, setPlaced] = useState<number[][]>(question.items.map(() => [] as number[]));

  const addWord = (itemIdx: number, wordIdx: number) => {
    const np = placed.map((p, i) => i === itemIdx ? [...p, wordIdx] : p);
    const no = orders.map((o, i) => i === itemIdx ? o.filter((j) => j !== wordIdx) : o);
    setPlaced(np); setOrders(no); onAnswer(np);
  };
  const removeWord = (itemIdx: number, posIdx: number) => {
    const wordIdx = placed[itemIdx][posIdx];
    const np = placed.map((p, i) => i === itemIdx ? p.filter((_, j) => j !== posIdx) : p);
    const no = orders.map((o, i) => i === itemIdx ? [...o, wordIdx] : o);
    setPlaced(np); setOrders(no); onAnswer(np);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#003057] mb-2">Word Order</h2>
      <div className="space-y-6">
        {question.items.map((item: any, idx: number) => (
          <div key={idx} className="border rounded-lg p-4">
            <span className="text-sm font-bold text-[#003057] mb-3 block">{idx + 1}</span>
            <div className="flex flex-wrap gap-2 mb-3">
              {orders[idx].map((wi: number) => (
                <button key={wi} onClick={() => addWord(idx, wi)}
                  className="px-3 py-1.5 bg-[#F2A900] text-[#003057] rounded text-sm font-medium hover:bg-[#e09d00]">
                  {item.words[wi]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1 min-h-[44px] bg-gray-50 p-3 rounded-lg border-2 border-dashed border-gray-300">
              {placed[idx].length === 0
                ? <span className="text-gray-400 text-sm italic">Click words to build sentence...</span>
                : placed[idx].map((wi: number, pi: number) => (
                    <button key={pi} onClick={() => removeWord(idx, pi)}
                      className="px-3 py-1.5 bg-[#003057] text-white rounded text-sm font-medium hover:bg-red-600">
                      {item.words[wi]}
                    </button>
                  ))
              }
              {placed[idx].length > 0 && <span className="text-lg font-bold text-gray-500 ml-1">{item.punctuation}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
