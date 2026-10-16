/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { executeDiagnostic360 } from './src/services/diagnosticEngine.ts';
import { executeOutreachGenerationServer } from './src/services/outreachEngine.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Mandatory Solution ID for Google Maps Platform tracking
const SOLUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';

interface SearchRequestBody {
  query?: string;
  segment?: string;
  city?: string;
  state?: string;
  country?: string;
  desiredQuantity?: number;
  minRating?: number;
  onlyWithWebsite?: boolean;
}

interface RawPlace {
  id: string;
  displayName?: { text: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  types?: string[];
}

// Helper to extract city and state from formatted address
function parseAddressParts(formattedAddress: string = '', fallbackCity: string = '', fallbackState: string = '') {
  let city = fallbackCity;
  let state = fallbackState;
  
  if (formattedAddress) {
    const parts = formattedAddress.split(',').map((p) => p.trim());
    if (parts.length >= 3) {
      const statePart = parts[parts.length - 2];
      const match = statePart.match(/([A-Z]{2})\b/);
      if (match) {
        state = state || match[1];
      }
      const cityCandidate = parts[parts.length - 3];
      if (cityCandidate && !city) {
        city = cityCandidate.replace(/\d{5}-?\d{3}/, '').trim();
      }
    }
  }

  return { city, state };
}

// Server-side search-businesses endpoint using Google Places API (New) Text Search
app.post('/api/search-businesses', async (req: Request, res: Response) => {
  const {
    query = '',
    segment = '',
    city = '',
    state = '',
    country = 'Brasil',
    desiredQuantity = 20,
    minRating = 0,
    onlyWithWebsite = false,
  }: SearchRequestBody = req.body;

  // 1. Validate inputs
  if (!query.trim() && !segment.trim()) {
    return res.status(400).json({
      success: false,
      status: 'failed',
      errorCode: 'INVALID_INPUT',
      errorMessage: 'Informe ao menos o segmento ou termos de pesquisa para localizar empresas.',
    });
  }

  // 2. Validate API key presence securely on the server
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    (req.headers['x-google-maps-api-key'] as string);

  if (!apiKey || apiKey.trim() === '') {
    return res.status(400).json({
      success: false,
      status: 'failed',
      errorCode: 'MISSING_API_KEY',
      errorMessage:
        'Chave da Google Maps Platform não configurada no servidor. Insira uma chave de API válida nas Configurações da aplicação ou na variável de ambiente GOOGLE_MAPS_API_KEY.',
    });
  }

  // 3. Assemble search query text
  const queryParts = [segment, query, city, state, country].map((s) => (s || '').trim()).filter(Boolean);
  const textQuery = queryParts.join(', ');

  // FieldMask for cost-controlled Places API (New) request
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.location',
    'places.rating',
    'places.userRatingCount',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.nationalPhoneNumber',
    'places.googleMapsUri',
    'places.businessStatus',
    'places.types',
    'nextPageToken',
  ].join(',');

  const allPlaces: RawPlace[] = [];
  let pageToken: string | undefined = undefined;
  const targetCount = Math.min(Math.max(desiredQuantity, 1), 60); // Max 60 results supported by Places API Text Search

  try {
    let keepPaging = true;
    let attempts = 0;

    while (keepPaging && allPlaces.length < targetCount && attempts < 3) {
      attempts++;
      const pageSize = Math.min(targetCount - allPlaces.length, 20);

      const requestBody: Record<string, any> = {
        textQuery,
        pageSize,
        languageCode: 'pt-BR',
      };

      if (pageToken) {
        requestBody.pageToken = pageToken;
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey.trim(),
          'X-Goog-Maps-Solution-ID': SOLUTION_ID,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Google Places API Error]', response.status, errorData);

        if (response.status === 403 || response.status === 401) {
          return res.status(403).json({
            success: false,
            status: 'failed',
            errorCode: 'REQUEST_DENIED',
            errorMessage:
              'Acesso negado pela Google Maps Platform. Verifique se a Places API (New) está ativada no Google Cloud Console e se o faturamento (billing) do projeto está ativo.',
          });
        }

        if (response.status === 429) {
          return res.status(429).json({
            success: false,
            status: 'failed',
            errorCode: 'RESOURCE_EXHAUSTED',
            errorMessage:
              'Limite de consultas da Google Maps Platform atingido (quota excedida). Aguarde ou aumente a cota no console do Google Cloud.',
          });
        }

        return res.status(response.status).json({
          success: false,
          status: 'failed',
          errorCode: 'API_ERROR',
          errorMessage:
            errorData.error?.message ||
            `Erro na consulta à Places API (${response.status} ${response.statusText}).`,
        });
      }

      const data = await response.json();
      const places: RawPlace[] = data.places || [];
      allPlaces.push(...places);

      if (data.nextPageToken && allPlaces.length < targetCount) {
        pageToken = data.nextPageToken;
        // Pause briefly before requesting next page as per API recommendation
        await new Promise((resolve) => setTimeout(resolve, 300));
      } else {
        keepPaging = false;
      }
    }

    // 4. Normalize results and apply optional client criteria
    let normalized = allPlaces.map((p) => {
      const { city: parsedCity, state: parsedState } = parseAddressParts(
        p.formattedAddress,
        city,
        state
      );

      return {
        providerPlaceId: p.id,
        name: p.displayName?.text || 'Estabelecimento sem nome',
        address: p.formattedAddress || '',
        city: parsedCity || city || '',
        state: parsedState || state || '',
        country: country || 'Brasil',
        phone: p.internationalPhoneNumber || p.nationalPhoneNumber || '',
        websiteUrl: p.websiteUri || '',
        googleMapsUrl:
          p.googleMapsUri || (p.id ? `https://www.google.com/maps/place/?q=place_id:${p.id}` : ''),
        rating: p.rating || 0,
        userRatingsTotal: p.userRatingCount || 0,
        category: segment || (p.types && p.types[0] ? p.types[0].replace(/_/g, ' ') : 'Comércio'),
        types: p.types || [],
      };
    });

    // 5. Remove internal duplicates by providerPlaceId
    const seen = new Set<string>();
    normalized = normalized.filter((item) => {
      if (!item.providerPlaceId || seen.has(item.providerPlaceId)) return false;
      seen.add(item.providerPlaceId);
      return true;
    });

    // 6. Filter by minRating if requested
    if (minRating > 0) {
      normalized = normalized.filter((item) => (item.rating || 0) >= minRating);
    }

    // 7. Filter only with website if requested
    if (onlyWithWebsite) {
      normalized = normalized.filter((item) => Boolean(item.websiteUrl));
    }

    // Status evaluation
    let status: 'completed' | 'partial' | 'no_results' = 'completed';
    if (normalized.length === 0) {
      status = 'no_results';
    } else if (normalized.length < desiredQuantity) {
      status = 'partial';
    }

    return res.json({
      success: true,
      provider: 'google_places_new',
      totalFound: normalized.length,
      requestedCount: desiredQuantity,
      status,
      attributionText: 'Google Maps',
      items: normalized,
    });
  } catch (error: any) {
    console.error('[Search Businesses Exception]', error);
    return res.status(500).json({
      success: false,
      status: 'failed',
      errorCode: 'SERVER_EXCEPTION',
      errorMessage: error.message || 'Erro inesperado no servidor ao processar busca de empresas.',
    });
  }
});

// Health / Status endpoint to check if Google Maps key is active
app.get('/api/places-status', (req: Request, res: Response) => {
  const hasKey = Boolean(
    process.env.GOOGLE_MAPS_API_KEY ||
      process.env.VITE_GOOGLE_MAPS_API_KEY ||
      req.headers['x-google-maps-api-key']
  );
  res.json({
    configured: hasKey,
    provider: 'google_places_new',
    endpoint: '/api/search-businesses',
  });
});

// Server-side Diagnóstico 360° endpoint
app.post('/api/diagnostics/run', async (req: Request, res: Response) => {
  try {
    const { workspaceId, companyId, companyData } = req.body;

    if (!workspaceId || !companyId || !companyData || !companyData.name) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Identificadores de workspace, empresa e dados cadastrais são obrigatórios para executar o diagnóstico.',
      });
    }

    // Execute the complete technical audit + AI/deterministic synthesis
    const result = await executeDiagnostic360(companyData, workspaceId);

    return res.json({
      success: true,
      diagnostic: result.diagnostic,
      findings: result.findings,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      errorCode: 'DIAGNOSTIC_EXECUTION_ERROR',
      errorMessage: error.message || 'Erro inesperado no servidor ao executar Diagnóstico 360°.',
    });
  }
});

// Server-side Outreach Generation endpoint (4 etapas com CRM + Diagnóstico 360°)
app.post('/api/outreach/generate', async (req: Request, res: Response) => {
  try {
    const { company, contact, diagnostic, channel } = req.body;

    if (!company || !company.name) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_INPUT',
        errorMessage: 'Dados da empresa são obrigatórios para gerar mensagens de abordagem.',
      });
    }

    const { messages, engine } = await executeOutreachGenerationServer(
      company,
      contact,
      diagnostic,
      channel || 'whatsapp'
    );

    return res.json({
      success: true,
      messages,
      engine,
    });
  } catch (error: any) {
    console.error('[Outreach Generation Error]', error);
    return res.status(500).json({
      success: false,
      errorCode: 'OUTREACH_GEN_ERROR',
      errorMessage: error.message || 'Erro no servidor ao gerar mensagens de abordagem.',
    });
  }
});


// Mount Vite or static build
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[JOTA Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
