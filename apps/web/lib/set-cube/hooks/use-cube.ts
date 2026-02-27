import { useCallback, useEffect, useState } from 'react';

import {
  addArchiveCard,
  addCard,
  exportCubeCobra,
  exportCubeJson,
  importCubeJson,
  loadCube,
  makeEmptyCube,
  removeArchiveCard,
  removeCard,
  saveCube,
  updateCopies,
} from '../storage';

import type { CubeList, ScryfallCard } from '../types';

export function useCube() {
  const [cube, setCube] = useState<CubeList>(makeEmptyCube);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setCube(loadCube());
    setIsLoaded(true);
  }, []);

  const persist = useCallback((updated: CubeList) => {
    setCube(updated);
    saveCube(updated);
  }, []);

  const handleAddCard = useCallback(
    (scryfallData: ScryfallCard) => {
      persist(addCard(cube, scryfallData));
    },
    [cube, persist]
  );

  const handleRemoveCard = useCallback(
    (cardId: string) => {
      persist(removeCard(cube, cardId));
    },
    [cube, persist]
  );

  const handleUpdateCopies = useCallback(
    (cardId: string, copies: number) => {
      persist(updateCopies(cube, cardId, copies));
    },
    [cube, persist]
  );

  const handleExport = useCallback(() => {
    exportCubeJson(cube);
  }, [cube]);

  const handleExportCubeCobra = useCallback(() => {
    exportCubeCobra(cube);
  }, [cube]);

  const handleImport = useCallback(
    async (file: File) => {
      const imported = await importCubeJson(file);
      persist(imported);
    },
    [persist]
  );

  const handleRename = useCallback(
    (name: string) => {
      persist({ ...cube, name });
    },
    [cube, persist]
  );

  const handleAddArchiveCard = useCallback(
    (scryfallData: ScryfallCard) => {
      persist(addArchiveCard(cube, scryfallData));
    },
    [cube, persist]
  );

  const handleRemoveArchiveCard = useCallback(
    (cardId: string) => {
      persist(removeArchiveCard(cube, cardId));
    },
    [cube, persist]
  );

  return {
    cube,
    isLoaded,
    addCard: handleAddCard,
    removeCard: handleRemoveCard,
    updateCopies: handleUpdateCopies,
    addArchiveCard: handleAddArchiveCard,
    removeArchiveCard: handleRemoveArchiveCard,
    exportCube: handleExport,
    exportCubeCobra: handleExportCubeCobra,
    importCube: handleImport,
    renameCube: handleRename,
  };
}
