/**
 * Custom Design Service Configurations
 * Centralized option data for all 8 service types.
 * Scope/addon/size/style titles MUST match the corresponding frontend page strings exactly.
 */

import { ServiceType, ServiceConfig } from '../customdesign.types';

// ---------------------------------------------------------------------------
// 1. Landscape Design
// Frontend: LandscapeServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const LANDSCAPE_DESIGN_CONFIG: ServiceConfig = {
  serviceType: ServiceType.LANDSCAPE_DESIGN,
  serviceName: 'Landscape Design',
  contexts: [
    {
      title: 'Residential Garden Design',
      description: 'For private homes — front yards, backyards, or personal gardens.',
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
      description: 'For open public areas meant for relaxation, recreation, or community use.',
    },
  ],
  projectTypes: [
    {
      title: 'Front / Backyard Garden',
      description: 'Focused on personal house surroundings — beautifying entrances or relaxation gardens.',
    },
    {
      title: 'Courtyard / Terrace Landscape',
      description: 'For smaller spaces like rooftop terraces, inner courtyards, or patios.',
    },
    {
      title: 'Estate Green Area',
      description: 'Common areas within estates — lawns, walkways, or shared greenery.',
    },
    {
      title: 'Public Park / Outdoor Space',
      description: 'Large-scale open areas for the public, with paths, seating, or playgrounds.',
    },
  ],
  scopes: [
    {
      title: 'Basic Package',
      description: 'Site layout plan, softscape & hardscape concept, planting layout.',
    },
    {
      title: 'Intermediate Package',
      description: 'Full planting plan, paving & lighting layout, 3D visuals.',
    },
    {
      title: 'Advanced Package',
      description: 'Complete design, implementation plan, maintenance guide, 3D and 2D visuals.',
    },
  ],
  addons: [
    { title: '3D Walkthrough Animation', description: 'Interactive 3D walkthrough of your landscape design.' },
    { title: 'Furniture & Lighting Selection', description: 'Curated furniture and lighting recommendations.' },
    { title: 'Drainage Design Integration', description: 'Professional drainage planning and integration.' },
  ],
  sizes: [
    { title: 'Small (under 200 sqm)', description: 'Compact spaces — home gardens or small courtyards.' },
    { title: 'Medium (200-1000 sqm)', description: 'Moderate-sized projects — estates, resorts, or community spaces.' },
    { title: 'Large (1000 sqm and above)', description: 'Big outdoor developments like parks or resort compounds.' },
  ],
  styles: [
    { title: 'Modern', description: 'Clean lines, simple layouts, and elegant plant choices — perfect for contemporary homes.' },
    { title: 'Tropical', description: 'Lush greenery, bright colors, and relaxing vibes — great for warm climates.' },
    { title: 'Sustainable', description: 'Focuses on eco-friendly materials, native plants, and energy-efficient setups.' },
    { title: 'Local Environmental & Drainage', description: 'Ensures the design follows regional building and drainage rules for safety and compliance.' },
  ],
  minimumBudget: 500000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 2. Interior Design (Product / Residential-Commercial)
// Frontend: InterirorDesignServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const PRODUCT_DESIGN_CONFIG: ServiceConfig = {
  serviceType: ServiceType.PRODUCT_DESIGN,
  serviceName: 'Product Design (Residential & Commercial)',
  contexts: [
    { title: 'Residential Product Design', description: 'Product design solutions for private homes and residential spaces.' },
    { title: 'Commercial Product Design', description: 'Product design for offices, retail, and commercial environments.' },
    { title: 'Hospitality Product Design', description: 'Product design for hotels, restaurants, and hospitality venues.' },
    { title: 'Industrial Product Design', description: 'Product design for industrial and manufacturing applications.' },
  ],
  projectTypes: [
    { title: 'Furniture Design', description: 'Custom furniture design and specifications.' },
    { title: 'Fixture & Fitting Design', description: 'Design of fixtures, fittings, and built-in elements.' },
    { title: 'Modular Design', description: 'Modular and flexible product design solutions.' },
    { title: 'Ergonomic Design', description: 'Human-centered ergonomic product design.' },
  ],
  scopes: [
    { title: 'Basic Package', description: 'Concept sketches, material selection, and initial design layout.' },
    { title: 'Intermediate Package', description: 'Detailed 3D models, technical drawings, and design documentation.' },
    { title: 'Advanced Package', description: 'Complete design package with prototyping specifications and manufacturing guide.' },
  ],
  addons: [
    { title: '3D Visualization', description: 'High-quality 3D renders of the product design.' },
    { title: 'Material & Finish Board', description: 'Curated material samples and finish recommendations.' },
    { title: 'Manufacturing Specification', description: 'Detailed specifications for production and manufacturing.' },
  ],
  sizes: [
    { title: 'Single Item', description: 'Design of one specific product or piece.' },
    { title: 'Product Range', description: 'Design of a collection or range of related products.' },
    { title: 'Full Interior Product Set', description: 'Complete product design for an entire space or project.' },
  ],
  styles: [
    { title: 'Modern / Minimalist', description: 'Clean, simple, and contemporary product style.' },
    { title: 'Classic / Traditional', description: 'Timeless design with elegant and detailed craftsmanship.' },
    { title: 'Industrial / Raw', description: 'Bold, raw materials with a strong industrial aesthetic.' },
    { title: 'Eco-Friendly / Sustainable', description: 'Environmentally conscious materials and design approach.' },
  ],
  minimumBudget: 500000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 3. Interior Design (Interior Spaces)
// Frontend: InterirorDesignServiceContextPage2.tsx
// ---------------------------------------------------------------------------
export const INTERIOR_DESIGN_CONFIG: ServiceConfig = {
  serviceType: ServiceType.INTERIOR_DESIGN,
  serviceName: 'Interior Design',
  contexts: [
    { title: 'Residential Interiors', description: 'Interior design for homes such as apartments and private houses.' },
    { title: 'Commercial Interiors', description: 'Interior design for offices and corporate environments.' },
    { title: 'Hospitality / Restaurant Interiors:', description: 'Interior design for hotels, restaurants, and lounges focused on customer experience.' },
    { title: 'Retail / Showroom Design', description: 'Interior design for shops and display spaces to attract customers and enhance product presentation.' },
  ],
  projectTypes: [
    { title: 'Living Room / Bedroom', description: 'Design of individual residential spaces.' },
    { title: 'Office Space', description: 'Workspace planning and design for productivity and comfort.' },
    { title: 'Restaurant / Café', description: 'Layout and interior styling for dining environments.' },
    { title: 'Store / Boutique', description: 'Design of retail spaces to improve customer flow and sales.' },
  ],
  scopes: [
    { title: 'Basic Package', description: 'Layout plan, color palette, and mood board.' },
    { title: 'Intermediate Package', description: '3D visuals, furniture layout, and lighting plan.' },
    { title: 'Advanced Package', description: 'Full space design, implementation plan, maintenance guide, 3D and 2D visuals.' },
  ],
  addons: [
    { title: '3D Walkthrough', description: 'Immersive 3D visualization of the interior design.' },
    { title: 'Furniture Procurement List', description: 'Detailed furniture and fitting sourcing document.' },
    { title: 'Material Samples Board', description: 'Physical or digital material and finish samples.' },
  ],
  sizes: [
    { title: 'Single Room', description: 'Design of one specific interior space.' },
    { title: 'Full Apartment', description: 'Complete interior design for an entire unit.' },
    { title: 'Multi-Floor or Complex Space', description: 'Large-scale or multi-level interior project.' },
  ],
  styles: [
    { title: 'Modern / Minimalist', description: 'Clean, simple, and contemporary interior style.' },
    { title: 'Classic / Luxury', description: 'Elegant and detailed interior with premium finishes.' },
    { title: 'Industrial / Contemporary', description: 'Raw, modern style with bold materials and textures.' },
    { title: 'Eco-Friendly / Sustainable', description: 'Environmentally conscious interior design approach.' },
  ],
  minimumBudget: 500000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 4. 3D Rendering & Visualization
// Frontend: ThreeDRenderingServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const RENDERING_3D_CONFIG: ServiceConfig = {
  serviceType: ServiceType.RENDERING_3D,
  serviceName: '3D Rendering & Visualization',
  contexts: [
    { title: 'Architectural Visualization', description: '3D renders of buildings, exteriors, and architectural projects.' },
    { title: 'Interior Rendering', description: 'High-quality 3D images of interior spaces and room designs.' },
    { title: 'Product Rendering', description: '3D visualization for product design, packaging, or e-commerce.' },
    { title: 'Landscape Visualization', description: '3D rendering of outdoor spaces, landscapes, and site plans.' },
  ],
  projectTypes: [
    { title: 'Exterior Rendering', description: 'High-quality exterior building and landscape visualizations.' },
    { title: 'Interior Rendering', description: 'Detailed interior space visualizations.' },
    { title: 'Aerial / Bird-Eye View', description: "Bird's eye view rendering of a site or development." },
    { title: 'Animation / Walkthrough', description: 'Animated 3D walkthrough of a space or building.' },
  ],
  scopes: [
    { title: 'Standard Rendering', description: 'Single perspective, high-quality 3D still render.' },
    { title: 'Multi-Perspective Package', description: 'Multiple angles and viewpoints with lighting variations.' },
    { title: 'Full Experience Package', description: '3D renders + animation + interactive virtual walkthrough.' },
  ],
  addons: [
    { title: 'Day/Night Lighting Variants', description: 'Separate renders showing different lighting conditions.' },
    { title: '360° Panoramic View', description: 'Interactive 360-degree panoramic image.' },
    { title: 'Branded Presentation Deck', description: 'Professionally formatted presentation with your renders.' },
  ],
  sizes: [
    { title: 'Single Image', description: '1 photorealistic still render.' },
    { title: '3-5 Images', description: 'A small set of renders from key viewpoints.' },
    { title: '6+ Images / Animation', description: 'Comprehensive render set or animated walkthrough.' },
  ],
  styles: [
    { title: 'Photorealistic', description: 'Ultra-realistic representation with life-like detail.' },
    { title: 'Architectural / Technical', description: 'Clean architectural style emphasizing design clarity.' },
    { title: 'Stylized / Artistic', description: 'Creative interpretation with an artistic or illustrative feel.' },
    { title: 'Minimalist', description: 'Clean, uncluttered rendering focusing on key design elements.' },
  ],
  minimumBudget: 800000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 5. 2D Architectural Drawings
// Frontend: TwoDArchitecturalServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const ARCHITECTURAL_2D_CONFIG: ServiceConfig = {
  serviceType: ServiceType.ARCHITECTURAL_2D,
  serviceName: '2D Architectural Drawings',
  contexts: [
    { title: 'New Building Design', description: 'Architectural drawings for a brand-new building project.' },
    { title: 'Renovation / Extension', description: 'Drawings for modifying or extending an existing building.' },
    { title: 'Commercial Layout', description: 'Architectural drawings for offices, retail, or commercial spaces.' },
    { title: 'Institutional Building', description: 'Drawings for schools, hospitals, or public facilities.' },
  ],
  projectTypes: [
    { title: 'Residential Building', description: 'Architectural drawings for homes or apartment buildings.' },
    { title: 'Commercial Building', description: 'Drawings for offices, retail, or business facilities.' },
    { title: 'Industrial / Warehouse', description: 'Drawings for factories, warehouses, or industrial premises.' },
    { title: 'Mixed-Use Development', description: 'Combined residential, commercial, and public-use drawings.' },
  ],
  scopes: [
    { title: 'Basic Package', description: 'Floor plans and site layout drawing.' },
    { title: 'Standard Package', description: 'Plans, elevations, sections, and standard details.' },
    { title: 'Complete Package', description: 'All drawings including detailed construction specifications and schedules.' },
  ],
  addons: [
    { title: 'Building Codes Compliance Review', description: 'Verification that drawings comply with local building standards.' },
    { title: 'Construction Detail Drawings', description: 'Detailed construction and assembly specification sheets.' },
    { title: 'Furniture & Fixture Layout', description: 'Drawings showing furniture placement and fitting positions.' },
  ],
  sizes: [
    { title: 'Small (1-2 floors)', description: 'Single or double-storey residential or small commercial building.' },
    { title: 'Medium (3-5 floors)', description: 'Medium-scale building with several storeys.' },
    { title: 'Large (6+ floors or complex)', description: 'High-rise or technically complex multi-use structure.' },
  ],
  styles: [
    { title: 'Nigerian Building Standards', description: 'Drawings prepared in accordance with Nigerian building regulations and codes.' },
    { title: 'UK Building Standards', description: 'Drawings following UK regulations and standards.' },
    { title: 'International Standards (ISO)', description: 'Drawings prepared to international ISO conventions.' },
    { title: 'Customer to Specify', description: 'Client provides the applicable building code or standard for their location.' },
  ],
  minimumBudget: 600000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 6. Building Information Modeling (BIM)
// Frontend: BIMServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const BIM_CONFIG: ServiceConfig = {
  serviceType: ServiceType.BIM,
  serviceName: 'Building Information Modeling (BIM)',
  contexts: [
    { title: 'Architectural BIM Modeling', description: 'Creation of a detailed 3D digital model of the architectural design.' },
    { title: 'Structural BIM Modeling', description: '3D modeling of beams, columns, slabs, and structural elements.' },
    { title: 'MEP (Mechanical, Electrical, Plumbing)', description: 'Integrated modeling of building services to avoid clashes during construction.' },
    { title: 'Full Project BIM Integration', description: 'Complete coordination of architecture, structure, and MEP into one intelligent model.' },
  ],
  projectTypes: [
    { title: 'Residential Building', description: 'BIM modeling for houses or apartment buildings.' },
    { title: 'Commercial Building', description: 'BIM modeling for offices, retail, or business spaces.' },
    { title: 'Institutional Project', description: 'BIM modeling for schools, hospitals, or public facilities.' },
    { title: 'Industrial / Infrastructure', description: 'BIM modeling for factories, warehouses, or large infrastructure projects.' },
  ],
  scopes: [
    { title: 'Basic Package – LOD 200', description: 'Basic 3D model showing general building elements and layout.' },
    { title: 'Intermediate Package – LOD 300', description: 'Detailed model including architectural, structural, and MEP integration.' },
    { title: 'Advanced Package – LOD 400/500', description: 'Complete model with all details ready for fabrication and construction.' },
  ],
  addons: [
    { title: 'IFC Export File', description: 'Industry Foundation Classes file for software interoperability.' },
    { title: '3D Coordination Review', description: 'Clash detection and coordination review across disciplines.' },
    { title: 'Net Zero Compliance Analysis', description: 'Environmental and energy-efficiency compliance check.' },
  ],
  sizes: [
    { title: 'Single Dwelling', description: 'One standalone building project.' },
    { title: 'Multi-Unit Building', description: 'Building with multiple units or apartments.' },
    { title: 'High-Rise / Complex Facility', description: 'Large or technically complex multi-storey project.' },
  ],
  styles: [
    { title: 'ISO 19650 BIM Standards', description: 'International standard for BIM information management.' },
    { title: 'IFC Model Standards', description: 'Global file standard for BIM collaboration.' },
    { title: 'Nigerian / UK Building Codes', description: 'Compliance with national construction regulations.' },
    { title: 'Sustainable / Net Zero Design Integration', description: 'Modeling aligned with environmental and energy-efficiency goals.' },
  ],
  minimumBudget: 1000000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 7. Mechanical & Electrical Drawings (MEP)
// Frontend: MechanicalElectricalDesignServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const MEP_DRAWINGS_CONFIG: ServiceConfig = {
  serviceType: ServiceType.MEP_DRAWINGS,
  serviceName: 'Mechanical & Electrical Drawings',
  contexts: [
    { title: 'Electrical Design Layout', description: 'Detailed drawings showing power points, lighting, switches, and electrical distribution.' },
    { title: 'Mechanical (HVAC) Design', description: 'Drawings for heating, ventilation, and air-conditioning systems.' },
    { title: 'Plumbing & Drainage Design', description: 'Layout plans for water supply, waste pipes, and drainage systems.' },
    { title: 'Fire Alarm / Safety Systems', description: 'Design of fire detection, alarm systems, and safety equipment placement.' },
  ],
  projectTypes: [
    { title: 'Residential', description: 'Mechanical and electrical drawings for homes or apartments.' },
    { title: 'Commercial', description: 'Drawings for offices, retail stores, and business buildings.' },
    { title: 'Industrial / Institutional', description: 'Drawings for factories, schools, hospitals, and large facilities.' },
    { title: 'Store / Boutique', description: 'MEP design of retail spaces to support customer flow and safety.' },
  ],
  scopes: [
    { title: 'Basic Package', description: 'Single system layout (electrical or plumbing only).' },
    { title: 'Intermediate Package', description: 'Complete HVAC, lighting, and plumbing layouts.' },
    { title: 'Advanced Package', description: 'Load calculations, detailed design drawings, and system specifications.' },
  ],
  addons: [
    { title: 'Energy Efficiency Design', description: 'Recommendations for reducing energy consumption.' },
    { title: 'Smart Building Integration', description: 'Automation and smart building system design.' },
    { title: 'Coordination with Structural Drawings', description: 'Cross-referencing with structural drawings to avoid clashes.' },
  ],
  sizes: [
    { title: 'Small', description: 'Single home or single-floor project.' },
    { title: 'Medium', description: 'Multi-unit building or office space.' },
    { title: 'Large', description: 'Complex project with multiple systems and zones.' },
  ],
  styles: [
    { title: 'Customer to Specify', description: 'Client may provide required engineering codes or regulatory standards based on project location.' },
  ],
  minimumBudget: 700000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// 8. Structural Engineering Drawings
// Frontend: StructuralDesignServiceContextPage.tsx
// ---------------------------------------------------------------------------
export const STRUCTURAL_ENGINEERING_CONFIG: ServiceConfig = {
  serviceType: ServiceType.STRUCTURAL_ENGINEERING,
  serviceName: 'Structural Engineering Drawings',
  contexts: [
    { title: 'Structural Design & Analysis', description: 'Engineering calculations and design to ensure the building is strong and stable.' },
    { title: 'Reinforced Concrete Design', description: 'Structural design focused on concrete elements like slabs, beams, and columns.' },
    { title: 'Steel / Timber Structure Design', description: 'Design of buildings or frameworks using steel or timber materials.' },
    { title: 'Structural Retrofit / Strengthening', description: 'Upgrading or reinforcing an existing building to improve safety and performance.' },
  ],
  projectTypes: [
    { title: 'Residential Building', description: 'Structural drawings for houses or apartment buildings.' },
    { title: 'Commercial Building', description: 'Structural design for offices, retail, or business facilities.' },
    { title: 'Industrial Structure', description: 'Structural plans for factories, warehouses, or heavy-duty buildings.' },
    { title: 'Infrastructure Project', description: 'Structural design for bridges, towers, or large public structures.' },
  ],
  scopes: [
    { title: 'Basic Package', description: 'Foundation layout, column layout, and simple beam plan.' },
    { title: 'Intermediate Package', description: 'Full framing plans, slab details, and reinforcement drawings.' },
    { title: 'Advanced Package', description: 'Detailed structural design, construction details, and full design drawings.' },
  ],
  addons: [
    { title: 'Seismic / Wind Load Design', description: 'Analysis and design for lateral forces including seismic and wind loads.' },
    { title: 'Coordination with BIM Model', description: 'Cross-referencing structural drawings with a BIM model.' },
    { title: 'Material Quantity Summary', description: 'Bill of materials and quantity estimate for structural elements.' },
  ],
  sizes: [
    { title: 'Small', description: '1-2 storey building.' },
    { title: 'Medium', description: '3-5 storey building.' },
    { title: 'Large', description: 'High-rise or technically complex structure.' },
  ],
  styles: [
    { title: 'Customer to Specify', description: 'Client may provide required engineering codes or regulatory standards based on project location.' },
  ],
  minimumBudget: 900000,
  currency: '₦',
};

// ---------------------------------------------------------------------------
// Aggregated map & helper
// ---------------------------------------------------------------------------

export const SERVICE_CONFIGS: Record<ServiceType, ServiceConfig> = {
  [ServiceType.LANDSCAPE_DESIGN]: LANDSCAPE_DESIGN_CONFIG,
  [ServiceType.PRODUCT_DESIGN]: PRODUCT_DESIGN_CONFIG,
  [ServiceType.INTERIOR_DESIGN]: INTERIOR_DESIGN_CONFIG,
  [ServiceType.RENDERING_3D]: RENDERING_3D_CONFIG,
  [ServiceType.ARCHITECTURAL_2D]: ARCHITECTURAL_2D_CONFIG,
  [ServiceType.BIM]: BIM_CONFIG,
  [ServiceType.MEP_DRAWINGS]: MEP_DRAWINGS_CONFIG,
  [ServiceType.STRUCTURAL_ENGINEERING]: STRUCTURAL_ENGINEERING_CONFIG,
};

export const getServiceConfig = (serviceType: ServiceType): ServiceConfig => {
  const config = SERVICE_CONFIGS[serviceType];
  if (!config) throw new Error(`No configuration found for service type: ${serviceType}`);
  return config;
};
