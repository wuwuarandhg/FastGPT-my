import { BillSourceEnum } from '@/constants/user';
import type { BillSchema, UserModelSchema } from './mongoSchema';
export interface UserType {
  _id: string;
  username: string;
  avatar: string;
  balance: number;
  openaiAccount: UserModelSchema['openaiAccount'];
}

export interface UserUpdateParams {
  balance?: number;
  avatar?: string;
  openaiAccount?: UserModelSchema['openaiAccount'];
}

export interface UserBillType {
  id: string;
  time: Date;
  appName: string;
  source: BillSchema['source'];
  total: number;
  list: BillSchema['list'];
}
