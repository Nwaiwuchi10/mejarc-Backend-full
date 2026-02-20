export interface IKycProvider {
  verifyDocuments(
    documents: { key: string; url: string; name?: string }[],
  ): Promise<{ success: boolean; providerId?: string; notes?: string }>;
}

export class DummyKycProvider implements IKycProvider {
  async verifyDocuments() {
    // Placeholder: in real integration call third-party KYC API
    return { success: true, providerId: 'dummy-000', notes: 'auto-verified' };
  }
}
