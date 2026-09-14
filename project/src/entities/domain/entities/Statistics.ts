import { MainEntity } from '../MainEntity';
export interface PeriodStats { total: number; today: number; yesterday: number; }
export class Statistics extends MainEntity { users!: PeriodStats; forum!: { themes: PeriodStats; comments: PeriodStats }; transfers!: PeriodStats; exchange!: PeriodStats; }
