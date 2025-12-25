import * as React from 'react';
import Svg, { Path } from 'react-native-svg';

const IconDelete = ({ width = 20, height = 20, color = '#FFF' }) => (
  <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
    <Path
      d="M2.5 5H4.16667H17.5"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.66666 5.00001V3.33334C6.66666 2.89131 6.84225 2.46739 7.15481 2.15483C7.46737 1.84227 7.89129 1.66667 8.33332 1.66667H11.6667C12.1087 1.66667 12.5326 1.84227 12.8452 2.15483C13.1577 2.46739 13.3333 2.89131 13.3333 3.33334V5.00001M15.8333 5.00001V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83332C5.39129 18.3333 4.96737 18.1577 4.65481 17.8452C4.34225 17.5326 4.16666 17.1087 4.16666 16.6667V5.00001H15.8333Z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8.33334 9.16667V14.1667"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M11.6667 9.16667V14.1667"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default IconDelete; 