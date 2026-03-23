import Navbar from './components/Navbar';
import ApotheosisView from './components/views/ApotheosisView';
import DerivationView from './components/views/DerivationView';
import EnumerationView from './components/views/EnumerationView';
import ItemInfoPanel from './components/ItemInfoPanel';
import { VIEW_STATES } from './components/views/util';
import { useImagePreload } from './image/hooks';
import { useInfoPanelStore, useNavStore } from './stores';

function App() {
  const currentView = useNavStore((state) => state.currentView);
  const infoPanelOpen = useInfoPanelStore((state) => state.isOpen);

  useImagePreload();

  return (
    <div className="h-full flex flex-col">
      <Navbar />
      <div className="flex-1 min-h-0 flex align-stretch">
        <div className="flex-1 min-w-0 h-full flex justify-center">
          <div className="max-w-full overflow-scroll">
            <div className="flex-1 py-4 px-8">
              {currentView === VIEW_STATES.apotheosis && <ApotheosisView />}
              {currentView === VIEW_STATES.enumeration && <EnumerationView />}
              {currentView === VIEW_STATES.derivation && <DerivationView />}
            </div>
          </div>
        </div>
        <div className={`h-full ${infoPanelOpen ? 'w-86' : 'w-0'} transition-width duration-300 overflow-hidden`}>
          <ItemInfoPanel />
        </div>
      </div>
      <footer className="absolute left-1 bottom-2 pointer-events-none font-pixel leading-1 text-nowrap text-sm">
        for lucid blocks v2.8.7
      </footer>
    </div>
  );
}

export default App;
