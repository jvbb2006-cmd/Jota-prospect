/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessSearchProvider, SearchParams, ProviderResponse } from './types';

export class GooglePlacesProvider implements BusinessSearchProvider {
  public name = 'google_places_new';
  public displayName = 'Google Places API (New) Text Search';

  public async search(params: SearchParams, customApiKey?: string): Promise<ProviderResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (customApiKey && customApiKey.trim()) {
        headers['x-google-maps-api-key'] = customApiKey.trim();
      }

      const response = await fetch('/api/search-businesses', {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        return {
          success: false,
          items: [],
          totalFound: 0,
          status: 'failed',
          errorCode: data.errorCode || 'UNKNOWN_ERROR',
          errorMessage: data.errorMessage || 'Falha ao buscar empresas.',
          provider: this.name,
        };
      }

      return {
        success: true,
        items: data.items || [],
        totalFound: data.totalFound || 0,
        status: data.status || 'completed',
        provider: this.name,
        attributionText: data.attributionText || 'Google Maps',
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        items: [],
        totalFound: 0,
        status: 'failed',
        errorCode: 'NETWORK_ERROR',
        errorMessage: `Erro de conexão com o servidor local: ${msg}`,
        provider: this.name,
      };
    }
  }
}

export const googlePlacesProvider = new GooglePlacesProvider();
