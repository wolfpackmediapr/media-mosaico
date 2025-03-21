
import { CardContent } from "@/components/ui/card";
import { MediaOutletForm } from "@/components/settings/media/MediaOutletForm";
import { MediaOutletsTable } from "@/components/settings/media/MediaOutletsTable";
import { MediaLoadingState } from "@/components/settings/media/MediaLoadingState";
import { MediaEmptyState } from "@/components/settings/media/MediaEmptyState";
import { MediaPagination } from "@/components/settings/media/MediaPagination";
import { MediaOutlet } from "@/services/media/mediaService";

interface MediaContentProps {
  loading: boolean;
  showAddForm: boolean;
  onAddFormSubmit: (formData: { type: string; name: string; folder: string }) => Promise<boolean>;
  onAddFormCancel: () => void;
  mediaOutlets: MediaOutlet[];
  hasFilter: boolean;
  sortField: keyof MediaOutlet;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof MediaOutlet) => void;
  onEdit: (outlet: MediaOutlet) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editFormData: MediaOutlet | null;
  onEditFormChange: (updatedOutlet: MediaOutlet) => void;
  onSaveEdit: () => Promise<boolean>;
  onCancelEdit: () => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function MediaContent({
  loading,
  showAddForm,
  onAddFormSubmit,
  onAddFormCancel,
  mediaOutlets,
  hasFilter,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  editingId,
  editFormData,
  onEditFormChange,
  onSaveEdit,
  onCancelEdit,
  currentPage,
  totalPages,
  onPageChange
}: MediaContentProps) {
  return (
    <CardContent>
      {showAddForm && (
        <MediaOutletForm 
          onSubmit={onAddFormSubmit}
          onCancel={onAddFormCancel}
        />
      )}

      {loading ? (
        <MediaLoadingState />
      ) : mediaOutlets.length === 0 ? (
        <MediaEmptyState hasFilter={hasFilter} />
      ) : (
        <>
          <MediaOutletsTable 
            mediaOutlets={mediaOutlets} 
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            onEdit={onEdit}
            onDelete={onDelete}
            editingId={editingId}
            editFormData={editFormData}
            onEditFormChange={onEditFormChange}
            onSaveEdit={onSaveEdit}
            onCancelEdit={onCancelEdit}
            loading={loading}
          />
          <MediaPagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </>
      )}
    </CardContent>
  );
}
