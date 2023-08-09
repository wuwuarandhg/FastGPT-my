import {
  FlowBodyItemTypeEnum,
  FlowInputItemTypeEnum,
  FlowOutputItemTypeEnum,
  FlowValueTypeEnum
} from '@/constants/flow';
import { Connection } from 'reactflow';
import type { AppModuleItemType } from './app';
import { FlowModuleTypeEnum } from '@/constants/flow';

export type FlowModuleItemChangeProps = {
  moduleId: string;
  type: 'inputs' | 'outputs' | 'addInput' | 'delInput';
  key: string;
  value: any;
};

export type FlowInputItemType = {
  key: string; // 字段名
  value?: any;
  valueType?: `${FlowValueTypeEnum}`;
  type: `${FlowInputItemTypeEnum}`;
  label: string;
  edit?: boolean;
  connected?: boolean;
  description?: string;
  placeholder?: string;
  max?: number;
  min?: number;
  step?: number;
  required?: boolean;
  list?: { label: string; value: any }[];
  markList?: { label: string; value: any }[];
};

export type FlowOutputTargetItemType = {
  moduleId: string;
  key: string;
};
export type FlowOutputItemType = {
  key: string; // 字段名
  label?: string;
  edit?: boolean;
  description?: string;
  valueType?: `${FlowValueTypeEnum}`;
  type?: `${FlowOutputItemTypeEnum}`;
  targets: FlowOutputTargetItemType[];
};

export type FlowModuleTemplateType = {
  logo: string;
  name: string;
  description?: string;
  intro: string;
  flowType: `${FlowModuleTypeEnum}`;
  inputs: FlowInputItemType[];
  outputs: FlowOutputItemType[];
  showStatus?: boolean;
};
export type FlowModuleItemType = FlowModuleTemplateType & {
  moduleId: string;
  onChangeNode: (e: FlowModuleItemChangeProps) => void;
  onDelNode: (id: string) => void;
  onCopyNode: (id: string) => void;
  onCollectionNode: (id: string) => void;
  onDelEdge: ({
    moduleId,
    sourceHandle,
    targetHandle
  }: {
    moduleId: string;
    sourceHandle?: string | undefined;
    targetHandle?: string | undefined;
  }) => void;
};
