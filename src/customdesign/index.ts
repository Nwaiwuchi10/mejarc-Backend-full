/**
 * Custom Design Module Exports
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

// Entity
export { CustomDesign } from './entities/customdesign.entity';

// DTOs
export {
  InitializeCustomDesignDto,
  SaveStepDto,
  SubmitCustomDesignDto,
  UpdateCustomDesignDto,
  ListCustomDesignsQueryDto,
  ReviewCustomDesignDto,
  CustomDesignResponseDto,
} from './dto/customdesign.dto';

// Service, Controller & Module
export { CustomDesignService } from './customdesign.service';
export { CustomDesignController } from './customdesign.controller';
export { CustomDesignModule } from './customdesign.module';

// Configurations
export {
  LANDSCAPE_DESIGN_CONFIG,
  PRODUCT_DESIGN_CONFIG,
  INTERIOR_DESIGN_CONFIG,
  RENDERING_3D_CONFIG,
  ARCHITECTURAL_2D_CONFIG,
  BIM_CONFIG,
  MEP_DRAWINGS_CONFIG,
  STRUCTURAL_ENGINEERING_CONFIG,
  SERVICE_CONFIGS,
  getServiceConfig,
} from './config/services.config';
