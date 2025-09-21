import defaultProfileImage from '@assets/generated_images/Anonymous_profile_silhouette_icon_df21024f.png';

export const getDefaultProfileImage = (): string => {
  return defaultProfileImage;
};

export const getProfileImageUrl = (profileImageUrl?: string | null): string => {
  return profileImageUrl || getDefaultProfileImage();
};

export const getDefaultCoverImage = (): string => {
  // Generate a subtle gradient background for cover photos
  return 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="300" viewBox="0 0 800 300">
      <defs>
        <linearGradient id="coverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#e2e8f0;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#cbd5e1;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#coverGradient)" />
      <circle cx="150" cy="80" r="40" fill="#f1f5f9" opacity="0.3"/>
      <circle cx="650" cy="220" r="60" fill="#f1f5f9" opacity="0.2"/>
      <circle cx="400" cy="150" r="25" fill="#f1f5f9" opacity="0.4"/>
    </svg>
  `);
};

export const getCoverImageUrl = (coverImageUrl?: string | null): string => {
  return coverImageUrl || getDefaultCoverImage();
};