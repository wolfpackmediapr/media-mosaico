
interface MetadataDisplayProps {
  emisora?: string;
  programa?: string;
  horario?: string;
  categoria?: string;
}

export const MetadataDisplay = ({ emisora, programa, horario, categoria }: MetadataDisplayProps) => {
  const hasMetadata = emisora || programa || horario || categoria;

  if (!hasMetadata) {
    return (
      <div className="col-span-2 text-gray-500 italic">
        No hay información de metadatos disponible
      </div>
    );
  }

  return (
    <>
      {emisora && (
        <div>
          <span className="font-semibold">Emisora:</span>{' '}
          <span>{emisora}</span>
        </div>
      )}
      {programa && (
        <div>
          <span className="font-semibold">Programa:</span>{' '}
          <span>{programa}</span>
        </div>
      )}
      {horario && (
        <div>
          <span className="font-semibold">Horario:</span>{' '}
          <span>{horario}</span>
        </div>
      )}
      {categoria && (
        <div>
          <span className="font-semibold">Categoría:</span>{' '}
          <span>{categoria}</span>
        </div>
      )}
    </>
  );
};
