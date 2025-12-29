/**
 * Quiz/Sinav Yonetimi Sayfasi - Yalinlastirilmis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, FileQuestion, Clock, Users, Edit2, Trash2,
  Copy, MoreVertical, GraduationCap, Target, X, Save,
  Loader2, PlayCircle, Pause,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/services/api';

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
  { value: '1', label: '1. Sinif', category: 'Ilkokul' },
  { value: '2', label: '2. Sinif', category: 'Ilkokul' },
  { value: '3', label: '3. Sinif', category: 'Ilkokul' },
  { value: '4', label: '4. Sinif', category: 'Ilkokul' },
  { value: '5', label: '5. Sinif', category: 'Ortaokul' },
  { value: '6', label: '6. Sinif', category: 'Ortaokul' },
  { value: '7', label: '7. Sinif', category: 'Ortaokul' },
  { value: '8', label: '8. Sinif', category: 'Ortaokul' },
  { value: '9', label: '9. Sinif', category: 'Lise' },
  { value: '10', label: '10. Sinif', category: 'Lise' },
  { value: '11', label: '11. Sinif', category: 'Lise' },
  { value: '12', label: '12. Sinif', category: 'Lise' },
  { value: 'mezun', label: 'Mezun', category: 'Sinav Hazirlik' },
  { value: 'tyt', label: 'TYT', category: 'Sinav Hazirlik' },
  { value: 'ayt', label: 'AYT', category: 'Sinav Hazirlik' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Taslak', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  published: { label: 'Yayinda', color: 'text-green-600', bgColor: 'bg-green-100' },
  closed: { label: 'Kapali', color: 'text-red-600', bgColor: 'bg-red-100' },
  archived: { label: 'Arsiv', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

const EXAM_TYPES = [
  { value: 'quiz', label: 'Quiz' },
  { value: 'midterm', label: 'Ara Sinav' },
  { value: 'final', label: 'Final' },
  { value: 'practice', label: 'Pratik' },
  { value: 'homework', label: 'Odev' },
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
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exam_type: 'quiz',
    grade_level: '',
    duration_minutes: 30,
    pass_score: 60,
    max_attempts: 1,
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
      console.error('Sinavlar yuklenirken hata:', error);
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
    setShowCreateModal(true);
  };

  const handleEdit = (exam: Exam) => {
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
    setShowCreateModal(true);
    setOpenMenuId(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { alert('Lutfen quiz basligi girin'); return; }
    if (!formData.grade_level) { alert('Lutfen kademe/sinif secin'); return; }
    try {
      setSaving(true);
      if (editingExam) {
        await api.put(`/exams/${editingExam.id}`, formData);
      } else {
        await api.post('/exams', formData);
      }
      setShowCreateModal(false);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Bir hata olustu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`"${exam.title}" quizini silmek istediginize emin misiniz?`)) return;
    try {
      await api.delete(`/exams/${exam.id}`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Silme islemi basarisiz');
    }
    setOpenMenuId(null);
  };

  const handlePublish = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/publish`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Yayimlama basarisiz');
    }
    setOpenMenuId(null);
  };

  const handleUnpublish = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/unpublish`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Yayindan kaldirma basarisiz');
    }
    setOpenMenuId(null);
  };

  const handleDuplicate = async (exam: Exam) => {
    try {
      await api.post(`/exams/${exam.id}/duplicate`);
      fetchExams();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      alert(err.response?.data?.message || 'Kopyalama basarisiz');
    }
    setOpenMenuId(null);
  };

  const getGradeLabel = (value?: string) => {
    if (!value) return '-';
    const grade = GRADE_LEVELS.find(g => g.value === value);
    return grade ? grade.label : value;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileQuestion className="h-7 w-7 text-primary" />
            Quiz Yonetimi
          </h1>
          <p className="text-muted-foreground mt-1">Quiz olusturun, duzenleyin ve yonetin</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Yeni Quiz Olustur
        </Button>
      </div>

      <div className="bg-card border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Quiz ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Tum Kademeler</option>
            <optgroup label="Ilkokul">{GRADE_LEVELS.filter(g => g.category === 'Ilkokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Ortaokul">{GRADE_LEVELS.filter(g => g.category === 'Ortaokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Lise">{GRADE_LEVELS.filter(g => g.category === 'Lise').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
            <optgroup label="Sinav Hazirlik">{GRADE_LEVELS.filter(g => g.category === 'Sinav Hazirlik').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="all">Tum Durumlar</option>
            <option value="draft">Taslak</option>
            <option value="published">Yayinda</option>
            <option value="closed">Kapali</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : exams.length === 0 ? (
        <div className="bg-card border rounded-xl p-12 text-center">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Henuz quiz yok</h3>
          <p className="text-muted-foreground mb-4">Ilk quizinizi olusturarak baslayin</p>
          <Button onClick={handleCreateNew} className="gap-2"><Plus className="h-4 w-4" />Quiz Olustur</Button>
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
                            <button onClick={() => handleEdit(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"><Edit2 className="h-4 w-4" /> Duzenle</button>
                            <button onClick={() => handleDuplicate(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"><Copy className="h-4 w-4" /> Kopyala</button>
                            <div className="border-t my-1" />
                            {exam.status === 'draft' ? (
                              <button onClick={() => handlePublish(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-green-600"><PlayCircle className="h-4 w-4" /> Yayimla</button>
                            ) : exam.status === 'published' ? (
                              <button onClick={() => handleUnpublish(exam)} className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 text-orange-600"><Pause className="h-4 w-4" /> Yayindan Kaldir</button>
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
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target className="h-3.5 w-3.5" /><span>Hedef: %{exam.pass_score} basari</span></div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-background rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{editingExam ? 'Quiz Duzenle' : 'Yeni Quiz Olustur'}</h2>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-4 space-y-4">
                <div><label className="block text-sm font-medium mb-1.5">Quiz Basligi <span className="text-red-500">*</span></label><Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Orn: Matematik Tarama Testi" /></div>
                <div><label className="block text-sm font-medium mb-1.5">Aciklama</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Quiz hakkinda kisa aciklama..." className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Kademe / Sinif <span className="text-red-500">*</span></label>
                  <select value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Kademe Secin</option>
                    <optgroup label="Ilkokul">{GRADE_LEVELS.filter(g => g.category === 'Ilkokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                    <optgroup label="Ortaokul">{GRADE_LEVELS.filter(g => g.category === 'Ortaokul').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                    <optgroup label="Lise">{GRADE_LEVELS.filter(g => g.category === 'Lise').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                    <optgroup label="Sinav Hazirlik">{GRADE_LEVELS.filter(g => g.category === 'Sinav Hazirlik').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</optgroup>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">Quiz sadece secili kademe ogrencilerine gosterilecek</p>
                </div>
                <div><label className="block text-sm font-medium mb-1.5">Tur</label><select value={formData.exam_type} onChange={(e) => setFormData({ ...formData, exam_type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{EXAM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block text-sm font-medium mb-1.5">Sure (dk)</label><Input type="number" min={5} max={180} value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Gecme (%)</label><Input type="number" min={0} max={100} value={formData.pass_score} onChange={(e) => setFormData({ ...formData, pass_score: parseInt(e.target.value) || 60 })} /></div>
                  <div><label className="block text-sm font-medium mb-1.5">Max Deneme</label><Input type="number" min={1} max={10} value={formData.max_attempts} onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })} /></div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 p-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Iptal</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">{saving ? <><Loader2 className="h-4 w-4 animate-spin" />Kaydediliyor...</> : <><Save className="h-4 w-4" />{editingExam ? 'Guncelle' : 'Olustur'}</>}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}