/**
 * Custom Design Service Configurations
 * Centralized configurations for all 8 service types
 */

import { ServiceType, ServiceConfig } from '../customdesign.types';

export const LANDSCAPE_DESIGN_CONFIG: ServiceConfig = {
  serviceType: ServiceType.LANDSCAPE_DESIGN,
  serviceName: 'Landscape Design',
  contexts: [
    {
      title: 'Residential Garden Design',
      description:
        'For private homes front yards, backyards, or personal gardens.',
    },
    {
      title: 'Commercial Landscaping',
      description:
        'For estates, office complexes, or business environments that need a clean, professional outdoor look.',
    },
    {
      title: 'Resort or Hospitality',
      description:
        'For hotels, resorts, or guest lodges where outdoor beauty adds to guest experience.',
    },
    {
      title: 'Public Park',
      description:
        'For open public areas meant for relaxation, recreation, or community use.',
    },
  ],
  projectTypes: [
    {
      title: 'Front / Backyard Garden',
      description:
        'Focused on personal house surroundings beautifying entrances or relaxation gardens.',
    },
    {
      title: 'Courtyard / Terrace Landscape',
      description:
        'For smaller spaces like rooftop terraces, inner courtyards, or patios.',
    },
    {
      title: 'Estate Green Area',
      description:
        'Common areas within estates lawns, walkways, or shared greenery.',
    },
    {
      title: 'Public Park / Outdoor Space',
      description:
        'Large-scale open areas for the public, with paths, seating, or playgrounds.',
    },
  ],
  scopes: [
    {
      title: 'Basic Package',
      description:
        'Site layout plan, softscape & hardscape concept, planting layout.',
    },
    {
      title: 'Intermediate Package',
      description: 'Full planting plan, paving & lighting layout, 3D visuals',
    },
    {
      title: 'Advanced Package',
      description:
        'Complete design, implementation plan, maintenance guide, 3D and 2D visuals',
    },
  ],
  addons: [
    {
      title: '3D Walkthrough Animation',
      description: 'Interactive 3D walkthrough of your landscape design',
    },
    {
      title: 'Furniture & Lighting Selection',
      description: 'Curated furniture and lighting recommendations',
    },
    {
      title: 'Drainage Design Integration',
      description: 'Professional drainage planning and integration',
    },
  ],
  sizes: [
    {
      title: 'Small (under 200 sqm)',
      description: 'Compact spaces — home gardens or small courtyards.',
    },
    {
      title: 'Medium (200-1000 sqm)',
      description:
        'Moderate-sized projects estates, resorts, or community spaces.',
    },
    {
      title: 'Large (1000 sqm and above)',
      description: 'Big outdoor developments like parks or resort compounds.',
    },
  ],
  styles: [
    {
      title: 'Modern',
      description:
        'Clean lines, simple layouts, and elegant plant choices — perfect for contemporary homes.',
    },
    {
      title: 'Tropical',
      description:
        'Lush greenery, bright colors, and relaxing vibes great for warm climates.',
    },
    {
      title: 'Sustainable',
      description:
        'Focuses on eco-friendly materials, native plants, and energy-efficient setups',
    },
    {
      title: 'Local Environmental & Drainage',
      description:
        'Ensures the design follows regional building and drainage rules for safety and compliance.',
    },
  ],
  minimumBudget: 500000,
  currency: '₦',
};

export const INTERIOR_DESIGN_CONFIG: ServiceConfig = {
  serviceType: ServiceType.INTERIOR_DESIGN,
  serviceName: 'Interior Design',
  contexts: [
    {
      title: 'Residential',
      description: 'Interior design for private homes and residential spaces',
    },
    {
      title: 'Commercial',
      description:
        'Design solutions for offices, retail, and commercial spaces',
    },
    {
      title: 'Hospitality',
      description:
        'Interior design for hotels, restaurants, and hospitality venues',
    },
    {
      title: 'Healthcare & Institutional',
      description:
        'Design for hospitals, clinics, schools, and institutional buildings',
    },
  ],
  projectTypes: [
    {
      title: 'Full Interior Design',
      description: 'Complete interior design for entire space or building',
    },
    {
      title: 'Room Redesign',
      description:
        'Focus on individual rooms - bedrooms, kitchens, living areas',
    },
    {
      title: 'Space Planning',
      description: 'Optimize layout and functionality for existing spaces',
    },
    {
      title: 'Styling & Decor',
      description: 'Styling refresh with furniture, colors, and accessories',
    },
  ],
  scopes: [
    {
      title: 'Concept Package',
      description:
        'Design concept, mood board, color palette, and material selection',
    },
    {
      title: 'Full Design Package',
      description:
        'Complete design with floor plans, elevations, 3D renderings',
    },
    {
      title: 'Implementation Package',
      description:
        'Design + detailed specifications, sourcing, project management',
    },
  ],
  addons: [
    {
      title: '3D Virtual Walkthrough',
      description: 'Immersive 3D visualization of the interior design',
    },
    {
      title: 'Furniture & Fixture Schedule',
      description: 'Detailed specifications and sourcing for all items',
    },
    {
      title: 'Lighting Design',
      description: 'Professional lighting plan and recommendations',
    },
  ],
  sizes: [
    {
      title: 'Small (up to 150 sqm)',
      description: 'Compact residential or small commercial spaces',
    },
    {
      title: 'Medium (150-500 sqm)',
      description: 'Standard residential homes or moderate commercial spaces',
    },
    {
      title: 'Large (500+ sqm)',
      description: 'Large residential or extensive commercial projects',
    },
  ],
  styles: [
    {
      title: 'Contemporary',
      description: 'Modern, clean lines and minimalist aesthetic',
    },
    {
      title: 'Traditional',
      description: 'Classic designs with timeless appeal and elegance',
    },
    {
      title: 'Scandinavian',
      description: 'Light, functional, and naturally inspired design',
    },
    {
      title: 'Eclectic',
      description: 'Blend of diverse styles and cultural influences',
    },
  ],
  minimumBudget: 750000,
  currency: '₦',
};

export const RENDERING_3D_CONFIG: ServiceConfig = {
  serviceType: ServiceType.RENDERING_3D,
  serviceName: '3D Rendering & Visualization',
  contexts: [
    {
      title: 'Architectural',
      description: '3D rendering for architectural visualizations and projects',
    },
    {
      title: 'Real Estate',
      description: 'Property marketing visuals and development renderings',
    },
    {
      title: 'Product',
      description: '3D visualization for product design and development',
    },
    {
      title: 'Virtual Tours',
      description: 'Interactive virtual tours and walkthroughs',
    },
  ],
  projectTypes: [
    {
      title: 'Exterior Renderings',
      description:
        'High-quality exterior building and landscape visualizations',
    },
    {
      title: 'Interior Renderings',
      description: 'Detailed interior space visualizations and room designs',
    },
    {
      title: 'Aerial Views',
      description: "Bird's eye view renderings of sites and developments",
    },
    {
      title: 'Animation & Walkthrough',
      description: 'Animated sequences and dynamic camera movements',
    },
  ],
  scopes: [
    {
      title: 'Standard Rendering',
      description: 'Single perspective high-quality 3D renderings',
    },
    {
      title: 'Multi-Perspective Package',
      description: 'Multiple angles and viewpoints with variations',
    },
    {
      title: 'Full Experience Package',
      description: 'Renderings + animation + interactive virtual tour',
    },
  ],
  addons: [
    {
      title: 'Day/Night Variants',
      description: 'Renderings showing different lighting conditions',
    },
    {
      title: 'Seasonal Variations',
      description: 'Multiple seasonal versions of the design',
    },
    {
      title: '360 Panoramic View',
      description: 'Interactive 360-degree panoramic renderings',
    },
  ],
  sizes: [
    {
      title: 'Small Project (1-5 viewpoints)',
      description: 'Limited scope with 1-5 rendering perspectives',
    },
    {
      title: 'Medium Project (6-15 viewpoints)',
      description: 'Comprehensive rendering coverage from multiple angles',
    },
    {
      title: 'Large Project (15+ viewpoints with animation)',
      description: 'Extensive rendering and animation for major developments',
    },
  ],
  styles: [
    {
      title: 'Photorealistic',
      description:
        'Ultra-realistic representations with detailed visualization',
    },
    {
      title: 'Architectural',
      description: 'Clean architectural style with emphasis on design clarity',
    },
    {
      title: 'Stylized',
      description: 'Artistic renderings with creative interpretation',
    },
    {
      title: 'Minimal',
      description: 'Minimalist representation focusing on essential elements',
    },
  ],
  minimumBudget: 800000,
  currency: '₦',
};

export const ARCHITECTURAL_2D_CONFIG: ServiceConfig = {
  serviceType: ServiceType.ARCHITECTURAL_2D,
  serviceName: '2D Architectural Drawings',
  contexts: [
    {
      title: 'Residential',
      description: 'Architectural drawings for residential buildings and homes',
    },
    {
      title: 'Commercial',
      description: 'Design drawings for commercial and office buildings',
    },
    {
      title: 'Industrial',
      description: 'Technical drawings for industrial facilities',
    },
    {
      title: 'Mixed-Use',
      description: 'Combined residential, commercial, and other uses',
    },
  ],
  projectTypes: [
    {
      title: 'Floor Plans',
      description: 'Detailed floor layout plans for all levels',
    },
    {
      title: 'Elevations',
      description: 'Front, side, and rear elevation drawings',
    },
    {
      title: 'Sections & Details',
      description: 'Cross-sections and constructional details',
    },
    {
      title: 'Site Plans',
      description: 'Overall site layout and surroundings',
    },
  ],
  scopes: [
    {
      title: 'Basic Set',
      description: 'Floor plans and basic elevations',
    },
    {
      title: 'Standard Set',
      description: 'Plans, elevations, sections, and standard details',
    },
    {
      title: 'Complete Set',
      description:
        'All drawings including detailed construction specifications',
    },
  ],
  addons: [
    {
      title: 'Building Codes Compliance',
      description: 'Drawings compliant with local building standards',
    },
    {
      title: 'Construction Details',
      description: 'Detailed construction and assembly specifications',
    },
    {
      title: 'Furniture & Fixture Plans',
      description: 'Placement drawings for furniture and fixtures',
    },
  ],
  sizes: [
    {
      title: 'Small (up to 500 sqm)',
      description: 'Single or two-level small buildings',
    },
    {
      title: 'Medium (500-2000 sqm)',
      description: 'Multi-level medium-sized buildings',
    },
    {
      title: 'Large (2000+ sqm)',
      description: 'Large complex buildings with multiple levels',
    },
  ],
  styles: [
    {
      title: 'Standard CAD',
      description: 'Professional CAD drawings in standard format',
    },
    {
      title: 'Enhanced Detail',
      description: 'Detailed drawings with artistic rendering',
    },
    {
      title: 'BIM Compatible',
      description: 'Drawings prepared for BIM integration',
    },
    {
      title: 'Heritage',
      description: 'Historic preservation and restoration drawings',
    },
  ],
  minimumBudget: 600000,
  currency: '₦',
};

export const BIM_CONFIG: ServiceConfig = {
  serviceType: ServiceType.BIM,
  serviceName: 'Building Information Modeling',
  contexts: [
    {
      title: 'New Construction',
      description: 'BIM for new building projects and developments',
    },
    {
      title: 'Renovation',
      description: 'BIM modeling for existing building modifications',
    },
    {
      title: 'Infrastructure',
      description: 'BIM for roads, bridges, and infrastructure projects',
    },
    {
      title: 'Facility Management',
      description: 'BIM for operational and maintenance planning',
    },
  ],
  projectTypes: [
    {
      title: 'Architectural BIM',
      description: 'Complete architectural 3D model with all elements',
    },
    {
      title: 'Structural BIM',
      description: 'Structural system modeling and analysis',
    },
    {
      title: 'MEP BIM',
      description: 'Mechanical, electrical, and plumbing integration',
    },
    {
      title: 'Integrated BIM',
      description: 'Complete multi-discipline BIM model',
    },
  ],
  scopes: [
    {
      title: 'Design Phase BIM',
      description: 'BIM model for design and planning stages',
    },
    {
      title: 'Construction BIM',
      description: 'Detailed BIM model for construction planning',
    },
    {
      title: 'As-Built BIM',
      description: 'Complete as-built BIM documentation',
    },
  ],
  addons: [
    {
      title: 'Clash Detection',
      description: 'Identification and resolution of model conflicts',
    },
    {
      title: 'Cost Estimation',
      description: 'Automatic cost and material quantity calculations',
    },
    {
      title: 'Schedule Integration',
      description: '4D/5D timeline and cost integration',
    },
  ],
  sizes: [
    {
      title: 'Singlebuilding (Single discipline)',
      description: 'Single building with focused BIM modeling',
    },
    {
      title: 'Complex Building (Multi-discipline)',
      description: 'Complex structure with multiple BIM disciplines',
    },
    {
      title: 'Master Plan (Multiple buildings)',
      description: 'Large development with multiple structures',
    },
  ],
  styles: [
    {
      title: 'LOD 200 (Schematic)',
      description: 'Conceptual BIM model appropriate for early design',
    },
    {
      title: 'LOD 300 (Design Development)',
      description: 'Fully defined BIM model for design development',
    },
    {
      title: 'LOD 400 (Construction)',
      description: 'Fabrication-level detail BIM model',
    },
    {
      title: 'LOD 500 (As-Built)',
      description: 'Comprehensive as-built BIM documentation',
    },
  ],
  minimumBudget: 1000000,
  currency: '₦',
};

export const MEP_DRAWINGS_CONFIG: ServiceConfig = {
  serviceType: ServiceType.MEP_DRAWINGS,
  serviceName: 'Mechanical & Electrical Drawings',
  contexts: [
    {
      title: 'Commercial Buildings',
      description: 'MEP systems for office and commercial facilities',
    },
    {
      title: 'Residential',
      description: 'Domestic mechanical and electrical installations',
    },
    {
      title: 'Industrial',
      description: 'Large-scale industrial MEP systems',
    },
    {
      title: 'Healthcare',
      description: 'Specialized MEP for hospitals and medical facilities',
    },
  ],
  projectTypes: [
    {
      title: 'HVAC Design',
      description: 'Heating, ventilation, and air conditioning systems',
    },
    {
      title: 'Electrical Distribution',
      description: 'Power distribution, lighting, and electrical systems',
    },
    {
      title: 'Plumbing & Drainage',
      description: 'Water supply, drainage, and sanitation systems',
    },
    {
      title: 'Fire Safety Systems',
      description: 'Fire detection, suppression, and safety systems',
    },
  ],
  scopes: [
    {
      title: 'Design Only',
      description: 'MEP design drawings and specifications',
    },
    {
      title: 'Design & Calculation',
      description: 'Detailed calculations and supporting documentation',
    },
    {
      title: 'Full Documentation',
      description: 'Complete MEP package with all schedules',
    },
  ],
  addons: [
    {
      title: 'Energy Efficiency Analysis',
      description: 'Energy saving recommendations and analysis',
    },
    {
      title: 'Maintenance Schedule',
      description: 'Equipment maintenance planning and schedules',
    },
    {
      title: 'As-Built Update',
      description: 'As-built documentation updates',
    },
  ],
  sizes: [
    {
      title: 'Small System (Single building)',
      description: 'MEP systems for single small building',
    },
    {
      title: 'Medium System (Complex building)',
      description: 'Multi-zone complex building MEP systems',
    },
    {
      title: 'Large System (Multiple buildings)',
      description: 'MEP design for large campuses or complexes',
    },
  ],
  styles: [
    {
      title: 'Conventional Design',
      description: 'Standard proven MEP design approaches',
    },
    {
      title: 'Green Building',
      description: 'Sustainable and energy-efficient systems',
    },
    {
      title: 'High-Tech',
      description: 'Advanced automation and smart building systems',
    },
    {
      title: 'Performance-Based',
      description: 'Design based on performance requirements',
    },
  ],
  minimumBudget: 700000,
  currency: '₦',
};

export const STRUCTURAL_ENGINEERING_CONFIG: ServiceConfig = {
  serviceType: ServiceType.STRUCTURAL_ENGINEERING,
  serviceName: 'Structural Engineering Drawings',
  contexts: [
    {
      title: 'Building Structures',
      description: 'Residential and commercial building structural design',
    },
    {
      title: 'Infrastructure',
      description: 'Bridges, roads, tunnels, and infrastructural works',
    },
    {
      title: 'Industrial Structures',
      description: 'Industrial buildings, warehouses, and factories',
    },
    {
      title: 'Rehabilitation',
      description: 'Retrofitting and structural strengthening projects',
    },
  ],
  projectTypes: [
    {
      title: 'Foundation Design',
      description: 'Foundation systems and earthwork solutions',
    },
    {
      title: 'Superstructure',
      description: 'Main structural frame and load-bearing systems',
    },
    {
      title: 'Special Structures',
      description: 'Unique or complex structural solutions',
    },
    {
      title: 'Seismic Design',
      description: 'Earthquake-resistant structural solutions',
    },
  ],
  scopes: [
    {
      title: 'Design Phase',
      description: 'Structural design and calculations',
    },
    {
      title: 'Detail Design',
      description: 'Detailed drawings with reinforcement specifications',
    },
    {
      title: 'Construction & Site Management',
      description: 'Complete construction documentation and site guidance',
    },
  ],
  addons: [
    {
      title: 'Finite Element Analysis (FEA)',
      description: 'Advanced structural analysis using FEA software',
    },
    {
      title: 'Foundation Investigation',
      description: 'Soil investigation and geotechnical assessment',
    },
    {
      title: 'Quality Assurance',
      description: 'Quality monitoring and on-site inspections',
    },
  ],
  sizes: [
    {
      title: 'Low-Rise (Up to 5 stories)',
      description: 'Low-rise building structural design',
    },
    {
      title: 'Mid-Rise (6-15 stories)',
      description: 'Mid-rise building structural design',
    },
    {
      title: 'High-Rise (15+ stories)',
      description: 'Complex high-rise structural design',
    },
  ],
  styles: [
    {
      title: 'Conventional',
      description: 'Traditional proven structural solutions',
    },
    {
      title: 'Modern Engineered',
      description: 'Advanced engineered solutions with optimization',
    },
    {
      title: 'Sustainable',
      description: 'Eco-friendly and sustainable structural design',
    },
    {
      title: 'Innovative',
      description: 'Cutting-edge structural systems and solutions',
    },
  ],
  minimumBudget: 900000,
  currency: '₦',
};

// Export all configurations as a map
export const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  [ServiceType.LANDSCAPE_DESIGN]: LANDSCAPE_DESIGN_CONFIG,
  [ServiceType.INTERIOR_DESIGN]: INTERIOR_DESIGN_CONFIG,
  [ServiceType.RENDERING_3D]: RENDERING_3D_CONFIG,
  [ServiceType.ARCHITECTURAL_2D]: ARCHITECTURAL_2D_CONFIG,
  [ServiceType.BIM]: BIM_CONFIG,
  [ServiceType.MEP_DRAWINGS]: MEP_DRAWINGS_CONFIG,
  [ServiceType.STRUCTURAL_ENGINEERING]: STRUCTURAL_ENGINEERING_CONFIG,
};

/**
 * Get service configuration by service type
 */
export const getServiceConfig = (serviceType: ServiceType): ServiceConfig => {
  return SERVICE_CONFIGS[serviceType];
};
