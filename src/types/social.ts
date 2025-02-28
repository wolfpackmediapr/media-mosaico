
export interface SocialPost {
  id: string;
  title: string;
  description: string;
  link: string;
  pub_date: string;
  source: string;
  image_url: string | null;
  platform: string;
  platform_display_name?: string;
  platform_icon?: string;
}

export interface SocialPlatform {
  id: string;
  name: string;
  count: number;
}
