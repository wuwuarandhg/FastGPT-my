import React, { useMemo } from 'react';
import { Box, Flex, useTheme, Menu, MenuButton, MenuList, MenuItem } from '@chakra-ui/react';
import MyIcon from '@/components/Icon';
import Avatar from '@/components/Avatar';
import type { FlowModuleItemType } from '@/types/flow';
import MyTooltip from '@/components/MyTooltip';
import { QuestionOutlineIcon } from '@chakra-ui/icons';
import { useTranslation } from 'react-i18next';

type Props = {
  children?: React.ReactNode | React.ReactNode[] | string;
  logo: string;
  name: string;
  description?: string;
  intro: string;
  minW?: string | number;
  moduleId: string;
  onDelNode: FlowModuleItemType['onDelNode'];
  onCopyNode: FlowModuleItemType['onCopyNode'];
};

const NodeCard = ({
  children,
  logo = '/icon/logo.png',
  name = '未知模块',
  description,
  minW = '300px',
  onCopyNode,
  onDelNode,
  moduleId
}: Props) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const menuList = useMemo(
    () => [
      {
        icon: 'copy',
        label: t('common.Copy'),
        onClick: () => onCopyNode(moduleId)
      },
      {
        icon: 'delete',
        label: t('common.Delete'),
        onClick: () => onDelNode(moduleId)
      },
      // {
      //   icon: 'collectionLight',
      //   label: t('common.Collect'),
      //   onClick: () => {}
      // },
      {
        icon: 'back',
        label: t('common.Cancel'),
        onClick: () => {}
      }
    ],
    [moduleId, onCopyNode, onDelNode, t]
  );

  return (
    <Box
      minW={minW}
      maxW={'430px'}
      bg={'white'}
      border={theme.borders.md}
      borderRadius={'md'}
      boxShadow={'sm'}
    >
      <Flex className="custom-drag-handle" px={4} py={3} alignItems={'center'}>
        <Avatar src={logo} borderRadius={'md'} objectFit={'contain'} w={'30px'} h={'30px'} />
        <Box ml={3} fontSize={'lg'} color={'myGray.600'}>
          {name}
        </Box>
        {description && (
          <MyTooltip label={description} forceShow>
            <QuestionOutlineIcon
              display={['none', 'inline']}
              transform={'translateY(1px)'}
              ml={1}
            />
          </MyTooltip>
        )}
        <Box flex={1} />
        <Menu autoSelect={false} isLazy>
          <MenuButton
            className={'nodrag'}
            _hover={{ bg: 'myWhite.600' }}
            cursor={'pointer'}
            borderRadius={'md'}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MyIcon name={'more'} w={'14px'} p={2} />
          </MenuButton>
          <MenuList color={'myGray.700'} minW={`120px !important`} zIndex={10}>
            {menuList.map((item) => (
              <MenuItem key={item.label} onClick={item.onClick} py={[2, 3]}>
                <MyIcon name={item.icon as any} w={['14px', '16px']} />
                <Box ml={[1, 2]}>{item.label}</Box>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Flex>
      {children}
    </Box>
  );
};

export default React.memo(NodeCard);
