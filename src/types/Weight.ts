// Weight model based on OpenAPI WeightRead / WeightReadSimple
export interface Weight {
  id: number;
  name: string;
  description?: string | null;
}

export interface WeightCreatePayload {
  name: string;
  description?: string | null;
}

export interface WeightUpdatePayload {
  name?: string | null;
  description?: string | null;
}
