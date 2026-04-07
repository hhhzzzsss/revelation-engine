import Navbar from './components/Navbar';
import ApotheosisView from './components/views/ApotheosisView';
import DerivationView from './components/views/DerivationView';
import EnumerationView from './components/views/EnumerationView';
import FavoriteView from './components/views/FavoritesView';
import ItemInfoPanel from './components/ItemInfoPanel';
import { VIEW_STATES } from './components/views/util';
import { useImagePreload } from './image/hooks';
import { useNavStore } from './stores';
import Tooltip from './components/Tooltip';

function App() {
  const currentView = useNavStore((state) => state.currentView);

  useImagePreload();

  return (
    <div className="h-full flex flex-col">
      <Navbar />
      <Tooltip />
      <div className="flex-1 min-h-0 flex align-stretch">
        <div className="flex-1 min-w-0 h-full flex justify-center-pseudo overflow-auto">
          <div className="py-4 px-8">
            {currentView === VIEW_STATES.apotheosis && <ApotheosisView />}
            {currentView === VIEW_STATES.enumeration && <EnumerationView />}
            {currentView === VIEW_STATES.derivation && <DerivationView />}
            {currentView === VIEW_STATES.favorites && <FavoriteView />}
          </div>
        </div>
        <ItemInfoPanel />
      </div>
      <footer className="absolute left-1 bottom-2 pointer-events-none font-pixel leading-1 text-nowrap text-sm">
        for lucid blocks v2.8.7
      </footer>
    </div>
  );
}

export default App;
