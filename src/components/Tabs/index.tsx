import React, { useMemo } from 'react';
import { Box, Grid } from '@chakra-ui/react';
import type { GridProps } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

// @ts-ignore
interface Props extends GridProps {
  list: { id: string; label: string }[];
  activeId: string;
  size?: 'sm' | 'md' | 'lg';
  onChange: (id: string) => void;
}

const Tabs = ({ list, size = 'md', activeId, onChange, ...props }: Props) => {
  const { t } = useTranslation();
  const sizeMap = useMemo(() => {
    switch (size) {
      case 'sm':
        return {
          fontSize: 'sm',
          outP: '3px',
          inlineP: 1
        };
      case 'md':
        return {
          fontSize: 'md',
          outP: '4px',
          inlineP: 1
        };
      case 'lg':
        return {
          fontSize: 'lg',
          outP: '5px',
          inlineP: 2
        };
    }
  }, [size]);

  return (
    <Grid
      gridTemplateColumns={`repeat(${list.length},1fr)`}
      p={sizeMap.outP}
      borderRadius={'sm'}
      fontSize={sizeMap.fontSize}
      {...props}
    >
      {list.map((item) => (
        <Box
          key={item.id}
          py={sizeMap.inlineP}
          textAlign={'center'}
          borderBottom={'2px solid transparent'}
          {...(activeId === item.id
            ? {
                color: 'myBlue.700',
                cursor: 'default',
                fontWeight: 'bold',
                borderBottomColor: 'myBlue.700'
              }
            : {
                cursor: 'pointer'
              })}
          onClick={() => {
            if (activeId === item.id) return;
            onChange(item.id);
          }}
        >
          {t(item.label) || item.label}
        </Box>
      ))}
    </Grid>
  );
};

export default Tabs;
