import { ProfessionalTitle } from '../entities/agent-profile.entity';

export class ProOverviewDto {
  id: string;
  businessName: string;
  profilePicture: string;
  professionalTitle: string; // Combined title + specializations
  specializations: string[];
  rating: number;
  yearsOfExperience: number;
  completedProjects: number;
  location: string;
  priceRange: string; // e.g. "from ₦320k"
  responseTime: string;
}
