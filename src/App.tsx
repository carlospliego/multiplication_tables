import { GameProvider, useGame } from './state/GameContext';
import { FreeFlight } from './screens/FreeFlight';
import { GalaxyMap } from './screens/GalaxyMap';
import { Hangar } from './screens/Hangar';
import { MissionScreen } from './screens/MissionScreen';
import { SystemsCheck } from './screens/SystemsCheck';
import { Welcome } from './screens/Welcome';

export const GAME_TITLE = 'Times Table Rocket';

function Screens() {
  const { state } = useGame();
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
    case 'hangar':
      return <Hangar />;
    default:
      // map, plus screens that arrive in later tasks (starMap, parent*)
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
