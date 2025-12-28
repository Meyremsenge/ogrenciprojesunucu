/**
 * Package Assignment UX Components
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * PAKET ATAMA TASARIM PRENSİPLERİ:
 * ─────────────────────────────────────────────────────────────────────────────────
 * 
 * 🛡️ HATA YAPMA RİSKİNİ MİNİMİZE ETME:
 *    1. NET PAKET KARŞILAŞTIRMASI
 *       - Mevcut vs yeni paket yan yana gösterim
 *       - Değişen özellikler vurgulanır
 *       - Fiyat farkı açıkça belirtilir
 * 
 *    2. TOPLU ATAMA GÜVENLİĞİ
 *       - Etkilenecek kullanıcı sayısı gösterilir
 *       - Önizleme listesi
 *       - Geri alma süresi (24 saat)
 * 
 *    3. ÖDEMe BİLGİSİ
 *       - Pro-rata hesaplama açıklaması
 *       - Fatura önizlemesi
 *       - Ödeme geçmişi erişimi
 * 
 *    4. DOWNGRADE UYARILARI
 *       - Kaybedilecek özellikler listesi
 *       - Mevcut kullanım verisi (kotalar)
 *       - Alternatif öneriler
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Users,
  User,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  Clock,
  Zap,
  Crown,
  Star,
  Gift,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  History,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// 📦 PAKET KARTI
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface PackageData {
  id: string;
  name: string;
  tier: 'free' | 'basic' | 'pro' | 'enterprise';
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: PackageFeature[];
  userCount?: number;
  color: string;
}

interface PackageCardProps {
  package: PackageData;
  isSelected?: boolean;
  isCurrentPackage?: boolean;
  onSelect?: () => void;
  showUserCount?: boolean;
}

const tierConfig = {
  free: { icon: Gift, label: 'Ücretsiz', gradient: 'from-gray-400 to-gray-500' },
  basic: { icon: Star, label: 'Temel', gradient: 'from-blue-400 to-blue-600' },
  pro: { icon: Zap, label: 'Pro', gradient: 'from-purple-400 to-purple-600' },
  enterprise: { icon: Crown, label: 'Kurumsal', gradient: 'from-amber-400 to-amber-600' },
};

export const PackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
  isSelected = false,
  isCurrentPackage = false,
  onSelect,
  showUserCount = false,
}) => {
  const tier = tierConfig[pkg.tier];
  const TierIcon = tier.icon;

  return (
    <motion.div
      layout
      onClick={onSelect}
      className={cn(
        "relative p-6 rounded-xl border-2 transition-all cursor-pointer",
        isSelected && "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20",
        isCurrentPackage && !isSelected && "border-green-500 bg-green-50/50",
        !isSelected && !isCurrentPackage && "border-muted hover:border-muted-foreground/30"
      )}
    >
      {/* Mevcut Paket Badge */}
      {isCurrentPackage && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded">
          Mevcut Paket
        </div>
      )}

      {/* Seçili Badge */}
      {isSelected && !isCurrentPackage && (
        <div className="absolute -top-3 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded">
          Seçildi
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-medium mb-2",
            `bg-gradient-to-r ${tier.gradient}`
          )}>
            <TierIcon className="w-3 h-3" />
            {tier.label}
          </div>
          <h3 className="text-xl font-bold">{pkg.name}</h3>
        </div>
        {onSelect && (
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
          )}>
            {isSelected && <Check className="w-4 h-4 text-primary-foreground" />}
          </div>
        )}
      </div>

      {/* Fiyat */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">₺{pkg.price}</span>
          <span className="text-muted-foreground">/{pkg.billingCycle === 'monthly' ? 'ay' : 'yıl'}</span>
        </div>
        {pkg.billingCycle === 'yearly' && (
          <p className="text-sm text-green-600 mt-1">Aylık ₺{Math.round(pkg.price / 12)} - 2 ay tasarruf</p>
        )}
      </div>

      {/* Özellikler */}
      <div className="space-y-2 mb-4">
        {pkg.features.slice(0, 5).map((feature, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            {feature.included ? (
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(!feature.included && "text-muted-foreground")}>
              {feature.name}
              {feature.limit && <span className="text-muted-foreground"> ({feature.limit})</span>}
            </span>
          </div>
        ))}
      </div>

      {/* Kullanıcı Sayısı */}
      {showUserCount && pkg.userCount !== undefined && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{pkg.userCount.toLocaleString()} kullanıcı</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ⚖️ PAKET KARŞILAŞTIRMA
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageComparisonProps {
  currentPackage: PackageData;
  newPackage: PackageData;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PackageComparison: React.FC<PackageComparisonProps> = ({
  currentPackage,
  newPackage,
  onConfirm,
  onCancel,
}) => {
  const isUpgrade = tierConfig[newPackage.tier].label > tierConfig[currentPackage.tier].label;
  const priceDiff = newPackage.price - currentPackage.price;

  // Değişen özellikleri bul
  const featureChanges = newPackage.features.map((newFeature) => {
    const currentFeature = currentPackage.features.find(f => f.name === newFeature.name);
    return {
      name: newFeature.name,
      current: currentFeature?.included ?? false,
      new: newFeature.included,
      currentLimit: currentFeature?.limit,
      newLimit: newFeature.limit,
      changed: currentFeature?.included !== newFeature.included || currentFeature?.limit !== newFeature.limit,
    };
  });

  const gainedFeatures = featureChanges.filter(f => !f.current && f.new);
  const lostFeatures = featureChanges.filter(f => f.current && !f.new);

  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        Paket Değişikliği
      </h3>

      {/* Karşılaştırma */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Mevcut Paket */}
        <div className="p-4 border rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground mb-1">Mevcut</div>
          <div className="font-semibold">{currentPackage.name}</div>
          <div className="text-lg font-bold mt-1">₺{currentPackage.price}/ay</div>
        </div>

        {/* Ok */}
        <div className="flex items-center justify-center">
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            isUpgrade ? "bg-green-100" : "bg-amber-100"
          )}>
            <ArrowRight className={cn(
              "w-6 h-6",
              isUpgrade ? "text-green-600" : "text-amber-600"
            )} />
          </div>
        </div>

        {/* Yeni Paket */}
        <div className={cn(
          "p-4 border-2 rounded-lg",
          isUpgrade ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"
        )}>
          <div className="text-sm text-muted-foreground mb-1">Yeni</div>
          <div className="font-semibold">{newPackage.name}</div>
          <div className="text-lg font-bold mt-1">₺{newPackage.price}/ay</div>
        </div>
      </div>

      {/* Fiyat Farkı */}
      <div className={cn(
        "p-4 rounded-lg mb-6 border",
        priceDiff > 0 ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center justify-between">
          <span className="font-medium">Fiyat Farkı</span>
          <div className="flex items-center gap-2">
            {priceDiff > 0 ? (
              <ArrowUp className="w-4 h-4 text-blue-600" />
            ) : (
              <ArrowDown className="w-4 h-4 text-green-600" />
            )}
            <span className={cn(
              "font-bold text-lg",
              priceDiff > 0 ? "text-blue-600" : "text-green-600"
            )}>
              {priceDiff > 0 ? '+' : ''}₺{priceDiff}/ay
            </span>
          </div>
        </div>
      </div>

      {/* Kazanılan Özellikler */}
      {gainedFeatures.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-green-700 mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Kazanılacak Özellikler
          </h4>
          <div className="space-y-1">
            {gainedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded">
                <Check className="w-4 h-4" />
                {feature.name}
                {feature.newLimit && <span className="text-green-600">({feature.newLimit})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kaybedilen Özellikler */}
      {lostFeatures.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Kaybedilecek Özellikler
          </h4>
          <div className="space-y-1">
            {lostFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded">
                <X className="w-4 h-4" />
                {feature.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downgrade Uyarısı */}
      {!isUpgrade && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Paket Düşürme Uyarısı</h4>
              <p className="text-sm text-amber-700 mt-1">
                Paketinizi düşürürseniz bazı özelliklere erişiminizi kaybedeceksiniz. 
                Mevcut verileriniz silinmez ancak limitleri aşan kullanımlarınız kısıtlanabilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
        >
          İptal
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            "flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-white",
            isUpgrade ? "bg-green-600 hover:bg-green-700" : "bg-amber-600 hover:bg-amber-700"
          )}
        >
          {isUpgrade ? (
            <>
              <TrendingUp className="w-4 h-4" />
              Yükselt
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4" />
              Düşür
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 👥 TOPLU PAKET ATAMA
// ═══════════════════════════════════════════════════════════════════════════════

interface BulkAssignmentProps {
  selectedUsers: { id: string; name: string; email: string; currentPackage: string }[];
  targetPackage: PackageData;
  onConfirm: () => void;
  onCancel: () => void;
}

// Helper function for confirm button style
const getConfirmButtonStyle = (confirmed: boolean): string => {
  const base = "flex-1 px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2";
  if (confirmed) {
    return `${base} bg-primary text-white hover:bg-primary/90`;
  }
  return `${base} bg-gray-200 text-gray-500 cursor-not-allowed`;
};

export const BulkPackageAssignment: React.FC<BulkAssignmentProps> = ({
  selectedUsers,
  targetPackage,
  onConfirm,
  onCancel,
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const displayedUsers = showAllUsers ? selectedUsers : selectedUsers.slice(0, 5);

  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        Toplu Paket Atama
      </h3>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Seçili Kullanıcı</div>
          <div className="text-2xl font-bold">{selectedUsers.length}</div>
        </div>
        <div className="p-4 bg-primary/10 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Hedef Paket</div>
          <div className="text-xl font-bold">{targetPackage.name}</div>
        </div>
      </div>

      {/* Kullanıcı Listesi */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">Etkilenecek Kullanıcılar</h4>
          <button
            onClick={() => setShowAllUsers(!showAllUsers)}
            className="text-sm text-primary hover:underline"
          >
            {showAllUsers ? 'Küçült' : `Tümünü gör (${selectedUsers.length})`}
          </button>
        </div>
        <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
          {displayedUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {user.currentPackage} → <span className="text-primary font-medium">{targetPackage.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Uyarı */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-amber-800">Toplu İşlem Uyarısı</h4>
            <p className="text-sm text-amber-700 mt-1">
              Bu işlem {selectedUsers.length} kullanıcıyı etkileyecek. 
              İşlem 24 saat içinde geri alınabilir.
            </p>
          </div>
        </div>
      </div>

      {/* Onay Checkbox */}
      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 mb-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <div className="text-sm">
          <span className="font-medium">{selectedUsers.length} kullanıcının</span> paketini{' '}
          <span className="font-medium">{targetPackage.name}</span> olarak değiştirmek istediğimi onaylıyorum.
        </div>
      </label>

      {/* Butonlar */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border rounded-lg hover:bg-muted transition-colors"
        >
          İptal
        </button>
        <button
          onClick={onConfirm}
          disabled={!confirmed}
          className={getConfirmButtonStyle(confirmed)}
        >
          <Package className="w-4 h-4" />
          Paket Ata
        </button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 💰 FATURA ÖNİZLEME
// ═══════════════════════════════════════════════════════════════════════════════

interface InvoicePreviewProps {
  currentPackage: PackageData;
  newPackage: PackageData;
  proRataAmount: number;
  nextBillingDate: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({
  currentPackage,
  newPackage,
  proRataAmount,
  nextBillingDate,
}) => {
  const priceDiff = newPackage.price - currentPackage.price;
  const isUpgrade = priceDiff > 0;

  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        Fatura Önizleme
      </h3>

      <div className="space-y-3 mb-6">
        {/* Mevcut Paket */}
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-muted-foreground">Mevcut Paket ({currentPackage.name})</span>
          <span>₺{currentPackage.price}/ay</span>
        </div>

        {/* Yeni Paket */}
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-muted-foreground">Yeni Paket ({newPackage.name})</span>
          <span>₺{newPackage.price}/ay</span>
        </div>

        {/* Pro-rata */}
        {isUpgrade && proRataAmount > 0 && (
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Pro-rata Fark</span>
              <button className="text-primary hover:underline">
                <Info className="w-4 h-4" />
              </button>
            </div>
            <span className="text-blue-600">₺{proRataAmount.toFixed(2)}</span>
          </div>
        )}

        {/* Toplam */}
        <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3">
          <span className="font-semibold">Şimdi Ödenecek</span>
          <span className="text-xl font-bold text-primary">
            {isUpgrade ? `₺${proRataAmount.toFixed(2)}` : '₺0'}
          </span>
        </div>
      </div>

      {/* Bilgi */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700">
            {isUpgrade ? (
              <>
                Sonraki faturanız ({nextBillingDate}) <strong>₺{newPackage.price}</strong> olarak kesilecektir.
                Pro-rata tutarı mevcut dönemin kalan günleri için hesaplanmıştır.
              </>
            ) : (
              <>
                Paket düşürmeniz bir sonraki fatura döneminde ({nextBillingDate}) geçerli olacaktır.
                Bu tarihe kadar mevcut paket özelliklerinizi kullanmaya devam edebilirsiniz.
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 PAKET KULLANIM İSTATİSTİKLERİ
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageUsageStatsProps {
  stats: {
    name: string;
    used: number;
    limit: number;
    unit: string;
  }[];
}

export const PackageUsageStats: React.FC<PackageUsageStatsProps> = ({ stats }) => {
  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Kullanım Durumu
      </h3>

      <div className="space-y-4">
        {stats.map((stat, index) => {
          const percentage = (stat.used / stat.limit) * 100;
          const isWarning = percentage >= 80;
          const isDanger = percentage >= 95;

          return (
            <div key={index}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium">{stat.name}</span>
                <span className={cn(
                  "text-sm",
                  isDanger ? "text-red-600" : isWarning ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {stat.used} / {stat.limit} {stat.unit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ duration: 0.5 }}
                  className={cn(
                    "h-full rounded-full",
                    isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-green-500"
                  )}
                />
              </div>
              {isDanger && (
                <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Limit dolmak üzere! Paketi yükseltmeyi düşünün.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 PAKET GEÇMİŞİ
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageHistoryItem {
  id: string;
  date: string;
  action: 'upgrade' | 'downgrade' | 'assign' | 'cancel';
  fromPackage: string;
  toPackage: string;
  actor: string;
  canUndo?: boolean;
}

interface PackageHistoryProps {
  history: PackageHistoryItem[];
  onUndo?: (id: string) => void;
}

const historyActionConfig = {
  upgrade: { label: 'Yükseltildi', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  downgrade: { label: 'Düşürüldü', icon: TrendingDown, color: 'text-amber-600 bg-amber-100' },
  assign: { label: 'Atandı', icon: Package, color: 'text-blue-600 bg-blue-100' },
  cancel: { label: 'İptal Edildi', icon: X, color: 'text-red-600 bg-red-100' },
};

export const PackageHistory: React.FC<PackageHistoryProps> = ({ history, onUndo }) => {
  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Paket Geçmişi
      </h3>

      <div className="space-y-3">
        {history.map((item) => {
          const config = historyActionConfig[item.action];
          const Icon = config.icon;

          return (
            <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", config.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {item.fromPackage} → {item.toPackage}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.date} • {item.actor}
                  </div>
                </div>
              </div>
              {item.canUndo && onUndo && (
                <button
                  onClick={() => onUndo(item.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:bg-primary/10 rounded"
                >
                  <RotateCcw className="w-3 h-3" />
                  Geri Al
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📋 PAKET İSTATİSTİK PANELİ
// ═══════════════════════════════════════════════════════════════════════════════

interface PackageDistributionProps {
  packages: { name: string; count: number; color: string; revenue: number }[];
  totalUsers: number;
  totalRevenue: number;
}

export const PackageDistribution: React.FC<PackageDistributionProps> = ({
  packages,
  totalUsers,
  totalRevenue,
}) => {
  return (
    <div className="bg-background rounded-xl border p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Package className="w-5 h-5" />
        Paket Dağılımı
      </h3>

      {/* Progress Bar */}
      <div className="h-4 bg-muted rounded-full overflow-hidden flex mb-4">
        {packages.map((pkg, index) => (
          <motion.div
            key={index}
            initial={{ width: 0 }}
            animate={{ width: `${(pkg.count / totalUsers) * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn("h-full", pkg.color)}
            title={`${pkg.name}: ${pkg.count} kullanıcı`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {packages.map((pkg, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", pkg.color)} />
            <div className="text-sm">
              <span className="font-medium">{pkg.name}</span>
              <span className="text-muted-foreground ml-1">({pkg.count})</span>
            </div>
          </div>
        ))}
      </div>

      {/* Özet */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold">{totalUsers.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Toplam Kullanıcı</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">₺{totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Aylık Gelir</div>
        </div>
      </div>
    </div>
  );
};
