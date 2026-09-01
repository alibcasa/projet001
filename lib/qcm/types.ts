export type QuizGenerationRequest = {
  documentIds: string[];
  pageRanges?: { documentId: string; from: number; to: number }[];
  sourceMode: "full_documents" | "pages" | "keynotes" | "selection";
  questionCount: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  questionTypes: ("multiple_choice" | "true_false" | "short_answer" | "flashcard")[];
  includeExplanations: boolean;
  requirePageCitation: boolean;
};

export type GeneratedQuestion = {
  question: string;
  choices: { text: string; correct: boolean }[];
  explanation: string;
  documentId: string;
  pageNumber: number;
  sourceExcerpt: string;
  difficulty: string;
  status: "ai_generated" | "verified" | "flagged";
};
