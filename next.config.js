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
};

module.exports = nextConfig; 