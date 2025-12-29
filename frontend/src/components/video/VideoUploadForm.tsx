/**
 * VideoUploadForm Component
 * 
 * Öğretmenler için YouTube video ekleme formu.
 * URL doğrulama, metadata önizleme ve video oluşturma.
 */

import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { videoApi, YouTubeValidationResult } from '../../services/api/videoApi';
import { Youtube, CheckCircle, AlertCircle, Loader2, Clock, Eye, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Card } from '../ui/Card';

// ============================================================================
// Validation Schema
// ============================================================================

const videoFormSchema = z.object({
  url: z.string()
    .min(1, 'YouTube URL gerekli')
    .regex(
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
      'Geçerli bir YouTube URL girin'
    ),
  title: z.string()
    .min(3, 'Başlık en az 3 karakter olmalı')
    .max(200, 'Başlık en fazla 200 karakter olabilir'),
  description: z.string()
    .max(2000, 'Açıklama en fazla 2000 karakter olabilir')
    .optional(),
  topic_id: z.number({ required_error: 'Konu seçimi gerekli' }),
  order_index: z.number().min(0).default(0)
});

type VideoFormData = z.infer<typeof videoFormSchema>;

// ============================================================================
// Props
// ============================================================================

interface VideoUploadFormProps {
  /** Topic seçenekleri */
  topics: Array<{ id: number; title: string; course_title?: string }>;
  /** Form gönderildiğinde */
  onSubmit: (data: VideoFormData & { video_id: string }) => Promise<void>;
  /** İptal edildiğinde */
  onCancel?: () => void;
  /** Varsayılan topic ID */
  defaultTopicId?: number;
  /** Yükleniyor durumu */
  isSubmitting?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const VideoUploadForm: React.FC<VideoUploadFormProps> = ({
  topics,
  onSubmit,
  onCancel,
  defaultTopicId,
  isSubmitting = false
}) => {
  // State
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<YouTubeValidationResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Form
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid }
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      topic_id: defaultTopicId,
      order_index: 0
    },
    mode: 'onChange'
  });

  const watchUrl = watch('url');

  // ============================================================================
  // URL Validation
  // ============================================================================

  const validateUrl = useCallback(async () => {
    if (!watchUrl) return;

    try {
      setValidating(true);
      setValidationError(null);
      setValidationResult(null);

      const response = await videoApi.validateYouTubeUrl(watchUrl);

      if (response.success && response.data) {
        setValidationResult(response.data);
        
        // Otomatik olarak başlık ve açıklamayı doldur
        if (response.data.video_info) {
          setValue('title', response.data.video_info.title);
          setValue('description', response.data.video_info.description?.substring(0, 500) || '');
        }
      } else {
        throw new Error(response.message || 'Video doğrulanamadı');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Video doğrulanamadı';
      setValidationError(errorMessage);
    } finally {
      setValidating(false);
    }
  }, [watchUrl, setValue]);

  // ============================================================================
  // Form Submit
  // ============================================================================

  const handleFormSubmit = async (data: VideoFormData) => {
    if (!validationResult?.video_id) {
      setValidationError('Önce YouTube URL\'sini doğrulayın');
      return;
    }

    await onSubmit({
      ...data,
      video_id: validationResult.video_id
    });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* YouTube URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          YouTube Video URL
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
            <Input
              {...register('url')}
              placeholder="https://www.youtube.com/watch?v=..."
              className="pl-10"
              disabled={isSubmitting}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={validateUrl}
            disabled={!watchUrl || validating || isSubmitting}
          >
            {validating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Doğrula'
            )}
          </Button>
        </div>
        {errors.url && (
          <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
        )}
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}

      {/* Video Preview */}
      {validationResult && validationResult.video_info && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-green-700 font-medium">
              Video başarıyla doğrulandı
            </span>
          </div>
          
          <div className="flex gap-4">
            {/* Thumbnail */}
            <img
              src={validationResult.video_info.thumbnail_url}
              alt={validationResult.video_info.title}
              className="w-40 h-24 object-cover rounded"
            />
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate">
                {validationResult.video_info.title}
              </h4>
              <p className="text-sm text-gray-600">
                {validationResult.video_info.channel_title}
              </p>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {validationResult.video_info.duration_formatted}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {validationResult.video_info.view_count.toLocaleString('tr-TR')}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(validationResult.video_info.published_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Video Başlığı
        </label>
        <Input
          {...register('title')}
          placeholder="Video başlığı"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          YouTube'dan otomatik doldurulur, düzenleyebilirsiniz
        </p>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Açıklama (Opsiyonel)
        </label>
        <Textarea
          {...register('description')}
          placeholder="Video açıklaması..."
          rows={3}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Topic Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Konu
        </label>
        <Select
          {...register('topic_id', { valueAsNumber: true })}
          disabled={isSubmitting}
        >
          <option value="">Konu seçin</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.course_title ? `${topic.course_title} > ` : ''}{topic.title}
            </option>
          ))}
        </Select>
        {errors.topic_id && (
          <p className="mt-1 text-sm text-red-600">{errors.topic_id.message}</p>
        )}
      </div>

      {/* Order Index */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sıra
        </label>
        <Input
          type="number"
          {...register('order_index', { valueAsNumber: true })}
          min={0}
          disabled={isSubmitting}
        />
        <p className="mt-1 text-xs text-gray-500">
          Videoların görüntülenme sırası
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            İptal
          </Button>
        )}
        <Button
          type="submit"
          disabled={!isValid || !validationResult || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Kaydediliyor...
            </>
          ) : (
            'Video Ekle'
          )}
        </Button>
      </div>
    </form>
  );
};

export default VideoUploadForm;
