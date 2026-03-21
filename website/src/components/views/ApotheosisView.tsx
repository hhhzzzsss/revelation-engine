import { useMemo } from 'react';
import type { QuantifiedItem } from '../../item/types';
import { useApotheosisSolver } from '../../item/hooks';
import { useApotheosisStore } from '../../stores';
import PickableSlot from '../PickableSlot';
import LabeledSlot from '../LabeledSlot';

function ApotheosisView() {
  const { qItems, setQItem } = useApotheosisStore();
  const solver = useApotheosisSolver();

  const result: QuantifiedItem | null = useMemo(() => {
    if (!solver) return null;
    return solver.fuse(qItems.filter((qItem) => qItem !== null));
  }, [solver, qItems]);

  if (!solver) {
    return <div className="font-pixel text-2xl">Loading...</div>;
  }

  return (
    <>
      <h1 className="text-4xl font-pixel mb-4">Apotheosis</h1>
      <div className="flex space-x-6">
        <div className="flex-1 flex flex-col">
          <h2 className="text-2xl font-pixel">Input</h2>
          {qItems.map((qItem, index) => (
            <PickableSlot
              key={index}
              qItem={qItem}
              onQItemChange={(newQItem) => setQItem(index, newQItem)}
            />
          ))}
        </div>
        <div className="flex flex-col min-w-96">
          <h2 className="text-2xl font-pixel">Output</h2>
          <LabeledSlot qItem={result} />
        </div>
      </div>
    </>
  );
}

export default ApotheosisView;
