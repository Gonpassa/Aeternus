import { parse } from 'date-fns';

export const parseIsoDate = (iso: string): Date => parse(iso, 'yyyy-MM-dd', new Date());
