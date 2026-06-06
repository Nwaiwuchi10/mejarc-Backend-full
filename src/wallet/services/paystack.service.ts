import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';

interface BankResolveResponse {
  status: boolean;
  message: string;
  data?: {
    account_name: string;
  };
}

interface TransferRecipientResponse {
  status: boolean;
  message: string;
  data?: {
    recipient_code: string;
    domain: string;
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
    active: boolean;
  };
}

interface TransferResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    source_details: string;
    recipient: number;
    status: string;
    transfer_code: string;
    reason: string;
    recipient_summary: {
      recipient_code: string;
      recipient_name: string;
      bank_code: string;
      account_number: string;
    };
    fees: number;
    paid_at: string;
    paidAt: string;
    created_at: string;
    createdAt: string;
    updated_at: string;
    updatedAt: string;
  };
}

@Injectable()
export class PaystackService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl = 'https://api.paystack.co';

  constructor() {
    this.apiKey = process.env.PAYSTACK_SECRET_KEY || '';

    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'PAYSTACK_SECRET_KEY is not configured',
      );
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verify bank account details using Paystack Bank Resolution API
   * @param accountNumber - Bank account number
   * @param bankCode - Bank code (e.g., "058" for GTBank)
   * @returns Account holder name if verified
   */
  async verifyBankAccount(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string }> {
    try {
      const response = await this.client.get<BankResolveResponse>(
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          `Account verification failed: ${response.data.message}`,
        );
      }

      return {
        accountName: response.data.data?.account_name || 'Unknown',
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Bank verification failed';
      throw new BadRequestException(`Bank verification error: ${message}`);
    }
  }

  /**
   * Create a transfer recipient for automated transfers
   * @param recipientData - Recipient details
   * @returns Recipient code for future transfers
   */
  async createTransferRecipient(recipientData: {
    name: string;
    accountNumber: string;
    bankCode: string;
    type?: string;
    currency?: string;
  }): Promise<{ recipientCode: string }> {
    try {
      const payload = {
        type: recipientData.type || 'nuban',
        name: recipientData.name,
        account_number: recipientData.accountNumber,
        bank_code: recipientData.bankCode,
        currency: recipientData.currency || 'NGN',
      };

      const response = await this.client.post<TransferRecipientResponse>(
        '/transferrecipient',
        payload,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          `Recipient creation failed: ${response.data.message}`,
        );
      }

      return {
        recipientCode: response.data.data?.recipient_code || '',
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Recipient creation failed';
      throw new BadRequestException(`Paystack error: ${message}`);
    }
  }

  /**
   * Initiate a transfer to a recipient's bank account
   * Amount must be in smallest unit (Kobo for NGN: ₦20,000 = 2,000,000 Kobo)
   * @param recipientCode - Paystack recipient code
   * @param amountInKobo - Amount in Kobo (smallest unit)
   * @param reason - Transfer reason/description
   * @returns Transfer reference and code
   */
  async initiateTransfer(
    recipientCode: string,
    amountInKobo: number,
    reason: string = 'Vendor Withdrawal',
  ): Promise<{
    reference: string;
    transferCode: string;
    amount: number;
    status: string;
  }> {
    try {
      const payload = {
        source: 'balance',
        amount: amountInKobo,
        recipient: recipientCode,
        reason: reason,
      };

      const response = await this.client.post<TransferResponse>(
        '/transfer',
        payload,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          `Transfer initiation failed: ${response.data.message}`,
        );
      }

      const transferData = response.data.data;
      return {
        reference: transferData?.reference || '',
        transferCode: transferData?.transfer_code || '',
        amount: transferData?.amount || 0,
        status: transferData?.status || 'pending',
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Transfer initiation failed';
      throw new BadRequestException(`Transfer error: ${message}`);
    }
  }

  /**
   * Verify webhook signature from Paystack
   * @param payload - Raw request body as string
   * @param signature - X-Paystack-Signature header value
   * @returns true if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.apiKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  /**
   * Parse and validate webhook event
   * @param event - Webhook event data
   * @returns Parsed event with validation
   */
  parseWebhookEvent(event: any): {
    eventType: string;
    transferReference: string;
    transferCode: string;
    amount: number;
    status: string;
    recipientCode: string;
    reason: string;
    createdAt: string;
  } {
    const data = event.data || {};
    return {
      eventType: event.event || '',
      transferReference: data.reference || '',
      transferCode: data.transfer_code || '',
      amount: data.amount || 0,
      status: data.status || '',
      recipientCode: data.recipient?.recipient_code || '',
      reason: data.reason || '',
      createdAt: data.created_at || new Date().toISOString(),
    };
  }

  /**
   * Convert Naira amount to Kobo (multiply by 100)
   * Ensures proper decimal handling
   * @param amountInNaira - Amount in Nigerian Naira
   * @returns Amount in Kobo
   */
  convertToKobo(amountInNaira: number): number {
    // Multiply by 100 to convert Naira to Kobo
    // Use Math.round to avoid floating-point precision issues
    return Math.round(amountInNaira * 100);
  }

  /**
   * Convert Kobo amount to Naira
   * @param amountInKobo - Amount in Kobo
   * @returns Amount in Naira
   */
  convertToNaira(amountInKobo: number): number {
    return Math.round((amountInKobo / 100) * 100) / 100;
  }

  /**
   * Get transfer details from Paystack
   * @param transferCode - Transfer code to lookup
   * @returns Transfer details
   */
  async getTransferDetails(transferCode: string): Promise<{
    reference: string;
    amount: number;
    status: string;
    reason: string;
  }> {
    try {
      const response = await this.client.get(
        `/transfer/verify/${transferCode}`,
      );

      if (!response.data.status) {
        throw new BadRequestException(
          `Transfer lookup failed: ${response.data.message}`,
        );
      }

      const data = response.data.data;
      return {
        reference: data?.reference || '',
        amount: data?.amount || 0,
        status: data?.status || '',
        reason: data?.reason || '',
      };
    } catch (error: any) {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Transfer lookup failed';
      throw new BadRequestException(`Transfer lookup error: ${message}`);
    }
  }

  /**
   * List banks available on Paystack for account resolution
   * Useful for frontend dropdowns
   * @returns List of banks with codes
   */
  async getBankList(): Promise<
    Array<{ code: string; name: string; longname: string }>
  > {
    try {
      const response = await this.client.get('/bank');
      if (!response.data.status) {
        throw new BadRequestException('Failed to fetch bank list');
      }

      return response.data.data || [];
    } catch (error: any) {
      throw new BadRequestException('Failed to fetch banks');
    }
  }
}
