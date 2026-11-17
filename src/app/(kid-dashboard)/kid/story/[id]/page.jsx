'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getStoryById } from '@/firebase/firestore';
import { withPlayableNarration } from '@/lib/client/media';
import { isChildVisible } from '@/lib/storyStatus.mjs';
import LoadingSpinner from '@/components/common/LoadingSpinner';

/**
 * Kid-friendly story viewer page
 */
export default function KidStoryPage({ params }) {
  const { id } = use(params); // ✅ CORREÇÃO: Unwrap params com React.use()
  const { user } = useAuth();
  const router = useRouter();
  
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [audioError, setAudioError] = useState(null);
  
  const audioRef = useRef(null);
  
  // ✅ DEBUG: Adicionar logs para verificar se o áudio está funcionando
  useEffect(() => {
    if (story) {
      console.log('🎵 Story loaded:', story);
    }
  }, [story]);
  
  // Fetch story data
  useEffect(() => {
    async function fetchStory() {
      if (!id) return;
      
      try {
        setLoading(true);
        const storyData = await withPlayableNarration(await getStoryById(id));
        
        
        // Redirect if story doesn't exist
        if (!storyData) {
          console.warn('❌ Story not found, redirecting to dashboard');
          router.push('/kid/dashboard');
          return;
        }
        
        // Child Mode may only open stories a parent approved server-side. Firestore
        // rules already restrict reads to the owning family.
        if (!isChildVisible(storyData)) {
          router.push('/kid/dashboard');
          return;
        }
        
        setStory(storyData);
      } catch (err) {
        console.error('❌ Error fetching story:', err);
        setError('Could not load the story. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStory();
  }, [id, user, router]);
  
  // ✅ MELHORADO: Handle audio playback com melhor tratamento de erros
  useEffect(() => {
    if (!story?.audioUrl) {
      console.log('🎵 No audio URL available for this story');
      return;
    }
    
    if (!audioRef.current) {
      console.log('🎵 Creating new audio element');
      audioRef.current = new Audio();
    }
    
    const audio = audioRef.current;
    audio.src = story.audioUrl;
    
    // ✅ Event listeners para melhor controle
    const handleLoadedData = () => {
      console.log('🎵 Audio loaded successfully');
      setAudioError(null);
    };
    
    const handleError = (e) => {
      console.error('🎵 Audio error:', e);
      setAudioError('Não foi possível carregar o áudio desta história.');
      setIsPlaying(false);
    };
    
    const handleEnded = () => {
      console.log('🎵 Audio ended');
      setIsPlaying(false);
    };
    
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);
    
    // ✅ Controlar play/pause
    if (isPlaying) {
      console.log('🎵 Attempting to play audio');
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('🎵 Audio playing successfully');
          })
          .catch(err => {
            console.error('🎵 Error playing audio:', err);
            setAudioError('Não foi possível reproduzir o áudio. Clique em play novamente.');
            setIsPlaying(false);
          });
      }
    } else {
      console.log('🎵 Pausing audio');
      audio.pause();
    }
    
    // ✅ Cleanup
    return () => {
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [isPlaying, story?.audioUrl]);
  
  // ✅ Cleanup quando componente desmonta
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Split story content into pages (paragraphs)
  const storyPages = story?.content ? story.content.split('\n\n').filter(p => p.trim()) : [];
  
  // Handle next/previous page navigation
  const handleNextPage = () => {
    if (currentPage < storyPages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };
  
  // ✅ MELHORADO: Toggle audio playback
  const toggleAudio = () => {
    if (!story?.audioUrl) {
      console.warn('🎵 No audio URL available');
      setAudioError('Esta história não possui áudio.');
      return;
    }
    
    if (audioError) {
      console.log('🎵 Clearing audio error and retrying');
      setAudioError(null);
    }
    
    console.log('🎵 Toggling audio, current state:', isPlaying);
    setIsPlaying(prev => !prev);
  };
  
  // Go back to dashboard
  const handleBackClick = () => {
    // ✅ Parar áudio antes de sair
    if (audioRef.current) {
      audioRef.current.pause();
    }
    router.push('/kid/dashboard');
  };
  
  if (loading) {
    return <LoadingSpinner fullScreen message="Loading story..." />;
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Oops!</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={handleBackClick}
            className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition-colors"
          >
            Back to Stories
          </button>
        </div>
      </div>
    );
  }
  
  if (!story) {
    return <LoadingSpinner fullScreen message="Story not found..." />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-100 to-purple-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white py-4 px-6 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <button
            onClick={handleBackClick}
            className="flex items-center text-indigo-200 hover:text-white transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            Back to Stories
          </button>
          
          {/* ✅ MELHORADO: Botão de play com melhor feedback visual */}
          {story.audioUrl && (
            <div className="flex items-center space-x-3">
              {audioError && (
                <span className="text-yellow-300 text-sm">
                  ⚠️ Audio issue
                </span>
              )}
              <button
                onClick={toggleAudio}
                className={`flex items-center justify-center h-12 w-12 rounded-full transition-all ${
                  audioError 
                    ? 'bg-yellow-500 hover:bg-yellow-400' 
                    : 'bg-white hover:bg-indigo-100'
                } ${
                  isPlaying 
                    ? 'shadow-lg transform scale-110' 
                    : 'shadow-md'
                }`}
                title={audioError ? 'Click to retry audio' : (isPlaying ? 'Pause story' : 'Play story')}
              >
                {isPlaying ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>
      </header>
      
      {/* ✅ NOVO: Mostrar mensagem de áudio se houver problemas */}
      {audioError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">{audioError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Story content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Story title */}
          <div className="bg-indigo-600 py-4 px-6">
            <h1 className="text-2xl md:text-3xl font-bold text-white text-center">
              {story.title}
            </h1>
            {/* ✅ NOVO: Indicador de áudio disponível */}
            {story.audioUrl && (
              <p className="text-indigo-200 text-center mt-2 text-sm">
                🎧 Click the play button to listen to this story!
              </p>
            )}
          </div>
          
          {/* Story content */}
          <div className="p-6 md:p-8">
            <div className="prose max-w-none mb-6 text-lg leading-relaxed">
              {storyPages[currentPage]}
            </div>
            
            {/* Page navigation */}
            <div className="flex justify-between items-center mt-8">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Previous Page
              </button>
              
              <span className="text-gray-500 text-sm font-medium">
                📖 Page {currentPage + 1} of {storyPages.length}
              </span>
              
              <button
                onClick={handleNextPage}
                disabled={currentPage === storyPages.length - 1}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  currentPage === storyPages.length - 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                Next Page
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 ml-1"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}