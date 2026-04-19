// Question types
export type Section = 'speaking' | 'writing' | 'reading' | 'listening' | 'grammar' | 'vocabulary';

export type QuestionType =
  // Speaking & Writing
  | 'read_aloud'
  | 'repeat_sentence'
  | 'describe_image'
  | 'retell_lecture'
  | 'answer_short_question'
  | 'summarize_group_discussion'
  | 'respond_to_situation'
  | 'summarize_written_text'
  | 'essay'
  // Reading
  | 'fill_blanks_dropdown'
  | 'mcq_multiple_reading'
  | 'reorder_paragraphs'
  | 'fill_blanks_drag'
  | 'mcq_single_reading'
  // Listening
  | 'summarize_spoken_text'
  | 'mcq_multiple_listening'
  | 'fill_blanks_type_in'
  | 'highlight_correct_summary'
  | 'mcq_single_listening'
  | 'select_missing_word'
  | 'highlight_incorrect_words'
  | 'write_from_dictation'
  // Grammar
  | 'grammar_error_correction'
  | 'grammar_select_blanks'
  | 'grammar_drag_dialogue'
  // Vocabulary
  | 'vocabulary_fill_table'
  | 'vocabulary_word_order';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  section: Section;
  time_limit_seconds?: number;
}

// Reading questions
export interface MCQSingleQuestion extends BaseQuestion {
  type: 'mcq_single_reading' | 'mcq_single_listening';
  prompt: string;
  passage?: string;
  audio_url?: string;
  options: string[];
  correct_answer: number;
}

export interface MCQMultipleQuestion extends BaseQuestion {
  type: 'mcq_multiple_reading' | 'mcq_multiple_listening';
  prompt: string;
  passage?: string;
  audio_url?: string;
  options: string[];
  correct_answers: number[];
}

export interface FillBlanksDropdownQuestion extends BaseQuestion {
  type: 'fill_blanks_dropdown';
  text: string;
  blanks: { index: number; options: string[]; answer: string }[];
}

export interface FillBlanksDragQuestion extends BaseQuestion {
  type: 'fill_blanks_drag';
  text: string;
  blank_positions: number[];
  options: string[];
  correct_answers: string[];
}

export interface ReorderParagraphsQuestion extends BaseQuestion {
  type: 'reorder_paragraphs';
  paragraphs: string[];
  correct_order: number[];
}

// Writing questions
export interface EssayQuestion extends BaseQuestion {
  type: 'essay';
  prompt: string;
}

export interface SummarizeWrittenTextQuestion extends BaseQuestion {
  type: 'summarize_written_text';
  passage: string;
}

// Speaking questions
export interface ReadAloudQuestion extends BaseQuestion {
  type: 'read_aloud';
  text: string;
}

export interface RepeatSentenceQuestion extends BaseQuestion {
  type: 'repeat_sentence';
  audio_url: string;
  transcript: string;
}

export interface DescribeImageQuestion extends BaseQuestion {
  type: 'describe_image';
  image_url: string;
}

export interface RetellLectureQuestion extends BaseQuestion {
  type: 'retell_lecture';
  audio_url: string;
  transcript: string;
}

export interface AnswerShortQuestionDef extends BaseQuestion {
  type: 'answer_short_question';
  audio_url: string;
  transcript: string;
  expected_answer: string;
}

export interface SummarizeGroupDiscussionQuestion extends BaseQuestion {
  type: 'summarize_group_discussion';
  audio_url: string;
  transcript: string;
}

export interface RespondToSituationQuestion extends BaseQuestion {
  type: 'respond_to_situation';
  scenario: string;
  audio_url?: string;
}

// Listening questions
export interface SummarizeSpokenTextQuestion extends BaseQuestion {
  type: 'summarize_spoken_text';
  audio_url: string;
  transcript: string;
}

export interface FillBlanksTypeInQuestion extends BaseQuestion {
  type: 'fill_blanks_type_in';
  audio_url: string;
  transcript_with_blanks: string;
  correct_answers: string[];
}

export interface HighlightCorrectSummaryQuestion extends BaseQuestion {
  type: 'highlight_correct_summary';
  audio_url: string;
  options: string[];
  correct_answer: number;
}

export interface SelectMissingWordQuestion extends BaseQuestion {
  type: 'select_missing_word';
  audio_url: string;
  options: string[];
  correct_answer: number;
}

export interface HighlightIncorrectWordsQuestion extends BaseQuestion {
  type: 'highlight_incorrect_words';
  audio_url: string;
  transcript: string;
  incorrect_indices: number[];
}

export interface WriteFromDictationQuestion extends BaseQuestion {
  type: 'write_from_dictation';
  audio_url: string;
  correct_text: string;
}

// Grammar questions
export interface GrammarErrorCorrectionQuestion extends BaseQuestion {
  type: 'grammar_error_correction';
  sentence: string;
  underlined_word: string;
  options: string[];
  correct_answer: number;
}

export interface GrammarSelectBlanksQuestion extends BaseQuestion {
  type: 'grammar_select_blanks';
  items: { text_before: string; text_after: string; options: string[]; answer?: string }[];
}

export interface GrammarDragDialogueQuestion extends BaseQuestion {
  type: 'grammar_drag_dialogue';
  word_bank: string[];
  lines: { speaker: string; parts: { text?: string; blank?: boolean }[]; answer?: string }[];
  correct_answers: string[];
}

// Vocabulary questions
export interface VocabularyFillTableQuestion extends BaseQuestion {
  type: 'vocabulary_fill_table';
  columns: string[];
  rows: { cells: { value?: string; blank?: boolean; answer?: string }[] }[];
}

export interface VocabularyWordOrderQuestion extends BaseQuestion {
  type: 'vocabulary_word_order';
  items: { words: string[]; correct_order: number[]; punctuation: string }[];
}

// Exam section definition
export interface ExamSectionDef {
  key: string;
  label: string;
  timer_type: 'section' | 'per_question';
  time_limit_seconds: number;
  questions: Question[];
}

export type Question =
  | MCQSingleQuestion
  | MCQMultipleQuestion
  | FillBlanksDropdownQuestion
  | FillBlanksDragQuestion
  | ReorderParagraphsQuestion
  | EssayQuestion
  | SummarizeWrittenTextQuestion
  | ReadAloudQuestion
  | RepeatSentenceQuestion
  | DescribeImageQuestion
  | RetellLectureQuestion
  | AnswerShortQuestionDef
  | SummarizeGroupDiscussionQuestion
  | RespondToSituationQuestion
  | SummarizeSpokenTextQuestion
  | FillBlanksTypeInQuestion
  | HighlightCorrectSummaryQuestion
  | SelectMissingWordQuestion
  | HighlightIncorrectWordsQuestion
  | WriteFromDictationQuestion
  | GrammarErrorCorrectionQuestion
  | GrammarSelectBlanksQuestion
  | GrammarDragDialogueQuestion
  | VocabularyFillTableQuestion
  | VocabularyWordOrderQuestion;

// Scoring
export interface ScoreDetails {
  [criterion: string]: number;
}

export interface SubmitAnswerResponse {
  score_details: ScoreDetails;
  total_score: number;
  max_score: number;
  feedback?: string;
  correct_answers?: unknown;
}

// Progress
export interface Attempt {
  id: number;
  mode: 'exam' | 'practice';
  exam_session_id?: string;
  question_type: QuestionType;
  section: Section;
  question_id: string;
  user_answer: string;
  score_details: ScoreDetails;
  total_score: number;
  time_spent_seconds: number;
  created_at: string;
}

export interface ExamSession {
  id: string;
  started_at: string;
  completed_at?: string;
  overall_score?: number;
  section_scores?: Record<Section, number>;
  status: 'in_progress' | 'completed' | 'abandoned';
}

export interface ProgressOverview {
  total_attempts: number;
  average_score: number;
  estimated_pte_score: number;
  section_averages: Record<Section, number>;
  question_type_averages: Record<QuestionType, number>;
  recent_trend: number[];
  weakest_areas: { type: QuestionType; avg_score: number; tip: string }[];
}
