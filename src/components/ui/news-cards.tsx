"use client";

import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "framer-motion";
import { useState, useEffect } from "react";
import { BookmarkIcon, X, ExternalLink, Calendar, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NewsCard {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  timeAgo: string;
  location: string;
  image: string;
  gradientColors?: string[];
  content?: string[];
  link?: string;
}

interface StatusBar {
  id: string;
  category: string;
  subcategory: string;
  length: number;
  opacity: number;
}

interface NewsCardsProps {
  title?: string;
  subtitle?: string;
  statusBars?: StatusBar[];
  newsCards?: NewsCard[];
  enableAnimations?: boolean;
  onCardClick?: (card: NewsCard) => void;
}

const defaultStatusBars: StatusBar[] = [
  { id: "1", category: "Prensa Digital", subcategory: "Noticias", length: 3, opacity: 1 },
  { id: "2", category: "Redes Sociales", subcategory: "Twitter", length: 2, opacity: 0.7 },
  { id: "3", category: "Feeds", subcategory: "RSS", length: 1, opacity: 0.4 }
];

export function NewsCards({
  title = "Feed de Noticias",
  subtitle = "Últimas noticias de todos los medios",
  statusBars = defaultStatusBars,
  newsCards = [],
  enableAnimations = true,
  onCardClick,
}: NewsCardsProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedCard, setSelectedCard] = useState<NewsCard | null>(null);
  const [bookmarkedCards, setBookmarkedCards] = useState<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimate = enableAnimations && !shouldReduceMotion;

  const toggleBookmark = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarkedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const openCard = (card: NewsCard) => {
    if (onCardClick) {
      onCardClick(card);
    } else {
      setSelectedCard(card);
    }
  };

  const closeCard = () => {
    setSelectedCard(null);
  };

  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => setIsLoaded(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsLoaded(true);
    }
  }, [shouldAnimate]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20, scale: 0.95, filter: "blur(4px)" },
    visible: { 
      opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 400, damping: 28, mass: 0.6 }
    }
  };

  const statusBarContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
  };

  const statusBarVariants = {
    hidden: { opacity: 0, scaleX: 0, x: -20 },
    visible: { 
      opacity: 1, scaleX: 1, x: 0,
      transition: { type: "spring", stiffness: 300, damping: 25, scaleX: { type: "spring", stiffness: 400, damping: 30 } }
    }
  };

  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.4 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9, filter: "blur(6px)" },
    visible: { 
      opacity: 1, y: 0, scale: 1, filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 28, mass: 0.8 }
    }
  };

  return (
    <motion.div 
      className="w-full"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="mb-4" variants={headerVariants}>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
        
        {/* Status Bars */}
        <motion.div 
          className="flex gap-2 mt-3"
          variants={statusBarContainerVariants}
        >
          {statusBars.map((bar) => (
            <motion.div
              key={bar.id}
              className={cn(
                "h-1 rounded-full bg-primary origin-left",
                bar.length === 3 && "w-20",
                bar.length === 2 && "w-14",
                bar.length === 1 && "w-8"
              )}
              style={{ opacity: bar.opacity }}
              variants={statusBarVariants}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* News Cards */}
      <LayoutGroup>
        <motion.div 
          className="space-y-3"
          variants={cardContainerVariants}
        >
          {newsCards.map((card) => {
            if (selectedCard?.id === card.id) return null;
            
            return (
              <motion.div
                key={card.id}
                layoutId={`card-${card.id}`}
                className="group cursor-pointer rounded-xl bg-card border border-border overflow-hidden hover:shadow-lg transition-shadow"
                variants={cardVariants}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => openCard(card)}
              >
                <div className="flex gap-4 p-3">
                  {/* Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&h=200&fit=crop';
                      }}
                    />
                    {card.gradientColors && (
                      <div className={cn("absolute inset-0 bg-gradient-to-br", ...card.gradientColors)} />
                    )}
                    
                    {/* Bookmark */}
                    <button
                      className={cn(
                        "absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur-sm transition-colors",
                        bookmarkedCards.has(card.id) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={(e) => toggleBookmark(card.id, e)}
                    >
                      <BookmarkIcon className="w-3 h-3" fill={bookmarkedCards.has(card.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="font-medium text-primary">{card.category}</span>
                      <span>•</span>
                      <span>{card.subcategory}</span>
                    </div>
                    <h4 className="font-medium text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {card.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {card.timeAgo}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {card.location}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Expanded Card Modal */}
        <AnimatePresence>
          {selectedCard && (
            <>
              <motion.div
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeCard}
              />
              
              <motion.div
                layoutId={`card-${selectedCard.id}`}
                className="fixed inset-4 sm:inset-8 md:inset-16 lg:inset-24 z-50 bg-card rounded-2xl overflow-hidden shadow-2xl border border-border"
              >
                <button
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background transition-colors"
                  onClick={closeCard}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="h-full overflow-y-auto">
                  {/* Header Image */}
                  <div className="relative h-48 sm:h-64">
                    <img
                      src={selectedCard.image}
                      alt={selectedCard.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1600&h=900&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    
                    <div className="absolute bottom-4 left-4 right-4 text-foreground">
                      <p className="text-sm font-medium text-primary">{selectedCard.category} • {selectedCard.subcategory}</p>
                      <p className="text-xs text-muted-foreground mt-1">{selectedCard.timeAgo} • {selectedCard.location}</p>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      {selectedCard.title}
                    </h2>
                    
                    {selectedCard.link && (
                      <a
                        href={selectedCard.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver artículo completo
                      </a>
                    )}
                    
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {selectedCard.content ? (
                        selectedCard.content.map((paragraph, index) => (
                          <p key={index} className="text-muted-foreground mb-3">
                            {paragraph}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          No hay contenido adicional disponible para este artículo.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </LayoutGroup>
    </motion.div>
  );
}
