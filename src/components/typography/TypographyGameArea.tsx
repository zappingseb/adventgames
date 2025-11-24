import { useState, useEffect, useCallback, useRef } from 'react';
import TypographyCard from './TypographyCard';
import TypographyBins from './TypographyBins';
import typographyData from '../../data/typographyData.json';
import { TYPOGRAPHY_CONSTANTS } from '../../constants/typographyConstants';
import './TypographyGameArea.css';

interface TypographyGameAreaProps {
  gameActive: boolean;
  onScoreUpdate: (points: number) => void;
  onMistake: () => void;
  onGameOver: () => void;
  onLevelChange: (level: number) => void;
}

interface TypographyItem {
  id: string;
  fontName: string;
  fontFamily: string;
  category: string;
  text: string;
  fontWeight: string;
  fontStyle: string;
  company?: string;
  pair?: string;
}

function TypographyGameArea({ 
  gameActive, 
  onScoreUpdate, 
  onMistake,
  onGameOver,
  onLevelChange
}: TypographyGameAreaProps) {
  const [currentItem, setCurrentItem] = useState<TypographyItem | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [itemsCompleted, setItemsCompleted] = useState(0);
  const [shuffledItems, setShuffledItems] = useState<TypographyItem[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ side: 'left' | 'right' | null; type: 'correct' | 'incorrect' | null }>({ side: null, type: null });
  const [showFontName, setShowFontName] = useState<boolean | undefined>(undefined);
  const [currentPair, setCurrentPair] = useState<{ left: string; right: string } | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);
  const levelRef = useRef<number>(1); // Track level to detect changes
  const usedPairsRef = useRef<Set<string>>(new Set()); // Track which pairs have been shown

  // Initialize level - shuffle items and reset state
  const initializeLevel = useCallback((levelId: number) => {
    const levelData = typographyData.levels.find(level => level.id === levelId);
    if (!levelData) {
      console.error(`Level ${levelId} not found`);
      return;
    }

    // Reset used pairs for new level
    usedPairsRef.current.clear();
    
    // For levels with useCompanyPairs flag, handle pairs differently
    if ('useCompanyPairs' in levelData && levelData.useCompanyPairs && 'pairs' in levelData && levelData.pairs) {
      // Select 10 random pairs that haven't been shown yet
      const availablePairs = [...levelData.pairs];
      const selectedPairs = [];
      
      for (let i = 0; i < Math.min(10, availablePairs.length); i++) {
        // Filter out already used pairs
        const unusedPairs = availablePairs.filter(p => {
          const pairKey = `${p.left}-${p.right}`;
          return !usedPairsRef.current.has(pairKey);
        });
        
        if (unusedPairs.length === 0) {
          // If all pairs used, reset and start over
          usedPairsRef.current.clear();
          unusedPairs.push(...availablePairs);
        }
        
        // Randomly select a pair
        const randomIndex = Math.floor(Math.random() * unusedPairs.length);
        const selectedPair = unusedPairs[randomIndex];
        selectedPairs.push(selectedPair);
        
        // Mark pair as used
        const pairKey = `${selectedPair.left}-${selectedPair.right}`;
        usedPairsRef.current.add(pairKey);
      }
      
      // Create items from pairs - randomly choose left or right company for each
      // Use sample texts: "Aa", "Type", "Quick" instead of company names when useCompanyPairs is true
      const sampleTexts = [
        "The quick brown fox jumps over the lazy dog.",
        "Sphinx of black quartz, judge my vow.",
        "Pack my box with five dozen liquor jugs.",
        "How vexingly quick daft zebras jump!",
        "Jackdaws love my big sphinx of quartz.",
        "Waltz, nymph, for quick jigs vex Bud.",
        "Quick zephyrs blow, vexing daft Jim.",
        "Two driven jocks help fax my big quiz.",
        "Five quacking zephyrs jolt my wax bed.",
        "The five boxing wizards jump quickly."
      ];
      const pairItems: TypographyItem[] = [];
      for (let i = 0; i < selectedPairs.length; i++) {
        const pair = selectedPairs[i];
        const useLeft = Math.random() < 0.5;
        const companyName = useLeft ? pair.left : pair.right;
        const companyItem = levelData.items.find(item => 
          item.company === companyName
        );
        if (companyItem) {
          // Create a new item with sample text instead of company name when using company pairs
          const itemWithSampleText: TypographyItem = {
            ...companyItem,
            text: sampleTexts[i % sampleTexts.length]
          };
          pairItems.push(itemWithSampleText);
        }
      }
      
      // Set the first pair for bin labels
      if (selectedPairs.length > 0) {
        const firstPair = selectedPairs[0];
        setCurrentPair({ left: firstPair.left, right: firstPair.right });
      }
      
      setShuffledItems(pairItems.length > 0 ? pairItems : levelData.items);
      
      // Set first item after state update
      setTimeout(() => {
        const firstItem = pairItems.length > 0 ? pairItems[0] : (levelData.items.length > 0 ? levelData.items[0] : null);
        setCurrentItem(firstItem);
      }, 0);
    } else {
      // For other levels, just shuffle the items
      const shuffled = [...levelData.items].sort(() => Math.random() - 0.5);
      setShuffledItems(shuffled);
      setCurrentPair(null);
      
      // Set first item
      const firstItem = shuffled.length > 0 ? shuffled[0] : null;
      setCurrentItem(firstItem);
    }
    
    setCurrentItemIndex(0);
    setItemsCompleted(0);
    levelRef.current = levelId;
  }, []);

  // Update current pair when item changes (for levels with useCompanyPairs)
  useEffect(() => {
    const levelData = typographyData.levels.find(level => level.id === currentLevel);
    if (levelData && 'useCompanyPairs' in levelData && levelData.useCompanyPairs && currentItem?.company) {
      if ('pairs' in levelData && levelData.pairs) {
        const pair = levelData.pairs.find(p => 
          p.left === currentItem.company || p.right === currentItem.company
        );
        if (pair) {
          setCurrentPair({ left: pair.left, right: pair.right });
        }
      }
    }
    if (levelData && 'showFontName' in levelData && levelData.showFontName !== undefined) {
      setShowFontName(levelData.showFontName);
    } else {
      setShowFontName(undefined);
    }
  }, [currentItem, currentLevel]);

  // Check if swipe is correct
  const checkSwipe = useCallback((direction: 'left' | 'right', item: TypographyItem) => {
    const levelData = typographyData.levels.find(level => level.id === currentLevel);
    if (!levelData) return false;

    // For levels with useCompanyPairs flag, check pairs
    if ('useCompanyPairs' in levelData && levelData.useCompanyPairs && 'pairs' in levelData && levelData.pairs && item.company) {
      const pair = levelData.pairs.find(p => 
        (p.left === item.company && direction === 'left') ||
        (p.right === item.company && direction === 'right')
      );
      return !!pair;
    }

    // For other levels, check category against binLeft/binRight
    // Normalize bin label to match category format
    const binLabel = direction === 'left' ? levelData.binLeft : levelData.binRight;
    // Convert to lowercase and replace spaces/slashes with hyphens
    // "SANS-SERIF" → "sans-serif", "LIGHT/REGULAR" → "light-regular", "BODY TEXT" → "body-text"
    const normalizedBinLabel = binLabel.toLowerCase().replace(/[\s\/]+/g, '-');
    const itemCategory = item.category.toLowerCase();
    
    // Check if category matches normalized bin label exactly
    // OR if category matches the first word of the normalized bin label
    // Examples:
    // - "sans-serif" === "sans-serif" ✓
    // - "light" === "light" (from "light-regular") ✓
    // - "body" === "body" (from "body-text") ✓
    return itemCategory === normalizedBinLabel || 
           itemCategory === normalizedBinLabel.split('-')[0];
  }, [currentLevel]);

  // Handle swipe
  const handleSwipe = useCallback((direction: 'left' | 'right') => {
    if (!currentItem) return;

    const isCorrect = checkSwipe(direction, currentItem);
    
    // Show feedback
    setFeedback({ 
      side: direction, 
      type: isCorrect ? 'correct' : 'incorrect' 
    });

    // Clear feedback after animation
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedback({ side: null, type: null });
    }, 500);

    if (isCorrect) {
      onScoreUpdate(1);
    } else {
      onMistake();
    }
    
    // Increment items completed
    const newItemsCompleted = itemsCompleted + 1;
    const newItemIndex = currentItemIndex + 1;
    
    // Check if level is complete (10 items)
    if (newItemsCompleted >= TYPOGRAPHY_CONSTANTS.CARDS_PER_LEVEL) {
      // Level complete - move to next level
      if (currentLevel < 6) {
        setTimeout(() => {
          const nextLevel = currentLevel + 1;
          setCurrentLevel(nextLevel);
          if (onLevelChange) {
            onLevelChange(nextLevel);
            
          }
          initializeLevel(nextLevel);
        }, 1000);
      } else {
        // All levels complete
        setTimeout(() => {
          onGameOver();
        }, 1000);
      }
    } else {
      // Show next item from shuffled array
      setTimeout(() => {
        setItemsCompleted(newItemsCompleted);
        setCurrentItemIndex(newItemIndex);
        const nextItem = shuffledItems[newItemIndex];
        if (nextItem) {
          setCurrentItem(nextItem);
        }
      }, 1000);
    }
  }, [currentItem, checkSwipe, onScoreUpdate, onMistake, itemsCompleted, currentItemIndex, currentLevel, shuffledItems, onGameOver, initializeLevel, onLevelChange]);

  // Initialize game
  useEffect(() => {
    if (gameActive) {
      setCurrentLevel(1);
      setItemsCompleted(0);
      if (onLevelChange) {
        onLevelChange(1);
      }
      initializeLevel(1);
      setShowFontName(undefined);
      setFeedback({ side: null, type: null });
    }
  }, [gameActive, initializeLevel, onLevelChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Get level data directly - don't use callback to avoid stale closures
  const levelData = typographyData.levels.find(level => level.id === currentLevel);
  if (!levelData) {
    console.error(`Level ${currentLevel} not found`);
    return null;
  }

  // Get bin labels - use company names if useCompanyPairs is true and pair is set, otherwise use level data
  const useCompanyPairs = 'useCompanyPairs' in levelData && levelData.useCompanyPairs;
  const binLeft = useCompanyPairs && currentPair ? currentPair.left : levelData.binLeft;
  const binRight = useCompanyPairs && currentPair ? currentPair.right : levelData.binRight;

  return (
    <div className="typography-game-area">
      <TypographyBins
        binLeft={binLeft}
        binRight={binRight}
        showFeedback={feedback.side}
        feedbackType={feedback.type}
      />
      {currentItem && (
        <div className="typography-card-container">
          <TypographyCard
            id={currentItem.id}
            text={currentItem.text}
            fontName={currentItem.fontName}
            fontFamily={currentItem.fontFamily}
            fontWeight={currentItem.fontWeight}
            fontStyle={currentItem.fontStyle}
            onSwipe={handleSwipe}
            disabled={!gameActive}
            showFontName={showFontName}
          />
          
        </div>
      )}
      <div className="typography-level-info">
        Level {currentLevel}: {levelData.name}
      </div>
    </div>
  );
}

export default TypographyGameArea;

