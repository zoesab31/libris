import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Users, Sparkles, Library, ChevronRight, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import confetti from 'canvas-confetti';

const onboardingSteps = [
  {
    id: 'welcome',
    title: 'Bienvenue sur Libris ! 🌸',
    description: 'Ton nouvel espace pour suivre tes lectures, partager avec tes amies, et transformer ta passion pour les livres en aventure addictive.',
    icon: BookOpen,
    gradient: 'linear-gradient(135deg, #FF1493, #FF69B4)',
    illustration: '📚✨'
  },
  {
    id: 'library',
    title: 'Ta Bibliothèque Virtuelle 📖',
    description: 'Organise tes livres par statut (Lu, En cours, À lire, Wishlist). Ajoute tes avis, notes, citations préférées, et même ta playlist pour chaque lecture !',
    icon: Library,
    gradient: 'linear-gradient(135deg, #FF69B4, #FFB6C1)',
    illustration: '📚'
  },
  {
    id: 'tracker',
    title: 'Reading Tracker & Streak 🔥',
    description: 'Visualise tes jours de lecture sur un calendrier interactif. Maintiens ta streak et débloque des badges en lisant régulièrement !',
    icon: Trophy,
    gradient: 'linear-gradient(135deg, #E91E63, #FF1493)',
    illustration: '🔥'
  },
  {
    id: 'badges',
    title: 'Badges & Gamification 🏆',
    description: 'Débloque 30 badges en lisant, en explorant de nouveaux genres, en ajoutant des amies, et bien plus ! Chaque badge te rapporte des points.',
    icon: Trophy,
    gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
    illustration: '🏆'
  },
  {
    id: 'social',
    title: 'Partage avec tes Amies 💕',
    description: 'Ajoute tes amies, organisez des lectures communes, partagez vos avis, et découvrez ce que vos copines lisent en temps réel.',
    icon: Users,
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    illustration: '👭'
  },
  {
    id: 'lifestyle',
    title: 'Lifestyle & Inspiration ✨',
    description: 'Sauvegarde tes fan arts préférés, crée des playlists par livre, collectionne des inspirations d\'ongles, et personnalise ton univers littéraire !',
    icon: Sparkles,
    gradient: 'linear-gradient(135deg, #FFB6C1, #FFD700)',
    illustration: '💅'
  }
];

export default function OnboardingFlow({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200">
          <motion.div
            className="h-full"
            style={{ background: step.gradient }}
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / onboardingSteps.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="p-8 md:p-12"
          >
            {/* Icon */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"
              style={{ background: step.gradient }}
            >
              <span className="text-5xl">{step.illustration}</span>
            </div>

            {/* Content */}
            <h2
              className="text-3xl md:text-4xl font-bold text-center mb-4"
              style={{ background: step.gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              {step.title}
            </h2>

            <p className="text-gray-600 text-center text-lg mb-8 leading-relaxed">
              {step.description}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep ? 'w-8' : 'w-2'
                    }`}
                    style={{
                      background: index <= currentStep ? step.gradient : '#E5E7EB'
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-3">
                {!isLastStep && (
                  <Button
                    variant="ghost"
                    onClick={handleSkip}
                    className="text-gray-500"
                  >
                    Passer
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="font-semibold"
                  style={{ background: step.gradient }}
                >
                  {isLastStep ? 'Commencer !' : 'Suivant'}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}