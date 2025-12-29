import React, { useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Search,
  Shield,
  Mail,
  CreditCard,
  Bell,
  FileText,
  Palette,
  Link,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  Zap,
} from 'lucide-react';
import type { SystemSetting, SettingCategory, SettingType } from '../../types/admin';

interface SettingInputProps {
  setting: SystemSetting;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

const SettingInput: React.FC<SettingInputProps> = ({ setting, value, onChange, disabled }) => {
  const [showSecret, setShowSecret] = useState(false);

  switch (setting.setting_type) {
    case 'boolean':
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      );

    case 'integer':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      );

    case 'float':
      return (
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      );

    case 'secret':
      return (
        <div className="relative">
          <input
            type={showSecret ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      );

    case 'json':
      return (
        <textarea
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          disabled={disabled}
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      );
  }
};

interface SettingCardProps {
  setting: SystemSetting;
  value: any;
  onChange: (key: string, value: any) => void;
  modified?: boolean;
}

const SettingCard: React.FC<SettingCardProps> = ({ setting, value, onChange, modified }) => {
  return (
    <div className={`bg-white rounded-lg border p-4 ${modified ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center">
            <h4 className="font-medium text-gray-900">{setting.key}</h4>
            {modified && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Değiştirildi
              </span>
            )}
          </div>
          {setting.description && (
            <p className="text-sm text-gray-500 mt-1">{setting.description}</p>
          )}
        </div>
        {setting.is_sensitive && (
          <Shield className="w-4 h-4 text-orange-500" aria-label="Hassas ayar" />
        )}
      </div>
      
      <div className="mt-3">
        <SettingInput
          setting={setting}
          value={value}
          onChange={(newValue) => onChange(setting.key, newValue)}
        />
      </div>

      {setting.validation_rules && (
        <p className="text-xs text-gray-400 mt-2">
          Doğrulama: {JSON.stringify(setting.validation_rules)}
        </p>
      )}
    </div>
  );
};

const getCategoryIcon = (category: SettingCategory) => {
  const icons: Record<SettingCategory, React.ReactNode> = {
    general: <Settings className="w-5 h-5" />,
    security: <Shield className="w-5 h-5" />,
    email: <Mail className="w-5 h-5" />,
    payment: <CreditCard className="w-5 h-5" />,
    notification: <Bell className="w-5 h-5" />,
    content: <FileText className="w-5 h-5" />,
    ai: <Zap className="w-5 h-5" />,
    limits: <AlertTriangle className="w-5 h-5" />,
    appearance: <Palette className="w-5 h-5" />,
    integration: <Link className="w-5 h-5" />,
  };
  return icons[category] || <Settings className="w-5 h-5" />;
};

const getCategoryLabel = (category: SettingCategory) => {
  const labels: Record<SettingCategory, string> = {
    general: 'Genel',
    security: 'Güvenlik',
    email: 'E-posta',
    payment: 'Ödeme',
    notification: 'Bildirimler',
    content: 'İçerik',
    ai: 'Yapay Zeka',
    limits: 'Limitler',
    appearance: 'Görünüm',
    integration: 'Entegrasyonlar',
  };
  return labels[category] || category;
};

interface SystemSettingsPanelProps {
  settings: SystemSetting[];
  loading?: boolean;
  isSuperAdmin: boolean;
  onSave: (changes: Record<string, any>) => void;
  onRefresh: () => void;
  onInitialize: () => void;
}

const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({
  settings,
  loading,
  isSuperAdmin,
  onSave,
  onRefresh,
  onInitialize,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SettingCategory | 'all'>('all');
  const [changes, setChanges] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Group settings by category
  const groupedSettings = settings.reduce((acc, setting) => {
    const category = setting.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(setting);
    return acc;
  }, {} as Record<SettingCategory, SystemSetting[]>);

  const categories = Object.keys(groupedSettings) as SettingCategory[];

  // Filter settings
  const filteredSettings = settings.filter(setting => {
    const matchesSearch = searchQuery
      ? setting.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        setting.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleChange = (key: string, value: any) => {
    setChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(changes).length === 0) return;
    
    setSaving(true);
    try {
      await onSave(changes);
      setChanges({});
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChanges({});
  };

  const getSettingValue = (setting: SystemSetting) => {
    if (setting.key in changes) {
      return changes[setting.key];
    }
    return setting.value;
  };

  const hasChanges = Object.keys(changes).length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
          <p className="text-gray-500">{settings.length} ayar</p>
        </div>
        <div className="flex items-center space-x-3">
          {isSuperAdmin && (
            <button
              onClick={onInitialize}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Varsayılanları Yükle
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ayar ara..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as SettingCategory | 'all')}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map(category => (
            <option key={category} value={category}>
              {getCategoryLabel(category)}
            </option>
          ))}
        </select>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings className="w-5 h-5 mr-2" />
          Tümü
        </button>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {getCategoryIcon(category)}
            <span className="ml-2">{getCategoryLabel(category)}</span>
            <span className="ml-2 text-xs opacity-75">({groupedSettings[category]?.length || 0})</span>
          </button>
        ))}
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-700">
              {Object.keys(changes).length} ayar değiştirildi. Kaydetmeyi unutmayın!
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isSuperAdmin}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}

      {/* Permission Warning */}
      {!isSuperAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
          <span className="text-yellow-700">
            Sistem ayarlarını değiştirmek için süper admin yetkisi gereklidir. Ayarları görüntüleyebilirsiniz ancak değiştiremezsiniz.
          </span>
        </div>
      )}

      {/* Settings Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">Yükleniyor...</span>
        </div>
      ) : filteredSettings.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ayar Bulunamadı</h3>
          <p className="text-gray-500">
            {searchQuery ? 'Arama kriterlerinize uygun ayar bulunamadı.' : 'Henüz sistem ayarı tanımlanmamış.'}
          </p>
          {isSuperAdmin && !searchQuery && (
            <button
              onClick={onInitialize}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Varsayılan Ayarları Yükle
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {selectedCategory === 'all' ? (
            categories.map(category => {
              const categorySettings = filteredSettings.filter(s => s.category === category);
              if (categorySettings.length === 0) return null;
              
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(category)}
                    <h3 className="text-lg font-medium text-gray-900">{getCategoryLabel(category)}</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {categorySettings.map(setting => (
                      <SettingCard
                        key={setting.key}
                        setting={setting}
                        value={getSettingValue(setting)}
                        onChange={isSuperAdmin ? handleChange : () => {}}
                        modified={setting.key in changes}
                      />
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredSettings.map(setting => (
                <SettingCard
                  key={setting.key}
                  setting={setting}
                  value={getSettingValue(setting)}
                  onChange={isSuperAdmin ? handleChange : () => {}}
                  modified={setting.key in changes}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save Button (fixed at bottom when there are changes) */}
      {hasChanges && isSuperAdmin && (
        <div className="fixed bottom-6 right-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Kaydediliyor...' : `${Object.keys(changes).length} Değişikliği Kaydet`}
          </button>
        </div>
      )}
    </div>
  );
};

export default SystemSettingsPanel;
