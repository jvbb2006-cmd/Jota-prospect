/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WhatsAppValidationResult } from '../types/database';

/**
 * Normaliza e valida um número de telefone no formato internacional E.164 (+[código_país][número_nacional]).
 * Trata números do Brasil (+55 com 10 ou 11 dígitos) e outros formatos internacionais.
 * Se o número for ambíguo (ex: sem DDD ou incompleto), solicita correção manual.
 */
export function validateAndNormalizePhone(
  rawInput: string | null | undefined,
  defaultCountry: string = 'BR'
): WhatsAppValidationResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      isValid: false,
      e164: null,
      formattedDisplay: '',
      rawInput: rawInput || '',
      country: defaultCountry,
      isAmbiguous: true,
      errorMessage: 'Número de telefone não informado.',
    };
  }

  const trimmed = rawInput.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (digitsOnly.length === 0) {
    return {
      isValid: false,
      e164: null,
      formattedDisplay: '',
      rawInput: trimmed,
      country: defaultCountry,
      isAmbiguous: true,
      errorMessage: 'Nenhum dígito numérico encontrado no telefone.',
    };
  }

  // Se já tiver código internacional explícito com '+'
  const hasPlusPrefix = trimmed.startsWith('+');

  let countryCode = '55'; // default Brasil
  let nationalNumber = digitsOnly;

  if (hasPlusPrefix) {
    if (digitsOnly.startsWith('55')) {
      countryCode = '55';
      nationalNumber = digitsOnly.slice(2);
    } else if (digitsOnly.startsWith('1') && (digitsOnly.length === 11)) {
      countryCode = '1'; // EUA / Canadá
      nationalNumber = digitsOnly.slice(1);
    } else if (digitsOnly.startsWith('351') && digitsOnly.length === 12) {
      countryCode = '351'; // Portugal
      nationalNumber = digitsOnly.slice(3);
    } else {
      // Outro país com '+'
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        return {
          isValid: false,
          e164: null,
          formattedDisplay: trimmed,
          rawInput: trimmed,
          country: 'Internacional',
          isAmbiguous: true,
          errorMessage: 'Número internacional fora dos limites padrão E.164 (8 a 15 dígitos).',
        };
      }
      return {
        isValid: true,
        e164: `+${digitsOnly}`,
        formattedDisplay: `+${digitsOnly}`,
        rawInput: trimmed,
        country: 'Internacional',
        isAmbiguous: false,
      };
    }
  } else {
    // Sem prefixo '+', analisar se já contém DDI 55
    if (digitsOnly.startsWith('55') && (digitsOnly.length === 12 || digitsOnly.length === 13)) {
      countryCode = '55';
      nationalNumber = digitsOnly.slice(2);
    }
  }

  // Validação específica para o Brasil (+55)
  if (countryCode === '55') {
    // DDD (2 dígitos) + Telefone (8 dígitos fixo ou 9 dígitos celular)
    if (nationalNumber.length === 8 || nationalNumber.length === 9) {
      // Falta DDD! Número ambíguo
      return {
        isValid: false,
        e164: null,
        formattedDisplay: nationalNumber,
        rawInput: trimmed,
        country: 'Brasil',
        isAmbiguous: true,
        errorMessage:
          'DDD regional ausente. Informe o DDD (ex: 11, 21, 91) antes do número para envio via WhatsApp.',
      };
    }

    if (nationalNumber.length === 10 || nationalNumber.length === 11) {
      const ddd = nationalNumber.slice(0, 2);
      const rest = nationalNumber.slice(2);
      const formatted =
        rest.length === 9
          ? `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
          : `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;

      return {
        isValid: true,
        e164: `+55${nationalNumber}`,
        formattedDisplay: formatted,
        rawInput: trimmed,
        country: 'Brasil',
        isAmbiguous: false,
      };
    }

    return {
      isValid: false,
      e164: null,
      formattedDisplay: nationalNumber,
      rawInput: trimmed,
      country: 'Brasil',
      isAmbiguous: true,
      errorMessage: `Quantidade de dígitos inválida para o Brasil (${nationalNumber.length} dígitos encontrados; esperado 10 ou 11 com DDD).`,
    };
  }

  // Outros formatos padrão
  const cleanE164 = `+${countryCode}${nationalNumber}`;
  return {
    isValid: true,
    e164: cleanE164,
    formattedDisplay: cleanE164,
    rawInput: trimmed,
    country: defaultCountry,
    isAmbiguous: false,
  };
}

/**
 * Constrói o link oficial wa.me garantindo preservação de acentuação, pontuação e quebras de linha.
 */
export function buildWhatsAppLink(e164Phone: string, messageText: string): string {
  const digits = e164Phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${digits}?text=${encodedText}`;
}

/**
 * Função open-whatsapp: executa a abertura via ação do usuário e emite evento sem presumir envio.
 * Retorna true se abriu ou false se validação falhou.
 */
export function openWhatsAppDirect(
  phone: string | null | undefined,
  message: string,
  onOpened?: (details: { e164: string; openedAt: string; preview: string }) => void
): { success: boolean; error?: string; url?: string } {
  const validation = validateAndNormalizePhone(phone);
  if (!validation.isValid || !validation.e164) {
    return {
      success: false,
      error: validation.errorMessage || 'Telefone inválido para abertura de WhatsApp.',
    };
  }

  const url = buildWhatsAppLink(validation.e164, message);

  // Abertura explícita
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Notificar observador de evento do sistema (sem alegar que foi entregue ou enviado)
  if (onOpened) {
    onOpened({
      e164: validation.e164,
      openedAt: new Date().toISOString(),
      preview: message.slice(0, 120),
    });
  }

  return { success: true, url };
}
