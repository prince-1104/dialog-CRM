"use client";

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { mockContacts, Contact, getContacts, createContact, initiateCall } from '../lib/api';
import { 
  Phone, 
  Mail, 
  Building2, 
  Tag, 
  Search, 
  X,
  Plus,
  Clock,
  ExternalLink
} from 'lucide-react';

export const ContactsView: React.FC = () => {
  const { 
    selectedContactId, 
    setSelectedContactId, 
    startRealCall,
    startSimulatedCall
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [contactsList, setContactsList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for new contact
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompany, setNewCompany] = useState('');

  // Fetch contacts on mount
  useEffect(() => {
    const loadContacts = async () => {
      try {
        setLoading(true);
        const data = await getContacts();
        setContactsList(data);
      } catch (err) {
        console.error('Failed to load contacts:', err);
      } finally {
        setLoading(false);
      }
    };
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail || !newPhone) return;

    try {
      const created = await createContact({
        name: newName,
        email: newEmail,
        phone: newPhone,
        company: newCompany || undefined
      });
      setContactsList([created, ...contactsList]);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewCompany('');
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to create contact:', err);
      alert('Error creating contact.');
    }
  };

  const handleCallContact = async (contact: Contact) => {
    try {
      const callData = await initiateCall(contact.id);
      startRealCall(
        String(callData.callId),
        contact.id,
        contact.name,
        contact.phone,
        contact.owner
      );
    } catch (err) {
      console.error('Failed to start real call:', err);
      // Fallback to simulation
      startSimulatedCall(contact.id, contact.name, contact.phone, contact.owner);
    }
  };

  // Filter logic
  const filteredContacts = contactsList.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeContact = contactsList.find(c => c.id === selectedContactId);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'contacted': return 'bg-blue-950/40 text-blue-300 border-blue-900/50';
      case 'qualified': return 'bg-purple-950/40 text-purple-300 border-purple-800/50';
      case 'nurturing': return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
      case 'unqualified': return 'bg-rose-950/40 text-rose-300 border-rose-900/50';
      default: return 'bg-zinc-800 text-zinc-300';
    }
  };

  return (
    <div className="relative h-[calc(100vh-6rem)] text-left flex gap-6 overflow-hidden">
      {/* Main Table Panel */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950/30 rounded-2xl border border-zinc-900/80 overflow-hidden">
        {/* Actions header */}
        <div className="p-4 border-b border-zinc-900 flex flex-wrap items-center justify-between gap-4 bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-zinc-200">Directory Contacts</h3>
            <span className="text-[10px] bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full text-zinc-500 font-mono font-bold">
              {filteredContacts.length} items
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 outline-none focus:border-purple-500/50"
            >
              <option value="all">All Statuses</option>
              <option value="new">Incoming / New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="nurturing">Nurturing</option>
              <option value="unqualified">Unqualified</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search name, company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-purple-500/50 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 outline-none w-48 transition-all"
              />
            </div>

            {/* Add Lead button */}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-950/20"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Lead</span>
            </button>
          </div>
        </div>

        {/* Contacts Grid/Table */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-zinc-900 text-[10px] font-mono tracking-wider text-zinc-500 uppercase bg-zinc-950/15">
                <th className="py-3 px-4 font-semibold">Name & Company</th>
                <th className="py-3 px-4 font-semibold">Contact Details</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Tags</th>
                <th className="py-3 px-4 font-semibold">Assignee</th>
                <th className="py-3 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/50">
              {filteredContacts.map((contact) => (
                <tr 
                  key={contact.id}
                  onClick={() => setSelectedContactId(contact.id)}
                  className={`text-xs hover:bg-zinc-900/20 cursor-pointer transition-colors ${
                    selectedContactId === contact.id ? 'bg-purple-950/5 border-l-2 border-l-purple-500' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                        {contact.name[0]}
                      </div>
                      <div>
                        <h4 className="font-semibold text-zinc-200">{contact.name}</h4>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-2.5 w-2.5" />
                          {contact.company || 'Private'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-400 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-zinc-650" />
                      <span>{contact.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-zinc-650" />
                      <span>{contact.phone}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.map((t, i) => (
                        <span key={i} className="px-1.5 py-0.2 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded text-[9px] font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-zinc-300 font-medium">
                    {contact.owner}
                  </td>
                  <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleCallContact(contact)}
                      className="p-2 bg-purple-600/10 border border-purple-500/20 hover:bg-purple-600 text-purple-400 hover:text-white rounded-xl transition-all inline-flex items-center justify-center"
                      title={`Call via ${contact.owner}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Profile Detail Drawer (Right side) */}
      {activeContact && (
        <div className="w-80 h-full bg-zinc-950/60 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/40">
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">Contact Profile</span>
            <button 
              onClick={() => setSelectedContactId(null)}
              className="p-1 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Profile Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
            {/* Avatar Header */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-2xl shadow-lg shadow-purple-950/20 mb-3">
                {activeContact.name[0]}
              </div>
              <h3 className="text-base font-bold text-zinc-200">{activeContact.name}</h3>
              <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1 justify-center">
                <Building2 className="h-3.5 w-3.5 text-zinc-650" />
                {activeContact.company || 'Independent'}
              </p>
            </div>

            {/* Contact Details cards */}
            <div className="space-y-3">
              <div className="p-3 bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Email Address</span>
                  <a href={`mailto:${activeContact.email}`} className="text-purple-400 font-mono hover:underline flex items-center gap-1">
                    {activeContact.email}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Phone Number</span>
                  <span className="text-zinc-300 font-mono font-semibold">{activeContact.phone}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Acquisition Source</span>
                  <span className="text-zinc-300 font-medium">{activeContact.source}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Assigned Agent</span>
                  <span className="text-zinc-300 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                    {activeContact.owner}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile tag section */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold font-mono text-zinc-500 uppercase">
                <Tag className="h-3 w-3" />
                <span>Segment Tags</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeContact.tags.map((t, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Simulated Activity Timeline */}
            <div>
              <div className="flex items-center gap-1.5 mb-3 text-[10px] font-bold font-mono text-zinc-500 uppercase">
                <Clock className="h-3 w-3" />
                <span>Recent Timeline Activity</span>
              </div>
              <div className="space-y-4 relative pl-3.5 before:absolute before:left-1 before:top-1 before:bottom-1 before:w-px before:bg-zinc-800">
                {/* Timeline item 1 */}
                <div className="relative text-xs">
                  <span className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-purple-500 ring-4 ring-zinc-950"></span>
                  <div className="flex items-center justify-between mb-0.5 text-[10px] text-zinc-500 font-mono">
                    <span>CALL LOGGED</span>
                    <span>TODAY</span>
                  </div>
                  <p className="text-zinc-300 font-medium">Outbound qualification call by {activeContact.owner}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">Duration: 1m 24s. Key interest: API Setup.</p>
                </div>
                {/* Timeline item 2 */}
                <div className="relative text-xs">
                  <span className="absolute -left-[18px] top-1 h-2 w-2 rounded-full bg-zinc-800 ring-4 ring-zinc-950"></span>
                  <div className="flex items-center justify-between mb-0.5 text-[10px] text-zinc-500 font-mono">
                    <span>LEAD IMPORTED</span>
                    <span>{activeContact.createdAt}</span>
                  </div>
                  <p className="text-zinc-300 font-medium">Created from {activeContact.source} entry</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Box */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-950/40 flex gap-3">
            <button 
              onClick={() => handleCallContact(activeContact)}
              className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all glow-purple"
            >
              <Phone className="h-3.5 w-3.5" />
              Call via Agent
            </button>
          </div>
        </div>
      )}

      {/* Add Lead Modal Overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <h3 className="text-base font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-purple-400" />
              Add New Contact Lead
            </h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@domain.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1 (555) 012-3456"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="text-left space-y-1">
                <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Inc."
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-all shadow-md shadow-purple-950/20"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
