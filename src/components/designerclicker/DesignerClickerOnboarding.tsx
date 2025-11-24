import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import './DesignerClickerOnboarding.css';

export interface DesignerClickerOnboardingRef {
  advanceStep: () => void;
  getCurrentStep: () => 1 | 2 | 3 | null;
}

interface DesignerClickerOnboardingProps {
  onStepChange?: (step: 1 | 2 | 3 | null) => void;
}

const DesignerClickerOnboarding = forwardRef<DesignerClickerOnboardingRef, DesignerClickerOnboardingProps>(
  ({ onStepChange }, ref) => {
    const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3 | null>(1);

    useImperativeHandle(ref, () => ({
      advanceStep: () => {
        if (onboardingStep === 1) {
          setOnboardingStep(2);
        } else if (onboardingStep === 2) {
          setOnboardingStep(3);
        }
      },
      getCurrentStep: () => onboardingStep,
    }));

    useEffect(() => {
      if (onStepChange) {
        onStepChange(onboardingStep);
      }
    }, [onboardingStep, onStepChange]);

    const getOnboardingConfig = (): {
      message: string;
      position: React.CSSProperties;
      arrowDirection: "up" | "down" | "left" | "right";
      animation: "bounce" | "bounceSidebar";
    } | null => {
      switch (onboardingStep) {
        case 1:
          return {
            message: "Click here to design! work work work!",
            position: {
              top: '40vh',
              left: '50%',
              transform: 'translateX(-50%)',
            },
            arrowDirection: "down",
            animation: "bounce"
          };
        case 2:
          return {
            message: "Need some help? Hire some great designers here! Click on each to see their abilities!",
            position: {
              right: '100px',
              top: '40vh',
              transform: 'translateY(-50%)',
            },
            arrowDirection: "right",
            animation: "bounceSidebar"
          };
        case 3:
          return {
            message: "On top, you'll get new jobs at each level that will be more more difficult but nicer!",
            position: {
              top: '100px',
              left: '25vw',
              transform: 'translateX(-50%)',
            },
            arrowDirection: "down",
            animation: "bounce"
          };
        default:
          return null;
      }
    };

    const handleContentClick = () => {
      if (onboardingStep === 1) {
        setOnboardingStep(2);
      } else if (onboardingStep === 2) {
        setOnboardingStep(3);
      } else if (onboardingStep === 3) {
        setOnboardingStep(null);
      }
    };

    const handleSkip = () => {
      setOnboardingStep(null);
    };

    if (!onboardingStep) {
      return null;
    }

    const config = getOnboardingConfig();
    if (!config) {
      return null;
    }

    return (
      <div className={`onboarding-overlay onboarding-overlay-${config.animation}`}>
        <div 
          className="onboarding-content" 
          onClick={handleContentClick}
          style={config.position}
        >
          <p>{config.message}</p>
          <div className={`onboarding-arrow onboarding-arrow-${config.arrowDirection}`}></div>
        </div>
        <button 
          className="onboarding-skip-button"
          onClick={handleSkip}
        >
          SKIP
        </button>
      </div>
    );
  }
);

DesignerClickerOnboarding.displayName = 'DesignerClickerOnboarding';

export default DesignerClickerOnboarding;

