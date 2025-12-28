/**
 * Create Session Form Component
 * 
 * Canlı ders oluşturma formu.
 */

import React, { useState } from 'react';
import type { CreateSessionData, CreateRecurringData, SessionPlatform, RecurrenceType } from '@/types/liveSession';

interface CreateSessionFormProps {
  courseId: number;
  onSubmit: (data: CreateSessionData | CreateRecurringData) => Promise<void>;
  onCancel: () => void;
}

export function CreateSessionForm({ courseId, onSubmit, onCancel }: CreateSessionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    platform: 'zoom' as SessionPlatform,
    meeting_url: '',
    meeting_id: '',
    meeting_password: '',
    scheduled_start: '',
    duration_minutes: 60,
    max_participants: 100,
    require_enrollment: true,
    require_registration: false,
    early_join_minutes: 15,
    late_join_allowed: true,
    late_join_minutes: 30,
    notes: '',
    // Recurring
    recurrence_type: 'weekly' as RecurrenceType,
    recurrence_end_date: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: CreateSessionData | CreateRecurringData = {
        ...formData,
        course_id: courseId,
        duration_minutes: Number(formData.duration_minutes),
        max_participants: Number(formData.max_participants),
        early_join_minutes: Number(formData.early_join_minutes),
        late_join_minutes: Number(formData.late_join_minutes),
      };

      if (!isRecurring) {
        delete (data as any).recurrence_type;
        delete (data as any).recurrence_end_date;
      }

      await onSubmit(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Ders oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  const platforms = [
    { value: 'zoom', label: 'Zoom', icon: '📹' },
    { value: 'google_meet', label: 'Google Meet', icon: '🎥' },
    { value: 'microsoft_teams', label: 'Microsoft Teams', icon: '👥' },
    { value: 'jitsi', label: 'Jitsi Meet', icon: '🎦' },
    { value: 'webex', label: 'Webex', icon: '📺' },
    { value: 'custom', label: 'Diğer', icon: '🔗' },
  ];

  const recurrenceOptions = [
    { value: 'daily', label: 'Her gün' },
    { value: 'weekly', label: 'Her hafta' },
    { value: 'biweekly', label: 'İki haftada bir' },
    { value: 'monthly', label: 'Her ay' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Temel Bilgiler
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ders Başlığı *
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Örn: Haftalık Canlı Ders"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Ders hakkında kısa bilgi..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Platform & Meeting */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Platform ve Bağlantı
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Platform *
          </label>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, platform: p.value as SessionPlatform }))}
                className={`p-3 rounded-lg border text-center transition-all ${
                  formData.platform === p.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{p.icon}</span>
                <span className="block text-sm mt-1">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Linki *
          </label>
          <input
            type="url"
            name="meeting_url"
            value={formData.meeting_url}
            onChange={handleChange}
            required
            placeholder="https://zoom.us/j/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Meeting ID
            </label>
            <input
              type="text"
              name="meeting_id"
              value={formData.meeting_id}
              onChange={handleChange}
              placeholder="123 456 7890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Şifre
            </label>
            <input
              type="text"
              name="meeting_password"
              value={formData.meeting_password}
              onChange={handleChange}
              placeholder="abc123"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Zamanlama
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarih ve Saat *
            </label>
            <input
              type="datetime-local"
              name="scheduled_start"
              value={formData.scheduled_start}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Süre (dakika)
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={30}>30 dakika</option>
              <option value={45}>45 dakika</option>
              <option value={60}>1 saat</option>
              <option value={90}>1.5 saat</option>
              <option value={120}>2 saat</option>
              <option value={180}>3 saat</option>
            </select>
          </div>
        </div>

        {/* Recurring Toggle */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Tekrarlayan ders olarak oluştur
          </label>
        </div>

        {isRecurring && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tekrar Sıklığı
              </label>
              <select
                name="recurrence_type"
                value={formData.recurrence_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {recurrenceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bitiş Tarihi
              </label>
              <input
                type="date"
                name="recurrence_end_date"
                value={formData.recurrence_end_date}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Ayarlar
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Katılımcı
            </label>
            <input
              type="number"
              name="max_participants"
              value={formData.max_participants}
              onChange={handleChange}
              min={1}
              max={1000}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Erken Katılım (dk)
            </label>
            <input
              type="number"
              name="early_join_minutes"
              value={formData.early_join_minutes}
              onChange={handleChange}
              min={0}
              max={60}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="require_enrollment"
              name="require_enrollment"
              checked={formData.require_enrollment}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="require_enrollment" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Sadece kursa kayıtlı öğrenciler katılabilsin
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="require_registration"
              name="require_registration"
              checked={formData.require_registration}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="require_registration" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Derse önceden kayıt gereksin
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="late_join_allowed"
              name="late_join_allowed"
              checked={formData.late_join_allowed}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="late_join_allowed" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Geç katılıma izin ver
            </label>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Öğretmen Notları (sadece size görünür)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          placeholder="Ders için hatırlatmalar..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Oluşturuluyor...' : isRecurring ? 'Dersleri Oluştur' : 'Ders Oluştur'}
        </button>
      </div>
    </form>
  );
}

export default CreateSessionForm;
