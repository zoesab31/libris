import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Grid3x3, BookOpen, BookUser, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";

export default function Challenges() {
  const challenges = [
    {
      title: "Bingo Lecture",
      description: "Complète les défis de lecture pour remplir ta grille",
      icon: Grid3x3,
      path: createPageUrl("Bingo"),
      color: "#FF1493",
      gradient: "linear-gradient(135deg, #FF1493, #FF69B4)"
    },
    {
      title: "Tournoi du Livre",
      description: "Vote pour tes livres préférés et choisis ton champion",
      icon: Trophy,
      path: createPageUrl("BookTournament"),
      color: "#FFD700",
      gradient: "linear-gradient(135deg, #FFD700, #FFA500)"
    },
    {
      title: "Séries à Compléter",
      description: "Suis ta progression dans tes séries de livres",
      icon: BookOpen,
      path: createPageUrl("Series"),
      color: "#9C27B0",
      gradient: "linear-gradient(135deg, #9C27B0, #BA68C8)"
    },
    {
      title: "Abécédaire",
      description: "Lis au moins un livre de chaque lettre de l'alphabet",
      icon: BookUser,
      path: createPageUrl("Authors"),
      color: "#E91E63",
      gradient: "linear-gradient(135deg, #E91E63, #FF1493)"
    },
    {
      title: "Objectif Annuel",
      description: "Définis et atteins ton objectif de lecture",
      icon: Target,
      path: createPageUrl("Dashboard"),
      color: "#FF69B4",
      gradient: "linear-gradient(135deg, #FF69B4, #FFB6C1)"
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(to bottom, #FFF5F8 0%, #FFE9F0 50%, #FFDCE5 100%)' }}>
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
                 style={{ background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold" style={{ color: '#FF1493' }}>
                Défis & Challenges
              </h1>
              <p className="text-base md:text-xl" style={{ color: '#2c2c2c' }}>
                Relève des défis et challenge-toi
              </p>
            </div>
          </div>
        </motion.div>

        {/* Challenges Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge, idx) => {
            const Icon = challenge.icon;
            
            return (
              <motion.div
                key={challenge.title}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
              >
                <Link to={challenge.path}>
                  <Card className="border-0 rounded-3xl overflow-hidden h-full transition-all hover:shadow-2xl cursor-pointer"
                        style={{ boxShadow: '0 4px 16px rgba(255, 105, 180, 0.1)' }}>
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div 
                          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                          style={{ background: challenge.gradient }}
                        >
                          <Icon className="w-10 h-10 text-white" />
                        </div>
                        
                        <div>
                          <h3 className="text-xl font-bold mb-2" style={{ color: '#2D3748' }}>
                            {challenge.title}
                          </h3>
                          <p className="text-sm" style={{ color: '#4A5568' }}>
                            {challenge.description}
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