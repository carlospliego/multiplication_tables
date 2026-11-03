import { useEffect, useState } from 'react';
import { createRng } from './engine/rng';
import { setMuted, unlockAudio } from './audio/sfx';
import { GameProvider, useGame } from './state/GameContext';
import { FreeFlight } from './screens/FreeFlight';
import { GalaxyMap } from './screens/GalaxyMap';
import { Hangar } from './screens/Hangar';
import { ParentDashboard } from './screens/ParentDashboard';
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
    // WebKit only treats pointerup/touchend/click as activations; keep listening until the context runs.
    const events = ['pointerup', 'touchend', 'click', 'keydown'] as const;
    const unlock = () => {
      if (!unlockAudio()) return;
      for (const e of events) window.removeEventListener(e, unlock);
    };
    for (const e of events) window.addEventListener(e, unlock);
    return () => {
      for (const e of events) window.removeEventListener(e, unlock);
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
    case 'parent':
      return <ParentDashboard />;
    default:
      return <GalaxyMap />;
  }
}

function StorageBanner() {
  const { state } = useGame();
  if (state.storageOk) return null;
  return (
    <div role="status" className="storage-banner">
      Progress can't be saved on this device.
    </div>
  );
}

export function App() {
  return (
    <GameProvider>
      <div className="app-shell">
        <StorageBanner />
        <Screens />
      </div>
    </GameProvider>
  );
}
