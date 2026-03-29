import { useMemo } from 'react';
import type { QuantifiedItem } from '../../item/types';
import { useApotheosisSolver } from '../../algorithm/hooks';
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
      <div className="flex justify-center">
        <div className="flex flex-col px-4 border-r-2 border-secondary-800">
          <h2 className="text-2xl font-pixel">Input</h2>
          {qItems.map((qItem, index) => (
            <PickableSlot
              key={index}
              qItem={qItem}
              onQItemChange={(newQItem) => setQItem(index, newQItem)}
            />
          ))}
        </div>
        <div className="px-4">
          <h2 className="text-2xl font-pixel">Output</h2>
          <LabeledSlot item={result?.item} count={result?.count} />
        </div>
      </div>
    </>
  );
}

export default ApotheosisView;
