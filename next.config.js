/** @type {import('next').NextConfig} */
const nextConfig = {
  // 필요한 설정이 있을 경우 여기에 추가
  eslint: {
    // 빌드 시 ESLint 검사를 비활성화
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 타입 검사를 비활성화
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // 클라이언트 사이드에서 Node.js 모듈 fallback 설정
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    return config;
  }
};

module.exports = nextConfig; 