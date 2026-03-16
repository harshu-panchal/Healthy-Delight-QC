import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SearchBar() {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);

  const handleSearchClick = () => {
    navigate('/search');
  };

  const handleVoiceSearch = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents triggering handleSearchClick
    // @ts-expect-error Window interface lack speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice search.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = () => {
      console.error("Speech recognition error");
      setIsListening(false);
    };
    
    recognition.onresult = (event: { results: Array<Array<{ transcript: string }>> }) => {
      const speechResult = event.results[0][0].transcript;
      navigate(`/search?q=${encodeURIComponent(speechResult.trim())}`);
    };
    
    recognition.start();
  };

  return (
    <div className="px-4 mb-4">
      <div
        onClick={handleSearchClick}
        className="w-full bg-white rounded-xl shadow-sm border border-neutral-200 px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow relative"
      >
        <span className="text-neutral-400 text-lg">🔍</span>
        <span className="flex-1 text-sm text-neutral-500">
          {isListening ? 'Listening...' : 'Search for atta, dal, coke and more'}
        </span>
        {/* Voice Search Icon */}
        <button 
          onClick={handleVoiceSearch}
          className={`p-2 -mr-2 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-500' : 'text-neutral-500 hover:bg-neutral-100'}`}
          aria-label="Voice search"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
            <line x1="8" y1="22" x2="16" y2="22"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}


