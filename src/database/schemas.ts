import { Schema } from 'mongoose';
import { registerSchema } from './database.module';

// Helper to create flexible schemas with id, timestamps and virtuals
function createEntitySchema(definition: any = {}) {
  const schema = new Schema(
    {
      id: { type: String, unique: true, sparse: true, index: true },
      ...definition,
    },
    {
      timestamps: true,
      strict: false,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
      id: false,
    },
  );
  return schema;
}

// User module schemas
const UserSchema = createEntitySchema({
  email: { type: String, unique: true, index: true },
  phoneNumber: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  password: { type: String },
  address: { type: Schema.Types.Mixed },
  notificationSettings: { type: Schema.Types.Mixed },
});
registerSchema('User', UserSchema);

const UserAddressSchema = createEntitySchema();
registerSchema('UserAddress', UserAddressSchema);

const UserNotificationSettingSchema = createEntitySchema();
registerSchema('UserNotificationSetting', UserNotificationSettingSchema);

// Admin module schemas
const AdminSchema = createEntitySchema({
  userId: { type: String, index: true },
  user: { type: Schema.Types.Mixed },
  isActive: { type: Boolean, default: true },
  isAdmin: { type: Boolean, default: true },
});
registerSchema('Admin', AdminSchema);

// Agent module schemas
const AgentSchema = createEntitySchema({
  userId: { type: String, index: true },
  vendorId: { type: String, unique: true, sparse: true, index: true },
  user: { type: Schema.Types.Mixed },
  profile: { type: Schema.Types.Mixed },
  bioRecord: { type: Schema.Types.Mixed },
  kycRecords: { type: [Schema.Types.Mixed], default: [] },
  wallet: { type: Schema.Types.Mixed },
  status: { type: String },
  pendingProfileChange: { type: Schema.Types.Mixed },
});
registerSchema('Agent', AgentSchema);

const AgentProfileSchema = createEntitySchema({
  agentId: { type: String, index: true },
});
registerSchema('AgentProfile', AgentProfileSchema);

const AgentBioSchema = createEntitySchema({
  agentId: { type: String, index: true },
  bio: { type: String },
});
registerSchema('AgentBio', AgentBioSchema);

const AgentKycSchema = createEntitySchema({
  agentId: { type: String, index: true },
});
registerSchema('AgentKyc', AgentKycSchema);

// Market Product schemas
const MarketProductSchema = createEntitySchema({
  agentId: { type: String, index: true },
  productId: { type: String, unique: true, sparse: true, index: true },
  status: { type: String, index: true },
  ratings: { type: [Schema.Types.Mixed], default: [] },
});
registerSchema('MarketProduct', MarketProductSchema);

const RatingSchema = createEntitySchema({
  productId: { type: String, index: true },
  userId: { type: String, index: true },
});
registerSchema('Rating', RatingSchema);

// Order schemas
const OrderSchema = createEntitySchema({
  userId: { type: String, index: true },
  orderItems: { type: [Schema.Types.Mixed], default: [] },
});
registerSchema('Order', OrderSchema);

const OrderItemSchema = createEntitySchema({
  orderId: { type: String, index: true },
  productId: { type: String, index: true },
});
registerSchema('OrderItem', OrderItemSchema);

// Contact schema
const ContactInquirySchema = createEntitySchema({
  email: { type: String },
  phone: { type: String },
});
registerSchema('ContactInquiry', ContactInquirySchema);

// Chat schemas
const ConversationSchema = createEntitySchema({
  members: { type: [Schema.Types.Mixed], default: [] },
  lastMessage: { type: Schema.Types.Mixed },
});
registerSchema('Conversation', ConversationSchema);

const ConversationMemberSchema = createEntitySchema({
  conversationId: { type: String, index: true },
  userId: { type: String, index: true },
});
registerSchema('ConversationMember', ConversationMemberSchema);

const MessageSchema = createEntitySchema({
  conversationId: { type: String, index: true },
  senderId: { type: String, index: true },
});
registerSchema('Message', MessageSchema);

// Notification schema
const NotificationSchema = createEntitySchema({
  userId: { type: String, index: true },
  isRead: { type: Boolean, default: false },
});
registerSchema('Notification', NotificationSchema);

// Wallet schemas
const WalletSchema = createEntitySchema({
  agentId: { type: String, index: true },
  balance: { type: Number, default: 0 },
});
registerSchema('Wallet', WalletSchema);

const WalletTransactionSchema = createEntitySchema({
  walletId: { type: String, index: true },
});
registerSchema('WalletTransaction', WalletTransactionSchema);

const WithdrawalRequestSchema = createEntitySchema({
  agentId: { type: String, index: true },
  status: { type: String, index: true },
});
registerSchema('WithdrawalRequest', WithdrawalRequestSchema);

const SystemSettingSchema = createEntitySchema({
  key: { type: String, unique: true, index: true },
});
registerSchema('SystemSetting', SystemSettingSchema);

const WithdrawalAuditLogSchema = createEntitySchema({
  agentId: { type: String, index: true },
  withdrawalId: { type: String, index: true },
});
registerSchema('WithdrawalAuditLog', WithdrawalAuditLogSchema);

const BankAccountSchema = createEntitySchema({
  agentId: { type: String, index: true },
  isDefault: { type: Boolean, default: false },
});
registerSchema('BankAccount', BankAccountSchema);

// Custom Design schemas
const CustomDesignSchema = createEntitySchema({
  userId: { type: String, index: true },
  agentId: { type: String, index: true },
  status: { type: String, index: true },
});
registerSchema('CustomDesign', CustomDesignSchema);

const CustomDesignPaymentSchema = createEntitySchema({
  customDesignId: { type: String, index: true },
  status: { type: String, index: true },
});
registerSchema('CustomDesignPayment', CustomDesignPaymentSchema);

const ProjectMilestoneSchema = createEntitySchema({
  customDesignId: { type: String, index: true },
});
registerSchema('ProjectMilestone', ProjectMilestoneSchema);

const ProjectActivitySchema = createEntitySchema({
  customDesignId: { type: String, index: true },
});
registerSchema('ProjectActivity', ProjectActivitySchema);

const ProjectFileSchema = createEntitySchema({
  customDesignId: { type: String, index: true },
});
registerSchema('ProjectFile', ProjectFileSchema);

