import { useState, useEffect } from 'react';
import type { Section, Question, QuestionType } from '../types';
import { getQuestions } from '../services/api';

// Reading components
import MCQSingle from '../components/reading/MCQSingle';
import MCQMultiple from '../components/reading/MCQMultiple';
import FillBlanksDropdown from '../components/reading/FillBlanksDropdown';
import FillBlanksDrag from '../components/reading/FillBlanksDrag';
import ReorderParagraphs from '../components/reading/ReorderParagraphs';

// Writing components
import Essay from '../components/writing/Essay';
import SummarizeWrittenText from '../components/writing/SummarizeWrittenText';

// Speaking component
import SpeakingQuestion from '../components/speaking/SpeakingQuestion';

// Listening components
import SummarizeSpokenText from '../components/listening/SummarizeSpokenText';
import ListeningMCQ from '../components/listening/ListeningMCQ';
import FillBlanksTypeIn from '../components/listening/FillBlanksTypeIn';
import HighlightIncorrectWords from '../components/listening/HighlightIncorrectWords';
import WriteFromDictation from '../components/listening/WriteFromDictation';
import SelectMissingWord from '../components/listening/SelectMissingWord';

// Grammar components
import GrammarErrorCorrection from '../components/grammar/GrammarErrorCorrection';
import GrammarSelectBlanks from '../components/grammar/GrammarSelectBlanks';
import GrammarDragDialogue from '../components/grammar/GrammarDragDialogue';

// Vocabulary components
import VocabularyFillTable from '../components/vocabulary/VocabularyFillTable';
import VocabularyWordOrder from '../components/vocabulary/VocabularyWordOrder';

const SECTIONS: { key: Section; label: string; color: string }[] = [
  { key: 'speaking', label: 'Speaking & Writing', color: '#0072CE' },
  { key: 'reading', label: 'Reading', color: '#00A651' },
  { key: 'grammar', label: 'Grammar', color: '#9B59B6' },
  { key: 'vocabulary', label: 'Vocabulary', color: '#E67E22' },
  { key: 'listening', label: 'Listening', color: '#F2A900' },
];

interface QuestionTypeInfo {
  type: QuestionType;
  label: string;
  description: string;
  section: Section;
}

const QUESTION_TYPES: QuestionTypeInfo[] = [
  // Speaking
  { type: 'read_aloud', label: 'Read Aloud', description: 'Read the text aloud clearly.', section: 'speaking' },
  { type: 'repeat_sentence', label: 'Repeat Sentence', description: 'Listen and repeat the sentence.', section: 'speaking' },
  { type: 'describe_image', label: 'Describe Image', description: 'Describe the image in detail.', section: 'speaking' },
  { type: 'retell_lecture', label: 'Re-tell Lecture', description: 'Listen and retell the lecture.', section: 'speaking' },
  { type: 'answer_short_question', label: 'Answer Short Question', description: 'Give a brief spoken answer.', section: 'speaking' },
  { type: 'summarize_group_discussion', label: 'Summarize Group Discussion', description: 'Summarize the discussion.', section: 'speaking' },
  { type: 'respond_to_situation', label: 'Respond to a Situation', description: 'Respond to the given scenario.', section: 'speaking' },
  // Writing
  { type: 'summarize_written_text', label: 'Summarize Written Text', description: 'Write a one-sentence summary.', section: 'speaking' },
  { type: 'essay', label: 'Essay', description: 'Write a 200-300 word essay.', section: 'speaking' },
  // Reading
  { type: 'mcq_single_reading', label: 'Multiple Choice (Single)', description: 'Select the single correct answer.', section: 'reading' },
  { type: 'mcq_multiple_reading', label: 'Multiple Choice (Multiple)', description: 'Select all correct answers.', section: 'reading' },
  { type: 'reorder_paragraphs', label: 'Re-order Paragraphs', description: 'Arrange in correct sequence.', section: 'reading' },
  { type: 'fill_blanks_dropdown', label: 'Fill Blanks (Dropdown)', description: 'Select words from dropdowns.', section: 'reading' },
  { type: 'fill_blanks_drag', label: 'Fill Blanks (Drag & Drop)', description: 'Drag words to fill blanks.', section: 'reading' },
  // Grammar
  { type: 'grammar_error_correction', label: 'Error Correction', description: 'Find and correct the grammar mistake.', section: 'grammar' },
  { type: 'grammar_select_blanks', label: 'Select Blanks', description: 'Select the correct word for each gap.', section: 'grammar' },
  { type: 'grammar_drag_dialogue', label: 'Complete Dialogue', description: 'Drag words to complete the dialogue.', section: 'grammar' },
  // Vocabulary
  { type: 'vocabulary_fill_table', label: 'Fill the Table', description: 'Write words to complete the table.', section: 'vocabulary' },
  { type: 'vocabulary_word_order', label: 'Word Order', description: 'Rearrange words to make sentences.', section: 'vocabulary' },
  // Listening
  { type: 'summarize_spoken_text', label: 'Summarize Spoken Text', description: 'Write 50-70 word summary of audio.', section: 'listening' },
  { type: 'mcq_multiple_listening', label: 'Multiple Choice (Multiple)', description: 'Select all correct answers.', section: 'listening' },
  { type: 'fill_blanks_type_in', label: 'Fill Blanks (Type In)', description: 'Type missing words from audio.', section: 'listening' },
  { type: 'highlight_correct_summary', label: 'Highlight Correct Summary', description: 'Choose the best summary.', section: 'listening' },
  { type: 'mcq_single_listening', label: 'Multiple Choice (Single)', description: 'Select the correct answer.', section: 'listening' },
  { type: 'select_missing_word', label: 'Select Missing Word', description: 'Choose the word that completes the audio.', section: 'listening' },
  { type: 'highlight_incorrect_words', label: 'Highlight Incorrect Words', description: 'Click words that differ from audio.', section: 'listening' },
  { type: 'write_from_dictation', label: 'Write from Dictation', description: 'Type the sentence you hear.', section: 'listening' },
];

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function PracticePage() {
  const [activeSection, setActiveSection] = useState<Section>('reading');
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundNumber, setRoundNumber] = useState(1);

  // Determine which data section to fetch from
  const getDataSection = (type: QuestionType): string => {
    if (['summarize_written_text', 'essay'].includes(type)) return 'writing';
    if (type.startsWith('read_aloud') || type.startsWith('repeat_sentence') || type.startsWith('describe_image') ||
        type.startsWith('retell_lecture') || type.startsWith('answer_short') || type.startsWith('summarize_group') ||
        type.startsWith('respond_to')) return 'speaking';
    if (type.startsWith('grammar_')) return 'grammar';
    if (type.startsWith('vocabulary_')) return 'vocabulary';
    if (activeSection === 'listening') return 'listening';
    return 'reading';
  };

  useEffect(() => {
    if (!selectedType) return;
    setLoading(true);
    const dataSection = getDataSection(selectedType);
    getQuestions(dataSection as Section, selectedType)
      .then((qs) => {
        setQuestions(shuffleArray(qs));
        setCurrentIndex(0);
        setRoundComplete(false);
        setRoundNumber(1);
      })
      .finally(() => setLoading(false));
  }, [selectedType]);

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setRoundComplete(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
    setQuestions([]);
    setCurrentIndex(0);
    setRoundComplete(false);
    setRoundNumber(1);
  };

  const handleNewRound = () => {
    setQuestions(shuffleArray(questions));
    setCurrentIndex(0);
    setRoundComplete(false);
    setRoundNumber((prev) => prev + 1);
  };

  const sectionTypes = QUESTION_TYPES.filter((qt) => qt.section === activeSection);
  const currentQuestion = questions[currentIndex];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#003057] mb-6">Practice Mode</h1>

      {/* Section Tabs */}
      <div className="flex gap-1 mb-8 bg-white rounded-lg shadow p-1">
        {SECTIONS.map((s) => (
          <button key={s.key}
            onClick={() => { setActiveSection(s.key); setSelectedType(null); setQuestions([]); setRoundComplete(false); }}
            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors ${
              activeSection === s.key ? 'text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
            style={activeSection === s.key ? { backgroundColor: s.color } : {}}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Type Selection */}
        {!selectedType && (
          <div>
            <h2 className="text-lg font-semibold text-[#003057] mb-4">
              {SECTIONS.find(s => s.key === activeSection)?.label} Question Types
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionTypes.map((qt) => (
                <button key={qt.type} onClick={() => setSelectedType(qt.type)}
                  className="text-left border rounded-lg p-4 hover:border-[#0072CE] hover:shadow-sm transition-all">
                  <h3 className="font-medium text-[#003057] mb-1">{qt.label}</h3>
                  <p className="text-sm text-gray-500">{qt.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {selectedType && loading && (
          <div className="text-center py-12 text-gray-400">Loading questions...</div>
        )}

        {/* Round Complete */}
        {selectedType && !loading && roundComplete && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">&#127942;</div>
            <h3 className="text-xl font-bold text-[#003057] mb-2">
              Round {roundNumber} Complete!
            </h3>
            <p className="text-gray-500 mb-6">
              You finished all {questions.length} questions.
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleNewRound}
                className="px-6 py-2.5 bg-[#0072CE] text-white rounded-lg hover:bg-[#005fa3] transition-colors font-medium"
              >
                Practice Again (Shuffled)
              </button>
              <button
                onClick={handleBack}
                className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back to Question Types
              </button>
            </div>
          </div>
        )}

        {/* Question Display */}
        {selectedType && !loading && !roundComplete && currentQuestion && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <button onClick={handleBack} className="text-sm text-[#0072CE] hover:underline">
                &larr; Back to question types
              </button>
              <div className="flex items-center gap-4">
                {currentIndex > 0 && (
                  <button onClick={handlePrevious}
                    className="px-4 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
                    &larr; Previous
                  </button>
                )}
                <span className="text-sm text-gray-400">
                  {roundNumber > 1 && <span className="text-[#0072CE] font-medium">Round {roundNumber} &mdash; </span>}
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <button onClick={handleNext}
                  className="px-4 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 transition-colors">
                  Skip &rarr;
                </button>
              </div>
            </div>
            <QuestionRenderer
              question={currentQuestion}
              type={selectedType}
              onNext={handleNext}
              roundNumber={roundNumber}
            />
          </div>
        )}

        {/* No questions */}
        {selectedType && !loading && !roundComplete && questions.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>No questions available for this type.</p>
            <button onClick={handleBack} className="mt-2 text-[#0072CE] hover:underline text-sm">Go back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionRenderer({ question, type, onNext, roundNumber }: { question: any; type: QuestionType; onNext: () => void; roundNumber: number }) {
  const key = `${question.id}-round-${roundNumber}`;

  switch (type) {
    // Reading
    case 'mcq_single_reading':
      return <MCQSingle key={key} question={question} onNext={onNext} />;
    case 'mcq_multiple_reading':
      return <MCQMultiple key={key} question={question} onNext={onNext} />;
    case 'fill_blanks_dropdown':
      return <FillBlanksDropdown key={key} question={question} onNext={onNext} />;
    case 'fill_blanks_drag':
      return <FillBlanksDrag key={key} question={question} onNext={onNext} />;
    case 'reorder_paragraphs':
      return <ReorderParagraphs key={key} question={question} onNext={onNext} />;

    // Writing
    case 'essay':
      return <Essay key={key} question={question} onNext={onNext} />;
    case 'summarize_written_text':
      return <SummarizeWrittenText key={key} question={question} onNext={onNext} />;

    // Speaking
    case 'read_aloud':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Read Aloud"
        instruction="Read the text below aloud. You have time to prepare before recording begins."
        text={question.text} prepTime={question.prep_time || 30} recordTime={question.record_time || 40} onNext={onNext} />;
    case 'repeat_sentence':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Repeat Sentence"
        instruction="Listen to the sentence and repeat it exactly as you hear it."
        audioUrl={question.audio_url} prepTime={0} recordTime={question.record_time || 15} onNext={onNext} />;
    case 'describe_image':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Describe Image"
        instruction="Describe the image in detail. You have time to prepare."
        imageUrl={question.image_url} prepTime={question.prep_time || 25} recordTime={question.record_time || 40} onNext={onNext} />;
    case 'retell_lecture':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Re-tell Lecture"
        instruction="Listen to the lecture, then retell it in your own words."
        audioUrl={question.audio_url} prepTime={question.prep_time || 10} recordTime={question.record_time || 40} onNext={onNext} />;
    case 'answer_short_question':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Answer Short Question"
        instruction="Listen to the question and give a short spoken answer."
        audioUrl={question.audio_url} prepTime={0} recordTime={question.record_time || 10} onNext={onNext} />;
    case 'summarize_group_discussion':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Summarize Group Discussion"
        instruction="Listen to the discussion and summarize it in your own words."
        audioUrl={question.audio_url} prepTime={question.prep_time || 10} recordTime={question.record_time || 120} onNext={onNext} />;
    case 'respond_to_situation':
      return <SpeakingQuestion key={key} id={question.id} type={type} title="Respond to a Situation"
        instruction="Read the situation and give an appropriate spoken response."
        scenario={question.scenario} prepTime={question.prep_time || 10} recordTime={question.record_time || 40} onNext={onNext} />;

    // Grammar
    case 'grammar_error_correction':
      return <GrammarErrorCorrection key={key} question={question} onNext={onNext} />;
    case 'grammar_select_blanks':
      return <GrammarSelectBlanks key={key} question={question} onNext={onNext} />;
    case 'grammar_drag_dialogue':
      return <GrammarDragDialogue key={key} question={question} onNext={onNext} />;

    // Vocabulary
    case 'vocabulary_fill_table':
      return <VocabularyFillTable key={key} question={question} onNext={onNext} />;
    case 'vocabulary_word_order':
      return <VocabularyWordOrder key={key} question={question} onNext={onNext} />;

    // Listening
    case 'summarize_spoken_text':
      return <SummarizeSpokenText key={key} question={question} onNext={onNext} />;
    case 'mcq_multiple_listening':
      return <ListeningMCQ key={key} question={question} onNext={onNext} multiple />;
    case 'mcq_single_listening':
    case 'highlight_correct_summary':
      return <ListeningMCQ key={key} question={question} onNext={onNext} />;
    case 'fill_blanks_type_in':
      return <FillBlanksTypeIn key={key} question={question} onNext={onNext} />;
    case 'highlight_incorrect_words':
      return <HighlightIncorrectWords key={key} question={question} onNext={onNext} />;
    case 'write_from_dictation':
      return <WriteFromDictation key={key} question={question} onNext={onNext} />;
    case 'select_missing_word':
      return <SelectMissingWord key={key} question={question} onNext={onNext} />;

    default:
      return <p className="text-gray-500">Question type "{type}" not yet implemented.</p>;
  }
}
