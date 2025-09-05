"use client";

interface SampleQuestionsProps {
  onQuestionClick: (question: string) => void;
}

export function SampleQuestions({ onQuestionClick }: SampleQuestionsProps) {
  const sampleQuestions = [
    "hello ji aapke paas break pad hoga Tata Harrier ka?",
    "I want to fit car mat do you have?",
    "What is the cost for an alternator for my Honda?"
  ];

  return (
    <div className="mt-8">
      <div className="text-center text-sm text-gray-300 mb-4">
        Try asking:
      </div>
      <div className="flex flex-col gap-3 max-w-2xl mx-auto">
        {sampleQuestions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="text-left p-4 bg-[rgba(36,83,72,0.3)] hover:bg-[rgba(36,83,72,0.5)] border border-gray-600 rounded-lg transition-all duration-200 hover:border-[rgba(36,83,72,0.8)] hover:shadow-lg group"
          >
            <div className="flex items-center justify-between">
              <span className="text-white text-sm group-hover:text-gray-100">
                {question}
              </span>
              <div className="text-[rgba(36,83,72,0.8)] group-hover:text-[rgba(36,83,72,1)] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
