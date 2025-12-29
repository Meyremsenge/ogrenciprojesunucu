/**
 * Question Renderer Component
 * 
 * Farklı soru tiplerini render eden dinamik bileşen.
 */

import React, { useState, useCallback } from 'react';
import type { Question, QuestionType, Answer } from '@/types/exam';

interface QuestionRendererProps {
  question: Question;
  value: any;
  onChange: (value: any) => void;
  showFeedback?: boolean;
  feedback?: string;
  correctAnswer?: any;
  isCorrect?: boolean;
  disabled?: boolean;
}

export function QuestionRenderer({
  question,
  value,
  onChange,
  showFeedback,
  feedback,
  correctAnswer,
  isCorrect,
  disabled,
}: QuestionRendererProps) {
  const renderQuestion = () => {
    switch (question.question_type) {
      case 'multiple_choice':
        return (
          <MultipleChoiceQuestion
            question={question}
            value={value}
            onChange={onChange}
            disabled={disabled}
            correctAnswer={correctAnswer}
            showFeedback={showFeedback}
          />
        );
      case 'multiple_select':
        return (
          <MultipleSelectQuestion
            question={question}
            value={value || []}
            onChange={onChange}
            disabled={disabled}
            correctAnswer={correctAnswer}
            showFeedback={showFeedback}
          />
        );
      case 'true_false':
        return (
          <TrueFalseQuestion
            question={question}
            value={value}
            onChange={onChange}
            disabled={disabled}
            correctAnswer={correctAnswer}
            showFeedback={showFeedback}
          />
        );
      case 'short_answer':
        return (
          <ShortAnswerQuestion
            question={question}
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'essay':
        return (
          <EssayQuestion
            question={question}
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'fill_in_blank':
        return (
          <FillInBlankQuestion
            question={question}
            value={value || {}}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'matching':
        return (
          <MatchingQuestion
            question={question}
            value={value || {}}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'ordering':
        return (
          <OrderingQuestion
            question={question}
            value={value || []}
            onChange={onChange}
            disabled={disabled}
          />
        );
      case 'numeric':
        return (
          <NumericQuestion
            question={question}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        );
      default:
        return <p>Desteklenmeyen soru tipi: {question.question_type}</p>;
    }
  };

  return (
    <div className="question-renderer">
      {/* Question Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-lg font-medium text-gray-900 dark:text-white">
              {question.question_text}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {question.points} puan
            </span>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
              {getDifficultyLabel(question.difficulty)}
            </span>
          </div>
        </div>
        
        {/* Media */}
        {question.image_url && (
          <img
            src={question.image_url}
            alt="Soru görseli"
            className="mt-4 max-w-full rounded-lg shadow"
          />
        )}
        
        {question.audio_url && (
          <audio controls className="mt-4 w-full">
            <source src={question.audio_url} />
          </audio>
        )}
        
        {question.video_url && (
          <video controls className="mt-4 max-w-full rounded-lg">
            <source src={question.video_url} />
          </video>
        )}
      </div>

      {/* Question Content */}
      <div className="mt-4">
        {renderQuestion()}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`mt-4 p-4 rounded-lg ${
          isCorrect
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center">
            {isCorrect ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={isCorrect ? 'text-green-800' : 'text-red-800'}>
              {isCorrect ? 'Doğru!' : 'Yanlış'}
            </span>
          </div>
          {feedback && (
            <p className="mt-2 text-sm text-gray-700">{feedback}</p>
          )}
        </div>
      )}

      {/* Hint */}
      {question.hint && !disabled && (
        <HintButton hint={question.hint} penalty={question.hint_penalty} />
      )}
    </div>
  );
}

// =============================================================================
// Multiple Choice Question
// =============================================================================

interface MultipleChoiceQuestionProps {
  question: Question;
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  correctAnswer?: number;
  showFeedback?: boolean;
}

function MultipleChoiceQuestion({
  question,
  value,
  onChange,
  disabled,
  correctAnswer,
  showFeedback,
}: MultipleChoiceQuestionProps) {
  return (
    <div className="space-y-2">
      {question.answers.map((answer) => {
        const isSelected = value === answer.id;
        const isCorrectAnswer = showFeedback && correctAnswer === answer.id;
        const isWrongSelection = showFeedback && isSelected && !isCorrectAnswer;

        return (
          <label
            key={answer.id}
            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
            } ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${
              isCorrectAnswer ? 'border-green-500 bg-green-50' : ''
            } ${isWrongSelection ? 'border-red-500 bg-red-50' : ''}`}
          >
            <input
              type="radio"
              name={`question-${question.id}`}
              value={answer.id}
              checked={isSelected}
              onChange={() => onChange(answer.id)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">{answer.answer_text}</span>
            {answer.image_url && (
              <img src={answer.image_url} alt="" className="ml-4 h-16 w-16 object-cover rounded" />
            )}
            {showFeedback && answer.feedback && isSelected && (
              <span className="ml-auto text-sm text-gray-500">{answer.feedback}</span>
            )}
          </label>
        );
      })}
    </div>
  );
}

// =============================================================================
// Multiple Select Question
// =============================================================================

interface MultipleSelectQuestionProps {
  question: Question;
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  correctAnswer?: number[];
  showFeedback?: boolean;
}

function MultipleSelectQuestion({
  question,
  value,
  onChange,
  disabled,
  correctAnswer,
  showFeedback,
}: MultipleSelectQuestionProps) {
  const handleChange = (answerId: number, checked: boolean) => {
    if (checked) {
      onChange([...value, answerId]);
    } else {
      onChange(value.filter((id) => id !== answerId));
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-2">Birden fazla seçenek işaretleyebilirsiniz</p>
      {question.answers.map((answer) => {
        const isSelected = value.includes(answer.id);
        const isCorrectAnswer = showFeedback && correctAnswer?.includes(answer.id);

        return (
          <label
            key={answer.id}
            className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-gray-50'
            } ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} ${
              showFeedback && isCorrectAnswer ? 'border-green-500' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleChange(answer.id, e.target.checked)}
              disabled={disabled}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-3 text-gray-700">{answer.answer_text}</span>
          </label>
        );
      })}
    </div>
  );
}

// =============================================================================
// True/False Question
// =============================================================================

interface TrueFalseQuestionProps {
  question: Question;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  correctAnswer?: boolean;
  showFeedback?: boolean;
}

function TrueFalseQuestion({
  question,
  value,
  onChange,
  disabled,
  correctAnswer,
  showFeedback,
}: TrueFalseQuestionProps) {
  const options = [
    { value: true, label: 'Doğru' },
    { value: false, label: 'Yanlış' },
  ];

  return (
    <div className="flex space-x-4">
      {options.map((option) => {
        const isSelected = value === option.value;
        const isCorrectAnswer = showFeedback && correctAnswer === option.value;
        const isWrongSelection = showFeedback && isSelected && !isCorrectAnswer;

        return (
          <button
            key={String(option.value)}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`flex-1 py-4 px-6 rounded-lg border-2 text-center font-medium transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-400'
            } ${isSelected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200'} ${
              isCorrectAnswer ? 'border-green-500 bg-green-50 text-green-700' : ''
            } ${isWrongSelection ? 'border-red-500 bg-red-50 text-red-700' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Short Answer Question
// =============================================================================

interface ShortAnswerQuestionProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ShortAnswerQuestion({
  question,
  value,
  onChange,
  disabled,
}: ShortAnswerQuestionProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Cevabınızı yazın..."
      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
    />
  );
}

// =============================================================================
// Essay Question
// =============================================================================

interface EssayQuestionProps {
  question: Question;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function EssayQuestion({
  question,
  value,
  onChange,
  disabled,
}: EssayQuestionProps) {
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Cevabınızı detaylı olarak yazın..."
        rows={8}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-y"
      />
      <div className="mt-2 text-sm text-gray-500 text-right">
        {wordCount} kelime
      </div>
      {question.grading_rubric && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-2">Değerlendirme Kriterleri:</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{question.grading_rubric}</p>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Fill in Blank Question
// =============================================================================

interface FillInBlankQuestionProps {
  question: Question;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

function FillInBlankQuestion({
  question,
  value,
  onChange,
  disabled,
}: FillInBlankQuestionProps) {
  const blanks = question.question_data?.blanks || [];
  
  // Parse question text with blanks
  const parts = question.question_text.split(/\[blank_(\d+)\]/g);

  return (
    <div className="leading-relaxed">
      {parts.map((part, index) => {
        if (index % 2 === 0) {
          return <span key={index}>{part}</span>;
        }
        const blankId = `blank_${part}`;
        return (
          <input
            key={index}
            type="text"
            value={value[blankId] || ''}
            onChange={(e) => onChange({ ...value, [blankId]: e.target.value })}
            disabled={disabled}
            className="inline-block mx-1 px-2 py-1 w-32 border-b-2 border-blue-400 focus:border-blue-600 outline-none bg-transparent text-center"
            placeholder="..."
          />
        );
      })}
    </div>
  );
}

// =============================================================================
// Matching Question
// =============================================================================

interface MatchingQuestionProps {
  question: Question;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  disabled?: boolean;
}

function MatchingQuestion({
  question,
  value,
  onChange,
  disabled,
}: MatchingQuestionProps) {
  const pairs = question.question_data?.pairs || [];
  const leftItems = pairs.map((p: any) => ({ id: p.left, text: p.left_text }));
  const rightItems = pairs.map((p: any) => ({ id: p.right, text: p.right_text }));

  return (
    <div className="grid grid-cols-2 gap-8">
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Eşleştirin</h4>
        {leftItems.map((item: any) => (
          <div
            key={item.id}
            className="p-4 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-center justify-between">
              <span>{item.text}</span>
              <select
                value={value[item.id] || ''}
                onChange={(e) => onChange({ ...value, [item.id]: e.target.value })}
                disabled={disabled}
                className="ml-4 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seçin...</option>
                {rightItems.map((right: any) => (
                  <option key={right.id} value={right.id}>
                    {right.text}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <h4 className="font-medium text-gray-700">Seçenekler</h4>
        {rightItems.map((item: any) => (
          <div
            key={item.id}
            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <span className="font-medium text-gray-600">{item.id}.</span> {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Ordering Question
// =============================================================================

interface OrderingQuestionProps {
  question: Question;
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

function OrderingQuestion({
  question,
  value,
  onChange,
  disabled,
}: OrderingQuestionProps) {
  const items = question.question_data?.items || [];
  const orderedItems = value.length > 0 ? value : items.map((i: any) => i.id);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (disabled) return;
    const newOrder = [...orderedItems];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    onChange(newOrder);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">Öğeleri doğru sıraya göre düzenleyin</p>
      {orderedItems.map((itemId: string, index: number) => {
        const item = items.find((i: any) => i.id === itemId);
        return (
          <div
            key={itemId}
            className={`flex items-center p-4 rounded-lg border ${
              disabled ? 'bg-gray-50' : 'bg-white'
            } border-gray-200`}
          >
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full font-medium">
              {index + 1}
            </span>
            <span className="ml-4 flex-1">{item?.text || itemId}</span>
            {!disabled && (
              <div className="flex space-x-2">
                <button
                  onClick={() => moveItem(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  onClick={() => moveItem(index, Math.min(orderedItems.length - 1, index + 1))}
                  disabled={index === orderedItems.length - 1}
                  className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Numeric Question
// =============================================================================

interface NumericQuestionProps {
  question: Question;
  value: number | string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function NumericQuestion({
  question,
  value,
  onChange,
  disabled,
}: NumericQuestionProps) {
  const tolerance = question.question_data?.tolerance;
  const unit = question.question_data?.unit;

  return (
    <div className="flex items-center space-x-4">
      <input
        type="number"
        step="any"
        value={value ?? ''}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        placeholder="Sayısal cevabınızı girin"
        className="w-48 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
      />
      {unit && <span className="text-gray-600">{unit}</span>}
      {tolerance !== undefined && (
        <span className="text-sm text-gray-500">
          (±{tolerance}{question.question_data?.tolerance_type === 'percentage' ? '%' : ''} tolerans)
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

function HintButton({ hint, penalty }: { hint: string; penalty?: number }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="mt-4">
      {!showHint ? (
        <button
          onClick={() => setShowHint(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          İpucu göster {penalty ? `(-${penalty} puan)` : ''}
        </button>
      ) : (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>İpucu:</strong> {hint}
          </p>
        </div>
      )}
    </div>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    very_easy: 'bg-gray-100 text-gray-800',
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-orange-100 text-orange-800',
    very_hard: 'bg-red-100 text-red-800',
  };
  return colors[difficulty] || 'bg-gray-100 text-gray-800';
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    very_easy: 'Çok Kolay',
    easy: 'Kolay',
    medium: 'Orta',
    hard: 'Zor',
    very_hard: 'Çok Zor',
  };
  return labels[difficulty] || difficulty;
}

export default QuestionRenderer;
