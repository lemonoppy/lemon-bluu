import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface ChannelMapping {
  sourceChannelId: string;
  sourceChannelName: string;
  sourceGuildId: string;
  sourceGuildName: string;
  targetChannelId: string;
  targetChannelName: string;
  targetGuildId: string;
  targetGuildName: string;
  createdAt: string;
}

export class ChannelMonitor {
  private static filePath = join(__dirname, '../../../data/channel-mappings.json');
  private static mappings: Map<string, ChannelMapping> = new Map();

  static {
    this.load();
  }

  private static load(): void {
    try {
      if (existsSync(this.filePath)) {
        const data = readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(data);
        this.mappings = new Map(Object.entries(parsed));
      }
    } catch (error) {
      // console.error('Error loading channel mappings:', error);
      this.mappings = new Map();
    }
  }

  private static save(): void {
    try {
      const obj = Object.fromEntries(this.mappings);
      writeFileSync(this.filePath, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (error) {
      // console.error('Error saving channel mappings:', error);
    }
  }

  static addMapping(mapping: ChannelMapping): void {
    this.mappings.set(mapping.sourceChannelId, mapping);
    this.save();
  }

  static removeMapping(sourceChannelId: string): boolean {
    const result = this.mappings.delete(sourceChannelId);
    this.save();
    return result;
  }

  static getMapping(sourceChannelId: string): ChannelMapping | undefined {
    return this.mappings.get(sourceChannelId);
  }

  static getAllMappings(): ChannelMapping[] {
    return Array.from(this.mappings.values());
  }

  static isMapped(sourceChannelId: string): boolean {
    return this.mappings.has(sourceChannelId);
  }

  static clearAllMappings(): void {
    this.mappings.clear();
    this.save();
  }
}
