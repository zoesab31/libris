import { motion } from 'framer-motion';
import { Music, MapPin, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LifestylePreview({ user }) {
  const lifestyleItems = [
    {
      icon: Music,
      label: 'Ma playlist de lecture',
      link: createPageUrl('MusicPlaylist'),
      gradient: 'from-purple-400 to-pink-500'
    },
    {
      icon: MapPin,
      label: 'Mes lieux de lecture',
      link: createPageUrl('Maps'),
      gradient: 'from-green-400 to-teal-500'
    },
    {
      icon: Palette,
      label: 'Mon mood lectrice',
      link: createPageUrl('Lifestyle'),
      gradient: 'from-orange-400 to-red-500'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="p-6 border-0 shadow-xl">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
          Mon univers
        </h2>

        <div className="space-y-3">
          {lifestyleItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.link}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                  style={{ background: 'linear-gradient(135deg, var(--beige), var(--cream))' }}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium" style={{ color: 'var(--dark-text)' }}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </Card>
    </motion.div>
  );
}