import { MainEntity } from '../MainEntity';
import type { Person } from './Person';
export class User extends MainEntity { username = ''; person: Person | null = null; isOnline = false; }
