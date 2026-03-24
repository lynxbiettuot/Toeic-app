import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: 'Toeic Mobile',
    slug: 'toeic-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
    extra: {
      API_BASE_URL: process.env.API_BASE_URL?.trim() || undefined,
      API_PORT: Number(process.env.API_PORT || 3000)
    }
  };
};
