"use client";

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  mockDeals, 
  mockStages, 
  Deal, 
  getPipelines, 
  getDeals, 
  createDeal, 
  updateDealStage,
  getContacts,
  createContact
} from '../lib/api';
import { 
  Plus, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Sparkles,
  Users,
  X 
} from 'lucide-react';

export const PipelineView: React.FC = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [showAddDealModal, setShowAddDealModal] = useState(false);

  // Form states for new deal
  const [newTitle, setNewTitle] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newStage, setNewStage] = useState('');

  // Avoid hydration mismatch in Next.js App Router
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch pipelines (stages) and deals on mount
  useEffect(() => {
    const loadPipelineData = async () => {
      try {
        setLoading(true);
        const pipelines = await getPipelines();
        let loadedStages = mockStages.map(s => ({ id: s.id, title: s.title }));
        
        if (pipelines && pipelines.length > 0) {
          const mainPipeline = pipelines[0];
          if (mainPipeline.stages && mainPipeline.stages.length > 0) {
            loadedStages = mainPipeline.stages.map((s: any) => ({
              id: String(s.id),
              title: s.name
            }));
          }
        }
        setStages(loadedStages);
        if (loadedStages.length > 0) {
          setNewStage(loadedStages[0].id);
        }

        const loadedDeals = await getDeals();
        setDeals(loadedDeals);
      } catch (err) {
        console.error('Failed to load pipeline data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPipelineData();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Determine status based on destination stage title/name
    const destStage = stages.find(s => s.id === destination.droppableId);
    const destStageName = (destStage?.title || '').toLowerCase();
    const newStatus = destStageName.includes('won') ? 'won' : destStageName.includes('lost') ? 'lost' : 'active';

    // Update locally for optimistic UI rendering
    setDeals(prevDeals => {
      return prevDeals.map(d => {
        if (d.id === draggableId) {
          return { 
            ...d, 
            stageId: destination.droppableId,
            status: newStatus
          };
        }
        return d;
      });
    });

    // Send update request to backend
    try {
      await updateDealStage(draggableId, destination.droppableId, newStatus);
    } catch (err) {
      console.error('Failed to update deal stage in database:', err);
    }
  };

  const handleAddDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newValue || !newContact) return;

    try {
      const contacts = await getContacts();
      let contact = contacts.find(c => c.name.toLowerCase().includes(newContact.toLowerCase()));
      
      if (!contact) {
        // Create contact automatically if it doesn't exist yet
        contact = await createContact({
          name: newContact,
          email: `${newContact.toLowerCase().replace(/\s+/g, '')}@domain.local`,
          phone: '+1555000000'
        });
      }

      const createdDeal = await createDeal({
        title: newTitle,
        value: parseFloat(newValue),
        contactId: contact.id,
        stageId: newStage
      });

      setDeals([createdDeal, ...deals]);
      setNewTitle('');
      setNewValue('');
      setNewContact('');
      setNewCompany('');
      setShowAddDealModal(false);
    } catch (err) {
      console.error('Failed to create deal:', err);
      alert('Failed to create sales deal.');
    }
  };

  if (!isMounted) return null;

  // Calculate totals
  const totalValue = deals.reduce((acc, curr) => curr.status === 'active' || curr.status === 'won' ? acc + curr.value : acc, 0);
  const activeDealsCount = deals.filter(d => d.status === 'active').length;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col text-left space-y-4 overflow-hidden">
      {/* Header Pipeline Summary Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-950/20 border border-zinc-900 rounded-2xl">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Pipeline Value</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <DollarSign className="h-5 w-5 text-purple-400" />
              <span className="text-lg font-black text-zinc-200">${totalValue.toLocaleString()}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-900"></div>
          <div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-bold">Active Deals</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              <span className="text-lg font-black text-zinc-200">{activeDealsCount} leads</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowAddDealModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-950/20"
        >
          <Plus className="h-4 w-4" />
          <span>New Deal</span>
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto pb-4 scrollbar-thin">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 min-w-[1200px] h-full">
            {stages.map((stage) => {
              const stageDeals = deals.filter(d => d.stageId === stage.id);
              const columnSum = stageDeals.reduce((sum, d) => sum + d.value, 0);

              return (
                <div key={stage.id} className="flex-1 w-64 bg-zinc-950/30 border border-zinc-900/80 rounded-2xl flex flex-col overflow-hidden max-h-[85%]">
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-zinc-900 bg-zinc-950/40 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${stage.title.toLowerCase().includes('won') ? 'bg-emerald-500 animate-pulse' : stage.title.toLowerCase().includes('lost') ? 'bg-rose-500' : 'bg-purple-500'}`}></span>
                        {stage.title}
                      </h4>
                      <span className="text-[9px] font-mono text-zinc-500 mt-0.5 block">
                        {stageDeals.length} deals
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-400">
                      ${columnSum >= 1000 ? `${(columnSum / 1000).toFixed(1)}k` : columnSum}
                    </span>
                  </div>

                  {/* Cards Droppable Wrapper */}
                  <Droppable droppableId={stage.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin transition-colors ${
                          snapshot.isDraggingOver ? 'bg-zinc-900/10' : ''
                        }`}
                      >
                        {stageDeals.map((deal, index) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`p-3.5 rounded-xl border bg-zinc-900/50 hover:bg-zinc-900/90 transition-all cursor-grab active:cursor-grabbing ${
                                  snapshot.isDragging 
                                    ? 'border-purple-500 shadow-xl shadow-purple-950/20 bg-zinc-900' 
                                    : 'border-zinc-850 hover:border-zinc-800'
                                }`}
                              >
                                <h5 className="text-xs font-bold text-zinc-200 line-clamp-1">{deal.title}</h5>
                                
                                <div className="flex items-center justify-between mt-3 mb-2.5">
                                  <span className="text-xs font-black text-purple-400">${deal.value.toLocaleString()}</span>
                                  <span className="text-[9px] font-bold font-mono text-zinc-500 bg-zinc-950 border border-zinc-850 px-1.5 py-0.2 rounded">
                                    {deal.probability}% prob
                                  </span>
                                </div>

                                <div className="border-t border-zinc-900 pt-2 space-y-1 text-[10px] text-zinc-500">
                                  <div className="flex items-center gap-1.5">
                                    <Users className="h-3 w-3 text-zinc-650" />
                                    <span className="truncate">{deal.contactName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Building2 className="h-3 w-3 text-zinc-650" />
                                    <span className="truncate">{deal.companyName}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* Add Deal Modal Overlay */}
      {showAddDealModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddDealModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
              Create New Sales Deal
            </h3>
            <form onSubmit={handleAddDeal} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Deal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise License Expansion"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Deal Value (USD)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 15000"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Contact Person</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alistair Thorne"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Thorne Logistics"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Pipeline Stage</label>
                <select
                  value={newStage}
                  onChange={(e) => setNewStage(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-350 outline-none focus:border-purple-500/50"
                >
                  {stages.map(st => (
                    <option key={st.id} value={st.id}>{st.title}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-md shadow-purple-950/20"
                >
                  Create Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
