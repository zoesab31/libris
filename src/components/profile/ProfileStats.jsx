import { motion } from 'framer-motion';
import { BookOpen, Users } from 'lucide-react';

export default function ProfileStats({ stats }) {
  const statItems = [
    {
      icon: BookOpen,
      label: 'Livres lus',
      value: stats.totalBooksRead,
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BookOpen,
      label: 'En cours',
      value: stats.currentlyReading,
      color: 'from-purple-500 to-fuchsia-600'
    },
    {
      icon: Users,
      label: 'Amis',
      value: stats.totalFriends,
      color: 'from-pink-500 to-purple-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-6 text-center"
        >
          <div className={`w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
            <stat.icon className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {stat.value}
          </p>
          <p className="text-sm text-gray-600">
            {stat.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}