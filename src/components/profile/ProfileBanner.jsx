import { motion } from 'framer-motion';
import { Camera } from 'lucide-react';

export default function ProfileBanner({ bannerUrl, isOwnProfile, onEditBanner }) {
  const defaultGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative w-full h-48 md:h-64 rounded-b-3xl overflow-hidden"
      style={{
        background: bannerUrl ? `url(${bannerUrl}) center/cover` : defaultGradient
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />

      {isOwnProfile && (
        <button
          onClick={onEditBanner}
          className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <Camera className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </motion.div>
  );
}