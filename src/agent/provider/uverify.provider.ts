import axios from 'axios';
import { IKycProvider } from './kyc.provider';

export class UverifyKycProvider implements IKycProvider {
  private baseUrl =
    process.env.UVERIFY_BASE_URL ||
    'https://api.uverify.com.ng/v1/rest-api/verification';
  private apiKey = process.env.UVERIFY_API_KEY;
  private apiSecret = process.env.UVERIFY_API_SECRET;

  constructor() {}

  async verifyDocuments(
    documents: { key: string; url: string; name?: string }[],
  ) {
    try {
      // uVerify NIN verification expects payload containing NIN or document info.
      // We'll send the first document url and any metadata. Adjust according to uVerify spec.
      const payload: any = {
        // adapt field names to their API; here we provide a flexible payload
        documents: documents.map((d) => ({
          url: d.url,
          name: d.name,
          key: d.key,
        })),
      };

      const url = `${this.baseUrl}/nin`;
      const headers: any = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) headers['x-api-key'] = this.apiKey;
      if (this.apiSecret) headers['x-api-secret'] = this.apiSecret;

      const resp = await axios.post(url, payload, { headers, timeout: 20000 });

      // Interpret response generically
      if (resp && resp.data) {
        const success =
          resp.data.status === 'success' ||
          resp.data.success === true ||
          resp.status === 200;
        return {
          success,
          providerId: resp.data.requestId || resp.data.reference || undefined,
          notes: JSON.stringify(resp.data),
        };
      }

      return { success: false, notes: 'Empty response' };
    } catch (err: any) {
      return { success: false, notes: err?.response?.data || err.message };
    }
  }
}
