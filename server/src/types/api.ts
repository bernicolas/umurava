export interface ApiResponse<T = unknown> {
   success: boolean;
   data?: T;
   message?: string;
   errors?: Record<string, string[]>;
}

export interface PaginationMeta {
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}

export interface PaginatedResponse<T> {
   items: T[];
   meta: PaginationMeta;
}

export interface AuthPayload {
   userId: string;
   email: string;
   role: "candidate" | "recruiter" | "admin";
}
