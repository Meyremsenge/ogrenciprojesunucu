# AI Provider Abstraction - Mimari Dokümantasyonu

## Genel Bakış

Bu dokümantasyon, AI Provider Abstraction mimarisinin tasarımını, implementasyonunu ve kullanımını açıklar.

### Temel Prensipler

1. **Kodun HİÇBİR yerinde doğrudan GPT/OpenAI çağrısı OLMAZ**
2. **Tüm AI çağrıları provider abstraction üzerinden yapılır**
3. **Provider seçimi config üzerinden yapılır**
4. **Test ortamında ücretli API'ye ihtiyaç duyulmaz**

---

## Mimari Diyagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│                (Routes, Controllers, Services)                   │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  from app.modules.ai.providers import get_ai_provider    │   │
│   │  provider = get_ai_provider()  # Config'den otomatik     │   │
│   │  response = provider.complete(request)                   │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Factory Layer                                 │
│              get_ai_provider(provider_name=None)                 │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  1. Config'den AI_PROVIDER değerini oku                  │   │
│   │  2. PROVIDER_REGISTRY'den class'ı bul                    │   │
│   │  3. Provider instance oluştur ve döndür                  │   │
│   └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Abstraction Layer                               │
│                   BaseAIProvider (ABC)                           │
│                                                                  │
│   ABSTRACT PROPERTIES:                                           │
│   ├── name: str              # Provider identifier               │
│   ├── display_name: str      # UI display name                   │
│   └── is_production_ready: bool                                  │
│                                                                  │
│   ABSTRACT METHODS:                                              │
│   ├── _initialize()          # Setup & validation                │
│   ├── complete(request)      # Sync completion                   │
│   └── health_check()         # Provider health                   │
│                                                                  │
│   OPTIONAL METHODS:                                              │
│   ├── stream(request)        # Streaming completion              │
│   └── count_tokens(text)     # Token counting                    │
└─────────┬───────────────────────────────────────┬───────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│    MockAIProvider       │         │     GPTAIProvider       │
│    (Development)        │         │     (Production)        │
│                         │         │                         │
│ • Gerçekçi yanıtlar     │         │ • OpenAI API            │
│ • Yapılandırılabilir    │         │ • Retry mekanizması     │
│   gecikme               │         │ • Streaming desteği     │
│ • Hata simülasyonu      │         │ • Token sayımı          │
│ • ÜCRETSİZ             │         │ • ÜCRETLI              │
└─────────────────────────┘         └─────────────────────────┘
```

---

## Dosya Yapısı

```
app/modules/ai/
├── __init__.py                 # Module exports
├── routes_v3.py                # Provider Abstraction demo routes
│
└── providers/
    ├── __init__.py             # Package exports
    ├── abstraction.py          # BaseAIProvider ABC, Factory, Registry
    ├── mock.py                 # MockAIProvider implementation
    └── gpt.py                  # GPTAIProvider implementation
```

---

## Kullanım

### 1. Temel Kullanım

```python
from app.modules.ai.providers import (
    get_ai_provider,
    AICompletionRequest,
    AIMessage,
    AIFeatureType,
)

# Config'den otomatik provider seçimi
provider = get_ai_provider()

# Request oluştur
request = AICompletionRequest(
    messages=[
        AIMessage(role='system', content='Sen yardımcı bir asistansın.'),
        AIMessage(role='user', content='Bana matematik öğret.')
    ],
    feature=AIFeatureType.TOPIC_EXPLANATION,
    user_id=123,
    max_tokens=500,
    temperature=0.7
)

# AI çağrısı yap
response = provider.complete(request)

# Yanıtı kullan
print(response.content)
print(f"Kullanılan token: {response.tokens_used}")
print(f"Provider: {response.provider}")
```

### 2. Config Ayarları

```python
# config/settings.py veya .env

# Development - Mock provider kullan (ÜCRETSİZ)
AI_PROVIDER = 'mock'
AI_MOCK_DELAY_MIN = 0.3
AI_MOCK_DELAY_MAX = 1.0
AI_MOCK_SIMULATE_ERRORS = False

# Production - OpenAI provider kullan
AI_PROVIDER = 'openai'
OPENAI_API_KEY = 'sk-...'
OPENAI_MODEL = 'gpt-4o-mini'
OPENAI_MAX_TOKENS = 1000
OPENAI_TEMPERATURE = 0.7
OPENAI_TIMEOUT = 30
OPENAI_MAX_RETRIES = 3
```

### 3. Environment-Specific Config

```python
# app/config.py

class DevelopmentConfig(BaseConfig):
    AI_PROVIDER = 'mock'  # Her zaman mock kullan
    AI_MOCK_SIMULATE_ERRORS = False

class TestingConfig(BaseConfig):
    AI_PROVIDER = 'mock'  # Testlerde mock kullan
    AI_MOCK_DELAY_MIN = 0.0  # Hızlı testler için gecikme yok
    AI_MOCK_DELAY_MAX = 0.0

class ProductionConfig(BaseConfig):
    AI_PROVIDER = os.getenv('AI_PROVIDER', 'openai')  # Varsayılan OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
```

### 4. Streaming Kullanımı

```python
from app.modules.ai.providers import get_ai_provider

provider = get_ai_provider()

# Streaming response
for chunk in provider.stream(request):
    print(chunk, end='', flush=True)
```

### 5. Health Check

```python
from app.modules.ai.providers import get_ai_provider

provider = get_ai_provider()
health = provider.health_check()

print(f"Status: {health.status.value}")  # healthy, degraded, unavailable
print(f"Latency: {health.latency_ms}ms")
```

### 6. Provider Bilgisi

```python
from app.modules.ai.providers import (
    get_ai_provider,
    list_providers,
    is_using_mock,
    get_current_provider_name,
)

# Aktif provider
provider = get_ai_provider()
print(f"Name: {provider.name}")
print(f"Display: {provider.display_name}")
print(f"Production Ready: {provider.is_production_ready}")

# Config'deki provider
print(f"Config Provider: {get_current_provider_name()}")

# Mock mu?
if is_using_mock():
    print("Development modunda - Mock provider aktif")

# Tüm provider'lar
for p in list_providers():
    print(f"- {p['name']}: {p['display_name']}")
```

---

## Yeni Provider Ekleme

### 1. Provider Class Oluştur

```python
# app/modules/ai/providers/anthropic.py

from .abstraction import (
    BaseAIProvider,
    AICompletionRequest,
    AICompletionResponse,
    ProviderHealthStatus,
    ProviderStatus,
    register_provider,
)

@register_provider('anthropic')  # Registry'ye otomatik kayıt
class AnthropicProvider(BaseAIProvider):
    
    @property
    def name(self) -> str:
        return "anthropic"
    
    @property
    def display_name(self) -> str:
        return f"Anthropic {self._model}"
    
    @property
    def is_production_ready(self) -> bool:
        return True
    
    def _initialize(self) -> None:
        self._api_key = self._config.get('api_key')
        self._model = self._config.get('model', 'claude-3-opus')
        # Anthropic client setup...
    
    def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        # Anthropic API çağrısı...
        pass
    
    def health_check(self) -> ProviderHealthStatus:
        # Sağlık kontrolü...
        pass
```

### 2. Package'a Import Et

```python
# app/modules/ai/providers/__init__.py

from .anthropic import AnthropicProvider
```

### 3. Config Ekle

```python
# app/config.py

AI_PROVIDER = 'anthropic'
ANTHROPIC_API_KEY = 'sk-ant-...'
ANTHROPIC_MODEL = 'claude-3-opus'
```

### 4. Factory'de Config Mapping Ekle

```python
# app/modules/ai/providers/abstraction.py

def _get_provider_config(provider_name: str) -> Dict[str, Any]:
    # ...
    elif provider_name == 'anthropic':
        config = {
            'api_key': current_app.config.get('ANTHROPIC_API_KEY'),
            'model': current_app.config.get('ANTHROPIC_MODEL', 'claude-3-opus'),
        }
    # ...
```

---

## Data Classes

### AICompletionRequest

```python
@dataclass
class AICompletionRequest:
    messages: List[AIMessage]      # Mesaj listesi
    feature: AIFeatureType         # AI özelliği
    user_id: int                   # Kullanıcı ID
    max_tokens: int = 1000         # Maksimum token
    temperature: float = 0.7       # Yaratıcılık (0-1)
    request_id: Optional[str]      # İzleme için ID
    metadata: Dict[str, Any]       # Ek bilgiler
```

### AICompletionResponse

```python
@dataclass
class AICompletionResponse:
    content: str                   # AI yanıtı
    tokens_used: int               # Kullanılan token
    model: str                     # Model adı
    provider: str                  # Provider adı
    finish_reason: str = "stop"    # Tamamlanma nedeni
    request_id: Optional[str]      # İstek ID
    latency_ms: int = 0            # Gecikme süresi
    cached: bool = False           # Cache'den mi?
    metadata: Dict[str, Any]       # Ek bilgiler
    created_at: datetime           # Oluşturma zamanı
```

### AIMessage

```python
@dataclass
class AIMessage:
    role: str      # 'system', 'user', 'assistant'
    content: str   # Mesaj içeriği
```

---

## Exceptions

```python
# Base exception
class AIProviderException(Exception):
    message: str
    provider: str
    retryable: bool

# Bağlantı hatası
class AIProviderConnectionError(AIProviderException):
    # Provider'a bağlanılamadı
    retryable = True

# Rate limit
class AIProviderRateLimitError(AIProviderException):
    retry_after: int  # Saniye
    retryable = True

# Authentication
class AIProviderAuthError(AIProviderException):
    # API key geçersiz
    retryable = False

# Kota
class AIProviderQuotaError(AIProviderException):
    # API kotası doldu
    retryable = False

# İçerik filtresi
class AIContentFilterError(AIProviderException):
    filter_type: str
    retryable = False
```

### Exception Handling

```python
from app.modules.ai.providers import (
    get_ai_provider,
    AIProviderException,
    AIProviderRateLimitError,
    AIProviderAuthError,
)

try:
    provider = get_ai_provider()
    response = provider.complete(request)
    
except AIProviderRateLimitError as e:
    print(f"Rate limit! {e.retry_after}s sonra tekrar dene")
    
except AIProviderAuthError:
    print("API key kontrol et!")
    
except AIProviderException as e:
    if e.retryable:
        print("Tekrar denenebilir hata")
    else:
        print("Kalıcı hata")
```

---

## API Endpoints

### V3 Routes (Provider Abstraction)

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/v1/ai/v3/provider/info` | Provider bilgisi |
| GET | `/api/v1/ai/v3/provider/health` | Sağlık kontrolü |
| POST | `/api/v1/ai/v3/hint` | Soru ipucu |
| POST | `/api/v1/ai/v3/explain` | Konu açıklaması |
| POST | `/api/v1/ai/v3/study-plan` | Çalışma planı |
| POST | `/api/v1/ai/v3/evaluate` | Cevap değerlendirme |
| GET | `/api/v1/ai/v3/motivation` | Motivasyon mesajı |
| POST | `/api/v1/ai/v3/stream/explain` | Streaming açıklama |

---

## Test Stratejisi

### Unit Tests

```python
import pytest
from app.modules.ai.providers import MockAIProvider, AICompletionRequest

def test_mock_provider():
    provider = MockAIProvider({'delay_min': 0, 'delay_max': 0})
    
    request = AICompletionRequest(
        messages=[...],
        feature=AIFeatureType.QUESTION_HINT,
        user_id=1
    )
    
    response = provider.complete(request)
    
    assert response.provider == 'mock'
    assert response.content  # Yanıt var
    assert response.tokens_used > 0
```

### Integration Tests (Mock ile)

```python
# conftest.py
@pytest.fixture
def app():
    app = create_app('testing')
    app.config['AI_PROVIDER'] = 'mock'  # Her zaman mock
    return app
```

### Production Smoke Test

```python
def test_production_provider():
    """Production'da gerçek API test"""
    if os.getenv('AI_PROVIDER') != 'openai':
        pytest.skip("Production only")
    
    provider = get_ai_provider()
    health = provider.health_check()
    
    assert health.status == ProviderStatus.HEALTHY
```

---

## Best Practices

### ✅ DO

```python
# Config'den provider al
provider = get_ai_provider()

# Abstract types kullan
def process(request: AICompletionRequest) -> AICompletionResponse:
    ...

# Exception handling
try:
    response = provider.complete(request)
except AIProviderException:
    ...
```

### ❌ DON'T

```python
# YANLIŞ: Doğrudan OpenAI import
from openai import OpenAI
client = OpenAI()

# YANLIŞ: Hardcoded provider
provider = GPTAIProvider(...)

# YANLIŞ: Config'i ignore etme
if is_production:
    provider = GPTAIProvider()
else:
    provider = MockAIProvider()
```

---

## Sonuç

Bu mimari ile:

1. ✅ **Kodda doğrudan GPT çağrısı yok** - Tüm çağrılar `get_ai_provider()` üzerinden
2. ✅ **Config-based seçim** - `AI_PROVIDER` ile kontrol
3. ✅ **Test desteği** - Mock provider ile ücretiz test
4. ✅ **Kolay genişleme** - Yeni provider eklemek kolay
5. ✅ **SOLID uyumlu** - Interface segregation, dependency inversion
