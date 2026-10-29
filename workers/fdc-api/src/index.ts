import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  FDC_API_KEY: string;
  FIREBASE_PROJECT_ID: string;
  ALLOWED_ORIGINS: string;
  FDC_LIMITER: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
}

interface FdcRequest {
  action?: unknown;
  query?: unknown;
  dataType?: unknown;
  pageNumber?: unknown;
  fdcId?: unknown;
}

const supportedDataTypes = ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"] as const;
type FdcDataType = typeof supportedDataTypes[number];

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const supportedNutrients = new Set([
  "208", "1008", "2047", "601", "203", "204", "205", "291", "269",
    "606", "645", "646", "851",
  "320", "328", "323", "430", "401", "404", "405", "406", "410",
  "415", "416", "417", "418", "421", "301", "305", "304", "307", "306",
  "303", "309", "317", "312", "315",
]);

function corsHeaders(origin: string, env: Env): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  });
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim());
  if (allowedOrigins.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function jsonResponse(body: unknown, status: number, headers: Headers): Response {
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

async function searchFdc(
  query: string,
  dataType: FdcDataType,
  pageNumber: number,
  apiKey: string,
): Promise<{ dataType: FdcDataType; totalHits: number; currentPage: number; totalPages: number; foods: Array<Record<string, unknown>> }> {
  const apiUrl = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  apiUrl.searchParams.set("api_key", apiKey);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, dataType: [dataType], pageSize: 12, pageNumber }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(String(response.status));

  const result = await response.json() as {
    totalHits?: number;
    currentPage?: number;
    totalPages?: number;
    foods?: Array<Record<string, unknown>>;
  };

  return {
    dataType,
    totalHits: result.totalHits ?? 0,
    currentPage: result.currentPage ?? pageNumber,
    totalPages: result.totalPages ?? 0,
    foods: Array.isArray(result.foods) ? result.foods : [],
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") ?? "";
    const headers = corsHeaders(origin, env);
    const hasCorsAccess = headers.has("Access-Control-Allow-Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: hasCorsAccess ? 204 : 403, headers });
    }
    if (!hasCorsAccess) return jsonResponse({ error: "Origin is not allowed." }, 403, headers);
    if (request.method !== "POST") return jsonResponse({ error: "Use POST to search foods." }, 405, headers);

    const authorization = request.headers.get("Authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return jsonResponse({ error: "Sign in to search foods." }, 401, headers);

    let uid: string;
    try {
      const { payload } = await jwtVerify(token, firebaseKeys, {
        issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
        audience: env.FIREBASE_PROJECT_ID,
        algorithms: ["RS256"],
      });
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        return jsonResponse({ error: "Invalid sign-in token." }, 401, headers);
      }
      uid = payload.sub;
    } catch {
      return jsonResponse({ error: "Your sign-in has expired. Sign in again." }, 401, headers);
    }

    const rateLimit = await env.FDC_LIMITER.limit({ key: uid });
    if (!rateLimit.success) {
      return jsonResponse({ error: "Too many food searches. Wait a minute and try again." }, 429, headers);
    }

    let body: FdcRequest;
    try {
      body = await request.json() as FdcRequest;
    } catch {
      return jsonResponse({ error: "Request body must be valid JSON." }, 400, headers);
    }

    if (body.action === "details") {
      const fdcId = Number(body.fdcId);
      if (!Number.isInteger(fdcId) || fdcId < 1) {
        return jsonResponse({ error: "A valid USDA food ID is required." }, 400, headers);
      }

      const detailsUrl = new URL(`https://api.nal.usda.gov/fdc/v1/food/${fdcId}`);
      detailsUrl.searchParams.set("api_key", env.FDC_API_KEY);
      try {
        const response = await fetch(detailsUrl, { signal: AbortSignal.timeout(10000) });
        if (response.status === 404) return jsonResponse({ error: "USDA food details were not found." }, 404, headers);
        if (response.status === 429) return jsonResponse({ error: "USDA food search is temporarily rate-limited." }, 429, headers);
        if (!response.ok) return jsonResponse({ error: "USDA food details could not be loaded." }, 502, headers);

        const food = await response.json() as Record<string, unknown>;
        const foodCategory = food.foodCategory as Record<string, unknown> | undefined;
        const wweiaFoodCategory = food.wweiaFoodCategory as Record<string, unknown> | undefined;
        const foodNutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
        const foodPortions = Array.isArray(food.foodPortions) ? food.foodPortions : [];
        const foodAttributes = Array.isArray(food.foodAttributes) ? food.foodAttributes : [];
        const foodComponents = Array.isArray(food.foodComponents) ? food.foodComponents : [];
        return jsonResponse({
          food: {
            fdcId: food.fdcId,
            description: food.description,
            dataType: food.dataType,
            foodClass: food.foodClass,
            foodCategory: foodCategory?.description ?? food.brandedFoodCategory,
            brandOwner: food.brandOwner,
            gtinUpc: food.gtinUpc,
            ingredients: food.ingredients,
            publicationDate: food.publicationDate,
            modifiedDate: food.modifiedDate,
            wweiaFoodCategory: wweiaFoodCategory?.wweiaFoodCategoryDescription,
            servingSize: food.servingSize,
            servingSizeUnit: food.servingSizeUnit,
            householdServingFullText: food.householdServingFullText,
            foodNutrients: foodNutrients.map((entry) => {
              const nutrientEntry = entry as Record<string, unknown>;
              const nutrient = nutrientEntry.nutrient as Record<string, unknown> | undefined;
              const derivation = nutrientEntry.foodNutrientDerivation as Record<string, unknown> | undefined;
              return {
                id: nutrientEntry.id,
                nutrientNumber: nutrient?.number ?? nutrientEntry.nutrientNumber,
                nutrientName: nutrient?.name ?? nutrientEntry.nutrientName,
                value: nutrientEntry.amount ?? nutrientEntry.value,
                unitName: nutrient?.unitName ?? nutrientEntry.unitName,
                derivation: derivation?.description,
              };
            }),
            foodAttributes: foodAttributes.map((entry) => {
              const attribute = entry as Record<string, unknown>;
              const type = attribute.foodAttributeType as Record<string, unknown> | undefined;
              return {
                name: type?.name ?? "Food attribute",
                value: attribute.value,
                description: type?.description,
              };
            }),
            foodComponents: foodComponents.map((entry) => {
              const component = entry as Record<string, unknown>;
              return {
                name: component.name,
                gramWeight: component.gramWeight,
                percentWeight: component.percentWeight,
                dataPoints: component.dataPoints,
                isRefuse: component.isRefuse,
              };
            }),
            portions: foodPortions.map((entry, index) => {
              const portion = entry as Record<string, unknown>;
              const measureUnit = portion.measureUnit as Record<string, unknown> | undefined;
              const amount = Number(portion.amount);
              const gramWeight = Number(portion.gramWeight);
              const description = typeof portion.portionDescription === "string" ? portion.portionDescription.trim() : "";
              const modifier = typeof portion.modifier === "string" ? portion.modifier.trim() : "";
              const unitName = typeof measureUnit?.name === "string" ? measureUnit.name : "";
              const label = description || [Number.isFinite(amount) && amount !== 1 ? amount : "1", modifier || unitName || "portion"].filter(Boolean).join(" ");
              return {
                id: String(portion.id ?? portion.sequenceNumber ?? index),
                label,
                gramWeight,
              };
            }).filter((portion) => portion.label && Number.isFinite(portion.gramWeight) && portion.gramWeight > 0),
          },
        }, 200, headers);
      } catch {
        return jsonResponse({ error: "USDA food details could not be reached. Try again shortly." }, 502, headers);
      }
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    if (query.length < 2 || query.length > 120) {
      return jsonResponse({ error: "Search must be between 2 and 120 characters." }, 400, headers);
    }
    const dataType = body.dataType;
    if (dataType !== undefined && !supportedDataTypes.includes(dataType as FdcDataType)) {
      return jsonResponse({ error: "Unsupported USDA food type." }, 400, headers);
    }
    const pageNumber = body.pageNumber === undefined ? 1 : Number(body.pageNumber);
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 10000) {
      return jsonResponse({ error: "Page number must be a positive integer." }, 400, headers);
    }

    try {
      const dataTypes = dataType
        ? [dataType as FdcDataType]
        : supportedDataTypes.filter((type) => type !== "SR Legacy");
      const categories = await Promise.all(dataTypes.map((type) => searchFdc(query, type, pageNumber, env.FDC_API_KEY)));
      const mapped = categories.map((category) => ({
        ...category,
        foods: category.foods.map((food) => ({
          fdcId: food.fdcId,
          description: food.description,
          dataType: food.dataType,
          foodCategory: food.foodCategory,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          householdServingFullText: food.householdServingFullText,
          foodNutrients: Array.isArray(food.foodNutrients)
            ? food.foodNutrients.filter((nutrient) =>
                supportedNutrients.has(String((nutrient as Record<string, unknown>).nutrientNumber)),
              )
            : [],
        })),
      }));
      return jsonResponse({ categories: mapped }, 200, headers);
    } catch (error) {
      if (error instanceof Error && error.message === "429") {
        return jsonResponse({ error: "USDA food search is temporarily rate-limited." }, 429, headers);
      }
      if (error instanceof Error && error.message !== "") {
        return jsonResponse({ error: "FoodData Central returned an error. Try again shortly." }, 502, headers);
      }
      return jsonResponse({ error: "FoodData Central could not be reached. Try again shortly." }, 502, headers);
    }
  },
};