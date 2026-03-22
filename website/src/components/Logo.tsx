import { IMAGE_PATHS } from '../image/util';

function Logo() {
  return (
    <div className="flex items-center">
      <img src={IMAGE_PATHS.revelation_nut} className="w-16 h-16" />
      <h1 className="text-2xl/5 font-pixel">
        <span className="text-primary-500">Revelation</span>
        <br />
        <span className="text-secondary-500">Engine</span>
      </h1>
    </div>
  );
}

export default Logo;
