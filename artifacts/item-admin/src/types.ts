export type ItemCategory = 'accessory' | 'background' | 'voice';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  cost: number;
  assetUrl: string;
  posX: number;
  posY: number;
  scale: number;
  isActive: boolean;
  createdAt: string;
}