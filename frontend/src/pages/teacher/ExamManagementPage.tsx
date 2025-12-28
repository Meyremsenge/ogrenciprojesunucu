/**
 * Teacher Exam Management Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Öğretmenler için sınav yönetimi ve oluşturma
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  FileQuestion,
  Clock,
  Calendar,
  Users,
  Edit2,
  Trash2,
  Copy,
  Eye,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  GripVertical,
  X,
  Save,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Shuffle,
  Timer,
  Target,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Question {
  id: number;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Exam {
  id: number;
  title: string;
  description?: string;
  courseId?: number;
  courseName?: string;
  examType: 'quiz' | 'midterm' | 'final' | 'practice' | 'homework';
  status: 'draft' | 'published' | 'closed' | 'archived';
  questions: Question[];
  duration: number; // minutes
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  totalAttempts: number;
  averageScore: number;
  passRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_EXAMS: Exam[] = [
  {
    id: 1,
    title: 'React Hooks Quiz',
    description: 'useState ve useEffect konularından mini sınav',
    courseId: 1,
    courseName: 'React ile Modern Web',
    examType: 'quiz',
    status: 'published',
    questions: [
      { id: 1, text: 'useState hook\'u ne işe yarar?', type: 'multiple_choice', options: ['State yönetimi', 'Side effects', 'Context', 'Routing'], correctAnswer: 0, points: 10, difficulty: 'easy' },
      { id: 2, text: 'useEffect default olarak her renderda çalışır', type: 'true_false', correctAnswer: 'true', points: 5, difficulty: 'easy' },
      { id: 3, text: 'Custom hook isimleri "use" ile başlamalıdır', type: 'true_false', correctAnswer: 'true', points: 5, difficulty: 'medium' },
    ],
    duration: 15,
    passingScore: 60,
    maxAttempts: 3,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResults: true,
    showCorrectAnswers: false,
    startDate: '2025-01-01',
    endDate: '2025-02-01',
    createdAt: '2024-12-20',
    totalAttempts: 45,
    averageScore: 78,
    passRate: 82,
  },
  {
    id: 2,
    title: 'JavaScript Temelleri - Ara Sınav',
    description: 'Değişkenler, fonksiyonlar ve döngüler',
    courseId: 1,
    courseName: 'React ile Modern Web',
    examType: 'midterm',
    status: 'draft',
    questions: [
      { id: 1, text: 'let ve const arasındaki fark nedir?', type: 'short_answer', points: 15, difficulty: 'medium' },
      { id: 2, text: 'Arrow function syntax\'ını açıklayın', type: 'essay', points: 25, difficulty: 'hard' },
    ],
    duration: 60,
    passingScore: 50,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showCorrectAnswers: true,
    createdAt: '2024-12-25',
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
  },
  {
    id: 3,
    title: 'Node.js Final Sınavı',
    description: 'Dönem sonu değerlendirmesi',
    courseId: 2,
    courseName: 'Node.js Backend',
    examType: 'final',
    status: 'closed',
    questions: [],
    duration: 120,
    passingScore: 60,
    maxAttempts: 1,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResults: true,
    showCorrectAnswers: true,
    startDate: '2024-12-15',
    endDate: '2024-12-20',
    createdAt: '2024-12-01',
    totalAttempts: 38,
    averageScore: 72,
    passRate: 76,
  },
];

const EXAM_TYPES = [
  { value: 'quiz', label: 'Quiz', icon: FileQuestion, color: 'bg-blue-500' },
  { value: 'midterm', label: 'Ara Sınav', icon: BookOpen, color: 'bg-purple-500' },
  { value: 'final', label: 'Final', icon: Award, color: 'bg-red-500' },
  { value: 'practice', label: 'Pratik', icon: Target, color: 'bg-green-500' },
  { value: 'homework', label: 'Ödev', icon: FileQuestion, color: 'bg-amber-500' },
];

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Çoktan Seçmeli' },
  { value: 'true_false', label: 'Doğru/Yanlış' },
  { value: 'short_answer', label: 'Kısa Cevap' },
  { value: 'essay', label: 'Uzun Cevap' },
];

const STATUS_CONFIG = {
  draft: { label: 'Taslak', color: 'bg-gray-500', icon: Edit2 },
  published: { label: 'Yayında', color: 'bg-green-500', icon: CheckCircle2 },
  closed: { label: 'Kapalı', color: 'bg-red-500', icon: XCircle },
  archived: { label: 'Arşiv', color: 'bg-slate-500', icon: AlertTriangle },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function ExamManagementPage() {
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [showExamModal, setShowExamModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [expandedExam, setExpandedExam] = useState<number | null>(null);

  // New exam form state
  const [newExam, setNewExam] = useState<Partial<Exam>>({
    examType: 'quiz',
    status: 'draft',
    duration: 30,
    passingScore: 60,
    maxAttempts: 1,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showCorrectAnswers: false,
    questions: [],
  });

  // New question form state
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    type: 'multiple_choice',
    points: 10,
    difficulty: 'medium',
    options: ['', '', '', ''],
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Filters
  // ─────────────────────────────────────────────────────────────────────────────

  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           exam.courseName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
      const matchesType = filterType === 'all' || exam.examType === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [exams, searchQuery, filterStatus, filterType]);

  const stats = useMemo(() => ({
    total: exams.length,
    published: exams.filter(e => e.status === 'published').length,
    draft: exams.filter(e => e.status === 'draft').length,
    totalAttempts: exams.reduce((sum, e) => sum + e.totalAttempts, 0),
    avgPassRate: Math.round(exams.filter(e => e.totalAttempts > 0).reduce((sum, e) => sum + e.passRate, 0) / Math.max(exams.filter(e => e.totalAttempts > 0).length, 1)),
  }), [exams]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleCreateExam = () => {
    setEditingExam(null);
    setNewExam({
      examType: 'quiz',
      status: 'draft',
      duration: 30,
      passingScore: 60,
      maxAttempts: 1,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
      showCorrectAnswers: false,
      questions: [],
    });
    setShowExamModal(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setNewExam(exam);
    setShowExamModal(true);
  };

  const handleSaveExam = () => {
    if (!newExam.title) {
      alert('Lütfen sınav başlığı girin');
      return;
    }

    if (editingExam) {
      setExams(prev => prev.map(e => 
        e.id === editingExam.id ? { ...e, ...newExam } as Exam : e
      ));
    } else {
      const exam: Exam = {
        ...newExam,
        id: Date.now(),
        createdAt: new Date().toISOString().split('T')[0],
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        questions: newExam.questions || [],
      } as Exam;
      setExams(prev => [...prev, exam]);
    }

    setShowExamModal(false);
    setEditingExam(null);
  };

  const handleDeleteExam = (examId: number) => {
    if (confirm('Bu sınavı silmek istediğinize emin misiniz?')) {
      setExams(prev => prev.filter(e => e.id !== examId));
    }
  };

  const handleDuplicateExam = (exam: Exam) => {
    const duplicate: Exam = {
      ...exam,
      id: Date.now(),
      title: `${exam.title} (Kopya)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      totalAttempts: 0,
      averageScore: 0,
      passRate: 0,
    };
    setExams(prev => [...prev, duplicate]);
  };

  const handlePublishExam = (examId: number) => {
    setExams(prev => prev.map(e => 
      e.id === examId ? { ...e, status: 'published' as const } : e
    ));
  };

  const handleCloseExam = (examId: number) => {
    setExams(prev => prev.map(e => 
      e.id === examId ? { ...e, status: 'closed' as const } : e
    ));
  };

  const handleAddQuestion = () => {
    setNewQuestion({
      type: 'multiple_choice',
      points: 10,
      difficulty: 'medium',
      options: ['', '', '', ''],
    });
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = () => {
    if (!newQuestion.text) {
      alert('Lütfen soru metnini girin');
      return;
    }

    const question: Question = {
      ...newQuestion,
      id: Date.now(),
    } as Question;

    setNewExam(prev => ({
      ...prev,
      questions: [...(prev.questions || []), question],
    }));

    setShowQuestionModal(false);
  };

  const handleRemoveQuestion = (questionId: number) => {
    setNewExam(prev => ({
      ...prev,
      questions: (prev.questions || []).filter(q => q.id !== questionId),
    }));
  };

  const getExamTypeInfo = (type: string) => {
    return EXAM_TYPES.find(t => t.value === type) || EXAM_TYPES[0];
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sınav Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            Sınavlarınızı oluşturun, düzenleyin ve yönetin
          </p>
        </div>
        <Button onClick={handleCreateExam} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Sınav Oluştur
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Toplam Sınav', value: stats.total, icon: FileQuestion, color: 'text-blue-500' },
          { label: 'Yayında', value: stats.published, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Taslak', value: stats.draft, icon: Edit2, color: 'text-amber-500' },
          { label: 'Toplam Katılım', value: stats.totalAttempts, icon: Users, color: 'text-purple-500' },
          { label: 'Ort. Başarı', value: `%${stats.avgPassRate}`, icon: Award, color: 'text-emerald-500' },
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-card border rounded-xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', stat.color)}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Sınav ara..."
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="draft">Taslak</option>
          <option value="published">Yayında</option>
          <option value="closed">Kapalı</option>
          <option value="archived">Arşiv</option>
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">Tüm Türler</option>
          {EXAM_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Exam List */}
      <div className="space-y-4">
        {filteredExams.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-xl">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Sınav Bulunamadı</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                ? 'Arama kriterlerine uygun sınav yok'
                : 'Henüz sınav oluşturmadınız'}
            </p>
            <Button onClick={handleCreateExam}>
              <Plus className="h-4 w-4 mr-2" />
              İlk Sınavınızı Oluşturun
            </Button>
          </div>
        ) : (
          filteredExams.map((exam, idx) => {
            const typeInfo = getExamTypeInfo(exam.examType);
            const TypeIcon = typeInfo.icon;
            const statusConfig = STATUS_CONFIG[exam.status];
            const StatusIcon = statusConfig.icon;
            const isExpanded = expandedExam === exam.id;

            return (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-card border rounded-xl overflow-hidden"
              >
                {/* Exam Header */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-3 rounded-xl', typeInfo.color, 'text-white shrink-0')}>
                      <TypeIcon className="h-6 w-6" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{exam.title}</h3>
                          {exam.description && (
                            <p className="text-muted-foreground text-sm mt-1">{exam.description}</p>
                          )}
                          {exam.courseName && (
                            <p className="text-sm text-primary mt-1">
                              <BookOpen className="h-3.5 w-3.5 inline mr-1" />
                              {exam.courseName}
                            </p>
                          )}
                        </div>
                        
                        <div className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white',
                          statusConfig.color
                        )}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {statusConfig.label}
                        </div>
                      </div>

                      {/* Exam Meta */}
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileQuestion className="h-4 w-4" />
                          {exam.questions.length} Soru
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {exam.duration} dk
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-4 w-4" />
                          Geçme: %{exam.passingScore}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {exam.totalAttempts} Katılım
                        </span>
                        {exam.totalAttempts > 0 && (
                          <span className="flex items-center gap-1">
                            <Award className="h-4 w-4" />
                            %{exam.passRate} Başarı
                          </span>
                        )}
                      </div>

                      {/* Date Info */}
                      {(exam.startDate || exam.endDate) && (
                        <div className="flex items-center gap-2 mt-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {exam.startDate && <span>Başlangıç: {new Date(exam.startDate).toLocaleDateString('tr-TR')}</span>}
                          {exam.startDate && exam.endDate && <span>-</span>}
                          {exam.endDate && <span>Bitiş: {new Date(exam.endDate).toLocaleDateString('tr-TR')}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setExpandedExam(isExpanded ? null : exam.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {isExpanded ? 'Gizle' : 'Detaylar'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditExam(exam)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Düzenle
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDuplicateExam(exam)}>
                      <Copy className="h-4 w-4 mr-1" />
                      Kopyala
                    </Button>
                    {exam.status === 'draft' && (
                      <Button size="sm" variant="default" onClick={() => handlePublishExam(exam.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Yayınla
                      </Button>
                    )}
                    {exam.status === 'published' && (
                      <Button size="sm" variant="outline" onClick={() => handleCloseExam(exam.id)}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Kapat
                      </Button>
                    )}
                    {exam.totalAttempts > 0 && (
                      <Button size="sm" variant="outline">
                        <BarChart3 className="h-4 w-4 mr-1" />
                        Sonuçlar
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteExam(exam.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content - Questions Preview */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t bg-muted/30"
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium">Sorular ({exam.questions.length})</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {exam.shuffleQuestions && (
                              <span className="flex items-center gap-1">
                                <Shuffle className="h-4 w-4" />
                                Sorular karıştırılacak
                              </span>
                            )}
                            {exam.shuffleOptions && (
                              <span className="flex items-center gap-1">
                                <Shuffle className="h-4 w-4" />
                                Şıklar karıştırılacak
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {exam.questions.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">Henüz soru eklenmemiş</p>
                        ) : (
                          <div className="space-y-2">
                            {exam.questions.map((question, qIdx) => (
                              <div 
                                key={question.id}
                                className="flex items-center gap-3 p-3 bg-background rounded-lg"
                              >
                                <span className="text-sm text-muted-foreground w-6">{qIdx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{question.text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs px-2 py-0.5 bg-muted rounded">
                                      {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{question.points} puan</span>
                                    <span className={cn(
                                      'text-xs px-2 py-0.5 rounded',
                                      question.difficulty === 'easy' && 'bg-green-100 text-green-700',
                                      question.difficulty === 'medium' && 'bg-amber-100 text-amber-700',
                                      question.difficulty === 'hard' && 'bg-red-100 text-red-700',
                                    )}>
                                      {question.difficulty === 'easy' ? 'Kolay' : question.difficulty === 'medium' ? 'Orta' : 'Zor'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Settings Summary */}
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Maks. Deneme:</span>
                            <span className="ml-2 font-medium">{exam.maxAttempts}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sonuç Göster:</span>
                            <span className="ml-2 font-medium">{exam.showResults ? 'Evet' : 'Hayır'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Doğru Cevaplar:</span>
                            <span className="ml-2 font-medium">{exam.showCorrectAnswers ? 'Göster' : 'Gizle'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Toplam Puan:</span>
                            <span className="ml-2 font-medium">{exam.questions.reduce((sum, q) => sum + q.points, 0)}</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create/Edit Exam Modal */}
      <AnimatePresence>
        {showExamModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExamModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    {editingExam ? 'Sınavı Düzenle' : 'Yeni Sınav Oluştur'}
                  </h2>
                  <button
                    onClick={() => setShowExamModal(false)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Exam Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Sınav Türü</label>
                    <div className="grid grid-cols-5 gap-2">
                      {EXAM_TYPES.map(type => {
                        const TypeIcon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setNewExam(prev => ({ ...prev, examType: type.value as Exam['examType'] }))}
                            className={cn(
                              'flex flex-col items-center gap-1 p-3 rounded-lg border transition-all',
                              newExam.examType === type.value 
                                ? 'border-primary bg-primary/10' 
                                : 'hover:bg-muted'
                            )}
                          >
                            <div className={cn('p-2 rounded-lg', type.color, 'text-white')}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <span className="text-xs">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Sınav Başlığı *</label>
                      <Input
                        value={newExam.title || ''}
                        onChange={e => setNewExam(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ör: React Hooks Quiz"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Açıklama</label>
                      <textarea
                        value={newExam.description || ''}
                        onChange={e => setNewExam(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Sınav hakkında kısa açıklama"
                        className="w-full px-3 py-2 border rounded-lg bg-background resize-none h-20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">İlişkili Kurs</label>
                      <select
                        value={newExam.courseName || ''}
                        onChange={e => setNewExam(prev => ({ ...prev, courseName: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="">Kurs seçin (isteğe bağlı)</option>
                        <option value="React ile Modern Web">React ile Modern Web</option>
                        <option value="Node.js Backend">Node.js Backend</option>
                        <option value="Python ile Veri Bilimi">Python ile Veri Bilimi</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Süre (dakika) *</label>
                      <Input
                        type="number"
                        min={1}
                        value={newExam.duration || 30}
                        onChange={e => setNewExam(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  {/* Scoring */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Geçme Notu (%)</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={newExam.passingScore || 60}
                        onChange={e => setNewExam(prev => ({ ...prev, passingScore: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Maks. Deneme Hakkı</label>
                      <Input
                        type="number"
                        min={1}
                        value={newExam.maxAttempts || 1}
                        onChange={e => setNewExam(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Başlangıç Tarihi</label>
                      <Input
                        type="date"
                        value={newExam.startDate || ''}
                        onChange={e => setNewExam(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Bitiş Tarihi</label>
                      <Input
                        type="date"
                        value={newExam.endDate || ''}
                        onChange={e => setNewExam(prev => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">Sınav Ayarları</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'shuffleQuestions', label: 'Soruları Karıştır' },
                        { key: 'shuffleOptions', label: 'Şıkları Karıştır' },
                        { key: 'showResults', label: 'Sonuçları Göster' },
                        { key: 'showCorrectAnswers', label: 'Doğru Cevapları Göster' },
                      ].map(option => (
                        <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(newExam as any)[option.key] || false}
                            onChange={e => setNewExam(prev => ({ ...prev, [option.key]: e.target.checked }))}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Questions Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Sorular ({(newExam.questions || []).length})</h3>
                      <Button size="sm" variant="outline" onClick={handleAddQuestion}>
                        <Plus className="h-4 w-4 mr-1" />
                        Soru Ekle
                      </Button>
                    </div>

                    {(newExam.questions || []).length === 0 ? (
                      <p className="text-muted-foreground text-center py-8 border-2 border-dashed rounded-lg">
                        Henüz soru eklenmedi. "Soru Ekle" butonuna tıklayarak başlayın.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(newExam.questions || []).map((question, idx) => (
                          <div 
                            key={question.id}
                            className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                          >
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                            <span className="text-sm font-medium w-6">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{question.text}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs px-2 py-0.5 bg-background rounded">
                                  {QUESTION_TYPES.find(t => t.value === question.type)?.label}
                                </span>
                                <span className="text-xs text-muted-foreground">{question.points} puan</span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveQuestion(question.id)}
                              className="p-1.5 hover:bg-destructive/10 text-destructive rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowExamModal(false)}
                  >
                    İptal
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSaveExam}>
                    <Save className="h-4 w-4" />
                    {editingExam ? 'Güncelle' : 'Oluştur'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Question Modal */}
      <AnimatePresence>
        {showQuestionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
            onClick={() => setShowQuestionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-card rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">Soru Ekle</h2>
                  <button
                    onClick={() => setShowQuestionModal(false)}
                    className="p-2 hover:bg-muted rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Question Type */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Soru Türü</label>
                    <select
                      value={newQuestion.type}
                      onChange={e => setNewQuestion(prev => ({ 
                        ...prev, 
                        type: e.target.value as Question['type'],
                        options: e.target.value === 'multiple_choice' ? ['', '', '', ''] : undefined
                      }))}
                      className="w-full px-3 py-2 border rounded-lg bg-background"
                    >
                      {QUESTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Soru Metni *</label>
                    <textarea
                      value={newQuestion.text || ''}
                      onChange={e => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Sorunuzu yazın..."
                      className="w-full px-3 py-2 border rounded-lg bg-background resize-none h-24"
                    />
                  </div>

                  {/* Multiple Choice Options */}
                  {newQuestion.type === 'multiple_choice' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Seçenekler</label>
                      <div className="space-y-2">
                        {(newQuestion.options || []).map((option, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correctAnswer"
                              checked={newQuestion.correctAnswer === idx}
                              onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: idx }))}
                              className="w-4 h-4"
                            />
                            <Input
                              value={option}
                              onChange={e => {
                                const newOptions = [...(newQuestion.options || [])];
                                newOptions[idx] = e.target.value;
                                setNewQuestion(prev => ({ ...prev, options: newOptions }));
                              }}
                              placeholder={`Seçenek ${String.fromCharCode(65 + idx)}`}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Doğru cevabı seçmek için radio butonuna tıklayın
                      </p>
                    </div>
                  )}

                  {/* True/False */}
                  {newQuestion.type === 'true_false' && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Doğru Cevap</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={newQuestion.correctAnswer === 'true'}
                            onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: 'true' }))}
                            className="w-4 h-4"
                          />
                          <span>Doğru</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="tfAnswer"
                            checked={newQuestion.correctAnswer === 'false'}
                            onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: 'false' }))}
                            className="w-4 h-4"
                          />
                          <span>Yanlış</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Points & Difficulty */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Puan</label>
                      <Input
                        type="number"
                        min={1}
                        value={newQuestion.points || 10}
                        onChange={e => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Zorluk</label>
                      <select
                        value={newQuestion.difficulty}
                        onChange={e => setNewQuestion(prev => ({ ...prev, difficulty: e.target.value as Question['difficulty'] }))}
                        className="w-full px-3 py-2 border rounded-lg bg-background"
                      >
                        <option value="easy">Kolay</option>
                        <option value="medium">Orta</option>
                        <option value="hard">Zor</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6 pt-6 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowQuestionModal(false)}
                  >
                    İptal
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handleSaveQuestion}>
                    <Plus className="h-4 w-4" />
                    Soruyu Ekle
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
