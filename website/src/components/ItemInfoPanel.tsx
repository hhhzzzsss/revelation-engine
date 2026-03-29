import { useInfoPanelStore } from '../stores';
import LabeledSlot from './LabeledSlot';

function ItemInfoPanel() {
  const item = useInfoPanelStore((state) => state.item);
  const isOpen = useInfoPanelStore((state) => state.isOpen);
  const close = useInfoPanelStore((state) => state.close);

  const properties = item ? {
    'id': item.id,
    'fuseable': item.essence.fuseable,
    'rank': item.essence.rank,
    'color': `( ${item.color.map(round).join(', ')} )`,
    'energy': round(item.essence.energy),
    'bias': round(item.essence.bias),
  } : undefined;
  const essence = item?.essence.properties;
  const tags = item?.essence.tags.toSorted();
  const outputTags = item?.essence.output_tags.toSorted();
  const blockData = item?.block_data ? {
    'unbreakable': item.block_data.unbreakable,
    'flammability': round(item.block_data.flammability),
    'sustain fire': item.block_data.sustain_fire,
    'pickaxe affinity': item.block_data.pickaxe_affinity,
    'pickaxe required': item.block_data.pickaxe_required,
    'meat affinity': item.block_data.meat_affinity,
    'plant affinity': item.block_data.plant_affinity,
    'shovel affinity': item.block_data.shovel_affinity,
    'axe affinity': item.block_data.axe_affinity,
    'axe required': item.block_data.axe_required,
    'break time': round(item.block_data.break_time),
  } : undefined;
  const toolData = item?.tool_data ? {
    'attack increase': round(item.tool_data.attack_increase),
    'axe boost': item.tool_data.axe_boost,
    'pickaxe boost': item.tool_data.pickaxe_boost,
    'cristella boost': item.tool_data.cristella_boost,
    'slime boost': item.tool_data.slime_boost,
    'plant boost': item.tool_data.plant_boost,
    'meat boost': item.tool_data.meat_boost,
    'shovel boost': item.tool_data.shovel_boost,
    'break speed increase': round(item.tool_data.break_speed_increase),
    'fire aspect': item.tool_data.fire_aspect

  } : undefined;

  return (
    <div className={`h-full ${isOpen ? 'w-86' : 'w-0'} transition-width duration-300 overflow-hidden`}>
      <section className="w-86 h-full px-4 border-l-2 border-secondary-800 flex flex-col">
        <header className="flex justify-between items-start my-2">
          <h2 className="inline-block text-xl font-pixel">Item Details</h2>
          {isOpen && (
            <button
              onClick={close}
              className="inline-block font-pixel text-lg text-severe-500 hover:text-severe-400"
            >
              x
            </button>
          )}
        </header>

        {!item && <div className="font-pixel">Click an item to see details</div>}

        {item && (
          <div className="flex-1 py-2 space-y-2 overflow-y-auto">
            <LabeledSlot item={item} />
            <DictInfo title="Properties" dict={properties} />
            <DictInfo title="Essence" dict={essence} />
            <ListInfo title="Tags" list={tags} />
            <ListInfo title="Output Tags" list={outputTags} />
            {blockData && <DictInfo title="Block Data" dict={blockData} />}
            {toolData && <DictInfo title="Tool Data" dict={toolData} />}
          </div>
        )}
      </section>
    </div>
  );
}

function DictInfo({title, dict={}}: {title: string, dict?: Record<string, string | number | boolean>}) {
  return (
    <div>
      <h3 className="font-pixel text-lg/5">{title}</h3>
      <ul className="pl-4">
        {Object.entries(dict).map(([key, value]) => (
          <li key={key} className="font-pixel text-sm/5 text-fg-600">
            {`${key}: ${value}`}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ListInfo({title, list=[]}: {title: string, list?: string[]}) {
  return (
    <div>
      <h3 className="font-pixel text-lg/5">{title}</h3>
      <ul className="pl-4">
        {list.map((value) => (
          <li key={value} className="font-pixel text-sm/5 text-fg-600">
            {value}
          </li>
        ))}
        {!list.length && <li className="font-pixel text-sm/5 text-fg-600">None</li>}
      </ul>
    </div>
  );
}

const round = (n: number) => {
  return parseFloat(n.toFixed(3));
};

export default ItemInfoPanel;
