/**
 * Custom Design Resource Types
 * Enums and interfaces for all 8 service types
 */

export enum ServiceType {
  LANDSCAPE_DESIGN = 'landscape-design',
  INTERIOR_DESIGN = 'interior-design',
  PRODUCT_DESIGN = 'product-design',
  RENDERING_3D = '3d-rendering',
  ARCHITECTURAL_2D = '2d-architectural',
  BIM = 'building-information-modeling',
  MEP_DRAWINGS = 'mep-drawings',
  STRUCTURAL_ENGINEERING = 'structural-engineering',
}

export enum SelectionMethod {
  MANUAL = 'manual',
  TEMPLATE = 'template',
  AI_ADVICE = 'ai-advice',
  CONTEST = 'contest',
  HIRE_PRO = 'hire_pro',
  FIXED_QUOTE = 'fixed_quote',
}

export enum CustomDesignStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
  REVISION = 'revision',
}

export interface ServiceContextOption {
  title: string;
  description: string;
}

export interface ProjectTypeOption {
  title: string;
  description: string;
}

export interface ScopePackage {
  title: string;
  description: string;
}

export interface ScopeAddon {
  title: string;
  description: string;
}

export interface SizeOption {
  title: string;
  description: string;
}

export interface StyleOption {
  title: string;
  description: string;
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
}

export enum ActivityType {
  UPLOAD = 'upload',
  MESSAGE = 'message',
  MILESTONE = 'milestone',
  COMPLETED = 'completed',
  REVISION = 'revision',
}

export interface ServiceConfig {
  serviceType: ServiceType;
  serviceName: string;
  contexts: ServiceContextOption[];
  projectTypes: ProjectTypeOption[];
  scopes: ScopePackage[];
  addons: ScopeAddon[];
  sizes: SizeOption[];
  styles: StyleOption[];
  minimumBudget: number;
  currency: string;
}
