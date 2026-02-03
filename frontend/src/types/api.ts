export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ColumnMapping {
  id?: number;
  name: string;
  name_column: string | null;
  phone_column: string | null;
  email_column: string | null;
  group_column: string | null;
  business_column: string | null;
  created_at?: string;
}

export interface CentralizatorMapping {
  id?: number;
  name: string;
  school_name_column: string | null;
  address_column: string | null;
  protocol_number_column: string | null;
  created_at?: string;
}

export interface ExcelSheet {
  name: string;
  headers: string[];
  rowCount: number;
  totalRows: number;
  preview: Array<{
    rowNumber: number;
    cells: any[];
  }>;
}

export interface UploadResponse {
  success: boolean;
  fileId: string;
  fileName: string;
  sheets: ExcelSheet[];
}

export interface UploadedFile {
  fileId: string;
  originalName: string;
  uploadedAt: string;
  sizeBytes: number | null;
}

export interface ProtocolDataRow {
  id: number;
  originalRowNumber: number;
  data: Record<string, any>;
}

export interface ProtocolDataResponse {
  success: boolean;
  headers: string[];
  rows: ProtocolDataRow[];
  totalRows: number;
}

