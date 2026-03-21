import Navbar from './components/Navbar';
import ApotheosisView from './components/views/ApotheosisView';
import DerivationView from './components/views/DerivationView';
import EnumerationView from './components/views/EnumerationView';
import { VIEW_STATES } from './components/views/util';
import { useImagePreload } from './image/hooks';
import { useNavStore } from './stores';

function App() {
  const currentView = useNavStore((state) => state.currentView);

  useImagePreload();

  return (
    <>
      <Navbar />
      <div className="flex justify-center">
        <div className="container p-4">
          {currentView === VIEW_STATES.apotheosis && <ApotheosisView />}
          {currentView === VIEW_STATES.enumeration && <EnumerationView />}
          {currentView === VIEW_STATES.derivation && <DerivationView />}
        </div>
      </div>
    </>
  );
}

export default App;
