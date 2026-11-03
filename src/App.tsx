import { useEffect, useState } from 'react';
import { createRng } from './engine/rng';
import { setMuted, unlockAudio } from './audio/sfx';
import { GameProvider, useGame } from './state/GameContext';
import { FreeFlight } from './screens/FreeFlight';
import { GalaxyMap } from './screens/GalaxyMap';
import { Hangar } from './screens/Hangar';
import { MissionScreen } from './screens/MissionScreen';
import { ParentGate } from './screens/ParentGate';
import { StarMap } from './screens/StarMap';
import { SystemsCheck } from './screens/SystemsCheck';
import { Welcome } from './screens/Welcome';

export const GAME_TITLE = 'Times Table Rocket';

function ParentGateRoute() {
  const [rng] = useState(() => createRng(Date.now()));
  return <ParentGate rng={rng} />;
}

function Screens() {
  const { state } = useGame();
  const soundOn = state.save?.settings.soundOn ?? true;
  useEffect(() => {
    setMuted(!soundOn);
  }, [soundOn]);
  useEffect(() => {
    const unlock = () => {
      // Keep listening until a context was actually created, so a failed attempt can retry.
      if (!unlockAudio()) return;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  if (!state.save) return <Welcome />;
  switch (state.screen) {
    case 'welcome':
      return <Welcome />;
    case 'systemsCheck':
      return <SystemsCheck />;
    case 'mission':
      return <MissionScreen />;
    case 'freeFlight':
      return <FreeFlight />;
    case 'starMap':
      return <StarMap />;
    case 'hangar':
      return <Hangar />;
    case 'parentGate':
      return <ParentGateRoute />;
    default:
      // map, plus screens that arrive in later tasks (parent)
      return <GalaxyMap />;
  }
}

export function App() {
  return (
    <GameProvider>
      <Screens />
    </GameProvider>
  );
}
