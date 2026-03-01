import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, MessageSquare, Sparkles, Lightbulb, Heart } from "lucide-react";
import { motion } from "framer-motion";

export default function Social() {
  const socialFeatures = [
    {
      title: "Mes Amies",
      description: "Connecte-toi avec tes amies lectrices",
      icon: Users,
      path: createPageUrl("Friends"),
      color: "#9C27B0",
      gradient: "linear-gradient(135deg, #9C27B0, #BA68C8)"
    },
    {
      title: "Lectures Communes",
      description: "Organisez des lectures de groupe ensemble",
      icon: BookOpen,
      path: createPageUrl("SharedReadings"),
      color: "#FF1493",
      gradient: "linear-gradient(135deg, #FF1493, #FF69B4)"
    },
    {
      title: "Messages",
      description: "Discute avec tes amies de vos lectures",
      icon: MessageSquare,
      path: createPageUrl("Chat"),
      color: "#E91E63",
      gradient: "linear-gradient(135deg, #E91E63, #FF1493)"
    },
    {
      title: "Découvrir",
      description: "Trouve de nouvelles lectrices et recommandations",
      icon: Sparkles,
      path: createPageUrl("Discover"),
      color: "#FF69B4",
      gradient: "linear-gradient(135deg, #FF69B4, #FFB6C1)"
    },
    {
      title: "Mur des Idées",
      description: "Partage et vote pour des suggestions",
      icon: Lightbulb,
      path: createPageUrl("SuggestionsWall"),
      color: "#FFD700",
      gradient: "linear-gradient(135deg, #FFD700, #FFA500)"
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                 style={{ background: 'linear-gradient(135deg, #9C27B0, #BA68C8)' }}>
              <Users className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold" style={{ color: '#9C27B0' }}>
                Social & Communauté
              </h1>
              <p className="text-base md:text-xl" style={{ color: '#2c2c2c' }}>
                Partage ta passion avec tes amies
              </p>
            </div>
          </div>
        </motion.div>

        {/* Social Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {socialFeatures.map((feature, idx) => {
            const Icon = feature.icon;
            
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Link to={feature.path}>
                  <Card className="border-0 rounded-3xl overflow-hidden h-full transition-all hover:shadow-2xl cursor-pointer"
                        style={{ boxShadow: '0 4px 16px rgba(156, 39, 176, 0.1)' }}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{ background: feature.gradient }}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-bold mb-2" style={{ color: '#2D3748' }}>
                            {feature.title}
                          </h3>
                          <p className="text-sm" style={{ color: '#4A5568' }}>
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}