
import { useState, useEffect } from "react";
import { Feather } from "lucide-react";

const funFacts = [
  "Did you know? The owner of this website is a 16-year-old!",
  "Writers Guild was built with love and lots of coffee ☕",
  "Fun fact: Shakespeare wrote 37 plays and 154 sonnets!",
  "The word 'bookworm' was first used in the 1590s 📚",
  "A group of writers is called a 'library' of authors!",
  "The longest novel ever written has over 9 million words!",
  "Jane Austen wrote all her novels anonymously!",
  "Edgar Allan Poe invented the detective story genre!",
  "The first novel was written over 1,000 years ago!",
  "J.K. Rowling wrote the first Harry Potter book on napkins!",
  "Writers Guild runs on pure creativity and determination ✨",
  "Fun fact: Reading fiction improves empathy!",
  "The average person reads about 250 words per minute",
  "Library comes from the Latin word 'liber' meaning book",
  "Mark Twain was the first author to use a typewriter!"
];

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export default function LoadingScreen({ title = "Loading...", subtitle }: LoadingScreenProps) {
  const [currentFact, setCurrentFact] = useState("");

  useEffect(() => {
    const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];
    setCurrentFact(randomFact);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-purple-800">
      <div className="text-center space-y-8 max-w-lg px-6">
        {/* Logo with animation */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-pulse">
              <Feather className="w-10 h-10 text-white" />
            </div>
            <div className="absolute inset-0 w-20 h-20 bg-white/10 rounded-2xl animate-ping"></div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          {subtitle && (
            <p className="text-white/80 text-lg">{subtitle}</p>
          )}
        </div>

        {/* Loading spinner */}
        <div className="flex justify-center">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>

        {/* Fun fact */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <p className="text-white/90 text-sm italic leading-relaxed">
            {currentFact}
          </p>
        </div>

        {/* Writers Guild branding */}
        <div className="text-white/60 text-sm">
          <p>Writers Guild</p>
          <p className="text-xs">Where words find their voice</p>
        </div>
      </div>
    </div>
  );
}
