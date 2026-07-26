import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, GripVertical, GripHorizontal } from "lucide-react";

interface UploadedImage {
    id: string;
    file: File;
    preview: string;
}

interface SortableImageGridProps {
    images: UploadedImage[];
    onReorder: (newImages: UploadedImage[]) => void;
    onRemove: (id: string) => void;
}

export function SortableImageGrid({ images, onReorder, onRemove }: SortableImageGridProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = images.findIndex((img) => img.id === active.id);
            const newIndex = images.findIndex((img) => img.id === over?.id);
            onReorder(arrayMove(images, oldIndex, newIndex));
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={images.map(img => img.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1 max-w-2xl mx-auto">
                    {images.map((image, index) => (
                        <SortableImageItem
                            key={image.id}
                            image={image}
                            index={index}
                            onRemove={() => onRemove(image.id)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableImageItem({ image, index, onRemove }: {
    image: UploadedImage;
    index: number;
    onRemove: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group relative bg-surface border border-white/5 overflow-hidden transition-colors hover:border-white/20"
        >
            {/* Image Preview */}
            <img 
                src={image.preview} 
                alt={`Segment ${index + 1}`} 
                className="w-full h-auto block pointer-events-none select-none"
            />

            {/* Overlays */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Drag Handle */}
            <div 
                {...attributes}
                {...listeners}
                className="absolute top-2 left-2 w-10 h-10 bg-black/60 backdrop-blur-md rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing text-white border border-white/10 hover:bg-primary transition-colors z-20"
            >
                <GripVertical className="w-5 h-5" />
            </div>

            {/* Index Badge */}
            <div className="absolute top-2 left-14 px-3 py-2 bg-black/60 backdrop-blur-md rounded-xl text-[10px] font-black tracking-widest text-white border border-white/10 z-20">
                #{index + 1}
            </div>

            {/* Remove Action */}
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                className="absolute top-2 right-2 w-10 h-10 bg-red-500/80 backdrop-blur-md rounded-xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 z-20 border border-red-500/20"
            >
                <X className="w-5 h-5" />
            </button>
        </div>
    );
}
