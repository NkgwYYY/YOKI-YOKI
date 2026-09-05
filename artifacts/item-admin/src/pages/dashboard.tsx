import { useState, useMemo } from 'react';
import { useItemsApi } from '@/hooks/use-api';
import { Item } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Shirt, Image as ImageIcon, Music, Package, Loader2 } from 'lucide-react';
import { ItemEditor } from '@/components/item-editor';
import { cn } from '@/lib/utils';
import { SignOutButton } from '@clerk/react';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  accessory: Shirt,
  background: ImageIcon,
  voice: Music,
};

export default function Dashboard() {
  const { useGetItems } = useItemsApi();
  const { data: items, isLoading, error } = useGetItems();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [items, search, categoryFilter]);

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setIsCreating(false);
  };
  
  const handleCreateNew = () => {
    setSelectedItem(null);
    setIsCreating(true);
  };

  const activeEditorKey = isCreating ? 'new' : selectedItem ? selectedItem.id : null;

  return (
     <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">
       {/* Sidebar */}
       <div className="w-[340px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-10 relative">
         {/* Header */}
         <div className="p-4 border-b border-slate-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">Y</div>
             <h1 className="font-bold text-slate-800 tracking-tight">YOKI YOKI <span className="text-indigo-600 font-medium">Admin</span></h1>
           </div>
           <SignOutButton>
             <Button variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-900 h-7 px-2">Sign out</Button>
           </SignOutButton>
         </div>
         
         {/* Filters */}
         <div className="p-4 border-b border-slate-100 space-y-3">
           <div className="relative">
             <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <Input 
               placeholder="Search items..." 
               className="pl-9 bg-slate-50 border-transparent focus-visible:bg-white transition-colors"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
           <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
             {['all', 'accessory', 'background', 'voice'].map(cat => (
               <button
                 key={cat}
                 onClick={() => setCategoryFilter(cat)}
                 className={cn(
                   "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                   categoryFilter === cat 
                     ? "bg-slate-800 text-white shadow-sm" 
                     : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                 )}
               >
                 {cat.charAt(0).toUpperCase() + cat.slice(1)}
               </button>
             ))}
           </div>
         </div>

         {/* List */}
         <div className="flex-1 overflow-y-auto p-3 space-y-2">
           {isLoading ? (
             <div className="flex items-center justify-center h-32 text-slate-400">
               <Loader2 className="w-5 h-5 animate-spin mr-2" /> <span className="text-sm">Loading catalog...</span>
             </div>
           ) : error ? (
             <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
               Failed to load items. Check console.
             </div>
           ) : filteredItems.length === 0 ? (
             <div className="text-center text-slate-400 text-sm mt-12 flex flex-col items-center">
               <Package className="w-8 h-8 text-slate-300 mb-2" />
               No items found.
             </div>
           ) : (
             filteredItems.map(item => {
               const Icon = CATEGORY_ICONS[item.category] || Package;
               const isSelected = selectedItem?.id === item.id;
               return (
                 <button
                   key={item.id}
                   onClick={() => handleEdit(item)}
                   className={cn(
                     "w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all border outline-none",
                     isSelected 
                       ? "bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-600/10" 
                       : "bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                   )}
                 >
                   <div className={cn(
                     "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden",
                     isSelected ? "bg-white border-indigo-100" : "bg-slate-50 border-slate-100"
                   )}>
                      {item.category === 'accessory' ? (
                       <img src={item.assetUrl} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                     ) : (
                       <Icon className={cn("w-5 h-5", isSelected ? "text-indigo-600" : "text-slate-400")} />
                     )}
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="flex items-center justify-between mb-1 gap-2">
                       <h4 className="font-bold text-sm text-slate-800 truncate">{item.name}</h4>
                       <span className="text-xs font-bold text-slate-500 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">{item.cost}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-transparent border-slate-200 text-slate-500 font-semibold capitalize">
                         {item.category}
                       </Badge>
                       {!item.isActive && (
                         <span className="text-[10px] text-destructive font-bold uppercase tracking-wider">Disabled</span>
                       )}
                     </div>
                   </div>
                 </button>
               )
             })
           )}
         </div>

         {/* Create Button Footer */}
         <div className="p-4 border-t border-slate-100 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)] z-10 relative">
           <Button className="w-full font-bold shadow-md" onClick={handleCreateNew}>
             <Plus className="w-4 h-4 mr-2" /> Add New Item
           </Button>
         </div>
       </div>

       {/* Main Editor Area */}
       <div className="flex-1 min-w-0 bg-slate-50 overflow-hidden relative">
         {activeEditorKey ? (
           <ItemEditor 
             key={activeEditorKey} 
             item={selectedItem} 
             onClose={() => { setIsCreating(false); setSelectedItem(null); }} 
           />
         ) : (
           <div className="h-full flex items-center justify-center flex-col gap-5 text-slate-400">
             <div className="w-24 h-24 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
               <Package className="w-10 h-10 text-slate-300" />
             </div>
             <div className="text-center">
               <h3 className="text-slate-700 font-bold text-lg mb-2">No Item Selected</h3>
               <p className="text-sm max-w-[280px] leading-relaxed">Select an item from the catalog to edit its details, adjust its position, or preview how it looks.</p>
             </div>
             <Button variant="outline" onClick={handleCreateNew} className="mt-4 bg-white font-semibold">
               Create your first item
             </Button>
           </div>
         )}
       </div>
     </div>
  );
}