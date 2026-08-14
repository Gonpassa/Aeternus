import { chakra } from '@chakra-ui/react';

export const VisuallyHidden = chakra('span', {
  base: {
    position: 'absolute',
    w: '1px',
    h: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
  },
});
