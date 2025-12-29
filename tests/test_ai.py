"""
AI Module Tests.

AI modülü için test senaryoları.
"""

import pytest
from flask import url_for
from app.models.ai import AIUsageLog, AIQuota, AIConfiguration, AIViolation


class TestAIHealth:
    """AI modülü sağlık kontrolü testleri."""
    
    def test_ai_health_endpoint(self, client):
        """AI health endpoint'i çalışıyor olmalı."""
        response = client.get('/api/v1/ai/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert data['data']['status'] == 'healthy'
        assert 'provider' in data['data']


class TestAIHint:
    """Soru ipucu testleri."""
    
    def test_get_hint_requires_auth(self, client):
        """İpucu almak için kimlik doğrulama gerekli."""
        response = client.post('/api/v1/ai/hint', json={
            'question_text': 'Bu bir test sorusudur. En az 10 karakter olmalı.'
        })
        assert response.status_code == 401
    
    def test_get_hint_success(self, client, auth_headers):
        """Başarılı ipucu alma."""
        response = client.post('/api/v1/ai/hint', 
            json={
                'question_text': 'Pisagor teoremini kullanarak hipotenüs nasıl bulunur?',
                'hint_level': 1,
                'subject': 'Matematik'
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'hint_text' in data['data']
        assert 'hint_level' in data['data']
        assert 'remaining_quota' in data['data']
    
    def test_get_hint_validation(self, client, auth_headers):
        """İpucu validasyonu - kısa soru."""
        response = client.post('/api/v1/ai/hint',
            json={
                'question_text': 'Kısa'
            },
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_get_hint_level_progression(self, client, auth_headers):
        """Farklı ipucu seviyeleri."""
        for level in [1, 2, 3]:
            response = client.post('/api/v1/ai/hint',
                json={
                    'question_text': 'Bir dik üçgende hipotenüs nasıl hesaplanır?',
                    'hint_level': level
                },
                headers=auth_headers
            )
            assert response.status_code == 200
            data = response.get_json()
            assert data['data']['hint_level'] == level


class TestAIExplanation:
    """Konu açıklaması testleri."""
    
    def test_explain_topic_success(self, client, auth_headers):
        """Başarılı konu açıklaması."""
        response = client.post('/api/v1/ai/explain',
            json={
                'topic': 'Pisagor Teoremi',
                'difficulty': 'basic'
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'explanation' in data['data']
        assert 'examples' in data['data']
    
    def test_explain_topic_with_learning_style(self, client, auth_headers):
        """Öğrenme stili ile konu açıklaması."""
        response = client.post('/api/v1/ai/explain',
            json={
                'topic': 'Türev',
                'difficulty': 'medium',
                'learning_style': 'visual'
            },
            headers=auth_headers
        )
        assert response.status_code == 200


class TestAIStudyPlan:
    """Çalışma planı testleri."""
    
    def test_create_study_plan_success(self, client, auth_headers):
        """Başarılı çalışma planı oluşturma."""
        response = client.post('/api/v1/ai/study-plan',
            json={
                'daily_hours': 2.0,
                'weak_topics': ['Matematik', 'Fizik'],
                'preferred_times': ['afternoon', 'evening']
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] is True
        assert 'schedule' in data['data']
        assert 'milestones' in data['data']


class TestAIAnswerEvaluation:
    """Cevap değerlendirme testleri."""
    
    def test_evaluate_answer_requires_teacher(self, client, student_auth_headers):
        """Öğrenciler cevap değerlendiremez."""
        response = client.post('/api/v1/ai/evaluate-answer',
            json={
                'question_text': 'Suyun kaynama noktası kaç derecedir?',
                'student_answer': 'Suyun kaynama noktası 100 derece santigrat.'
            },
            headers=student_auth_headers
        )
        assert response.status_code == 403
    
    def test_evaluate_answer_success(self, client, teacher_auth_headers):
        """Öğretmen cevap değerlendirebilir."""
        response = client.post('/api/v1/ai/evaluate-answer',
            json={
                'question_text': 'Fotosentez nedir? Açıklayınız.',
                'student_answer': 'Fotosentez, bitkilerin güneş ışığı kullanarak karbondioksit ve suyu glikoz ve oksijene dönüştürdüğü bir süreçtir.',
                'max_score': 10
            },
            headers=teacher_auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'suggested_score' in data['data']
        assert 'evaluation' in data['data']


class TestAIPerformanceAnalysis:
    """Performans analizi testleri."""
    
    def test_analyze_own_performance(self, client, auth_headers):
        """Kendi performans analizi."""
        response = client.post('/api/v1/ai/analyze-performance',
            json={
                'period_days': 30
            },
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'strengths' in data['data']
        assert 'weaknesses' in data['data']


class TestAIQuestionGeneration:
    """Soru oluşturma testleri."""
    
    def test_generate_questions_requires_teacher(self, client, student_auth_headers):
        """Öğrenciler soru oluşturamaz."""
        response = client.post('/api/v1/ai/generate-questions',
            json={
                'topic': 'Matematik'
            },
            headers=student_auth_headers
        )
        assert response.status_code == 403
    
    def test_generate_questions_success(self, client, teacher_auth_headers):
        """Öğretmen soru oluşturabilir."""
        response = client.post('/api/v1/ai/generate-questions',
            json={
                'topic': 'Trigonometri',
                'difficulty': 'medium',
                'count': 5,
                'question_type': 'multiple_choice'
            },
            headers=teacher_auth_headers
        )
        assert response.status_code == 200
        data = response.get_json()
        assert 'questions' in data['data']
        assert len(data['data']['questions']) == 5


class TestAIQuota:
    """Kota testleri."""
    
    def test_get_quota_status(self, client, auth_headers):
        """Kota durumu sorgulama."""
        response = client.get('/api/v1/ai/quota', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'daily_tokens_used' in data['data']
        assert 'daily_tokens_limit' in data['data']
    
    def test_get_usage_history(self, client, auth_headers):
        """Kullanım geçmişi sorgulama."""
        response = client.get('/api/v1/ai/usage-history', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'items' in data['data']
        assert 'total' in data['data']
    
    def test_get_available_features(self, client, auth_headers):
        """Kullanılabilir özellikler listesi."""
        response = client.get('/api/v1/ai/features', headers=auth_headers)
        assert response.status_code == 200
        data = response.get_json()
        assert 'features' in data['data']


class TestAIContentSafety:
    """İçerik güvenliği testleri."""
    
    def test_banned_content_rejected(self, client, auth_headers):
        """Yasaklı içerik reddedilmeli."""
        response = client.post('/api/v1/ai/hint',
            json={
                'question_text': 'Bu yasadışı bir soru içeriyor, nasıl hack yapılır?'
            },
            headers=auth_headers
        )
        assert response.status_code == 400
    
    def test_redirect_topic_handled(self, client, auth_headers):
        """Yönlendirme konuları için uygun mesaj."""
        response = client.post('/api/v1/ai/explain',
            json={
                'topic': 'Depresyon ve tedavisi'
            },
            headers=auth_headers
        )
        assert response.status_code == 400
        data = response.get_json()
        assert 'uzman' in data['error']['message'].lower() or 'profesyonel' in data['error']['message'].lower()


class TestAIModels:
    """AI model testleri."""
    
    def test_ai_usage_log_creation(self, app, db_session):
        """AI kullanım logu oluşturma."""
        from app.models.user import User
        
        user = User.query.first()
        if user:
            log = AIUsageLog(
                user_id=user.id,
                feature='question_hint',
                tokens_used=100,
                response_summary='Test hint'
            )
            db_session.add(log)
            db_session.commit()
            
            assert log.id is not None
            assert log.feature == 'question_hint'
    
    def test_ai_quota_creation(self, app, db_session):
        """AI kota oluşturma."""
        from app.models.user import User
        
        user = User.query.first()
        if user:
            quota = AIQuota.query.filter_by(user_id=user.id).first()
            if not quota:
                quota = AIQuota(user_id=user.id)
                db_session.add(quota)
                db_session.commit()
            
            assert quota.daily_tokens_used == 0
            
            # Kota tüketimi testi
            quota.consume_quota(100)
            db_session.commit()
            assert quota.daily_tokens_used == 100
    
    def test_ai_configuration(self, app, db_session):
        """AI konfigürasyon testi."""
        # Set value
        AIConfiguration.set_value(
            key='test_config',
            value={'test': True},
            description='Test configuration'
        )
        db_session.commit()
        
        # Get value
        value = AIConfiguration.get_value('test_config')
        assert value == {'test': True}
        
        # Default value
        default = AIConfiguration.get_value('nonexistent', default='default')
        assert default == 'default'
