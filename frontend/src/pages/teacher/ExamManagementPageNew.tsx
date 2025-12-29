/**
 * Quiz/Sınav Yönetimi Sayfası - Soru Ekleme Destekli
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileQuestion, Clock, Users, Edit2, Trash2,
  Copy, MoreVertical, GraduationCap, Target, X, Save,
  Loader2, PlayCircle, Pause, CheckCircle2, Circle, ChevronRight, ChevronLeft,
  ListPlus, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';

interface Question {
  id?: number;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'true_false';
  points: number;
  answers: Answer[];
}

interface Answer {
  id?: number;
  answer_text: string;
  is_correct: boolean;
}

interface Exam {
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
  attempt_count: number;
  average_score: number;
  created_at: string;
  owner_type: string;
}

const GRADE_LEVELS = [
  { value: '1', label: '1. Sınıf', category: 'İlkokul' },
  { value: '2', label: '2. Sınıf', category: 'İlkokul' },
  { value: '3', label: '3. Sınıf', category: 'İlkokul' },
  { value: '4', label: '4. Sınıf', category: 'İlkokul' },
  { value: '5', label: '5. Sınıf', category: 'Ortaokul' },
  { value: '6', label: '6. Sınıf', category: 'Ortaokul' },
  { value: '7', label: '7. Sınıf', category: 'Ortaokul' },
  { value: '8', label: '8. Sınıf', category: 'Ortaokul' },
  { value: '9', label: '9. Sınıf', category: 'Lise' },
  { value: '10', label: '10. Sınıf', category: 'Lise' },
  { value: '11', label: '11. Sınıf', category: 'Lise' },
  { value: '12', label: '12. Sınıf', category: 'Lise' },
  { value: 'mezun', label: 'Mezun', category: 'Sınav Hazırlık' },
  { value: 'tyt', label: 'TYT', category: 'Sınav Hazırlık' },
  { value: 'ayt', label: 'AYT', category: 'Sınav Hazırlık' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Taslak', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  published: { label: 'Yayında', color: 'text-green-600', bgColor: 'bg-green-100' },
  closed: { label: 'Kapalı', color: 'text-red-600', bgColor: 'bg-red-100' },
  archived: { label: 'Arşiv', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

const EXAM_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Ara Sınav' },
  { value: 'final', label: 'Final' },
  { value: 'practice', label: 'Pratik' },
  { value: 'homework', label: 'Ödev' },
];

export default function ExamManagementPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Wizard step state
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exam_type: 'quiz',
    grade_level: '',
    duration_minutes: 30,
    pass_score: 60,
    max_attempts: 1,
  });

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

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (searchQuery) params.search = searchQuery;
      if (filterGrade !== 'all') params.grade_level = filterGrade;
      if (filterStatus !== 'all') params.status = filterStatus;
      
      const response = await api.get('/exams', { params });
      setExams(response.data?.data?.items || []);
    } catch (error) {
      console.error('Sınavlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterGrade, filterStatus]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCreateNew = () => {
    setEditingExam(null);
    setFormData({ title: '', description: '', exam_type: 'quiz', grade_level: '', duration_minutes: 30, pass_score: 60, max_attempts: 1 });
    setQuestions([createEmptyQuestion()]);
    setCurrentQuestionIndex(0);
    setWizardStep(1);
    setShowCreateModal(true);
  };

  const handleEdit = async (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description || '',
      exam_type: exam.exam_type,
      grade_level: exam.grade_level || '',
      duration_minutes: exam.duration_minutes,
      pass_score: exam.pass_score,
      max_attempts: exam.max_attempts,
    });
    // Load existing questions for this exam
    try {
      const response = await api.get(`/exams/${exam.id}/questions`);
      // Backend returns {data: {questions: [...]}} format
      const loadedQuestions = response.data?.data?.questions || response.data?.data || [];
      setQuestions(loadedQuestions.length > 0 ? loadedQuestions : [createEmptyQuestion()]);
    } catch {
      setQuestions([createEmptyQuestion()]);
    }
    setCurrentQuestionIndex(0);
    setWizardStep(1);
    setShowCreateModal(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { alert('Lütfen quiz başlığı girin'); return; }
    if (!formData.grade_level) { alert('Lütfen kademe/sınıf seçin'); return; }
    
    // Validate questions
    const validQuestions = questions.filter(q => q.question_text.trim() && q.answers.some(a => a.answer_text.trim()));
    if (validQuestions.length === 0) {
      alert('En az bir soru eklemelisiniz');
      return;
    }
    
    try {
      setSaving(true);
      let examId = editingExam?.id;
      
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, formData);
      } else {
        const response = await api.post('/exams', formData);
        // Backend returns {data: {exam: {...}}} format
        examId = response.data?.data?.exam?.id || response.data?.data?.id || response.data?.id;
      }
      
      // Save questions
      if (examId) {
        for (const question of validQuestions) {
          const questionData = {
            question_text: question.question_text,
            question_type: question.question_type,
            points: question.points,
            answers: question.answers.filter(a => a.answer_text.trim()).map(a => ({
              answer_text: a.answer_text,
              is_correct: a.is_correct
            }))
          };
          
          if (question.id) {
            // Backend uses /questions/{id} for update
            await api.put(`/exams/questions/${question.id}`, questionData);
          } else {
            await api.post(`/exams/${examId}/questions`, questionData);
          }
        }
      }
      
      setShowCreateModal(false);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`"${exam.title}" quizini silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/exams/${exam.id}`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Silme işlemi başarısız');
    }
    setOpenMenuId(null);
  };

  const handlePublish = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/publish`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Yayımlama başarısız');
    }
    setOpenMenuId(null);
  };

  const handleUnpublish = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/unpublish`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Yayından kaldırma başarısız');
    }
    setOpenMenuId(null);
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/duplicate`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Kopyalama başarısız');
    }
    setOpenMenuId(null);
  };

  const getGradeLabel = (value?: string) => {
    if (!value) return '-';
    const grade = GRADE_LEVELS.find(g => g.value === value);
    return grade ? grade.label : value;
  };

  // Question management helpers
  const addQuestion = () => {
    setQuestions([...questions, createEmptyQuestion()]);
    setCurrentQuestionIndex(questions.length);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    if (currentQuestionIndex >= newQuestions.length) {
      setCurrentQuestionIndex(newQuestions.length - 1);
    }
  };

  const updateQuestion = (index: number, field: keyof Question, value: unknown) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    setQuestions(newQuestions);
  };

  const updateAnswer = (questionIndex: number, answerIndex: number, field: keyof Answer, value: unknown) => {
    const newQuestions = [...questions];
    const newAnswers = [...newQuestions[questionIndex].answers];
    newAnswers[answerIndex] = { ...newAnswers[answerIndex], [field]: value };
    
    // For single choice, only one answer can be correct
    if (field === 'is_correct' && value === true && newQuestions[questionIndex].question_type === 'single_choice') {
      newAnswers.forEach((a, i) => {
        if (i !== answerIndex) a.is_correct = false;
      });
    }
    
    newQuestions[questionIndex].answers = newAnswers;
    setQuestions(newQuestions);
  };

  const addAnswer = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers.push({ answer_text: '', is_correct: false });
    setQuestions(newQuestions);
  };

  const removeAnswer = (questionIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].answers.length <= 2) return;
    newQuestions[questionIndex].answers = newQuestions[questionIndex].answers.filter((_, i) => i !== answerIndex);
    setQuestions(newQuestions);
  };

  const goToStep2 = () => {
    if (!formData.title.trim()) { alert('Lütfen quiz başlığı girin'); return; }
    if (!formData.grade_level) { alert('Lütfen kademe/sınıf seçin'); return; }
    setWizardStep(2);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-primary" />
            Quiz Yönetimi
          </h1>
          <p className="text-muted-foreground mt-1">Quiz oluşturun, düzenleyin ve yönetin</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Quiz Oluştur
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Quiz ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Tüm Kademeler</option>
            <optgroup label="İlkokul">{GRADE_LEVELS.filter(g => g.category === 'İlkokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Ortaokul">{GRADE_LEVELS.filter(g => g.category === 'Ortaokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Lise">{GRADE_LEVELS.filter(g => g.category === 'Lise').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Sınav Hazırlık">{GRADE_LEVELS.filter(g => g.category === 'Sınav Hazırlık').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Tüm Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="published">Yayında</option>
            <option value="closed">Kapalı</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : exams.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Henüz quiz yok</h3>
          <p className="text-muted-foreground mb-4">İlk quizinizi oluşturarak başlayın</p>
          <Button onClick={handleCreateNew} className="gap-2"><Plus className="h-4 w-4" />Quiz Oluştur</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam) => {
            const statusInfo = STATUS_CONFIG[exam.status] || STATUS_CONFIG.draft;
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-4 border-b">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{exam.title}</h3>
                      {exam.description && <p className="text-sm text-muted-foreground truncate mt-1">{exam.description}</p>}
                    </div>
                    <div className="relative" ref={openMenuId === exam.id ? menuRef : null}>
                      <button onClick={() => setOpenMenuId(openMenuId === exam.id ? null : exam.id)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      <AnimatePresence>
                        {openMenuId === exam.id && (
                          <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-lg shadow-lg z-50 py-1">
                            <button onClick={() => handleEdit(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"><Edit2 className="h-4 w-4" /> Düzenle</button>
                            <button onClick={() => handleDuplicate(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"><Copy className="h-4 w-4" /> Kopyala</button>
                            <div className="border-t my-1" />
                            {exam.status === 'draft' ? (
                              <button onClick={() => handlePublish(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"><PlayCircle className="h-4 w-4" /> Yayımla</button>
                            ) : exam.status === 'published' ? (
                              <button onClick={() => handleUnpublish(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-orange-600"><Pause className="h-4 w-4" /> Yayından Kaldır</button>
                            ) : null}
                            <div className="border-t my-1" />
                            <button onClick={() => handleDelete(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Sil</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusInfo.bgColor, statusInfo.color)}>{statusInfo.label}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground"><GraduationCap className="h-4 w-4" />{getGradeLabel(exam.grade_level)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-muted/50 rounded-lg p-2"><Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><span className="font-medium">{exam.duration_minutes}dk</span></div>
                    <div className="bg-muted/50 rounded-lg p-2"><FileQuestion className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><span className="font-medium">{exam.total_questions || 0} soru</span></div>
                    <div className="bg-muted/50 rounded-lg p-2"><Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" /><span className="font-medium">{exam.attempt_count || 0}</span></div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5" /><span>Hedef: %{exam.pass_score} başarı</span></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background rounded-xl shadow-xl max-w-3xl w-full min-h-[600px] max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header with Steps */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold">{editingExam ? 'Quiz Düzenle' : 'Yeni Quiz Oluştur'}</h2>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={cn("flex items-center gap-1 px-2 py-1 rounded-full", wizardStep === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">1</span>
                      Bilgiler
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className={cn("flex items-center gap-1 px-2 py-1 rounded-full", wizardStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">2</span>
                      Sorular
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
              </div>

              {/* Step 1: Quiz Info */}
              {wizardStep === 1 && (
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                  <div><label className="block text-sm font-medium mb-1.5">Quiz Başlığı <span className="text-red-500">*</span></label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Örn: Matematik Tarama Testi" /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Açıklama</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Quiz hakkında kısa açıklama..." className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Kademe / Sınıf <span className="text-red-500">*</span></label>
                    <select value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                      <option value="">Kademe Seçin</option>
                      <optgroup label="İlkokul">{GRADE_LEVELS.filter(g => g.category === 'İlkokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                      <optgroup label="Ortaokul">{GRADE_LEVELS.filter(g => g.category === 'Ortaokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                      <optgroup label="Lise">{GRADE_LEVELS.filter(g => g.category === 'Lise').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                      <optgroup label="Sınav Hazırlık">{GRADE_LEVELS.filter(g => g.category === 'Sınav Hazırlık').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                    </select>
                  </div>
                  <div><label className="block text-sm font-medium mb-1.5">Tür</label><select value={formData.exam_type} onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><label className="block text-sm font-medium mb-1.5">Süre (dk)</label><Input type="number" min={5} max={180} value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })} /></div>
                    <div><label className="block text-sm font-medium mb-1.5">Geçme (%)</label><Input type="number" min={0} max={100} value={formData.pass_score} onChange={(e) => setFormData({ ...formData, pass_score: parseInt(e.target.value) || 60 })} /></div>
                    <div><label className="block text-sm font-medium mb-1.5">Max Deneme</label><Input type="number" min={1} max={10} value={formData.max_attempts} onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })} /></div>
                  </div>
                </div>
              )}

              {/* Step 2: Questions */}
              {wizardStep === 2 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Question Navigator */}
                  <div className="p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                      {questions.map((q, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentQuestionIndex(i)}
                          className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all",
                            currentQuestionIndex === i
                              ? "bg-primary text-primary-foreground"
                              : q.question_text.trim()
                                ? "bg-green-100 text-green-700 border border-green-300"
                                : "bg-muted text-muted-foreground border border-border"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={addQuestion}
                        className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm border-2 border-dashed border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {questions.filter(q => q.question_text.trim()).length} / {questions.length} soru tamamlandı
                    </p>
                  </div>

                  {/* Current Question Editor */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {questions[currentQuestionIndex] && (
                      <>
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Soru {currentQuestionIndex + 1}</h3>
                          {questions.length > 1 && (
                            <Button variant="ghost" size="sm" onClick={() => removeQuestion(currentQuestionIndex)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                              <Trash2 className="h-4 w-4 mr-1" /> Soruyu Sil
                            </Button>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1.5">Soru Metni <span className="text-red-500">*</span></label>
                          <textarea
                            value={questions[currentQuestionIndex].question_text}
                            onChange={(e) => updateQuestion(currentQuestionIndex, 'question_text', e.target.value)}
                            placeholder="Sorunuzu buraya yazın..."
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Soru Tipi</label>
                            <select
                              value={questions[currentQuestionIndex].question_type}
                              onChange={(e) => updateQuestion(currentQuestionIndex, 'question_type', e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                              <option value="single_choice">Tek Seçimli</option>
                              <option value="multiple_choice">Çok Seçimli</option>
                              <option value="true_false">Doğru/Yanlış</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1.5">Puan</label>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={questions[currentQuestionIndex].points}
                              onChange={(e) => updateQuestion(currentQuestionIndex, 'points', parseInt(e.target.value) || 10)}
                            />
                          </div>
                        </div>

                        {/* Answers */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium">Cevap Seçenekleri</label>
                            <Button variant="ghost" size="sm" onClick={() => addAnswer(currentQuestionIndex)} className="text-primary">
                              <Plus className="h-4 w-4 mr-1" /> Seçenek Ekle
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {questions[currentQuestionIndex].answers.map((answer, aIdx) => (
                              <div key={aIdx} className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateAnswer(currentQuestionIndex, aIdx, 'is_correct', !answer.is_correct)}
                                  className={cn(
                                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                                    answer.is_correct
                                      ? "bg-green-500 text-white"
                                      : "bg-muted hover:bg-muted/80"
                                  )}
                                >
                                  {answer.is_correct ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                                </button>
                                <Input
                                  value={answer.answer_text}
                                  onChange={(e) => updateAnswer(currentQuestionIndex, aIdx, 'answer_text', e.target.value)}
                                  placeholder={`${String.fromCharCode(65 + aIdx)}) Cevap seçeneği`}
                                  className="flex-1"
                                />
                                {questions[currentQuestionIndex].answers.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeAnswer(currentQuestionIndex, aIdx)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
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
                            <Button onClick={addQuestion} variant="outline" className="text-primary">
                              <ListPlus className="h-4 w-4 mr-1" /> Yeni Soru
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-4 border-t bg-muted/30">
                {wizardStep === 1 ? (
                  <>
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>İptal</Button>
                    <Button onClick={goToStep2} className="gap-2">
                      Sorulara Geç <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setWizardStep(1)}>
                      <ChevronLeft className="h-4 w-4 mr-1" /> Bilgilere Dön
                    </Button>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {questions.filter(q => q.question_text.trim()).length} soru
                      </span>
                      <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="h-4 w-4" />{editingExam ? 'Güncelle' : 'Oluştur'}</>}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
