import { useNavStore } from '../stores';
import Logo from './Logo';
import { VIEW_STATES } from './views/util';

interface NavButtonProps {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}
function NavButton({ children, selected, onClick }: NavButtonProps) {
  const borderStyle = selected ? 'border-primary-500' : 'border-transparent hover:border-secondary-700';
  const fillStyle = selected ? 'bg-bg-600' : 'bg-transparent';
  return (
    <button
      className={`p-2 font-pixel rounded-md border-2 ${borderStyle} ${fillStyle}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Navbar() {
  const { currentView, setView } = useNavStore();

  return (
    <div className="static border-b-2 border-secondary-800 flex items-center space-x-4">
      <Logo />
      <nav className="flex-1 px-4">
        <ul className="flex justify-end space-x-4">
          {Object.values(VIEW_STATES).map((view) => (
            <li key={view}>
              <NavButton
                selected={currentView === view}
                onClick={() => setView(view)}
              >
                {view}
              </NavButton>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export default Navbar;
