import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Item } from '@/types';
import { useItemsApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { SelectNative } from '@/components/ui/select-native';
import { toast } from '@/hooks/use-toast';
import { Music, Save, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const itemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(160),
  category: z.enum(['food', 'accessory', 'background', 'voice']),
  cost: z.coerce.number().min(0, 'Cost cannot be negative'),
  assetUrl: z.string().url('Must be a valid URL').max(2048),
  posX: z.coerce.number(),
  posY: z.coerce.number(),
  scale: z.coerce.number().min(0.01),
  isActive: z.boolean(),
});
export type ItemFormValues = z.infer<typeof itemSchema>;

export function ItemEditor({ item, onClose }: { item: Item | null, onClose: () => void }) {
  const { useSaveItem, useDeleteItem } = useItemsApi();
  const saveMutation = useSaveItem();
  const deleteMutation = useDeleteItem();
  
  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: item ? { ...item } : {
      name: '',
      category: 'accessory',
      cost: 0,
      assetUrl: '',
      posX: 0,
      posY: 0,
      scale: 1,
      isActive: true,
    }
  });

  const onSubmit = (data: ItemFormValues) => {
    saveMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Item saved successfully' });
        if (!item) onClose();
      },
      onError: (err) => {
        toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
      }
    });
  };
  
  const handleDelete = () => {
    if (!item || !window.confirm('Are you sure you want to disable this item?')) return;
    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast({ title: 'Item disabled' });
        onClose();
      },
      onError: (err) => {
        toast({ title: 'Failed to disable', description: err.message, variant: 'destructive' });
      }
    });
  };

  const values = form.watch();
  const cat = values.category;
  const isPositional = cat === 'accessory';

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Form Section */}
      <div className="flex-1 border-r border-slate-200 flex flex-col bg-white overflow-y-auto max-h-full">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">
            {item ? 'Edit Item' : 'Create New Item'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5 text-slate-400" /></Button>
        </div>
        
        <form id="item-form" onSubmit={form.handleSubmit(onSubmit)} className="p-6 flex flex-col gap-6 max-w-2xl w-full mx-auto pb-12">
          
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Item Name</Label>
              <Input id="name" {...form.register('name')} placeholder="e.g. Red Ribbon" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="category">Category</Label>
              <SelectNative id="category" {...form.register('category')}>
                <option value="food">Food</option>
                <option value="accessory">Accessory</option>
                <option value="background">Background</option>
                <option value="voice">Voice</option>
              </SelectNative>
              {form.formState.errors.category && <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="cost">Cost (Points)</Label>
              <Input id="cost" type="number" {...form.register('cost')} />
              {form.formState.errors.cost && <p className="text-xs text-destructive">{form.formState.errors.cost.message}</p>}
            </div>
            
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="isActive">Status</Label>
              <div className="flex items-center gap-3 h-9">
                <Controller
                  name="isActive"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <span className={cn("text-sm font-medium", values.isActive ? "text-slate-700" : "text-slate-400")}>
                  {values.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetUrl">Asset URL (Image/Audio)</Label>
            <Input id="assetUrl" {...form.register('assetUrl')} placeholder="https://..." />
            {form.formState.errors.assetUrl && <p className="text-xs text-destructive">{form.formState.errors.assetUrl.message}</p>}
          </div>

          {isPositional && (
            <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-6">
              <h3 className="text-sm font-bold text-slate-700">Positioning & Scale</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>X Offset</Label>
                  <Input type="number" className="w-20 h-7 text-right bg-white" {...form.register('posX')} />
                </div>
                <Controller
                  name="posX"
                  control={form.control}
                  render={({ field }) => (
                    <Slider min={-200} max={200} step={1} value={[field.value || 0]} onValueChange={v => field.onChange(v[0])} />
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Y Offset</Label>
                  <Input type="number" className="w-20 h-7 text-right bg-white" {...form.register('posY')} />
                </div>
                <Controller
                  name="posY"
                  control={form.control}
                  render={({ field }) => (
                    <Slider min={-200} max={200} step={1} value={[field.value || 0]} onValueChange={v => field.onChange(v[0])} />
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Scale</Label>
                  <Input type="number" step="0.1" className="w-20 h-7 text-right bg-white" {...form.register('scale')} />
                </div>
                <Controller
                  name="scale"
                  control={form.control}
                  render={({ field }) => (
                    <Slider min={0.1} max={3.0} step={0.05} value={[field.value || 1]} onValueChange={v => field.onChange(v[0])} />
                  )}
                />
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3 pt-6 border-t border-slate-100">
            <Button type="submit" className="flex-1" disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Item'}
            </Button>
            {item && (
              <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

        </form>
      </div>
      
      {/* Preview Section */}
      <div className="lg:w-[420px] bg-slate-50 border-t lg:border-t-0 p-6 flex flex-col items-center justify-center overflow-y-auto min-h-[400px]">
         <div className="w-full max-w-sm">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Live Preview</h3>
           <ItemPreview values={values} />
         </div>
      </div>
    </div>
  )
}

function ItemPreview({ values }: { values: Partial<ItemFormValues> }) {
  const { category, assetUrl, posX = 0, posY = 0, scale = 1, name } = values;

  return (
    <div className="relative w-full aspect-[3/4] max-h-[500px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
      {category === 'background' && assetUrl && (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${assetUrl})` }}
        />
      )}
      
      {/* Neutral Character */}
      <div className="relative z-10 w-[45%] h-[40%] bg-slate-100 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] shadow-[inset_-4px_-8px_12px_rgba(0,0,0,0.05)] border border-slate-200" />
      
      {category === 'accessory' && assetUrl && (
        <div 
          className="absolute z-20 pointer-events-none"
          style={{
            top: '50%',
            left: '50%',
            transform: `translate(calc(-50% + ${posX}px), calc(-50% + ${posY}px)) scale(${scale})`,
            transformOrigin: 'center'
          }}
        >
          <img 
            src={assetUrl} 
            alt={name || 'Preview'} 
            className="max-w-none" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
          />
        </div>
      )}

      {category === 'food' && assetUrl && (
        <div className="absolute z-20 bottom-8 left-1/2 -translate-x-1/2">
           <img 
             src={assetUrl} 
             alt={name || 'Preview'} 
             className="w-24 h-24 object-contain drop-shadow-xl" 
             onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
             onLoad={(e) => { (e.target as HTMLImageElement).style.display = 'block'; }}
           />
        </div>
      )}

      {category === 'voice' && assetUrl && (
        <div className="absolute z-20 top-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
             <Music className="w-5 h-5" />
           </div>
           {/* A small player just for testing */}
           <audio src={assetUrl} controls className="w-48 h-8" />
        </div>
      )}
    </div>
  )
}