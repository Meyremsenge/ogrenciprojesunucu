/**
 * Quiz Yönetim Sayfası
 * 
 * Özellikler:
 * - Quiz listesi görüntüleme
 * - Yeni quiz oluşturma (2 adımlı wizard)
 * - Soru ekleme/düzenleme
 * - Quiz yayımlama/kaldırma
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, FileQuestion, Clock, Users, Edit2, Trash2,
  X, Save, Loader2, PlayCircle, Pause, CheckCircle2, Circle,
  ChevronRight, ChevronLeft, AlertCircle, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';

// Types
interface Answer {
  id?: number;
  answer_text: string;
  is_correct: boolean;
}

interface Question {
  id?: number;
  question_text: string;
  question_type: string;
  points: number;
  answers: Answer[];
}

interface Quiz {
  id: number;
  title: string;
  description?: string;
  exam_type: string;
  status: string;
  grade_level?: string;
  duration_minutes: number;
  pass_score: number;
  max_attempts: number;
  total_questions: number;
  owner_type: string;
  created_at: string;
}

// Constants
const GRADE_LEVELS = [
  { value: '1', label: '1. Sınıf' },
  { value: '2', label: '2. Sınıf' },
  { value: '3', label: '3. Sınıf' },
  { value: '4', label: '4. Sınıf' },
  { value: '5', label: '5. Sınıf' },
  { value: '6', label: '6. Sınıf' },
  { value: '7', label: '7. Sınıf' },
  { value: '8', label: '8. Sınıf' },
  { value: '9', label: '9. Sınıf' },
  { value: '10', label: '10. Sınıf' },
  { value: '11', label: '11. Sınıf' },
  { value: '12', label: '12. Sınıf' },
  { value: 'tyt', label: 'TYT' },
  { value: 'ayt', label: 'AYT' },
];

// Empty question template
const createEmptyQuestion = (): Question => ({
  question_text: '',
  question_type: 'single_choice',
  points: 10,
  answers: [
    { answer_text: '', is_correct: true },
    { answer_text: '', is_correct: false },
    { answer_text: '', is_correct: false },
    { answer_text: '', is_correct: false },
  ]
});

// Empty form template
const createEmptyForm = () => ({
  title: '',
  description: '',
  exam_type: 'quiz',
  grade_level: '',
  duration_minutes: 30,
  pass_score: 60,
  max_attempts: 1,
});

export default function QuizManagementPage() {
  // State
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Questions
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState(createEmptyForm());
  const [questions, setQuestions] = useState<Question[]>([createEmptyQuestion()]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch quizzes
  const fetchQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/exams', { params: { exam_type: 'quiz' } });
      const items = response.data?.data?.items || response.data?.items || [];
      setQuizzes(items);
    } catch (error) {
      console.error('Quiz listesi yüklenemedi:', error);
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  // Open create modal
  const handleCreate = () => {
    setEditingQuiz(null);
    setFormData(createEmptyForm());
    setQuestions([createEmptyQuestion()]);
    setCurrentQuestionIndex(0);
    setStep(1);
    setShowModal(true);
  };

  // Open edit modal
  const handleEdit = async (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setFormData({
      title: quiz.title,
      description: quiz.description || '',
      exam_type: quiz.exam_type,
      grade_level: quiz.grade_level || '',
      duration_minutes: quiz.duration_minutes,
      pass_score: quiz.pass_score,
      max_attempts: quiz.max_attempts,
    });
    
    // Load questions
    try {
      const response = await api.get(`/exams/${quiz.id}/questions`);
      const loadedQuestions = response.data?.data?.questions || [];
      setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [createEmptyQuestion()]);
    } catch {
      setQuestions([createEmptyQuestion()]);
    }
    
    setCurrentQuestionIndex(0);
    setStep(1);
    setShowModal(true);
  };

  // Go to step 2
  const goToQuestions = () => {
    if (!formData.title.trim()) {
      alert('Lütfen quiz başlığı girin');
      return;
    }
    if (!formData.grade_level) {
      alert('Lütfen kademe seçin');
      return;
    }
    setStep(2);
  };

  // Update question
  const updateQuestion = (field: string, value: string | number) => {
    const updated = [...questions];
    updated[currentQuestionIndex] = { ...updated[currentQuestionIndex], [field]: value };
    setQuestions(updated);
  };

  // Update answer
  const updateAnswer = (answerIndex: number, field: string, value: string | boolean) => {
    const updated = [...questions];
    const answers = [...updated[currentQuestionIndex].answers];
    
    if (field === 'is_correct' && value === true) {
      // Single choice - only one correct answer
      answers.forEach((a, i) => { a.is_correct = i === answerIndex; });
    } else {
      answers[answerIndex] = { ...answers[answerIndex], [field]: value };
    }
    
    updated[currentQuestionIndex].answers = answers;
    setQuestions(updated);
  };

  // Add question
  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
    setCurrentQuestionIndex(questions.length);
  };

  // Remove question
  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
    setCurrentQuestionIndex(Math.min(currentQuestionIndex, updated.length - 1));
  };

  // Add answer option
  const addAnswer = () => {
    const updated = [...questions];
    updated[currentQuestionIndex].answers.push({ answer_text: '', is_correct: false });
    setQuestions(updated);
  };

  // Remove answer option
  const removeAnswer = (answerIndex: number) => {
    const updated = [...questions];
    if (updated[currentQuestionIndex].answers.length <= 2) return;
    updated[currentQuestionIndex].answers = updated[currentQuestionIndex].answers.filter((_, i) => i !== answerIndex);
    setQuestions(updated);
  };

  // Save quiz
  const handleSave = async () => {
    // Validate questions
    const validQuestions = questions.filter(q => 
      q.question_text.trim() && 
      q.answers.filter(a => a.answer_text.trim()).length >= 2 &&
      q.answers.some(a => a.is_correct && a.answer_text.trim())
    );
    
    if (validQuestions.length === 0) {
      alert('En az bir geçerli soru eklemelisiniz (soru metni + en az 2 cevap + 1 doğru cevap)');
      return;
    }

    try {
      setSaving(true);
      let quizId = editingQuiz?.id;

      // Create or update quiz
      if (editingQuiz) {
        await api.put(`/exams/${editingQuiz.id}`, formData);
      } else {
        const response = await api.post('/exams', formData);
        quizId = response.data?.data?.exam?.id || response.data?.data?.id;
      }

      if (!quizId) {
        throw new Error('Quiz ID alınamadı');
      }

      // Save questions
      for (const question of validQuestions) {
        const questionData = {
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points,
          answers: question.answers
            .filter(a => a.answer_text.trim())
            .map(a => ({ answer_text: a.answer_text, is_correct: a.is_correct }))
        };

        if (question.id) {
          await api.put(`/exams/questions/${question.id}`, questionData);
        } else {
          await api.post(`/exams/${quizId}/questions`, questionData);
        }
      }

      setShowModal(false);
      fetchQuizzes();
      alert('Quiz başarıyla kaydedildi!');
    } catch (error: unknown) {
      console.error('Quiz kaydetme hatası:', error);
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Quiz kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  // Delete quiz
  const handleDelete = async (quiz: Quiz) => {
    if (!confirm(`"${quiz.title}" quizini silmek istediğinize emin misiniz?`)) return;
    
    try {
      await api.delete(`/exams/${quiz.id}`);
      fetchQuizzes();
    } catch (error) {
      console.error('Silme hatası:', error);
      alert('Quiz silinemedi');
    }
  };

  // Publish/Unpublish quiz
  const handleTogglePublish = async (quiz: Quiz) => {
    try {
      if (quiz.status === 'draft') {
        await api.post(`/exams/${quiz.id}/publish`);
      } else {
        await api.post(`/exams/${quiz.id}/unpublish`);
      }
      fetchQuizzes();
    } catch (error) {
      console.error('Yayım hatası:', error);
      alert('İşlem başarısız');
    }
  };

  // Filter quizzes
  const filteredQuizzes = quizzes.filter(q => 
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Current question
  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-primary" />
            Quiz Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">Quiz oluşturun ve yönetin</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Quiz
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Quiz ara..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="pl-10" 
        />
      </div>

      {/* Quiz List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz quiz yok</h3>
          <p className="text-muted-foreground mb-4">İlk quizinizi oluşturun</p>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Quiz Oluştur
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-card border rounded-xl p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold truncate">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{quiz.description}</p>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  quiz.status === 'published' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {quiz.status === 'published' ? 'Yayında' : 'Taslak'}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-muted-foreground mb-4">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4" />
                  <span>{GRADE_LEVELS.find(g => g.value === quiz.grade_level)?.label || quiz.grade_level || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{quiz.duration_minutes} dakika</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileQuestion className="h-4 w-4" />
                  <span>{quiz.total_questions || 0} soru</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => handleEdit(quiz)} className="flex-1">
                  <Edit2 className="h-4 w-4 mr-1" /> Düzenle
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleTogglePublish(quiz)}
                  className={quiz.status === 'published' ? 'text-orange-600' : 'text-green-600'}
                >
                  {quiz.status === 'published' ? <Pause className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(quiz)} className="text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  {editingQuiz ? 'Quiz Düzenle' : 'Yeni Quiz Oluştur'}
                </h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`px-3 py-1 rounded-full ${step === 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
                    1. Bilgiler
                  </span>
                  <ChevronRight className="h-4 w-4" />
                  <span className={`px-3 py-1 rounded-full ${step === 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
                    2. Sorular
                  </span>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {step === 1 ? (
                /* Step 1: Quiz Info */
                <div className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-medium mb-1">Quiz Başlığı *</label>
                    <Input 
                      value={formData.title} 
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Örn: Matematik Tarama Testi"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Açıklama</label>
                    <textarea 
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Quiz hakkında kısa açıklama..."
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Kademe/Sınıf *</label>
                    <select 
                      value={formData.grade_level}
                      onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Seçin...</option>
                      {GRADE_LEVELS.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Süre (dk)</label>
                      <Input 
                        type="number" 
                        min={5} 
                        max={180}
                        value={formData.duration_minutes}
                        onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Geçme (%)</label>
                      <Input 
                        type="number" 
                        min={0} 
                        max={100}
                        value={formData.pass_score}
                        onChange={(e) => setFormData({ ...formData, pass_score: parseInt(e.target.value) || 60 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Max Deneme</label>
                      <Input 
                        type="number" 
                        min={1} 
                        max={10}
                        value={formData.max_attempts}
                        onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Questions */
                <div className="space-y-4">
                  {/* Question Navigator */}
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg overflow-x-auto">
                    {questions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentQuestionIndex(i)}
                        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                          currentQuestionIndex === i
                            ? 'bg-primary text-white'
                            : q.question_text.trim()
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-white border'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={addQuestion}
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border-2 border-dashed border-primary/50 text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {questions.filter(q => q.question_text.trim()).length}/{questions.length} tamamlandı
                    </span>
                  </div>

                  {/* Current Question Editor */}
                  {currentQuestion && (
                    <div className="bg-card border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Soru {currentQuestionIndex + 1}</h3>
                        {questions.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeQuestion(currentQuestionIndex)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Sil
                          </Button>
                        )}
                      </div>

                      {/* Question Text */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Soru Metni *</label>
                        <textarea
                          value={currentQuestion.question_text}
                          onChange={(e) => updateQuestion('question_text', e.target.value)}
                          placeholder="Sorunuzu buraya yazın..."
                          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Question Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Soru Tipi</label>
                          <select
                            value={currentQuestion.question_type}
                            onChange={(e) => updateQuestion('question_type', e.target.value)}
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="single_choice">Tek Seçimli</option>
                            <option value="multiple_choice">Çok Seçimli</option>
                            <option value="true_false">Doğru/Yanlış</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Puan</label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={currentQuestion.points}
                            onChange={(e) => updateQuestion('points', parseInt(e.target.value) || 10)}
                          />
                        </div>
                      </div>

                      {/* Answer Options */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Cevap Seçenekleri</label>
                          <Button variant="ghost" size="sm" onClick={addAnswer} className="text-primary">
                            <Plus className="h-4 w-4 mr-1" /> Seçenek Ekle
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {currentQuestion.answers.map((answer, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateAnswer(i, 'is_correct', !answer.is_correct)}
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                  answer.is_correct
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                                title={answer.is_correct ? 'Doğru cevap' : 'Doğru olarak işaretle'}
                              >
                                {answer.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                              </button>
                              <Input
                                value={answer.answer_text}
                                onChange={(e) => updateAnswer(i, 'answer_text', e.target.value)}
                                placeholder={`${String.fromCharCode(65 + i)}) Cevap seçeneği`}
                                className="flex-1"
                              />
                              {currentQuestion.answers.length > 2 && (
                                <button
                                  onClick={() => removeAnswer(i)}
                                  className="p-2 text-red-500 hover:bg-red-50 rounded"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Yeşil daire doğru cevabı gösterir. Tıklayarak değiştirebilirsiniz.
                        </p>
                      </div>

                      {/* Question Navigation */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                          disabled={currentQuestionIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Önceki
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {currentQuestionIndex + 1} / {questions.length}
                        </span>
                        {currentQuestionIndex < questions.length - 1 ? (
                          <Button
                            variant="outline"
                            onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                          >
                            Sonraki <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={addQuestion} className="text-primary">
                            <Plus className="h-4 w-4 mr-1" /> Yeni Soru
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t bg-muted/30">
              {step === 1 ? (
                <>
                  <Button variant="outline" onClick={() => setShowModal(false)}>
                    İptal
                  </Button>
                  <Button onClick={goToQuestions} className="gap-2">
                    Sorulara Geç <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Bilgilere Dön
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {questions.filter(q => q.question_text.trim()).length} soru hazır
                    </span>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      {saving ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...</>
                      ) : (
                        <><Save className="h-4 w-4" /> {editingQuiz ? 'Güncelle' : 'Kaydet'}</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
