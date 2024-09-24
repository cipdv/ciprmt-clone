// /** @type {import('next').NextConfig} */
// const nextConfig = {};

// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_TIMEZONE:
      process.env.NEXT_PUBLIC_TIMEZONE || "America/New_York",
  },
};

export default nextConfig;
