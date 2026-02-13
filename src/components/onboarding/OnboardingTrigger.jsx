import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import OnboardingFlow from './OnboardingFlow';
import { toast } from 'sonner';

export default function OnboardingTrigger() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Check if user has completed onboarding
        if (!currentUser.onboarding_completed) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, []);

  const handleComplete = async () => {
    try {
      await base44.auth.updateMe({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString()
      });
      
      setShowOnboarding(false);
      toast.success('Bienvenue sur Libris ! 🌸', {
        description: 'Commence à ajouter tes livres et explore toutes les fonctionnalités !'
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setShowOnboarding(false);
    }
  };

  const handleSkip = async () => {
    try {
      await base44.auth.updateMe({
        onboarding_completed: true,
        onboarding_skipped: true,
        onboarding_completed_at: new Date().toISOString()
      });
      
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error skipping onboarding:', error);
      setShowOnboarding(false);
    }
  };

  if (loading || !showOnboarding) {
    return null;
  }

  return (
    <OnboardingFlow
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}