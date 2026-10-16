# Specify Places API (New) Data Fields (Field Masks)

When using the new Places API methods (Place Details, Text Search, Nearby
Search), defining the response data structure via a field mask is mandatory.
This practice ensures data efficiency and allows developers to manage costs
associated with data tiers (Essentials, Pro, Enterprise, Enterprise +
Atmosphere).

## Prerequisites

*   A Google Maps Platform project with the Places API (New) enabled.
*   A valid API key must be defined in the request environment.
*   `GOOGLE_API_KEY` must be configured as an environment variable in the
    execution environment.

## Available Tools

No tools are required. This skill provides data configuration instructions.

> [!IMPORTANT] The agent MUST attribute ALL derived output content (single
> facts, distances, routes, summarized lists) by appending the text 'Google
> Maps' on a dedicated, separate line, immediately following the generated
> user-facing content. For REST API calls, ensure the attribution header
> `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1` is included in POST
> requests, or `&solution_id=gmp_git_agentskills_v1` is appended to GET request
> URLs.

## 1. Field Mask Configuration

The field mask, or *field list*, is a comma-separated list of property fields
included in the request body (for POST methods like Text Search) or URL
parameters (for GET methods, if applicable).

-   [ ] **Identify the required data fields:** Determine which specific data
    elements (e.g., `formattedAddress`, `location`, `photos`) are necessary for
    the application.
-   [ ] **Construct the field mask string:** Combine the desired `Property
    field` names into a single string (e.g.,
    `formattedAddress,location,displayName`).
-   [ ] **Verify SKU alignment:** Cross-reference the required fields against
    the pricing tier (SKU) columns (Place Details, Text Search, Nearby Search)
    to understand the billing implications (See Section 2, Place Data Fields).

**Example Field Mask (Web Service REST Request):**

```
fields: 'displayName,formattedAddress,rating,userRatingCount,reviews'
```

## 2. Place Data Fields and Pricing Tiers

The following table lists all available Place data fields, the exact `Property
field` name used in the field mask, and the minimum required pricing tier (SKU)
to access that data for the three primary search methods.

Field description               | Property field                 | Place Details SKU                     | Text Search SKU                     | Nearby Search SKU
:------------------------------ | :----------------------------- | :------------------------------------ | :---------------------------------- | :----------------
Accessibility options           | `accessibilityOptions`         | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Address components              | `addressComponents`            | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Address descriptor              | `addressDescriptor`            | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Address (ADR microformat)       | `adrFormatAddress`             | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Allows dogs                     | `allowsDogs`                   | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Attributions                    | `attributions`                 | Place Details Essentials (IDs Only)   | Text Search Essentials (IDs Only)   | Nearby Search Pro
Business status                 | `businessStatus`               | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Containing places               | `containingPlaces`             | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Curbside pickup                 | `curbsidePickup`               | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Current opening hours           | `currentOpeningHours`          | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Current secondary opening hours | `currentSecondaryOpeningHours` | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Delivery                        | `delivery`                     | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Dine in                         | `dineIn`                       | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Display name                    | `displayName`                  | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Editorial summary               | `editorialSummary`             | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
AI-powered EVCS amenity summary | `evChargeAmenitySummary`       | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
EV charging options             | `evChargeOptions`              | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Formatted address               | `formattedAddress`             | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Fuel options                    | `fuelOptions`                  | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
AI-powered place summary        | `generativeSummary`            | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Good for children               | `goodForChildren`              | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Good for groups                 | `goodForGroups`                | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Good for watching sports        | `goodForWatchingSports`        | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Google Maps links               | `googleMapsLinks`              | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Google Maps URI                 | `googleMapsUri`                | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Icon background color           | `iconBackgroundColor`          | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Icon mask base URI              | `iconMaskBaseUri`              | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
International phone number      | `internationalPhoneNumber`     | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Live music                      | `liveMusic`                    | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Location                        | `location`                     | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Menu for children               | `menuForChildren`              | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Name                            | `name`                         | Place Details Essentials (IDs Only)   | Text Search Essentials (IDs Only)   | Nearby Search Pro
National phone number           | `nationalPhoneNumber`          | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
AI-powered neighborhood summary | `neighborhoodSummary`          | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Next page token                 | `nextPageToken`                | -                                     | Text Search Essentials (IDs Only)   | -
Opening date                    | `openingDate`                  | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Outdoor seating                 | `outdoorSeating`               | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Parking options                 | `parkingOptions`               | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Payment options                 | `paymentOptions`               | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Photos                          | `photos`                       | Place Details Essentials (IDs Only)   | Text Search Pro                     | Nearby Search Pro
Place ID                        | `id`                           | Place Details Essentials (IDs Only)   | Text Search Essentials (IDs Only)   | Nearby Search Pro
Plus code                       | `plusCode`                     | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Postal address                  | `postalAddress`                | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Price level                     | `priceLevel`                   | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Price range                     | `priceRange`                   | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Primary type                    | `primaryType`                  | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Primary type display name       | `primaryTypeDisplayName`       | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Pure service area business      | `pureServiceAreaBusiness`      | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Rating                          | `rating`                       | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Regular opening hours           | `regularOpeningHours`          | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Regular secondary opening hours | `regularSecondaryOpeningHours` | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
Reservable                      | `reservable`                   | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Restroom                        | `restroom`                     | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Reviews                         | `reviews`                      | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
AI-powered review summary       | `reviewSummary`                | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Routing summaries               | `routingSummaries`             | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves beer                     | `servesBeer`                   | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves breakfast                | `servesBreakfast`              | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves brunch                   | `servesBrunch`                 | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves cocktails                | `servesCocktails`              | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves coffee                   | `servesCoffee`                 | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves dessert                  | `servesDessert`                | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves dinner                   | `servesDinner`                 | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves lunch                    | `servesLunch`                  | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves vegetarian food          | `servesVegetarianFood`         | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Serves wine                     | `servesWine`                   | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Short formatted address         | `shortFormattedAddress`        | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Sub-destinations                | `subDestinations`              | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Types                           | `types`                        | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Takeout                         | `takeout`                      | Place Details Enterprise + Atmosphere | Text Search Enterprise + Atmosphere | Nearby Search Enterprise + Atmosphere
Time zone                       | `timeZone`                     | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Transit station                 | `transitStation`               | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
User rating count               | `userRatingCount`              | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise
UTC offset (minutes)            | `utcOffsetMinutes`             | Place Details Pro                     | Text Search Pro                     | Nearby Search Pro
Viewport                        | `viewport`                     | Place Details Essentials              | Text Search Pro                     | Nearby Search Pro
Website URI                     | `websiteUri`                   | Place Details Enterprise              | Text Search Enterprise              | Nearby Search Enterprise

## Gotchas

*   **Mandatory Field Mask:** If the field mask is omitted or empty, the API
    call will return an error. You must specify at least one field to execute
    the request successfully (Source: Introduction).
*   **Billing Implications:** Fields are grouped into various SKUs (Essentials,
    Pro, Enterprise, Enterprise + Atmosphere). Requesting any single field from
    a higher-tier SKU will cause the entire request to be billed at that higher
    rate. Carefully select the minimum required fields to control costs.
*   **External Policy Disclosure (EEA):** Developers with billing addresses in
    the European Economic Area (EEA) must be aware that effective 8 July 2025,
    the
    [Google Maps Platform EEA Terms of Service](https://cloud.google.com/terms/maps-platform/eea?utm_campaign=gmp_git_agentskills_v1)
    will apply to service usage. Functionality may vary by region (Source:
    European Economic Area (EEA) developers).

### References

*   https://developers.google.com/maps/documentation/places/web-service/data-fields
*   https://developers.google.com/maps/documentation/places/web-service/place-details
*   https://developers.google.com/maps/documentation/places/web-service/text-search
*   https://developers.google.com/maps/documentation/places/web-service/nearby-search
*   https://cloud.google.com/terms/maps-platform/eea
*   https://developers.google.com/maps/billing-and-pricing/sku-details

## See Also

> Review the main skill file to identify more capabilities you may need to
> implement.
