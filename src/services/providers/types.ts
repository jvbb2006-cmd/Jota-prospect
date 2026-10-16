/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BusinessSearchStatus } from '../../types/database';

export interface SearchParams {
  query: string;
  segment?: string;
  city?: string;
  state?: string;
  country?: string;
  desiredQuantity: number;
  minRating?: number;
  onlyWithWebsite?: boolean;
}

export interface NormalizedPlace {
  providerPlaceId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
  rating?: number;
  userRatingsTotal?: number;
  category?: string;
  types?: string[];
  alreadyInCrm?: boolean;
}

export interface ProviderResponse {
  success: boolean;
  items: NormalizedPlace[];
  totalFound: number;
  status: BusinessSearchStatus;
  errorMessage?: string;
  errorCode?: string;
  provider: string;
  attributionText?: string;
}

export interface BusinessSearchProvider {
  name: string;
  displayName: string;
  search(params: SearchParams, apiKey?: string): Promise<ProviderResponse>;
}
