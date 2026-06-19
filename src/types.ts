export type Category = 'Interior' | 'Exterior' | 'Cabinets' | 'Commercial';
export type PhotoType = 'Before' | 'After' | 'Standard';

export interface Photo {
  id: string;
  url: string; // Can be base64, static path (/uploads/...), or external URL (for pre-seeded items)
  type: PhotoType;
  caption?: string;
  mediaType?: 'image' | 'video'; // Support both photo & video files
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: Category;
  photos: Photo[];
  createdAt: string;
}

export interface WebhookConfig {
  logoUrl?: string;
  phone: string;
  email: string;
}
