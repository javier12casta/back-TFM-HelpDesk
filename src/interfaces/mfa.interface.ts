export interface MFAResponse {
  success: boolean;
  data?: {
    secret?: string;
    otpauthUrl?: string;
    qrCodeUrl?: string;
    verified?: boolean;
  };
  message?: string;
}

export interface MFAVerifyRequest {
  userId: string;
  token: string;
} 