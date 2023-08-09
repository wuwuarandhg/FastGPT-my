import React, { useMemo, useState } from 'react';
import { NodeProps } from 'reactflow';
import { FlowModuleItemType } from '@/types/flow';
import { Flex, Box, Button, useTheme, useDisclosure, Grid } from '@chakra-ui/react';
import { useUserStore } from '@/store/user';
import { useQuery } from '@tanstack/react-query';
import NodeCard from '../modules/NodeCard';
import Divider from '../modules/Divider';
import Container from '../modules/Container';
import RenderInput from '../render/RenderInput';
import RenderOutput from '../render/RenderOutput';
import { KBSelectModal } from '../../../KBSelectModal';
import type { SelectedKbType } from '@/types/plugin';
import Avatar from '@/components/Avatar';

const KBSelect = ({
  activeKbs = [],
  onChange
}: {
  activeKbs: SelectedKbType;
  onChange: (e: SelectedKbType) => void;
}) => {
  const theme = useTheme();
  const { myKbList, loadKbList } = useUserStore();
  const {
    isOpen: isOpenKbSelect,
    onOpen: onOpenKbSelect,
    onClose: onCloseKbSelect
  } = useDisclosure();

  const showKbList = useMemo(
    () => myKbList.filter((item) => activeKbs.find((kb) => kb.kbId === item._id)),
    [myKbList, activeKbs]
  );

  useQuery(['initkb'], loadKbList);

  return (
    <>
      <Grid gridTemplateColumns={'1fr 1fr'} gridGap={4}>
        <Button h={'36px'} onClick={onOpenKbSelect}>
          选择知识库
        </Button>
        {showKbList.map((item) => (
          <Flex
            key={item._id}
            alignItems={'center'}
            h={'36px'}
            border={theme.borders.base}
            px={2}
            borderRadius={'md'}
          >
            <Avatar src={item.avatar} w={'24px'}></Avatar>
            <Box ml={3} fontWeight={'bold'} fontSize={['md', 'lg', 'xl']}>
              {item.name}
            </Box>
          </Flex>
        ))}
      </Grid>
      {isOpenKbSelect && (
        <KBSelectModal
          kbList={myKbList}
          activeKbs={activeKbs}
          onChange={onChange}
          onClose={onCloseKbSelect}
        />
      )}
    </>
  );
};

const NodeKbSearch = ({
  data: { moduleId, inputs, outputs, onChangeNode, ...props }
}: NodeProps<FlowModuleItemType>) => {
  return (
    <NodeCard minW={'400px'} moduleId={moduleId} {...props}>
      <Divider text="Input" />
      <Container>
        <RenderInput
          moduleId={moduleId}
          onChangeNode={onChangeNode}
          flowInputList={inputs}
          CustomComponent={{
            kbList: ({ key, value, ...props }) => (
              <KBSelect
                activeKbs={value}
                onChange={(e) => {
                  onChangeNode({
                    moduleId,
                    key,
                    type: 'inputs',
                    value: {
                      ...props,
                      key,
                      value: e
                    }
                  });
                }}
              />
            )
          }}
        />
      </Container>
      <Divider text="Output" />
      <Container>
        <RenderOutput onChangeNode={onChangeNode} moduleId={moduleId} flowOutputList={outputs} />
      </Container>
    </NodeCard>
  );
};
export default React.memo(NodeKbSearch);
