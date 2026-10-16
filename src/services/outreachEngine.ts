/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';
import {
  Company,
  Contact,
  Diagnostic,
  OutreachMessage,
  OutreachStage,
  OutreachChannel,
  CadenceStepConfig,
} from '../types/database';

export const CADENCE_SCHEDULE: CadenceStepConfig[] = [
  {
    dayOffset: 0,
    stage: 'etapa_1',
    stageStep: 1,
    title: 'Dia 0 — 1º Contato: Abertura e Identificação do Decisor',
    channel: 'whatsapp',
    objective: 'Confirmar contato com o responsável pela área sem abordagem invasiva.',
  },
  {
    dayOffset: 2,
    stage: 'etapa_2',
    stageStep: 2,
    title: 'Dia 2 — Follow-up 1: Apresentação Profissional e Contexto B2B',
    channel: 'whatsapp',
    objective: 'Apresentar a JOTA Prospect Intelligence e contextualizar a atuação no setor.',
  },
  {
    dayOffset: 4,
    stage: 'etapa_3',
    stageStep: 3,
    title: 'Dia 4 — Follow-up 2: Diagnóstico 360°, Evidências e Proposta de Valor',
    channel: 'whatsapp',
    objective: 'Apresentar oportunidades técnicas reais observadas no diagnóstico.',
  },
  {
    dayOffset: 8,
    stage: 'etapa_3',
    stageStep: 4,
    title: 'Dia 8 — Follow-up 3: Compartilhamento de Insight Prático do Setor',
    channel: 'email',
    objective: 'Nutrir com benchmark do segmento e estudo prático de otimização.',
  },
  {
    dayOffset: 12,
    stage: 'etapa_4',
    stageStep: 5,
    title: 'Dia 12 — Fechamento: Convite para Reunião de 15 Minutos / Breakup',
    channel: 'whatsapp',
    objective: 'Convite consultivo final para apresentação do plano de ação ou pausa respeitosa.',
  },
];

/**
 * Gera as 4 etapas de abordagem de forma determinística e factual,
 * garantindo ausência total de alucinações de projetos ou resultados não confirmados.
 */
export function generateDeterministicOutreach(
  company: Company,
  contact?: Contact | null,
  diagnostic?: Diagnostic | null,
  preferredChannel: OutreachChannel = 'whatsapp'
): OutreachMessage[] {
  const contactName = contact?.name ? contact.name.split(' ')[0] : 'responsável';
  const roleName = contact?.role ? `como ${contact.role}` : 'pela liderança comercial/operacional';
  const companyName = company.name.replace(/^\[DEMONSTRAÇÃO\]\s*/i, '').trim();
  const city = company.city ? ` em ${company.city}` : '';
  const now = new Date().toISOString();

  // Extrair evidências reais do diagnóstico (se existir)
  const topProblem = diagnostic?.confirmed_problems?.[0];
  const topOpportunity = diagnostic?.probable_opportunities?.[0];
  const topRecommendation = diagnostic?.priority_recommendations?.[0];
  const score = diagnostic?.overall_score;

  // Etapa 1: Abertura e identificação do responsável
  let content1 = '';
  if (preferredChannel === 'whatsapp') {
    content1 = `Olá, ${contactName}! Tudo bem?

Aqui é da equipe de inteligência da JOTA. Localizei o contato da ${companyName}${city} e gostaria de confirmar se você é a pessoa responsável ${roleName}.

Estou com uma análise de presença digital e canais de atendimento que preparamos para a empresa e queria compartilhar com quem responde por essa frente.`;
  } else if (preferredChannel === 'email') {
    content1 = `Assunto: Contato com a liderança da ${companyName} — Inteligência de Canais

Olá, ${contact?.name || 'Prezado(a)'}, tudo bem?

Escrevo da equipe de inteligência comercial da JOTA. Realizamos recentemente um mapeamento de canais digitais e atendimento no setor de ${company.category || 'atuação da empresa'}${city}.

Gostaria de confirmar se você é a pessoa responsável por essa gestão na ${companyName} para que eu possa direcionar uma análise objetiva que preparamos.`;
  } else {
    content1 = `Olá, ${contactName}, tudo bem? Sou da JOTA Prospect Intelligence. Encontrei o perfil da ${companyName} e gostaria de confirmar se você é a pessoa que lidera as iniciativas comerciais e digitais da empresa para compartilhar um estudo recente do seu setor.`;
  }

  // Etapa 2: Apresentação profissional
  let content2 = '';
  if (preferredChannel === 'whatsapp') {
    content2 = `${contactName}, obrigado pelo retorno!

A JOTA Prospect Intelligence é uma plataforma de inteligência B2B focada em estruturar canais de aquisição e conversão para empresas como a ${companyName}.

Nós não trabalhamos com automações genéricas: analisamos detalhadamente a jornada do seu cliente desde a busca pública até o primeiro contato comercial no WhatsApp e telefone.`;
  } else {
    content2 = `Prezado(a) ${contactName},

Apresentando brevemente a JOTA: atuamos com inteligência B2B, auditando jornadas comerciais desde a descoberta pública (Google, site, canais) até o primeiro contato comercial.

Nosso foco é identificar pontos de atrito reais que impedem potenciais clientes de avançarem em um atendimento ágil e qualificado.`;
  }

  // Etapa 3: Diagnóstico, oportunidade e proposta de valor
  let content3 = '';
  const tailoredPoints: string[] = [];

  if (diagnostic && score !== undefined) {
    tailoredPoints.push(`Pontuação geral auditada: ${score}/100.`);
    if (topProblem) tailoredPoints.push(`Ponto de atenção observado: ${topProblem}`);
    if (topOpportunity) tailoredPoints.push(`Oportunidade identificada: ${topOpportunity}`);
    if (topRecommendation) tailoredPoints.push(`Ação recomendada: ${topRecommendation.title}`);

    content3 = `${contactName}, rodamos uma auditoria técnica de 9 dimensões na presença digital da ${companyName} (Índice de Maturidade: ${score}/100).

Detectamos alguns pontos bastante pontuais e factuais:
${topProblem ? `• Atenção técnica: ${topProblem}\n` : ''}${topOpportunity ? `• Oportunidade prática: ${topOpportunity}\n` : ''}${topRecommendation ? `• Recomendação prioritária: ${topRecommendation.actionableStep || topRecommendation.description}\n` : ''}
Esses pontos afetam diretamente a conversão de leads qualificados que já procuram por ${company.category || 'seus serviços'} hoje.`;
  } else {
    content3 = `${contactName}, ao avaliar os pontos de contato públicos da ${companyName}, notamos oportunidades para acelerar o tempo de resposta no atendimento inicial e melhorar a conversão móvel.

Estruturamos recomendações específicas para reduzir a perda de leads que encontram sua empresa e não conseguem agendar um atendimento direto.`;
    tailoredPoints.push('Oportunidade de otimização de tempo de resposta e conversão de canais.');
  }

  // Etapa 4: Convite para reunião
  let content4 = '';
  if (preferredChannel === 'whatsapp') {
    content4 = `${contactName}, podemos marcar uma breve conversa de 15 minutos nesta semana?

Quero te apresentar o relatório completo da ${companyName} na tela, sem nenhum compromisso comercial prévio, para vocês avaliarem se faz sentido aplicar essas melhorias.

Você teria 15 minutos disponíveis nesta ${getNextBusinessDay()} às 10h ou às 15h?`;
  } else {
    content4 = `Olá, ${contactName},

Gostaria de convidar você para uma apresentação executiva rápida de 15 minutos. Apresentarei o relatório completo com todas as evidências observadas e as 3 ações prioritárias sugeridas.

Qual horário nesta semana seria mais conveniente para você? Tenho disponibilidade na ${getNextBusinessDay()} pela manhã ou à tarde.`;
  }

  const messages: OutreachMessage[] = [
    {
      id: `outreach-${company.id}-1`,
      workspace_id: company.workspace_id,
      company_id: company.id,
      contact_id: contact?.id || null,
      stage: 'etapa_1',
      stage_title: '1. Abertura e Identificação do Responsável',
      stage_step: 1,
      channel: preferredChannel,
      content: content1,
      state: 'rascunho',
      created_at: now,
      updated_at: now,
      versions: [
        {
          version: 1,
          content: content1,
          channel: preferredChannel,
          state: 'rascunho',
          updated_at: now,
          note: 'Versão inicial gerada com base nos dados do CRM',
        },
      ],
      diagnostic_id: diagnostic?.id || null,
      diagnostic_score: score,
      tailored_points: ['Identificação cordial do decisor', `Contexto: ${company.category || 'B2B'}`],
    },
    {
      id: `outreach-${company.id}-2`,
      workspace_id: company.workspace_id,
      company_id: company.id,
      contact_id: contact?.id || null,
      stage: 'etapa_2',
      stage_title: '2. Apresentação Profissional',
      stage_step: 2,
      channel: preferredChannel,
      content: content2,
      state: 'rascunho',
      created_at: now,
      updated_at: now,
      versions: [
        {
          version: 1,
          content: content2,
          channel: preferredChannel,
          state: 'rascunho',
          updated_at: now,
          note: 'Versão inicial gerada',
        },
      ],
      diagnostic_id: diagnostic?.id || null,
      diagnostic_score: score,
      tailored_points: ['Apresentação institucional JOTA', 'Posicionamento em inteligência de canais'],
    },
    {
      id: `outreach-${company.id}-3`,
      workspace_id: company.workspace_id,
      company_id: company.id,
      contact_id: contact?.id || null,
      stage: 'etapa_3',
      stage_title: '3. Diagnóstico, Oportunidade e Proposta de Valor',
      stage_step: 3,
      channel: preferredChannel,
      content: content3,
      state: 'rascunho',
      created_at: now,
      updated_at: now,
      versions: [
        {
          version: 1,
          content: content3,
          channel: preferredChannel,
          state: 'rascunho',
          updated_at: now,
          note: 'Versão inicial gerada com achados do diagnóstico',
        },
      ],
      diagnostic_id: diagnostic?.id || null,
      diagnostic_score: score,
      tailored_points: tailoredPoints,
    },
    {
      id: `outreach-${company.id}-4`,
      workspace_id: company.workspace_id,
      company_id: company.id,
      contact_id: contact?.id || null,
      stage: 'etapa_4',
      stage_title: '4. Convite para Reunião de 15 Minutos',
      stage_step: 4,
      channel: preferredChannel,
      content: content4,
      state: 'rascunho',
      created_at: now,
      updated_at: now,
      versions: [
        {
          version: 1,
          content: content4,
          channel: preferredChannel,
          state: 'rascunho',
          updated_at: now,
          note: 'Versão inicial gerada',
        },
      ],
      diagnostic_id: diagnostic?.id || null,
      diagnostic_score: score,
      tailored_points: ['Call to Action consultivo', 'Proposta de 15 minutos sem compromisso'],
    },
  ];

  return messages;
}

function getNextBusinessDay(): string {
  const days = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const today = new Date().getDay();
  // próximo dia útil
  let nextDay = (today + 1) % 7;
  if (nextDay === 0) nextDay = 1; // se domingo, pula pra segunda
  if (nextDay === 6) nextDay = 1; // se sábado, pula pra segunda
  return days[nextDay];
}

/**
 * Executa a geração assistida por IA (Gemini) quando chave disponível,
 * ou recorre com segurança ao motor determinístico factual.
 */
export async function executeOutreachGenerationServer(
  company: Company,
  contact?: Contact | null,
  diagnostic?: Diagnostic | null,
  channel: OutreachChannel = 'whatsapp'
): Promise<{ messages: OutreachMessage[]; engine: string }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return {
      messages: generateDeterministicOutreach(company, contact, diagnostic, channel),
      engine: 'deterministic_template_engine',
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contactName = contact?.name || 'Responsável';
    const role = contact?.role || 'Liderança';
    const score = diagnostic?.overall_score || 0;
    const problems = (diagnostic?.confirmed_problems || []).join('; ') || 'Nenhum problema grave registrado';
    const opportunities = (diagnostic?.probable_opportunities || []).join('; ') || 'Otimização de canais digitais';
    const recommendation = diagnostic?.priority_recommendations?.[0]?.description || 'Aprimorar canais de conversão';

    const prompt = `Você é o redator sênior de inteligência comercial da JOTA Prospect Intelligence.
Escreva exatamente as 4 mensagens das 4 etapas de abordagem comercial para a seguinte empresa e contato:

Empresa: ${company.name}
Segmento: ${company.category || 'B2B'}
Cidade/Estado: ${company.city || ''} ${company.state || ''}
Contato: ${contactName} (${role})
Canal preferencial: ${channel}
Diagnóstico 360° Real da Empresa:
- Pontuação de Maturidade: ${score}/100
- Problemas Confirmados Auditados: ${problems}
- Oportunidades Prováveis: ${opportunities}
- Recomendação Prioritária: ${recommendation}

REGRAS DE CONFORMIDADE CRÍTICAS (TOLERÂNCIA ZERO PARA ALUCINAÇÃO):
1. NUNCA invente projetos anteriores realizados para a empresa, métricas fictícias ("aumentamos em 40%"), clientes anteriores em comum ou problemas não citados acima.
2. Seja consultivo, respeitoso, objetivo e natural no tom brasileiro de negócios B2B.
3. As 4 etapas obrigatórias são:
   - etapa_1: Abertura e identificação do responsável
   - etapa_2: Apresentação profissional da JOTA
   - etapa_3: Diagnóstico, oportunidade e proposta de valor
   - etapa_4: Convite para reunião de 15 minutos

Retorne APENAS um JSON válido no seguinte formato exato (sem blocos markdown extras):
{
  "etapa_1": "texto da etapa 1",
  "etapa_2": "texto da etapa 2",
  "etapa_3": "texto da etapa 3",
  "etapa_4": "texto da etapa 4"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    const parsed = JSON.parse(text);

    if (parsed.etapa_1 && parsed.etapa_2 && parsed.etapa_3 && parsed.etapa_4) {
      const now = new Date().toISOString();
      const messages: OutreachMessage[] = [
        {
          id: `outreach-${company.id}-1`,
          workspace_id: company.workspace_id,
          company_id: company.id,
          contact_id: contact?.id || null,
          stage: 'etapa_1',
          stage_title: '1. Abertura e Identificação do Responsável',
          stage_step: 1,
          channel,
          content: parsed.etapa_1,
          state: 'rascunho',
          created_at: now,
          updated_at: now,
          versions: [
            {
              version: 1,
              content: parsed.etapa_1,
              channel,
              state: 'rascunho',
              updated_at: now,
              note: 'Gerada via Gemini AI 2.5 Flash',
            },
          ],
          diagnostic_id: diagnostic?.id || null,
          diagnostic_score: score,
          tailored_points: ['Identificação do decisor via IA', `Segmento: ${company.category || 'Geral'}`],
        },
        {
          id: `outreach-${company.id}-2`,
          workspace_id: company.workspace_id,
          company_id: company.id,
          contact_id: contact?.id || null,
          stage: 'etapa_2',
          stage_title: '2. Apresentação Profissional',
          stage_step: 2,
          channel,
          content: parsed.etapa_2,
          state: 'rascunho',
          created_at: now,
          updated_at: now,
          versions: [
            {
              version: 1,
              content: parsed.etapa_2,
              channel,
              state: 'rascunho',
              updated_at: now,
              note: 'Gerada via Gemini AI 2.5 Flash',
            },
          ],
          diagnostic_id: diagnostic?.id || null,
          diagnostic_score: score,
          tailored_points: ['Apresentação profissional JOTA'],
        },
        {
          id: `outreach-${company.id}-3`,
          workspace_id: company.workspace_id,
          company_id: company.id,
          contact_id: contact?.id || null,
          stage: 'etapa_3',
          stage_title: '3. Diagnóstico, Oportunidade e Proposta de Valor',
          stage_step: 3,
          channel,
          content: parsed.etapa_3,
          state: 'rascunho',
          created_at: now,
          updated_at: now,
          versions: [
            {
              version: 1,
              content: parsed.etapa_3,
              channel,
              state: 'rascunho',
              updated_at: now,
              note: 'Gerada via Gemini AI 2.5 Flash com evidências do diagnóstico',
            },
          ],
          diagnostic_id: diagnostic?.id || null,
          diagnostic_score: score,
          tailored_points: [
            `Maturidade: ${score}/100`,
            problems.slice(0, 80),
          ],
        },
        {
          id: `outreach-${company.id}-4`,
          workspace_id: company.workspace_id,
          company_id: company.id,
          contact_id: contact?.id || null,
          stage: 'etapa_4',
          stage_title: '4. Convite para Reunião de 15 Minutos',
          stage_step: 4,
          channel,
          content: parsed.etapa_4,
          state: 'rascunho',
          created_at: now,
          updated_at: now,
          versions: [
            {
              version: 1,
              content: parsed.etapa_4,
              channel,
              state: 'rascunho',
              updated_at: now,
              note: 'Gerada via Gemini AI 2.5 Flash',
            },
          ],
          diagnostic_id: diagnostic?.id || null,
          diagnostic_score: score,
          tailored_points: ['Call to Action consultivo'],
        },
      ];

      return { messages, engine: 'gemini-2.5-flash' };
    }
  } catch (err) {
    console.warn('Falha no Gemini AI para outreach, acionando fallback determinístico:', err);
  }

  return {
    messages: generateDeterministicOutreach(company, contact, diagnostic, channel),
    engine: 'deterministic_template_engine',
  };
}
