import React from "react";
import PressClippingCard from "../PressClippingCard";
import { PressClipping } from "@/hooks/prensa/types";

interface ClippingsGridProps {
  clippings: PressClipping[];
  publicationName: string;
}

const ClippingsGrid = ({ clippings, publicationName }: ClippingsGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clippings.map((clipping) => (
        <PressClippingCard
          key={clipping.id}
          id={clipping.id}
          title={clipping.title}
          content={clipping.content}
          category={clipping.category}
          pageNumber={clipping.page_number}
          keywords={clipping.keywords}
          clientRelevance={clipping.client_relevance}
          publicationName={publicationName}
        />
      ))}
    </div>
  );
};

export default ClippingsGrid;
