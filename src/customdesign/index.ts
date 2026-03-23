/**
 * Custom Design Module Exports
 * Central export point for all customdesign module components
 */

// Types & Enums
export {
  ServiceType,
  SelectionMethod,
  CustomDesignStatus,
  ServiceContextOption,
  ProjectTypeOption,
  ScopePackage,
  ScopeAddon,
  SizeOption,
  StyleOption,
  ServiceConfig,
} from './customdesign.types';

// Entities
export { CustomDesign } from './entities/customdesign.entity';

// DTOs
export {
  ServiceContextStepDto,
  ProjectTypeStepDto,
  ScopeDeliverableStepDto,
  SizeComplexityStepDto,
  StyleStepDto,
  BudgetTimelineStepDto,
  CreateCustomDesignDto,
  UpdateCustomDesignDto,
  UpdateCustomDesignStepDto,
  AttachFilesDto,
  CustomDesignResponseDto,
  ListCustomDesignsQueryDto,
  ValidateCustomDesignStepDto,
} from './dto/customdesign.dto';

// Service & Controller
export { CustomDesignService } from './customdesign.service';
export { CustomDesignController } from './customdesign.controller';

// Module
export { CustomDesignModule } from './customdesign.module';

// Configurations
export {
  LANDSCAPE_DESIGN_CONFIG,
  INTERIOR_DESIGN_CONFIG,
  RENDERING_3D_CONFIG,
  ARCHITECTURAL_2D_CONFIG,
  BIM_CONFIG,
  MEP_DRAWINGS_CONFIG,
  STRUCTURAL_ENGINEERING_CONFIG,
  SERVICE_CONFIGS,
  getServiceConfig,
} from './config/services.config';
