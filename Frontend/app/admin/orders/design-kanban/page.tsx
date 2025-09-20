'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '../../../components/Card'
import { cn } from '@/lib/utils'
import { DndContext, closestCorners } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { ordersApi, Order as ApiOrder } from '@/lib/orders-api'

import { CSS } from '@dnd-kit/utilities'

const mockUser = {
  name: 'Ali',
  role: 'designer',
}

const summarizeItems = (items?: ApiOrder['items']) => {
  if (!items || items.length === 0) return 'Custom Order';
  return items
    .map((item) => {
      const qty = item.quantity && item.quantity > 0 ? `${item.quantity} x ` : '';
      return `${qty}${item.name}`;
    })
    .join(', ');
};

type Stage = 'To Do' | 'In Progress' | 'Review' | 'Approved'

type KanbanItem = {
  id: string
  title: string
  client: string
  stage: Stage
  description: string
}

const initialData: Record<Stage, KanbanItem[]> = {
  'To Do': [],
  'In Progress': [],
  'Review': [],
  'Approved': [],
}

const stageColors: Record<Stage, string> = {
  'To Do': 'bg-gray-100',
  'In Progress': 'bg-yellow-100',
  'Review': 'bg-purple-100',
  'Approved': 'bg-green-100',
}

function DroppableColumn({
  stage,
  items,
  children,
}: {
  stage: Stage
  items: KanbanItem[]
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl p-4 min-h-[300px] transition-all',
        stageColors[stage],
        isOver && 'ring-2 ring-maroon-500'
      )}
    >
      <div className="font-semibold mb-3 text-maroon-700 text-lg">{stage}</div>
      {children}
      {items.length === 0 && (
        <div className="text-xs text-gray-400 italic mt-6 text-center">No tasks</div>
      )}
    </div>
  )
}

function SortableCard({ item }: { item: KanbanItem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...(mockUser.role === 'designer' ? listeners : {})}
      style={style}
      className={cn(
        'p-4 mb-4 shadow-md border border-gray-300 bg-white',
        isDragging && 'ring-2 ring-maroon-500'
      )}
    >
      <h2 className="font-bold text-sm mb-1">{item.title}</h2>
      <p className="text-xs text-gray-600 mb-2">{item.description}</p>
      <div className="text-xs text-gray-500">Client: {item.client}</div>
    </Card>
  )
}

export default function DesignKanbanPage() {
  const [boardData, setBoardData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const allItems = Object.values(boardData).flat()

  // Load orders from API
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiOrders = await ordersApi.getOrders();
        
        // Convert API orders to kanban format
        const kanbanData: Record<Stage, KanbanItem[]> = {
          'To Do': [],
          'In Progress': [],
          'Review': [],
          'Approved': [],
        };
        
        apiOrders.forEach((order: ApiOrder) => {
          const kanbanItem: KanbanItem = {
            id: order.id.toString(),
            title: summarizeItems(order.items),
            client: order.client_name,
            stage: order.stage === 'design' ? 'In Progress' : 
                   order.stage === 'approval' ? 'Review' : 
                   order.stage === 'delivery' ? 'Approved' : 'To Do',
            description: order.specs || 'No description provided',
          };
          
          kanbanData[kanbanItem.stage].push(kanbanItem);
        });
        
        setBoardData(kanbanData);
      } catch (err: any) {
        setError(err.message || 'Failed to load orders');
        console.error('Error loading orders:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const handleDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    let sourceStage: Stage | null = null
    let destinationStage: Stage | null = null

    for (const [stage, items] of Object.entries(boardData)) {
      if (items.find((item) => item.id === active.id)) {
        sourceStage = stage as Stage
      }
      if (items.find((item) => item.id === over.id)) {
        destinationStage = stage as Stage
      }
    }

    if (!sourceStage || !destinationStage) return

    const sourceList = [...boardData[sourceStage]]
    const destinationList = [...boardData[destinationStage]]

    const sourceIndex = sourceList.findIndex((item) => item.id === active.id)
    const movedItem = sourceList[sourceIndex]

    // Remove from source
    sourceList.splice(sourceIndex, 1)

    if (sourceStage === destinationStage) {
      const destIndex = destinationList.findIndex((item) => item.id === over.id)
      destinationList.splice(destIndex, 0, movedItem)
      setBoardData({
        ...boardData,
        [sourceStage]: destinationList,
      })
    } else {
      movedItem.stage = destinationStage
      const destIndex = destinationList.findIndex((item) => item.id === over.id)
      destinationList.splice(destIndex === -1 ? 0 : destIndex, 0, movedItem)
      setBoardData({
        ...boardData,
        [sourceStage]: sourceList,
        [destinationStage]: destinationList,
      })
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading design tasks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-lg text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#891F1A] text-white px-4 py-2 rounded hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-r from-maroon-600 to-maroon-400 text-white p-6 rounded-xl shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Design Kanban</h1>
          <p className="text-sm opacity-80">Track design orders in progress</p>
        </div>
      </div>

      <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {Object.entries(boardData).map(([stage, items]) => (
            <DroppableColumn key={stage} stage={stage as Stage} items={items}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                {items.map((item) => (
                  <SortableCard key={item.id} item={item} />
                ))}
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
      </DndContext>
    </div>
  )
}


