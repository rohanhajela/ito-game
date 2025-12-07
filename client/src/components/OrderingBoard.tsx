import React, { useEffect, useState } from 'react';
import type { Room, You } from '../types';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface OrderingBoardProps {
  room: Room;
  you: You;
  onOrderChange: (orderedIds: string[]) => void;
  canDrag: boolean;
}

export const OrderingBoard: React.FC<OrderingBoardProps> = ({
  room,
  you,
  onOrderChange,
  canDrag,
}) => {
  const [order, setOrder] = useState<string[]>(room.currentOrder);

  useEffect(() => {
    setOrder(room.currentOrder);
  }, [room.currentOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canDrag) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(order, oldIndex, newIndex);
    setOrder(newOrder);
    onOrderChange(newOrder);
  };

  const yourNumber = you.number ?? null;

  return (
    <div className="ordering-layout">
      <section className="your-number">
        <div className="your-number-card">
          <div
            className="your-avatar"
            style={{ color: you.color }}
          >
            {you.icon}
          </div>

          <div className="label">Your number</div>
          <div className="value">{yourNumber ?? '—'}</div>
        </div>
      </section>

      <section className="ordering-strip">
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          disabled={!canDrag}
        >
          <SortableContext
            items={order}
            strategy={horizontalListSortingStrategy}
          >
            <div className="strip-scroll">
              {order.map((playerId) => {
                const p = room.players.find((pl) => pl.id === playerId);
                if (!p) return null;
                return (
                  <SortablePlayerCard
                    key={p.id}
                    id={p.id}
                    name={p.name}
                    number={p.number}
                    color={p.color}
                    icon={p.icon}
                    draggable={canDrag}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </section>
    </div>
  );
};

interface SortablePlayerCardProps {
  id: string;
  name: string;
  number: number | null;
  color: string;
  icon: string;
  draggable: boolean;
}

const SortablePlayerCard: React.FC<SortablePlayerCardProps> = ({
  id,
  name,
  number,
  color,
  icon,
  draggable,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      disabled: !draggable,
    });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`player-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="player-avatar" style={{ color }}>
        <span className="player-icon">{icon}</span>
      </div>
      <div className="player-name">{name}</div>
      {number != null && <div className="player-number">{number}</div>}
    </div>
  );
};
