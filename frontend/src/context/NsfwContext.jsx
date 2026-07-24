import { createContext, useContext, useState } from 'react';

const NsfwContext = createContext();

export const NsfwProvider = ({ children }) => {
  const [nsfwRevealed, setNsfwRevealedState] = useState(() => {
    return sessionStorage.getItem('nsfwRevealed') === 'true';
  });

  const revealNsfw = () => {
    sessionStorage.setItem('nsfwRevealed', 'true');
    setNsfwRevealedState(true);
  };

  return (
    <NsfwContext.Provider value={{ nsfwRevealed, revealNsfw }}>
      {children}
    </NsfwContext.Provider>
  );
};

export const useNsfw = () => {
  const context = useContext(NsfwContext);
  if (!context) {
    throw new Error('useNsfw must be used within a NsfwProvider');
  }
  return context;
};
