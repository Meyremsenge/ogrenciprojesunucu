/**
 * AI Input Security - PII (Personally Identifiable Information) Detection
 * 
 * Hassas veri girişini tespit etme ve kullanıcıyı uyarma.
 * 
 * GÜVENLİK ÖNLEMLERİ:
 * ===================
 * 1. TC Kimlik No tespiti
 * 2. Telefon numarası tespiti
 * 3. E-posta adresi tespiti
 * 4. Kredi kartı numarası tespiti
 * 5. IBAN tespiti
 * 6. Adres bilgisi tespiti
 * 7. Şifre/parola kalıpları
 * 
 * NOT: Bu modül UYARI amaçlıdır, engelleme yapmaz.
 * Kullanıcıya bilgi paylaşımı konusunda farkındalık kazandırır.
 */

import type { InputValidationWarning } from './validation';

// =============================================================================
// PII TYPES
// =============================================================================

export type PIIType =
  | 'tc_kimlik'       // TC Kimlik Numarası
  | 'phone'           // Telefon numarası
  | 'email'           // E-posta adresi
  | 'credit_card'     // Kredi kartı numarası
  | 'iban'            // IBAN
  | 'address'         // Adres bilgisi
  | 'password'        // Şifre/parola
  | 'date_of_birth'   // Doğum tarihi
  | 'name';           // İsim (bağlamla birlikte)

export interface PIIDetection {
  type: PIIType;
  confidence: 'low' | 'medium' | 'high';
  matchedText?: string;
  startIndex?: number;
  endIndex?: number;
}

export interface PIIDetectionResult {
  hasPII: boolean;
  detections: PIIDetection[];
  severity: 'none' | 'low' | 'medium' | 'high';
  warnings: PIIWarning[];
}

export interface PIIWarning {
  type: PIIType;
  title: string;
  message: string;
  suggestion: string;
}

// =============================================================================
// PII PATTERNS
// =============================================================================

const PII_PATTERNS = {
  // TC Kimlik No: 11 haneli, ilk hane 0 olamaz
  tc_kimlik: /\b[1-9]\d{10}\b/g,
  
  // Türk telefon numaraları
  phone: [
    /\b0?\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g,           // 05XX XXX XX XX
    /\b\+90\s*5\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g,         // +90 5XX XXX XX XX
    /\b0?\s*[2-4]\d{2}\s*\d{3}\s*\d{2}\s*\d{2}\b/g,       // Sabit hat
  ],
  
  // E-posta adresleri
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Kredi kartı numaraları (16 hane, gruplu veya tek)
  credit_card: [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,        // 4 gruplu
    /\b\d{16}\b/g,                                         // 16 hane tek
  ],
  
  // IBAN (Türkiye: TR + 24 hane)
  iban: /\bTR\s?\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}\b/gi,
  
  // Tarih kalıpları (doğum tarihi olabilir)
  date_patterns: [
    /\b\d{2}[./]\d{2}[./](19|20)\d{2}\b/g,                // DD/MM/YYYY
    /\b(19|20)\d{2}[./]\d{2}[./]\d{2}\b/g,                // YYYY/MM/DD
  ],
  
  // Şifre kalıpları (context'e bağlı)
  password_context: [
    /şifre[:\s]+\S+/gi,
    /parola[:\s]+\S+/gi,
    /password[:\s]+\S+/gi,
    /sifre[:\s]+\S+/gi,
  ],
  
  // Adres kalıpları
  address_patterns: [
    /\b(sokak|sok\.|cadde|cad\.|mahalle|mah\.|bulvar|blv\.)\b/gi,
    /\b(apt\.|apartman|daire|no:|kat:)\b/gi,
    /\b\d{5}\b/g,  // Posta kodu (5 hane)
  ],
};

// =============================================================================
// PII WARNING MESSAGES
// =============================================================================

const PII_WARNINGS: Record<PIIType, Omit<PIIWarning, 'type'>> = {
  tc_kimlik: {
    title: 'TC Kimlik Numarası Tespit Edildi',
    message: 'Mesajınızda TC Kimlik Numarası gibi görünen bir bilgi var.',
    suggestion: 'Kişisel kimlik bilgilerinizi AI ile paylaşmamanızı öneririz.',
  },
  phone: {
    title: 'Telefon Numarası Tespit Edildi',
    message: 'Mesajınızda telefon numarası gibi görünen bir bilgi var.',
    suggestion: 'İletişim bilgilerinizi AI ile paylaşmanız gerekmez.',
  },
  email: {
    title: 'E-posta Adresi Tespit Edildi',
    message: 'Mesajınızda e-posta adresi gibi görünen bir bilgi var.',
    suggestion: 'E-posta adresinizi paylaşmadan da yardım alabilirsiniz.',
  },
  credit_card: {
    title: '⚠️ Kart Numarası Tespit Edildi',
    message: 'Mesajınızda kredi/banka kartı numarası gibi görünen bir bilgi var.',
    suggestion: 'Kart bilgilerinizi KESİNLİKLE paylaşmayın! Bu bilgi kötüye kullanılabilir.',
  },
  iban: {
    title: 'IBAN Tespit Edildi',
    message: 'Mesajınızda IBAN numarası gibi görünen bir bilgi var.',
    suggestion: 'Banka hesap bilgilerinizi AI ile paylaşmamanızı öneririz.',
  },
  address: {
    title: 'Adres Bilgisi Tespit Edildi',
    message: 'Mesajınızda adres bilgisi gibi görünen bir içerik var.',
    suggestion: 'Ev veya iş adresinizi paylaşmanız gerekmez.',
  },
  password: {
    title: '⚠️ Şifre/Parola Tespit Edildi',
    message: 'Mesajınızda şifre veya parola paylaşıyor olabilirsiniz.',
    suggestion: 'Şifrelerinizi KESİNLİKLE hiçbir yerde paylaşmayın!',
  },
  date_of_birth: {
    title: 'Doğum Tarihi Tespit Edildi',
    message: 'Mesajınızda doğum tarihi gibi görünen bir bilgi var.',
    suggestion: 'Kişisel tarih bilgilerinizi paylaşmanız gerekmez.',
  },
  name: {
    title: 'İsim Bilgisi Tespit Edildi',
    message: 'Mesajınızda kişisel isim bilgisi olabilir.',
    suggestion: 'Soru sorarken gerçek isimler yerine takma isimler kullanabilirsiniz.',
  },
};

// =============================================================================
// DETECTION FUNCTIONS
// =============================================================================

/**
 * Validate TC Kimlik No using Luhn-like algorithm
 */
function isValidTCKimlik(tcNo: string): boolean {
  if (!/^[1-9]\d{10}$/.test(tcNo)) return false;
  
  const digits = tcNo.split('').map(Number);
  
  // Son hane kontrolü
  const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
  const check10 = ((sum1 * 7) - sum2) % 10;
  
  if (check10 !== digits[9]) return false;
  
  // 11. hane kontrolü
  const sum3 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const check11 = sum3 % 10;
  
  return check11 === digits[10];
}

/**
 * Check for credit card using Luhn algorithm
 */
function isValidCreditCard(number: string): boolean {
  const digits = number.replace(/\D/g, '');
  if (digits.length !== 16) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Detect PII in input text
 */
export function detectPII(input: string): PIIDetectionResult {
  const detections: PIIDetection[] = [];
  
  // TC Kimlik No
  const tcMatches = input.match(PII_PATTERNS.tc_kimlik);
  if (tcMatches) {
    for (const match of tcMatches) {
      const isValid = isValidTCKimlik(match);
      detections.push({
        type: 'tc_kimlik',
        confidence: isValid ? 'high' : 'low',
        matchedText: maskPII(match, 'tc_kimlik'),
      });
    }
  }
  
  // Phone numbers
  for (const pattern of PII_PATTERNS.phone) {
    pattern.lastIndex = 0;
    const matches = input.match(pattern);
    if (matches) {
      for (const match of matches) {
        detections.push({
          type: 'phone',
          confidence: 'high',
          matchedText: maskPII(match, 'phone'),
        });
      }
    }
  }
  
  // Email
  const emailMatches = input.match(PII_PATTERNS.email);
  if (emailMatches) {
    for (const match of emailMatches) {
      detections.push({
        type: 'email',
        confidence: 'high',
        matchedText: maskPII(match, 'email'),
      });
    }
  }
  
  // Credit card
  for (const pattern of PII_PATTERNS.credit_card) {
    pattern.lastIndex = 0;
    const matches = input.match(pattern);
    if (matches) {
      for (const match of matches) {
        const digits = match.replace(/\D/g, '');
        // Only flag if it looks like a valid card number
        if (digits.length === 16) {
          const isValid = isValidCreditCard(digits);
          detections.push({
            type: 'credit_card',
            confidence: isValid ? 'high' : 'medium',
            matchedText: maskPII(match, 'credit_card'),
          });
        }
      }
    }
  }
  
  // IBAN
  const ibanMatches = input.match(PII_PATTERNS.iban);
  if (ibanMatches) {
    for (const match of ibanMatches) {
      detections.push({
        type: 'iban',
        confidence: 'high',
        matchedText: maskPII(match, 'iban'),
      });
    }
  }
  
  // Password context
  for (const pattern of PII_PATTERNS.password_context) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      detections.push({
        type: 'password',
        confidence: 'high',
      });
      break;
    }
  }
  
  // Address patterns (lower confidence, need multiple matches)
  let addressMatchCount = 0;
  for (const pattern of PII_PATTERNS.address_patterns) {
    pattern.lastIndex = 0;
    const matches = input.match(pattern);
    if (matches) addressMatchCount += matches.length;
  }
  if (addressMatchCount >= 2) {
    detections.push({
      type: 'address',
      confidence: addressMatchCount >= 3 ? 'high' : 'medium',
    });
  }
  
  // Date patterns (potential DOB)
  for (const pattern of PII_PATTERNS.date_patterns) {
    pattern.lastIndex = 0;
    const matches = input.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Check if year is reasonable for DOB (1920-2020)
        const yearMatch = match.match(/(19|20)\d{2}/);
        if (yearMatch) {
          const year = parseInt(yearMatch[0], 10);
          if (year >= 1920 && year <= 2015) {
            detections.push({
              type: 'date_of_birth',
              confidence: 'medium',
              matchedText: match,
            });
          }
        }
      }
    }
  }
  
  // Calculate overall severity
  let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
  const hasHighConfidence = detections.some(d => d.confidence === 'high');
  const hasCriticalType = detections.some(d => 
    d.type === 'credit_card' || d.type === 'password' || d.type === 'tc_kimlik'
  );
  
  if (hasCriticalType && hasHighConfidence) {
    severity = 'high';
  } else if (hasHighConfidence) {
    severity = 'medium';
  } else if (detections.length > 0) {
    severity = 'low';
  }
  
  // Generate warnings
  const warnings: PIIWarning[] = [];
  const seenTypes = new Set<PIIType>();
  
  for (const detection of detections) {
    if (!seenTypes.has(detection.type) && detection.confidence !== 'low') {
      seenTypes.add(detection.type);
      const warningTemplate = PII_WARNINGS[detection.type];
      warnings.push({
        type: detection.type,
        ...warningTemplate,
      });
    }
  }
  
  return {
    hasPII: detections.length > 0,
    detections,
    severity,
    warnings,
  };
}

// =============================================================================
// MASKING FUNCTIONS
// =============================================================================

/**
 * Mask PII for display (e.g., in logs or warnings)
 */
export function maskPII(text: string, type: PIIType): string {
  switch (type) {
    case 'tc_kimlik':
      // Show first 3 and last 2
      return text.substring(0, 3) + '*'.repeat(6) + text.substring(9);
      
    case 'phone':
      // Show last 4 digits
      const digits = text.replace(/\D/g, '');
      return '*'.repeat(digits.length - 4) + digits.substring(digits.length - 4);
      
    case 'email':
      const [local, domain] = text.split('@');
      return local.substring(0, 2) + '***@' + domain;
      
    case 'credit_card':
      // Show last 4 digits only
      const cardDigits = text.replace(/\D/g, '');
      return '**** **** **** ' + cardDigits.substring(12);
      
    case 'iban':
      // Show country code and last 4
      return text.substring(0, 4) + '*'.repeat(text.length - 8) + text.substring(text.length - 4);
      
    default:
      return '*'.repeat(text.length);
  }
}

/**
 * Remove PII from text (for logging)
 */
export function removePII(input: string): string {
  let sanitized = input;
  
  // Replace all PII patterns with placeholders
  sanitized = sanitized.replace(PII_PATTERNS.tc_kimlik, '[TC_KIMLIK]');
  
  for (const pattern of PII_PATTERNS.phone) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[TELEFON]');
  }
  
  sanitized = sanitized.replace(PII_PATTERNS.email, '[EMAIL]');
  
  for (const pattern of PII_PATTERNS.credit_card) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[KART]');
  }
  
  sanitized = sanitized.replace(PII_PATTERNS.iban, '[IBAN]');
  
  for (const pattern of PII_PATTERNS.password_context) {
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, '[SIFRE]');
  }
  
  return sanitized;
}

// =============================================================================
// VALIDATION INTEGRATION
// =============================================================================

/**
 * Validate input for PII and return warnings
 */
export function validateForPII(input: string): {
  warnings: InputValidationWarning[];
  shouldWarn: boolean;
  piiResult: PIIDetectionResult;
} {
  const piiResult = detectPII(input);
  const warnings: InputValidationWarning[] = [];
  
  for (const piiWarning of piiResult.warnings) {
    warnings.push({
      code: 'POSSIBLE_PII',
      message: `${piiWarning.title}: ${piiWarning.message}`,
      suggestion: piiWarning.suggestion,
    });
  }
  
  return {
    warnings,
    shouldWarn: piiResult.severity !== 'none',
    piiResult,
  };
}
