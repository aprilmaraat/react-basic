// Category model based on OpenAPI CategoryRead / CategoryReadSimple
export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface CategoryCreatePayload {
  name: string;
  description?: string | null;
}

export interface CategoryUpdatePayload {
  name?: string | null;
  description?: string | null;
}
