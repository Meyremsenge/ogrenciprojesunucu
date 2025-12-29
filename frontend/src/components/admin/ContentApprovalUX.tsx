/**
 * Content Approval UX Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * İÇERİK ONAY AKIŞI TASARIM PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🎯 HATA YAPMA RİSKİNİ MİNİMİZE ETME:
 *    1. NET DURUM GÖSTERİMİ
 *       - Renk kodlu durum kartları
 *       - İlerleme çubukları
 *       - Bekleyen işlem sayacı
 * 
 *    2. ÖN İZLEME ZORUNLULUĞU
 *       - Onaylamadan önce içerik önizlemesi zorunlu
 *       - "Hızlı onay" yerine "İnceleyerek onayla"
 *       - Kontrol listesi (checklist)
 * 
 *    3. RED GEREKÇESI ZORUNLULUĞU
 *       - Red sebebi seçimi zorunlu
 *       - Açıklama alanı
 *       - Öğretmene geri bildirim
 * 
 *    4. ONAY ADIMLARI
 *       - İçerik inceleme → Teknik kontrol → Son onay
 *       - Her adım için farklı yetki
 *       - İşlem geçmişi
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Video,
  FileText,
  HelpCircle,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Play,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ChevronDown,
  User,
  Calendar,
  Tag,
  ArrowRight,
  RotateCcw,
  Send,
  CheckCheck,
  AlertCircle,
  FileCheck,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 ONAY BEKLEYEN İÇERİK SAYAÇLARI
// ═══════════════════════════════════════════════════════════════════════════════

interface ApprovalStats {
  pending: number;
  inReview: number;
  approved: number;
  rejected: number;
}

interface ApprovalStatsBarProps {
  stats: ApprovalStats;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const ApprovalStatsBar: React.FC<ApprovalStatsBarProps> = ({
  stats,
  activeFilter,
  onFilterChange,
}) => {
  const filters = [
    { key: 'pending', label: 'Bekliyor', count: stats.pending, color: 'bg-amber-500', hoverBg: 'hover:bg-amber-50' },
    { key: 'inReview', label: 'İnceleniyor', count: stats.inReview, color: 'bg-blue-500', hoverBg: 'hover:bg-blue-50' },
    { key: 'approved', label: 'Onaylandı', count: stats.approved, color: 'bg-green-500', hoverBg: 'hover:bg-green-50' },
    { key: 'rejected', label: 'Reddedildi', count: stats.rejected, color: 'bg-red-500', hoverBg: 'hover:bg-red-50' },
  ];

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-background border rounded-xl p-4">
      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden flex mb-4">
        {filters.map((filter) => (
          <motion.div
            key={filter.key}
            initial={{ width: 0 }}
            animate={{ width: `${(filter.count / total) * 100}%` }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={cn("h-full", filter.color)}
          />
        ))}
      </div>

      {/* Filter Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className={cn(
              "p-3 rounded-lg border transition-all text-left",
              activeFilter === filter.key
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : `border-transparent ${filter.hoverBg}`
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("w-2 h-2 rounded-full", filter.color)} />
              <span className="text-sm text-muted-foreground">{filter.label}</span>
            </div>
            <div className="text-2xl font-bold">{filter.count}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📝 İÇERİK ONAY KARTI
// ═══════════════════════════════════════════════════════════════════════════════

interface ContentItem {
  id: string;
  title: string;
  type: 'course' | 'video' | 'document' | 'quiz';
  author: {
    name: string;
    avatar?: string;
  };
  submittedAt: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high';
  category: string;
  thumbnail?: string;
  reviewProgress?: number;
}

interface ContentApprovalCardProps {
  content: ContentItem;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
  onStartReview: () => void;
}

const typeConfig = {
  course: { icon: BookOpen, label: 'Kurs', color: 'bg-purple-100 text-purple-700' },
  video: { icon: Video, label: 'Video', color: 'bg-blue-100 text-blue-700' },
  document: { icon: FileText, label: 'Doküman', color: 'bg-green-100 text-green-700' },
  quiz: { icon: HelpCircle, label: 'Sınav', color: 'bg-orange-100 text-orange-700' },
};

const priorityConfig = {
  low: { label: 'Düşük', color: 'text-gray-500 bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-100' },
  high: { label: 'Yüksek', color: 'text-red-600 bg-red-100' },
};

export const ContentApprovalCard: React.FC<ContentApprovalCardProps> = ({
  content,
  onPreview,
  onApprove,
  onReject,
  onStartReview,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const type = typeConfig[content.type];
  const priority = priorityConfig[content.priority];
  const TypeIcon = type.icon;

  return (
    <motion.div
      layout
      className="border rounded-xl overflow-hidden bg-background hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
            {content.thumbnail ? (
              <img src={content.thumbnail} alt={content.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TypeIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* İçerik Bilgileri */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", type.color)}>
                    {type.label}
                  </span>
                  {content.priority === 'high' && (
                    <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", priority.color)}>
                      Öncelikli
                    </span>
                  )}
                </div>
                <h3 className="font-medium truncate">{content.title}</h3>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {content.author.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {content.submittedAt}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {content.category}
              </span>
            </div>

            {/* İnceleme İlerlemesi */}
            {content.status === 'in_review' && content.reviewProgress !== undefined && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">İnceleme ilerlemesi</span>
                  <span className="font-medium">{content.reviewProgress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${content.reviewProgress}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Aksiyonlar */}
          <div className="flex flex-col gap-2">
            <button
              onClick={onPreview}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
            >
              <Eye className="w-4 h-4" />
              Önizle
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
            </button>
          </div>
        </div>
      </div>

      {/* Genişletilmiş Aksiyonlar */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t"
          >
            <div className="p-4 bg-muted/30">
              <div className="flex items-center justify-between gap-4">
                {content.status === 'pending' ? (
                  <button
                    onClick={onStartReview}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    İncelemeye Başla
                  </button>
                ) : content.status === 'in_review' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={onReject}
                      className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      Reddet
                    </button>
                    <button
                      onClick={onApprove}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      Onayla
                    </button>
                  </div>
                ) : null}

                <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <History className="w-4 h-4" />
                  Geçmişi Gör
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ İNCELEME KONTROL LİSTESİ
// ═══════════════════════════════════════════════════════════════════════════════

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
}

interface ReviewChecklistProps {
  items: ChecklistItem[];
  checkedItems: string[];
  onItemToggle: (id: string) => void;
  onComplete: () => void;
}

export const ReviewChecklist: React.FC<ReviewChecklistProps> = ({
  items,
  checkedItems,
  onItemToggle,
  onComplete,
}) => {
  const requiredItems = items.filter(i => i.required);
  const allRequiredChecked = requiredItems.every(i => checkedItems.includes(i.id));
  const progress = (checkedItems.length / items.length) * 100;

  return (
    <div className="bg-background border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-primary" />
          İnceleme Kontrol Listesi
        </h3>
        <span className="text-sm text-muted-foreground">
          {checkedItems.length} / {items.length} tamamlandı
        </span>
      </div>

      {/* Progress */}
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className={cn(
            "h-full rounded-full transition-colors",
            progress === 100 ? "bg-green-500" : "bg-primary"
          )}
        />
      </div>

      {/* Checklist Items */}
      <div className="space-y-2 mb-4">
        {items.map((item) => {
          const isChecked = checkedItems.includes(item.id);
          return (
            <label
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                isChecked ? "bg-green-50 border-green-200" : "hover:bg-muted/50"
              )}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onItemToggle(item.id)}
                className="w-4 h-4 mt-0.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium", isChecked && "line-through text-muted-foreground")}>
                    {item.label}
                  </span>
                  {item.required && (
                    <span className="text-xs text-red-500">*Zorunlu</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
              {isChecked && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
            </label>
          );
        })}
      </div>

      {/* Complete Button */}
      <button
        onClick={onComplete}
        disabled={!allRequiredChecked}
        className={cn(
          "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
          allRequiredChecked
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        )}
      >
        {allRequiredChecked ? (
          <>
            <CheckCheck className="w-5 h-5" />
            İncelemeyi Tamamla
          </>
        ) : (
          <>
            <AlertCircle className="w-5 h-5" />
            Zorunlu maddeleri tamamlayın
          </>
        )}
      </button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ❌ RED GEREKÇESI MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, details: string) => void;
  contentTitle: string;
}

const rejectionReasons = [
  { id: 'quality', label: 'İçerik kalitesi yetersiz', icon: AlertTriangle },
  { id: 'incomplete', label: 'Eksik içerik', icon: FileText },
  { id: 'policy', label: 'Politika ihlali', icon: XCircle },
  { id: 'copyright', label: 'Telif hakkı sorunu', icon: AlertCircle },
  { id: 'technical', label: 'Teknik sorunlar', icon: AlertCircle },
  { id: 'other', label: 'Diğer', icon: MessageSquare },
];

export const RejectionModal: React.FC<RejectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contentTitle,
}) => {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const handleConfirm = () => {
    if (selectedReason) {
      const reasonLabel = rejectionReasons.find(r => r.id === selectedReason)?.label || '';
      onConfirm(reasonLabel, details);
      setSelectedReason(null);
      setDetails('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-background rounded-xl shadow-xl p-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">İçeriği Reddet</h2>
            <p className="text-sm text-muted-foreground truncate max-w-sm">{contentTitle}</p>
          </div>
        </div>

        {/* Uyarı */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Red sebebi içerik sahibine bildirilecektir. 
              Yapıcı geri bildirim vermek içeriğin geliştirilmesine yardımcı olur.
            </p>
          </div>
        </div>

        {/* Red Sebepleri */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Red Sebebi *</label>
          <div className="grid grid-cols-2 gap-2">
            {rejectionReasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all flex items-center gap-2",
                    selectedReason === reason.id
                      ? "border-red-500 bg-red-50"
                      : "border-muted hover:border-muted-foreground/30"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    selectedReason === reason.id ? "text-red-600" : "text-muted-foreground"
                  )} />
                  <span className="text-sm">{reason.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detay */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Açıklama {selectedReason === 'other' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="İçerik sahibine iletilecek geri bildiriminizi yazın..."
            className="w-full h-24 px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Bu mesaj içerik sahibine e-posta ile gönderilecektir.
          </p>
        </div>

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedReason || (selectedReason === 'other' && !details.trim())}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
              selectedReason && (selectedReason !== 'other' || details.trim())
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <Send className="w-4 h-4" />
            Reddet ve Bildir
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ ONAY MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { publishNow: boolean; notifyAuthor: boolean; featured: boolean }) => void;
  contentTitle: string;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  contentTitle,
}) => {
  const [publishNow, setPublishNow] = useState(true);
  const [notifyAuthor, setNotifyAuthor] = useState(true);
  const [featured, setFeatured] = useState(false);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-background rounded-xl shadow-xl p-6"
      >
        {/* Kutlama İkonu */}
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <CheckCircle className="w-8 h-8 text-green-600" />
          </motion.div>
        </div>

        <h2 className="text-xl font-semibold text-center mb-2">İçeriği Onayla</h2>
        <p className="text-center text-muted-foreground mb-4 truncate">{contentTitle}</p>

        {/* Seçenekler */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <span className="font-medium">Hemen yayınla</span>
              <p className="text-sm text-muted-foreground">İçerik anında görünür olacak</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={notifyAuthor}
              onChange={(e) => setNotifyAuthor(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <span className="font-medium">Yazara bildir</span>
              <p className="text-sm text-muted-foreground">E-posta ile onay bildirimi gönder</p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <div>
              <span className="font-medium">Öne çıkar</span>
              <p className="text-sm text-muted-foreground">Ana sayfada göster</p>
            </div>
          </label>
        </div>

        {/* Butonlar */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm({ publishNow, notifyAuthor, featured })}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <ThumbsUp className="w-4 h-4" />
            Onayla
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📜 ONAY GEÇMİŞİ
// ═══════════════════════════════════════════════════════════════════════════════

interface ApprovalHistoryItem {
  id: string;
  action: 'submitted' | 'review_started' | 'approved' | 'rejected' | 'revision_requested';
  actor: string;
  timestamp: string;
  comment?: string;
}

interface ApprovalHistoryProps {
  history: ApprovalHistoryItem[];
}

const actionConfig = {
  submitted: { label: 'Gönderildi', icon: Send, color: 'text-blue-600 bg-blue-100' },
  review_started: { label: 'İnceleme başladı', icon: Eye, color: 'text-purple-600 bg-purple-100' },
  approved: { label: 'Onaylandı', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  rejected: { label: 'Reddedildi', icon: XCircle, color: 'text-red-600 bg-red-100' },
  revision_requested: { label: 'Revizyon istendi', icon: RotateCcw, color: 'text-amber-600 bg-amber-100' },
};

export const ApprovalHistory: React.FC<ApprovalHistoryProps> = ({ history }) => {
  return (
    <div className="bg-background border rounded-xl p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Onay Geçmişi
      </h3>

      <div className="space-y-4">
        {history.map((item, index) => {
          const config = actionConfig[item.action];
          const Icon = config.icon;
          const isLast = index === history.length - 1;

          return (
            <div key={item.id} className="flex gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                {!isLast && <div className="w-0.5 flex-1 bg-muted mt-1" />}
              </div>

              {/* İçerik */}
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                </div>
                <p className="text-sm text-muted-foreground">{item.actor}</p>
                {item.comment && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                    "{item.comment}"
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔔 ONAY BİLDİRİM PANELİ
// ═══════════════════════════════════════════════════════════════════════════════

interface PendingApprovalAlertProps {
  count: number;
  urgentCount: number;
  oldestDays: number;
  onViewAll: () => void;
}

export const PendingApprovalAlert: React.FC<PendingApprovalAlertProps> = ({
  count,
  urgentCount,
  oldestDays,
  onViewAll,
}) => {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border flex items-center justify-between",
        urgentCount > 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          urgentCount > 0 ? "bg-red-100" : "bg-amber-100"
        )}>
          <Clock className={cn("w-5 h-5", urgentCount > 0 ? "text-red-600" : "text-amber-600")} />
        </div>
        <div>
          <h4 className="font-medium">
            {count} içerik onay bekliyor
            {urgentCount > 0 && (
              <span className="ml-2 text-red-600">({urgentCount} acil)</span>
            )}
          </h4>
          <p className="text-sm text-muted-foreground">
            En eski içerik {oldestDays} gündür bekliyor
          </p>
        </div>
      </div>

      <button
        onClick={onViewAll}
        className={
          urgentCount > 0 
            ? "px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white bg-red-600 hover:bg-red-700"
            : "px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-white bg-amber-600 hover:bg-amber-700"
        }
      >
        İncele
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
};
